const telegramService = require('../services/telegram.service');
const TelegramSession = require('../models/telegramSession.model'); // Not strictly needed here if service handles all DB interaction

exports.connect = async (req, res, next) => {
  const { apiId, apiHash, phoneNumber, sessionName = 'default' } = req.body;
  if (!apiId || !apiHash || !phoneNumber) {
    return res.status(400).json({ message: 'apiId, apiHash, and phoneNumber are required.' });
  }

  try {
    // Check current status first
    const initialStatus = await telegramService.getSessionStatus(sessionName);
    if (initialStatus.status === 'connected') {
      return res.status(200).json({ message: 'Already connected.', user_details: initialStatus.user_details });
    }
    
    // Attempt to initialize with existing session if available and not already connected
    if (initialStatus.status === 'disconnected' && initialStatus.session_string_present) {
        console.log(`Attempting to reconnect existing session: ${sessionName}`);
        const client = await telegramService.initializeClient(apiId, apiHash, null, sessionName); // null session string will force DB load
        if (client) {
            return res.status(200).json({ message: 'Reconnected successfully using stored session.', user_details: client.user_details });
        }
        console.log(`Failed to reconnect session ${sessionName}, proceeding to full authentication.`);
    }


    const authResponse = await telegramService.startAuthentication(apiId, apiHash, phoneNumber, sessionName);
    res.status(200).json(authResponse);
  } catch (error) {
    console.error(`Connect error for session ${sessionName}:`, error);
    // Distinguish between different error types if possible
    if (error.message && error.message.includes('PHONE_NUMBER_INVALID')) {
        return res.status(400).json({ message: 'Phone number invalid.' });
    }
    res.status(500).json({ message: 'Failed to start Telegram connection.', error: error.message });
  }
};

exports.submitCode = async (req, res, next) => {
  const { code, sessionName = 'default' } = req.body;
  if (!code) {
    return res.status(400).json({ message: 'Code is required.' });
  }

  try {
    const result = await telegramService.submitCode(code, sessionName);
    res.status(200).json(result);
  } catch (error) {
    console.error(`Submit code error for session ${sessionName}:`, error);
     if (error.message && error.message.includes('PHONE_CODE_INVALID')) {
        return res.status(400).json({ message: 'Invalid phone code.' });
    }
    res.status(500).json({ message: 'Failed to submit code.', error: error.message });
  }
};

exports.submitPassword = async (req, res, next) => {
  const { password, sessionName = 'default' } = req.body;
  if (!password) {
    return res.status(400).json({ message: 'Password is required.' });
  }

  try {
    const result = await telegramService.submitPassword(password, sessionName);
    res.status(200).json(result);
  } catch (error) {
    console.error(`Submit password error for session ${sessionName}:`, error);
    if (error.message && error.message.includes('PASSWORD_HASH_INVALID')) { // Or similar error from gram.js
        return res.status(400).json({ message: 'Invalid password.' });
    }
    res.status(500).json({ message: 'Failed to submit password.', error: error.message });
  }
};

exports.getStatus = async (req, res, next) => {
  const sessionName = req.query.sessionName || 'default';
  try {
    const status = await telegramService.getSessionStatus(sessionName);
    res.status(200).json(status);
  } catch (error) {
    console.error(`Get status error for session ${sessionName}:`, error);
    res.status(500).json({ message: 'Failed to get session status.', error: error.message });
  }
};

exports.disconnect = async (req, res, next) => {
  const { sessionName = 'default' } = req.body; // Or req.query, depending on preference
  try {
    const result = await telegramService.disconnect(sessionName);
    res.status(200).json(result);
  } catch (error) {
    console.error(`Disconnect error for session ${sessionName}:`, error);
    res.status(500).json({ message: 'Failed to disconnect.', error: error.message });
  }
};

exports.sendMessage = async (req, res, next) => {
  const { recipient, messageText, sessionName = 'default' } = req.body;
  if (!recipient || !messageText) {
    return res.status(400).json({ message: 'Recipient and messageText are required.' });
  }

  try {
    const result = await telegramService.sendMessage(recipient, messageText, sessionName);
    res.status(200).json({ message: 'Message sent successfully.', details: result });
  } catch (error) {
    console.error(`Send message error for session ${sessionName}:`, error);
    res.status(500).json({ message: 'Failed to send message.', error: error.message });
  }
};
