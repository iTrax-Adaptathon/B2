const mongoose = require("mongoose");

const challengeItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ["transport", "electricity", "diet", "waste", "general"] },
  points: { type: Number, default: 10 },
  estimatedSaving: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "accepted", "completed"], default: "pending" },
  acceptedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
});

const challengeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    challenges: [challengeItemSchema],
  },
  { timestamps: true }
);

challengeSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Challenge", challengeSchema);