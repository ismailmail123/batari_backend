const multer = require("multer");
const crypto = require("crypto");
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary'); // Import modul Cloudinary
const { user: UserModel, warga_binaan: WbpModel, pengunjung: PengunjungModel, data_pengunjung: DataPengunjungModel, barang_titipan: BarangTitipanModel, sequelize } = require("../models");
const { Op, Sequelize } = require("sequelize");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const { printer: ThermalPrinter, types: PrinterTypes } = require("node-thermal-printer");

const { format, toZonedTime } = require('date-fns-tz');
const { printTicket } = require('../utils/printService');


const generateVerificationCode = () => crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 karakter kode acak

const sendBarcode = async(email, qrCodeUrl, nama) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false, // Abaikan validasi sertifikat
        },
    });

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: "at your barcode",
        name: `name: ${nama}`,
        text: `Your link barcode is: ${qrCodeUrl}`,

    };

    await transporter.sendMail(mailOptions);
};


/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */

const index = async(req, res, _next) => {
    try {
        let pengunjungs = await PengunjungModel.findAll({
            include: [{
                    model: UserModel,
                    as: "user",
                },
                {
                    model: WbpModel,
                    as: "warga_binaan",
                },
                {
                    model: BarangTitipanModel,
                    as: "barang_titipan",
                }
            ],
        });

        return res.send({
            message: "Success",
            data: pengunjungs,
        });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};

const getPengunjung = async(req, res, _next) => {
    try {
        const currentUser = req.user; // User yang sedang login
        let pengunjungs;


        if (currentUser.role === 'admin') {
            // Jika role admin, tampilkan semua data pengunjung
            pengunjungs = await DataPengunjungModel.findAll({
                include: [{
                        model: UserModel,
                        as: "user",
                    },
                    {
                        model: WbpModel,
                        as: "warga_binaan",
                    }

                ],
            });
        } else {
            // Jika bukan admin, tampilkan data pengunjung berdasarkan user yang login dari UserModel
            pengunjungs = await UserModel.findOne({
                where: {
                    id: currentUser.id // Filter berdasarkan ID user yang login
                },
                attributes: { exclude: ['password'] }, // Selalu kecualikan password
            });
        }

        return res.send({
            message: "Success",
            data: pengunjungs,
        });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};
/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */

const indexUser = async(req, res, _next) => {
    try {
        let pengunjungs = await PengunjungModel.findAll({
            where: { user_id: req.user.id },
            include: [{
                    model: UserModel,
                    as: "user",
                },
                {
                    model: WbpModel,
                    as: "warga_binaan",
                },
                {
                    model: BarangTitipanModel,
                    as: "barang_titipan",
                }
            ],
        });

        return res.send({
            message: "Success",
            data: pengunjungs,
        });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};

/**
 * Mengambil nomor antrian terakhir
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */


// const getLastAntrian = async(req, res) => {
//     try {
//         // Dapatkan tanggal hari ini dalam format YYYYMMDD
//         const today = new Date();
//         const todayString = today.getFullYear() +
//             String(today.getMonth() + 1).padStart(2, '0') +
//             String(today.getDate()).padStart(2, '0');

//         console.log("Tanggal hari ini:", todayString);

//         // Cari semua antrian untuk tanggal hari ini
//         const antrianHariIni = await PengunjungModel.findAll({
//             where: {
//                 antrian: {
//                     [Op.like]: `${todayString}-%` // Hanya ambil yang dimulai dengan tanggal hari ini
//                 }
//             },
//             attributes: ['antrian'],
//         });

//         console.log("Antrian hari ini:", antrianHariIni.map(a => a.antrian));

//         let lastNumber = "000"; // Default "000" jika tidak ada antrian

//         // Ekstrak tiga angka terakhir dari nomor antrian
//         if (antrianHariIni.length > 0) {
//             const numbers = antrianHariIni.map(pengunjung => {
//                 const antrian = pengunjung.antrian;
//                 if (typeof antrian === 'string' && antrian.includes('-')) {
//                     // Ambil bagian setelah tanda '-' (tiga angka terakhir)
//                     return antrian.split('-')[1];
//                 }
//                 return "000";
//             }).filter(num => num !== "000"); // Hapus nilai default dari array

//             // Cari nomor terbesar dari tiga angka terakhir
//             if (numbers.length > 0) {
//                 lastNumber = numbers.reduce((max, current) => {
//                     return current > max ? current : max;
//                 });
//             }
//         }

//         return res.status(200).json({
//             message: "Success",
//             lastNumber: lastNumber, // Format: "016", "017", dst.
//             tanggal: todayString
//         });
//     } catch (error) {
//         console.error("Error fetching last antrian:", error);
//         return res.status(500).json({
//             message: "Internal Server Error",
//         });
//     }
// };

const getLastAntrian = async(req, res) => {
    try {
        // Dapatkan tanggal hari ini dalam format YYYYMMDD
        const timeZone = 'Asia/Makassar';
        const now = new Date();
        const zonedDate = toZonedTime(now, timeZone);
        const todayString = format(zonedDate, 'yyyyMMdd');

        // Tentukan sesi berdasarkan waktu
        const hour = parseInt(format(zonedDate, 'HH', { timeZone: timeZone }), 10);
        const isSesiPagi = hour >= 0 && hour < 12;
        const sesiPrefix = isSesiPagi ? '' : 'A';

        console.log("Tanggal hari ini:", todayString);
        console.log("Sesi:", isSesiPagi ? "Pagi" : "Siang");
        console.log("Prefix:", sesiPrefix);

        // Cari semua antrian untuk tanggal hari ini dan sesi yang sesuai
        const whereCondition = {
            antrian: {
                [Op.like]: `${todayString}-${sesiPrefix}%`
            }
        };

        const antrianHariIni = await PengunjungModel.findAll({
            where: whereCondition,
            attributes: ['antrian'],
        });

        console.log("Antrian hari ini:", antrianHariIni.map(a => a.antrian));

        let lastNumber = "000"; // Default "000" jika tidak ada antrian

        // Ekstrak tiga angka terakhir dari nomor antrian
        if (antrianHariIni.length > 0) {
            const numbers = antrianHariIni.map(pengunjung => {
                const antrian = pengunjung.antrian;
                if (typeof antrian === 'string' && antrian.includes('-')) {
                    // Ambil bagian setelah tanda '-' (termasuk prefix A jika ada)
                    const numberPart = antrian.split('-')[1];
                    // Hapus prefix 'A' jika ada untuk mendapatkan angka murni
                    return numberPart.replace('A', '');
                }
                return "000";
            }).filter(num => num !== "000"); // Hapus nilai default dari array

            // Cari nomor terbesar dari tiga angka terakhir
            if (numbers.length > 0) {
                lastNumber = numbers.reduce((max, current) => {
                    return parseInt(current) > parseInt(max) ? current : max;
                });
            }
        }

        return res.status(200).json({
            message: "Success",
            lastNumber: lastNumber, // Format: "016", "017", dst.
            tanggal: todayString,
            sesi: isSesiPagi ? "pagi" : "siang",
            prefix: sesiPrefix
        });
    } catch (error) {
        console.error("Error fetching last antrian:", error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};
/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */

// const show = async(req, res, next) => {
//     try {
//         const { kode } = req.body;

//         const pengunjung = await PengunjungModel.findByPk(kode, {
//             attributes: [
//                 "user_id",
//                 "user_id",
//                 "wbp_id",
//                 "nama",
//                 "jenis_kelamin",
//                 "nik",
//                 "alamat",
//                 "hp",
//                 "hubungan_keluarga",
//                 "pengikut_laki_laki",
//                 "pengikut_perempuan",
//                 "pengikut_anak_anak",
//                 "pengikut_bayi",
//                 "total_pengikut",
//                 "photo_ktp",
//                 "photo_pengunjung"
//             ],
//             include: [{
//                 model: WbpModel,
//                 as: "warga_binaan",
//             }],
//         });

//         if (!pengunjung) {
//             return res.status(404).send({
//                 message: "pengunjung tidak ditemukan",
//                 data: null
//             })
//         }

//         return res.send({
//             message: "success",
//             data: pengunjung,
//         });

//     } catch (error) {
//         console.error("Error:", error);
//         return res.status(500).send({ message: "Internal Server Error" });
//     }
// }


const show = async(req, res, next) => {
    try {
        const { id } = req.params; // Ambil id dari req.body

        // Validasi: Pastikan id ada di req.body
        if (!id) {
            return res.status(400).send({
                message: "Kode harus disertakan dalam request body",
                data: null
            });
        }

        // Cari pengunjung berdasarkan kode
        const pengunjung = await PengunjungModel.findOne({
            where: { id: id }, // Gunakan where clause untuk mencari berdasarkan id
            attributes: [
                "id",
                "user_id",
                "wbp_id",
                "nama",
                "jenis_kelamin",
                "nik",
                "alamat",
                "hp",
                "hubungan_keluarga",
                "tujuan",
                "pengikut_laki_laki",
                "pengikut_perempuan",
                "pengikut_anak_anak",
                "pengikut_bayi",
                "total_pengikut",
                "kode",
                "photo_ktp",
                "photo_pengunjung",
                "barcode",
                "status",
                "antrian",
                "created_at",
                "updated_at"
            ],
            include: [{
                    model: WbpModel,
                    as: "warga_binaan",
                },
                {
                    model: BarangTitipanModel,
                    as: "barang_titipan",
                    include: [{
                        model: WbpModel,
                        as: "warga_binaan",
                    }]
                },

            ],
        });

        // Jika pengunjung tidak ditemukan
        if (!pengunjung) {
            return res.status(404).send({
                message: "Pengunjung tidak ditemukan",
                data: null
            });
        }

        // Jika pengunjung ditemukan
        return res.send({
            message: "Success",
            data: pengunjung,
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};
const showByKode = async(req, res, next) => {
    try {
        const { kode } = req.params; // Ambil id dari req.body

        // Validasi: Pastikan id ada di req.body
        if (!kode) {
            return res.status(400).send({
                message: "Kode harus disertakan dalam request body",
                data: null
            });
        }

        // Cari pengunjung berdasarkan kode
        const pengunjung = await PengunjungModel.findOne({
            where: { kode: kode }, // Gunakan where clause untuk mencari berdasarkan id
            attributes: [
                "id",
                "user_id",
                "wbp_id",
                "nama",
                "jenis_kelamin",
                "nik",
                "alamat",
                "hp",
                "hubungan_keluarga",
                "tujuan",
                "pengikut_laki_laki",
                "pengikut_perempuan",
                "pengikut_anak_anak",
                "pengikut_bayi",
                "total_pengikut",
                "kode",
                "photo_ktp",
                "photo_pengunjung",
                "barcode",
                "status",
                "antrian",
                "created_at",
                "updated_at"
            ],
            include: [{
                    model: WbpModel,
                    as: "warga_binaan",
                },
                {
                    model: BarangTitipanModel,
                    as: "barang_titipan",
                }
            ],
        });

        // Jika pengunjung tidak ditemukan
        if (!pengunjung) {
            return res.status(404).send({
                message: "Pengunjung tidak ditemukan",
                data: null
            });
        }

        // Jika pengunjung ditemukan
        return res.send({
            message: "Success",
            data: pengunjung,
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};
const showPengunjungData = async(req, res, next) => {
    try {
        const { id } = req.params; // Ambil id dari req.body

        // Validasi: Pastikan id ada di req.body
        if (!id) {
            return res.status(400).send({
                message: "id harus disertakan dalam request body",
                data: null
            });
        }

        // Cari pengunjung berdasarkan id
        const pengunjung = await DataPengunjungModel.findOne({
            where: { id: id }, // Gunakan where clause untuk mencari berdasarkan kode
            attributes: [
                "id",
                "user_id",
                "wbp_id",
                "nama",
                "jenis_kelamin",
                "nik",
                "alamat",
                "hp",
                "hubungan_keluarga",
                "kode",
                "photo_ktp",
                "photo_pengunjung",
                "barcode",
                "created_at",
                "updated_at"
            ],
            include: [{
                    model: UserModel,
                    as: "user",
                },
                {
                    model: WbpModel,
                    as: "warga_binaan",
                }

            ],
        });

        // Jika pengunjung tidak ditemukan
        if (!pengunjung) {
            return res.status(404).send({
                message: "Pengunjung tidak ditemukan",
                data: null
            });
        }

        // Jika pengunjung ditemukan
        return res.send({
            message: "Success",
            data: pengunjung,
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};
const showPengunjungByKode = async(req, res, next) => {
    try {
        const { kode } = req.params; // Ambil id dari req.body

        console.log("kkkkkkkkkkkkkkkkkkkkkode", kode)

        // Validasi: Pastikan id ada di req.body
        // if (!kode) {
        //     return res.status(400).send({
        //         message: "id harus disertakan dalam request body",
        //         data: null
        //     });
        // }

        // Cari pengunjung berdasarkan id
        const pengunjung = await DataPengunjungModel.findOne({
            where: { kode: kode }, // Gunakan where clause untuk mencari berdasarkan kode
            attributes: [
                "id",
                "user_id",
                "wbp_id",
                "nama",
                "jenis_kelamin",
                "nik",
                "alamat",
                "hp",
                "hubungan_keluarga",
                "kode",
                "photo_ktp",
                "photo_pengunjung",
                "barcode",
                "created_at",
                "updated_at"
            ],
            include: [{
                    model: UserModel,
                    as: "user",
                },
                {
                    model: WbpModel,
                    as: "warga_binaan",
                }
            ],
        });

        // Jika pengunjung tidak ditemukan
        if (!pengunjung) {
            return res.status(404).send({
                message: "Pengunjung tidak ditemukan",
                data: null
            });
        }

        // Jika pengunjung ditemukan
        return res.send({
            message: "Success",
            data: pengunjung,
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};


/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */


// const create = async(req, res, _next) => {
//     try {
//         const currentUser = req.user.id;
//         const {
//             wbp_id,
//             nama,
//             jenis_kelamin,
//             nik,
//             alamat,
//             hp,
//             hubungan_keluarga,
//             pengikut_laki_laki,
//             pengikut_perempuan,
//             pengikut_anak_anak,
//             pengikut_bayi,
//             total_pengikut,
//             keterangan,
//         } = req.body;

//         console.log("user:", currentUser);

//         const verificationCode = generateVerificationCode();

//         // console.log("ini kode", verificationCode)

//         // Inisialisasi objek untuk menyimpan data pengunjung
//         const pengunjungData = {
//             user_id: currentUser,
//             wbp_id,
//             nama,
//             jenis_kelamin,
//             nik,
//             alamat,
//             hp,
//             hubungan_keluarga,
//             pengikut_laki_laki,
//             pengikut_perempuan,
//             pengikut_anak_anak,
//             pengikut_bayi,
//             kode: verificationCode,
//             total_pengikut,
//             keterangan,

//         };

//         // Jika file photo_ktp diunggah, tambahkan URL-nya ke pengunjungData
//         if (req.files && req.files.photo_ktp) {
//             pengunjungData.photo_ktp = req.files.photo_ktp[0].path; // Path dari Cloudinary
//         }

//         // Jika file photo_pengunjung diunggah, tambahkan URL-nya ke pengunjungData
//         if (req.files && req.files.photo_pengunjung) {
//             pengunjungData.photo_pengunjung = req.files.photo_pengunjung[0].path; // Path dari Cloudinary
//         }

//         // Buat data pengunjung baru di database
//         const newPengunjung = await PengunjungModel.create(pengunjungData);

//         // console.log("New Pengunjung:", newPengunjung);

//         return res.status(201).send({
//             message: "Pengunjung created successfully",
//             data: newPengunjung,
//         });
//     } catch (error) {
//         console.error("Error:", error.message);

//         // Tangani error Multer
//         if (error instanceof multer.MulterError) {
//             return res.status(400).send({ message: error.message });
//         } else if (error.message === "File harus berupa gambar!") {
//             return res.status(400).send({ message: error.message });
//         } else {
//             // Tangani error lainnya
//             return res.status(500).send({ message: "Internal Server Error" });
//         }
//     }
// };


const create = async(req, res, _next) => {
    try {
        const currentUser = req.user.id;
        const email = req.user.email;
        console.log("ini email", email)
        const {
            wbp_id,
            nama,
            jenis_kelamin,
            nik,
            alamat,
            hp,
            hubungan_keluarga,
            tujuan,
            pengikut_laki_laki,
            pengikut_perempuan,
            pengikut_anak_anak,
            pengikut_bayi,
            total_pengikut,
            keterangan,
            kode,
            photo_ktp,
            photo_pengunjung,
            barcode
        } = req.body;

        console.log("user:", currentUser);

        // const verificationCode = generateVerificationCode();

        // // Data yang akan dienkripsi ke dalam QR Code
        // const qrCodeData = verificationCode


        // // Path untuk menyimpan QR Code
        // const qrCodeDir = path.join(__dirname, '..', 'public', 'qrcodes');
        // if (!fs.existsSync(qrCodeDir)) {
        //     fs.mkdirSync(qrCodeDir, { recursive: true }); // Buat direktori jika belum ada
        // }

        // const qrCodeFileName = `${verificationCode}.png`;
        // const qrCodePath = path.join(qrCodeDir, qrCodeFileName);

        // // Generate QR Code dan simpan sebagai gambar
        // await QRCode.toFile(qrCodePath, qrCodeData, {
        //     width: 300, // Ukuran QR Code
        //     errorCorrectionLevel: 'H' // Tingkat koreksi error (High)
        // });

        // console.log("QR Code created successfully:", qrCodePath);

        // // Upload QR Code ke Cloudinary
        // const cloudinaryUploadResult = await cloudinary.uploader.upload(qrCodePath, {
        //     folder: 'qrcodes' // Folder di Cloudinary untuk menyimpan QR Code
        // });

        // console.log("QR Code uploaded to Cloudinary:", cloudinaryUploadResult.secure_url);

        // // URL publik untuk mengakses QR Code dari Cloudinary
        // const qrCodeUrl = cloudinaryUploadResult.secure_url;

        // console.log("QR Code URL:", qrCodeUrl);

        // // Hapus file QR Code lokal setelah diupload ke Cloudinary
        // fs.unlinkSync(qrCodePath);

        // Inisialisasi objek untuk menyimpan data pengunjung
        const pengunjungData = {
            user_id: currentUser,
            wbp_id,
            nama,
            jenis_kelamin,
            nik,
            alamat,
            hp,
            hubungan_keluarga,
            tujuan,
            pengikut_laki_laki,
            pengikut_perempuan,
            pengikut_anak_anak,
            pengikut_bayi,
            kode,
            total_pengikut,
            keterangan,
            photo_ktp,
            photo_pengunjung,
            barcode // Simpan URL QR Code dari Cloudinary ke database
        };

        console.log("Pengunjung Data:", pengunjungData);

        // Jika file photo_ktp diunggah, tambahkan URL-nya ke pengunjungData
        if (req.files && req.files.photo_ktp) {
            const ktpUploadResult = await cloudinary.uploader.upload(req.files.photo_ktp[0].path, {
                folder: 'photo_ktp' // Folder di Cloudinary untuk menyimpan foto KTP
            });
            pengunjungData.photo_ktp = ktpUploadResult.secure_url; // Simpan URL Cloudinary ke database
        }

        // Jika file photo_pengunjung diunggah, tambahkan URL-nya ke pengunjungData
        if (req.files && req.files.photo_pengunjung) {
            const pengunjungUploadResult = await cloudinary.uploader.upload(req.files.photo_pengunjung[0].path, {
                folder: 'photo_pengunjung' // Folder di Cloudinary untuk menyimpan foto pengunjung
            });
            pengunjungData.photo_pengunjung = pengunjungUploadResult.secure_url; // Simpan URL Cloudinary ke database
        }


        // Buat data pengunjung baru di database
        const newPengunjung = await PengunjungModel.create(pengunjungData);
        // await sendBarcode(email, qrCodeUrl)

        return res.status(201).send({
            message: "Pengunjung created successfully",
            data: newPengunjung,
        });
    } catch (error) {
        console.error("Error:", error.message);

        // Tangani error Multer
        if (error instanceof multer.MulterError) {
            return res.status(400).send({ message: error.message });
        } else if (error.message === "File harus berupa gambar!") {
            return res.status(400).send({ message: error.message });
        } else {
            // Tangani error lainnya
            return res.status(500).send({ message: "Internal Server Error" });
        }
    }
};


const createDataPengunjung = async(req, res, _next) => {
    try {
        const currentUser = req.user.id;
        const email = req.user.email;
        console.log("ini email", email)
        const {
            wbp_id,
            nama,
            jenis_kelamin,
            nik,
            alamat,
            hp,
            hubungan_keluarga,
            photo_ktp,
            photo_pengunjung,
        } = req.body;

        console.log("user:", currentUser);

        const verificationCode = generateVerificationCode();

        // Data yang akan dienkripsi ke dalam QR Code
        const qrCodeData = verificationCode


        // Path untuk menyimpan QR Code
        const qrCodeDir = path.join(__dirname, '..', 'public', 'qrcodes');
        if (!fs.existsSync(qrCodeDir)) {
            fs.mkdirSync(qrCodeDir, { recursive: true }); // Buat direktori jika belum ada
        }

        const qrCodeFileName = `${verificationCode}.png`;
        const qrCodePath = path.join(qrCodeDir, qrCodeFileName);

        // Generate QR Code dan simpan sebagai gambar
        await QRCode.toFile(qrCodePath, qrCodeData, {
            width: 300, // Ukuran QR Code
            errorCorrectionLevel: 'H' // Tingkat koreksi error (High)
        });

        console.log("QR Code created successfully:", qrCodePath);

        // Upload QR Code ke Cloudinary
        const cloudinaryUploadResult = await cloudinary.uploader.upload(qrCodePath, {
            folder: 'qrcodes' // Folder di Cloudinary untuk menyimpan QR Code
        });

        console.log("QR Code uploaded to Cloudinary:", cloudinaryUploadResult.secure_url);

        // URL publik untuk mengakses QR Code dari Cloudinary
        const qrCodeUrl = cloudinaryUploadResult.secure_url;

        console.log("QR Code URL:", qrCodeUrl);

        // Hapus file QR Code lokal setelah diupload ke Cloudinary
        fs.unlinkSync(qrCodePath);

        // Inisialisasi objek untuk menyimpan data pengunjung
        const pengunjungData = {
            user_id: currentUser,
            wbp_id,
            nama,
            jenis_kelamin,
            nik,
            alamat,
            hp,
            hubungan_keluarga,
            photo_ktp,
            photo_pengunjung,
            kode: verificationCode,
            barcode: qrCodeUrl // Simpan URL QR Code dari Cloudinary ke database
        };

        console.log("Pengunjung Data:", pengunjungData);

        // Jika file photo_ktp diunggah, tambahkan URL-nya ke pengunjungData
        if (req.files && req.files.photo_ktp) {
            const ktpUploadResult = await cloudinary.uploader.upload(req.files.photo_ktp[0].path, {
                folder: 'photo_ktp' // Folder di Cloudinary untuk menyimpan foto KTP
            });
            pengunjungData.photo_ktp = ktpUploadResult.secure_url; // Simpan URL Cloudinary ke database
        }

        // Jika file photo_pengunjung diunggah, tambahkan URL-nya ke pengunjungData
        if (req.files && req.files.photo_pengunjung) {
            const pengunjungUploadResult = await cloudinary.uploader.upload(req.files.photo_pengunjung[0].path, {
                folder: 'photo_pengunjung' // Folder di Cloudinary untuk menyimpan foto pengunjung
            });
            pengunjungData.photo_pengunjung = pengunjungUploadResult.secure_url; // Simpan URL Cloudinary ke database
        }

        // Buat data pengunjung baru di database
        const newPengunjung = await DataPengunjungModel.create(pengunjungData);
        await sendBarcode(email, qrCodeUrl, nama)

        return res.status(201).send({
            message: "Pengunjung created successfully",
            data: newPengunjung,
        });
    } catch (error) {
        console.error("Error:", error.message);

        // Tangani error Multer
        if (error instanceof multer.MulterError) {
            return res.status(400).send({ message: error.message });
        } else if (error.message === "File harus berupa gambar!") {
            return res.status(400).send({ message: error.message });
        } else {
            // Tangani error lainnya
            return res.status(500).send({ message: "Internal Server Error" });
        }
    }
};


// const update = async(req, res, _next) => {
//     const currentUser = req.user.id;
//     try {
//         const { kode } = req.params; // ID pengunjung yang akan diupdate
//         const {
//             wbp_id,
//             nama,
//             jenis_kelamin,
//             nik,
//             alamat,
//             hp,
//             hubungan_keluarga,
//             pengikut_laki_laki,
//             pengikut_perempuan,
//             pengikut_anak_anak,
//             pengikut_bayi,
//             total_pengikut,
//         } = req.body;

//         console.log("Request body:", req.body);

//         console.log("current user", currentUser)

//         // Cari pengunjung berdasarkan ID
//         const pengunjung = await PengunjungModel.findByOne(kode);

//         if (!pengunjung) {
//             return res.status(404).send({
//                 message: "Pengunjung tidak ditemukan",
//                 data: null,
//             });
//         }

//         // Inisialisasi objek untuk menyimpan data yang akan diupdate
//         const updateData = {
//             user_id: currentUser,
//             wbp_id,
//             nama,
//             jenis_kelamin,
//             nik,
//             alamat,
//             hp,
//             hubungan_keluarga,
//             pengikut_laki_laki,
//             pengikut_perempuan,
//             pengikut_anak_anak,
//             pengikut_bayi,
//             total_pengikut,
//         };

//         // Jika file photo_ktp diunggah, tambahkan URL-nya ke updateData
//         if (req.files && req.files.photo_ktp) {
//             updateData.photo_ktp = req.files.photo_ktp[0].path; // Path dari Cloudinary
//         }

//         // Jika file photo_pengunjung diunggah, tambahkan URL-nya ke updateData
//         if (req.files && req.files.photo_pengunjung) {
//             updateData.photo_pengunjung = req.files.photo_pengunjung[0].path; // Path dari Cloudinary
//         }

//         // Update data pengunjung
//         await pengunjung.update(updateData);

//         console.log("Updated Pengunjung:", pengunjung);

//         return res.send({
//             message: "Pengunjung updated successfully",
//             data: pengunjung,
//         });
//     } catch (error) {
//         console.error("Error:", error.message);

//         // Tangani error Multer
//         if (error instanceof multer.MulterError) {
//             return res.status(400).send({ message: error.message });
//         } else if (error.message === "File harus berupa gambar!") {
//             return res.status(400).send({ message: error.message });
//         } else {
//             // Tangani error lainnya
//             return res.status(500).send({ message: "Internal Server Error" });
//         }
//     }
// };

const update = async(req, res, _next) => {
    const currentUser = req.user.id;
    try {
        const { id } = req.params; // ID pengunjung yang akan diupdate
        const {
            wbp_id,
            nama,
            jenis_kelamin,
            nik,
            alamat,
            hp,
            hubungan_keluarga,
            tujuan,
            pengikut_laki_laki,
            pengikut_perempuan,
            pengikut_anak_anak,
            pengikut_bayi,
            total_pengikut,
        } = req.body;

        console.log("Request body:", req.body);
        console.log("current user", currentUser);

        // Cari pengunjung berdasarkan ID
        const pengunjung = await PengunjungModel.findOne({ where: { id } });

        if (!pengunjung) {
            return res.status(404).send({
                message: "Pengunjung tidak ditemukan",
                data: null,
            });
        }

        // Inisialisasi objek untuk menyimpan data yang akan diupdate
        const updateData = {
            user_id: currentUser,
            wbp_id,
            nama,
            jenis_kelamin,
            nik,
            alamat,
            hp,
            hubungan_keluarga,
            tujuan,
            pengikut_laki_laki,
            pengikut_perempuan,
            pengikut_anak_anak,
            pengikut_bayi,
            total_pengikut,
        };

        // Jika file photo_ktp diunggah, tambahkan URL-nya ke updateData
        if (req.files && req.files.photo_ktp) {
            updateData.photo_ktp = req.files.photo_ktp[0].path; // Path dari Cloudinary
        }

        // Jika file photo_pengunjung diunggah, tambahkan URL-nya ke updateData
        if (req.files && req.files.photo_pengunjung) {
            updateData.photo_pengunjung = req.files.photo_pengunjung[0].path; // Path dari Cloudinary
        }

        // Update data pengunjung
        await pengunjung.update(updateData);

        console.log("Updated Pengunjung:", pengunjung);

        return res.send({
            message: "Pengunjung updated successfully",
            data: pengunjung,
        });
    } catch (error) {
        console.error("Error:", error.message);

        // Tangani error Multer
        if (error instanceof multer.MulterError) {
            return res.status(400).send({ message: error.message });
        } else if (error.message === "File harus berupa gambar!") {
            return res.status(400).send({ message: error.message });
        } else {
            // Tangani error lainnya
            return res.status(500).send({ message: "Internal Server Error" });
        }
    }
};
const updateDataPengunjung = async(req, res, _next) => {
    const currentUser = req.user.id;
    try {
        const { kode } = req.params;
        const {
            wbp_id,
            nama,
            jenis_kelamin,
            nik,
            alamat,
            hp,
            hubungan_keluarga,
        } = req.body;

        console.log("Request body:", req.body);
        console.log("Current user:", currentUser);

        // Cari data pengunjung berdasarkan kode
        const pengunjung = await DataPengunjungModel.findOne({ where: { kode } });

        console.log("pengun jung iiiiiiiiiiiiiiiiiiiiiii", pengunjung)

        if (!pengunjung) {
            return res.status(404).send({
                message: "Data pengunjung tidak ditemukan",
                data: null,
            });
        }

        // Inisialisasi objek untuk menyimpan data yang akan diupdate
        const updateData = {
            user_id: currentUser,
            wbp_id,
            nama,
            jenis_kelamin,
            nik,
            alamat,
            hp,
            hubungan_keluarga,
        };

        // Jika file photo_ktp diunggah, upload ke Cloudinary dan update path
        if (req.files && req.files.photo_ktp) {
            const ktpUploadResult = await cloudinary.uploader.upload(req.files.photo_ktp[0].path, {
                folder: 'photo_ktp'
            });
            updateData.photo_ktp = ktpUploadResult.secure_url;
        }

        // Jika file photo_pengunjung diunggah, upload ke Cloudinary dan update path
        if (req.files && req.files.photo_pengunjung) {
            const pengunjungUploadResult = await cloudinary.uploader.upload(req.files.photo_pengunjung[0].path, {
                folder: 'photo_pengunjung'
            });
            updateData.photo_pengunjung = pengunjungUploadResult.secure_url;
        }

        // Update data pengunjung
        await pengunjung.update(updateData);

        console.log("Updated Data Pengunjung:", pengunjung);

        return res.send({
            message: "Data pengunjung berhasil diupdate",
            data: pengunjung,
        });
    } catch (error) {
        console.error("Error:", error.message);

        // Tangani error Multer
        if (error instanceof multer.MulterError) {
            return res.status(400).send({ message: error.message });
        } else if (error.message === "File harus berupa gambar!") {
            return res.status(400).send({ message: error.message });
        } else {
            return res.status(500).send({ message: "Internal Server Error" });
        }
    }
};


// const updateAntrian = async(req, res) => {
//     const transaction = await sequelize.transaction();
//     try {
//         const { id } = req.body;

//         if (!id) {
//             await transaction.rollback();
//             return res.status(400).send({ message: "Kode harus disertakan dalam request body", data: null });
//         }

//         const pengunjung = await PengunjungModel.findOne({ where: { id }, transaction });
//         if (!pengunjung) {
//             await transaction.rollback();
//             return res.status(404).send({ message: "Pengunjung tidak ditemukan", data: null });
//         }


//         const timeZone = 'Asia/Makassar';
//         const now = new Date();
//         const zonedDate = toZonedTime(now, timeZone);
//         const dateString = format(zonedDate, 'yyyyMMdd');
//         const startOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T00:00:00+08:00');
//         const endOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T23:59:59.999+08:00');

//         const lastPengunjung = await PengunjungModel.findOne({
//             where: {
//                 antrian: {
//                     [Sequelize.Op.like]: `${dateString}-%`
//                 },
//                 createdAt: {
//                     [Sequelize.Op.between]: [startOfDay, endOfDay]
//                 }
//             },
//             order: [
//                 ['antrian', 'DESC']
//             ],
//             lock: transaction.LOCK.UPDATE,
//             transaction,
//             attributes: ['antrian']
//         });

//         let lastNumber = 0;
//         if (lastPengunjung && lastPengunjung.antrian) {
//             const lastAntrian = lastPengunjung.antrian;
//             if (typeof lastAntrian === 'string' && lastAntrian.includes('-')) {
//                 const lastNumberStr = lastAntrian.split('-')[1];
//                 lastNumber = parseInt(lastNumberStr, 10);
//             }
//         }

//         const newAntrianNumber = lastNumber + 1;
//         const newAntrian = `${dateString}-${newAntrianNumber.toString().padStart(3, '0')}`;

//         await pengunjung.update({ antrian: newAntrian }, { transaction });
//         await transaction.commit();

//         // // 🖨️ Cetak tiket otomatis setelah update berhasil
//         // printTicket({
//         //     antrian: newAntrian,
//         //     nama: pengunjung.nama,
//         //     barcode: pengunjung.barcode,
//         //     kode: pengunjung.kode,
//         //     tanggal: format(zonedDate, 'dd-MM-yyyy'),
//         // });

//         return res.send({
//             message: "Antrian berhasil diupdate & dicetak otomatis",
//             data: {...pengunjung.toJSON(), antrian: newAntrian }
//         });

//     } catch (error) {
//         await transaction.rollback();
//         console.error("Error:", error.message);
//         return res.status(500).send({ message: "Internal Server Error" });
//     }
// };

const updateAntrian = async(req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.body;

        if (!id) {
            await transaction.rollback();
            return res.status(400).send({ message: "Kode harus disertakan dalam request body", data: null });
        }

        const pengunjung = await PengunjungModel.findOne({ where: { id }, transaction });
        if (!pengunjung) {
            await transaction.rollback();
            return res.status(404).send({ message: "Pengunjung tidak ditemukan", data: null });
        }

        // Waktu dan zona waktu Makassar
        const timeZone = 'Asia/Makassar';
        const now = new Date();
        const zonedDate = toZonedTime(now, timeZone);

        // Format tanggal
        const dateString = format(zonedDate, 'yyyyMMdd');

        // Tentukan sesi berdasarkan waktu
        const hour = parseInt(format(zonedDate, 'HH', { timeZone: timeZone }), 10);
        const isSesiPagi = hour >= 0 && hour < 12;
        const sesiPrefix = isSesiPagi ? '' : 'A';

        // Filter batas waktu untuk hari ini
        const startOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T00:00:00+08:00');
        const endOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T23:59:59.999+08:00');

        // Cari nomor antrian terbesar untuk sesi yang sama hari ini
        const lastPengunjung = await PengunjungModel.findOne({
            where: {
                antrian: {
                    [Sequelize.Op.like]: `${dateString}-${sesiPrefix}%`
                },
                createdAt: {
                    [Sequelize.Op.between]: [startOfDay, endOfDay]
                }
            },
            order: [
                ['antrian', 'DESC']
            ],
            lock: transaction.LOCK.UPDATE,
            transaction,
            attributes: ['antrian']
        });

        let lastNumber = 0;
        if (lastPengunjung && lastPengunjung.antrian) {
            const lastAntrian = lastPengunjung.antrian;
            if (typeof lastAntrian === 'string' && lastAntrian.includes('-')) {
                const numberPart = lastAntrian.split('-')[1];
                // Hapus prefix 'A' jika ada untuk mendapatkan angka murni
                const pureNumber = numberPart.replace('A', '');
                lastNumber = parseInt(pureNumber, 10);
            }
        }

        // Generate nomor antrian baru
        const newAntrianNumber = lastNumber + 1;
        const newAntrian = `${dateString}-${sesiPrefix}${newAntrianNumber.toString().padStart(3, '0')}`;

        await pengunjung.update({ antrian: newAntrian }, { transaction });
        await transaction.commit();

        // Cetak tiket otomatis setelah update berhasil
        // printTicket({
        //     antrian: newAntrian,
        //     nama: pengunjung.nama,
        //     barcode: pengunjung.barcode,
        //     kode: pengunjung.kode,
        //     tanggal: format(zonedDate, 'dd-MM-yyyy'),
        //     sesi: isSesiPagi ? "PAGI" : "SIANG"
        // });

        return res.send({
            message: "Antrian berhasil diupdate & dicetak otomatis",
            data: {
                ...pengunjung.toJSON(),
                antrian: newAntrian,
                sesi: isSesiPagi ? "pagi" : "siang"
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error("Error:", error.message);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};


const listStruk = async(req, res) => {
    try {
        // path folder root project
        const folderPath = path.join(process.cwd(), "./"); // ⬅️ ini pasti ke root (sejajar package.json)

        // ambil semua file PDF di root
        const files = fs.readdirSync(folderPath)
            .filter(file => file.endsWith(".pdf"));

        if (files.length === 0) {
            return res.status(404).send({
                message: "Belum ada file struk yang digenerate",
                data: [],
            });
        }

        // bikin URL supaya bisa diakses lewat browser
        const fileUrls = files.map(file => ({
            name: file,
            url: `${req.protocol}://${req.get("host")}/struks/${file}`
        }));

        return res.send({
            message: "Daftar struk berhasil diambil",
            data: fileUrls,
        });
    } catch (error) {
        console.error("Error listStruk:", error.message);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};



// controllers/pengunjung.controller.js - VERSI SIMPLE
const cetakLabelTitipan = async(req, res) => {
    try {
        const { kode } = req.body;

        if (!kode) {
            return res.status(400).send({
                success: false,
                message: "Kode harus disertakan",
            });
        }

        const pengunjung = await PengunjungModel.findOne({
            where: { kode },
            include: [
                { model: WbpModel, as: "warga_binaan" },
                { model: BarangTitipanModel, as: "barang_titipan" },
            ],
        });

        if (!pengunjung) {
            return res.status(404).send({
                success: false,
                message: "Pengunjung tidak ditemukan",
            });
        }

        const titipan = pengunjung.barang_titipan || {};
        const namaWbp = "-";

        // METHOD PALING SIMPLE - Copy command saja
        try {
            const fs = require('fs');
            const path = require('path');
            const { exec } = require('child_process');

            // Buat content
            const content = [
                "LABEL TITIPAN",
                "RUTAN BANTAENG",
                "",
                `KODE        : ${pengunjung.kode}`,
                `NAMA WBP    : ${namaWbp}`,
                `PENGIRIM    : ${pengunjung.nama || "-"}`,
                `ALAMAT      : ${pengunjung.alamat || "-"}`,
                `JENIS BARANG: ${titipan.jenis || "-"}`,
                `JUMLAH      : ${titipan.jumlah || "-"}`,
                "",
                "~ TERIMA KASIH ~",
                `Tgl: ${new Date().toLocaleDateString('id-ID')}`,
                ""
            ].join('\r\n');

            // Simpan file
            const tempFile = path.join(__dirname, '../temp', `print_${Date.now()}.txt`);
            const tempDir = path.dirname(tempFile);

            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            fs.writeFileSync(tempFile, content, 'utf8');

            // Print menggunakan COPY command (paling reliable)
            const command = `copy "${tempFile}" "\\\\localhost\\EPPOS EP 200"`;

            exec(command, (error, stdout, stderr) => {
                // Cleanup regardless of result
                try {
                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile);
                    }
                } catch (e) {
                    console.log("Cleanup error:", e.message);
                }

                if (error) {
                    console.error("Print error:", error);
                    res.status(500).send({
                        success: false,
                        message: `Gagal mencetak: ${error.message}`,
                        error: "Pastikan printer 'EPPOS EP 200' terinstall dan ready"
                    });
                } else {
                    console.log("Print success:", stdout);
                    res.send({
                        success: true,
                        message: "✅ Label titipan berhasil dicetak",
                        data: pengunjung
                    });
                }
            });

        } catch (error) {
            res.status(500).send({
                success: false,
                message: "Error sistem: " + error.message
            });
        }

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};
const verifyCode = async(req, res, next) => {
    const { id } = req.body;
    const currentUser = req.user;

    try {
        // Cari pengunjung berdasarkan ID
        const pengunjung = await PengunjungModel.findOne({ where: { id } });

        // Jika pengunjung tidak ditemukan
        if (!pengunjung) {
            return res.status(404).json({ message: "Pengunjung tidak ditemukan" });
        }

        // Jika status sudah "Valid, Divalidasi Oleh P2U", kembalikan pesan error
        if (pengunjung.status === 'Valid, Divalidasi Oleh P2U') {
            return res.status(400).json({ message: "Kode sudah diverifikasi oleh P2U" });
        }

        // Jika role user adalah admin
        if (currentUser.role === 'admin') {
            // Pastikan status sebelumnya adalah "Tidak Valid"
            if (pengunjung.status !== 'Tidak Valid') {
                return res.status(400).json({ message: "Hanya dapat memverifikasi pengunjung dengan status 'Tidak Valid'" });
            }

            // Ubah status menjadi "Valid Divalidasi oleh Petugas Kunjungan"
            pengunjung.status = 'Valid Divalidasi oleh Petugas Kunjungan';
            await pengunjung.save();

            return res.status(200).json({
                message: "Status berhasil diubah menjadi 'Valid Divalidasi oleh Petugas Kunjungan'",
                data: pengunjung,
            });
        }

        // Jika role user adalah p2u
        if (currentUser.role === 'p2u') {
            // Pastikan status sebelumnya adalah "Valid Divalidasi oleh Petugas Kunjungan"
            if (pengunjung.status !== 'Valid Divalidasi oleh Petugas Kunjungan') {
                return res.status(400).json({ message: "Kode belum diverifikasi oleh petugas kunjungan" });
            }

            // Ubah status menjadi "Valid, Divalidasi Oleh P2U"
            pengunjung.status = 'Valid, Divalidasi Oleh P2U';
            await pengunjung.save();

            return res.status(200).json({
                message: "Status berhasil diubah menjadi 'Valid, Divalidasi Oleh P2U'",
                data: pengunjung,
            });
        }

        // Jika role user bukan admin atau p2u
        return res.status(403).json({ message: "Unauthorized atau anda tidak memiliki izin" });
    } catch (err) {
        console.error("Error:", err.message);
        return res.status(500).json({ message: "Terjadi kesalahan server. Silakan coba lagi." });
    }
};

module.exports = {
    index,
    getPengunjung,
    indexUser,
    show,
    showByKode,
    showPengunjungData,
    showPengunjungByKode,
    create,
    createDataPengunjung,
    update,
    updateDataPengunjung,
    verifyCode,
    updateAntrian,
    getLastAntrian,
    listStruk,
    cetakLabelTitipan
};