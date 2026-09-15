const Challenge = require("../models/Challenge");
const User = require("../models/User");
const Activity = require("../models/Activity");
const { createAchievement } = require("./achievement.controller");
const { dateKey, weekRange, shiftDays, getCategoryTotals, safeSum } = require("../services/carbon.service");

const CHALLENGE_TEMPLATES = {
  transport: [
    { title: "Take Public Transport", description: "Use the bus or train for one trip today instead of a private vehicle.", points: 20, estimatedSaving: 1.1 },
    { title: "Active Commute", description: "Walk or cycle for a trip under 5 km today.", points: 15, estimatedSaving: 1.0 },
    { title: "Car-free Day", description: "Avoid using the car entirely today.", points: 25, estimatedSaving: 2.5 },
    { title: "Carpool", description: "Share one trip with a friend or colleague instead of driving alone.", points: 15, estimatedSaving: 1.1 },
  ],
  electricity: [
    { title: "Unplug Standby", description: "Switch off devices on standby for the evening.", points: 10, estimatedSaving: 0.4 },
    { title: "Power Off Hour", description: "Keep non-essential appliances off for 2 hours today.", points: 15, estimatedSaving: 0.7 },
    { title: "Natural Light", description: "Use natural light and skip electric lighting for 2 hours.", points: 10, estimatedSaving: 0.3 },
    { title: "Energy Check", description: "Inspect your appliances for high-usage ones and unplug 3 of them.", points: 15, estimatedSaving: 0.6 },
  ],
  diet: [
    { title: "Plant-Based Meal", description: "Add one fully plant-based meal today.", points: 20, estimatedSaving: 2.0 },
    { title: "Meat-Free Day", description: "Go meat-free for the entire day.", points: 25, estimatedSaving: 3.0 },
    { title: "Try Something Vegan", description: "Try one new vegan dish today.", points: 15, estimatedSaving: 1.0 },
    { title: "Zero Food Waste", description: "Eat everything you cook this evening — no leftovers thrown away.", points: 10, estimatedSaving: 0.5 },
  ],
  waste: [
    { title: "Recycle Run", description: "Separate today's recyclables (paper, plastic, metal) from trash.", points: 15, estimatedSaving: 0.8 },
    { title: "Compost Scraps", description: "Compost today's food scraps instead of binning them.", points: 15, estimatedSaving: 0.7 },
    { title: "Zero-Waste Meal", description: "Produce no food waste for one full meal today.", points: 10, estimatedSaving: 0.5 },
    { title: "Skip Single-Use", description: "Say no to single-use plastics for the whole day.", points: 20, estimatedSaving: 1.0 },
  ],
  general: [
    { title: "Logger", description: "Log at least 2 activities today.", points: 10, estimatedSaving: 0 },
    { title: "Goal Review", description: "Set or review your weekly carbon goal.", points: 10, estimatedSaving: 0 },
    { title: "Spread the Word", description: "Share one sustainability tip with a friend or on social media.", points: 10, estimatedSaving: 0 },
  ],
};

const pickChallenges = (templates, n, seed) => {
  // Rotate deterministically per day so the same set is always shown for a given date
  const list = [...templates];
  const out = [];
  for (let i = 0; i < n; i++) {
    const index = (seed + i) % list.length;
    out.push(list[index]);
    list.splice(index, 1);
    if (!list.length) break;
  }
  return out;
};

const buildDailyChallenges = async (userId, dateStr) => {
  const weekStart = weekRange(new Date()).start;
  const current = await Activity.find({ user: userId, createdAt: { $gte: weekStart } });
  const totals = getCategoryTotals(current);

  const seed = [...dateStr].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const KNOWN_CATEGORIES = Object.keys(CHALLENGE_TEMPLATES); // transport, electricity, diet, waste, general
  let mainCategory;

  if (totals.length) {
    mainCategory = totals[0].category;
  } else {
    const pick = ["transport", "diet", "waste"][seed % 3];
    mainCategory = KNOWN_CATEGORIES.includes(pick) ? pick : "transport";
  }

  const challengeTemplates = pickChallenges(
    [...CHALLENGE_TEMPLATES[mainCategory], ...CHALLENGE_TEMPLATES.general],
    3,
    seed
  );

  return challengeTemplates.map((t) => ({
    ...t,
    category: CHALLENGE_TEMPLATES[mainCategory].includes(t) ? mainCategory : "general",
    status: "pending",
  }));
};

// GET /api/challenges/today
exports.getToday = async (req, res) => {
  try {
    const userId = req.user.id;
    const todayStr = dateKey(new Date());

    let record = await Challenge.findOne({ user: userId, date: todayStr });
    if (!record) {
      const challenges = await buildDailyChallenges(userId, todayStr);
      record = await Challenge.create({ user: userId, date: todayStr, challenges });
    }

    // compute total possible points & earned
    const totals = record.challenges.reduce(
      (acc, c) => {
        acc.total += c.points;
        if (c.status === "completed") acc.earned += c.points;
        return acc;
      },
      { total: 0, earned: 0 }
    );

    const user = await User.findById(userId);
    res.json({
      success: true,
      data: {
        date: todayStr,
        challenges: record.challenges,
        totals,
        ecoPoints: user ? user.ecoPoints || 0 : 0,
      },
    });
  } catch (err) {
    console.error("GET TODAY CHALLENGES ERROR:", err);
    res.status(500).json({ success: false, message: "Error fetching daily challenges" });
  }
};

// POST /api/challenges/:challengeId/accept
exports.acceptChallenge = async (req, res) => {
  try {
    const userId = req.user.id;
    const todayStr = dateKey(new Date());
    const { challengeId } = req.params;

    const record = await Challenge.findOne({ user: userId, date: todayStr });
    if (!record) return res.status(404).json({ success: false, message: "No challenges for today" });

    const challenge = record.challenges.id(challengeId);
    if (!challenge) return res.status(404).json({ success: false, message: "Challenge not found" });

    if (challenge.status === "pending") {
      challenge.status = "accepted";
      challenge.acceptedAt = new Date();
      await record.save();
    }

    res.json({ success: true, data: challenge });
  } catch (err) {
    console.error("ACCEPT CHALLENGE ERROR:", err);
    res.status(500).json({ success: false, message: "Error accepting challenge" });
  }
};

// POST /api/challenges/:challengeId/complete
exports.completeChallenge = async (req, res) => {
  try {
    const userId = req.user.id;
    const todayStr = dateKey(new Date());

    const record = await Challenge.findOne({ user: userId, date: todayStr });
    if (!record) return res.status(404).json({ success: false, message: "No challenges for today" });

    const challenge = record.challenges.id(req.params.challengeId);
    if (!challenge) return res.status(404).json({ success: false, message: "Challenge not found" });

    if (challenge.status !== "completed") {
      challenge.status = "completed";
      challenge.completedAt = new Date();
      await record.save();

      await User.updateOne({ _id: userId }, { $inc: { ecoPoints: challenge.points } });
      await createAchievement(
        userId,
        "Challenge Champ",
        `Completed the "${challenge.title}" daily challenge (+${challenge.points} eco points).`
      );
    }

    const user = await User.findById(userId);
    res.json({
      success: true,
      data: challenge,
      ecoPoints: user ? user.ecoPoints || 0 : 0,
    });
  } catch (err) {
    console.error("COMPLETE CHALLENGE ERROR:", err);
    res.status(500).json({ success: false, message: "Error completing challenge" });
  }
};