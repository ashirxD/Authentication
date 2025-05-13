const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../Uploads");
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
  throw new Error("Cannot write to uploads directory");
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("Multer destination:", uploadDir);
    try {
      fs.accessSync(uploadDir, fs.constants.W_OK);
      cb(null, uploadDir);
    } catch (err) {
      console.error("Multer destination error:", err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname}`;
    console.log("Saving file to:", path.join(uploadDir, filename));
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
      return cb(new Error("Only images are allowed (.jpg, .jpeg, .png)"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).single("profilePicture");

// Middleware to handle Multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer error:", {
      message: err.message,
      code: err.code,
      field: err.field,
    });
    return res.status(400).json({ message: `Multer error: ${err.message}` });
  }
  if (err) {
    console.error("File upload error:", {
      message: err.message,
      stack: err.stack,
    });
    return res.status(400).json({ message: `File upload error: ${err.message}` });
  }
  next();
};

// Get user data
router.get("/user", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }
    const user = await User.findById(req.user.id).select("-password -otp -otpExpires");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied: Not a doctor" });
    }
    console.log("Fetched user data:", user);
    res.json(user);
  } catch (err) {
    console.error("Error in GET /user:", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put("/profile", upload, handleMulterError, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }

    const { name, specialization } = req.body;
    console.log("Received profile update:", {
      name,
      specialization,
      file: req.file ? req.file.originalname : "No file uploaded",
      body: req.body,
    });

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" });
    }

    const updateData = { name };
    if (specialization && specialization.trim().length > 0) {
      updateData.specialization = specialization;
    } else {
      updateData.specialization = null; // Align with schema default
    }

    if (req.file) {
      const filePath = path.join(uploadDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        updateData.profilePicture = `/Uploads/${req.file.filename}`;
        console.log("Profile picture updated:", updateData.profilePicture);
      } else {
        console.error("File not found after upload:", filePath);
        return res.status(500).json({ message: "Failed to save profile picture" });
      }
    } else {
      console.log("No profile picture provided in request");
    }

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -otp -otpExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied: Not a doctor" });
    }

    console.log("Profile update successful:", {
      userId: user._id,
      name: user.name,
      specialization: user.specialization,
      profilePicture: user.profilePicture,
    });
    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Error in PUT /profile:", {
      message: err.message,
      stack: err.stack,
      body: req.body,
      file: req.file,
      user: req.user,
    });
    res.status(500).json({ message: err.message || "Server error" });
  }
});

module.exports = router;