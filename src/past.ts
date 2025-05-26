import { Bot, GrammyError, HttpError } from 'grammy';
import { Message as TypegramMessage } from 'grammy/types';
import { getConfig, initializeConfig, loadFromTo } from './config'; // Removed currentConfig, Forward
import { sendMessage } from './telegram_utils';
import { loadPlugins, applyPlugins as executeApplyPlugins } from './plugins/loader';
// Removed placeholder storage import comment

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Removed comment about removed placeholder function

export async function forwardJob() {
  console.log('Starting past mode job...');
  await initializeConfig(); // Ensure config is loaded

  const config = getConfig(); // Use getConfig() to access the loaded configuration

  if (!config.login.BOT_TOKEN) {
    console.error('Bot token is not configured. Past mode cannot start.');
    return;
  }

  const bot = new Bot(config.login.BOT_TOKEN);
  console.log('Grammy Bot instance created.');

  console.log('PAST: Loading plugins...');
  await loadPlugins(bot, config.plugins); // Load plugins

  if (config.login.user_type === 1) {
    console.warn(
      'WARNING: Configuration is set to user_type 1 (user account). ' +
      'grammY is primarily a bot library. Full history access and operations as a user account ' +
      '(like Telethon\'s client.iter_messages) have significant limitations or may not work as expected. ' +
      'Proceeding with bot capabilities, which may only access history if the bot was an admin or had specific permissions at the time messages were sent, or if chats are public.'
    );
    // Research Note: Using grammY (or other Node.js Telegram libraries like MTProto) for user account automation
    // is more complex than with bot accounts. MTProto-based libraries directly use the Telegram Core API,
    // allowing user-like access. grammY focuses on the Bot API. For true user account behavior similar to
    // Telethon's `client.iter_messages`, one would typically use an MTProto library (e.g., `telegram` for Node.js,
    // which is an MTProto implementation). This would involve session management (string session or phone + code)
    // and direct API calls like `messages.getHistory`.
    // For this subtask, we will proceed assuming the BOT_TOKEN belongs to a bot with sufficient access
    // or that the chats are public and history is accessible to bots.
  }


  const fromToMap = await loadFromTo(bot, config.forwards);

  if (fromToMap.size === 0) {
    console.warn('No valid forward rules were resolved. Past mode will not process any messages.');
    return;
  }

  console.log(`Starting message processing for ${fromToMap.size} source(s).`);

  for (const [sourceChatId, { destinations, forwardConfig }] of fromToMap) {
    console.log(`Processing source: ${sourceChatId} (Rule: "${forwardConfig.con_name || 'Unnamed'}")`);
    // `currentOffsetId` is the last processed message_id for this source from previous runs (or 0 if new).
    // We need to fetch messages with message_id > currentOffsetId.
    // `forwardConfig.end` is an optional upper limit (message_id to stop before).
    let currentOffsetId = forwardConfig.offset || 0; 
    const limit = 100; // Telegram API message limit per request

    // Strategy: Fetch messages in batches, from newest towards oldest, using `fetchOffsetId`.
    // `fetchOffsetId` starts from `forwardConfig.end` (if specified, meaning fetch messages older than `end`)
    // or from 0 (meaning fetch the latest messages).
    // We process messages if their ID is > `currentOffsetId` (the actual starting point from config/storage).
    // Messages are reversed to process from oldest to newest within a batch.
    let fetchOffsetId = forwardConfig.end || 0; 
    let continueFetching = true;

    console.log(`Source ${sourceChatId}: Initial fetch_offset_id (for API call)=${fetchOffsetId}, processing messages with ID > ${currentOffsetId}. End target ID: ${forwardConfig.end || 'None'}`);

    while (continueFetching) {
      try {
        console.log(`Source ${sourceChatId}: Fetching history with offset_id: ${fetchOffsetId}, limit: ${limit}`);
        const history = await bot.api.getChatHistory(sourceChatId, {
          offset_id: fetchOffsetId,
          limit: limit,
        });

        if (!history || history.length === 0) {
          console.log(`Source ${sourceChatId}: No more messages found or history is empty. Fetch offset was ${fetchOffsetId}.`);
          break; // No more messages
        }

        // Messages are typically returned newest to oldest.
        // We want to process them oldest to newest if we are to match Telethon's typical forward flow.
        // Or, if offset is "last_message_id_processed", we process these (which are older than fetchOffsetId or newer than previous batch's last id)
        // and continue until we hit messages older than `currentOffsetId`.

        const messagesToProcess = [];
        for (const message of history) { // history is newest to oldest
            if (message.message_id > currentOffsetId) {
                if (forwardConfig.end && message.message_id >= forwardConfig.end) {
                    // If an end_id is specified, skip messages newer than or equal to it (unless end_id was the starting fetchOffsetId)
                    if (fetchOffsetId === forwardConfig.end && message.message_id === forwardConfig.end) {
                         // include the end_id message itself if it's the first one we fetch with end_id as offset
                    } else if (fetchOffsetId !== forwardConfig.end) {
                        continue;
                    }
                }
                messagesToProcess.push(message);
            } else {
                // We've reached messages older than or equal to our starting offset, so stop.
                continueFetching = false;
                break;
            }
        }
        
        // messagesToProcess is currently newest to oldest. Reverse to process oldest to newest.
        messagesToProcess.reverse();


        if (messagesToProcess.length === 0 && history.length > 0) {
            // All messages in this batch were older than currentOffsetId or newer/equal to end_id
            // but we haven't necessarily reached the end of history if continueFetching is true.
            // This means we need to continue fetching even older messages.
             fetchOffsetId = history[history.length - 1].message_id;
             if (!continueFetching) { // If the inner loop decided to stop, respect that.
                console.log(`Source ${sourceChatId}: Reached messages older than target offset ${currentOffsetId}. Stopping.`);
                break;
             }
             if (fetchOffsetId <= currentOffsetId) {
                console.log(`Source ${sourceChatId}: Next fetch offset ${fetchOffsetId} is <= target offset ${currentOffsetId}. Stopping.`);
                break;
             }
             continue; // Fetch next older batch
        }


        if (messagesToProcess.length === 0 && history.length === 0) {
             console.log(`Source ${sourceChatId}: No messages returned from history and no messages to process.`);
             break;
        }


        console.log(`Source ${sourceChatId}: Fetched ${history.length} messages, ${messagesToProcess.length} are newer than offset ${currentOffsetId} and older than end ${forwardConfig.end || 'N/A'}.`);

        for (const rawMessage of messagesToProcess) { // rawMessage is TypegramMessage
          console.log(`Source ${sourceChatId}: Processing message ID: ${rawMessage.message_id} (date: ${new Date(rawMessage.date * 1000).toISOString()})`);
          
          let tgcfMessage;
          try {
            tgcfMessage = await executeApplyPlugins(bot, rawMessage);
            if (!tgcfMessage) {
              console.log(`PAST: Message ${rawMessage.message_id} from ${sourceChatId} was filtered out by plugins.`);
              continue; // Skip to next message
            }

            // Send to Destinations
            for (const destChatId of destinations) {
              await sendMessage(
                bot,
                destChatId,
                tgcfMessage.originalMessage, // Original message for context
                sourceChatId,
                config.show_forwarded_from,
                tgcfMessage // Pass the processed TgcfNodeMessage
              );
              // Placeholder: Update storage
            }

            // Delay
            if (config.past.delay && config.past.delay > 0) {
              console.log(`Delaying for ${config.past.delay} ms...`);
              await delay(config.past.delay);
            }
          } catch (pluginError) {
            console.error(`PAST: Error applying plugins or sending message ${rawMessage.message_id} from chat ${sourceChatId}:`, pluginError);
          } finally {
            if (tgcfMessage && tgcfMessage.filePath && tgcfMessage.cleanupFilePath) {
                await tgcfMessage.clearTemporaryFile();
            }
          }
        }

        // If we processed messages, the new "offset" for the *next run* of this job would be the ID of the last (newest) message processed.
        // This needs to be saved to storage (e.g., database or config file).
        // For the current run, to get the next batch of *older* messages, we take the ID of the oldest message from the *original* history batch.
        // Example: if (messagesToProcess.length > 0) { /* save messagesToProcess[messagesToProcess.length - 1].message_id for this sourceChatId */ }
        
        fetchOffsetId = history[history.length - 1].message_id; // Oldest message in the current batch becomes offset for next older batch
        
        if (fetchOffsetId <= currentOffsetId && currentOffsetId !== 0) { // if currentOffsetId is 0 (process all history), this condition won't stop early
             console.log(`Source ${sourceChatId}: Next fetch API offset_id ${fetchOffsetId} is <= target start offset_id ${currentOffsetId}. Stopping.`);
             continueFetching = false;
        }
        if (!continueFetching) break; // Break from while loop if inner logic decided to stop


      } catch (error: any) {
        console.error(`Source ${sourceChatId}: Error fetching or processing messages:`, error);
        if (error instanceof GrammyError) {
          console.error('GrammyError Details:', error.description, error.error_code);
          if (error.error_code === 429 || (error.parameters && error.parameters.retry_after)) {
            const retryAfter = (error.parameters && error.parameters.retry_after) || 60; // Default to 60s
            console.warn(`Flood control: waiting for ${retryAfter} seconds...`);
            await delay(retryAfter * 1000);
          } else if (error.error_code === 400 && error.description.includes("offset_id_invalid")) {
            console.warn(`Source ${sourceChatId}: Invalid offset_id for API call: ${fetchOffsetId}. This might mean the message ID doesn't exist or is too old. Stopping for this source.`);
            break; // Stop for this source
          } else if (error.error_code === 401 || error.error_code === 403) {
            console.error(`Source ${sourceChatId}: Unauthorized or forbidden. Check bot permissions or token. Stopping for this source.`);
            break;
          }
        } else if (error instanceof HttpError) {
            console.error('HttpError body:', error.message); // HttpError often has JSON string in message
        }
        // Consider if a generic delay is always needed or if breaking is better for some errors.
        await delay(10000); // Generic delay on other errors
      }
    }
    console.log(`Source ${sourceChatId}: Finished processing this source.`);
    // Note: Logic to save the new 'currentOffsetId' (i.e., the highest message_id processed from this source)
    // for the next run of `forwardJob` should be implemented here, likely using the 'storage.ts' module.
  }
  console.log('Past mode job finished.');
}
