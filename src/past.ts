import { Bot, GrammyError, HttpError } from 'grammy';
import { Message as TypegramMessage } from 'grammy/types'; // Use TypegramMessage
import { getConfig, initializeConfig, loadFromTo, currentConfig, Forward } from './config';
import { sendMessage } from './telegram_utils';
import { loadPlugins, applyPlugins as executeApplyPlugins } from './plugins/loader'; // Renamed to avoid conflict
// import { saveLastMessageId, getLastMessageId } from './storage'; // Placeholder for storage

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Removed old placeholder applyPlugins

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
    // let currentOffsetId = await getLastMessageId(sourceChatId) || forwardConfig.offset || 0;
    let currentOffsetId = forwardConfig.offset || 0; // Use offset from config, storage not implemented yet
    const limit = 100; // Telegram API message limit per request

    // Telethon's reverse=True fetches oldest messages first.
    // grammY's getChatHistory `offset_id` fetches messages *older* than the given ID.
    // If `offset_id` is 0, it fetches the most recent messages.
    // To emulate `reverse=True` and Telethon's `offset_id` (which is like a "message_id to start after" when not reversed):
    // If we want to fetch messages *after* a certain `offset_id` (Telethon's default behavior for `offset_id`),
    // and process them chronologically (oldest first), we'd need a different strategy with getChatHistory.
    //
    // However, the Python code's `offset` seems to be a message ID to *start after*.
    // And `end` is a message ID to *stop before*.
    // Let's assume `forwardConfig.offset` is the last processed message ID. We want messages *after* this.
    // `bot.api.getChatHistory` with `offset_id` means "start from message with this ID and go backwards (older)".
    // This is not what we want if `offset` is "last message processed".
    //
    // Let's reconsider: Telethon's `iter_messages(offset_id=X)` retrieves messages with IDs *greater* than X if `reverse=False`.
    // If `reverse=True`, `offset_id` means "start from this message ID and go backwards (older)".
    // The python `offset` parameter in `Forward` seems to be used as `offset_id` for `iter_messages`.
    // The python code does not set `reverse=True` for past mode. It uses `OFFSET_ID` which is `min_id` in `fetch_messages`.
    // `fetch_messages` in `past.py` uses `offset_id` (which is `min_id`) and `max_id` (which is `end`).
    // It fetches messages in batches, and `min_id` is updated. This means it fetches messages with ID > `min_id`.
    //
    // For grammY `getChatHistory(chat_id, { offset_id, limit })`:
    // `offset_id`: If specified, messages *older* than this ID are returned. 0 for most recent.
    // This means to get newer messages, we can't use `offset_id` in a simple incrementing way.
    //
    // A common strategy for fetching messages chronologically (oldest to newest) after a certain point:
    // 1. Fetch a batch of recent messages.
    // 2. Process them from newest to oldest (or reverse the batch).
    // 3. The `offset_id` for the next batch would be the ID of the oldest message in the current batch.
    // This is for fetching *all* old history.
    //
    // If `forwardConfig.offset` is "last synced message ID", we need messages *newer* than this.
    // Telegram Bot API does not have a direct way to say "give me messages with ID > X".
    // We might have to fetch recent messages and filter them.
    // Or, if `offset` is truly a date-based offset, that's different. Given it's an int, it's likely message_id.

    // For this implementation, let's assume `forwardConfig.offset` is the ID of the *last message that was processed*.
    // We need to fetch messages that came *after* it.
    // The Bot API's `getChatHistory` by default gets latest messages. We can use `offset_date` to get messages around a certain time,
    // or fetch recent ones and filter.
    //
    // Given the structure of `Forward` with `offset` and `end` (both optional message IDs),
    // a robust solution would involve fetching messages in chunks and checking IDs.
    // Let's simplify: fetch recent messages and if `forwardConfig.offset` is set, skip messages with ID <= offset.
    // This is not efficient for large gaps.
    //
    // A better approach for "messages after offset_id X up to end_id Y":
    // Iterate backwards from `end_id` (or latest if no `end_id`) until `offset_id` is reached.
    // This means messages are processed newest to oldest. If chronological processing (oldest to newest) is desired,
    // they need to be stored and reversed.

    let fetchOffsetId = forwardConfig.end || 0; // Start from end_id (or latest if 0) and go backwards
    let continueFetching = true;

    console.log(`Source ${sourceChatId}: Initial fetchOffsetId=${fetchOffsetId}, target minimum offset_id=${currentOffsetId}`);

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

            // Handle Replies (Placeholder, would use tgcfMessage properties)
            // if (tgcfMessage.originalMessage.reply_to_message) { ... }

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

        if (messagesToProcess.length > 0) {
            // If we processed messages, the new "offset" for the *next run* of this job would be the ID of the last (newest) message processed.
            // For this current run, to get the next batch of *older* messages, we take the ID of the oldest message from the *original* history batch.
            // forwardConfig.offset = messagesToProcess[messagesToProcess.length - 1].message_id; // Update in-memory config for this run
            // await saveLastMessageId(sourceChatId, forwardConfig.offset); // Persist for next invocation of forwardJob
        }
        
        fetchOffsetId = history[history.length - 1].message_id; // Oldest message in the current batch becomes offset for next older batch
        
        if (fetchOffsetId <= currentOffsetId && currentOffsetId !== 0) { // if currentOffsetId is 0, we want all history
             console.log(`Source ${sourceChatId}: Next fetch offset ${fetchOffsetId} is <= target start offset ${currentOffsetId}. Stopping.`);
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
            console.warn(`Source ${sourceChatId}: Invalid offset_id: ${fetchOffsetId}. This might mean the message ID doesn't exist or is too old. Stopping for this source.`);
            break; // Stop for this source
          } else if (error.error_code === 401 || error.error_code === 403) {
            console.error(`Source ${sourceChatId}: Unauthorized or forbidden. Check bot permissions or token. Stopping for this source.`);
            break;
          }
        } else if (error instanceof HttpError) {
            console.error('HttpError body:', error.message); // HttpError often has JSON string in message
        }
        // Add more specific error handling as needed
        await delay(10000); // Generic delay on other errors
      }
    }
    console.log(`Source ${sourceChatId}: Finished processing this source.`);
    // Here you would ideally save the latest processed message ID for this source (the largest ID successfully handled)
    // This would become the new `forwardConfig.offset` for the next time `forwardJob` runs.
    // For example:
    // if (messagesToProcess.length > 0) {
    //    const newOffsetForNextRun = messagesToProcess[messagesToProcess.length-1].message_id;
    //    config.forwards.find(f => f.source === forwardConfig.source).offset = newOffsetForNextRun;
    //    await updateConfig(config); // This would save it to JSON/Mongo
    // }
  }
  console.log('Past mode job finished.');
}

// To run the job (example):
// if (require.main === module) {
//   initializeConfig().then(() => {
//     if (getConfig().mode === 1) { // 1 for past mode
//       forwardJob().catch(console.error);
//     } else {
//       console.log("Not in past mode. Exiting.");
//     }
//   });
// }
