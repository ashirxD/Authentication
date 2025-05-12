const express = require('express');

const emailRoutes = require('./emailRoutes');
const userRoutes = require('./userRoutes');
const AuthRoutes = require('./authRoutes');


const router = express.Router();

console.log('Mounting routes: auth, email, user');

router.use('/email', emailRoutes);
router.use('/user', userRoutes);
router.use('/auth', AuthRoutes);


router.get('/', (req, res) => {
  res.send('Auth API root - working!');
});

module.exports = router;