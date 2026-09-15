const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { getToday, acceptChallenge, completeChallenge } = require("../controllers/challenge.controller");

router.get("/today", verifyToken, getToday);
router.post("/:challengeId/accept", verifyToken, acceptChallenge);
router.post("/:challengeId/complete", verifyToken, completeChallenge);

module.exports = router;