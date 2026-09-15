/**
 * buildChatContext.js
 * Aggregates a user's carbon data into a compact string for the LLM system prompt.
 *
 * Expects the existing Mongoose models from the Carbon Tracker backend:
 *   - ../models/Activity  (fields: user, type, data, carbonFootprint, createdAt)
 *   - ../models/Goal      (fields: user, weeklyGoal)
 *
 * Type-agnostic: groups by whatever activity types exist in the data
 * (transport / electricity / diet / waste / ...).
 */

const Activity = require("../models/Activity");
const Goal = require("../models/Goal");

const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * @param {string} userId - authenticated user's id (req.user.id)
 * @returns {Promise<string>} human-readable summary of the user's footprint
 */
async function buildChatContext(userId) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [activities, goal] = await Promise.all([
      Activity.find({ user: userId, createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      Goal.findOne({ user: userId }).lean(),
    ]);

    const lines = [];

    if (!activities.length) {
      lines.push(
        "No activities logged in the last 7 days. Encourage the user to log their first activity."
      );
    } else {
      // Totals per type (dynamic — supports any activity type)
      const byType = {};
      let weekTotal = 0;
      for (const a of activities) {
        const key = a.type || "other";
        byType[key] = (byType[key] || 0) + a.carbonFootprint;
        weekTotal += a.carbonFootprint;
      }

      lines.push(`Activities logged in last 7 days: ${activities.length}`);
      lines.push(`Total emissions last 7 days: ${round(weekTotal)} kg CO2`);
      for (const [type, total] of Object.entries(byType)) {
        lines.push(`  - ${type}: ${round(total)} kg CO2`);
      }

      // Most recent few activities for concreteness
      const recent = activities
        .slice(0, 5)
        .map((a) => `    - ${a.type}: ${round(a.carbonFootprint)} kg CO2`);
      lines.push("Most recent activities:");
      lines.push(...recent);

      // Goal progress
      if (goal?.weeklyGoal) {
        const remaining = round(goal.weeklyGoal - weekTotal);
        const pct = Math.round((weekTotal / goal.weeklyGoal) * 100);
        lines.push(
          `Weekly goal: ${goal.weeklyGoal} kg CO2. Used ${pct}% of it. ` +
            (remaining >= 0
              ? `${remaining} kg remaining.`
              : `Over the goal by ${Math.abs(remaining)} kg.`)
        );
      } else {
        lines.push("No weekly goal set yet. Suggest setting one on the Goals page.");
      }
    }

    return lines.join("\n");
  } catch (err) {
    console.error("buildChatContext failed:", err.message);
    return "User footprint data is currently unavailable.";
  }
}

module.exports = buildChatContext;
