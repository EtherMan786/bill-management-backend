const express = require('express');
const { register, login, logout } = require('../controllers/authController');
const router = express.Router();
// Add GET /signup route
router.get('/signup', (req, res) => {
  res.json({ message: 'Signup GET endpoint is working!' });
});
router.post('/signup', register);
router.post('/login', login);
router.post('/logout', logout);
module.exports = router;
