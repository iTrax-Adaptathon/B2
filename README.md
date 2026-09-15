# 🌿 Carbon Footprint Tracker(adapted)
### Student Innovation: **Swadeshi for Atmanirbhar Bharat – Renewable & Sustainable Energy**

A full-stack MERN application that helps users track their daily carbon emissions, set reduction goals, and build sustainable habits — now with **EcoCoach**, a personalized AI assistant that analyzes your real footprint data and gives tailored eco-advice.

This project supports the vision of **Atmanirbhar Bharat** by promoting environmental awareness through technology.

---

## 🆕 What's New

| Feature | Description |
|---|---|
| 🤖 **EcoCoach — AI Chat Assistant** | Floating chat widget on every page. Powered by Groq (Llama OSS models), it reads your last 7 days of activity data and weekly goal to answer questions like *"How am I doing this week?"* with real numbers. |
| ♻️ **Waste activity category** | Log waste-related emissions alongside transport, electricity, and diet. |
| 💡 **Personalized Insights** (`/carbon-insights`) | Analytical breakdown of your emission patterns. |
| 🏅 **Challenges** | Eco-challenges to keep users engaged and consistent. |
| 📋 **Weekly Summary** | Aggregated weekly emission reports and goal progress. |

---

## ✨ Features

- 🔐 **User Authentication** — Register/Login with email, password reset
- 📝 **Activity Logging** — Transport, Electricity, Diet, and Waste with automatic CO₂ calculation
- 📊 **Dashboard** — Weekly/monthly carbon insights with charts (Bar + Area)
- 🎯 **Goals & Achievements** — Set weekly CO₂ targets, unlock badges
- 🏆 **Leaderboard** — Friendly ranking among eco-warriors
- 🌱 **Carbon Offsetting** — See equivalents (trees planted, etc.) and generate PDF offset reports
- 👤 **Profile Management** — Update info, upload profile picture
- 🤖 **EcoCoach AI Chat** — Context-aware assistant that knows your footprint
- 📱 **Responsive UI** — Tailwind CSS + Framer Motion animations

---

## 🛠️ Tech Stack

### Frontend
- **React 19** (Vite) — UI library
- **Tailwind CSS** — Styling
- **Framer Motion** — Animations
- **Recharts / Chart.js** — Data visualization
- **React Router DOM v7** — Client-side routing
- **React Icons** — Icon set
- **React Toastify** — Notifications
- **Axios** — HTTP client

### Backend
- **Node.js + Express 5** — REST API server
- **MongoDB + Mongoose** — Database (Atlas-compatible)
- **JWT (jsonwebtoken)** — Auth tokens
- **bcryptjs** — Password hashing
- **Multer** — Image uploads
- **Nodemailer** — OTP & transactional email
- **PDFKit** — PDF report generation
- **Axios** — Outbound API calls (Groq)

### AI
- **Groq Cloud API** — LLM inference (`openai/gpt-oss-120b`), OpenAI-compatible endpoint, free tier

---

## 📋 Requirements

Before installing, make sure you have:

| Requirement | Details |
|---|---|
| **Node.js** | v18 or newer (check: `node -v`) |
| **npm** | v9 or newer (comes with Node) |
| **MongoDB** | A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (or local MongoDB) |
| **Groq account** | Free API key from [console.groq.com/keys](https://console.groq.com/keys) — no credit card |
| **Gmail account** | (Optional) App password for OTP emails via Nodemailer |

---

## ⚙️ Environment Variables

### Backend — `Carbon-backend/.env`
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=your_long_random_secret
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your_gmail_app_password
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

### Frontend — `Carbon-frontend/.env`
```env
VITE_API_URL=http://localhost:5000
```

> ⚠️ **Never commit `.env` files.** Both are already covered by `.gitignore`. Get a Groq key free at console.groq.com/keys. For Gmail, enable 2FA and create an "App Password".

---

## 🚀 Installation & Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <repo-name>

# 2. Install backend dependencies
cd Carbon-backend
npm install

# 3. Create backend env file (see table above)
#    Windows:  copy .env.example .env      (or create .env manually)

# 4. Install frontend dependencies
cd ../Carbon-frontend
npm install

# 5. Create frontend env file
#    Add:  VITE_API_URL=http://localhost:5000

# 6. Start the backend (Terminal 1)
cd ../Carbon-backend
npm run dev
#    → wait for "Server running on port 5000" + "MongoDB Connected"

# 7. Start the frontend (Terminal 2)
cd ../Carbon-frontend
npm run dev
#    → open http://localhost:5173
```

**First run:** Register an account (an OTP is sent to your email), log in, and start logging activities. The green EcoCoach bubble appears bottom-right on every page once you're logged in.

---

## 🧠 Implementation Plan — How EcoCoach Works

```
┌──────────────────┐     POST /api/chat      ┌───────────────────────┐
│  ChatWidget.jsx  │ ──────────────────────► │  chat.controller.js   │
│  (floating UI)   │   Bearer JWT + history  │  (verifyToken)        │
└──────────────────┘                         └──────────┬────────────┘
                                                        │
                                          ┌─────────────▼─────────────┐
                                          │  buildChatContext.js      │
                                          │  • last 7 days Activity   │
                                          │  • current weekly Goal    │
                                          │  → compact data snapshot  │
                                          └─────────────┬─────────────┘
                                                        │
                                          ┌─────────────▼─────────────┐
                                          │  Groq /chat/completions   │
                                          │  system prompt + snapshot │
                                          │  + last 10 messages       │
                                          └───────────────────────────┘
```

1. **Frontend** — `ChatWidget.jsx` renders a floating action button + animated chat panel (framer-motion). Sends `POST /api/chat` with the JWT from `localStorage` and the last 10 messages.
2. **Auth** — `chat.routes.js` protects the endpoint with the existing `verifyToken` middleware.
3. **Context building** — `buildChatContext.js` queries the user's `Activity` docs (7-day window) and `Goal`, and formats totals per activity type, goal usage %, and recent items into a text snapshot.
4. **LLM call** — `chat.controller.js` sends a system prompt (EcoCoach persona + user snapshot) plus conversation history to Groq's OpenAI-compatible endpoint (`openai/gpt-oss-120b`).
5. **Response** — The reply is returned as `{ reply }` and displayed in the widget. Errors (rate limit, auth) produce friendly messages.

### Data models used
- `Activity` — `{ user, type: transport|electricity|diet|waste, data, carbonFootprint, createdAt }`
- `Goal` — `{ user, weeklyGoal }`

### API endpoints (chat module)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/chat` | JWT | Send chat history, receive AI reply |

---

## 📁 Folder Structure

```text
<repo-root>/
├── Carbon-frontend/
│   ├── src/
│   │   ├── assets/            # Images
│   │   ├── components/
│   │   │   ├── Auth/          # Login, Register, VerifyOtp, ResetPassword
│   │   │   ├── ChatWidget.jsx # 🤖 EcoCoach AI chat (NEW)
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Leaderboard.jsx
│   │   │   ├── Achievements.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── ActivityForm.jsx
│   │   │   └── GoalContext.jsx
│   │   ├── pages/             # Home, Goals, Offset, LearnMore, CarbonInsights
│   │   ├── App.jsx            # Routes + <ChatWidget /> mounted globally
│   │   └── main.jsx
│   └── .env                   # VITE_API_URL (git-ignored)
│
└── Carbon-backend/
    ├── config/                # DB connection
    ├── controllers/
    │   ├── chat.controller.js # 🤖 Groq integration (NEW)
    │   └── ...                # auth, activity, goal, tips, offset, insights, challenge, achievement
    ├── middleware/            # authMiddleware (JWT), upload
    ├── models/                # User, Activity, Goal, Tip, Achievement
    ├── routes/
    │   ├── chat.routes.js     # 🤖 /api/chat route (NEW)
    │   └── ...                # auth, activity, goal, tips, offset, insights, challenge, weeklySummary, user
    ├── utils/
    │   ├── buildChatContext.js# 🤖 Footprint snapshot for LLM (NEW)
    │   ├── sendEmail.js
    │   └── tipHelper.js
    ├── uploads/               # Profile pictures (git-ignored)
    └── server.js              # Registers all routes incl. /api/chat
```

---

## 🔧 Available Scripts

| Location | Command | Description |
|---|---|---|
| backend | `npm run dev` | Start with nodemon (auto-restart) |
| backend | `npm start` | Start production server |
| backend | `npm run seed` | Seed 8 weeks of realistic demo data (idempotent) — creates demo account `demo@carbon.com` / `Demo@1234` |
| backend | `npm run weekly-summary` | Send weekly summary emails (run manually or schedule via cron/Task Scheduler) |
| frontend | `npm run dev` | Vite dev server with HMR |
| frontend | `npm run build` | Production build |
| frontend | `npm run preview` | Preview the production build |

---

## 🛟 Troubleshooting

| Problem | Fix |
|---|---|
| `port 5000 in use` | An old server is still running — close stale terminals or kill the process, then retry. |
| Chat says "EcoCoach is unavailable" | Backend not running, or `GROQ_API_KEY` missing from `Carbon-backend/.env`. |
| Groq 404 on chat | Model retired — set `GROQ_MODEL` in `.env` to a current model (see console.groq.com/docs/models). |
| OTP email not arriving | Check `EMAIL_USER`/`EMAIL_PASS` (must be a Gmail **App Password**, not your normal password). |
| `MongoDB Connected` missing | Verify `MONGO_URI` and that your IP is whitelisted in MongoDB Atlas. |
| Want to explore without signing up | Run `npm run seed` in the backend, then log in with `demo@carbon.com` / `Demo@1234`. |

---

## 🔒 Security Notes

- All `.env` files are git-ignored — never commit API keys.
- `/api/chat` and all data endpoints require a valid JWT.
- Only aggregated footprint numbers (kg CO₂, goal %) are sent to the LLM — never raw account data.
- Rotate any API key that has been shared in plain text (chat, screenshots, etc.).

---

## 🤝 Contributing

1. Fork the repo and create a feature branch (`git checkout -b feature/my-feature`)
2. Commit your changes (`git commit -m "Add my feature"`)
3. Push to the branch (`git push origin feature/my-feature`) and open a Pull Request

---

## 📄 License

This project is licensed under the ISC License — see [LICENSE](LICENSE).

---

<p align="center">Made with ❤️ in India for a Sustainable Future 🌏</p>
