const telegramService = require('./telegram.service');
const configService = require('./config.service');
const pluginService = require('./plugin.service');
const { NewMessage, MessageEdited, MessageDeleted } = require('telegram/events'); // Required for actual gram.js event handling
const logger = require('../utils/logger');

class ForwardingService {
  constructor() {
    this.isRunning = false;
    this.currentMode = null;
    this.liveModeStopFunctions = new Map();
    this.pastModeLoops = new Map();
    // Conceptual store for message IDs: { originalMessageId: { destinationChatId: forwardedMessageId, ... } }
    // This would need persistent storage or a more robust in-memory solution for production.
    this.forwardedMessageMappings = new Map();
    logger.info('ForwardingService initialized');
  }

  async start(mode) {
    if (this.isRunning) {
      logger.warn('ForwardingService is already running.');
      return { success: false, message: 'Service already running.' };
    }

    const config = await configService.getConfig();
    this.currentMode = mode || config.mode || 'live';
    this.isRunning = true;

    logger.info(`ForwardingService starting in ${this.currentMode} mode.`);

    try {
      await pluginService.loadPlugins();
    } catch (error) {
      logger.error({ error }, "Error loading plugins during ForwardingService start. Aborting start.");
      this.isRunning = false;
      return { success: false, message: 'Failed to load plugins.' };
    }


    if (this.currentMode === 'live') {
      await this._startLiveMode();
    } else if (this.currentMode === 'past') {
      await this._startPastMode();
    }
    logger.info(`ForwardingService started successfully in ${this.currentMode} mode.`);
    return { success: true, message: `Service started in ${this.currentMode} mode.` };
  }

  async stop() {
    if (!this.isRunning) {
      logger.warn('ForwardingService is not running.');
      return { success: false, message: 'Service not running.' };
    }

    logger.info('ForwardingService stopping...');
    this.isRunning = false;

    this.liveModeStopFunctions.forEach(async (client, sessionName) => {
      try {
        // Assuming client.removeEventHandler needs the specific handler function and event class
        // This is complex as handlers are anonymous. A better way is to manage handlers explicitly.
        // For now, disconnect should stop event processing.
        // If gram.js client.disconnect() doesn't remove handlers, this needs refinement.
        logger.info(`Removing event handlers conceptually for session: ${sessionName}. Actual removal may depend on client disconnect behavior.`);
        await client.disconnect();            // Close socket
        client.removeEventHandlers();         // gram.js helper, or keep explicit refs (preferred)
      } catch (error) {
        logger.error({ error, sessionName }, `Error stopping live mode for session ${sessionName}`);
      }
    });
    this.liveModeStopFunctions.clear();

    this.pastModeLoops.forEach((_, key) => this.pastModeLoops.set(key, false));

    this.currentMode = null;
    logger.info('ForwardingService stopped.');
    return { success: true, message: 'Service stopped.' };
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentMode: this.currentMode,
      activeLiveSessions: Array.from(this.liveModeStopFunctions.keys()),
      activePastTasks: Array.from(this.pastModeLoops.keys()).filter(key => this.pastModeLoops.get(key)),
      // Add more detailed status if needed, e.g., plugin load status
    };
  }

  async _handleNewLiveMessage(rawGramJsEventMessage, sessionName) {
    if (!this.isRunning || this.currentMode !== 'live') return;

    logger.debug({ messageId: rawGramJsEventMessage.id, chatId: rawGramJsEventMessage.chatId?.toString(), sessionName }, 'New live message received.');

    const client = await telegramService.getClient(sessionName);
    if (!client) {
      logger.error({ sessionName, messageId: rawGramJsEventMessage.id }, `[Live Mode] Could not get client for message processing.`);
      return;
    }

    let tgcfMessage = {
      text: rawGramJsEventMessage.text || rawGramJsEventMessage.message || "",
      raw_text: rawGramJsEventMessage.text || rawGramJsEventMessage.message || "",
      message_id: rawGramJsEventMessage.id,
      chat_id: rawGramJsEventMessage.chatId?.toString(),
      sender_id: rawGramJsEventMessage.senderId?.toString() || rawGramJsEventMessage.fromId?.toString(),
      file: rawGramJsEventMessage.media ? this._transformGramJsMedia(rawGramJsEventMessage.media, client, rawGramJsEventMessage.chatId) : null,
      entities: rawGramJsEventMessage.entities,
      is_reply_to: rawGramJsEventMessage.replyTo?.replyToMsgId,
      client: client,
      original_message: rawGramJsEventMessage,
      custom_data: {},
      _drop: false,
    };

    let processedTgcfMessage;
    try {
      processedTgcfMessage = await pluginService.applyPlugins(tgcfMessage);
    } catch (pluginError) {
      logger.error({ pluginError, messageId: tgcfMessage.message_id, sessionName }, "[Live Mode] Error applying plugins.");
      // Decide if to drop or forward original: for now, forward original if plugins fail critically
      processedTgcfMessage = tgcfMessage; // Forward original on critical plugin system error
    }


    if (processedTgcfMessage === null || processedTgcfMessage._drop) {
      logger.info({ messageId: tgcfMessage.message_id, sessionName }, `[Live Mode] Message dropped by a plugin or explicitly.`);
      return;
    }

    logger.debug({ messageId: processedTgcfMessage.message_id, sessionName, newText: processedTgcfMessage.text }, `[Live Mode] Message processed by plugins.`);
    const config = await configService.getConfig();

    for (const forwardRule of config.forwards) {
      if (!forwardRule.use_this || forwardRule.con_name !== sessionName) continue;

      const sources = Array.isArray(forwardRule.source) ? forwardRule.source.map(String) : [String(forwardRule.source)];
      const messageChatIdStr = String(processedTgcfMessage.chat_id);

      if (sources.includes(messageChatIdStr)) {
        logger.info({ sourceChatId: messageChatIdStr, destinations: forwardRule.destinations, sessionName, messageId: processedTgcfMessage.message_id }, `[Live Mode] Matching forward rule.`);
        for (const destination of forwardRule.destinations) {
          try {
            // Prepare message text, possibly with "Forwarded from" header
            let textToSend = processedTgcfMessage.text;
            if (config.show_forwarded_from) {
              const senderInfo = processedTgcfMessage.sender_id ? `user ${processedTgcfMessage.sender_id}` : `chat ${messageChatIdStr}`;
              // Note: Markdown for header might be complex if original text is also markdown.
              // For simplicity, using plain text header. Plugins can format this better.
              textToSend = `Forwarded from ${senderInfo}:\n${processedTgcfMessage.text}`;
            }

            // Create a new TgcfMessage for sending, inheriting relevant properties
            const messageToSendPayload = {
              ...processedTgcfMessage, // carries file info, entities, etc.
              text: textToSend, // use the potentially prefixed text
            };

            const sentMessage = await telegramService.sendMessage(destination, messageToSendPayload, sessionName);
            logger.info({ destination, originalMsgId: processedTgcfMessage.message_id, sentMsgId: sentMessage.id, sessionName }, `[Live Mode] Message forwarded successfully.`);
            // Store mapping (conceptual)
            // this._storeForwardedMapping(processedTgcfMessage.message_id, destination, sentMessage.id);

          } catch (error) {
            logger.error({ error, destination, originalMsgId: processedTgcfMessage.message_id, sessionName }, `[Live Mode] Error forwarding message.`);
          }
        }
      }
    }
  }

  async _startLiveMode() {
    logger.info('[Live Mode] Starting...');
    const globalConfig = await configService.getConfig();

    const forwardsByConnection = globalConfig.forwards.reduce((acc, rule) => {
      if (rule.use_this) {
        acc[rule.con_name] = acc[rule.con_name] || [];
        acc[rule.con_name].push(rule);
      }
      return acc;
    }, {});

    for (const sessionName in forwardsByConnection) {
      if (!this.isRunning) break;
      try {
        const client = await telegramService.getClient(sessionName);
        if (client && client.connected) {
          const newMessageHandler = (event) => this._handleNewLiveMessage(event.message, sessionName);
          const editedMessageHandler = (event) => this._handleEditedLiveMessage(event.message, sessionName);
          const deletedMessageHandler = (event) => this._handleDeletedLiveMessage(event.deletedIds, event.chatId, sessionName);

          client.addEventHandler(newMessageHandler, new NewMessage({ chats: forwardsByConnection[sessionName].map(r => r.source) }));
          client.addEventHandler(editedMessageHandler, new MessageEdited({ chats: forwardsByConnection[sessionName].map(r => r.source) }));
          // MessageDeleted event might need broader chat scope if deletions are for any message in a chat where source is.
          // For now, limiting to source chats.
          client.addEventHandler(deletedMessageHandler, new MessageDeleted({ chats: forwardsByConnection[sessionName].map(r => r.source) }));

          this.liveModeStopFunctions.set(sessionName, client); // Store client to manage handlers later if needed
          logger.info(`[Live Mode] Attached message handlers (new, edited, deleted) for session: ${sessionName}`);
        } else {
          logger.warn(`[Live Mode] Client for session ${sessionName} is not connected. Skipping live message handling.`);
        }
      } catch (error) {
        logger.error({ error, sessionName }, `[Live Mode] Failed to setup client or attach handlers for session ${sessionName}`);
      }
    }
    if (this.liveModeStopFunctions.size === 0) {
      logger.warn("[Live Mode] No active sessions with 'use_this: true' forwards found to attach handlers.");
    }
  }

  async _handleEditedLiveMessage(rawGramJsEventMessage, sessionName) {
    if (!this.isRunning || this.currentMode !== 'live') return;
    logger.info({ messageId: rawGramJsEventMessage.id, chatId: rawGramJsEventMessage.chatId?.toString(), sessionName }, 'MessageEdited event received.');
    // Conceptual: Find original forwarded message IDs using this.forwardedMessageMappings
    // For now, just log. Full implementation is complex.
    // Example:
    // const mappings = this.forwardedMessageMappings.get(rawGramJsEventMessage.id);
    // if (mappings) {
    //   let tgcfMessage = { /* ... construct ITgcfMessage from rawGramJsEventMessage ... */ text: rawGramJsEventMessage.text };
    //   const processedTgcfMessage = await pluginService.applyPlugins(tgcfMessage);
    //   if (processedTgcfMessage && !processedTgcfMessage._drop) {
    //     for (const [destChatId, fwdMsgId] of Object.entries(mappings)) {
    //       await telegramService.editMessage(destChatId, fwdMsgId, processedTgcfMessage, sessionName);
    //     }
    //   }
    // }
  }

  async _handleDeletedLiveMessage(deletedIds, chatId, sessionName) {
    if (!this.isRunning || this.currentMode !== 'live') return;
    logger.info({ deletedIds, chatId: chatId?.toString(), sessionName }, 'MessageDeleted event received.');
    // Conceptual: Find original forwarded message IDs using this.forwardedMessageMappings
    // For now, just log.
    // Example:
    // for (const originalMsgId of deletedIds) {
    //   const mappings = this.forwardedMessageMappings.get(originalMsgId);
    //   if (mappings) {
    //     for (const [destChatId, fwdMsgId] of Object.entries(mappings)) {
    //       await telegramService.deleteMessages(destChatId, [fwdMsgId], sessionName);
    //     }
    //     this.forwardedMessageMappings.delete(originalMsgId); // Clean up mapping
    //   }
    // }
  }

  async _startPastMode() {
    logger.info('[Past Mode] Starting...');
    const globalConfig = await configService.getConfig();
    const delayMs = globalConfig.past_settings.delay || 100;

    for (const forwardRule of globalConfig.forwards) {
      if (!this.isRunning) break;
      if (!forwardRule.use_this) continue;

      const ruleId = `${forwardRule.con_name}_${String(forwardRule.source)}`;
      this.pastModeLoops.set(ruleId, true);

      (async () => {
        logger.info({ ruleId, source: forwardRule.source, destinations: forwardRule.destinations, sessionName: forwardRule.con_name }, `[Past Mode] Starting rule processing.`);
        let currentOffset = forwardRule.offset || 0;

        const client = await telegramService.getClient(forwardRule.con_name);
        if (!client) {
          logger.error({ ruleId, sessionName: forwardRule.con_name }, `[Past Mode] Could not get client. Skipping rule.`);
          this.pastModeLoops.set(ruleId, false);
          return;
        }

        while (this.isRunning && this.pastModeLoops.get(ruleId)) {
          try {
            const rawMessages = await telegramService.getMessages(
              forwardRule.source,
              { offsetId: currentOffset, limit: globalConfig.past_settings.limit_per_fetch || 20, reverse: true },
              forwardRule.con_name
            );

            if (!rawMessages || rawMessages.length === 0) {
              logger.info({ ruleId, source: forwardRule.source, offset: currentOffset }, `[Past Mode] No more messages found.`);
              break;
            }
            logger.info({ ruleId, count: rawMessages.length, source: forwardRule.source, offset: currentOffset }, `[Past Mode] Fetched messages.`);


            for (const rawMessage of rawMessages) {
              if (!this.isRunning || !this.pastModeLoops.get(ruleId)) break;

              let tgcfMessage = {
                text: rawMessage.text || rawMessage.message || "",
                raw_text: rawMessage.text || rawMessage.message || "",
                message_id: rawMessage.id,
                chat_id: rawMessage.original_message.chatId?.toString(),
                sender_id: rawMessage.senderId, // Already string from getMessages
                file: rawMessage.media ? this._transformGramJsMedia(rawMessage.media, client, rawMessage.original_message.chatId) : null,
                entities: rawMessage.entities,
                is_reply_to: rawMessage.replyToMsgId,
                client: client,
                original_message: rawMessage.original_message,
                custom_data: {},
                _drop: false,
              };

              let processedTgcfMessage;
              try {
                processedTgcfMessage = await pluginService.applyPlugins(tgcfMessage);
              } catch (pluginError) {
                logger.error({ pluginError, ruleId, messageId: tgcfMessage.message_id }, "[Past Mode] Error applying plugins.");
                processedTgcfMessage = tgcfMessage; // Forward original on critical plugin system error
              }


              if (processedTgcfMessage === null || processedTgcfMessage._drop) {
                logger.info({ ruleId, messageId: rawMessage.id }, `[Past Mode] Message dropped by plugin.`);
                currentOffset = rawMessage.id;
                continue;
              }

              logger.debug({ ruleId, messageId: processedTgcfMessage.message_id }, `[Past Mode] Processing message.`);
              for (const destination of forwardRule.destinations) {
                try {
                  let textToSend = processedTgcfMessage.text;
                  if (globalConfig.show_forwarded_from) {
                    const senderInfo = processedTgcfMessage.sender_id ? `user ${processedTgcfMessage.sender_id}` : `chat ${forwardRule.source}`;
                    textToSend = `Forwarded from ${senderInfo} (Past):\n${processedTgcfMessage.text}`;
                  }
                  const messageToSendPayload = { ...processedTgcfMessage, text: textToSend };

                  await telegramService.sendMessage(destination, messageToSendPayload, forwardRule.con_name);
                  logger.info({ ruleId, messageId: processedTgcfMessage.message_id, destination }, `[Past Mode] Forwarded message.`);
                } catch (sendError) {
                  logger.error({ sendError, ruleId, messageId: processedTgcfMessage.message_id, destination }, `[Past Mode] Error forwarding message.`);
                }
              }
              currentOffset = processedTgcfMessage.message_id;

              // Update offset in config
              // Acknowledged: This updates the entire config. A more targeted update would be better.
              const currentGlobalConfigForOffset = await configService.getConfig();
              const updatedForwards = currentGlobalConfigForOffset.forwards.map(fr => {
                if (String(fr.source) === String(forwardRule.source) && fr.con_name === forwardRule.con_name) {
                  return { ...fr, offset: currentOffset.toString() };
                }
                return fr;
              });
              await configService.updateConfig({ ...currentGlobalConfigForOffset, forwards: updatedForwards });
              logger.debug({ ruleId, newOffset: currentOffset, source: forwardRule.source }, `[Past Mode] Updated offset.`);

              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            if (!this.isRunning || !this.pastModeLoops.get(ruleId)) break;
          } catch (error) {
            logger.error({ error, ruleId, source: forwardRule.source }, `[Past Mode] Error processing messages. Retrying in 5s.`);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        this.pastModeLoops.delete(ruleId);
        logger.info({ ruleId, source: forwardRule.source }, `[Past Mode] Finished rule processing.`);
      })();
    }
    if (Array.from(this.pastModeLoops.keys()).filter(k => this.pastModeLoops.get(k)).length === 0) {
      logger.warn("[Past Mode] No 'use_this: true' forward rules found or could be processed.");
    }
  }

  _transformGramJsMedia(media, client, chatId) {
    if (!media) return null;

    let type = 'unknown';
    let fileId = media.id?.toString(); // This is often not the 'file_id' needed for re-upload. It's more of an internal ID.
    let fileName = null;
    let caption = media.caption || null;

    // Helper to extract file name from document attributes
    const getFileName = (doc) => doc.attributes?.find(attr => attr.className === 'DocumentAttributeFilename')?.fileName;

    if (media.photo) {
      type = 'photo';
      // For photos, gram.js provides different sizes. `media.photo` is usually the largest.
      // `media.photo.id` is an internal ID. For re-uploading, you often need the raw `InputFile` or `InputMedia`.
      // `raw_media` will store the original gram.js media object for `TelegramService.sendMessage`.
    } else if (media.document) {
      type = 'document';
      fileName = getFileName(media.document);
    } else if (media.webpage && media.webpage.photo) {
      type = 'photo'; // Webpage preview image
    } else if (media.webpage && media.webpage.document) {
      type = 'document';
      fileName = getFileName(media.webpage.document);
    }
    // Add more types: video, voice, sticker, etc.
    // e.g. if (media.video) { type = 'video'; fileName = getFileName(media.video); }

    return {
      id: fileId, // Internal ID, primarily for reference
      path: null,
      newPath: null, // To be set by plugins if they want to upload a new file
      fileName: fileName, // Extracted filename, can be overridden by plugins
      type: type,
      caption: caption, // Can be modified by plugins
      raw_media: media, // The original gram.js media object. Crucial for forwarding.
      // Conceptual download function - would use client.downloadFile
      download: async () => {
        if (!media || !client) {
          logger.warn('Cannot download: media or client not available.');
          return null;
        }
        try {
          // This is highly dependent on the structure of 'media' and what client.downloadFile expects.
          // It might need media.photo, media.document, etc.
          // Also, gram.js download methods might require more specific input than just the media object.
          // Example: const buffer = await client.downloadMedia(media, { /* options */ });
          // Then save buffer to a temp file.
          logger.warn('Conceptual download: Actual implementation needs gram.js specifics for media download.');
          return "/tmp/downloaded_file_placeholder"; // Placeholder
        } catch (err) {
          logger.error({ err, fileId }, "Error downloading file conceptually.");
          return null;
        }
      },
      update(newLocalPath, newFileName) {
        this.newPath = newLocalPath;
        if (newFileName) this.fileName = newFileName;
        logger.info({ newLocalPath, newFileName }, "File path updated by plugin for re-upload.");
      }  
    }
  };
}


module.exports = new ForwardingService();
