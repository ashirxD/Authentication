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
    cb(null, uploadDir);
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
  limits: { fileSize: 5 * 1024 * 1024 },
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
    console.log("Fetched user data:", {
      id: user._id,
      name: user.name,
      twoFAEnabled: user.twoFAEnabled,
      availability: user.availability,
    });
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

    const { name, specialization, twoFAEnabled, startTime, endTime, days } = req.body;
    console.log("Received profile update:", {
      name,
      specialization,
      twoFAEnabled,
      startTime,
      endTime,
      days,
      type: typeof twoFAEnabled,
    });

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (twoFAEnabled === undefined) {
      console.log("twoFAEnabled missing");
      return res.status(400).json({ message: "twoFAEnabled is required" });
    }

    // Validate availability times and days
    let parsedDays = [];
    if (days) {
      try {
        parsedDays = JSON.parse(days);
        if (!Array.isArray(parsedDays) || parsedDays.length === 0) {
          return res.status(400).json({ message: "At least one shift day is required" });
        }
        const validDays = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
        if (!parsedDays.every((day) => validDays.includes(day))) {
          return res.status(400).json({ message: "Invalid day names provided" });
        }
      } catch (err) {
        return res.status(400).json({ message: "Invalid days format" });
      }
    } else {
      return res.status(400).json({ message: "Shift days are required" });
    }

    if (!startTime || !endTime) {
      return res.status(400).json({ message: "Start and end times are required" });
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ message: "Invalid time format (use HH:mm)" });
    }

    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid time format" });
    }
    if (start >= end) {
      return res.status(400).json({ message: "Start time must be before end time" });
    }

    const updateData = { name };
    if (specialization && specialization.trim().length > 0) {
      updateData.specialization = specialization;
    } else {
      updateData.specialization = null;
    }
    updateData.twoFAEnabled = twoFAEnabled === "true";
    updateData.availability = { startTime, endTime, days: parsedDays };
    console.log("Updating availability:", updateData.availability);

    if (req.file) {
      const filePath = path.join(uploadDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        updateData.profilePicture = `/Uploads/${req.file.filename}`;
        console.log("Profile picture updated:", updateData.profilePicture);
      } else {
        console.error("File not found after upload:", filePath);
        return res.status(500).json({ message: "Failed to save profile picture" });
      }
    }

    console.log("Before update - User:", await User.findById(req.user.id).select("twoFAEnabled availability"));
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -otp -otpExpires");
    console.log("After update - User:", await User.findById(req.user.id).select("twoFAEnabled availability"));

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
      twoFAEnabled: user.twoFAEnabled,
      profilePicture: user.profilePicture,
      availability: user.availability,
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