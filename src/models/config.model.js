const mongoose = require('mongoose');

const forwardSchema = new mongoose.Schema({
  con_name: { type: String, required: true }, // Connection name (e.g., specific Telegram session name)
  use_this: { type: Boolean, default: true }, // Whether this forward rule is active
  source: { type: mongoose.Schema.Types.Mixed, required: true }, // Chat ID or array of Chat IDs
  destinations: [{ type: mongoose.Schema.Types.Mixed, required: true }], // Array of Chat IDs
  offset: { type: String, default: null }, // Message ID offset for past mode
  end: { type: String, default: null }, // Message ID end for past mode
  // Note: 'owner' field from original design might be better handled at a higher level or via user-specific configs if needed later
});

const configSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'global_config_doc', // Known ID for the single global configuration document
  },
  forwards: [forwardSchema],
  show_forwarded_from: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    enum: ['live', 'past'],
    default: 'live',
  },
  live_settings: {
    sequential_updates: { type: Boolean, default: false },
    delete_sync: { type: Boolean, default: false }, // If true, deleting source message deletes destination message
    delete_on_edit: { type: String, enum: ['none', 'source', 'destination', 'both'], default: 'none' }, // Experimental
  },
  past_settings: {
    delay: { type: Number, default: 100 }, // Delay in ms between messages in past mode
  },
  plugin_configs: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  bot_messages: {
    start: { type: String, default: 'Hello! This is the TGCF bot.' },
    help: { type: String, default: 'Available commands: /start, /help, /status, etc.' },
  },
  admin_user_ids_telegram: [{ type: String }], // Array of Telegram User IDs who are admins
}, { timestamps: true });

// Ensure only one document can be created with the specific _id
configSchema.pre('save', async function (next) {
  if (this.isNew && this._id !== 'global_config_doc') {
    // Or if you want to enforce that no other doc ID can be used
    // this._id = 'global_config_doc'; 
    // However, the default in the schema should handle this for new documents.
  }
  // If you want to prevent more than one document existing AT ALL,
  // you might need a more complex check or rely on application logic.
  // For now, relying on the default _id and application logic to only fetch/update this one.
  next();
});


const Config = mongoose.model('Config', configSchema);

module.exports = Config;
