const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const insights = require("../controllers/insights.controller");

router.get("/eco-score", verifyToken, insights.getEcoScore);
router.get("/forecast", verifyToken, insights.getForecast);
router.get("/personal-best", verifyToken, insights.getPersonalBest);
router.get("/coach", verifyToken, insights.getCoach);
router.get("/heatmap", verifyToken, insights.getHeatmap);
router.get("/overview", verifyToken, insights.getOverview);
router.post("/simulate", verifyToken, insights.simulate);

module.exports = router;