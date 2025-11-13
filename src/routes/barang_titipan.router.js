const express = require("express");
const router = express.Router();
// const { upload } = require("../config/multer.js");
const { validateToken } = require("../middlewares/auth");
// const { uploadExcel } = require("../config/multer.js");
const { index, show, create, update, remove } = require("../controllers/barang_titipan.controller.js");

// /api/wbp
router.get("/", validateToken, index);
router.get("/:id", validateToken, show);
router.post("/", validateToken, create);
// router.post("/upload-excel", validateToken, uploadExcel.single("list"), createFromExcel); // Gunakan fungsi createFromExcel
router.put("/:id", validateToken, update);
router.delete("/:id", validateToken, remove);

module.exports = router;