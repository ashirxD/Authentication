const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const router = express.Router();

// NodeMailer Transporter Setup
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  logger: true, // Enable logging for debugging
  debug: true, // Show debug output
});

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Test Email Route
router.get('/test-email', async (req, res) => {
  try {
    console.log('Testing email with:', {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS ? '**** (hidden)' : 'undefined',
    });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: 'Test Email from NodeMailer',
      text: 'This is a test email to verify NodeMailer configuration.',
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('Test email sent:', info);
    res.json({ message: 'Test email sent successfully', info });
  } catch (err) {
    console.error('Test email error:', {
      message: err.message,
      code: err.code,
      response: err.response,
      responseCode: err.responseCode,
    });
    res.status(500).json({ message: 'Failed to send test email', error: err.message });
  }
});

// Signup Route
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    user = new User({
      email,
      password,
    });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Signin Route
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const payload = {
      user: {
        id: user.id,
        email: user.email,
      },
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, message: 'Signin successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent:', info);
    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Forgot password error:', {
      message: err.message,
      code: err.code,
      response: err.response,
      responseCode: err.responseCode,
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Reset Password Route
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', (req, res) => {
  res.send('Auth API root - working!');
});

module.exports = router;