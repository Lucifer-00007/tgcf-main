const express = require('express');
const tgcfController = require('../controllers/tgcf.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Protect all TGCF routes
router.use(protect);

router.post('/start', tgcfController.startTgcf);
router.post('/stop', tgcfController.stopTgcf);
router.get('/status', tgcfController.getTgcfStatus);

module.exports = router;
