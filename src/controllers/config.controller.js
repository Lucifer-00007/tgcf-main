const configService = require('../services/config.service');

exports.getMainConfig = async (req, res, next) => {
  try {
    const config = await configService.getConfig();
    res.status(200).json(config);
  } catch (error) {
    console.error('Error getting main config:', error);
    res.status(500).json({ message: 'Failed to get configuration.', error: error.message });
  }
};

exports.updateMainConfig = async (req, res, next) => {
  try {
    const updatedConfig = await configService.updateConfig(req.body);
    res.status(200).json(updatedConfig);
  } catch (error) {
    console.error('Error updating main config:', error);
    res.status(500).json({ message: 'Failed to update configuration.', error: error.message });
  }
};

exports.getPluginConfigs = async (req, res, next) => {
  try {
    const pluginConfigs = await configService.getPluginConfigs();
    res.status(200).json(pluginConfigs);
  } catch (error) {
    console.error('Error getting plugin configs:', error);
    res.status(500).json({ message: 'Failed to get plugin configurations.', error: error.message });
  }
};

exports.updatePluginConfigs = async (req, res, next) => {
  try {
    const updatedPluginConfigs = await configService.updatePluginConfigs(req.body);
    res.status(200).json(updatedPluginConfigs);
  } catch (error) {
    console.error('Error updating plugin configs:', error);
    res.status(500).json({ message: 'Failed to update plugin configurations.', error: error.message });
  }
};

exports.listAvailablePlugins = async (req, res, next) => {
  try {
    const availablePlugins = await configService.getAvailablePluginsInfo();
    res.status(200).json(availablePlugins);
  } catch (error) {
    console.error('Error listing available plugins:', error);
    res.status(500).json({ message: 'Failed to list available plugins.', error: error.message });
  }
};
