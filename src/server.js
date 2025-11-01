require('dotenv').config()

const express = require("express");
const path = require("path");
const passport = require('passport');
require('./config/passport');
const jwt = require('jsonwebtoken');

const app = express();

const authRouter = require("./routes/auth.router");
const userRouter = require("./routes/user.router");
const wbpRouter = require("./routes/wbp.router");
const pengunjungRouter = require("./routes/pengunjung.router");
const barang_titipanRouter = require("./routes/barang_titipan.router");
const { user: UserModel } = require("./models");
const { initializeWhatsAppBot } = require('./utils/whatsapp-bot');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const cors = require("cors");


if (!process.env.JWT_SECRET) {
    console.error(
        "JWT_SECRET is not provided, fill it with random string or generate it using 'openssl rand -base64/-hex 32'"
    );
    process.exit(1);
}

app.use(cors());

app.use(passport.initialize());

app.use("/struks", express.static(path.join(process.cwd(), "./")));;


app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/wargabinaan", wbpRouter);
app.use("/api/pengunjung", pengunjungRouter);
app.use("/api/barang-titipan", barang_titipanRouter);
app.use("/api/barang-titipan", barang_titipanRouter);

initializeWhatsAppBot();


// Routes Google OAuth
app.get('/auth/google', (req, res, next) => {
    const { role } = req.query;

    // Validasi role yang diperbolehkan - TAMBAHKAN 'seller'
    const allowedRoles = ['user', 'admin'];
    const selectedRole = allowedRoles.includes(role) ? role : 'user';

    console.log("Received role from frontend:", role);
    console.log("Selected role for authentication:", selectedRole);

    passport.authenticate('google', {
        session: false,
        state: JSON.stringify({ role: selectedRole }) // Simpan role di state
    })(req, res, next);
});

app.get(
    '/auth/google/callback',
    (req, res, next) => {
        passport.authenticate('google', { session: false }, (err, user, info) => {
            if (err) {
                if (err.name === 'ProviderMismatchError') {
                    return res.redirect(`${process.env.CLIENT_URL}/auth?error=provider_mismatch&message=${encodeURIComponent(err.message)}`);
                }
                return res.redirect(`${process.env.CLIENT_URL}/auth?error=authentication_failed`);
            }
            if (!user) {
                return res.redirect(`${process.env.CLIENT_URL}/auth?error=authentication_failed`);
            }

            req.user = user;
            next();
        })(req, res, next);
    },
    async(req, res) => {
        try {
            const googleUser = req.user;

            console.log("User from Google auth:", {
                id: googleUser.id,
                email: googleUser.email,
                role: googleUser.role
            });

            // Ambil data lengkap user dari DB
            const fullUser = await UserModel.findByPk(googleUser.id, {
                attributes: [
                    'id', 'nama', 'email', 'alamat',
                    'photo', 'hp', 'role',
                    'createdAt'
                ]
            });

            if (!fullUser) {
                return res.redirect(`${process.env.CLIENT_URL}/auth?error=user_not_found`);
            }

            const user = fullUser.get({ plain: true });

            const token = jwt.sign({
                    id: user.id,
                    nama: user.nama,
                    email: user.email,
                    role: user.role, // Pastikan pakai role dari user
                    hp: user.hp,
                    alamat: user.alamat,
                    photo: user.photo,
                },
                process.env.JWT_SECRET, { expiresIn: '1h' }
            );

            console.log("Generated token for role:", user.role);

            // Kirim ke frontend
            res.redirect(`${process.env.CLIENT_URL}/auth?token=${token}`);
        } catch (error) {
            console.error('Google auth error:', error);
            res.redirect(`${process.env.CLIENT_URL}/auth?error=authentication_failed`);
        }
    }
);




app.listen(process.env.SERVER_PORT || 3000, () => {
    console.log("Server Running");
});