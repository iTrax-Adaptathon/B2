// controllers/activity.controller.js
const Activity = require("../models/Activity");
const User = require("../models/User");
const Goal = require("../models/Goal");
const { weekRange, resolveWeeklyGoal } = require("../services/carbon.service");

// NOTE: week boundaries now come from services/carbon.service.js (Monday-start week)
// so dashboard/leaderboard/insights all agree on when a week starts.

// Returns a title for leaderboard display (not stored in DB)
const getEcoTitle = (rank, weeklyStatus, activityCount) => {
  if (rank === 1) {
    return "Eco Champion";
  }
  if (weeklyStatus === "under") {
    return "Eco Warrior";
  }
  if (activityCount >= 5) {
    return "Eco Explorer";
  }
  return "Eco Beginner";
};

const getWeeklySummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const { start: startOfWeek } = weekRange(new Date());

    const [activities, user, goalDoc] = await Promise.all([
      Activity.find({
        user: userId,
        createdAt: { $gte: startOfWeek },
      }),
      User.findById(userId),
      Goal.findOne({ user: userId }),
    ]);

    const total = activities.reduce((sum, act) => sum + act.carbonFootprint, 0);

    const goal = resolveWeeklyGoal(user, goalDoc);
    const status = total <= goal ? "under" : "over";

    res.json({ total: total.toFixed(2), goal, status });
  } catch (err) {
    console.error("Weekly summary error:", err);
    res.status(500).json({ message: "Error getting weekly summary" });
  }
};

// Leaderboard with dynamic eco titles
const getLeaderboard = async (req, res) => {
  try {
    const { start: startOfWeek, end: endOfWeek } = weekRange(new Date());

    const startOfPrevWeek = new Date(startOfWeek);
    startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);

    // Get all users with their weekly activities
    const leaderboardData = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek, $lte: endOfWeek }
        }
      },
      {
        $group: {
          _id: "$user",
          totalCO2: { $sum: "$carbonFootprint" },
          activityCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $unwind: "$userInfo"
      },
      {
        $lookup: {
          from: "goals",
          localField: "_id",
          foreignField: "user",
          as: "goalInfo"
        }
      },
      {
        $project: {
          _id: 1,
          name: "$userInfo.name",
          totalCO2: 1,
          activityCount: 1,
          goalDocGoal: { $arrayElemAt: ["$goalInfo.weeklyGoal", 0] },
          userWeeklyGoal: "$userInfo.weeklyGoal",
          ecoPoints: "$userInfo.ecoPoints"
        }
      },
      {
        $sort: { totalCO2: 1 }
      }
    ]);

    // Previous week totals per user (for improvement metric)
    const prevWeekData = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfPrevWeek, $lt: startOfWeek }
        }
      },
      {
        $group: {
          _id: "$user",
          totalCO2: { $sum: "$carbonFootprint" }
        }
      }
    ]);

    const prevWeekMap = {};
    prevWeekData.forEach((u) => {
      prevWeekMap[u._id.toString()] = u.totalCO2;
    });

    // Add rank, eco title, improvement and eco points to each user
    const leaderboard = leaderboardData.map((user, index) => {
      const rank = index + 1;
      const weeklyGoal = resolveWeeklyGoal(
        { weeklyGoal: user.userWeeklyGoal },
        { weeklyGoal: user.goalDocGoal }
      );
      const weeklyStatus = user.totalCO2 <= weeklyGoal ? "under" : "over";
      const ecoTitle = getEcoTitle(rank, weeklyStatus, user.activityCount);

      const prevCO2 = prevWeekMap[user._id.toString()];
      let improvement = null; // positive % = reduced vs last week
      if (prevCO2 > 0) {
        improvement = Math.round(((prevCO2 - user.totalCO2) / prevCO2) * 100);
      } else if (user.totalCO2 === 0) {
        improvement = null;
      }

      return {
        _id: user._id,
        name: user.name,
        totalCO2: user.totalCO2,
        rank,
        ecoTitle,
        improvement,
        ecoPoints: user.ecoPoints || 0
      };
    });

    res.json(leaderboard);
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
};

module.exports = { getWeeklySummary, getLeaderboard, getEcoTitle };
