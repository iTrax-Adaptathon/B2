import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaLeaf, FaPaperPlane, FaTimes, FaComments, FaSpinner } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

const GREETING = {
  role: "assistant",
  content:
    "Hi! I'm EcoCoach 🌱 Ask me anything about your carbon footprint — I can see your recent activities and weekly goal.",
};

const SUGGESTED = [
  "How am I doing this week?",
  "Tips to cut transport emissions",
  "What should my weekly goal be?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const isLoggedIn = () => !!localStorage.getItem("token");

  const send = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: nextMessages.slice(-10) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "EcoCoach is unavailable right now.");

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err.message || "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* Floating action button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => (isLoggedIn() ? setOpen(true) : alert("Please log in to chat with EcoCoach 🌱"))}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
                       bg-gradient-to-br from-emerald-500 to-teal-600
                       text-white shadow-lg shadow-emerald-500/40
                       flex items-center justify-center cursor-pointer"
            aria-label="Open EcoCoach chat"
          >
            <FaComments className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm
                       bg-white rounded-2xl shadow-2xl shadow-emerald-900/20
                       flex flex-col overflow-hidden border border-emerald-100"
            style={{ height: "min(560px, 80vh)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3
                            bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <FaLeaf className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">EcoCoach</p>
                  <p className="text-xs text-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                    AI carbon assistant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="Close chat"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-emerald-50/50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-emerald-600 text-white rounded-br-md"
                        : "bg-white text-slate-700 border border-emerald-100 rounded-bl-md shadow-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-emerald-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <FaSpinner className="w-4 h-4 text-emerald-600 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Suggested prompts (only before first user message) */}
            {messages.length === 1 && !loading && (
              <div className="px-4 pt-2 pb-1 flex flex-wrap gap-2 bg-emerald-50/50">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white border border-emerald-200
                               text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 p-3 bg-white border-t border-emerald-100">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask EcoCoach..."
                className="flex-1 px-4 py-2.5 text-sm rounded-full bg-emerald-50
                           border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400
                           placeholder:text-slate-400"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-full bg-emerald-600 text-white
                           flex items-center justify-center
                           disabled:opacity-40 disabled:cursor-not-allowed
                           hover:bg-emerald-700 transition-colors cursor-pointer"
                aria-label="Send message"
              >
                <FaPaperPlane className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
