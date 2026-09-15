const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const Activity = require("../models/Activity");
const Achievement = require("../models/Achievement");
const User = require("../models/User");
const { calculateActivityCarbon } = require("../services/carbon.service");
const { createAchievement } = require("../controllers/achievement.controller");

// Controllers
const {
  getWeeklySummary,
  getLeaderboard
} = require("../controllers/activity.controller");


router.get("/leaderboard", verifyToken, getLeaderboard);


router.get("/weekly-summary", verifyToken, getWeeklySummary);


/* ============================
   GET LOGGED-IN USER ACTIVITIES
============================ */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch activities" });
  }
});

/* ============================
   ACHIEVEMENT CHECK HELPER
============================ */
const checkAndAwardAchievements = async (userId) => {
  const count = await Activity.countDocuments({ user: userId });

  const milestones = [
    { count: 1, title: "First Step", description: "Logged your first activity!" },
    { count: 5, title: "Getting Greener", description: "Logged 5 activities." },
    { count: 10, title: "Eco Tracker", description: "Logged 10 activities!" }
  ];

  for (const m of milestones) {
    const exists = await Achievement.findOne({
      user: userId,
      title: m.title
    });

    if (count >= m.count && !exists) {
      await new Achievement({
        user: userId,
        title: m.title,
        description: m.description
      }).save();
    }
  }
};

// Award category-specific eco badges (awarded once)
const awardCategoryBadges = async (userId, type, data) => {
  try {
    if (type === "transport") {
      if (data.mode === "bike") await createAchievement(userId, "Cycling Hero", "Logged a cycling activity. Zero-emission commute!");
      if (data.mode === "bus" || data.mode === "train") await createAchievement(userId, "Public Transport Pro", "Chose shared or low-footprint transport.");
    } else if (type === "electricity") {
      if (Number(data.usage) <= 5) await createAchievement(userId, "Energy Saver", "Logged a low-power electricity activity.");
    } else if (type === "diet") {
      if (data.dietType === "vegan") await createAchievement(userId, "Green Plate", "Chose a fully plant-based meal.");
      if (data.dietType === "vegetarian") await createAchievement(userId, "Eco Eater", "Chose a vegetarian meal.");
    } else if (type === "waste") {
      if (data.disposal === "recycled") await createAchievement(userId, "Waste Wizard", "Logged recycled or composted waste.");
    }
  } catch (err) {
    console.error("BADGE AWARD ERROR:", err);
  }
};

/* ============================
   POST ACTIVITY
============================ */
router.post("/", verifyToken, async (req, res) => {
  const { type, data } = req.body;
  let suggestion = "";

  try {
    const { carbon, valid } = calculateActivityCarbon(type, data);

    if (!valid) {
      return res.status(400).json({ message: "Invalid activity or missing fields." });
    }

    if (type === "transport") {
      suggestion = "Try walking, cycling, or using public transport more often.";
    } else if (type === "electricity") {
      suggestion = "Reduce electricity usage and switch to renewable sources.";
    } else if (type === "diet") {
      suggestion = "Consider eating more plant-based meals.";
    } else if (type === "waste") {
      suggestion = "Recycle and compost where possible — landfill waste emits far more CO₂.";
    }

    const activity = new Activity({
      user: req.user.id,
      type,
      data,
      carbonFootprint: carbon
    });

    await activity.save();
    await checkAndAwardAchievements(req.user.id);
    await awardCategoryBadges(req.user.id, type, data);
    await User.updateOne({ _id: req.user.id }, { $inc: { ecoPoints: 5 } });

    res.json({
      carbonFootprint: carbon.toFixed(2),
      suggestion
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error calculating footprint" });
  }
});

module.exports = router;
