const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Carbon Tracker" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text,
    };

    if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes("demo")) {
      console.log("DEV OTP ->", to, ":", subject);
      console.log(text);
      try {
        const logPath = path.join(__dirname, "..", "dev-otp.log");
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${to} -> ${subject}\n${text}\n\n`);
      } catch (e) {
        console.error("Could not write dev-otp.log:", e.message);
      }
      return { response: "dev mode, OTP logged to console" };
    }

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent via SMTP:", info.response);
    return info;

  } catch (error) {
    console.error("Email sending failed:", error.message);
    throw error;
  }
};

module.exports = sendEmail;
