const mongoose = require('mongoose');

const telegramSessionSchema = new mongoose.Schema({
session_name: {
   type: String,
   required: true,
   unique: true,
 },
  api_id: {
    type: String,
    required: true,
  },
  api_hash: {
    type: String,
    required: true,
  },
  session_string: {
    type: String,
    required: false,
  },
  user_details: {
    user_id: String,
    is_bot: Boolean,
    username: String,
  },
  last_connected_at: Date,
}, { timestamps: true });

const TelegramSession = mongoose.model('TelegramSession', telegramSessionSchema);

module.exports = TelegramSession;
