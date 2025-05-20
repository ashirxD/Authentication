require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

console.log("Starting server...");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

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
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use("/uploads", (req, res, next) => {
  console.log("[Static] Accessing uploads:", req.originalUrl);
  next();
}, express.static(uploadDir));
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});
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
console.log("MONGODB_URI:", process.env.MONGODB_URI.replace(/:.*@/, ":****@"));
console.log("PORT:", process.env.PORT || 5000);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "**** (hidden)" : "undefined");
console.log("FRONTEND_URL:", process.env.FRONTEND_URL || "http://localhost:5173");

// MongoDB Connection
console.log("Connecting to MongoDB...");
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  family: 4,
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

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ["appointment_request", "appointment_accepted", "appointment_rejected"], required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "AppointmentRequest" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const Notification = mongoose.model("Notification", notificationSchema);

// Socket.IO Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  console.log("[Socket.IO] Authenticating:", { token: token?.slice(0, 20) + "...", timestamp: new Date().toISOString() });
  if (!token) {
    console.error("[Socket.IO] No token provided", { timestamp: new Date().toISOString() });
    return next(new Error("Authentication failed"));
  }
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (!user.id || !['patient', 'doctor'].includes(user.role)) {
      console.error("[Socket.IO] Invalid user data:", { id: user.id, role: user.role, timestamp: new Date().toISOString() });
      return next(new Error("Invalid user data"));
    }
    socket.userId = user.id;
    socket.role = user.role;
    console.log("[Socket.IO] Authenticated:", { userId: socket.userId, role: socket.role, timestamp: new Date().toISOString() });
    next();
  } catch (err) {
    console.error("[Socket.IO] Token verification failed:", err.message, { timestamp: new Date().toISOString() });
    return next(new Error("Authentication failed"));
  }
});

// Socket.IO Connection
io.on("connection", (socket) => {
  console.log("[Socket.IO] User connected:", { socketId: socket.id, userId: socket.userId, role: socket.role, timestamp: new Date().toISOString() });

  socket.join(socket.userId.toString());
  console.log("[Socket.IO] Joined room:", socket.userId, { timestamp: new Date().toISOString() });
  socket.emit("authenticated", { userId: socket.userId });

  socket.on("join", (userId) => {
    if (socket.userId === userId) {
      console.log("[Socket.IO] Reconfirmed join for room:", userId, { timestamp: new Date().toISOString() });
    } else {
      console.error("[Socket.IO] Join failed: ID mismatch", { requested: userId, actual: socket.userId, timestamp: new Date().toISOString() });
      socket.emit("error", "Join failed: Invalid user ID");
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket.IO] User disconnected:", { socketId: socket.id, userId: socket.userId, reason, timestamp: new Date().toISOString() });
  });

  socket.on("reconnect_attempt", () => {
    console.log("[Socket.IO] Reconnect attempt:", { socketId: socket.id, userId: socket.userId, timestamp: new Date().toISOString() });
  });

  socket.on("error", (err) => {
    console.error("[Socket.IO] Socket error:", { error: err, socketId: socket.id, userId: socket.userId, timestamp: new Date().toISOString() });
  });

  // Log all emissions
  socket.onAny((event, ...args) => {
    console.log("[Socket.IO] Event emitted:", { event, args, userId: socket.userId, timestamp: new Date().toISOString() });
  });
});

// Routes
try {
  const routes = require("./routes/index");
  app.use("/api", routes);

  // Notification routes
  const { authenticateToken } = require("./middleware/auth");
  app.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const notifications = await Notification.find({ userId: req.user.id })
        .populate("appointmentId", "patient date time reason")
        .sort({ createdAt: -1 });
      res.json(notifications);
    } catch (err) {
      console.error("[GET /api/notifications] Error:", err, { timestamp: new Date().toISOString() });
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const notification = await Notification.findById(req.params.id);
      if (!notification) return res.status(404).json({ message: "Notification not found" });
      if (notification.userId.toString() !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      notification.read = true;
      await notification.save();
      res.json(notification);
    } catch (err) {
      console.error("[PUT /api/notifications/:id/read] Error:", err, { timestamp: new Date().toISOString() });
      res.status(500).json({ message: "Server error" });
    }
  });

  console.log("Routes loaded successfully");
} catch (err) {
  console.error("Error loading routes:", err, { timestamp: new Date().toISOString() });
  process.exit(1);
}

// Catch-all for 404s
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.url}`);
  res.status(404).json({ message: "Route not found" });
});

// Make io and Notification model available to routes
app.set("io", io);
app.set("Notification", Notification);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[Server error]:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  res.status(500).json({ message: "Internal server error" });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});