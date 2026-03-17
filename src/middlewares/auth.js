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