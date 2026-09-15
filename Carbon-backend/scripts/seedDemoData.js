/**
 * Seed realistic demo data so the app is alive on first demo.
 *
 * Creates the demo user (demo@carbon.com / Demo@1234) if missing, then wipes
 * and regenerates ~8 weeks of realistic activities with an improving trend,
 * sets a weekly goal, awards matching achievements, and grants eco points.
 *
 * Idempotent: safe to run repeatedly (it deletes and re-creates the demo
 * user's activities/challenges/achievements, and upserts the user + goal).
 *
 * Usage:
 *   npm run seed        (from Carbon-backend)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Activity = require("../models/Activity");
const Achievement = require("../models/Achievement");
const Goal = require("../models/Goal");
const Challenge = require("../models/Challenge");
const { calculateActivityCarbon, dateKey, shiftDays, round2 } = require("../services/carbon.service");

const DEMO_EMAIL = "demo@carbon.com";
const DEMO_PASSWORD = "Demo@1234";
const DEMO_NAME = "Demo User";
const WEEKS = 8;

// Small deterministic PRNG so repeated runs produce the same dataset
let seedState = 42;
const rand = () => {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
};
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];

const buildActivities = () => {
  const activities = [];
  const today = new Date();

  for (let dayOffset = WEEKS * 7 - 1; dayOffset >= 0; dayOffset--) {
    const day = shiftDays(today, -dayOffset);
    // Skip some days to make streaks/heatmap realistic
    if (rand() < 0.15) continue;

    const progress = 1 - dayOffset / (WEEKS * 7); // 0 (oldest) -> 1 (today)

    // Transport: improving over time (more bus/train, less car)
    if (rand() < 0.75) {
      const mode = rand() < 0.25 + progress * 0.35 ? pick(["bus", "train", "bike"]) : "car";
      const distance = randInt(5, 30);
      activities.push({
        type: "transport",
        data: { mode, distance },
        createdAt: withTime(day, randInt(7, 9), randInt(0, 59)),
      });
    }

    // Electricity: usage drifts down over time
    if (rand() < 0.6) {
      const usage = Math.max(3, Math.round(14 - progress * 6 + rand() * 4));
      activities.push({
        type: "electricity",
        data: { usage },
        createdAt: withTime(day, randInt(18, 21), randInt(0, 59)),
      });
    }

    // Diet: mostly veg, occasionally non-veg (less often later)
    if (rand() < 0.7) {
      const dietType = rand() < 0.75 + progress * 0.15 ? pick(["vegetarian", "vegan"]) : "nonVegetarian";
      activities.push({
        type: "diet",
        data: { dietType },
        createdAt: withTime(day, randInt(12, 14), randInt(0, 59)),
      });
    }

    // Waste: more recycling as time goes on
    if (rand() < 0.4) {
      const disposal = rand() < 0.3 + progress * 0.4 ? "recycled" : "landfilled";
      activities.push({
        type: "waste",
        data: { disposal, weight: randInt(1, 4) },
        createdAt: withTime(day, randInt(17, 20), randInt(0, 59)),
      });
    }
  }

  return activities;
};

const withTime = (day, hours, minutes) => {
  const d = new Date(day);
  d.setHours(hours, minutes, Math.floor(Math.random() * 60), 0);
  return d;
};

const seed = async () => {
  await connectDB();

  console.log("Seeding demo data...");

  // 1. Upsert demo user (verified, with password)
  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = new User({ email: DEMO_EMAIL, isVerified: true });
  }
  user.name = DEMO_NAME;
  user.password = await bcrypt.hash(DEMO_PASSWORD, 10);
  user.isVerified = true;
  await user.save();

  // 2. Upsert goal doc (primary source) + user.weeklyGoal (fallback)
  await Goal.findOneAndUpdate(
    { user: user._id },
    { weeklyGoal: 45 },
    { upsert: true, new: true }
  );
  user.weeklyGoal = 45;
  await user.save();

  // 3. Reset derived collections for the demo user
  const [deletedActs, deletedCh, deletedAch] = await Promise.all([
    Activity.deleteMany({ user: user._id }),
    Challenge.deleteMany({ user: user._id }),
    Achievement.deleteMany({ user: user._id }),
  ]);

  // 4. Create activities with computed carbon values
  const specs = buildActivities();
  const docs = specs.map((s) => {
    const { carbon } = calculateActivityCarbon(s.type, s.data);
    return {
      user: user._id,
      type: s.type,
      data: s.data,
      carbonFootprint: carbon,
      createdAt: s.createdAt,
    };
  });
  const inserted = await Activity.insertMany(docs);

  // 5. Grant a few achievements
  await Achievement.insertMany([
    {
      user: user._id,
      title: "First Step",
      description: "Logged your first activity!",
      achievedAt: shiftDays(new Date(), -WEEKS * 7),
    },
    {
      user: user._id,
      title: "Eco Tracker",
      description: "Logged 10 activities!",
      achievedAt: shiftDays(new Date(), -20),
    },
    {
      user: user._id,
      title: "Public Transport Pro",
      description: "Chose shared or low-footprint transport.",
      achievedAt: shiftDays(new Date(), -10),
    },
    {
      user: user._id,
      title: "Waste Wizard",
      description: "Logged recycled or composted waste.",
      achievedAt: shiftDays(new Date(), -3),
    },
  ]);

  // 6. Eco points: 5 per activity + challenge completions
  const ecoPoints = inserted.length * 5 + 180;
  await User.updateOne({ _id: user._id }, { $set: { ecoPoints } });

  // 7. Summary
  const totalCO2 = round2(inserted.reduce((s, a) => s + a.carbonFootprint, 0));
  const byType = inserted.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {});
  const firstDay = dateKey(shiftDays(new Date(), -(WEEKS * 7)));
  const lastDay = dateKey(new Date());

  console.log(`✓ Demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (weekly goal 45 kg)`);
  console.log(`✓ ${inserted.length} activities from ${firstDay} to ${lastDay} (${totalCO2} kg CO2 total)`);
  console.log(`  by type: ${JSON.stringify(byType)}`);
  console.log(`✓ ecoPoints: ${ecoPoints}, achievements: 4, weekly goal doc: 45 kg`);
  console.log(`(cleaned up: ${deletedActs.deletedCount} old activities, ${deletedCh.deletedCount} old challenge records, ${deletedAch.deletedCount} old achievements)`);

  await mongoose.connection.close();
  console.log("Done.");
};

seed().catch((err) => {
  console.error("SEED FAILED:", err);
  process.exit(1);
});
