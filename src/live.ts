import { Bot, GrammyError, HttpError } from 'grammy';
import { Message } from 'grammy/types';
import {
  getConfig,
  initializeConfig,
  loadFromTo,
  loadAdmins,
  currentConfig, // Use currentConfig after initialization
  Config, // Import Config type if needed for explicit typing
  Forward,
} from './config';
import { sendMessage } from './telegram_utils';
// import { storeMessageMapping, getForwardedMessages, removeMessageMapping } from './storage'; // Placeholders

import { loadPlugins, applyPlugins as executeApplyPlugins } from './plugins/loader'; // Renamed to avoid conflict

// Removed the old placeholder applyPlugins function

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
    // currentConfig.is_bot = botInfo.is_bot; // This should ideally update the persisted config if necessary

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

    // Log every message received for debugging, if needed (can be verbose)
    // console.log(`LIVE: Received message in chat ${chatId}:`, message);

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

        // Reply handling placeholder (would use tgcfMessage.originalMessage.reply_to_message)
        // if (tgcfMessage.originalMessage.reply_to_message) {
        //   console.log(`LIVE: Message ${tgcfMessage.originalMessage.message_id} is a reply to ${tgcfMessage.originalMessage.reply_to_message.message_id}`);
        // }

        for (const destChatId of destinations) {
          console.log(`LIVE: Sending processed message (Original ID: ${tgcfMessage.originalMessage.message_id}) from ${chatId} to ${destChatId}`);
          // Pass tgcfMessage to sendMessage, or relevant parts of it
          // sendMessage will now need to be aware of TgcfNodeMessage structure if filePath is used.
          // For now, assuming sendMessage is adapted or we pass originalMessage if no file modifications.
          await sendMessage(
            bot,
            destChatId,
            tgcfMessage.originalMessage, // Pass the original message for sending logic
            chatId,
            liveConfig.show_forwarded_from,
            tgcfMessage // Pass the processed TgcfNodeMessage for potential file path or modified text
          );
          // Placeholder: storeMessageMapping(ctx, destChatId, forwardedMsg);
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
        
        const processedMessage = tgcfMessage.originalMessage; // For compatibility with existing logic using 'processedMessage'
                                                          // Ideally, logic below should use tgcfMessage directly

        // Placeholder: Delete on Edit Logic
        // const deleteOnEditText = liveConfig.live.delete_on_edit;
        // if (deleteOnEditText && processedMessage.text === deleteOnEditText) {
        //   console.log(`LIVE: Message ${processedMessage.message_id} text matches delete_on_edit pattern. Deleting forwarded versions.`);
        //   const forwardedMsgInfos = getForwardedMessages(ctx); // Assuming ctx has enough info for original message
        //   if (forwardedMsgInfos) {
        //     for (const [destChatId, msgInfo] of forwardedMsgInfos) {
        //       try {
        //         await bot.api.deleteMessage(destChatId, msgInfo.message_id);
        //         console.log(`LIVE: Deleted forwarded message in ${destChatId} (original ${processedMessage.message_id})`);
        //       } catch (delError) {
        //         console.error(`LIVE: Error deleting message in ${destChatId} for original ${processedMessage.message_id}:`, delError);
        //       }
        //     }
        //     removeMessageMapping(ctx); // Remove from storage
        //   }
        //   return; // Stop further processing for this edit
        // }

        // Placeholder: Edit forwarded messages
        // const forwardedMsgInfos = getForwardedMessages(ctx);
        // if (forwardedMsgInfos) {
        //   for (const [destChatId, msgInfo] of forwardedMsgInfos) {
        //     try {
        //       // This is highly dependent on message type and what can be edited.
        //       // Text messages are most common.
        //       if (processedMessage.text && msgInfo.can_be_edited) { // Assuming msgInfo tells us if it can be edited
        //         await bot.api.editMessageText(destChatId, msgInfo.message_id, processedMessage.text);
        //         console.log(`LIVE: Edited forwarded message text in ${destChatId} (original ${processedMessage.message_id})`);
        //       } else if (processedMessage.caption && msgInfo.can_edit_caption) {
        //          await bot.api.editMessageCaption(destChatId, msgInfo.message_id, { caption: processedMessage.caption });
        //          console.log(`LIVE: Edited forwarded message caption in ${destChatId} (original ${processedMessage.message_id})`);
        //       }
        //       // Add other editable types if necessary
        //     } catch (editError) {
        //       console.error(`LIVE: Error editing message in ${destChatId} for original ${processedMessage.message_id}:`, editError);
        //     }
        //   }
        // } else {
        //   // If no record of forwarded message, maybe send as new? (Optional, based on desired behavior)
        //   console.log(`LIVE: No record of forwarded messages for original ${processedMessage.message_id}. Sending edit as new message.`);
        //   for (const destChatId of destinations) {
        //     await sendMessage(bot, destChatId, processedMessage, chatId, liveConfig.show_forwarded_from);
        //   }
        // }

        // Fallback for now: treat edits as new messages if not handled by above logic
        // This is a simplification. Proper edit handling requires robust storage.
        console.warn(`LIVE: Edited message ${editedMessage.message_id} received. Full edit sync not implemented. Forwarding as new for now.`);
        for (const destChatId of destinations) {
            await sendMessage(
                bot,
                destChatId,
                processedMessage, // or tgcfMessage.originalMessage
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
