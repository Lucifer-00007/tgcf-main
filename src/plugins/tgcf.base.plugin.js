class TgcfBasePlugin {
  constructor(config, globalAppConfig) {
    if (this.constructor === TgcfBasePlugin) {
      throw new Error("Abstract classes can't be instantiated.");
    }
    this.config = config; // Plugin-specific configuration
    this.globalAppConfig = globalAppConfig; // Global application config
  }

  // Unique identifier for the plugin
  static get id() { throw new Error("Plugin must override static get id()"); }
  // Human-readable name
  static get name() { throw new Error("Plugin must override static get name()"); }
  // Description of what the plugin does
  static get description() { throw new Error("Plugin must override static get description()"); }
  // JSON schema for the plugin's configuration options
  static get configSchema() { return {}; } // Default to no schema

  // Optional async initialization
  async init() {}

  // Core message processing method
  // Returns modified TgcfMessage or null/undefined to drop message
  // Can be async or synchronous
  modify(tgcfMessage) {
    throw new Error("Plugin must implement modify(tgcfMessage)");
  }
}
module.exports = TgcfBasePlugin;
