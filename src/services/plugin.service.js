const fs = require('fs');
const path = require('path');
const configService = require('./config.service'); // Assuming this is already set up to provide global and plugin configs
const TgcfBasePlugin = require('../plugins/tgcf.base.plugin'); // To check instanceof, though not strictly needed for logic
const logger = require('../utils/logger');

const PLUGINS_DIR = path.join(__dirname, '../plugins');

class PluginService {
  constructor() {
    this.loadedPlugins = [];
    this.pluginDefinitions = []; // Cache for plugin definitions
    logger.info('PluginService initialized');
  }

  async loadPlugins() {
    this.loadedPlugins = [];
    logger.info('Loading plugins...');

    const pluginConfigs = await configService.getPluginConfigs() || {};
    const globalAppConfig = await configService.getConfig(); // Full app config

    try {
      const files = fs.readdirSync(PLUGINS_DIR);
      for (const file of files) {
        if (file.endsWith('.plugin.js') && file !== 'tgcf.base.plugin.js') {
          const pluginPath = path.join(PLUGINS_DIR, file);
          try {
            const PluginClass = require(pluginPath);

            if (!PluginClass || !PluginClass.id || typeof PluginClass.id !== 'string') {
              logger.warn(`Plugin file ${file} does not export a class with a static string id. Skipping.`);
              continue;
            }
            
            const pluginId = PluginClass.id;
            const specificPluginConfig = pluginConfigs[pluginId] || {};

            if (specificPluginConfig.enabled === true) {
              logger.info(`Loading plugin: ${pluginId} from ${file}`);
              const pluginInstance = new PluginClass(specificPluginConfig, globalAppConfig);
              
              if (typeof pluginInstance.init === 'function') {
                await pluginInstance.init();
                logger.info(`Plugin ${pluginId} initialized.`);
              }
              this.loadedPlugins.push(pluginInstance);
            } else {
              logger.info(`Plugin ${pluginId} from ${file} is not enabled. Skipping.`);
            }
          } catch (error) {
            logger.error({ error, file }, `Error loading plugin from ${file}`);
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error reading plugins directory');
      // If plugins directory doesn't exist, create it
      if (error.code === 'ENOENT') {
        try {
          fs.mkdirSync(PLUGINS_DIR, { recursive: true });
          logger.info('Created plugins directory as it did not exist.');
        } catch (mkdirError) {
          logger.error({ mkdirError }, 'Failed to create plugins directory');
        }
      }
    }

    // TODO: Implement ordering if defined in config
    logger.info(`Loaded ${this.loadedPlugins.length} plugins: ${this.loadedPlugins.map(p => p.constructor.id).join(', ')}`);
  }

  async applyPlugins(tgcfMessage) {
    if (!tgcfMessage || typeof tgcfMessage !== 'object') {
        logger.error({ tgcfMessage }, 'Invalid tgcfMessage passed to applyPlugins');
        return null; 
    }
    // Deep copy: JSON.parse(JSON.stringify(obj)) is simple but has limitations (e.g., loses functions, Date objects become strings).
    // For TgcfMessage, which might contain client instances or functions (like file.download), a more robust deep copy is needed if modifications are complex.
    // For now, let's assume plugins modify properties directly or we manage a shallow copy carefully.
    // A common pattern is to pass the message and let plugins modify it, or return a new object if they make changes.
    // Let's proceed with modifying the passed object, and plugins should be mindful.
    // If a true deep copy is needed: look into libraries like lodash.cloneDeep or implement a custom one.
    
    // Let's make a shallow copy of the top-level properties for safety, especially for _drop and text.
    // Deeper properties like `file` or `custom_data` would still be by reference if they are objects.
    let currentTgcfMessage = { ...tgcfMessage };
    currentTgcfMessage.custom_data = { ... (tgcfMessage.custom_data || {}) }; // Ensure custom_data is an object
    if (tgcfMessage.file) {
        currentTgcfMessage.file = { ...tgcfMessage.file };
    }


    for (const plugin of this.loadedPlugins) {
      try {
        const modifiedMessage = await plugin.modify(currentTgcfMessage);
        
        if (modifiedMessage === null || modifiedMessage === undefined || currentTgcfMessage._drop === true) {
          logger.info({ pluginId: plugin.constructor.id, messageId: currentTgcfMessage.message_id }, `Plugin dropped message`);
          return null; // Stop processing and drop message
        }
        currentTgcfMessage = modifiedMessage; // Update message for the next plugin
      } catch (error) {
        logger.error({ error, pluginId: plugin.constructor.id, messageId: currentTgcfMessage.message_id }, `Error applying plugin`);
        // Decide if errors should drop the message or continue. For now, continue with original (or last modified).
      }
    }
    return currentTgcfMessage;
  }

  getPluginDefinitions() {
    if (this.pluginDefinitions.length > 0) {
        // Return cached definitions if available, assuming plugins don't change at runtime without a restart
        // For dynamic loading/unloading, this cache would need invalidation.
        // return this.pluginDefinitions; 
    }

    const definitions = [];
    try {
        const files = fs.readdirSync(PLUGINS_DIR);
        for (const file of files) {
            if (file.endsWith('.plugin.js') && file !== 'tgcf.base.plugin.js') {
                const pluginPath = path.join(PLUGINS_DIR, file);
                try {
                    const PluginClass = require(pluginPath);
                    if (PluginClass && PluginClass.id && PluginClass.name && PluginClass.description && PluginClass.configSchema) {
                        definitions.push({
                            id: PluginClass.id,
                            name: PluginClass.name,
                            description: PluginClass.description,
                            configSchema: PluginClass.configSchema,
                        });
                    } else {
                        logger.warn(`Plugin file ${file} does not correctly export static properties (id, name, description, configSchema).`);
                    }
                } catch (error) {
                    logger.error({ error, file }, `Error reading plugin definition from ${file}`);
                }
            }
        }
    } catch (error) {
        logger.error({ error }, 'Error reading plugins directory for definitions');
         // If plugins directory doesn't exist, create it and return empty array
        if (error.code === 'ENOENT') {
            try {
                fs.mkdirSync(PLUGINS_DIR, { recursive: true });
                logger.info('Created plugins directory as it did not exist (for definitions).');
            } catch (mkdirError) {
                logger.error({ mkdirError }, 'Failed to create plugins directory');
            }
        }
    }
    this.pluginDefinitions = definitions; // Cache the definitions
    return definitions;
  }
}

module.exports = new PluginService();
