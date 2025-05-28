const Config = require('../models/config.model');
const logger = require('../utils/logger');

const GLOBAL_CONFIG_ID = 'global_config_doc';

class ConfigService {
  async getConfig() {
    let config = await Config.findById(GLOBAL_CONFIG_ID);
    if (!config) {
      logger.info('No global config found, creating default.');
      const defaultConfig = new Config({ _id: GLOBAL_CONFIG_ID });
      config = await defaultConfig.save();
      logger.info('Default global config created.');
    }
    return config;
  }

  async updateConfig(newConfigData) {
    const currentConfig = await this.getConfig();
    return Config.findOneAndUpdate(
      { _id: GLOBAL_CONFIG_ID },
      { $set: newConfigData },
      { upsert: true, new: true, runValidators: true }
    );
  }

  async getPluginConfigs() {
    const config = await this.getConfig();
    return config.plugin_configs || {};
  }

  async updatePluginConfigs(newPluginConfigsData) {
    // This will replace the entire plugin_configs object.
    // For more granular updates (e.g., updating a single plugin's config),
    // a different method or logic would be needed (e.g., using dot notation in update).
    return Config.findOneAndUpdate(
      { _id: GLOBAL_CONFIG_ID },
      { $set: { plugin_configs: newPluginConfigsData } },
      { upsert: true, new: true, runValidators: true }
    );
  }

  async getAvailablePluginsInfo() {
    // Now delegates to PluginService
    const pluginService = require('./plugin.service'); // Dynamically require to avoid circular dependency if PluginService also uses ConfigService at module load time
    logger.debug('Fetching plugin definitions via PluginService.');
    const definitions = pluginService.getPluginDefinitions();
    // logger.debug({ count: definitions.length }, 'Plugin definitions fetched.'); // Can be too verbose
    return definitions;
  }
}

module.exports = new ConfigService();
