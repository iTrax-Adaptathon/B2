import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  getInsightsOverview,
  getHeatmap,
  simulateChange,
  getTodaysChallenges,
  acceptChallenge,
  completeChallenge,
} from "../services/phase2Api";
import {
  FaBrain,
  FaChartLine,
  FaCalendarCheck,
  FaChessKnight,
  FaFire,
  FaTrophy,
  FaLeaf,
  FaBolt,
  FaUtensils,
  FaCar,
  FaTrashAlt,
  FaCheckCircle,
  FaArrowLeft,
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const CATEGORY_STYLES = {
  transport: { label: "Transport", color: "text-blue-600", bg: "bg-blue-500" },
  electricity: { label: "Electricity", color: "text-amber-600", bg: "bg-amber-500" },
  diet: { label: "Diet", color: "text-green-600", bg: "bg-green-500" },
  waste: { label: "Waste", color: "text-purple-600", bg: "bg-purple-500" },
};

function EcoScoreCard({ ecoScore }) {
  if (!ecoScore) return null;
  const size = 150;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (ecoScore.score / 100) * circumference;

  const components = [
    { key: "goalAdherence", label: "Goal Adherence", max: 30 },
    { key: "consistency", label: "Consistency", max: 20 },
    { key: "reduction", label: "Reduction", max: 25 },
    { key: "sustainableChoices", label: "Sustainable Choices", max: 15 },
    { key: "streak", label: "Streak", max: 10 },
  ];

  return (
    <div className="h-full rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl shadow-emerald-100/30 border border-emerald-100 p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Eco Score</p>
      <div className="flex items-center justify-center mb-5">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#ecoGradient)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
            <defs>
              <linearGradient id="ecoGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-slate-800">{ecoScore.score}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">/ 100</span>
          </div>
        </div>
      </div>
      <div className="text-center mb-4">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-sm">
          {ecoScore.emoji} {ecoScore.label}
        </span>
      </div>
      <div className="space-y-2.5">
        {components.map((c) => {
          const pct = Math.min((ecoScore.components[c.key] / c.max) * 100, 100);
          return (
            <div key={c.key}>
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>{c.label}</span>
                <span className="font-semibold">
                  {ecoScore.components[c.key]} / {c.max}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 mt-4 italic">Gamification metric — not a scientific measurement.</p>
    </div>
  );
}

function ForecastCard({ forecast }) {
  if (!forecast) return null;
  const riskBadge =
    forecast.risk === "above"
      ? "bg-red-50 text-red-700 border-red-200"
      : forecast.risk === "on-target"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-slate-50 text-slate-600 border-slate-200";

  const riskText =
    forecast.risk === "above"
      ? "Slightly above target"
      : forecast.risk === "on-target"
      ? "On target"
      : "Log more to forecast";

  const pct = forecast.goal > 0 ? Math.min((forecast.forecastNextWeek / forecast.goal) * 100, 100) : 0;

  return (
    <div className="h-full rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl shadow-emerald-100/30 border border-emerald-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <FaChartLine className="text-white text-sm" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Carbon Forecast</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
          <p className="text-[11px] text-slate-500">This week</p>
          <p className="text-2xl font-bold text-slate-800">{forecast.currentWeekTotal} <span className="text-sm font-medium text-slate-400">kg</span></p>
        </div>
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4">
          <p className="text-[11px] text-slate-500">Forecast · next week</p>
          <p className="text-2xl font-bold text-indigo-700">{forecast.forecastNextWeek} <span className="text-sm font-medium text-indigo-400">kg</span></p>
        </div>
      </div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-slate-500">vs goal ({forecast.goal} kg)</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${riskBadge}`}>{riskText}</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${forecast.risk === "above" ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {forecast.risk === "above" && (
        <p className="text-xs text-slate-500 mt-3">
          Projected {forecast.margin} kg over goal — consider a lower-impact week.
        </p>
      )}
      <p className="text-[10px] text-slate-400 mt-3 italic">Estimate based on your recent logging, not a guarantee.</p>
    </div>
  );
}

function PersonalBestCard({ personalBest }) {
  if (!personalBest) return null;
  const stats = [
    { label: "Lowest Week", value: personalBest.lowestWeeklyCO2 !== null ? `${personalBest.lowestWeeklyCO2} kg` : "—", icon: "📉" },
    { label: "Best Reduction", value: personalBest.biggestReduction ? `${personalBest.biggestReduction}%` : "—", icon: "↘️" },
    { label: "Current Streak", value: `${personalBest.currentStreak} day${personalBest.currentStreak === 1 ? "" : "s"}`, icon: "🔥" },
    { label: "Longest Streak", value: `${personalBest.longestStreak} day${personalBest.longestStreak === 1 ? "" : "s"}`, icon: "🏅" },
    { label: "Challenges Won", value: personalBest.challengesCompleted, icon: "🎯" },
    { label: "Total Activities", value: personalBest.totalActivities, icon: "📝" },
  ];
  return (
    <div className="h-full rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl shadow-emerald-100/30 border border-emerald-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <FaTrophy className="text-white text-sm" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Personal Best</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span>{s.icon}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-3 italic">Compete with your previous self.</p>
    </div>
  );
}

function CoachCard({ coach }) {
  if (!coach || !coach.advice) return null;
  const style = CATEGORY_STYLES[coach.biggestCategory] || CATEGORY_STYLES.transport;
  const icons = { transport: <FaCar />, electricity: <FaBolt />, diet: <FaUtensils />, waste: <FaTrashAlt /> };
  return (
    <div className="h-full rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 shadow-xl shadow-emerald-200 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="coachPattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1.2" fill="white" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#coachPattern)" />
        </svg>
      </div>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <FaBrain className="text-white" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Carbon Coach</p>
          </div>
          {coach.biggestCategory && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-xs font-semibold">
              {icons[coach.biggestCategory]} Biggest: {style.label}
            </span>
          )}
        </div>
        <div className="flex items-end gap-2 mb-3">
          <p className="text-4xl font-bold">{coach.share}%</p>
          <p className="text-emerald-100 text-sm mb-1.5">of this week's emissions</p>
        </div>
        <p className="text-emerald-50 text-sm leading-relaxed mb-4">{coach.advice}</p>
        {coach.action && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 border border-white/20 px-4 py-3">
            <FaCheckCircle className="text-emerald-200 flex-shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-emerald-200">Next action</p>
              <p className="text-sm font-semibold">{coach.action}</p>
              {coach.potentialSaving > 0 && (
                <p className="text-xs text-emerald-100">~ saves {coach.potentialSaving} kg CO₂ this week</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SimulatorCard({ initialBaseline, initialProposed, mode, setMode }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scenario, setScenario] = useState("transport");
  const [customKm, setCustomKm] = useState(20);

  const scenarios = [
    { id: "transport", label: "💨 Car → Bus", desc: "Switch your car trips to the bus" },
    { id: "electricity", label: "⚡ Cut Electricity 10%", desc: "Reduce usage by one tenth" },
    { id: "diet", label: "🥗 Non-Veg → Vegan", desc: "Swap non-vegetarian meals" },
    { id: "waste", label: "♻️ Landfill → Recycle", desc: "Recycle waste instead of landfills" },
  ];

  const runSimulation = async () => {
    setLoading(true);
    try {
      let baseline = [];
      let proposed = [];

      if (scenario === "transport") {
        if (initialBaseline) baseline = initialBaseline;
        else baseline = [{ type: "transport", data: { mode: "car", distance: customKm } }];
        proposed = baseline.map((a) => ({ type: "transport", data: { mode: "bus", distance: a.data.distance } }));
      } else if (scenario === "electricity") {
        if (initialBaseline) baseline = initialBaseline;
        else baseline = [{ type: "electricity", data: { usage: 150 } }];
        proposed = baseline.map((a) => ({
          type: "electricity",
          data: { usage: Math.round((a.data.usage || 0) * 0.9 * 10) / 10 },
        }));
      } else if (scenario === "diet") {
        if (initialBaseline) baseline = initialBaseline;
        else baseline = [{ type: "diet", data: { dietType: "nonVegetarian" } }];
        proposed = baseline.map(() => ({ type: "diet", data: { dietType: "vegan" } }));
      } else {
        if (initialBaseline) baseline = initialBaseline;
        else baseline = [{ type: "waste", data: { disposal: "landfilled", weight: 2 } }];
        proposed = baseline.map(() => ({ type: "waste", data: { disposal: "recycled", weight: 2 } }));
      }

      const res = await simulateChange(baseline, proposed);
      setResult(res);
    } catch (err) {
      toast.error("Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl shadow-emerald-100/30 border border-emerald-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <FaChessKnight className="text-white text-sm" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">What-If Simulator</p>
      </div>
      <div className="space-y-2 mb-4">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => setScenario(s.id)}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all ${
              scenario === s.id
                ? "border-emerald-400 bg-emerald-50 shadow-sm"
                : "border-slate-200 bg-white hover:bg-emerald-50/50"
            }`}
          >
            <p className="text-sm font-semibold text-slate-800">{s.label}</p>
            <p className="text-[11px] text-slate-500">{s.desc}</p>
          </button>
        ))}
      </div>
      {scenario === "transport" && !initialBaseline && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-slate-500">Distance:</span>
          <input
            type="number"
            value={customKm}
            onChange={(e) => setCustomKm(e.target.value)}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-slate-800"
          />
          <span className="text-slate-400">km</span>
        </div>
      )}
      <button
        onClick={runSimulation}
        disabled={loading}
        className="w-full py-3 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
      >
        {loading ? "Simulating..." : "Run Simulation"}
      </button>
      {result && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Current estimate</span>
            <span className="font-bold text-slate-800">{result.baselineTotal} kg</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Hypothetical</span>
            <span className="font-bold text-emerald-700">{result.proposedTotal} kg</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
            <span className="text-slate-500">Net Save</span>
            <span className="font-bold text-cyan-700">{result.saving} kg ({result.percentChange}%)</span>
          </div>
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-3 italic">Uses the same emission factors as live logging.</p>
    </div>
  );
}

function HeatmapCard({ daysData }) {
  if (!daysData || !daysData.length) return null;
  const max = Math.max(...daysData.map((d) => d.totalCO2), 1);
  const level = (v) => {
    if (v <= 0) return { bg: "bg-slate-100", title: "No activity" };
    const ratio = v / max;
    if (ratio <= 0.25) return { bg: "bg-emerald-200", title: `${v} kg` };
    if (ratio <= 0.5) return { bg: "bg-emerald-400", title: `${v} kg` };
    if (ratio <= 0.75) return { bg: "bg-teal-500", title: `${v} kg` };
    return { bg: "bg-teal-700", title: `${v} kg` };
  };

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl shadow-emerald-100/30 border border-emerald-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <FaCalendarCheck className="text-white text-sm" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Carbon Heatmap</p>
          <p className="text-[10px] text-slate-400">Last {daysData.length} days · darker = higher impact</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {daysData.map((d) => {
          const cell = level(d.totalCO2);
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.totalCO2} kg (${d.count} activities)`}
              className={`w-5 h-5 rounded ${cell.bg} hover:ring-2 hover:ring-emerald-400 transition-all`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-slate-400">
        <span>Less</span>
        <div className="w-4 h-4 rounded bg-slate-100" />
        <div className="w-4 h-4 rounded bg-emerald-200" />
        <div className="w-4 h-4 rounded bg-emerald-400" />
        <div className="w-4 h-4 rounded bg-teal-500" />
        <div className="w-4 h-4 rounded bg-teal-700" />
        <span>More</span>
      </div>
    </div>
  );
}

function ChallengeCard({ challenges, ecoPoints, onRefresh }) {
  const [busy, setBusy] = useState(null);

  const act = async (fn, id, label) => {
    setBusy(id);
    try {
      await fn(id);
      toast.success(label);
      onRefresh();
    } catch (err) {
      toast.error("Action failed");
    } finally {
      setBusy(null);
    }
  };

  if (!challenges || !challenges.length) return null;

  return (
    <div className="h-full rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl shadow-emerald-100/30 border border-emerald-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
            <FaFire className="text-white text-sm" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Challenges</p>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
          🌟 {ecoPoints} pts
        </span>
      </div>
      <div className="space-y-3">
        {challenges.map((c) => (
          <div key={c._id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{c.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">+{c.points}</span>
            </div>
            <div className="mt-3 flex justify-end">
              {c.status === "completed" ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <FaCheckCircle /> Completed
                </span>
              ) : c.status === "accepted" ? (
                <button
                  onClick={() => act(completeChallenge, c._id, "Challenge completed! 🎉")}
                  disabled={busy === c._id}
                  className="px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  Mark Complete
                </button>
              ) : (
                <button
                  onClick={() => act(acceptChallenge, c._id, "Challenge accepted!")}
                  disabled={busy === c._id}
                  className="px-4 py-1.5 rounded-full border border-emerald-500 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 disabled:opacity-50"
                >
                  Accept
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CarbonInsights() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [challengeData, setChallengeData] = useState(null);
  const [carTrips, setCarTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      const [ov, hm, ch] = await Promise.all([
        getInsightsOverview(),
        getHeatmap(90),
        getTodaysChallenges(),
      ]);
      setOverview(ov);
      setHeatmap(hm);
      setChallengeData(ch);

      const myActs = await axios.get(`${API_URL}/api/activities/my`, { headers: authHeaders() });
      const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
      setCarTrips(
        myActs.data
          .filter((a) => a.type === "transport" && a.data && a.data.mode === "car" && new Date(a.createdAt).getTime() >= weekAgo)
          .map((a) => ({ type: "transport", data: { mode: "car", distance: Number(a.data.distance) } }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30">
        <motion.div
          className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 relative overflow-hidden">
      <div className="fixed top-20 left-10 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-0 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 pt-10 pb-16 relative">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200 mb-5">
            <FaBrain className="text-white text-3xl" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-slate-800 mb-3">
            Your Carbon{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">
              Intelligence
            </span>
          </h1>
          <p className="text-slate-600 max-w-xl mx-auto">
            Predict your trend, find your biggest source, simulate changes, and turn actions into
            challenges and rewards.
          </p>
          {overview && (
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-emerald-100 shadow-sm">
              <FaLeaf className="text-emerald-600" />
              <span className="font-semibold text-slate-700">
                {overview.ecoPoints} eco points · {overview.totalActivities} activities this week
              </span>
            </div>
          )}
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="lg:col-span-1">
            <EcoScoreCard ecoScore={overview && overview.ecoScore} />
          </div>
          <ForecastCard forecast={overview && overview.forecast} />
          <PersonalBestCard personalBest={overview && overview.personalBest} />
          {overview && (
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl shadow-emerald-100/30 border border-emerald-100 p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Category Split</p>
              <div className="space-y-3">
                {overview.categories.length === 0 && (
                  <p className="text-sm text-slate-500">Log activities to see your split.</p>
                )}
                {overview.categories.map((c) => {
                  const st = CATEGORY_STYLES[c.category] || { label: c.category, bg: "bg-slate-500", color: "text-slate-600" };
                  const pct = overview.currentTotal > 0 ? Math.round((c.totalCO2 / overview.currentTotal) * 100) : 0;
                  return (
                    <div key={c.category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={`font-semibold ${st.color}`}>{st.label}</span>
                        <span className="text-slate-500">{c.totalCO2} kg · {pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${st.bg}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <CoachCard coach={overview && overview.coach} />
          <SimulatorCard initialBaseline={carTrips.length ? carTrips : null} />
          <ChallengeCard
            challenges={challengeData && challengeData.challenges}
            ecoPoints={challengeData ? challengeData.ecoPoints : 0}
            onRefresh={loadAll}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <HeatmapCard daysData={heatmap} />
        </motion.div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-6 py-3 text-base font-medium text-slate-700 shadow-sm hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-200"
          >
            <FaArrowLeft /> Back to Dashboard
          </button>
          <button
            onClick={() => navigate("/achievements")}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 font-semibold shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            View Achievements
          </button>
        </div>
      </div>
    </div>
  );
}

export default CarbonInsights;