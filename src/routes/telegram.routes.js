const express = require('express');
const telegramController = require('../controllers/telegram.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// All telegram routes are protected
router.use(protect);

router.post('/connect', telegramController.connect);
router.post('/submit-code', telegramController.submitCode);
router.post('/submit-password', telegramController.submitPassword);
router.get('/status', telegramController.getStatus);
router.post('/disconnect', telegramController.disconnect);
router.post('/send-message', telegramController.sendMessage); // Added send-message route

module.exports = router;
