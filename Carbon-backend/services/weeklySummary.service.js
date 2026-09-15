const Activity = require("../models/Activity");
const User = require("../models/User");
const Goal = require("../models/Goal");
const sendEmail = require("../utils/sendEmail");
const {
  weekRange,
  shiftDays,
  safeSum,
  round2,
  getCategoryTotals,
  computeEcoScore,
  computeForecast,
  resolveWeeklyGoal,
} = require("./carbon.service");

/**
 * Build the weekly summary payload for one user.
 * Reuses the same shared calculations as the Insights page (single source of truth).
 */
const buildWeeklySummary = async (userId) => {
  const { start: weekStart } = weekRange(new Date());
  const prevStart = shiftDays(weekStart, -7);

  const [current, previous, user, goalDoc] = await Promise.all([
    Activity.find({ user: userId, createdAt: { $gte: weekStart } }),
    Activity.find({ user: userId, createdAt: { $gte: prevStart, $lt: weekStart } }),
    User.findById(userId),
    Goal.findOne({ user: userId }),
  ]);

  const goal = resolveWeeklyGoal(user, goalDoc);
  const currentTotal = safeSum(current.map((a) => a.carbonFootprint));
  const prevTotal = safeSum(previous.map((a) => a.carbonFootprint));
  const improvement = prevTotal > 0 ? round2(((prevTotal - currentTotal) / prevTotal) * 100) : null;
  const categories = getCategoryTotals(current);

  const ecoScore = computeEcoScore({ currentActivities: current, previousActivities: previous, goal });
  const forecast = computeForecast({ recentActivities: current, currentWeekTotal: currentTotal, goal });

  return {
    user,
    goal,
    weekStart,
    total: round2(currentTotal),
    prevTotal: round2(prevTotal),
    improvement,
    activityCount: current.length,
    ecoScore,
    forecast,
    categories,
    status: currentTotal <= goal ? "under" : "over",
  };
};

/** Plain-text email body for the weekly summary */
const renderWeeklyEmail = (summary) => {
  const { user, goal, weekStart, total, prevTotal, improvement, activityCount, ecoScore, forecast, categories, status } = summary;

  const firstName = (user && user.name) || "there";
  const weekLine = `Week of ${weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`;

  const lines = [];
  lines.push(`Hi ${firstName},`);
  lines.push("");
  lines.push(`Here is your Carbon Tracker weekly summary. ${weekLine}.`);
  lines.push("");
  lines.push(`Estimated emissions this week: ${total} kg CO2 (${activityCount} activit${activityCount === 1 ? "y" : "ies"} logged)`);
  lines.push(`Weekly goal: ${goal} kg CO2 — you are ${status === "under" ? "UNDER goal, great job!" : "OVER goal, you can still turn it around!"}`);
  if (improvement !== null) {
    lines.push(`Vs last week: ${improvement >= 0 ? "-" : "+"}${Math.abs(improvement)}% ${improvement >= 0 ? "(reduction)" : "(increase)"}`);
  }
  lines.push(`Previous week total: ${prevTotal} kg CO2`);
  lines.push("");
  lines.push(`Eco Score: ${ecoScore.score}/100 (${ecoScore.label}) ${ecoScore.emoji}`);
  lines.push(`Forecast for next week: ${forecast.forecastNextWeek} kg CO2 (${forecast.risk === "above" ? "above goal" : forecast.risk === "on-target" ? "on target" : "not enough data"})`);
  lines.push("");

  if (categories.length) {
    lines.push("Where your emissions came from:");
    categories.forEach((c) => {
      const label = { transport: "Transport", electricity: "Electricity", diet: "Diet", waste: "Waste" }[c.category] || c.category;
      const pct = total > 0 ? Math.round((c.totalCO2 / total) * 100) : 0;
      lines.push(`  - ${label}: ${c.totalCO2} kg (${pct}%, ${c.count} activities)`);
    });
    lines.push("");
  }

  if (forecast.risk === "above") {
    lines.push(`Tip: You are forecast to exceed your goal by ${forecast.margin} kg next week. Check the What-If Simulator on the Insights page to see what changing one habit could save.`);
  } else if (categories.length) {
    lines.push("Tip: Check the Carbon Coach on the Insights page for your single next-best action this week.");
  }
  lines.push("");
  lines.push("Keep logging your activities daily — streaks and eco points add up!");
  lines.push("");
  lines.push("- Carbon Tracker (Swadeshi for Atmanirbhar Bharat)");

  return lines.join("\n");
};

/** Send the weekly summary email to a single user. Returns info about what happened. */
const sendWeeklySummaryToUser = async (userId) => {
  const summary = await buildWeeklySummary(userId);
  if (!summary.user || !summary.user.email) {
    return { skipped: true, reason: "no user/email" };
  }
  if (summary.activityCount === 0) {
    return { skipped: true, reason: "no activities this week" };
  }

  const subject = `Your Carbon Tracker weekly summary — ${summary.total} kg CO2 this week`;
  const text = renderWeeklyEmail(summary);
  await sendEmail(summary.user.email, subject, text);

  return { skipped: false, email: summary.user.email, total: summary.total };
};

/** Send to all users with activities this week (for cron). */
const sendWeeklySummariesToAll = async () => {
  const { start: weekStart } = weekRange(new Date());

  const users = await User.find(
    { email: { $exists: true, $ne: null } },
    "_id email name"
  );

  const results = [];
  for (const u of users) {
    const count = await Activity.countDocuments({ user: u._id, createdAt: { $gte: weekStart } });
    if (count === 0) {
      results.push({ email: u.email, skipped: true, reason: "no activities this week" });
      continue;
    }
    try {
      const r = await sendWeeklySummaryToUser(u._id);
      results.push({ email: u.email, ...r });
    } catch (err) {
      console.error(`WEEKLY SUMMARY FAILED for ${u.email}:`, err.message);
      results.push({ email: u.email, skipped: true, reason: err.message });
    }
  }

  return results;
};

module.exports = {
  buildWeeklySummary,
  renderWeeklyEmail,
  sendWeeklySummaryToUser,
  sendWeeklySummariesToAll,
};
