const multer = require("multer");
const crypto = require("crypto");
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary'); // Import modul Cloudinary
const { user: UserModel, warga_binaan: WbpModel, pengunjung: PengunjungModel, barang_titipan: BarangTitipanModel } = require("../models");
const { Op, Sequelize } = require("sequelize");
const nodemailer = require("nodemailer");

const generateVerificationCode = () => crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 karakter kode acak

const sendBarcode = async(email, qrCodeUrl) => {
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
const getLastAntrian = async(req, res) => {
    try {
        // Cari pengunjung dengan antrian terakhir (berdasarkan created_at)
        const lastPengunjung = await PengunjungModel.findOne({
            where: {
                antrian: {
                    [Op.not]: null, // Hanya ambil data yang antrian-nya tidak null
                    [Op.like]: '%-%' // Hanya ambil data yang mengandung tanda '-'
                }
            },
            order: [
                ['created_at', 'DESC']
            ], // Urutkan berdasarkan created_at descending
            attributes: ['antrian'], // Ambil hanya kolom antrian
        });

        let lastNumber = 0;

        // Jika ada data pengunjung dengan antrian, ekstrak nomor terakhir
        if (lastPengunjung && lastPengunjung.antrian) {
            const lastAntrian = lastPengunjung.antrian;

            // Pastikan lastAntrian adalah string dan memiliki format yang benar
            if (typeof lastAntrian === 'string' && lastAntrian.includes('-')) {
                const lastNumberStr = lastAntrian.split('-')[1]; // Ambil bagian nomor setelah tanggal
                lastNumber = parseInt(lastNumberStr, 10); // Konversi ke integer
            } else {
                console.warn('Format antrian tidak valid:', lastAntrian);
            }
        }

        return res.status(200).json({
            message: "Success",
            lastNumber: lastNumber,
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
        const { kode } = req.params; // Ambil kode dari req.body

        // Validasi: Pastikan kode ada di req.body
        if (!kode) {
            return res.status(400).send({
                message: "Kode harus disertakan dalam request body",
                data: null
            });
        }

        // Cari pengunjung berdasarkan kode
        const pengunjung = await PengunjungModel.findOne({
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
            pengikut_laki_laki,
            pengikut_perempuan,
            pengikut_anak_anak,
            pengikut_bayi,
            total_pengikut,
            keterangan
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
            pengikut_laki_laki,
            pengikut_perempuan,
            pengikut_anak_anak,
            pengikut_bayi,
            kode: verificationCode,
            total_pengikut,
            keterangan,
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
        const newPengunjung = await PengunjungModel.create(pengunjungData);
        await sendBarcode(email, qrCodeUrl)

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
        const { kode } = req.params; // ID pengunjung yang akan diupdate
        const {
            wbp_id,
            nama,
            jenis_kelamin,
            nik,
            alamat,
            hp,
            hubungan_keluarga,
            pengikut_laki_laki,
            pengikut_perempuan,
            pengikut_anak_anak,
            pengikut_bayi,
            total_pengikut,
        } = req.body;

        console.log("Request body:", req.body);
        console.log("current user", currentUser);

        // Cari pengunjung berdasarkan ID
        const pengunjung = await PengunjungModel.findOne({ where: { kode } });

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

const updateAntrian = async(req, res) => {
    try {
        const { kode } = req.body;

        // Validasi input
        if (!kode) {
            return res.status(400).send({
                message: "Kode harus disertakan dalam request body",
                data: null,
            });
        }

        // Cari pengunjung berdasarkan kode
        const pengunjung = await PengunjungModel.findOne({ where: { kode } });

        // Jika pengunjung tidak ditemukan
        if (!pengunjung) {
            return res.status(404).send({
                message: "Pengunjung tidak ditemukan",
                data: null,
            });
        }

        // Generate nomor antrian baru
        const today = new Date();
        const dateString = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

        // Cari nomor antrian terakhir untuk hari ini
        const lastPengunjung = await PengunjungModel.findOne({
            where: {
                antrian: {
                    [Sequelize.Op.like]: `${dateString}-%`,
                },
            },
            order: [
                ['created_at', 'DESC']
            ],
            attributes: ['antrian'],
        });

        let lastNumber = 0;
        if (lastPengunjung && lastPengunjung.antrian) {
            const lastAntrian = lastPengunjung.antrian;
            if (typeof lastAntrian === 'string' && lastAntrian.includes('-')) {
                const lastNumberStr = lastAntrian.split('-')[1];
                lastNumber = parseInt(lastNumberStr, 10);
            }
        }

        // Generate nomor antrian baru
        const newAntrianNumber = lastNumber + 1;
        const newAntrian = `${dateString}-${newAntrianNumber.toString().padStart(3, '0')}`;

        // Update antrian pengunjung
        await pengunjung.update({ antrian: newAntrian });

        return res.send({
            message: "Antrian berhasil diupdate",
            data: {
                ...pengunjung.toJSON(),
                antrian: newAntrian,
            },
        });
    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};

// const updateAntrian = async(req, res, _next) => {
//     try {
//         const { kode, antrian } = req.body; // Ambil id dan antrian dari body

//         console.log("Request body:", req.body); // Debug: Cetak request body
//         console.log("Current user:", req.user.id); // Debug: Cetak ID user yang sedang login

//         // Validasi input
//         if (!kode || !antrian) {
//             return res.status(400).send({
//                 message: "ID dan antrian harus disertakan dalam request body",
//                 data: null,
//             });
//         }

//         // Cari pengunjung berdasarkan ID
//         const pengunjung = await PengunjungModel.findOne({ where: { kode } });
//         console.log("Hasil query:", pengunjung); // Debug: Cetak hasil query

//         // Jika pengunjung tidak ditemukan
//         if (!pengunjung) {
//             return res.status(404).send({
//                 message: "Pengunjung tidak ditemukan",
//                 data: null,
//             });
//         }

//         // Update antrian
//         await pengunjung.update({ antrian });

//         return res.send({
//             message: "Antrian berhasil diupdate",
//             data: pengunjung,
//         });
//     } catch (error) {
//         console.error("Error:", error.message);
//         return res.status(500).send({ message: "Internal Server Error" });
//     }
// };

// const updateAntrian = async(req, res, _next) => {
//     try {
//         const { kode } = req.body; // Ambil kode dari body

//         console.log("Request body:", req.body); // Debug: Cetak request body
//         console.log("Current user:", req.user.id); // Debug: Cetak ID user yang sedang login

//         // Validasi input
//         if (!kode) {
//             return res.status(400).send({
//                 message: "Kode harus disertakan dalam request body",
//                 data: null,
//             });
//         }

//         // Cari pengunjung berdasarkan kode
//         const pengunjung = await PengunjungModel.findOne({ where: { kode } });
//         console.log("Hasil query:", pengunjung); // Debug: Cetak hasil query

//         // Jika pengunjung tidak ditemukan
//         if (!pengunjung) {
//             return res.status(404).send({
//                 message: "Pengunjung tidak ditemukan",
//                 data: null,
//             });
//         }

//         // Generate nomor antrian baru
//         const today = new Date();
//         const dateString = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

//         // Cari nomor antrian terakhir untuk hari ini
//         const lastPengunjung = await PengunjungModel.findOne({
//             where: {
//                 antrian: {
//                     [Sequelize.Op.like]: `${dateString}-%` // Cari antrian dengan format YYYYMMDD-NNN
//                 }
//             },
//             order: [
//                 ['created_at', 'DESC']
//             ], // Urutkan berdasarkan created_at descending
//             attributes: ['antrian'], // Ambil hanya kolom antrian
//         });

//         let lastNumber = 0;

//         // Jika ada data pengunjung dengan antrian, ekstrak nomor terakhir
//         if (lastPengunjung && lastPengunjung.antrian) {
//             const lastAntrian = lastPengunjung.antrian;

//             // Pastikan lastAntrian adalah string dan memiliki format yang benar
//             if (typeof lastAntrian === 'string' && lastAntrian.includes('-')) {
//                 const lastNumberStr = lastAntrian.split('-')[1]; // Ambil bagian nomor setelah tanggal
//                 lastNumber = parseInt(lastNumberStr, 10); // Konversi ke integer
//             } else {
//                 console.warn('Format antrian tidak valid:', lastAntrian);
//             }
//         }

//         // Generate nomor antrian baru
//         const newAntrianNumber = lastNumber + 1;
//         const newAntrian = `${dateString}-${newAntrianNumber.toString().padStart(3, '0')}`;

//         // Update antrian pengunjung
//         await pengunjung.update({ antrian: newAntrian });

//         return res.send({
//             message: "Antrian berhasil diupdate",
//             data: {
//                 ...pengunjung.toJSON(),
//                 antrian: newAntrian, // Sertakan nomor antrian baru di response
//             },
//         });
//     } catch (error) {
//         console.error("Error:", error.message);
//         return res.status(500).send({ message: "Internal Server Error" });
//     }
// };



// const verifyCode = async(req, res, next) => {
//     const { id } = req.body;
//     const currentUser = req.user;

//     try {
//         const pengunjung = await PengunjungModel.findOne({ where: { id } });

//         console.log("current user", currentUser);

//         if (!pengunjung) {
//             return res.status(404).json({ message: "Pengunjung not found" });
//         }

//         // Jika status sudah divalidasi oleh P2U, kembalikan pesan error
//         if (pengunjung.status === 'Valid, Divalidasi Oleh P2U') {
//             return res.status(400).json({ message: "Kode sudah diverifikasi oleh P2U" });
//         }

//         // Jika role user adalah admin, ubah status menjadi 'Valid Divalidasi oleh Petugas Kunjungan'
//         if (currentUser.role === 'admin') {
//             pengunjung.status = 'Valid Divalidasi oleh Petugas Kunjungan';
//             await pengunjung.save();
//         }


//         // Jika role user adalah p2u, cek apakah status sudah divalidasi oleh admin
//         if (currentUser.role === 'p2u') {
//             if (pengunjung.status !== 'Valid Divalidasi oleh Petugas Kunjungan') {
//                 return res.status(400).json({ message: "Kode belum diverifikasi oleh petugas kunjungan" });
//             }

//             // Ubah status menjadi 'Valid, Divalidasi Oleh P2U'
//             pengunjung.status = 'Valid, Divalidasi Oleh P2U';
//             await pengunjung.save();
//         }

//         // Jika role user bukan admin atau p2u, kembalikan pesan unauthorized
//         if (currentUser.role !== 'admin' && currentUser.role !== 'p2u') {
//             return res.status(403).json({ message: "Unauthorized atau anda tidak memiliki izin" });
//         }

//         return res.send({
//             message: "Kode berhasil diverifikasi",
//             data: null,
//         });
//     } catch (err) {
//         console.log("Error : ", err.message);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// };
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
    indexUser,
    show,
    create,
    update,
    verifyCode,
    updateAntrian,
    getLastAntrian
};