const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);
// router.post('/register', authController.register); // Placeholder for now

module.exports = router;
