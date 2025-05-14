const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const AppointmentRequest = require("../models/AppointmentRequest");

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
    return res.status(400).json({ message: err.message });
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
    if (user.role !== "patient") {
      return res.status(403).json({ message: "Access denied: Not a patient" });
    }
    console.log("Fetched user data:", { id: user._id, name: user.name, twoFAEnabled: user.twoFAEnabled });
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

    const { name, twoFAEnabled } = req.body;
    console.log("Received profile update:", {
      name,
      twoFAEnabled,
      type: typeof twoFAEnabled,
    });

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!twoFAEnabled) {
      console.log("twoFAEnabled missing or empty");
      return res.status(400).json({ message: "twoFAEnabled is required" });
    }

    const updateData = { name };
    updateData.twoFAEnabled = twoFAEnabled === "true";
    console.log("Parsed updateData:", updateData);

    if (req.file) {
      updateData.profilePicture = `/Uploads/${req.file.filename}`;
      console.log("Profile picture updated:", updateData.profilePicture);
    }

    console.log("Before update - User:", await User.findById(req.user.id).select("twoFAEnabled"));
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -otp -otpExpires");
    console.log("After update - User:", await User.findById(req.user.id).select("twoFAEnabled"));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "patient") {
      return res.status(403).json({ message: "Access denied: Not a patient" });
    }

    console.log("Profile update successful:", {
      userId: user._id,
      name: user.name,
      twoFAEnabled: user.twoFAEnabled,
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

// Get all doctors with availability
router.get("/getdoctors", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }
    const doctors = await User.find({ role: "doctor" }).select(
      "name specialization profilePicture availability"
    );
    console.log("Fetched doctors:", doctors.map(d => ({
      id: d._id,
      name: d.name,
      availability: d.availability,
    })));
    res.json(doctors);
  } catch (err) {
    console.error("Error in GET /doctors:", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: "Server error" });
  }
});

// Submit appointment request
router.post("/appointment/request", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }

    const { doctorId, date, time, reason } = req.body;
    console.log("Received appointment request:", { doctorId, date, time, reason });

    if (!doctorId || !date || !time || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (reason.trim().length === 0) {
      return res.status(400).json({ message: "Reason cannot be empty" });
    }

    // Validate doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(400).json({ message: "Invalid doctor" });
    }

    // Validate time against doctor's availability
    if (doctor.availability && doctor.availability.startTime && doctor.availability.endTime) {
      const requestedTime = new Date(`1970-01-01T${time}:00`);
      const startTime = new Date(`1970-01-01T${doctor.availability.startTime}:00`);
      const endTime = new Date(`1970-01-01T${doctor.availability.endTime}:00`);
      if (isNaN(requestedTime.getTime()) || requestedTime < startTime || requestedTime >= endTime) {
        return res.status(400).json({
          message: `Requested time must be between ${doctor.availability.startTime} and ${doctor.availability.endTime}`,
        });
      }
    } else {
      return res.status(400).json({ message: "Doctor has not set availability" });
    }

    // Validate date (must be future date)
    const requestedDate = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day
    if (isNaN(requestedDate.getTime()) || requestedDate < now) {
      return res.status(400).json({ message: "Date must be in the future" });
    }

    // Create appointment request
    const appointmentRequest = new AppointmentRequest({
      patient: req.user.id,
      doctor: doctorId,
      date: requestedDate,
      time,
      reason,
    });

    await appointmentRequest.save();
    console.log("Appointment request created:", {
      id: appointmentRequest._id,
      patient: req.user.id,
      doctor: doctorId,
      date,
      time,
      reason,
    });

    res.status(201).json({ message: "Appointment request sent successfully" });
  } catch (err) {
    console.error("Error in POST /appointment/request:", {
      message: err.message,
      stack: err.stack,
      body: req.body,
    });
    res.status(500).json({ message: err.message || "Server error" });
  }
});

module.exports = router;