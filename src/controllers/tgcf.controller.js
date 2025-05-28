const forwardingService = require('../services/forwarding.service');

exports.startTgcf = async (req, res, next) => {
  try {
    const mode = req.body.mode; // 'live', 'past', or undefined (service will use config default)
    const result = await forwardingService.start(mode);
    if (result.success) {
      res.status(200).json({ message: result.message || 'TGCF service started successfully.' });
    } else {
      // If service was already running, it's not necessarily a client error,
      // but more of a state conflict. 409 Conflict might be appropriate.
      res.status(409).json({ message: result.message || 'TGCF service might be already running or failed to start.' });
    }
  } catch (error) {
    console.error('Error starting TGCF service:', error);
    res.status(500).json({ message: 'Failed to start TGCF service.', error: error.message });
  }
};

exports.stopTgcf = async (req, res, next) => {
  try {
    const result = await forwardingService.stop();
     if (result.success) {
      res.status(200).json({ message: result.message || 'TGCF service stopped successfully.' });
    } else {
      res.status(409).json({ message: result.message || 'TGCF service might not be running or failed to stop.' });
    }
  } catch (error) {
    console.error('Error stopping TGCF service:', error);
    res.status(500).json({ message: 'Failed to stop TGCF service.', error: error.message });
  }
};

exports.getTgcfStatus = async (req, res, next) => {
  try {
    const status = forwardingService.getStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting TGCF service status:', error);
    res.status(500).json({ message: 'Failed to get TGCF service status.', error: error.message });
  }
};
