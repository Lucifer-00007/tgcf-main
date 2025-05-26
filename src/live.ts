import { Bot } from 'grammy'; // Removed GrammyError, HttpError
import { Message } from 'grammy/types';
import {
  getConfig,
  initializeConfig,
  loadFromTo,
  loadAdmins,
  // currentConfig, // Removed unused import
  // Config, // Removed unused import
  // Forward, // Removed unused import
} from './config';
import { sendMessage } from './telegram_utils';
// Removed placeholder storage import comments

import { loadPlugins, applyPlugins as executeApplyPlugins } from './plugins/loader';

// Removed comment about removed placeholder function

export async function startSync() {
  console.log('LIVE: Initializing configuration...');
  await initializeConfig(); // Ensure config is loaded and currentConfig is populated

  const liveConfig = getConfig(); // Get the fully loaded and resolved config

  if (!liveConfig.login.BOT_TOKEN) {
    console.error('LIVE: Bot token is not configured. Live mode cannot start.');
    return;
  }

  console.log('LIVE: Initializing Bot...');
  const bot = new Bot(liveConfig.login.BOT_TOKEN);

  console.log('LIVE: Loading plugins...');
  await loadPlugins(bot, liveConfig.plugins); // Load plugins

  console.log('LIVE: Loading forwarding map (from-to)...');
  const fromToMap = await loadFromTo(bot, liveConfig.forwards);

  if (fromToMap.size === 0) {
    console.warn('LIVE: No valid forward rules were resolved. Live mode will not process new messages based on rules.');
    // Continue if there are admins for commands, or other bot functionalities.
  } else {
    console.log(`LIVE: Forwarding map loaded. ${fromToMap.size} source(s) configured.`);
  }

  console.log('LIVE: Loading admin users...');
  const adminIds = await loadAdmins(bot, liveConfig.admins);
  if (adminIds.length > 0) {
    console.log(`LIVE: Admin users loaded: ${adminIds.join(', ')}`);
  } else {
    console.log('LIVE: No admin users configured or resolved.');
  }

  // Bot Commands Registration (Placeholder for actual logic based on config flags)
  try {
    // Assuming is_bot is true if BOT_TOKEN is used.
    // A check like `liveConfig.consts.REGISTER_COMMANDS` would require `consts` in Config.
    // For now, let's assume we always try to register if there are admins or for general use.
    const botInfo = await bot.api.getMe();
    console.log(`LIVE: Bot info received: ${botInfo.username} (ID: ${botInfo.id})`);

    // Define commands (example)
    const commands = [
      { command: 'start', description: liveConfig.bot_messages?.start || 'Start the bot' },
      { command: 'ping', description: 'Check if the bot is alive' },
      { command: 'help', description: liveConfig.bot_messages?.bot_help || 'Show help message' },
      // Add more commands as needed
    ];
    await bot.api.setMyCommands(commands);
    console.log('LIVE: Registered bot commands:', commands.map(c => `/${c.command}`).join(', '));
  } catch (error) {
    console.error('LIVE: Error during bot command registration or fetching bot info:', error);
  }


  // New Message Handler
  bot.on('message', async (ctx) => {
    const chatId = ctx.chat.id;
    const message = ctx.message;

    if (fromToMap.has(chatId)) {
      const { destinations, forwardConfig } = fromToMap.get(chatId)!;
      console.log(`LIVE: New message in configured source chat ${chatId} (Rule: "${forwardConfig.con_name || 'Unnamed'}"). Processing...`);

      let tgcfMessage; // Declare here to use in finally
      try {
        tgcfMessage = await executeApplyPlugins(bot, message); // Use the imported applyPlugins
        if (!tgcfMessage) {
          console.log(`LIVE: Message ${message.message_id} from ${chatId} was filtered out by plugins.`);
          return; // Plugin chain decided to stop processing
        }

        for (const destChatId of destinations) {
          console.log(`LIVE: Sending processed message (Original ID: ${tgcfMessage.originalMessage.message_id}) from ${chatId} to ${destChatId}`);
          await sendMessage(
            bot,
            destChatId,
            tgcfMessage.originalMessage, // Pass the original message for sending logic
            chatId,
            liveConfig.show_forwarded_from,
            tgcfMessage // Pass the processed TgcfNodeMessage for potential file path or modified text
          );
          // Future: storeMessageMapping(ctx, destChatId, forwardedMsg);
        }
      } catch (error) {
        console.error(`LIVE: Error processing new message ${message.message_id} from chat ${chatId}:`, error);
      } finally {
        if (tgcfMessage && tgcfMessage.filePath && tgcfMessage.cleanupFilePath) {
            await tgcfMessage.clearTemporaryFile();
        }
      }
    }

    // Basic command handling (example)
    if (message.text) {
        if (message.text.startsWith('/ping')) {
            await ctx.reply('Pong!');
        } else if (message.text.startsWith('/start')) {
            await ctx.reply(liveConfig.bot_messages?.start || 'Hello! I am operational.');
        } else if (message.text.startsWith('/help')) {
            await ctx.reply(liveConfig.bot_messages?.bot_help || 'No help configured yet.');
        }
    }
  });

  // Edited Message Handler
  bot.on('edited_message', async (ctx) => {
    const chatId = ctx.chat.id;
    const editedMessage = ctx.editedMessage;
    console.log(`LIVE: Edited message ${editedMessage.message_id} in chat ${chatId}.`);

    if (fromToMap.has(chatId)) {
      const { destinations, forwardConfig } = fromToMap.get(chatId)!;
      console.log(`LIVE: Edited message in configured source chat ${chatId} (Rule: "${forwardConfig.con_name || 'Unnamed'}"). Processing...`);

      let tgcfMessage; // Declare here to use in finally
      try {
        tgcfMessage = await executeApplyPlugins(bot, editedMessage); // Use the imported applyPlugins
        if (!tgcfMessage) {
          console.log(`LIVE: Edited message ${editedMessage.message_id} from ${chatId} was filtered out by plugins.`);
          return; // Plugin chain decided to stop processing
        }
        
        const processedGrammyMessage = tgcfMessage.originalMessage; // Use originalMessage from TgcfNodeMessage for sending
                                                          
        // Full edit sync (delete_on_edit, actual edit of forwarded messages) requires storage
        // and is a more complex feature. For now, we log and forward as new.
        console.warn(`LIVE: Edited message ${editedMessage.message_id} received. Full edit sync not implemented. Forwarding as new message for now.`);
        for (const destChatId of destinations) {
            await sendMessage(
                bot,
                destChatId,
                processedGrammyMessage, 
                chatId,
                liveConfig.show_forwarded_from,
                tgcfMessage // Pass the processed TgcfNodeMessage
            );
        }
      } catch (error) {
        console.error(`LIVE: Error processing edited message ${editedMessage.message_id} from chat ${chatId}:`, error);
      } finally {
        if (tgcfMessage && tgcfMessage.filePath && tgcfMessage.cleanupFilePath) {
            await tgcfMessage.clearTemporaryFile();
        }
      }
    }
  });

  // Deleted Message Handler (Limitations Acknowledged)
  if (liveConfig.live.delete_sync) {
    console.warn(
      'LIVE: `delete_sync` is enabled. Bots have limitations in detecting message deletions. ' +
      'A bot can typically only detect deletion of its own messages or messages deleted while it has admin rights in a group ' +
      '(and specific events are sent by Telegram, which are rare for arbitrary message deletions by users). ' +
      'This handler is a best-effort and might not capture all deletions as expected by users familiar with user-account bots.'
    );
    // There isn't a direct `bot.on("message_delete")` for arbitrary messages deleted by other users.
    // Service messages about deletions (e.g. "user X deleted N messages") are also not consistently provided or easy to parse.
    // `deleteMessage` API call is for the bot to delete messages.
    // The most common scenario where a bot might know about deletions is if it's an admin and receives
    // updates about messages being deleted by other admins, or if it's deleting its own messages.
    // For now, we'll log a general warning. True delete sync is complex.
    // A more advanced implementation might involve polling or checking messages, but that's outside grammY's event model.
  }


  // Start the bot
  console.log('LIVE: Starting bot...');
  bot.start({
    onStart: (botInfo) => {
      console.log(`LIVE: Bot @${botInfo.username} started successfully!`);
    },
    // drop_pending_updates: true, // Optional: drop updates received while bot was down
  }).catch((err) => {
    const e = err as Error;
    console.error('LIVE: Error starting bot:', e.message);
    if (e.stack) console.error(e.stack); // Log stack if available
    process.exit(1); // Exit if bot fails to start
  });

  // Graceful shutdown
  process.once('SIGINT', () => { console.log("SIGINT received, stopping bot..."); bot.stop(); });
  process.once('SIGTERM', () => { console.log("SIGTERM received, stopping bot..."); bot.stop(); });
}
