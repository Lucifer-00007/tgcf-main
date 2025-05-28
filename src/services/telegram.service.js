const { TelegramClient, sessions, types } = require('gram'); // Added types for DocumentAttributeFilename
const { StringSession } = sessions;
const TelegramSession = require('../models/telegramSession.model');
const input = require('input'); // For handling interactive input, will be replaced by API calls
const logger = require('../utils/logger');

class TelegramService {
  constructor() {
    this.activeClients = new Map();
    this.authStates = new Map(); // Stores { resolvePromise, rejectPromise } for pending inputs
    this.newMessageHandlers = new Map(); // sessionName -> handler
  }

  // Method to register a new message handler for a session
  onNewMessage(handler, sessionName = 'default') {
    this.newMessageHandlers.set(sessionName, handler);
    // If client is already active, attach handler (implementation detail for gram.js)
    const client = this.activeClients.get(sessionName);
    if (client && client.connected) { // Or client.isconnected()
      this._attachMessageHandler(client, sessionName);
    }
  }

  _attachMessageHandler(client, sessionName) {
    const handler = this.newMessageHandlers.get(sessionName);
    if (handler) {
      // gram.js specific: client.addEventHandler(handler, new NewMessage({}));
      // This needs to be correctly implemented with gram.js event handling
      // For now, this is a conceptual placeholder.
      // Actual implementation would look like:
      // client.addEventHandler(async (event) => {
      //   const message = event.message;
      //   // Simplify message object if needed
      //   const simplifiedMessage = {
      //     id: message.id,
      //     text: message.text || message.message,
      //     chatId: message.chatId?.toString(), // Or however chatId is obtained
      //     // Add other relevant fields: senderId, date, etc.
      //   };
      //   handler(simplifiedMessage);
      // }, new NewMessage({})); // Ensure NewMessage is imported from gram
      logger.debug(`Message handler conceptually attached for session: ${sessionName}. Needs gram.js NewMessage event.`);
    }
  }


  async getClient(sessionName = 'default') {
    if (this.activeClients.has(sessionName)) {
      const client = this.activeClients.get(sessionName);
      if (client.connected) { // Or client.isconnected() depending on gram.js version
        return client;
      }
    }

    const sessionData = await TelegramSession.findOne({ session_name: sessionName });
    if (sessionData && sessionData.session_string) {
      return this.initializeClient(sessionData.api_id, sessionData.api_hash, sessionData.session_string, sessionName);
    }
    return null; // No active client and no stored session
  }

  async initializeClient(apiId, apiHash, sessionString, sessionName = 'default') {
    if (this.activeClients.has(sessionName) && this.activeClients.get(sessionName).connected) {
        return this.activeClients.get(sessionName);
    }

    const client = new TelegramClient(new StringSession(sessionString), parseInt(apiId), apiHash, {
      connectionRetries: 5,
    });

    try {
      await client.connect();
      if (client.connected) { // Or client.isconnected()
        this.activeClients.set(sessionName, client);
        this._attachMessageHandler(client, sessionName); // Attach handler on connect/reconnect
        const me = await client.getMe();
        await TelegramSession.findOneAndUpdate(
          { session_name: sessionName },
          {
            api_id: apiId,
            api_hash: apiHash,
            session_string: client.session.save(),
            user_details: {
              user_id: me.id.toString(),
              is_bot: me.bot,
              username: me.username,
            },
            last_connected_at: new Date(),
          },
          { upsert: true, new: true }
        );
        logger.info({ sessionName, username: me.username, userId: me.id?.toString() }, `Client connected for session: ${sessionName}`);
        return client;
      }
    } catch (error) {
      logger.error({ error, sessionName }, `Failed to initialize client for session ${sessionName}`);
      // Remove client if connection failed
      if (this.activeClients.has(sessionName)) {
        this.activeClients.delete(sessionName);
      }
      // Optionally, clear the session string from DB if it's invalid
      // await TelegramSession.findOneAndUpdate({ session_name: sessionName }, { session_string: null });
      throw error; // Rethrow to be handled by the caller
    }
    return null;
  }

  async startAuthentication(apiId, apiHash, phoneNumber, sessionName = 'default') {
    if (this.activeClients.has(sessionName) && this.activeClients.get(sessionName).connected) {
      return { status: 'already_connected', message: 'Client is already connected.' };
    }
    
    const client = new TelegramClient(new StringSession(''), parseInt(apiId), apiHash, { // Start with empty session
      connectionRetries: 5,
    });

    this.activeClients.set(sessionName, client); // Store client temporarily
    this.authStates.set(sessionName, { currentStep: 'phone_number', client }); // Track auth state

    try {
      await TelegramSession.findOneAndUpdate(
        { session_name: sessionName },
        { api_id: apiId, api_hash: apiHash, session_string: '', user_details: null }, // Clear old session string
        { upsert: true, new: true }
      );

      // gram.js client.start is interactive. We need to manage this.
      // The `phoneNumber` is passed directly.
      // `phoneCode` and `password` will be handled by separate promise-based methods.
      
      logger.info({ sessionName, phoneNumber }, `Starting authentication for ${sessionName}`);

      // This promise will be resolved by submitCode or submitPassword
      const phoneCodePromise = () => new Promise((resolve, reject) => {
        this.authStates.set(sessionName, { ...this.authStates.get(sessionName), currentStep: 'phone_code', resolvePromise: resolve, rejectPromise: reject });
      });

      const passwordPromise = (hint) => new Promise((resolve, reject) => {
        this.authStates.set(sessionName, { ...this.authStates.get(sessionName), currentStep: 'password', hint, resolvePromise: resolve, rejectPromise: reject });
      });
      
      // Start the client connection process
      // We call client.connect() first, then client.signIn() or client.start()
      // client.start() is a bit high level, let's try client.signInUser() for more control if available,
      // or manage client.start()'s interactive prompts.
      // For now, let's assume client.start() is the way and we manage its interactive parts.

      // Store the client for later use in submitCode/submitPassword
      this.activeClients.set(sessionName, client);
      
      // gram.js can be tricky with its interactive prompts.
      // The typical flow is: client.start() -> asks for phone -> asks for code -> asks for password (if 2FA)
      // We need to provide these values via our API.
      
      // We will call client.connect() first, then handle signIn steps.
      await client.connect(); // Initial connection

      // The `sendCode` request.
      await client.sendCode(
        { apiId: parseInt(apiId), apiHash: apiHash },
        phoneNumber
      );
      
      this.authStates.set(sessionName, { ...this.authStates.get(sessionName), currentStep: 'phone_code_sent', phoneNumber });
      return { status: 'code_required', message: 'Phone code has been sent.' };

    } catch (error) {
      logger.error({ error, sessionName }, `Authentication error for ${sessionName}`);
      this.activeClients.delete(sessionName); // Clean up
      this.authStates.delete(sessionName);
      if (error.message && error.message.includes('SESSION_PASSWORD_NEEDED')) {
        logger.warn({ sessionName }, `Password needed for session ${sessionName}`);
        this.authStates.set(sessionName, { ...this.authStates.get(sessionName), currentStep: 'password_needed' });
        return { status: 'password_required', message: 'Password is required for 2FA.'};
      }
      throw error;
    }
  }


  async submitCode(code, sessionName = 'default') {
    const authState = this.authStates.get(sessionName);
    if (!authState || (authState.currentStep !== 'phone_code_sent' && authState.currentStep !== 'phone_code')) { // Allow direct code submission if we know it's needed
      throw new Error('Not expecting a phone code at this stage or session not found.');
    }
    
    const client = this.activeClients.get(sessionName);
    if(!client) throw new Error('Client not found for session.');

    const { phoneNumber } = authState; // Retrieve stored phone number

    try {
      // The user is signed in after providing the code
      await client.signIn(phoneNumber, code); // gram.js might have client.signInUser or similar

      // If successful, save session and update DB
      const me = await client.getMe();
      const sessionString = client.session.save();

      await TelegramSession.findOneAndUpdate(
        { session_name: sessionName },
        {
          session_string: sessionString,
          user_details: {
            user_id: me.id.toString(),
            is_bot: me.bot,
            username: me.username,
          },
          last_connected_at: new Date(),
        },
        { new: true }
      );
      
      this.activeClients.set(sessionName, client); // Ensure it's stored as active
      this.authStates.delete(sessionName); // Auth complete
      logger.info({ sessionName, userId: me.id?.toString(), username: me.username }, `Successfully submitted code for session ${sessionName}.`);
      return { status: 'connected', message: 'Successfully connected and session saved.', userId: me.id };
    } catch (error) {
      logger.error({ error, sessionName }, `Error submitting code for ${sessionName}`);
      if (error.message && error.message.includes('SESSION_PASSWORD_NEEDED')) {
        // This means 2FA is enabled.
        logger.info({ sessionName }, `Password required for session ${sessionName} after submitting code.`);
        this.authStates.set(sessionName, { ...authState, currentStep: 'password_needed' });
        return { status: 'password_required', message: 'Password is required (2FA).' };
      }
      // Potentially clean up client and authState if error is fatal
      // this.activeClients.delete(sessionName);
      // this.authStates.delete(sessionName);
      throw error;
    }
  }

  async submitPassword(password, sessionName = 'default') {
    const authState = this.authStates.get(sessionName);
    if (!authState || authState.currentStep !== 'password_needed') {
      throw new Error('Not expecting a password at this stage or session not found.');
    }

    const client = this.activeClients.get(sessionName);
    if(!client) throw new Error('Client not found for session.');

    try {
      // This uses the password to complete the sign-in after a SESSION_PASSWORD_NEEDED error
      await client.signIn({ password });

      const me = await client.getMe();
      const sessionString = client.session.save();

      await TelegramSession.findOneAndUpdate(
        { session_name: sessionName },
        {
          session_string: sessionString,
          user_details: {
            user_id: me.id.toString(),
            is_bot: me.bot,
            username: me.username,
          },
          last_connected_at: new Date(),
        },
        { new: true }
      );
      
      this.activeClients.set(sessionName, client);
      this.activeClients.set(sessionName, client);
      this.authStates.delete(sessionName); // Auth complete
      logger.info({ sessionName, userId: me.id?.toString(), username: me.username }, `Successfully submitted password for session ${sessionName}.`);
      return { status: 'connected', message: 'Successfully connected with 2FA and session saved.', userId: me.id };
    } catch (error) {
      logger.error({ error, sessionName }, `Error submitting password for ${sessionName}`);
      // Potentially clean up client and authState if error is fatal
      // this.activeClients.delete(sessionName);
      // this.authStates.delete(sessionName);
      throw error;
    }
  }

  async getSessionStatus(sessionName = 'default') {
    const client = this.activeClients.get(sessionName);
    const sessionData = await TelegramSession.findOne({ session_name: sessionName });

    if (client && client.connected) { // Or client.isconnected()
      return {
        status: 'connected',
        user_details: sessionData ? sessionData.user_details : null,
        session_string_present: !!(sessionData && sessionData.session_string),
        last_connected_at: sessionData ? sessionData.last_connected_at : null,
      };
    }
    // If not active, check if we have a stored session that could be used to connect
    if (sessionData && sessionData.session_string) {
      return {
        status: 'disconnected',
        message: 'Client is disconnected but a session string exists. Try connecting.',
        user_details: sessionData.user_details,
        session_string_present: true,
        last_connected_at: sessionData.last_connected_at,
      };
    }
    return {
      status: 'not_found',
      message: 'No active session or stored session string found.',
      user_details: null,
      session_string_present: false,
    };
  }

  async disconnect(sessionName = 'default') {
    const client = this.activeClients.get(sessionName);
    if (client) {
      try {
        logger.info({ sessionName }, `Disconnecting client for session ${sessionName}`);
        await client.disconnect();
      } catch (error) {
        logger.error({ error, sessionName }, `Error during disconnect for session ${sessionName}`);
      } finally {
        this.activeClients.delete(sessionName);
        this.authStates.delete(sessionName);
      }
    }
    logger.info({ sessionName }, `Clearing session data in DB for ${sessionName}`);
    await TelegramSession.findOneAndUpdate(
      { session_name: sessionName },
      { session_string: null, user_details: null, last_connected_at: new Date() }
    );
    return { status: 'disconnected', message: 'Client disconnected and session cleared.' };
  }

  async sendMessage(recipient, tgcfMessage, sessionName = 'default') {
    const client = await this.getClient(sessionName);
    if (!client) {
      logger.error(`Cannot send message: Client for session '${sessionName}' not available or not connected.`);
      throw new Error(`Client for session '${sessionName}' not available or not connected.`);
    }

    const options = { parseMode: 'markdown' }; // Default parseMode

    if (tgcfMessage.is_reply_to) {
        options.replyTo = tgcfMessage.is_reply_to;
    }
    
    if (tgcfMessage.entities) { // Entities from tgcfMessage should be in gram.js format
        options.formattingEntities = tgcfMessage.entities;
        delete options.parseMode; // Don't use markdown if entities are present
    }

    let messageTextContent = tgcfMessage.text || ""; // Ensure it's a string

    if (tgcfMessage.file) {
        options.caption = messageTextContent; // Text becomes caption
        if (tgcfMessage.file.newPath) { // Plugin wants to upload a new file
            logger.info({ recipient, sessionName, newFilePath: tgcfMessage.file.newPath, caption: options.caption }, 'Sending new file provided by plugin.');
            options.file = tgcfMessage.file.newPath; 
            if (tgcfMessage.file.fileName) {
                options.attributes = (options.attributes || []);
                options.attributes.push(new types.DocumentAttributeFilename({ fileName: tgcfMessage.file.fileName }));
            }
        } else if (tgcfMessage.file.raw_media) { // Forwarding original file
            logger.info({ recipient, sessionName, fileId: tgcfMessage.file.id, caption: options.caption }, 'Forwarding original file using raw_media.');
            options.file = tgcfMessage.file.raw_media; 
        }
        // If a file is being sent, options.message (main text) should be cleared.
        delete options.message; 
    } else {
        // No file, just a text message
        options.message = messageTextContent;
    }
    
    try {
      logger.debug({ recipient, options: {...options, file: options.file ? 'Present' : 'Not Present'}, sessionName }, 'Attempting to send message.');
      const result = await client.sendMessage(recipient, options);
      logger.info({ recipient, messageId: result.id, sessionName }, 'Message sent successfully.');
      return result;
    } catch (error) {
      const errorDetails = {
        errorMessage: error.message,
        errorCode: error.code,
        errorType: error.constructor.name,
        hasFile: !!options.file,
        hasCaption: !!options.caption,
        textLength: options.message ? options.message.length : (options.caption ? options.caption.length : 0),
        recipient,
        sessionName,
      };
      logger.error({ error: errorDetails, originalErrorStack: error.stack }, `Failed to send message via session ${sessionName}`);
      throw error;
    }
  }

  async getMessages(chatId, options = {}, sessionName = 'default') {
    const client = await this.getClient(sessionName);
    if (!client) {
      logger.error(`Cannot get messages: Client for session '${sessionName}' not available or not connected.`);
      throw new Error(`Client for session '${sessionName}' not available or not connected.`);
    }

    logger.debug({ chatId, options, sessionName }, `Fetching messages for chat ${chatId}`);

    const gramJsOptions = {
      limit: options.limit === undefined ? 100 : options.limit,
      offsetId: options.offsetId === undefined ? 0 : options.offsetId,
      reverse: options.reverse === undefined ? true : options.reverse,
      addOffset: options.addOffset === undefined ? 0 : options.addOffset,
      minId: options.minId === undefined ? 0 : options.minId,
      maxId: options.maxId === undefined ? 0 : options.maxId,
      fromUser: options.fromUser, // Pass fromUser if provided
    };

    try {
      const rawMessages = await client.getMessages(chatId, gramJsOptions);
      logger.info(`Fetched ${rawMessages.length} messages for chat ${chatId} on session ${sessionName}.`);
      
      return rawMessages.map(msg => ({ // Transform to our simplified structure
        id: msg.id,
        text: msg.text || msg.message || "",
        senderId: msg.senderId?.toString() || msg.fromId?.toString(), // Ensure senderId is a string
        date: msg.date,
        replyToMsgId: msg.replyTo?.replyToMsgId,
        entities: msg.entities, // Keep entities for formatting
        media: msg.media, // Keep raw media object, ForwardingService will transform it
        original_message: msg, // Keep the full gram.js message object for plugins or deeper inspection
      }));
    } catch (error) {
      logger.error({ error, chatId, sessionName }, `Failed to get messages for chat ${chatId}`);
      throw error; 
    }
  }

  async editMessage(chatId, messageId, newTgcfMessage, sessionName = 'default') {
    const client = await this.getClient(sessionName);
    if (!client) {
      logger.error(`Cannot edit message: Client for session '${sessionName}' not available or not connected.`);
      throw new Error(`Client for session '${sessionName}' not available or not connected.`);
    }
    try {
      const editOptions = { text: newTgcfMessage.text };
      if (newTgcfMessage.entities) { // Check if entities are present in the processed message
        editOptions.entities = newTgcfMessage.entities; // Use these entities
        delete editOptions.parseMode; // Remove default parseMode if entities are used
      } else {
        editOptions.parseMode = 'markdown'; // Fallback to markdown if no entities
      }

      logger.info({ chatId, messageId, newText: newTgcfMessage.text, sessionName }, `Editing message.`);
      return await client.editMessage(chatId, { message: messageId, ...editOptions });
    } catch (error) {
      logger.error({ error, chatId, messageId, sessionName }, `Failed to edit message.`);
      throw error;
    }
  }

  async deleteMessages(chatId, messageIds, sessionName = 'default') {
    const client = await this.getClient(sessionName);
    if (!client) {
      logger.error(`Cannot delete message(s): Client for session '${sessionName}' not available or not connected.`);
      throw new Error(`Client for session '${sessionName}' not available or not connected.`);
    }
    try {
      const idsToDelete = Array.isArray(messageIds) ? messageIds : [messageIds];
      logger.info({ chatId, messageIds: idsToDelete, sessionName }, `Deleting message(s).`);
      // Assuming client.deleteMessages is the correct method and it takes an array of IDs.
      return await client.deleteMessages(chatId, idsToDelete, { revoke: true }); // revoke: true for all users
    } catch (error) {
      logger.error({ error, chatId, messageIds, sessionName }, `Failed to delete message(s).`);
      throw error;
    }
  }

  _registerGenericEventHandlers(client, sessionName) {
    // Example:
    // client.addEventHandler(async (event) => {
    //   if (event instanceof MessageEdited.Event) { // MessageEdited needs to be imported from gram/events
    //     logger.info({ sessionName, messageId: event.message.id }, 'MessageEdited event received by TelegramService');
    //     // this.messageEditedHandler(sessionName, event.message); // Call a specific handler if TelegramService directly manages this
    //   } else if (event instanceof MessageDeleted.Event) { // MessageDeleted needs to be imported
    //      logger.info({ sessionName, deletedIds: event.deletedIds }, 'MessageDeleted event received by TelegramService');
    //     // this.messageDeletedHandler(sessionName, event.deletedIds);
    //   }
    // }, new Raw({})); // Raw needs to be imported from gram/events
    logger.info(`Conceptual: Event handlers for edits/deletes would be registered for session ${sessionName}.`);
  }
}

module.exports = new TelegramService();
