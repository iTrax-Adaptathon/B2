const Activity = require("../models/Activity");
const User = require("../models/User");
const Goal = require("../models/Goal");
const Challenge = require("../models/Challenge");
const {
  calculateActivityCarbon,
  computeEcoScore,
  computeForecast,
  computePersonalBest,
  computeCoach,
  getCategoryTotals,
  groupByWeek,
  weekRange,
  dateKey,
  shiftDays,
  safeSum,
  round2,
  resolveWeeklyGoal,
} = require("../services/carbon.service");

// Shared weekly-goal resolution (Goal doc -> user.weeklyGoal -> 100)
const getGoal = async (userId) => {
  const [user, goalDoc] = await Promise.all([
    User.findById(userId),
    Goal.findOne({ user: userId }),
  ]);
  return resolveWeeklyGoal(user, goalDoc);
};

// GET /api/insights/eco-score
exports.getEcoScore = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start: weekStart } = weekRange(new Date());
    const prevStart = shiftDays(weekStart, -7);

    const [currentActivities, previousActivities] = await Promise.all([
      Activity.find({ user: userId, createdAt: { $gte: weekStart } }),
      Activity.find({ user: userId, createdAt: { $gte: prevStart, $lt: weekStart } }),
    ]);

    const goal = await getGoal(userId);
    const ecoScore = computeEcoScore({ currentActivities, previousActivities, goal });
    res.json({ success: true, data: ecoScore });
  } catch (err) {
    console.error("ECO SCORE ERROR:", err);
    res.status(500).json({ success: false, message: "Error computing eco score" });
  }
};

// GET /api/insights/forecast
exports.getForecast = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start: weekStart, end: weekEnd } = weekRange(new Date());

    const [recentActivities, currentWeekActivities] = await Promise.all([
      Activity.find({ user: userId, createdAt: { $gte: shiftDays(new Date(), -30) } }),
      Activity.find({ user: userId, createdAt: { $gte: weekStart, $lte: weekEnd } }),
    ]);

    const goal = await getGoal(userId);
    const currentWeekTotal = safeSum(currentWeekActivities.map((a) => a.carbonFootprint));
    const forecast = computeForecast({ recentActivities, currentWeekTotal, goal });
    res.json({ success: true, data: forecast });
  } catch (err) {
    console.error("FORECAST ERROR:", err);
    res.status(500).json({ success: false, message: "Error computing forecast" });
  }
};

// GET /api/insights/personal-best
exports.getPersonalBest = async (req, res) => {
  try {
    const userId = req.user.id;
    const since = shiftDays(new Date(), -120);

    const [activities, challenges] = await Promise.all([
      Activity.find({ user: userId, createdAt: { $gte: since } }),
      Challenge.find({ user: userId, "challenges.status": "completed" }),
    ]);

    const weeklyTotals = groupByWeek(activities);
    const challengesCompleted = challenges.reduce((sum, c) => {
      return sum + c.challenges.filter((x) => x.status === "completed").length;
    }, 0);

    const personalBest = computePersonalBest({ activities, weeklyTotals, challengesCompleted });
    res.json({ success: true, data: personalBest });
  } catch (err) {
    console.error("PERSONAL BEST ERROR:", err);
    res.status(500).json({ success: false, message: "Error computing personal best" });
  }
};

// GET /api/insights/coach
exports.getCoach = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start: weekStart, end: weekEnd } = weekRange(new Date());
    const prevStart = shiftDays(weekStart, -7);

    const [current, previous] = await Promise.all([
      Activity.find({ user: userId, createdAt: { $gte: weekStart, $lte: weekEnd } }),
      Activity.find({ user: userId, createdAt: { $gte: prevStart, $lt: weekStart } }),
    ]);

    const goal = await getGoal(userId);
    const currentCategories = getCategoryTotals(current);
    const previousCategories = getCategoryTotals(previous);

    // attach samples for coach computations (car trips / meal counts)
    const top = currentCategories[0];
    if (top) {
      top.sample = current.filter((a) => a.type === top.category);
    }

    const currentTotal = safeSum(current.map((a) => a.carbonFootprint));
    const coach = computeCoach({ currentCategories, previousCategories, currentTotal, goal });
    res.json({ success: true, data: coach });
  } catch (err) {
    console.error("COACH ERROR:", err);
    res.status(500).json({ success: false, message: "Error computing coach advice" });
  }
};

// GET /api/insights/overview — combined payload for the Carbon Insights page
exports.getOverview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start: weekStart, end: weekEnd } = weekRange(new Date());
    const prevStart = shiftDays(weekStart, -7);

    const [current, previous, recent, challenges, user] = await Promise.all([
      Activity.find({ user: userId, createdAt: { $gte: weekStart, $lte: weekEnd } }),
      Activity.find({ user: userId, createdAt: { $gte: prevStart, $lt: weekStart } }),
      Activity.find({ user: userId, createdAt: { $gte: shiftDays(new Date(), -30) } }),
      Challenge.find({ user: userId, "challenges.status": "completed" }),
      User.findById(userId),
    ]);

    const goal = await getGoal(userId);
    const currentTotal = safeSum(current.map((a) => a.carbonFootprint));

    const ecoScore = computeEcoScore({ currentActivities: current, previousActivities: previous, goal });
    const forecast = computeForecast({ recentActivities: recent, currentWeekTotal: currentTotal, goal });

    const currentCategories = getCategoryTotals(current);
    const previousCategories = getCategoryTotals(previous);
    if (currentCategories[0]) {
      currentCategories[0].sample = current.filter((a) => a.type === currentCategories[0].category);
    }
    const coach = computeCoach({ currentCategories, previousCategories, currentTotal, goal });

    const all90 = await Activity.find({ user: userId, createdAt: { $gte: shiftDays(new Date(), -90) } });
    const weeklyTotals = groupByWeek(all90);

    const challengesCompleted = challenges.reduce((sum, c) => {
      return sum + c.challenges.filter((x) => x.status === "completed").length;
    }, 0);

    const personalBest = computePersonalBest({ activities: all90, weeklyTotals, challengesCompleted });

    res.json({
      success: true,
      data: {
        ecoScore,
        forecast,
        coach,
        personalBest,
        currentTotal: round2(currentTotal),
        totalActivities: current.length,
        ecoPoints: user ? user.ecoPoints || 0 : 0,
        categories: currentCategories.map((c) => ({ category: c.category, totalCO2: c.totalCO2, count: c.count })),
      },
    });
  } catch (err) {
    console.error("OVERVIEW ERROR:", err);
    res.status(500).json({ success: false, message: "Error building insights overview" });
  }
};

// GET /api/insights/heatmap?days=90
exports.getHeatmap = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 90, 7), 180);
    const since = shiftDays(new Date(), -(days - 1));
    since.setHours(0, 0, 0, 0);

    const activities = await Activity.find({
      user: userId,
      createdAt: { $gte: since },
    });

    const daily = {};
    for (const a of activities) {
      const k = dateKey(new Date(a.createdAt));
      if (!daily[k]) daily[k] = { date: k, totalCO2: 0, count: 0 };
      daily[k].totalCO2 = round2(daily[k].totalCO2 + (Number.isFinite(a.carbonFootprint) ? a.carbonFootprint : 0));
      daily[k].count += 1;
    }

    const series = [];
    const norm = new Date(since);
    norm.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let d = new Date(norm); d <= today; d.setDate(d.getDate() + 1)) {
      const k = dateKey(d);
      series.push(daily[k] || { date: k, totalCO2: 0, count: 0 });
    }

    res.json({ success: true, data: series });
  } catch (err) {
    console.error("HEATMAP ERROR:", err);
    res.status(500).json({ success: false, message: "Error fetching heatmap" });
  }
};

// POST /api/insights/simulate
// body: { baseline: [{type,data},...], proposed: [{type,data},...] }
exports.simulate = async (req, res) => {
  try {
    const { baseline = [], proposed = [] } = req.body;

    const baselineTotal = round2(
      safeSum(baseline.map((a) => calculateActivityCarbon(a.type, a.data).carbon))
    );
    const proposedTotal = round2(
      safeSum(proposed.map((a) => calculateActivityCarbon(a.type, a.data).carbon))
    );
    const saving = round2(baselineTotal - proposedTotal);
    const percentChange = baselineTotal > 0 ? round2(((proposedTotal - baselineTotal) / baselineTotal) * 100) : 0;

    res.json({
      success: true,
      data: {
        baselineTotal,
        proposedTotal,
        saving,
        percentChange,
        isEstimate: true,
        note: "Simulated using the same emission factors as live activity logging.",
      },
    });
  } catch (err) {
    console.error("SIMULATE ERROR:", err);
    res.status(500).json({ success: false, message: "Error running simulation" });
  }
};

module.exports = exports;