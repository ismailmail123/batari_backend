const multer = require("multer");
const xlsx = require("xlsx");
const { user: UserModel, barang_titipan: BarangTitipanModel, pengunjung: PengunjungModel, warga_binaan: WargaBinaanModel } = require("../models");
const { where } = require("sequelize");
const { printLabelTitipan } = require("../utils/printLabelTitipan"); // Import service printer

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */

const index = async(req, res, _next) => {
    try {
        let barang_titipans = await BarangTitipanModel.findAll({
            where: {
                user_id: req.user.id,
            },
            include: [{
                    model: UserModel,
                    as: "user",
                }, {
                    model: WargaBinaanModel,
                    as: "barang_titipan_wbp",
                },
                {
                    model: PengunjungModel,
                    as: "pengunjung",
                    include: [{
                        model: WargaBinaanModel,
                        as: "warga_binaan"
                    }]
                }
            ],
        });

        return res.send({
            message: "Success",
            data: barang_titipans,
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

        const barang_titipans = await BarangTitipanModel.findByPk(id, {
            include: [{
                    model: PengunjungModel,
                    as: "pengunjung",
                    include: [{
                        model: WargaBinaanModel,
                        as: "warga_binaan"
                    }]
                },
                {
                    model: WargaBinaanModel,
                    as: "warga_binaan"
                }
            ]
        });

        if (!barang_titipans) {
            return res.status(404).send({
                message: "barang_titipans tidak ditemukan",
                data: null
            })
        }

        return res.send({
            message: "success",
            data: barang_titipans,
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
}

const create = async(req, res, _next) => {
    try {
        // Ambil data dari request body
        const { pengunjung_id, wbp_id, jenis_barang, jumlah, keterangan } = req.body;

        // Validasi data yang diperlukan
        if (!pengunjung_id || !jenis_barang || !jumlah) {
            return res.status(400).send({
                message: "Data tidak lengkap. Pastikan pengunjung_id, jenis_barang, dan jumlah diisi.",
            });
        }

        const pengunjung = await PengunjungModel.findOne({
            where: { id: pengunjung_id },
            include: [{
                    model: BarangTitipanModel,
                    as: "barang_titipan"
                },
                {
                    model: WargaBinaanModel,
                    as: "warga_binaan"
                }
            ]
        });
        if (!pengunjung) {
            return res.status(404).send({ message: "Pengunjung tidak ditemukan", data: null });
        }

        // Buat barang titipan baru
        const newBarangTitipan = await BarangTitipanModel.create({
            user_id: req.user.id, // Ambil user_id dari user yang sedang login
            wbp_id: wbp_id || null,
            pengunjung_id,
            jenis_barang,
            jumlah,
            keterangan: keterangan || null, // Jika keterangan tidak diisi, set null
        });

        // Dapatkan data lengkap untuk printing
        const barangTitipanLengkap = await BarangTitipanModel.findByPk(newBarangTitipan.id, {
            include: [{
                model: PengunjungModel,
                as: "pengunjung",
                include: [{
                    model: WargaBinaanModel,
                    as: "warga_binaan"
                }]
            }]
        });

        // // Cetak label titipan OTOMATIS
        // printLabelTitipan({
        //     jenis_barang,
        //     jumlah,
        //     keterangan,
        //     pengunjung: barangTitipanLengkap.pengunjung
        // });

        // Kirim response sukses
        return res.status(201).send({
            message: "Barang titipan berhasil dibuat dan label sedang dicetak",
            data: barangTitipanLengkap,
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
const update = async(req, res, _next) => {
    try {
        const { id } = req.params;
        const { pengunjung_id, wbp_id, jenis_barang, jumlah, keterangan } = req.body;

        // Cari barang titipan berdasarkan ID dan user_id
        const barangTitipan = await BarangTitipanModel.findOne({
            where: {
                id,
                user_id: req.user.id // Pastikan hanya pemilik yang bisa update
            }
        });

        if (!barangTitipan) {
            return res.status(404).send({
                message: "Barang titipan tidak ditemukan",
                data: null
            });
        }

        // Validasi data yang akan diupdate
        if (!pengunjung_id || !jenis_barang || !jumlah) {
            return res.status(400).send({
                message: "Data tidak lengkap. Pastikan pengunjung_id, jenis_barang, dan jumlah diisi.",
            });
        }

        // Update data
        await BarangTitipanModel.update({
            pengunjung_id,
            wbp_id: wbp_id || null,
            jenis_barang,
            jumlah,
            keterangan: keterangan || null,
        }, {
            where: { id }
        });

        // Ambil data terbaru setelah update
        const updatedBarangTitipan = await BarangTitipanModel.findByPk(id, {
            include: [{
                model: PengunjungModel,
                as: "pengunjung",
                include: [{
                    model: WargaBinaanModel,
                    as: "warga_binaan"
                }]
            }]
        });

        return res.send({
            message: "Barang titipan berhasil diupdate",
            data: updatedBarangTitipan,
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
const remove = async(req, res, _next) => {
    try {
        const { id } = req.params;

        // Cari dan hapus barang titipan berdasarkan ID dan user_id
        const deletedBarangTitipan = await BarangTitipanModel.findOne({
            where: {
                id,
                user_id: req.user.id // Pastikan hanya pemilik yang bisa hapus
            }
        });

        if (!deletedBarangTitipan) {
            return res.status(404).send({
                message: "Barang titipan tidak ditemukan",
                data: null
            });
        }

        await BarangTitipanModel.destroy({
            where: { id }
        });

        return res.send({
            message: "Barang titipan berhasil dihapus",
            data: deletedBarangTitipan,
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};

module.exports = {
    index,
    show,
    create,
    update,
    remove,
};