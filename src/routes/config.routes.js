const express = require('express');
const configController = require('../controllers/config.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Protect all config routes
router.use(protect);

// Main configuration routes
router.get('/', configController.getMainConfig);
router.put('/', configController.updateMainConfig);

// Plugin related routes
router.get('/plugins', configController.listAvailablePlugins); // Lists all available plugins and their schemas
router.get('/plugins/settings', configController.getPluginConfigs); // Gets the saved settings for all plugins
router.put('/plugins/settings', configController.updatePluginConfigs); // Updates the saved settings for plugins

module.exports = router;
