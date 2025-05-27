import express, { Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getConfig, initializeConfig, updateConfig as saveConfig, LoginConfig } from './config';
import { MockTelegramClient } from './telegramClientMock';
import { addSession, getSession, removeSession, updateSessionData } from './sessionStore';
import { startTgcf, stopTgcf, terminateOcrWorker } from './main'; // Import process control functions
import { getProcessState, setProcessState, TgcfMode } from './processState'; // Import process state functions

const router = Router();

// Middleware to parse JSON bodies
router.use(express.json());

// Configuration Endpoints
router.get('/api/config', async (req: Request, res: Response) => {
  console.log('[API] GET /api/config hit');
  try {
    const config = getConfig();
    res.json(config);
  } catch (error: any) {
    console.error('[API] Error getting config:', error);
    res.status(500).json({ message: 'Error retrieving configuration', error: error.message });
  }
});

router.post('/api/config', async (req: Request, res: Response) => {
  console.log('[API] POST /api/config hit with body:', req.body);
  try {
    await saveConfig(req.body); 
    res.json({ message: 'Configuration updated successfully' });
  } catch (error: any) {
    console.error('[API] Error saving config:', error);
    res.status(500).json({ message: 'Error saving configuration', error: error.message });
  }
});

// Telegram Login Endpoints
router.post('/api/telegram/initiate-login', async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  console.log(`[API] POST /api/telegram/initiate-login with phoneNumber: ${phoneNumber}`);
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return res.status(400).json({ message: 'Phone number is required and must be a string.' });
  }
  const sessionId = uuidv4();
  const currentConfig = getConfig(); // Config should be loaded by server start
  const apiId = currentConfig.login.API_ID;
  const apiHash = currentConfig.login.API_HASH;
  if (!apiId || !apiHash) {
    console.error('[API] API_ID or API_HASH not configured.');
    return res.status(500).json({ message: 'Telegram API credentials (API_ID, API_HASH) are not configured.' });
  }
  const client = new MockTelegramClient(apiId, apiHash);
  try {
    await client.connect();
    const { phoneCodeHash } = await client.sendCode(phoneNumber);
    addSession(sessionId, client);
    updateSessionData(sessionId, { phoneCodeHash });
    console.log(`[API] initiate-login: Code sent for session ${sessionId}`);
    res.json({ sessionId, message: 'Code sent successfully. Please provide the code.' });
  } catch (error: any) {
    console.error(`[API] initiate-login error for ${phoneNumber}:`, error);
    if (client && typeof (client as any).disconnect === 'function') {
        await (client as any).disconnect();
    }
    res.status(500).json({ message: error.message || 'Failed to send code.' });
  }
});

router.post('/api/telegram/submit-code', async (req: Request, res: Response) => {
  const { sessionId, code } = req.body;
  console.log(`[API] POST /api/telegram/submit-code for session: ${sessionId}`);
  if (!sessionId || !code) return res.status(400).json({ message: 'Session ID and code required.' });
  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found/expired.' });
  const { client, phoneCodeHash } = session;
  if (!phoneCodeHash) return res.status(500).json({ message: 'Session error: phone code hash missing.' });
  try {
    const result = await client.signIn({ code, phoneCodeHash });
    if (result === 'SUCCESS') {
      console.log(`[API] submit-code: Login successful for session ${sessionId}`);
      await client.disconnect(); 
      removeSession(sessionId);
      res.json({ message: 'Login successful!' });
    } else if (result === 'PASSWORD_NEEDED') {
      console.log(`[API] submit-code: Password required for session ${sessionId}`);
      res.json({ message: 'Password required. Submit via /submit-password.' });
    }
  } catch (error: any) {
    console.error(`[API] submit-code error for session ${sessionId}:`, error);
    res.status(400).json({ message: error.message || 'Failed to submit code.' });
  }
});

router.post('/api/telegram/submit-password', async (req: Request, res: Response) => {
  const { sessionId, password } = req.body;
  console.log(`[API] POST /api/telegram/submit-password for session: ${sessionId}`);
  if (!sessionId || !password) return res.status(400).json({ message: 'Session ID and password required.' });
  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found/expired.' });
  const { client } = session;
  try {
    const result = await client.signIn({ password });
    if (result === 'SUCCESS') {
      console.log(`[API] submit-password: Login successful for session ${sessionId}`);
      await client.disconnect();
      removeSession(sessionId);
      res.json({ message: 'Login successful!' });
    } else {
      console.warn(`[API] submit-password: Unexpected status '${result}' for session ${sessionId}`);
      res.status(400).json({ message: 'Password submission resulted in an unexpected state.' });
    }
  } catch (error: any) {
    console.error(`[API] submit-password error for session ${sessionId}:`, error);
    res.status(400).json({ message: error.message || 'Failed to submit password.' });
  }
});

router.get('/api/telegram/status', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  console.log(`[API] GET /api/telegram/status for session: ${sessionId}`);
  if (!sessionId) {
    // Check if API_ID and API_HASH are set as a general indicator
    const currentConfig = getConfig();
    const apiIdSet = !!currentConfig.login.API_ID;
    const apiHashset = !!currentConfig.login.API_HASH;
    return res.json({ 
        isConfigured: apiIdSet && apiHashset, 
        message: (apiIdSet && apiHashset) ? "API credentials are set." : "API credentials (API_ID/API_HASH) are not set in config."
    });
  }
  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found/expired.', isLoggedIn: false });
  try {
    const isLoggedIn = await session.client.isUserAuthorized();
    const isMock = (session.client as MockTelegramClient).isMock || false;
    res.json({ sessionId, isLoggedIn, isMockClient: isMock });
  } catch (error: any) {
    console.error(`[API] telegram/status error for session ${sessionId}:`, error);
    res.status(500).json({ message: 'Error checking Telegram status.', error: error.message });
  }
});

// Control Endpoints
router.post('/api/control/start', async (req: Request, res: Response) => {
  const { mode } = req.body as { mode?: 'live' | 'past' };
  console.log(`[API] POST /api/control/start hit, mode: ${mode}`);

  if (!mode || (mode !== 'live' && mode !== 'past')) {
    return res.status(400).json({ message: 'Invalid mode specified. Use "live" or "past".' });
  }
  
  const currentState = getProcessState();
  if (currentState.currentMode !== 'idle') {
    return res.status(409).json({ message: `Cannot start ${mode} mode. tgcf is already running in ${currentState.currentMode} mode. Stop it first.` });
  }

  try {
    // startTgcf will update the process state internally.
    // It's designed to be awaited for setup, but the core task (live mode) might run in background.
    // Past mode will complete.
    startTgcf(mode)
      .then(() => {
        console.log(`[API] startTgcf(${mode}) call completed its initial phase or entire job.`);
        // Process state is updated by startTgcf and its sub-functions.
      })
      .catch(error => {
        console.error(`[API] Error during background execution of startTgcf(${mode}):`, error);
        // State should be set by startTgcf on error.
      });
    
    // Respond quickly, assuming startTgcf handles its own background execution and state updates.
    res.status(202).json({ message: `tgcf ${mode} mode starting... Check /api/status for updates.` });
  } catch (error: any) {
    console.error(`[API] Error initiating startTgcf(${mode}):`, error);
    // This catch is for immediate errors from startTgcf (like pre-checks)
    setProcessState('idle', `Failed to start ${mode} mode: ${error.message}`, error.message);
    res.status(500).json({ message: `Failed to start ${mode} mode: ${error.message}` });
  }
});

router.post('/api/control/stop', async (req: Request, res: Response) => {
  console.log('[API] POST /api/control/stop hit');
  const currentState = getProcessState();
  if (currentState.currentMode === 'idle') {
    return res.status(400).json({ message: 'No tgcf process is currently running.' });
  }
  try {
    await stopTgcf(); // stopTgcf updates process state internally
    res.json({ message: `tgcf ${currentState.currentMode} mode stopping... Check /api/status.` });
  } catch (error: any) {
    console.error('[API] Error stopping tgcf:', error);
    // State might have been updated by stopTgcf, or it might need to be forced here.
    setProcessState('idle', `Error while stopping: ${error.message}`, error.message);
    res.status(500).json({ message: `Error stopping tgcf: ${error.message}` });
  }
});

router.get('/api/status', (req: Request, res: Response) => {
  console.log('[API] GET /api/status (general) hit');
  const state = getProcessState();
  res.json({
    currentMode: state.currentMode,
    statusMessage: state.statusMessage,
    error: state.error,
  });
});

// Added an endpoint for OCR worker termination, just in case it's needed separately.
router.post('/api/control/terminate-ocr', async (req: Request, res: Response) => {
    console.log('[API] POST /api/control/terminate-ocr hit');
    try {
        await terminateOcrWorker();
        res.json({ message: 'OCR worker termination attempted.' });
    } catch (error: any) {
        console.error('[API] Error terminating OCR worker:', error);
        res.status(500).json({ message: `Error terminating OCR worker: ${error.message}` });
    }
});


export default router;
