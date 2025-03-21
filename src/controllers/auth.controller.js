const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { user: UserModel } = require("../models");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require('dotenv').config()

const generateVerificationCode = () => crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 karakter kode acak

const sendVerificationEmail = async(email, verificationCode) => {
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
        subject: "Verify Your Email",
        text: `Your verification code is: ${verificationCode}`,
    };

    await transporter.sendMail(mailOptions);
};

const register = async(req, res, next) => {
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

    if (!req.file) {
        return res.status(400).send({ message: "Gambar tidak ditemukan, pastikan gambar diunggah dengan benar" });
    }

    const image = req.file.path; // Cloudinary URL

    console.log("image", image)


    try {
        // Pengecekan email
        const userExist = await UserModel.findOne({ where: { email } });
        if (userExist) {
            return res.status(401).json({ message: "Email already exist" });
        }

        // Generate kode verifikasi
        const verificationCode = generateVerificationCode();

        console.log("ini kode", verificationCode)

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Buat user baru dengan status belum terverifikasi
        const user = await UserModel.create({
            nama,
            email,
            password: passwordHash,
            alamat,
            photo: image,
            hp,
            jenis_kelamin,
            tempat_lahir,
            tanggal_lahir,
            kode_verifikasi: verificationCode,
            terverifikasi: false,
        });

        if (!user) {
            return res.status(500).send({
                message: "Failed to register user",
                data: null,
            });
        }

        // Kirim email verifikasi
        await sendVerificationEmail(email, verificationCode);

        return res.send({
            message: "User successfully registered. Please check your email to verify your account.",
            data: null,
        });
    } catch (err) {
        console.log("Error : ", err.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


const verifyEmail = async(req, res, next) => {
    const { email, kode_verifikasi } = req.body;

    try {
        const user = await UserModel.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.kode_verifikasi !== kode_verifikasi) {
            return res.status(400).json({ message: "Invalid verification code" });
        }

        // Update status pengguna menjadi terverifikasi
        user.terverifikasi = true;
        user.kode_verifikasi = null; // Hapus kode verifikasi setelah digunakan
        await user.save();

        return res.send({
            message: "Email successfully verified",
            data: kode_verifikasi,
        });
    } catch (err) {
        console.log("Error : ", err.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// const login = async(req, res, next) => {
//     const { email, password } = req.body;
//     const currentDevice = req.headers['user-agent'] || 'Unknown Device'; // Deteksi perangkat

//     try {
//         const user = await UserModel.findOne({ where: { email } });

//         if (!user) {
//             return res.status(401).json({ message: "Invalid email/password" });
//         }

//         const isValid = await bcrypt.compare(password, user.password);

//         if (!isValid) {
//             return res.status(401).json({ message: "Invalid email/password" });
//         }

//         if (!user.terverifikasi) {
//             return res.status(401).json({ message: "Email is not verified. Please verify your email first." });
//         }

//         // Jika perangkat baru
//         if (user.namaperangakat !== currentDevice) {
//             // Generate kode verifikasi
//             const verificationCode = generateVerificationCode();
//             user.verification_code = verificationCode;
//             await user.save();

//             // Kirim email verifikasi
//             await sendVerificationEmail(user.email, verificationCode);

//             return res.status(403).json({
//                 message: "New device detected. Please verify the code sent to your email.",
//             });
//         }

//         // Login sukses, update perangkat terakhir
//         user.namaperangakat = currentDevice;
//         user.verification_code = null; // Hapus kode verifikasi jika ada
//         await user.save();

//         const data = {
//             id: user.id,
//             username: user.username,
//             email: user.email,
//             address: user.address,
//             role: user.role
//         };
//         const token = jwt.sign(data, process.env.JWT_SECRET);

//         return res.send({
//             message: "Login successful",
//             data: {
//                 data,
//                 token: token,
//             },
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// const login = async(req, res, next) => {
//     const { email, password } = req.body;
//     const currentDevice = req.headers['user-agent'] || 'Unknown Device'; // Deteksi perangkat

//     try {
//         const user = await UserModel.findOne({ where: { email } });

//         if (!user) {
//             return res.status(401).json({ message: "Invalid email" });
//         }

//         const isValid = await bcrypt.compare(password, user.password);

//         if (!isValid) {
//             return res.status(401).json({ message: "Invalid password" });
//         }

//         if (!user.terverifikasi) {
//             return res.status(401).json({ message: "Email is not verified. Please verify your email first." });
//         }

//         // Jika perangkat baru
//         // if (user.namaperangakat !== currentDevice) {
//         //     // Generate kode verifikasi
//         // const verificationCode = generateVerificationCode();
//         // user.kode_verifikasi = verificationCode;
//         // await user.save();

//         //     // Kirim email verifikasi
//         // await sendVerificationEmail(user.email, verificationCode);

//         //     return res.status(403).json({
//         //         message: "New device detected. Please verify the code sent to your email.",
//         //     });
//         // }

//         // Login sukses, update perangkat terakhir
//         // user.namaperangakat = currentDevice;
//         user.kode_verifikasi = null; // Hapus kode verifikasi jika ada
//         await user.save();

//         // Set status online saat login
//         // user.status = 'online';
//         // await user.save();

//         const data = {
//             id: user.id,
//             nama: user.nama,
//             email: user.email,
//             alamat: user.alamat,
//             photo: user.photo,
//             hp: user.hp,
//             role: user.role
//         };
//         const token = jwt.sign(data, process.env.JWT_SECRET, {
//             expiresIn: '7d' // Token berlaku selama 7 hari
//         });

//         // Simpan token ke dalam cookie
//         res.cookie('jwt', token, {
//             httpOnly: true, // Hanya dapat diakses oleh HTTP, bukan JavaScript
//             // secure: process.env.NODE_ENV !== 'development', // Hanya HTTPS jika bukan di development
//             sameSite: 'strict', // Mencegah CSRF
//             maxAge: 7 * 24 * 60 * 60 * 1000 // Token berlaku 7 hari
//                 // maxAge: 60 * 1000 // Token berlaku 7 hari
//         });

//         // Simpan data pengguna di cookie
//         res.cookie('user_data', JSON.stringify(data), {
//             httpOnly: false, // Dapat diakses oleh JavaScript
//             // secure: process.env.NODE_ENV !== 'development',
//             sameSite: 'strict',
//             maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
//         });

//         return res.send({
//             message: "Login successful",
//             data: {
//                 data,
//                 token: token, // Opsional, jika Anda juga ingin mengembalikannya dalam respons
//             },
//         });
//     } catch (err) {
//         console.log("Error : ", err.message);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// const login = async(req, res, next) => {
//     const { email, password } = req.body;
//     const currentDevice = req.headers['user-agent'] || 'Unknown Device'; // Deteksi perangkat

//     try {
//         const user = await UserModel.findOne({ where: { email } });

//         if (!user) {
//             return res.status(401).json({ message: "Invalid email" });
//         }

//         const isValid = await bcrypt.compare(password, user.password);

//         if (!isValid) {
//             return res.status(401).json({ message: "Invalid password" });
//         }

//         if (!user.terverifikasi) {
//             return res.status(401).json({ message: "Email is not verified. Please verify your email first." });
//         }

//         // Jika perangkat baru
//         // if (user.namaperangakat !== currentDevice) {
//         //     const verificationCode = generateVerificationCode();
//         //     user.kode_verifikasi = verificationCode;
//         //     await user.save();

//         //     await sendVerificationEmail(user.email, verificationCode);

//         //     return res.status(403).json({
//         //         message: "New device detected. Please verify the code sent to your email.",
//         //     });
//         // }

//         // Login sukses, update perangkat terakhir
//         // user.namaperangakat = currentDevice;
//         user.kode_verifikasi = null; // Hapus kode verifikasi jika ada
//         await user.save();

//         // Set status online saat login
//         // user.status = 'online';
//         // await user.save();

//         const data = {
//             id: user.id,
//             nama: user.nama,
//             email: user.email,
//             alamat: user.alamat,
//             photo: user.photo,
//             hp: user.hp,
//             role: user.role,
//         };

//         // Buat token JWT
//         const token = jwt.sign(data, process.env.JWT_SECRET, {
//             expiresIn: '7d', // Token berlaku selama 7 hari
//         });

//         // Kembalikan token dalam respons JSON (tidak disimpan di cookie)
//         return res.status(200).json({
//             message: "Login successful",
//             data: {
//                 user: data,
//                 token: token, // Token dikirim ke frontend
//             },
//         });
//     } catch (err) {
//         console.log("Error : ", err.message);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// };

const login = async(req, res, next) => {
    const { email, password } = req.body;

    try {
        // Cari pengguna berdasarkan email
        const user = await UserModel.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: "Invalid email/password" });
        }

        // Bandingkan password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: "Invalid email/password" });
        }

        // Buat payload untuk token
        const data = {
            id: user.id,
            nama: user.nama,
            email: user.email,
            alamat: user.alamat,
            role: user.role,
        };

        // Buat token dengan masa berlaku (misalnya, 1 jam)
        const token = jwt.sign(data, process.env.JWT_SECRET, { expiresIn: "24h" });

        // Kirim respons ke frontend
        return res.send({
            message: "Login successful",
            data: {
                user: data,
                token: token,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        next(err);
    }
};

const verifyDevice = async(req, res, next) => {
    const { email, kode_verifikasi } = req.body;

    try {
        const user = await UserModel.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.kode_verifikasi !== kode_verifikasi) {
            return res.status(400).json({ message: "Invalid verification code" });
        }

        // Verifikasi perangkat sukses
        const currentDevice = req.headers['user-agent'] || 'Unknown Device';
        user.nama_perangakat = currentDevice;
        user.kode_verifikasi = null; // Hapus kode verifikasi
        await user.save();

        return res.send({
            message: "Device successfully verified. Please log in again.",
        });
    } catch (err) {
        next(err);
    }
};

const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error in checkAuth controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// const logoutUser = async(req, res) => {
//     try {

//         // Menghapus cookie JWT
//         res.clearCookie("jwt", {
//             httpOnly: true,
//             secure: process.env.NODE_ENV !== 'development', // Pastikan `secure: true` di produksi
//             sameSite: 'strict',
//         });

//         return res.status(200).json({ message: "Successfully logged out." });
//     } catch (err) {
//         console.error(err); // Untuk mempermudah debugging
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// const logoutUser = async(req, res) => {
//     try {
//         // Mengambil ID pengguna dari cookie
//         const userId = req.cookies.jwt ? decodeJwt(req.cookies.jwt).id : null;

//         console.log("userId", userId)

//         if (!userId) {
//             return res.status(400).json({ message: "User not authenticated" });
//         }

//         // Mengubah status user menjadi 'offline'
//         // await UserModel.update({ status: 'offline' }, { where: { id: userId } });

//         // Menghapus cookie JWT
//         res.clearCookie("jwt", {
//             httpOnly: true,
//             secure: process.env.NODE_ENV !== 'development', // Pastikan `secure: true` di produksi
//             sameSite: 'strict',
//         });

//         return res.status(200).json({ message: "Successfully logged out and user is offline." });
//     } catch (err) {
//         console.error(err); // Untuk mempermudah debugging
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// };

const logoutUser = async(req, res) => {
    try {
        // Mengambil ID pengguna dari cookie
        const userId = req.cookies.jwt ? decodeJwt(req.cookies.jwt).id : null;

        console.log("userId", userId);

        // if (!userId) {
        //     return res.status(400).json({ message: "User not authenticated" });
        // }

        // Mengubah status user menjadi 'offline' (jika diperlukan)
        // await UserModel.update({ status: 'offline' }, { where: { id: userId } });

        // Menghapus cookie JWT
        res.clearCookie("jwt", {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development', // Pastikan `secure: true` di produksi
            sameSite: 'strict',
            path: '/', // Pastikan path sama dengan saat cookie dibuat
            domain: 'localhost', // Sesuaikan dengan domain Anda
        });

        // Menghapus cookie user_data (jika ada)
        res.clearCookie("user_data", {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            path: '/',
            domain: 'localhost',
        });

        return res.status(200).json({ message: "Successfully logged out and user is offline." });
    } catch (err) {
        console.error("Error during logout:", err); // Untuk mempermudah debugging
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// Fungsi untuk mendecode JWT (mengambil payload)
function decodeJwt(token) {
    const payload = token.split('.')[1];
    const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decodedPayload);
}




module.exports = {
    login,
    register,
    verifyEmail,
    verifyDevice,
    checkAuth,
    logoutUser
};