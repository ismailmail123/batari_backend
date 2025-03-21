const multer = require("multer");
const xlsx = require("xlsx");
const { user: UserModel, warga_binaan: WbpModel, pengunjung: PengunjungModel } = require("../models");

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */

// const index = async(req, res, _next) => {
//     try {
//         let WBPs = await WbpModel.findAll({
//             include: [{
//                     model: UserModel,
//                     as: "user",
//                 },
//                 {
//                     model: PengunjungModel,
//                     as: "pengunjung",
//                 }
//             ],
//         });

//         return res.send({
//             message: "Success",
//             data: WBPs,
//         });
//     } catch (error) {
//         console.log("Error:", error);
//         return res.status(500).send({ message: "Internal Server Error" });
//     }
// };

const index = async(req, res, _next) => {
    try {
        // Ambil parameter pagination dari query string
        const page = parseInt(req.query.page) || 1; // Halaman saat ini, default 1
        const limit = parseInt(req.query.limit) || 10; // Jumlah data per halaman, default 10
        const offset = (page - 1) * limit; // Hitung offset

        // Query data dengan pagination
        const { count, rows: WBPs } = await WbpModel.findAndCountAll({
            include: [{
                    model: UserModel,
                    as: "user",
                },
                {
                    model: PengunjungModel,
                    as: "pengunjung",
                },
            ],
            limit: limit, // Batasi jumlah data per halaman
            offset: offset, // Mulai dari offset
        });

        // Hitung total halaman
        const totalPages = Math.ceil(count / limit);

        return res.send({
            message: "Success",
            data: WBPs,
            pagination: {
                totalItems: count, // Total data
                totalPages: totalPages, // Total halaman
                currentPage: page, // Halaman saat ini
                itemsPerPage: limit, // Jumlah data per halaman
            },
        });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};


const indexList = async(req, res, _next) => {
    try {

        // Query data dengan pagination
        const WBPs = await WbpModel.findAll({
            include: [{
                    model: UserModel,
                    as: "user",
                },
                {
                    model: PengunjungModel,
                    as: "pengunjung",
                },
            ],
        });


        return res.send({
            message: "Success",
            data: WBPs,
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

const show = async(req, res, next) => {
    try {
        const { id } = req.params;

        const wbp = await WbpModel.findByPk(id, {
            attributes: ["user_id",
                    "pengunjung_id",
                    "nama",
                    "alamat",
                    "tempat_lahir",
                    "tanggal_lahir",
                    "jenis_kelamin",
                    "warga_negara",
                    "agama",
                    "status_perkawinan",
                    "tingkat_pendidikan",
                    "nik",
                    "jenis_kejahatan",
                    "sepertiga_masa_pidana",
                    "seperdua_masa_pidana",
                    "duapertiga_masa_pidana",
                    "pekerjaan",
                    "lokasi_blok",
                    "status",
                    "nama_ayah",
                    "nama_ibu",
                    "photo",
                ]
                // include: [{
                //     model: CategoryModel,
                //     as: "category",
                // }],
        });

        if (!wbp) {
            return res.status(404).send({
                message: "wbp tidak ditemukan",
                data: null
            })
        }

        return res.send({
            message: "success",
            data: wbp,
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */


const create = async(req, res, _next) => {
    try {
        const currentUser = req.user;
        const {
            pengunjung_id,
            nama,
            alamat,
            tempat_lahir,
            tanggal_lahir,
            jenis_kelamin,
            warga_negara,
            agama,
            status_perkawinan,
            tingkat_pendidikan,
            nik,
            jenis_kejahatan,
            sepertiga_masa_pidana,
            seperdua_masa_pidana,
            duapertiga_masa_pidana,
            pekerjaan,
            lokasi_blok,
            status,
            nama_ayah,
            nama_ibu,
            keterangan
        } = req.body;

        console.log("Request body:", req.body);

        if (!req.file) {
            return res.status(400).send({ message: "Gambar tidak ditemukan, pastikan gambar diunggah dengan benar" });
        }

        const image = req.file.path; // Cloudinary URL

        console.log("image", image)


        // if (currentUser.role !== 'seller') {
        //     return res.status(403).send({ message: "Hanya seller yang dapat menambahkan produk" });
        // }

        if (!nama ||
            !alamat ||
            !tempat_lahir ||
            !tanggal_lahir ||
            !jenis_kelamin ||
            !warga_negara ||
            !agama ||
            !status_perkawinan ||
            !tingkat_pendidikan ||
            !nik ||
            !jenis_kejahatan ||
            !sepertiga_masa_pidana ||
            !seperdua_masa_pidana ||
            !duapertiga_masa_pidana ||
            !pekerjaan ||
            !lokasi_blok ||
            !status ||
            !nama_ayah ||
            !nama_ibu ||
            !keterangan) {
            return res.status(400).send({ message: "Permintaan tidak valid, pastikan semua data diisi" });
        }

        const newWbp = await WbpModel.create({
            user_id: currentUser.id,
            pengunjung_id,
            nama,
            alamat,
            tempat_lahir,
            tanggal_lahir,
            jenis_kelamin,
            warga_negara,
            agama,
            status_perkawinan,
            tingkat_pendidikan,
            nik,
            jenis_kejahatan,
            sepertiga_masa_pidana,
            seperdua_masa_pidana,
            duapertiga_masa_pidana,
            pekerjaan,
            lokasi_blok,
            status,
            nama_ayah,
            nama_ibu,
            photo: image,
            keterangan,
        });

        console.log("New Wbp:", newWbp);

        return res.send({
            message: "Wbp created successfully",
            data: newWbp,
        });
    } catch (error) {
        if (error instanceof multer.MulterError) {
            // Tangani error Multer
            return res.status(400).json({ message: error.message });
        } else if (error.message === "File harus berupa gambar!") {
            return res.status(400).json({ message: error.message });
        } else {
            //     // Error lainnya
            console.error("Error:", error.message); // Hanya untuk debugging
            return res.status(500).json({ message: "Internal server error" });
        }
    }
};



// const createFromExcel = async(req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).send({ message: "File Excel tidak ditemukan" });
//         }

//         const filePath = req.file.path; // Path file Excel yang diupload
//         const workbook = xlsx.readFile(filePath); // Baca file Excel
//         const sheetName = workbook.SheetNames[0]; // Ambil sheet pertama
//         const sheet = workbook.Sheets[sheetName]; // Ambil data dari sheet
//         const data = xlsx.utils.sheet_to_json(sheet); // Konversi ke JSON

//         // Proses setiap baris data dan simpan ke database
//         const createdWBPs = [];
//         for (const row of data) {
//             const newWbp = await WbpModel.create({
//                 user_id: req.user.id, // ID user yang sedang login
//                 // pengunjung_id: row.pengunjung_id,
//                 nama: row.nama,
//                 alamat: row.alamat,
//                 tempat_lahir: row.tempat_lahir,
//                 tanggal_lahir: row.tanggal_lahir,
//                 jenis_kelamin: row.jenis_kelamin,
//                 warga_negara: row.warga_negara,
//                 agama: row.agama,
//                 status_perkawinan: row.status_perkawinan,
//                 tingkat_pendidikan: row.tingkat_pendidikan,
//                 nik: row.nik,
//                 jenis_kejahatan: row.jenis_kejahatan,
//                 sepertiga_masa_pidana: row.sepertiga_masa_pidana,
//                 seperdua_masa_pidana: row.seperdua_masa_pidana,
//                 duapertiga_masa_pidana: row.duapertiga_masa_pidana,
//                 pekerjaan: row.pekerjaan,
//                 lokasi_blok: row.lokasi_blok,
//                 status: row.status,
//                 nama_ayah: row.nama_ayah,
//                 nama_ibu: row.nama_ibu,
//             });

//             createdWBPs.push(newWbp);
//         }

//         return res.send({
//             message: "Data WBP berhasil dibuat dari file Excel",
//             data: createdWBPs,
//         });
//     } catch (error) {
//         console.error("Error:", error.message);
//         return res.status(500).send({ message: "Internal Server Error" });
//     }
// };

const createFromExcel = async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: "File Excel tidak ditemukan" });
        }

        const filePath = req.file.path;
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        console.log("Data dari Excel:", data); // Debugging

        const expectedHeaders = [
            "nama", "alamat", "tempat_lahir", "tanggal_lahir", "jenis_kelamin",
            "warga_negara", "agama", "status_perkawinan", "tingkat_pendidikan",
            "nik", "jenis_kejahatan", "sepertiga_masa_pidana", "seperdua_masa_pidana",
            "duapertiga_masa_pidana", "pekerjaan", "lokasi_blok", "status",
            "nama_ayah", "nama_ibu", "keterangan"
        ];

        const actualHeaders = Object.keys(data[0]);
        console.log("Header dari Excel:", actualHeaders); // Debugging
        console.log("Header yang diharapkan:", expectedHeaders); // Debugging

        const isHeaderValid = expectedHeaders.every(header => actualHeaders.includes(header));
        if (!isHeaderValid) {
            return res.status(400).send({ message: "Format header Excel tidak sesuai dengan yang diharapkan" });
        }

        const createdWBPs = [];
        const skippedWBPs = [];
        const updatedWBPs = [];
        for (const row of data) {
            try {
                const nik = row.nik.toString(); // Simpan sebagai string
                console.log("NIK dari Excel:", row.nik); // Debugging
                console.log("NIK yang dikonversi:", nik); // Debugging

                // Cari data yang sudah ada di database berdasarkan `nik`
                const existingWbp = await WbpModel.findOne({
                    where: {
                        user_id: req.user.id,
                        nik: nik // Gunakan nilai `nik` yang sudah dikonversi ke string
                    }
                });

                console.log("Data yang sudah ada di database:", existingWbp); // Debugging

                if (existingWbp) {
                    // Bandingkan semua field antara data di database dan data dari Excel
                    const isDataSame = expectedHeaders.every(header => {
                        return existingWbp[header] === row[header];
                    });

                    if (isDataSame) {
                        // Jika semua field sama, skip data ini
                        console.log(`Data dengan NIK ${nik} sudah ada dan sama persis. Data di-skip.`);
                        skippedWBPs.push(row);
                    } else {
                        // Jika ada perbedaan, update data yang ada
                        await existingWbp.update({...row, nik });
                        updatedWBPs.push(existingWbp);
                        console.log(`Data dengan NIK ${nik} diupdate karena ada perbedaan.`);
                    }
                } else {
                    // Jika data belum ada, buat data baru
                    const newWbp = await WbpModel.create({
                        user_id: req.user.id,
                        ...row,
                        nik: nik // Gunakan nilai `nik` yang sudah dikonversi ke string
                    });
                    createdWBPs.push(newWbp);
                    console.log(`Data dengan NIK ${nik} berhasil dibuat.`);
                }
            } catch (error) {
                console.error("Error pada baris:", row, "Error:", error.message);
            }
        }

        return res.send({
            message: "Proses upload file Excel selesai.",
            data: {
                created: createdWBPs, // Data yang berhasil dibuat
                updated: updatedWBPs, // Data yang berhasil diupdate
                skipped: skippedWBPs // Data yang di-skip karena sama persis
            },
        });
    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};

const update = async(req, res, _next) => {
    try {
        const currentUser = req.user;
        const { id } = req.params; // ID WBP yang akan diupdate
        const {
            pengunjung_id,
            nama,
            alamat,
            tempat_lahir,
            tanggal_lahir,
            jenis_kelamin,
            warga_negara,
            agama,
            status_perkawinan,
            tingkat_pendidikan,
            nik,
            jenis_kejahatan,
            sepertiga_masa_pidana,
            seperdua_masa_pidana,
            duapertiga_masa_pidana,
            pekerjaan,
            lokasi_blok,
            status,
            nama_ayah,
            nama_ibu,
            keterangan,
        } = req.body;

        console.log("Request body:", req.body);

        // Cari WBP berdasarkan ID
        const wbp = await WbpModel.findByPk(id);

        if (!wbp) {
            return res.status(404).send({
                message: "WBP tidak ditemukan",
                data: null,
            });
        }

        // Inisialisasi objek untuk menyimpan data yang akan diupdate
        const updateData = {
            pengunjung_id,
            nama,
            alamat,
            tempat_lahir,
            tanggal_lahir,
            jenis_kelamin,
            warga_negara,
            agama,
            status_perkawinan,
            tingkat_pendidikan,
            nik,
            jenis_kejahatan,
            sepertiga_masa_pidana,
            seperdua_masa_pidana,
            duapertiga_masa_pidana,
            pekerjaan,
            lokasi_blok,
            status,
            nama_ayah,
            nama_ibu,
            keterangan,
        };

        // Jika file photo diunggah, tambahkan URL-nya ke updateData
        if (req.file) {
            updateData.photo = req.file.path; // Path dari Cloudinary
        }

        // Update data WBP
        await wbp.update(updateData);

        console.log("Updated WBP:", wbp);

        return res.send({
            message: "WBP updated successfully",
            data: wbp,
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

const remove = async(req, res, _next) => {
    try {
        const { id } = req.params; // Ambil ID dari parameter URL
        const currentUser = req.user; // Ambil data user yang sedang login

        // Cari WBP berdasarkan ID
        const wbp = await WbpModel.findByPk(id);

        // Jika WBP tidak ditemukan
        if (!wbp) {
            return res.status(404).send({
                message: "WBP tidak ditemukan",
                data: null,
            });
        }

        // Pastikan hanya pemilik data atau admin yang dapat menghapus
        if (wbp.user_id !== currentUser.id && currentUser.role !== "admin") {
            return res.status(403).send({
                message: "Anda tidak memiliki izin untuk menghapus data ini",
            });
        }

        // Hapus data WBP
        await wbp.destroy();

        return res.send({
            message: "WBP berhasil dihapus",
            data: null,
        });
    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};


module.exports = {
    index,
    indexList,
    show,
    create,
    update,
    createFromExcel,
    remove
};