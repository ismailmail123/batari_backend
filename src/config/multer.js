const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

// Konfigurasi penyimpanan Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "products", // Nama folder di Cloudinary
        allowed_formats: ["jpeg", "png", "jpg"], // Format file yang diperbolehkan
    },
});

// Buat folder uploads/excel jika belum ada
const dir = "uploads/excel";
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

// Konfigurasi Multer untuk file Excel (disimpan secara lokal)
const excelStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "uploads/excel/"); // Folder penyimpanan file Excel
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Nama file unik
    },
});

const uploadExcel = multer({
    storage: excelStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
    fileFilter: (req, file, cb) => {
        console.log("File yang diunggah:", file); // Log file
        if (
            file.mimetype === "application/vnd.ms-excel" || // .xls
            file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" // .xlsx
        ) {
            cb(null, true);
        } else {
            cb(new Error("File harus berupa Excel (.xls atau .xlsx)!"), false);
        }
    },
});

// Konfigurasi multer dengan batasan ukuran file
const upload = multer({
    storage,
    limits: {
        fileSize: 500 * 1024, // Ukuran maksimum file dalam byte (500 KB)
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("File harus berupa gambar!"), false);
        }
        cb(null, true);
    },
});

module.exports = { upload, uploadExcel };