const express = require("express");

const { storage } = require("../storage/storage.js");
const multer = require("multer");

const upload = multer({ storage: storage });
const router = express.Router();
const { validateToken } = require("../middlewares/auth");
const { uploadExcel } = require("../storage/storage.js");
const { index, indexList, show, create, update, createFromExcel, remove } = require("../controllers/wbp.controller.js");

// /api/wbp
router.get("/", validateToken, index);
router.get("/list", validateToken, indexList);
router.get("/:id", validateToken, show);
router.post("/", validateToken, upload.single("photo"), create);
router.post("/upload-excel", validateToken, uploadExcel.single("list"), createFromExcel); // Gunakan fungsi createFromExcel
router.put("/:id", validateToken, upload.single("photo"), update);
router.delete("/:id", validateToken, remove);

module.exports = router;