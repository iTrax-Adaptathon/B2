const EMISSION_FACTORS = {
  transport: {
    car: 0.21,
    bus: 0.1,
    bike: 0.02,
    train: 0.05,
  },
  electricity: 0.7, // kg CO2 per kWh
  diet: {
    vegetarian: 2.0,
    nonVegetarian: 4.5,
    vegan: 1.5,
  },
  waste: {
    landfilled: 0.58, // kg CO2 per kg of landfilled household waste
    recycled: 0.18,   // kg CO2 per kg when mostly recycled/composted
  },
};

const CATEGORY_LABELS = {
  transport: "Transport",
  electricity: "Electricity",
  diet: "Diet",
  waste: "Waste",
};

const round2 = (n) => Math.round(n * 100) / 100;

const toFinite = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const safeSum = (arr) =>
  arr.reduce((sum, x) => sum + (Number.isFinite(x) ? x : 0), 0);

const calculateActivityCarbon = (type, data = {}) => {
  const t = type;
  if (t === "transport") {
    const mode = data.mode;
    if (!EMISSION_FACTORS.transport[mode]) {
      return { carbon: 0, valid: false, reason: "Unknown transport mode" };
    }
    return { carbon: round2(toFinite(data.distance) * EMISSION_FACTORS.transport[mode]), valid: true };
  }
  if (t === "electricity") {
    return { carbon: round2(toFinite(data.usage) * EMISSION_FACTORS.electricity), valid: true };
  }
  if (t === "diet") {
    const f = EMISSION_FACTORS.diet[data.dietType];
    if (!f) return { carbon: 0, valid: false, reason: "Unknown diet type" };
    return { carbon: f, valid: true };
  }
  if (t === "waste") {
    const f = EMISSION_FACTORS.waste[data.disposal];
    if (!f) return { carbon: 0, valid: false, reason: "Unknown waste disposal method" };
    const carbon = round2(toFinite(data.weight) * f);
    if (carbon <= 0) return { carbon: 0, valid: false, reason: "Waste weight must be greater than 0" };
    return { carbon, valid: true };
  }
  return { carbon: 0, valid: false, reason: "Unknown activity type" };
};

const isGreenActivity = (activity) => {
  const { type, data, carbonFootprint } = activity;
  if (type === "transport") {
    return ["bus", "train", "bike"].includes(data && data.mode);
  }
  if (type === "diet") {
    return ["vegan", "vegetarian"].includes(data && data.dietType);
  }
  if (type === "electricity") {
    return toFinite(data && data.usage) <= 5;
  }
  if (type === "waste") {
    return data && data.disposal === "recycled";
  }
  return false;
};

const startOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const weekRange = (date = new Date()) => {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(-1);
  return { start, end };
};

const dateKey = (date = new Date()) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const shiftDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const getCategoryTotals = (activities) => {
  const map = {};
  for (const a of activities) {
    const t = a.type || "other";
    if (!map[t]) map[t] = { category: t, totalCO2: 0, count: 0 };
    map[t].totalCO2 = round2(map[t].totalCO2 + toFinite(a.carbonFootprint));
    map[t].count += 1;
  }
  return Object.values(map).sort((x, y) => y.totalCO2 - x.totalCO2);
};

const groupByWeek = (activities) => {
  const map = {};
  for (const a of activities) {
    const key = dateKey(startOfWeek(new Date(a.createdAt)));
    if (!map[key]) map[key] = { weekStart: key, totalCO2: 0, count: 0 };
    map[key].totalCO2 = round2(map[key].totalCO2 + toFinite(a.carbonFootprint));
    map[key].count += 1;
  }
  return Object.values(map).sort((x, y) => x.weekStart.localeCompare(y.weekStart));
};

const computeStreaks = (activities) => {
  const days = new Set(activities.map((a) => dateKey(new Date(a.createdAt))));
  if (days.size === 0) return { currentStreak: 0, longestStreak: 0 };

  let longestStreak = 0;
  let currentStreak = 0;
  let cursor = startOfWeek(new Date());
  cursor.setDate(cursor.getDate() - 1); // include today via loop from earliest
  const todayKey = dateKey(new Date());
  const spanDays = 120;
  const start = shiftDays(new Date(), -spanDays);

  let running = 0;
  for (let d = new Date(start); d <= new Date(); d.setDate(d.getDate() + 1)) {
    if (days.has(dateKey(d))) {
      running += 1;
      if (running > longestStreak) longestStreak = running;
    } else {
      running = 0;
    }
  }

  // Current streak = consecutive days ending today (or yesterday if none today)
  const ordered = [...days].sort();
  const lastDay = ordered[ordered.length - 1];
  const lastDate = new Date(lastDay);
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const anchored = new Date(todayMidnight);
  if (dateKey(anchored) !== lastDay) {
    anchored.setDate(anchored.getDate() - 1);
  }
  for (let d = new Date(anchored); ; d.setDate(d.getDate() - 1)) {
    if (days.has(dateKey(d))) currentStreak += 1;
    else break;
  }

  // Also count today if it isn't in days (partial day, streak = 0 since today empty)
  if (!days.has(todayKey)) currentStreak = currentStreak > 1 && dateKey(anchored) !== todayKey ? currentStreak : currentStreak;

  return { currentStreak, longestStreak };
};

const ECO_SCORE_LABELS = [
  { min: 90, label: "Eco Legend", emoji: "👑" },
  { min: 75, label: "Eco Champion", emoji: "🏆" },
  { min: 60, label: "Eco Warrior", emoji: "🌱" },
  { min: 40, label: "Eco Explorer", emoji: "🧭" },
  { min: 0, label: "Getting Started", emoji: "🌱" },
];

const computeEcoScore = ({ currentActivities, previousActivities, goal }) => {
  const goalValue = toFinite(goal) || 100;

  // 1. Goal adherence (0-30)
  const currentTotal = safeSum(currentActivities.map((a) => a.carbonFootprint));
  let goalAdherence;
  if (currentActivities.length === 0) goalAdherence = 0;
  else if (currentTotal <= goalValue) goalAdherence = 30;
  else goalAdherence = Math.max(0, Math.round(30 * (goalValue / currentTotal) * 100) / 100);

  // 2. Consistency (0-20): distinct active days in last 7
  const last7Start = shiftDays(new Date(), -6);
  last7Start.setHours(0, 0, 0, 0);
  const last7 = currentActivities.filter((a) => new Date(a.createdAt) >= last7Start);
  const activeDays = new Set(last7.map((a) => dateKey(new Date(a.createdAt)))).size;
  const consistency = Math.round((Math.min(activeDays, 7) / 7) * 20 * 100) / 100;

  // 3. Reduction vs previous week (0-25)
  const prevTotal = safeSum(previousActivities.map((a) => a.carbonFootprint));
  let reduction;
  if (prevTotal <= 0) reduction = currentActivities.length > 0 ? 12.5 : 0; // neutral if no baseline
  else if (currentTotal < prevTotal) {
    reduction = Math.min(25, Math.round((1 - currentTotal / prevTotal) * 25 * 100) / 100);
  } else {
    reduction = Math.max(0, Math.round(25 * Math.min(prevTotal / currentTotal, 1) * 100) / 100);
  }

  // 4. Sustainable choices (0-15)
  const greenCount = currentActivities.filter((a) => isGreenActivity(a)).length;
  const sustainableChoices = currentActivities.length
    ? Math.round((greenCount / currentActivities.length) * 15 * 100) / 100
    : 0;

  // 5. Streak (0-10)
  const { currentStreak } = computeStreaks(currentActivities);
  const streakPoints = Math.round(Math.min(currentStreak, 7) / 7 * 10 * 100) / 100;

  const total = Math.min(100, Math.round(goalAdherence + consistency + reduction + sustainableChoices + streakPoints));
  const label = ECO_SCORE_LABELS.find((l) => total >= l.min) || ECO_SCORE_LABELS[ECO_SCORE_LABELS.length - 1];

  return {
    score: total,
    label: label.label,
    emoji: label.emoji,
    components: {
      goalAdherence: round2(goalAdherence),
      consistency: round2(consistency),
      reduction: round2(reduction),
      sustainableChoices: round2(sustainableChoices),
      streak: round2(streakPoints),
    },
    isEstimate: true,
  };
};

const computeForecast = ({ recentActivities, currentWeekTotal, goal }) => {
  const now = new Date();
  const last14Start = shiftDays(now, -13);
  last14Start.setHours(0, 0, 0, 0);

  const last14 = recentActivities.filter((a) => new Date(a.createdAt) >= last14Start);
  const dailyTotals = {};
  for (const a of last14) {
    const k = dateKey(new Date(a.createdAt));
    dailyTotals[k] = round2((dailyTotals[k] || 0) + toFinite(a.carbonFootprint));
  }
  const distinctDays = Object.keys(dailyTotals).length;
  const avgDaily = distinctDays > 0 ? safeSum(Object.values(dailyTotals)) / distinctDays : 0;

  const goalValue = toFinite(goal) || 100;

  let forecast = round2(avgDaily * 7);
  if (distinctDays === 0) forecast = 0;

  const risk = forecast > goalValue ? "above" : forecast <= 0 ? "unknown" : "on-target";
  const margin = forecast > 0 ? round2(forecast - goalValue) : 0;

  return {
    currentWeekTotal: round2(currentWeekTotal),
    goal: goalValue,
    forecastNextWeek: forecast,
    avgDaily: round2(avgDaily),
    risk,
    margin: round2(margin),
    isEstimate: true,
  };
};

const computePersonalBest = ({ activities, weeklyTotals, challengesCompleted }) => {
  const weeks = weeklyTotals.length ? weeklyTotals : groupByWeek(activities);
  let lowestWeeklyCO2 = null;
  let lowestWeekKey = null;
  for (const w of weeks) {
    if (lowestWeeklyCO2 === null || w.totalCO2 < lowestWeeklyCO2) {
      lowestWeeklyCO2 = w.totalCO2;
      lowestWeekKey = w.weekStart;
    }
  }

  let biggestReduction = 0;
  let biggestReductionFrom = null;
  let biggestReductionTo = null;
  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks[i - 1].totalCO2;
    const curr = weeks[i].totalCO2;
    if (prev > 0 && curr < prev) {
      const drop = ((prev - curr) / prev) * 100;
      if (drop > biggestReduction) {
        biggestReduction = drop;
        biggestReductionFrom = weeks[i - 1].weekStart;
        biggestReductionTo = weeks[i].weekStart;
      }
    }
  }

  const { currentStreak, longestStreak } = computeStreaks(activities);
  return {
    lowestWeeklyCO2: lowestWeeklyCO2 === null ? null : round2(lowestWeeklyCO2),
    lowestWeekKey,
    biggestReduction: round2(biggestReduction),
    biggestReductionFrom,
    biggestReductionTo,
    currentStreak,
    longestStreak,
    challengesCompleted,
    totalActivities: activities.length,
  };
};

const computeCoach = ({ currentCategories, previousCategories, currentTotal, goal }) => {
  if (!currentCategories.length) {
    return { advice: "Log your first activity to get a personalized recommendation." };
  }

  const WASTE_LABELS = {
    landfilled: "landfilled",
    recycled: "recycled / composted",
  };

  const biggest = currentCategories[0];
  const share = currentTotal > 0 ? round2((biggest.totalCO2 / currentTotal) * 100) : 0;
  const label = CATEGORY_LABELS[biggest.category] || biggest.category;

  const prevBig = previousCategories.find((c) => c.category === biggest.category);
  const trend = prevBig ? round2(biggest.totalCO2 - prevBig.totalCO2) : null;

  let advice = "";
  let action = "";
  let potentialSaving = 0;

  if (biggest.category === "transport") {
    const carActs = biggest.sample || [];
    const carKm = carActs.filter((a) => a.data && a.data.mode === "car").reduce((s, a) => s + toFinite(a.data.distance), 0);
    potentialSaving = round2(carKm * (EMISSION_FACTORS.transport.car - EMISSION_FACTORS.transport.bus));
    advice = `Transport is your biggest source of estimated emissions (${share}% of this week). Switch your single-occupancy car trips to bus or train to cut roughly ${potentialSaving} kg of CO₂ this week.`;
    action = "Take public transport for one trip today";
  } else if (biggest.category === "electricity") {
    const totalUsage = biggest.totalCO2 / EMISSION_FACTORS.electricity;
    potentialSaving = round2(totalUsage * 0.1 * EMISSION_FACTORS.electricity);
    advice = `Electricity is your biggest source of estimated emissions (${share}%). Reducing your usage by just 10% would cut roughly ${potentialSaving} kg of CO₂ this week.`;
    action = "Unplug devices on standby for the evening";
  } else if (biggest.category === "diet") {
    const nonVeg = biggest.sample ? biggest.sample.filter((a) => a.data && a.data.dietType === "nonVegetarian").length : 0;
    potentialSaving = round2(nonVeg * (EMISSION_FACTORS.diet.nonVegetarian - EMISSION_FACTORS.diet.vegan));
    advice = `Diet is your biggest source of estimated emissions (${share}%). Choosing plant-based meals saves about ${potentialSaving || 2.5} kg of CO₂ per non-vegetarian meal replaced.`;
    action = "Add one fully plant-based meal today";
  } else if (biggest.category === "waste") {
    const wasteSamples = biggest.sample || [];
    const totalWasteKg = wasteSamples.reduce((s, a) => s + toFinite(a.data && a.data.weight), 0);
    const landfilledKg = wasteSamples
      .filter((a) => a.data && a.data.disposal === "landfilled")
      .reduce((s, a) => s + toFinite(a.data.weight), 0);
    potentialSaving = round2(landfilledKg * (EMISSION_FACTORS.waste.landfilled - EMISSION_FACTORS.waste.recycled));
    const landfillShare = totalWasteKg > 0 ? Math.round((landfilledKg / totalWasteKg) * 100) : 0;
    advice = `Waste is your biggest source of estimated emissions (${share}% of this week). ${landfillShare}% of the waste you logged was landfilled — recycling and composting it instead would cut roughly ${potentialSaving} kg of CO₂.`;
    action = "Separate recyclables and compost food scraps today";
  } else {
    advice = `Keep leaning into ${label.toLowerCase()} — it's your largest category this week (${share}%).`;
    action = "Log 2 activities today";
  }

  return {
    biggestCategory: biggest.category,
    biggestCategoryLabel: label,
    biggestTotal: round2(biggest.totalCO2),
    share,
    trend,
    advice,
    action,
    potentialSaving: round2(potentialSaving),
    goal,
  };
};

// Single source of truth for the effective weekly goal.
// Preference order: Goal doc (set via /api/goals) -> user.weeklyGoal -> default 100.
const resolveWeeklyGoal = (user, goalDoc) => {
  if (goalDoc && Number.isFinite(Number(goalDoc.weeklyGoal)) && Number(goalDoc.weeklyGoal) > 0) {
    return Number(goalDoc.weeklyGoal);
  }
  if (user && Number.isFinite(Number(user.weeklyGoal)) && Number(user.weeklyGoal) > 0) {
    return Number(user.weeklyGoal);
  }
  return 100;
};

module.exports = {
  EMISSION_FACTORS,
  CATEGORY_LABELS,
  round2,
  toFinite,
  safeSum,
  calculateActivityCarbon,
  isGreenActivity,
  startOfWeek,
  weekRange,
  dateKey,
  shiftDays,
  getCategoryTotals,
  groupByWeek,
  computeStreaks,
  computeEcoScore,
  computeForecast,
  computePersonalBest,
  computeCoach,
  resolveWeeklyGoal,
};