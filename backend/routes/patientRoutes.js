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
    if (user.role !== "patient") {
      console.error("[GET /user] Access denied: Not a patient:", user.role);
      return res.status(403).json({ message: "Access denied: Not a patient" });
    }
    console.log("[GET /user] Fetched user:", {
      id: user._id,
      name: user.name,
      phoneNumber: user.phoneNumber,
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

    const { name, phoneNumber, twoFAEnabled } = req.body;
    console.log("[PUT /profile] Received:", {
      name,
      phoneNumber,
      twoFAEnabled,
      file: req.file ? req.file.filename : null,
    });

    if (!name || name.trim().length === 0) {
      console.error("[PUT /profile] Validation failed: Name required");
      return res.status(400).json({ message: "Name is required" });
    }

    // Validate phone number if provided
    if (phoneNumber && phoneNumber.trim()) {
      const phoneRegex = /^\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}$/;
      if (!phoneRegex.test(phoneNumber.trim())) {
        console.error("[PUT /profile] Validation failed: Invalid phone number format");
        return res.status(400).json({ message: "Invalid phone number format" });
      }
    }

    const updateData = {
      name: name.trim(),
      phoneNumber: phoneNumber ? phoneNumber.trim() : null,
      twoFAEnabled: twoFAEnabled === "true" || twoFAEnabled === true,
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
      phoneNumber: updatedUser.phoneNumber,
      profilePicture: updatedUser.profilePicture,
      twoFAEnabled: updatedUser.twoFAEnabled,
    });
    res.json(updatedUser);
  } catch (err) {
    console.error("[PUT /profile] Error:", {
      message: err.message,
      stack: err.stack,
    });
    if (err.code === 11000 && err.keyPattern.phoneNumber) {
      return res.status(400).json({ message: "Phone number is already in use" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Get all doctors
router.get("/doctors", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("[GET /doctors] Unauthorized: No user ID");
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }

    const doctors = await User.find({ role: "doctor" }).select(
      "name specialization profilePicture availability"
    );
    console.log("[GET /doctors] Fetched:", {
      count: doctors.length,
      ids: doctors.map((d) => d._id.toString()),
    });

    if (!doctors || doctors.length === 0) {
      console.warn("[GET /doctors] No doctors found");
      return res.status(404).json({ message: "No doctors found" });
    }

    res.json(doctors);
  } catch (err) {
    console.error("[GET /doctors] Error:", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: "Server error" });
  }
});

// Get specific doctor by ID
router.get("/doctors/:id", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("[GET /doctors/:id] Unauthorized: No user ID");
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }

    const doctorId = req.params.id;
    console.log("[GET /doctors/:id] Fetching doctor with ID:", doctorId);

    // Validate ObjectId format
    if (!doctorId.match(/^[0-9a-fA-F]{24}$/)) {
      console.error("[GET /doctors/:id] Invalid ObjectId format:", doctorId);
      return res.status(400).json({ message: "Invalid doctor ID format" });
    }

    const doctor = await User.findById(doctorId).select(
      "name specialization profilePicture availability role"
    );
    if (!doctor) {
      console.error("[GET /doctors/:id] Doctor not found for ID:", doctorId);
      return res.status(404).json({ message: "Doctor not found" });
    }
    if (doctor.role !== "doctor") {
      console.error("[GET /doctors/:id] Not a doctor:", {
        id: doctorId,
        role: doctor.role,
      });
      return res.status(404).json({ message: "Doctor not found" });
    }

    console.log("[GET /doctors/:id] Success:", {
      id: doctor._id,
      name: doctor.name,
    });
    res.json(doctor);
  } catch (err) {
    console.error("[GET /doctors/:id] Error:", {
      message: err.message,
      stack: err.stack,
    });
    if (err.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid doctor ID format" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Send appointment request
router.post("/appointment/request", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("[POST /appointment/request] Unauthorized: No user ID");
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }

    const { doctorId, date, time, reason } = req.body;
    console.log("[POST /appointment/request] Received:", {
      doctorId,
      date,
      time,
      reason,
      patientId: req.user.id,
    });

    if (!doctorId || !date || !time || !reason) {
      console.error("[POST /appointment/request] Validation failed: All fields required");
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!doctorId.match(/^[0-9a-fA-F]{24}$/)) {
      console.error("[POST /appointment/request] Invalid doctorId format:", doctorId);
      return res.status(400).json({ message: "Invalid doctor ID format" });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      console.error("[POST /appointment/request] Doctor not found:", doctorId);
      return res.status(404).json({ message: "Doctor not found" });
    }

    const appointmentRequest = new AppointmentRequest({
      patient: req.user.id,
      doctor: doctorId,
      date,
      time,
      reason,
      status: "pending",
    });

    const savedRequest = await appointmentRequest.save();
    console.log("[POST /appointment/request] Saved:", {
      id: savedRequest._id,
      doctorId,
      patientId: req.user.id,
      status: savedRequest.status,
    });
    res.json({ message: "Appointment request sent successfully", requestId: savedRequest._id });
  } catch (err) {
    console.error("[POST /appointment/request] Error:", {
      message: err.message,
      stack: err.stack,
    });
    if (err.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid doctor ID format" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Get all appointment requests for the patient with filters
router.get("/appointments", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("[GET /appointments] Unauthorized: No user ID");
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }

    const { time, status, doctorId } = req.query;
    console.log("[GET /appointments] Query params:", { time, status, doctorId });

    // Build query
    const query = { patient: req.user.id };

    // Time filter
    if (time) {
      let dateThreshold;
      const now = new Date();
      switch (time.toLowerCase()) {
        case "3days":
          dateThreshold = new Date(now.setDate(now.getDate() - 3));
          break;
        case "week":
          dateThreshold = new Date(now.setDate(now.getDate() - 7));
          break;
        case "15days":
          dateThreshold = new Date(now.setDate(now.getDate() - 15));
          break;
        case "month":
          dateThreshold = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          console.warn("[GET /appointments] Invalid time filter:", time);
          return res.status(400).json({ message: "Invalid time filter. Use: 3days, week, 15days, month" });
      }
      query.createdAt = { $gte: dateThreshold };
      console.log("[GET /appointments] Time filter applied:", { dateThreshold });
    }

    // Status filter
    if (status) {
      if (!["accepted", "rejected", "pending"].includes(status.toLowerCase())) {
        console.warn("[GET /appointments] Invalid status filter:", status);
        return res.status(400).json({ message: "Invalid status filter. Use: accepted, rejected, pending" });
      }
      query.status = status.toLowerCase();
      console.log("[GET /appointments] Status filter applied:", { status });
    }

    // Doctor filter
    if (doctorId) {
      if (!doctorId.match(/^[0-9a-fA-F]{24}$/)) {
        console.error("[GET /appointments] Invalid doctorId format:", doctorId);
        return res.status(400).json({ message: "Invalid doctor ID format" });
      }
      query.doctor = doctorId;
      console.log("[GET /appointments] Doctor filter applied:", { doctorId });
    }

    console.log("[GET /appointments] Query:", JSON.stringify(query, null, 2));

    const appointments = await AppointmentRequest.find(query)
      .populate("doctor", "name")
      .sort({ createdAt: -1 });

    console.log("[GET /appointments] Fetched:", {
      count: appointments.length,
      patientId: req.user.id,
      filters: { time, status, doctorId },
      appointments: appointments.map((a) => ({
        id: a._id,
        status: a.status,
        doctorId: a.doctor?._id,
        doctorName: a.doctor?.name,
        createdAt: a.createdAt,
      })),
    });

    res.json(appointments);
  } catch (err) {
    console.error("[GET /appointments] Error:", {
      message: err.message,
      stack: err.stack,
    });
    if (err.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid doctor ID format" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

router.post("test", (req, res) => {
  console.log("[POST /test] Received:", req.body);
  res.json({ message: "Test endpoint hit successfully" });
}); 

module.exports = router;