const express = require("express");

const router = express.Router();

const { upload } = require("../config/multer.js");


const { index, indexUser, show, create, update, verifyCode, updateAntrian, getLastAntrian } = require("../controllers/pengunjung.controller.js");
const { validateToken } = require("../middlewares/auth.js")

// /api/babs
router.get("/", validateToken, index);
router.get("/user", validateToken, indexUser);
router.get("/antrian-terakhir", validateToken, getLastAntrian);
router.get("/:kode", validateToken, show);
router.put("/update-antrian", validateToken, updateAntrian);
router.post("/", validateToken,
    upload.fields([
        { name: "photo_ktp", maxCount: 1 }, // Field untuk foto struk pembelian
        { name: "photo_pengunjung", maxCount: 1 }, // Field untuk foto bukti penerimaan
    ]),
    create);
router.put("/:kode", validateToken,
    upload.fields([
        { name: "photo_ktp", maxCount: 1 }, // Field untuk foto struk pembelian
        { name: "photo_pengunjung", maxCount: 1 }, // Field untuk foto bukti penerimaan
    ]),
    update);
router.post("/kode-verifikasi", validateToken, verifyCode);
// router.post('/verify-device', verifyDevice);
// router.get("/check", checkAuth);
// router.post("/logout", logoutUser);

module.exports = router;