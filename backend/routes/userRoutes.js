const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Get User Data Route
router.get('/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('name role');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ name: user.name, role: user.role });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;