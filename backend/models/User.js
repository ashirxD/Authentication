const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    match: [/\S+@\S+\.\S+/],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
  },
  role: {
    type: String,
    required: true,
    enum: ["doctor", "patient"],
    default: "patient",
  },
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  isEmailVerified: { type: Boolean, default: false }, // New field
});

module.exports = mongoose.model("User", userSchema);
