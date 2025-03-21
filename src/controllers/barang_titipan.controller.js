const multer = require("multer");
const xlsx = require("xlsx");
const { user: UserModel, barang_titipan: BarangTitipanModel, pengunjung: PengunjungModel } = require("../models");
const { where } = require("sequelize");

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
                },
                {
                    model: PengunjungModel,
                    as: "pengunjung",
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
            attributes: ["user_id",
                "pengunjung_id",
                "jenis_barang",
                "jumlah",
                "keterangan",

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
        const { pengunjung_id, jenis_barang, jumlah, keterangan } = req.body;

        // Validasi data yang diperlukan
        if (!pengunjung_id || !jenis_barang || !jumlah) {
            return res.status(400).send({
                message: "Data tidak lengkap. Pastikan pengunjung_id, jenis_barang, dan jumlah diisi.",
            });
        }

        // Buat barang titipan baru
        const newBarangTitipan = await BarangTitipanModel.create({
            user_id: req.user.id, // Ambil user_id dari user yang sedang login
            pengunjung_id,
            jenis_barang,
            jumlah,
            keterangan: keterangan || null, // Jika keterangan tidak diisi, set null
        });

        // Kirim response sukses
        return res.status(201).send({
            message: "Barang titipan berhasil dibuat",
            data: newBarangTitipan,
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};

module.exports = {
    index,
    show,
    create
};