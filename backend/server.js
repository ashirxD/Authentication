// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// console.log('Starting server...');

// const app = express();

// // Middleware
// app.use(express.json());
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));
// console.log('Middleware configured');

// // Verify environment variables
// if (!process.env.MONGODB_URI) {
//   console.error('Error: MONGODB_URI is not defined in .env');
//   process.exit(1);
// }
// if (!process.env.JWT_SECRET) {
//   console.error('Error: JWT_SECRET is not defined in .env');
//   process.exit(1);
// }
// if (!process.env.EMAIL_USER) {
//   console.error('Error: EMAIL_USER is not defined in .env');
//   process.exit(1);
// }
// if (!process.env.EMAIL_PASS) {
//   console.error('Error: EMAIL_PASS is not defined in .env');
//   process.exit(1);
// }
// console.log('Environment variables loaded:');
// console.log('MONGODB_URI:', process.env.MONGODB_URI);
// console.log('PORT:', process.env.PORT || 5000);
// console.log('EMAIL_USER:', process.env.EMAIL_USER);
// console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '**** (hidden)' : 'undefined');
// console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:5173');

// // MongoDB Connection
// console.log('Connecting to MongoDB...');
// mongoose.connect(process.env.MONGODB_URI, {
//   serverSelectionTimeoutMS: 5000,
//   family: 4,
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// }).then(() => {
//   console.log('MongoDB connected successfully');
// }).catch(err => {
//   console.error('MongoDB connection error:', {
//     message: err.message,
//     code: err.code,
//     stack: err.stack,
//   });
//   process.exit(1);
// });

// // Routes
// try {
//   const routes = require('./routes/index'); // Fixed: Correct path
//   app.use('/api', routes);
//   console.log('Routes loaded successfully');
// } catch (err) {
//   console.error('Error loading routes:', err);
//   process.exit(1);
// }

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error('Server error:', {
//     message: err.message,
//     stack: err.stack,
//     path: req.path,
//     method: req.method,
//   });
//   res.status(500).json({ message: 'Internal server error' });
// });

// // Start Server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
//   console.log(`API available at http://localhost:${PORT}/api`);
// });

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
console.log("Starting server...");

const app = express();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "Uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created uploads directory:", uploadDir);
} else {
  console.log("Uploads directory exists:", uploadDir);
}

// Verify write permissions
try {
  fs.accessSync(uploadDir, fs.constants.W_OK);
  console.log("Uploads directory is writable");
} catch (err) {
  console.error("Uploads directory is not writable:", err);
}

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use("/uploads", (req, res, next) => {
  console.log("Accessing uploads:", req.originalUrl);
  next();
}, express.static(uploadDir));
console.log("Serving static files from:", uploadDir);
console.log("Middleware configured");

// Verify environment variables
if (!process.env.MONGODB_URI) {
  console.error("Error: MONGODB_URI is not defined in .env");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("Error: JWT_SECRET is not defined in .env");
  process.exit(1);
}
if (!process.env.EMAIL_USER) {
  console.error("Error: EMAIL_USER is not defined in .env");
  process.exit(1);
}
if (!process.env.EMAIL_PASS) {
  console.error("Error: EMAIL_PASS is not defined in .env");
  process.exit(1);
}
console.log("Environment variables loaded:");
console.log("MONGODB_URI:", process.env.MONGODB_URI);
console.log("PORT:", process.env.PORT || 5000);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "**** (hidden)" : "undefined");
console.log("FRONTEND_URL:", process.env.FRONTEND_URL || "http://localhost:5173");

// MongoDB Connection
console.log("Connecting to MongoDB...");
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  family: 4,
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("MongoDB connected successfully");
}).catch(err => {
  console.error("MongoDB connection error:", {
    message: err.message,
    code: err.code,
    stack: err.stack,
  });
  process.exit(1);
});

// Routes
try {
  const routes = require("./routes/index");
  app.use("/api", routes);
  console.log("Routes loaded successfully");
} catch (err) {
  console.error("Error loading routes:", err);
  process.exit(1);
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({ message: "Internal server error" });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});