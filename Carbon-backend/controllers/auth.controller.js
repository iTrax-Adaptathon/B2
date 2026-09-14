const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

// ==========================
// Password validation
// ==========================
const validatePassword = (password) => {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return passwordRegex.test(password);
};

// ==========================
// Generate 6-digit OTP
// ==========================
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ==========================
// Step 1: Send OTP
// ==========================
exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    let user = await User.findOne({ email });

    if (user) {
      user.otp = otp;
      user.otpExpiry = otpExpiry;
    } else {
      user = new User({
        email,
        otp,
        otpExpiry,
        isVerified: false
      });
    }

    await user.save();

    await sendEmail(
      email,
      "Your Carbon Tracker OTP",
      `Your OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.`
    );

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully"
    });

  } catch (err) {
    console.error("SEND OTP ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Error sending OTP",
      error: err.message
    });
  }
};

// ==========================
// Step 2: Verify OTP
// ==========================
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified"
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired"
      });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "OTP verification error",
      error: err.message
    });
  }
};

// ==========================
// Step 3: Register
// ==========================
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email first"
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify OTP first"
      });
    }

    if (user.password) {
      return res.status(400).json({
        success: false,
        message: "User already registered"
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and contain 1 uppercase, 1 lowercase and 1 special character"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.name = name;
    user.password = hashedPassword;
    await user.save();

    return res.status(201).json({
      success: true,
      message: "User registered successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Registration error",
      error: err.message
    });
  }
};

// ==========================
// Step 4: Login
// ==========================
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify OTP first"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Login error",
      error: err.message
    });
  }
};

// ==========================
// Step 5: Forgot Password OTP
// ==========================
exports.forgotPasswordOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendEmail(
      email,
      "Carbon Tracker - Password Reset OTP",
      `Your password reset OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.`
    );

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error sending password reset OTP",
      error: err.message
    });
  }
};

// ==========================
// Step 6: Verify Forgot OTP
// ==========================
exports.verifyForgotOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired"
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "OTP verification error",
      error: err.message
    });
  }
};

// ==========================
// Step 7: Reset Password
// ==========================
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and contain 1 uppercase, 1 lowercase and 1 special character"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Password reset error",
      error: err.message
    });
  }
};
