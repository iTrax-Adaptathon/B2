import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaLeaf } from "react-icons/fa";

function LearnMore() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden text-base md:text-lg">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-green-200/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-300/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <svg className="absolute top-40 right-20 w-24 h-24 text-emerald-200/30 rotate-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
        </svg>
        <svg className="absolute bottom-60 left-16 w-20 h-20 text-teal-200/25 -rotate-45" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
        </svg>
      </div>

      {/* Main */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-20 relative">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200 mb-5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <FaLeaf className="text-white text-3xl" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
            Learn More
          </h1>
          <p className="text-slate-600 text-base md:text-lg max-w-xl mx-auto mt-3 leading-relaxed">
            A quick guide to using CarbonTracker effectively.
          </p>
        </motion.div>

        <motion.div
          className="rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl shadow-emerald-100/30 border border-emerald-100 p-6 md:p-8 space-y-8"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {[
            {
              title: "1. Create an Account",
              body:
                "Click on Register to sign up with your email. Once registered, you can log in securely and begin tracking your footprint.",
            },
            {
              title: "2. Log Your Activities",
              body:
                "Head to the Log Activity page to enter details about your transportation, food habits, energy usage, and more. The system will calculate the CO₂ emissions for each.",
            },
            {
              title: "3. Monitor Your Dashboard",
              body:
                "On the Dashboard, view charts that track your emissions by category and over time. Get insights and suggestions based on your habits.",
            },
            {
              title: "4. Set Weekly Goals",
              body:
                "Use the Goals page to set your CO₂ reduction goals. Your weekly summary will help you track progress toward a more sustainable lifestyle.",
            },
            {
              title: "5. Earn Achievements",
              body:
                "Get rewarded for consistency and hitting targets! The Achievements section celebrates your journey with badges and milestones.",
            },
            {
              title: "6. Compete on the Leaderboard",
              body:
                "See how your efforts stack up against others on the Leaderboard. Friendly competition motivates sustainable change!",
            },
            {
              title: "7. Update Your Profile",
              body:
                "Manage your information and preferences from the Profile section. You can also change your password and upload a profile picture.",
            },
          ].map((item, idx) => (
            <motion.section
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 * idx }}
              className="rounded-2xl p-5 border border-slate-200 bg-gradient-to-br from-emerald-50/60 to-teal-50/60"
            >
              <h2 className="text-lg md:text-xl font-bold text-emerald-700">
                {item.title}
              </h2>
              <p className="mt-2 text-slate-700 leading-relaxed">
                {item.body}
              </p>
            </motion.section>
          ))}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/activity")}
              className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-7 py-3 text-sm md:text-base font-semibold text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 hover:-translate-y-0.5 transition-all duration-200"
            >
              Log Activity
            </button>
            <button
              onClick={() => navigate("/")}
              className="rounded-full border-2 border-emerald-600 px-7 py-3 text-sm md:text-base font-semibold text-emerald-700 hover:bg-emerald-50 hover:-translate-y-0.5 transition-all duration-200"
            >
              Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default LearnMore;
