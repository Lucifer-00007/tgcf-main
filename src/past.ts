import { Bot, GrammyError, HttpError } from 'grammy';
import { Message as TypegramMessage } from 'grammy/types';
import { getConfig, initializeConfig as initializeMainConfig } from './config'; // Renamed to avoid conflict
import { sendMessage, cleanupTgcfMessageFile } from './telegram_utils';
import { loadPlugins, applyPlugins as executeApplyPlugins } from './plugins/loader';
import { getProcessState, setProcessState } from './processState'; // Import to check state

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Flag to signal stop, can be set by stopPastMode
let shouldStopPastMode = false;

export async function forwardJob() {
  shouldStopPastMode = false; // Reset flag at the start of a new job
  console.log('PAST: Starting past mode job...');
  // initializeMainConfig should be called by the orchestrator (main.ts or API)
  // await initializeMainConfig(); 

  const config = getConfig();

  if (!config.login.BOT_TOKEN) {
    console.error('PAST: Bot token is not configured. Past mode cannot start.');
    setProcessState('idle', 'Bot token not configured for past mode.', 'BOT_TOKEN_MISSING');
    throw new Error('Bot token not configured for past mode.');
  }

  // Create a new bot instance for each job to ensure clean state, or manage globally if preferred
  const bot = new Bot(config.login.BOT_TOKEN);
  console.log('PAST: Grammy Bot instance created for past job.');

  console.log('PAST: Loading plugins...');
  await loadPlugins(bot, config.plugins);

  // ... (rest of the user_type warning and fromToMap loading logic from original file)
  if (config.login.user_type === 1) {
    console.warn(
      'WARNING: Configuration is set to user_type 1 (user account). ' +
      'grammY is primarily a bot library. Full history access and operations as a user account ' +
      '(like Telethon\'s client.iter_messages) have significant limitations or may not work as expected. '
    );
  }
  const fromToMap = await loadFromTo(bot, config.forwards);
  if (fromToMap.size === 0) {
    console.warn('PAST: No valid forward rules were resolved. Past mode will not process any messages.');
    setProcessState('idle', 'No forward rules for past mode.');
    return;
  }
  console.log(`PAST: Starting message processing for ${fromToMap.size} source(s).`);


  for (const [sourceChatId, { destinations, forwardConfig }] of fromToMap) {
    if (shouldStopPastMode) {
      console.log(`PAST: Stop signal received before processing source ${sourceChatId}. Aborting job.`);
      break; // Exit the main loop over sources
    }
    console.log(`PAST: Processing source: ${sourceChatId} (Rule: "${forwardConfig.con_name || 'Unnamed'}")`);
    let currentOffsetId = forwardConfig.offset || 0; 
    const limit = 100;
    let fetchOffsetId = forwardConfig.end || 0; 
    let continueFetching = true;

    console.log(`PAST: Source ${sourceChatId}: Initial fetch_offset_id=${fetchOffsetId}, processing > ${currentOffsetId}. End target: ${forwardConfig.end || 'None'}`);

    while (continueFetching) {
      if (shouldStopPastMode) {
        console.log(`PAST: Stop signal received during fetching for source ${sourceChatId}. Aborting this source.`);
        break; // Exit the while loop for current source
      }
      try {
        const history = await bot.api.getChatHistory(sourceChatId, {
          offset_id: fetchOffsetId, limit: limit,
        });

        if (!history || history.length === 0) {
          console.log(`PAST: Source ${sourceChatId}: No more messages. Fetch offset was ${fetchOffsetId}.`);
          break; 
        }

        const messagesToProcess = [];
        for (const message of history) {
            if (message.message_id > currentOffsetId) {
                if (forwardConfig.end && message.message_id >= forwardConfig.end) {
                    if (!(fetchOffsetId === forwardConfig.end && message.message_id === forwardConfig.end) && fetchOffsetId !== forwardConfig.end) {
                        continue;
                    }
                }
                messagesToProcess.push(message);
            } else {
                continueFetching = false; break;
            }
        }
        messagesToProcess.reverse();

        if (messagesToProcess.length === 0 && history.length > 0) {
             fetchOffsetId = history[history.length - 1].message_id;
             if (!continueFetching || fetchOffsetId <= currentOffsetId) {
                console.log(`PAST: Source ${sourceChatId}: Reached offset or end. Stopping.`);
                break;
             }
             continue;
        }
        if (messagesToProcess.length === 0 && history.length === 0) {
             console.log(`PAST: Source ${sourceChatId}: No messages returned, no messages to process.`);
             break;
        }

        console.log(`PAST: Source ${sourceChatId}: Fetched ${history.length}, ${messagesToProcess.length} to process.`);

        for (const rawMessage of messagesToProcess) {
          if (shouldStopPastMode) {
            console.log(`PAST: Stop signal received during message processing for source ${sourceChatId}. Aborting this source.`);
            continueFetching = false; // To break outer while loop as well
            break; // Exit for...of loop
          }
          console.log(`PAST: Source ${sourceChatId}: Processing message ID: ${rawMessage.message_id}`);
          let tgcfMessage;
          try {
            tgcfMessage = await executeApplyPlugins(bot, rawMessage);
            if (!tgcfMessage) continue;
            for (const destChatId of destinations) {
              await sendMessage(
                bot, destChatId, tgcfMessage.originalMessage, sourceChatId,
                config.show_forwarded_from, tgcfMessage
              );
            }
            if (config.past.delay && config.past.delay > 0) {
              await delay(config.past.delay);
            }
          } catch (pluginError) {
            console.error(`PAST: Error processing message ${rawMessage.message_id} from ${sourceChatId}:`, pluginError);
          } finally {
            await cleanupTgcfMessageFile(tgcfMessage);
          }
        }
        
        fetchOffsetId = history[history.length - 1].message_id;
        if (fetchOffsetId <= currentOffsetId && currentOffsetId !== 0) {
             console.log(`PAST: Source ${sourceChatId}: Next API offset ${fetchOffsetId} <= target start ${currentOffsetId}. Stopping.`);
             continueFetching = false;
        }
        if (!continueFetching) break;
      } catch (error: any) {
        // ... (existing error handling for getChatHistory: GrammyError, HttpError, generic delay) ...
        console.error(`PAST: Source ${sourceChatId}: Error fetching/processing:`, error);
        if (error instanceof GrammyError) {
          if (error.error_code === 429 || error.parameters?.retry_after) {
            const retryAfter = error.parameters?.retry_after || 60;
            console.warn(`PAST: Flood control: waiting ${retryAfter}s...`);
            await delay(retryAfter * 1000);
          } else if (error.error_code === 400 && error.description.includes("offset_id_invalid")) {
            break; 
          } else if (error.error_code === 401 || error.error_code === 403) {
            break;
          }
        }
        await delay(10000); // Generic delay
      }
    } // end while (continueFetching)
    console.log(`PAST: Source ${sourceChatId}: Finished processing this source.`);
    if (shouldStopPastMode) break; // If stopped, break from main for...of loop
  } // end for...of fromToMap

  if (shouldStopPastMode) {
    console.log('PAST: Past mode job was stopped prematurely.');
    setProcessState('idle', 'Past mode job stopped by user.');
  } else {
    console.log('PAST: Past mode job finished processing all sources.');
    // State update to 'idle' will be handled by startTgcf in main.ts upon completion
  }
  shouldStopPastMode = false; // Reset for future runs
}

export async function stopPastMode(): Promise<void> {
  console.log('PAST: Received stop signal for past mode.');
  shouldStopPastMode = true;
  // Note: This will stop processing before the next batch or source.
  // It doesn't interrupt an ongoing API call or file processing within a message loop.
  // For more immediate stops, more complex cancellation logic would be needed.
}
