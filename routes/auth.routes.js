const express = require('express');
const { login, logout, changePassword, me } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

router.post('/login', authLimiter, login);
router.post('/logout', protect, logout);
router.post('/change-password', protect, changePassword);
router.get('/me', protect, me);

module.exports = router;
