// Conceptual ITgcfMessage structure:
// module.exports = {}; // Not strictly needed for a conceptual interface, but good for consistency

/**
 * @typedef {Object} ITgcfFile
 * @property {string} id - Telegram file ID.
 * @property {string} [path] - Local path if downloaded.
 * @property {string} type - e.g., 'photo', 'document', 'video'.
 * @property {string} [caption] - File caption.
 * @property {() => Promise<string>} [download] - Method to download file, returns local path.
 * @property {(newPath: string, newFileName?: string) => void} [update] - Method to set a new file to be uploaded.
 */

/**
 * @typedef {Object} ITgcfMessage
 * @property {string | null} text - Message text, can be modified by plugins.
 * @property {string | null} raw_text - Original message text before any modification.
 * @property {any} message_id - Original message ID from Telegram.
 * @property {any} chat_id - Original chat ID where the message came from.
 * @property {any} sender_id - Original sender ID.
 * @property {ITgcfFile | null} file - Information about an attached file/media.
 * @property {any | null} is_reply_to - ID of the message being replied to.
 * @property {Object} client - Instance of the gram.js TelegramClient associated with this message's session.
 * @property {Object} original_message - The raw message object from gram.js.
 * @property {Object} custom_data - For plugins to store temporary data during the lifecycle of this message processing.
 * @property {boolean} _drop - Internal flag. If true after plugin processing, the message will be dropped.
 */

// This file primarily serves as documentation for the structure of TgcfMessage objects.
// No actual code to export unless we decide to add helper functions related to ITgcfMessage later.
