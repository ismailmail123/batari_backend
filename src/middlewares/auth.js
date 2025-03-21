// const jwt = require("jsonwebtoken");

// const validateToken = (req, res, next) => {
//     try {
//         console.log("Cookies:", req.cookies);

//         const token = req.cookies.jwt;

//         if (!token) {
//             return res.status(401).json({ message: "Access denied. No token provided." });
//         }

//         const userData = jwt.verify(token, process.env.JWT_SECRET);
//         console.log("Decoded User:", userData);

//         req.user = userData;
//         next();
//     } catch (error) {
//         console.error("JWT Validation Error:", error);

//         if (error.name === "JsonWebTokenError") {
//             return res.status(401).json({ message: "Invalid token" });
//         } else if (error.name === "TokenExpiredError") {
//             return res.status(401).json({ message: "Token expired" });
//         }

//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// module.exports = { validateToken };

const jwt = require("jsonwebtoken");
const user = require("../models/user");

const validateToken = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"] || "";

        // Periksa format token (Bearer <token>)
        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).send({ message: "Invalid token format. Use 'Bearer <token>'." });
        }

        const token = authHeader.split(" ")[1]; // Ambil token setelah "Bearer"

        // Verifikasi token
        const userData = jwt.verify(token, process.env.JWT_SECRET);
        if (!userData) {
            return res.status(401).send({ message: "Invalid token" });
        }

        // Simpan data pengguna di request object
        req.user = userData;

        next(); // Lanjut ke middleware/controller berikutnya
    } catch (error) {
        console.error("Token validation error:", error);

        if (error.name === "JsonWebTokenError") {
            return res.status(401).send({ message: "Invalid token" });
        } else if (error.name === "TokenExpiredError") {
            return res.status(401).send({ message: "Token expired" });
        }

        // Tangani error lainnya
        return res.status(500).send({ message: "Internal server error" });
    }
};

module.exports = { validateToken }