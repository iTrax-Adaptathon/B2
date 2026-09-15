const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { handleChat } = require("../controllers/chat.controller");

// All chat routes require a logged-in user
router.post("/", verifyToken, handleChat);

module.exports = router;
