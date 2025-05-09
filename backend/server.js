require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' }));

// Verify environment variables
if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('Error: JWT_SECRET is not defined in .env');
  process.exit(1);
}
if (!process.env.EMAIL_USER) {
  console.error('Error: EMAIL_USER is not defined in .env');
  process.exit(1);
}
if (!process.env.EMAIL_PASS) {
  console.error('Error: EMAIL_PASS is not defined in .env');
  process.exit(1);
}
console.log('Environment variables loaded:');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('PORT:', process.env.PORT || 5000);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '**** (hidden)' : 'undefined');

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  family: 4, // Force IPv4
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch(err => {
  console.error('MongoDB connection error:', {
    message: err.message,
    code: err.code,
    stack: err.stack,
  });
  process.exit(1);
});

// Routes
app.use('/api', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({ message: 'Internal server error' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});