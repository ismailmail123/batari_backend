const { isEmail, isStrongPassword } = require("validator");
const { user: UserModel } = require("../models");

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */

const validateRegister = async(req, res, next) => {
    const {
        nama,
        email,
        password,
        alamat,
        hp,
        jenis_kelamin,
        tempat_lahir,
        tanggal_lahir,
    } = req.body;

    if (!nama || !email || !password || !alamat || !hp || !jenis_kelamin || !tempat_lahir || !tanggal_lahir

    ) {
        return res.send({
            message: "Silahkan isi form dengan lengkap",
            data: null,
        });
    }

    if (!isEmail(email)) {
        return res.send({
            message: "Email tidak valid",
            data: null,
        });
    }

    if (!isStrongPassword(password, {
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        })) {
        return res.send({
            message: "Password terlalu pendek atau tidak memiliki karakter berupa huruf kecil, huruf besar, nomor atau simbol",
            data: null,
        });
    }

    const emailCheck = await UserModel.findOne({
        where: { email },
    });
    if (emailCheck) {
        return res.status(400).send({
            message: "Email sudah terdaftar",
            data: null,
        });
    }

    next();
};

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.send({
            message: "Bad request",
            data: null,
        });
    }

    if (!isEmail(email)) {
        return res.send({
            message: "Invalid email",
            data: null,
        });
    }

    next();
};

module.exports = { validateRegister, validateLogin };