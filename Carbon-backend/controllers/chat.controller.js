/**
 * chat.controller.js
 * Eco-coach chat endpoint. Forwards the conversation to Groq's
 * OpenAI-compatible API and returns the assistant's reply.
 *
 * Env vars required (see .env.example):
 *   GROQ_API_KEY  - from https://console.groq.com/keys (free)
 *   GROQ_MODEL    - optional, defaults to "openai/gpt-oss-120b"
 */

const axios = require("axios");
const buildChatContext = require("../utils/buildChatContext");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `You are "EcoCoach", the friendly AI assistant inside a carbon-tracking web app used in India (units: kg CO2e, activities: transport / electricity / diet).

Rules:
- You receive a snapshot of the user's real footprint data below. Use it to give concrete, personalized advice.
- Keep answers short and actionable (2-5 sentences). Use a warm, encouraging tone. Occasionally use 1 emoji max.
- Prefer suggestions realistic for an Indian context (public transport, seasonal food, LED bulbs, etc.).
- If asked something unrelated to sustainability, politely steer back to eco topics.
- Never invent numbers: if the snapshot doesn't include a figure, say what the user could check in the app instead.`;

/**
 * POST /api/chat
 * Body: { messages: [{ role: "user" | "assistant", content: string }, ...] }
 * Auth: Bearer token (verifyToken) -> req.user.id
 */
exports.handleChat = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages array is required" });
    }

    // Keep only the last 10 messages to bound token usage, and sanitize roles.
    const history = messages
      .filter(
        (m) =>
          m &&
          typeof m.content === "string" &&
          ["user", "assistant"].includes(m.role)
      )
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    if (!history.length) {
      return res.status(400).json({ message: "No valid messages provided" });
    }

    // Personalize with the user's real data
    const context = await buildChatContext(req.user.id);

    const groqRes = await axios.post(
      GROQ_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT}\n\n--- USER SNAPSHOT ---\n${context}` },
          ...history,
        ],
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const reply = groqRes.data?.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(502).json({ message: "AI returned an empty response" });
    }

    res.json({ reply });
  } catch (err) {
    const status = err.response?.status;
    if (status === 429) {
      return res
        .status(429)
        .json({ message: "EcoCoach is a bit busy right now. Try again in a moment!" });
    }
    if (status === 401) {
      console.error("Groq auth failed - check GROQ_API_KEY");
      return res.status(502).json({ message: "AI service misconfigured" });
    }
    console.error("Chat error:", err.message);
    res.status(500).json({ message: "Failed to get a response from EcoCoach" });
  }
};
