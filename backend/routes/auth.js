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
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  logger: true,
  debug: true,
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
      to: process.env.EMAIL_USER,
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

// Signup Route (Updated with Better Error Handling)
router.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    // Validate inputs
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!['doctor', 'patient'].includes(role)) {
      return res.status(400).json({ message: 'Role must be either "doctor" or "patient"' });
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
      isEmailVerified: false,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Generate OTP for email verification
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP email
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
      console.error('Email sending error:', {
        message: emailErr.message,
        code: emailErr.code,
        response: emailErr.response,
      });
      return res.status(500).json({ message: 'Failed to send verification email', error: emailErr.message });
    }

    res.status(201).json({ message: 'User created. Please verify your email with the OTP sent.' });
  } catch (err) {
    console.error('Signup error:', {
      message: err.message,
      code: err.code,
      response: err.response,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Verify Email Route
router.post('/verify-email', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend OTP Route
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP email
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification OTP',
        text: `Your new OTP for email verification is: ${otp}. It is valid for 10 minutes.`,
      };
      const info = await transporter.sendMail(mailOptions);
      console.log('Resend OTP email sent:', info);
    } catch (emailErr) {
      console.error('Resend OTP email error:', {
        message: emailErr.message,
        code: emailErr.code,
        response: emailErr.response,
      });
      return res.status(500).json({ message: 'Failed to send OTP email', error: emailErr.message });
    }

    res.json({ message: 'A new OTP has been sent to your email' });
  } catch (err) {
    console.error('Resend OTP error:', err);
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

    // Check if email is verified
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
      { user: { id: user.id, email: user.email, role: user.role } },
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

// Verify OTP Route
router.post('/verify-otp', async (req, res) => {
  const { email, otp, pendingToken } = req.body;
  try {
    let decoded;
    try {
      decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired session' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const payload = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ token, role: user.role, message: 'Signin successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get User Data Route
router.get('/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.user.id).select('name role');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ name: user.name, role: user.role });
  } catch (err) {
    console.error('Get user error:', err);
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
    const otpExpires = Date.now() + 10 * 60 * 1000;
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
    };
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('OTP email sent:', info);
    } catch (emailErr) {
      console.error('Forgot password OTP email error:', {
        message: emailErr.message,
        code: emailErr.code,
        response: emailErr.response,
      });
      return res.status(500).json({ message: 'Failed to send OTP email', error: emailErr.message });
    }
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


// const express = require('express');
// const bcrypt = require('bcryptjs');
// const User = require('../models/User');
// const jwt = require('jsonwebtoken');
// const nodemailer = require('nodemailer');
// const { google } = require('googleapis');

// const router = express.Router();

// // OAuth2 Client Setup for Gmail
// const oauth2Client = new google.auth.OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   'https://developers.google.com/oauthplayground' // Redirect URI
// );

// oauth2Client.setCredentials({
//   refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
// });

// // NodeMailer Transporter Setup with OAuth2
// const createTransporter = async () => {
//   try {
//     const accessToken = await new Promise((resolve, reject) => {
//       oauth2Client.getAccessToken((err, token) => {
//         if (err) reject(err);
//         resolve(token);
//       });
//     });

//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         type: 'OAuth2',
//         user: process.env.EMAIL_USER,
//         clientId: process.env.GOOGLE_CLIENT_ID,
//         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//         refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
//         accessToken,
//       },
//       logger: true,
//       debug: true,
//     });

//     // Verify transporter configuration
//     await transporter.verify();
//     console.log('SMTP server is ready to take messages');
//     return transporter;
//   } catch (err) {
//     console.error('Transporter verification failed:', {
//       message: err.message,
//       code: err.code,
//       response: err.response,
//     });
//     throw err;
//   }
// };

// // Generate 6-digit OTP
// const generateOTP = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// // Test Email Route
// router.get('/test-email', async (req, res) => {
//   try {
//     const transporter = await createTransporter();
//     const mailOptions = {
//       from: `"Your App" <${process.env.EMAIL_USER}>`,
//       to: process.env.EMAIL_USER,
//       subject: 'Test Email from NodeMailer',
//       text: 'This is a test email to verify NodeMailer configuration.',
//       html: '<p>This is a test email to verify NodeMailer configuration.</p>',
//     };
//     const info = await transporter.sendMail(mailOptions);
//     console.log('Test email sent:', {
//       messageId: info.messageId,
//       envelope: info.envelope,
//       accepted: info.accepted,
//       rejected: info.rejected,
//       response: info.response,
//     });
//     res.json({ message: 'Test email sent successfully', info });
//   } catch (err) {
//     console.error('Test email error:', {
//       message: err.message,
//       code: err.code,
//       response: err.response,
//       responseCode: err.responseCode,
//     });
//     res.status(500).json({ message: 'Failed to send test email', error: err.message });
//   }
// });

// // Signup Route
// router.post('/signup', async (req, res) => {
//   const { name, email, password, role } = req.body;
//   try {
//     // Validate inputs
//     if (!name || name.trim().length === 0) {
//       return res.status(400).json({ message: 'Name is required' });
//     }
//     if (!['doctor', 'patient'].includes(role)) {
//       return res.status(400).json({ message: 'Role must be either "doctor" or "patient"' });
//     }

//     let user = await User.findOne({ email });
//     if (user) {
//       return res.status(400).json({ message: 'User already exists' });
//     }

//     user = new User({
//       name,
//       email,
//       password,
//       role,
//       isEmailVerified: false,
//     });

//     const salt = await bcrypt.genSalt(10);
//     user.password = await bcrypt.hash(password, salt);

//     // Generate OTP for email verification
//     const otp = generateOTP();
//     const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
//     user.otp = otp;
//     user.otpExpires = otpExpires;
//     await user.save();

//     // Send OTP email
//     try {
//       const transporter = await createTransporter();
//       const mailOptions = {
//         from: `"Your App" <${process.env.EMAIL_USER}>`,
//         to: email,
//         subject: 'Email Verification OTP',
//         text: `Your OTP for email verification is: ${otp}. It is valid for 10 minutes.`,
//         html: `<p>Your OTP for email verification is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
//       };
//       const info = await transporter.sendMail(mailOptions);
//       console.log('OTP email sent:', {
//         messageId: info.messageId,
//         envelope: info.envelope,
//         accepted: info.accepted,
//         rejected: info.rejected,
//         response: info.response,
//       });
//     } catch (emailErr) {
//       console.error('Email sending error:', {
//         message: emailErr.message,
//         code: emailErr.code,
//         response: emailErr.response,
//         responseCode: emailErr.responseCode,
//       });
//       return res.status(500).json({ message: 'Failed to send verification email', error: emailErr.message });
//     }

//     res.status(201).json({ message: 'User created. Please verify your email with the OTP sent.' });
//   } catch (err) {
//     console.error('Signup error:', {
//       message: err.message,
//       code: err.code,
//       response: err.response,
//       stack: err.stack,
//     });
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// });

// // Verify Email Route
// router.post('/verify-email', async (req, res) => {
//   const { email, otp } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'User not found' });
//     }

//     if (user.isEmailVerified) {
//       return res.status(400).json({ message: 'Email is already verified' });
//     }

//     if (user.otp !== otp || user.otpExpires < Date.now()) {
//       return res.status(400).json({ message: 'Invalid or expired OTP' });
//     }

//     user.isEmailVerified = true;
//     user.otp = undefined;
//     user.otpExpires = undefined;
//     await user.save();

//     res.json({ message: 'Email verified successfully' });
//   } catch (err) {
//     console.error('Verify email error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Resend OTP Route
// router.post('/resend-otp', async (req, res) => {
//   const { email } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'User not found' });
//     }

//     if (user.isEmailVerified) {
//       return res.status(400).json({ message: 'Email is already verified' });
//     }

//     // Generate new OTP
//     const otp = generateOTP();
//     const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
//     user.otp = otp;
//     user.otpExpires = otpExpires;
//     await user.save();

//     // Send OTP email
//     try {
//       const transporter = await createTransporter();
//       const mailOptions = {
//         from: `"Your App" <${process.env.EMAIL_USER}>`,
//         to: email,
//         subject: 'Email Verification OTP',
//         text: `Your new OTP for email verification is: ${otp}. It is valid for 10 minutes.`,
//         html: `<p>Your new OTP for email verification is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
//       };
//       const info = await transporter.sendMail(mailOptions);
//       console.log('Resend OTP email sent:', {
//         messageId: info.messageId,
//         envelope: info.envelope,
//         accepted: info.accepted,
//         rejected: info.rejected,
//         response: info.response,
//       });
//     } catch (emailErr) {
//       console.error('Resend OTP email error:', {
//         message: emailErr.message,
//         code: emailErr.code,
//         response: emailErr.response,
//         responseCode: emailErr.responseCode,
//       });
//       return res.status(500).json({ message: 'Failed to send OTP email', error: emailErr.message });
//     }

//     res.json({ message: 'A new OTP has been sent to your email' });
//   } catch (err) {
//     console.error('Resend OTP error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Signin Route
// router.post('/signin', async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     // Check if email is verified
//     if (!user.isEmailVerified) {
//       return res.status(400).json({ message: 'Please verify your email before signing in' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     const otp = generateOTP();
//     const otpExpires = Date.now() + 10 * 60 * 1000;
//     user.otp = otp;
//     user.otpExpires = otpExpires;
//     await user.save();

//     const pendingToken = jwt.sign(
//       { user: { id: user.id, email: user.email, role: user.role } },
//       process.env.JWT_SECRET,
//       { expiresIn: '10m' }
//     );

//     try {
//       const transporter = await createTransporter();
//       const mailOptions = {
//         from: `"Your App" <${process.env.EMAIL_USER}>`,
//         to: email,
//         subject: '2FA OTP for Sign In',
//         text: `Your OTP for signing in is: ${otp}. It is valid for 10 minutes.`,
//         html: `<p>Your OTP for signing in is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
//       };
//       const info = await transporter.sendMail(mailOptions);
//       console.log('Signin OTP email sent:', {
//         messageId: info.messageId,
//         envelope: info.envelope,
//         accepted: info.accepted,
//         rejected: info.rejected,
//         response: info.response,
//       });
//     } catch (emailErr) {
//       console.error('Signin OTP email error:', {
//         message: emailErr.message,
//         code: emailErr.code,
//         response: emailErr.response,
//         responseCode: emailErr.responseCode,
//       });
//       return res.status(500).json({ message: 'Failed to send OTP email', error: emailErr.message });
//     }

//     res.json({ pendingToken, message: 'OTP sent to your email' });
//   } catch (err) {
//     console.error('Signin error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Verify OTP Route
// router.post('/verify-otp', async (req, res) => {
//   const { email, otp, pendingToken } = req.body;
//   try {
//     let decoded;
//     try {
//       decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
//     } catch (err) {
//       return res.status(400).json({ message: 'Invalid or expired session' });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'User not found' });
//     }

//     if (user.otp !== otp || user.otpExpires < Date.now()) {
//       return res.status(400).json({ message: 'Invalid or expired OTP' });
//     }

//     const payload = {
//       user: {
//         id: user.id,
//         email: user.email,
//         role: user.role,
//       },
//     };
//     const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

//     user.otp = undefined;
//     user.otpExpires = undefined;
//     await user.save();

//     res.json({ token, role: user.role, message: 'Signin successful' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Get User Data Route
// router.get('/user', async (req, res) => {
//   try {
//     const token = req.headers.authorization?.split(" ")[1];
//     if (!token) {
//       return res.status(401).json({ message: 'No token provided' });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.user.id).select('name role');

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     res.json({ name: user.name, role: user.role });
//   } catch (err) {
//     console.error('Get user error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Forgot Password Route
// router.post('/forgot-password', async (req, res) => {
//   const { email } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'User not found' });
//     }
//     const otp = generateOTP();
//     const otpExpires = Date.now() + 10 * 60 * 1000;
//     user.otp = otp;
//     user.otpExpires = otpExpires;
//     await user.save();
//     try {
//       const transporter = await createTransporter();
//       const mailOptions = {
//         from: `"Your App" <${process.env.EMAIL_USER}>`,
//         to: email,
//         subject: 'Password Reset OTP',
//         text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
//         html: `<p>Your OTP for password reset is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
//       };
//       const info = await transporter.sendMail(mailOptions);
//       console.log('Forgot password OTP email sent:', {
//         messageId: info.messageId,
//         envelope: info.envelope,
//         accepted: info.accepted,
//         rejected: info.rejected,
//         response: info.response,
//       });
//     } catch (emailErr) {
//       console.error('Forgot password OTP email error:', {
//         message: emailErr.message,
//         code: emailErr.code,
//         response: emailErr.response,
//         responseCode: emailErr.responseCode,
//       });
//       return res.status(500).json({ message: 'Failed to send OTP email', error: emailErr.message });
//     }
//     res.json({ message: 'OTP sent to your email' });
//   } catch (err) {
//     console.error('Forgot password error:', {
//       message: err.message,
//       code: err.code,
//       response: err.response,
//       responseCode: err.responseCode,
//     });
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// });

// // Reset Password Route
// router.post('/reset-password', async (req, res) => {
//   const { email, otp, newPassword } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'User not found' });
//     }
//     if (user.otp !== otp || user.otpExpires < Date.now()) {
//       return res.status(400).json({ message: 'Invalid or expired OTP' });
//     }
//     const salt = await bcrypt.genSalt(10);
//     user.password = await bcrypt.hash(newPassword, salt);
//     user.otp = undefined;
//     user.otpExpires = undefined;
//     await user.save();
//     res.json({ message: 'Password reset successful' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// router.get('/', (req, res) => {
//   res.send('Auth API root - working!');
// });

module.exports = router;