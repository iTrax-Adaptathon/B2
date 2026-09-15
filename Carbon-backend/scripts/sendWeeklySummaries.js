/**
 * Weekly summary email job.
 *
 * Sends a "your week in carbon" summary email to every user with activities
 * in the current (Monday-start) week. In dev mode, emails are logged to the
 * backend console instead of being sent (see utils/sendEmail.js).
 *
 * Usage:
 *   node scripts/sendWeeklySummaries.js           # send now
 *
 * To run every Monday at 8:00 AM (Windows Task Scheduler):
 *   schtasks /create /tn "CarbonWeeklySummary" /tr "cmd /c cd /d <backend-path> && node scripts/sendWeeklySummaries.js" /sc weekly /d MON /st 08:00
 *
 * On Linux cron:
 *   0 8 * * 1 cd <backend-path> && node scripts/sendWeeklySummaries.js
 */
require("dotenv").config();
const connectDB = require("../config/db");
const { sendWeeklySummariesToAll } = require("../services/weeklySummary.service");

(async () => {
  try {
    await connectDB();
    const results = await sendWeeklySummariesToAll();

    const sent = results.filter((r) => !r.skipped);
    const skipped = results.filter((r) => r.skipped);

    console.log(`Weekly summaries: ${sent.length} sent, ${skipped.length} skipped.`);
    sent.forEach((r) => console.log(`  ✓ ${r.email} (${r.total} kg CO2 this week)`));
    skipped.forEach((r) => console.log(`  - ${r.email}: skipped (${r.reason})`));

    process.exit(0);
  } catch (err) {
    console.error("WEEKLY SUMMARY JOB FAILED:", err);
    process.exit(1);
  }
})();
