const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const {
  buildWeeklySummary,
  sendWeeklySummaryToUser,
} = require("../services/weeklySummary.service");

// GET /api/weekly-summary/me — preview payload for the logged-in user
router.get("/me", verifyToken, async (req, res) => {
  try {
    const summary = await buildWeeklySummary(req.user.id);
    const { user, ...data } = summary;
    res.json({
      success: true,
      data: {
        ...data,
        email: user ? user.email : null,
      },
    });
  } catch (err) {
    console.error("WEEKLY SUMMARY PREVIEW ERROR:", err);
    res.status(500).json({ success: false, message: "Error building weekly summary" });
  }
});

// POST /api/weekly-summary/send — email the logged-in user their summary now
router.post("/send", verifyToken, async (req, res) => {
  try {
    const result = await sendWeeklySummaryToUser(req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("WEEKLY SUMMARY SEND ERROR:", err);
    res.status(500).json({ success: false, message: "Error sending weekly summary email" });
  }
});

module.exports = router;
