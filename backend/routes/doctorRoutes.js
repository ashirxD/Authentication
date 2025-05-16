const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const AppointmentRequest = require("../models/AppointmentRequest");
const Appointment = require("../models/Appointment");

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../Uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("[init] Created uploads directory:", uploadDir);
} else {
  console.log("[init] Uploads directory exists:", uploadDir);
}

// Verify write permissions
try {
  fs.accessSync(uploadDir, fs.constants.W_OK);
  console.log("[init] Uploads directory is writable");
} catch (err) {
  console.error("[init] Uploads directory is not writable:", err);
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("[multer] Destination:", uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname}`;
    console.log("[multer] Saving file to:", path.join(uploadDir, filename));
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
    console.error("[multerError] Multer error:", {
      message: err.message,
      code: err.code,
      field: err.field,
    });
    return res.status(400).json({ message: `Multer error: ${err.message}` });
  }
  if (err) {
    console.error("[multerError] File upload error:", {
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
      console.error("[GET /user] Unauthorized: No user ID");
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }
    const user = await User.findById(req.user.id).select("-password -otp -otpExpires");
    if (!user) {
      console.error("[GET /user] User not found:", req.user.id);
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "doctor") {
      console.error("[GET /user] Access denied: Not a doctor:", user.role);
      return res.status(403).json({ message: "Access denied: Not a doctor" });
    }
    console.log("[GET /user] Fetched user:", {
      id: user._id,
      name: user.name,
      specialization: user.specialization,
      twoFAEnabled: user.twoFAEnabled,
    });
    res.json(user);
  } catch (err) {
    console.error("[GET /user] Error:", {
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
      console.error("[PUT /profile] Unauthorized: No user ID");
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }

    const { name, specialization, twoFAEnabled, startTime, endTime, days } = req.body;
    console.log("[PUT /profile] Received:", {
      name,
      specialization,
      twoFAEnabled,
      startTime,
      endTime,
      days,
      file: req.file ? req.file.filename : null,
    });

    if (!name || name.trim().length === 0) {
      console.error("[PUT /profile] Validation failed: Name required");
      return res.status(400).json({ message: "Name is required" });
    }

    const updateData = {
      name: name.trim(),
      specialization: specialization ? specialization.trim() : "",
      twoFAEnabled: twoFAEnabled === "true" || twoFAEnabled === true,
      availability: {
        startTime: startTime || "",
        endTime: endTime || "",
        days: days ? JSON.parse(days) : [],
      },
    };

    if (req.file) {
      updateData.profilePicture = `/Uploads/${req.file.filename}`;
      console.log("[PUT /profile] Updated profilePicture:", updateData.profilePicture);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      console.error("[PUT /profile] User not found:", req.user.id);
      return res.status(404).json({ message: "User not found" });
    }

    // If a new profile picture is uploaded, delete the old one
    if (req.file && user.profilePicture) {
      const oldPicturePath = path.join(__dirname, "..", user.profilePicture);
      try {
        if (fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath);
          console.log("[PUT /profile] Deleted old profile picture:", oldPicturePath);
        }
      } catch (err) {
        console.error("[PUT /profile] Error deleting old picture:", err);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -otp -otpExpires");

    if (!updatedUser) {
      console.error("[PUT /profile] Failed to update user:", req.user.id);
      return res.status(500).json({ message: "Failed to update profile" });
    }

    console.log("[PUT /profile] Profile updated:", {
      id: updatedUser._id,
      name: updatedUser.name,
      specialization: updatedUser.specialization,
      profilePicture: updatedUser.profilePicture,
      twoFAEnabled: updatedUser.twoFAEnabled,
      availability: updatedUser.availability,
    });
    res.json({ user: updatedUser });
  } catch (err) {
    console.error("[PUT /profile] Error:", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: "Server error" });
  }
});

// Get appointment requests
router.get("/appointment/requests", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("[GET /appointment/requests] Unauthorized: No user ID");
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }

    const requests = await AppointmentRequest.find({
      doctor: req.user.id,
      status: "pending",
    })
      .populate("patient", "name profilePicture") // Add profilePicture
      .sort({ date: 1, time: 1 });
    console.log("[GET /appointment/requests] Fetched:", requests.length);
    res.json(requests);
  } catch (err) {
    console.error("[GET /appointment/requests] Error:", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: "Server error" });
  }
});
// Get upcoming appointments
router.get("/appointments", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("[GET /appointments] Unauthorized: No user ID");
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }

    const appointments = await Appointment.find({ doctor: req.user.id })
      .populate("patient", "name phoneNumber email profilePicture")
      .sort({ date: 1, time: 1 });

    console.log("[GET /appointments] Populated patients:", appointments.map(appt => ({
      patientId: appt.patient?._id,
      name: appt.patient?.name,
      email: appt.patient?.email,
      phoneNumber: appt.patient?.phoneNumber,
      profilePicture: appt.patient?.profilePicture || "null"
    })));

    router.get("/test-populate", async (req, res) => {
  try {
    const user = await User.findById("682444381e1310be35f82875").select("name phoneNumber email profilePicture");
    console.log("[GET /test-populate] User:", {
      id: user?._id,
      name: user?.name,
      email: user?.email,
      phoneNumber: user?.phoneNumber,
      profilePicture: user?.profilePicture || "null"
    });
    res.json(user);
  } catch (err) {
    console.error("[GET /test-populate] Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

    res.json(appointments);
  } catch (err) {
    console.error("[GET /appointments] Error:", {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ message: "Server error" });
  }
});

// Accept appointment request
router.post("/appointment/accept", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("[POST /appointment/accept] Unauthorized: No user ID");
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }

    const { requestId } = req.body;
    console.log("[POST /appointment/accept] Received:", { requestId });

    if (!requestId) {
      console.error("[POST /appointment/accept] Validation failed: Request ID required");
      return res.status(400).json({ message: "Request ID is required" });
    }

    const request = await AppointmentRequest.findById(requestId);
    if (!request) {
      console.error("[POST /appointment/accept] Request not found:", requestId);
      return res.status(404).json({ message: "Appointment request not found" });
    }

    if (request.doctor.toString() !== req.user.id) {
      console.error("[POST /appointment/accept] Unauthorized: Not your request:", requestId);
      return res.status(403).json({ message: "Unauthorized: Not your request" });
    }

    if (request.status !== "pending") {
      console.error("[POST /appointment/accept] Invalid status:", request.status);
      return res.status(400).json({ message: "Request is not pending" });
    }

    // Check for time slot conflicts
    const existingAppointment = await Appointment.findOne({
      doctor: req.user.id,
      date: request.date,
      time: request.time,
    });
    if (existingAppointment) {
      console.error("[POST /appointment/accept] Time slot already booked:", {
        date: request.date,
        time: request.time,
      });
      return res.status(400).json({ message: "This time slot is already booked" });
    }

    const appointment = new Appointment({
      patient: request.patient,
      doctor: request.doctor,
      date: request.date,
      time: request.time,
      reason: request.reason,
    });

    await appointment.save();
    request.status = "accepted";
    await request.save();

    console.log("[POST /appointment/accept] Accepted:", {
      appointmentId: appointment._id,
      requestId,
    });
    res.json({ message: "Appointment request accepted successfully" });
  } catch (err) {
    console.error("[POST /appointment/accept] Error:", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: "Server error" });
  }
});

// Reject appointment request
router.post("/appointment/reject", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("[POST /appointment/reject] Unauthorized: No user ID");
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }

    const { requestId } = req.body;
    console.log("[POST /appointment/reject] Received:", { requestId });

    if (!requestId) {
      console.error("[POST /appointment/reject] Validation failed: Request ID required");
      return res.status(400).json({ message: "Request ID is required" });
    }

    const request = await AppointmentRequest.findById(requestId);
    if (!request) {
      console.error("[POST /appointment/reject] Request not found:", requestId);
      return res.status(404).json({ message: "Appointment request not found" });
    }

    if (request.doctor.toString() !== req.user.id) {
      console.error("[POST /appointment/reject] Unauthorized: Not your request:", requestId);
      return res.status(403).json({ message: "Unauthorized: Not your request" });
    }

    if (request.status !== "pending") {
      console.error("[POST /appointment/reject] Invalid status:", request.status);
      return res.status(400).json({ message: "Request is not pending" });
    }

    request.status = "rejected";
    await request.save();

    console.log("[POST /appointment/reject] Rejected:", { requestId });
    res.json({ message: "Appointment request rejected successfully" });
  } catch (err) {
    console.error("[POST /appointment/reject] Error:", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;