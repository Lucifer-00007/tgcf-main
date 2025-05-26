import { ITgcfPlugin } from './base';
import { TgcfNodeMessage } from '../message';
import { SenderPluginConfig } from '../plugin_models';
import { Bot } from 'grammy';

export class SenderPlugin implements ITgcfPlugin {
  readonly id = "sender";
  private config: SenderPluginConfig;
  private customBot?: Bot;

  constructor(config: SenderPluginConfig) {
    this.config = config;
    // Ensure defaults if not provided
    this.config.user_type = this.config.user_type || 0;
    this.config.BOT_TOKEN = this.config.BOT_TOKEN || "";
    this.config.SESSION_STRING = this.config.SESSION_STRING || "";
    console.log('SenderPlugin initialized with config:', JSON.stringify(this.config, null, 2));
  }

  async init?(): Promise<void> {
    if (this.config.user_type === 0 && this.config.BOT_TOKEN) {
      console.log(`SenderPlugin: Initializing custom bot with provided BOT_TOKEN.`);
      try {
        this.customBot = new Bot(this.config.BOT_TOKEN);
        const botInfo = await this.customBot.api.getMe();
        console.log(`SenderPlugin: Custom bot initialized successfully. Bot ID: ${botInfo.id}, Username: ${botInfo.username}`);
      } catch (error) {
        console.error(`SenderPlugin: Failed to initialize custom bot with BOT_TOKEN. Error:`, error);
        this.customBot = undefined; // Ensure customBot is not set if initialization failed
      }
    } else if (this.config.user_type === 1 && this.config.SESSION_STRING) {
      console.warn(
        `SenderPlugin: Configuration for user_type 1 (user account) with a SESSION_STRING is present. ` +
        `However, grammY primarily supports bot accounts. Sending messages as a user account ` +
        `using a session string is not directly supported by grammY in the same way as Telethon. ` +
        `This plugin will NOT use the session string for sending messages. Only BOT_TOKEN override is supported.`
      );
      // User-mode sending via session string (like Telethon) would require an MTProto library.
      // This plugin currently only supports bot token overrides.
    } else if (this.config.user_type === 0 && !this.config.BOT_TOKEN) {
        console.warn("SenderPlugin: Configured for bot override (user_type 0) but no BOT_TOKEN provided. Cannot initialize custom sender bot.");
    } else if (this.config.user_type === 1 && !this.config.SESSION_STRING) {
        console.warn("SenderPlugin: Configured for user override (user_type 1) but no SESSION_STRING provided. Cannot initialize custom sender.");
    }
  }

  async modify(tm: TgcfNodeMessage): Promise<TgcfNodeMessage | null> {
    if (this.customBot) {
      tm.overrideSendBot = this.customBot;
      console.log(`SenderPlugin: Overriding sender for message ID ${tm.originalMessage.message_id} with custom bot.`);
    }
    // This plugin does not filter or change content, just potentially the sender agent.
    return tm;
  }

  // Optional method to directly get the bot instance if needed by other parts of an extended system.
  getBotInstance(): Bot | undefined {
    return this.customBot;
  }
}
