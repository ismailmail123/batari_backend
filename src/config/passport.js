const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { user: UserModel, store: StoreModel, wallet: WalletModel } = require("../models");
const bcrypt = require('bcryptjs');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async(id, done) => {
    try {
        const user = await UserModel.findByPk(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// passport.use(
//     new GoogleStrategy({
//             clientID: process.env.GOOGLE_CLIENT_ID,
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//             callbackURL: process.env.GOOGLE_CALLBACK_URL,
//             passReqToCallback: true,
//             scope: ['profile', 'email'],
//         },
//         async(req, accessToken, refreshToken, profile, done) => {
//             try {
//                 // Cek apakah user sudah ada
//                 const existingUser = await UserModel.findOne({ where: { email: profile.emails[0].value } });

//                 if (existingUser) {
//                     return done(null, existingUser);
//                 }

//                 // Buat user baru jika belum ada
//                 const newUser = await UserModel.create({
//                     name: profile.displayName,
//                     email: profile.emails[0].value,
//                     provider: 'google',
//                     // password: await bcrypt.hash(crypto.randomBytes(16).toString('hex')), // Password acak
//                     role: 'user', // Default role
//                     is_verified: true, // Verifikasi otomatis
//                     photo: profile.photos[0].value,
//                 });

//                 return done(null, newUser);
//             } catch (error) {
//                 return done(error, null);
//             }
//         // async(req, accessToken, refreshToken, profile, done) => {
//         //     try {
//         //         // const existingUser = await UserModel.findOne({ where: { email: profile.emails[0].value } });

//         //         // if (existingUser) {
//         //         //     return done(null, existingUser);
//         //         // }

//         //         // Ambil role dari state (jika ada)

//         //         console.log("sssssssssssssssssssssssssssssssssssssssssssssssssstate", req.query.state)
//         //         let role = 'user';
//         //         if (req.query.state) {
//         //             try {
//         //                 const state = JSON.parse(req.query.state);

//         //                 console.log("rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrroooooooooooooooooooooooooll", state)
//         //                 role = state.role || 'user';
//         //             } catch (e) {
//         //                 console.log('Error parsing state:', e);
//         //             }
//         //         }

//         //         const newUser = await UserModel.create({
//         //             name: profile.displayName,
//         //             email: profile.emails[0].value,
//         //             provider: 'google',
//         //             role: role, // Gunakan role dari state
//         //             is_verified: true,
//         //             profile_image: profile.photos[0].value,
//         //         });

//         //         return done(null, newUser);
//         //     } catch (error) {
//         //         return done(error, null);
//         //     }
//         }
//     )
// );

passport.use(
    new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            passReqToCallback: true,
            scope: ['profile', 'email'],
        },
        async(req, accessToken, refreshToken, profile, done) => {
            try {
                // Cek apakah user sudah ada
                const existingUser = await UserModel.findOne({
                    where: { email: profile.emails[0].value }
                });

                if (existingUser) {
                    // Jika user ada dengan provider local, tolak akses
                    if (existingUser.provider === 'local') {
                        const error = new Error('Metode login yang anda gunakan tidak sesuai. Silakan gunakan email dan password.');
                        error.name = 'ProviderMismatchError';
                        return done(error, null);
                    }
                    // Jika user sudah terdaftar dengan Google, lanjutkan
                    return done(null, existingUser);
                }

                if (existingUser) {
                    console.log('Existing user found:', existingUser.role);
                    return done(null, existingUser);
                }

                // Ambil role dari state dengan benar
                let role = 'user';

                console.log("Raw state from query:", req.query.state);

                if (req.query && req.query.state) {
                    try {
                        // DECODE URI component terlebih dahulu
                        const decodedState = decodeURIComponent(req.query.state);
                        console.log("Decoded state:", decodedState);

                        const state = JSON.parse(decodedState);
                        console.log("Parsed state object:", state);

                        role = state.role || 'user';
                        console.log("Selected role:", role);
                    } catch (e) {
                        console.log('Error parsing state:', e);
                    }
                }

                console.log("Final role for new user:", role);

                // Buat user baru jika belum ada
                const newUser = await UserModel.create({
                    nama: profile.displayName,
                    email: profile.emails[0].value,
                    provider: 'google',
                    role: role,
                    terverifikasi: true,
                    photo: profile.photos[0].value,
                });



                console.log("New user created with role:", newUser.role);
                return done(null, newUser);
            } catch (error) {
                console.error('Google Strategy Error:', error);
                return done(error, null);
            }
        }
    )
);