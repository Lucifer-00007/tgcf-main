const TgcfBasePlugin = require('./tgcf.base.plugin');

class FilterPlugin extends TgcfBasePlugin {
  static get id() { return "filter"; }
  static get name() { return "Message Filter"; }
  static get description() { return "Filters messages based on text content (blacklist/whitelist) or sender ID."; }
  static get configSchema() {
    return {
      blacklist_text: {
        type: 'array',
        items: { type: 'string' },
        default: [],
        description: 'List of keywords. If any keyword is found in message text, message is dropped. Case insensitive.'
      },
      whitelist_text: {
        type: 'array',
        items: { type: 'string' },
        default: [],
        description: 'List of keywords. Message must contain at least one keyword to be kept. Case insensitive. If empty, all messages pass this filter.'
      },
      blacklist_users: {
        type: 'array',
        items: { type: 'string' }, // User IDs as strings
        default: [],
        description: 'List of Telegram User IDs whose messages will be dropped.'
      },
      whitelist_users: {
        type: 'array',
        items: { type: 'string' }, // User IDs as strings
        default: [],
        description: 'List of Telegram User IDs. Only messages from these users will be kept. If empty, all users pass this filter.'
      }
    };
  }

  constructor(config, globalAppConfig) {
    super(config, globalAppConfig);
    this.blacklistText = (this.config.blacklist_text || []).map(kw => kw.toLowerCase());
    this.whitelistText = (this.config.whitelist_text || []).map(kw => kw.toLowerCase());
    this.blacklistUsers = (this.config.blacklist_users || []).map(String); // Ensure string comparison
    this.whitelistUsers = (this.config.whitelist_users || []).map(String); // Ensure string comparison
  }

  modify(tgcfMessage) {
    const messageTextLower = tgcfMessage.text ? tgcfMessage.text.toLowerCase() : "";
    const senderIdStr = tgcfMessage.sender_id ? String(tgcfMessage.sender_id) : "";

    // Blacklist Users Filter
    if (this.blacklistUsers.length > 0 && this.blacklistUsers.includes(senderIdStr)) {
      console.log(`FilterPlugin: Dropping message from blacklisted user ${senderIdStr}.`);
      tgcfMessage._drop = true;
      return null;
    }

    // Whitelist Users Filter
    if (this.whitelistUsers.length > 0 && !this.whitelistUsers.includes(senderIdStr)) {
      console.log(`FilterPlugin: Dropping message from non-whitelisted user ${senderIdStr}.`);
      tgcfMessage._drop = true;
      return null;
    }
    
    // Blacklist Text Filter
    if (tgcfMessage.text && this.blacklistText.length > 0) {
      for (const keyword of this.blacklistText) {
        if (messageTextLower.includes(keyword)) {
          console.log(`FilterPlugin: Dropping message due to blacklisted keyword: "${keyword}".`);
          tgcfMessage._drop = true;
          return null;
        }
      }
    }

    // Whitelist Text Filter
    if (tgcfMessage.text && this.whitelistText.length > 0) {
      let foundWhitelistKeyword = false;
      for (const keyword of this.whitelistText) {
        if (messageTextLower.includes(keyword)) {
          foundWhitelistKeyword = true;
          break;
        }
      }
      if (!foundWhitelistKeyword) {
        console.log(`FilterPlugin: Dropping message because it does not contain any whitelisted keywords.`);
        tgcfMessage._drop = true;
        return null;
      }
    }
    
    return tgcfMessage;
  }
}

module.exports = FilterPlugin;
