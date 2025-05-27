import { Bot } from 'grammy';
import { Message } from 'grammy/types';
import {
  getConfig,
  initializeConfig as initializeMainConfig, // Renamed to avoid conflict if any local initConfig
  loadFromTo,
  loadAdmins,
} from './config';
import { sendMessage, cleanupTgcfMessageFile } from './telegram_utils';
import { loadPlugins, applyPlugins as executeApplyPlugins } from './plugins/loader';
import { setProcessState } from './processState'; // Import to update state on external stop

let liveBotInstance: Bot | null = null;

export async function startSync() {
  console.log('LIVE: Initializing configuration for live mode...');
  // initializeMainConfig needs to be called by the orchestrator (e.g. main.ts or API)
  // await initializeMainConfig(); // This should be handled before startSync is called

  const liveConfig = getConfig();

  if (!liveConfig.login.BOT_TOKEN) {
    console.error('LIVE: Bot token is not configured. Live mode cannot start.');
    setProcessState('idle', 'Bot token not configured for live mode.', 'BOT_TOKEN_MISSING');
    throw new Error('Bot token is not configured for live mode.');
  }

  console.log('LIVE: Initializing Bot...');
  liveBotInstance = new Bot(liveConfig.login.BOT_TOKEN);

  // Setup signal handlers specifically for this bot instance if needed,
  // though generic ones in main.ts might be preferred.
  // For API-driven stop, direct call to stopLiveMode is better.

  console.log('LIVE: Loading plugins...');
  await loadPlugins(liveBotInstance, liveConfig.plugins);

  console.log('LIVE: Loading forwarding map (from-to)...');
  const fromToMap = await loadFromTo(liveBotInstance, liveConfig.forwards);

  if (fromToMap.size === 0) {
    console.warn('LIVE: No valid forward rules were resolved. Live mode will not process new messages based on rules.');
  } else {
    console.log(`LIVE: Forwarding map loaded. ${fromToMap.size} source(s) configured.`);
  }

  console.log('LIVE: Loading admin users...');
  const adminIds = await loadAdmins(liveBotInstance, liveConfig.admins);
  if (adminIds.length > 0) {
    console.log(`LIVE: Admin users loaded: ${adminIds.join(', ')}`);
  } else {
    console.log('LIVE: No admin users configured or resolved.');
  }

  try {
    const botInfo = await liveBotInstance.api.getMe();
    console.log(`LIVE: Bot info received: ${botInfo.username} (ID: ${botInfo.id})`);
    const commands = [
      { command: 'start', description: liveConfig.bot_messages?.start || 'Start the bot' },
      { command: 'ping', description: 'Check if the bot is alive' },
      { command: 'help', description: liveConfig.bot_messages?.bot_help || 'Show help message' },
    ];
    await liveBotInstance.api.setMyCommands(commands);
    console.log('LIVE: Registered bot commands:', commands.map(c => `/${c.command}`).join(', '));
  } catch (error) {
    console.error('LIVE: Error during bot command registration or fetching bot info:', error);
  }

  liveBotInstance.on('message', async (ctx) => {
    const chatId = ctx.chat.id;
    const message = ctx.message;
    if (fromToMap.has(chatId)) {
      const { destinations, forwardConfig } = fromToMap.get(chatId)!;
      console.log(`LIVE: New message in configured source chat ${chatId} (Rule: "${forwardConfig.con_name || 'Unnamed'}"). Processing...`);
      let tgcfMessage;
      try {
        tgcfMessage = await executeApplyPlugins(liveBotInstance!, message);
        if (!tgcfMessage) {
          console.log(`LIVE: Message ${message.message_id} from ${chatId} was filtered out by plugins.`);
          return;
        }
        for (const destChatId of destinations) {
          await sendMessage(
            liveBotInstance!, destChatId, tgcfMessage.originalMessage, chatId,
            liveConfig.show_forwarded_from, tgcfMessage
          );
        }
      } catch (error) {
        console.error(`LIVE: Error processing new message ${message.message_id} from chat ${chatId}:`, error);
      } finally {
        await cleanupTgcfMessageFile(tgcfMessage);
      }
    }
    if (message.text) {
      if (message.text.startsWith('/ping')) await ctx.reply('Pong!');
      else if (message.text.startsWith('/start')) await ctx.reply(liveConfig.bot_messages?.start || 'Hello! I am operational.');
      else if (message.text.startsWith('/help')) await ctx.reply(liveConfig.bot_messages?.bot_help || 'No help configured yet.');
    }
  });

  liveBotInstance.on('edited_message', async (ctx) => {
    const chatId = ctx.chat.id;
    const editedMessage = ctx.editedMessage;
    if (fromToMap.has(chatId)) {
      const { destinations, forwardConfig } = fromToMap.get(chatId)!;
      console.log(`LIVE: Edited message in configured source chat ${chatId} (Rule: "${forwardConfig.con_name || 'Unnamed'}"). Processing...`);
      let tgcfMessage;
      try {
        tgcfMessage = await executeApplyPlugins(liveBotInstance!, editedMessage);
        if (!tgcfMessage) {
          console.log(`LIVE: Edited message ${editedMessage.message_id} from ${chatId} was filtered out by plugins.`);
          return;
        }
        console.warn(`LIVE: Edited message ${editedMessage.message_id} received. Full edit sync not implemented. Forwarding as new message.`);
        for (const destChatId of destinations) {
          await sendMessage(
            liveBotInstance!, destChatId, tgcfMessage.originalMessage, chatId,
            liveConfig.show_forwarded_from, tgcfMessage
          );
        }
      } catch (error) {
        console.error(`LIVE: Error processing edited message ${editedMessage.message_id} from chat ${chatId}:`, error);
      } finally {
        await cleanupTgcfMessageFile(tgcfMessage);
      }
    }
  });

  if (liveConfig.live.delete_sync) {
    console.warn('LIVE: `delete_sync` is enabled with limitations (see previous logs).');
  }

  console.log('LIVE: Starting bot instance...');
  // The `bot.start()` method is non-blocking and returns a Promise that resolves once the bot is connected.
  // The actual event loop runs in the background.
  await liveBotInstance.start({
    onStart: (botInfo) => {
      console.log(`LIVE: Bot @${botInfo.username} started successfully for live mode!`);
      // Note: setProcessState is called by the orchestrator (main.ts) before calling startSync.
      // If startSync is called directly, it might need to update state here, but that's less ideal.
    },
  });
  // After bot.start() resolves, the bot is running. If it's stopped by an external signal or error,
  // the promise returned by bot.start() might not reject here. We rely on stopLiveMode for explicit stops.
  console.log('LIVE: Bot instance is now running in the background.');
}

export async function stopLiveMode(): Promise<void> {
  if (liveBotInstance) {
    console.log('LIVE: Attempting to stop bot instance...');
    try {
      await liveBotInstance.stop();
      console.log('LIVE: Bot instance stopped successfully.');
    } catch (error) {
      console.error('LIVE: Error stopping bot instance:', error);
      // Decide if we should throw or just log. For now, log and proceed.
    } finally {
      liveBotInstance = null; // Clear the instance
    }
  } else {
    console.log('LIVE: Bot instance not found or already stopped.');
  }
}
