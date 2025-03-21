const express = require("express");

const router = express.Router();

const { upload } = require("../config/multer");


const { login, register, verifyEmail, verifyDevice, checkAuth, logoutUser } = require("../controllers/auth.controller");
const { validateLogin, validateRegister } = require("../middlewares/validator.js");

// /api/babs
router.post("/login", validateLogin, login);
router.post("/register", upload.single("photo"), register);
router.post("/verify-email", verifyEmail);
router.post('/verify-device', verifyDevice);
router.get("/check", checkAuth);
router.post("/logout", logoutUser);

module.exports = router;