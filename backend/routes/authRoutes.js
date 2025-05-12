const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const transporter = require('../config/nodemailer');
const { generateOTP } = require('../utils/otpUtils');

const router = express.Router();

// Signup Route (unchanged)
router.post('/signup', async (req, res) => {
  const { name, email, password, role, specialization } = req.body;

  try {
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!['doctor', 'patient'].includes(role)) {
      return res.status(400).json({ message: 'Role must be either "doctor" or "patient"' });
    }
    if (role === 'doctor' && (!specialization || specialization.trim().length === 0)) {
      return res.status(400).json({ message: 'Specialization is required for doctors' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = new User({
      name,
      email,
      password,
      role,
      specialization: role === 'doctor' ? specialization : undefined,
      isEmailVerified: false,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification OTP',
        text: `Your OTP for email verification is: ${otp}. It is valid for 10 minutes.`,
      };
      const info = await transporter.sendMail(mailOptions);
      console.log('OTP email sent:', info);
    } catch (emailErr) {
      console.error('Email sending error:', emailErr);
      return res.status(500).json({ message: 'Failed to send verification email', error: emailErr.message });
    }

    res.status(201).json({ message: 'User created. Please verify your email with the OTP sent.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/test', async (req, res) => {

    console.log('test route hit');
    res.json({ message: 'Test route hit' });
});

// Signin Route (unchanged)
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
      return res.status(400).json({ message: 'Please verify your email before signing in' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const pendingToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '2FA OTP for Sign In',
      text: `Your OTP for signing in is: ${otp}. It is valid for 10 minutes.`,
    };
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('OTP email sent:', info);
    } catch (emailErr) {
      console.error('Signin OTP email error:', {
        message: emailErr.message,
        code: emailErr.code,
        response: emailErr.response,
      });
      return res.status(500).json({ message: 'Failed to send OTP email', error: emailErr.message });
    }

    res.json({ pendingToken, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP Route (updated)
router.post('/verify-otp', async (req, res) => {
  const { email, otp, pendingToken } = req.body;
  try {
    let decoded;
    try {
      decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired session' });
    }

    const userId = decoded.id;
    if (!userId) {
      return res.status(400).json({ message: 'Invalid pending token' });
    }

    const user = await User.findById(userId);
    if (!user || user.email !== email) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ token, role: user.role, message: 'Signin successful' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;