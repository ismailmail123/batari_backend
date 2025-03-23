require('dotenv').config()

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});


const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "Products",
        format: async(req, file) => {
            const formats = ['jpeg', 'png', 'jpg', "mp3", "wav"];
            const extension = file.originalname.split('.').pop().toLowerCase();
            if (!formats.includes(extension)) {
                throw new Error('Format gambar tidak valid');
            }
            return extension;
        },
        public_id: (req, file) => {
            return Date.now() + '-' + file.originalname;
        },
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

module.exports = {
    cloudinary,
    storage,
    uploadExcel
};