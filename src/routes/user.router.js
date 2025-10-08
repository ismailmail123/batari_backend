const express = require("express");


const router = express.Router();
const { validateToken } = require("../middlewares/auth.js");
const { index } = require("../controllers/user.controller.js");

// /api/wbp
router.get("/", validateToken, index);

module.exports = router;