"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const uuid_1 = require("uuid");
const config_1 = require("./config");
const telegramClientMock_1 = require("./telegramClientMock");
const sessionStore_1 = require("./sessionStore");
const main_1 = require("./main"); // Import process control functions
const processState_1 = require("./processState"); // Import process state functions
const router = (0, express_1.Router)();
// Middleware to parse JSON bodies
router.use(express_1.default.json());
// Configuration Endpoints
router.get('/api/config', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[API] GET /api/config hit');
    try {
        const config = (0, config_1.getConfig)();
        res.json(config);
    }
    catch (error) {
        console.error('[API] Error getting config:', error);
        res.status(500).json({ message: 'Error retrieving configuration', error: error.message });
    }
}));
router.post('/api/config', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[API] POST /api/config hit with body:', req.body);
    try {
        yield (0, config_1.updateConfig)(req.body);
        res.json({ message: 'Configuration updated successfully' });
    }
    catch (error) {
        console.error('[API] Error saving config:', error);
        res.status(500).json({ message: 'Error saving configuration', error: error.message });
    }
}));
// Telegram Login Endpoints
router.post('/api/telegram/initiate-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phoneNumber } = req.body;
    console.log(`[API] POST /api/telegram/initiate-login with phoneNumber: ${phoneNumber}`);
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        return res.status(400).json({ message: 'Phone number is required and must be a string.' });
    }
    const sessionId = (0, uuid_1.v4)();
    const currentConfig = (0, config_1.getConfig)(); // Config should be loaded by server start
    const apiId = currentConfig.login.API_ID;
    const apiHash = currentConfig.login.API_HASH;
    if (!apiId || !apiHash) {
        console.error('[API] API_ID or API_HASH not configured.');
        return res.status(500).json({ message: 'Telegram API credentials (API_ID, API_HASH) are not configured.' });
    }
    const client = new telegramClientMock_1.MockTelegramClient(apiId, apiHash);
    try {
        yield client.connect();
        const { phoneCodeHash } = yield client.sendCode(phoneNumber);
        (0, sessionStore_1.addSession)(sessionId, client);
        (0, sessionStore_1.updateSessionData)(sessionId, { phoneCodeHash });
        console.log(`[API] initiate-login: Code sent for session ${sessionId}`);
        res.json({ sessionId, message: 'Code sent successfully. Please provide the code.' });
    }
    catch (error) {
        console.error(`[API] initiate-login error for ${phoneNumber}:`, error);
        if (client && typeof client.disconnect === 'function') {
            yield client.disconnect();
        }
        res.status(500).json({ message: error.message || 'Failed to send code.' });
    }
}));
router.post('/api/telegram/submit-code', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sessionId, code } = req.body;
    console.log(`[API] POST /api/telegram/submit-code for session: ${sessionId}`);
    if (!sessionId || !code)
        return res.status(400).json({ message: 'Session ID and code required.' });
    const session = (0, sessionStore_1.getSession)(sessionId);
    if (!session)
        return res.status(404).json({ message: 'Session not found/expired.' });
    const { client, phoneCodeHash } = session;
    if (!phoneCodeHash)
        return res.status(500).json({ message: 'Session error: phone code hash missing.' });
    try {
        const result = yield client.signIn({ code, phoneCodeHash });
        if (result === 'SUCCESS') {
            console.log(`[API] submit-code: Login successful for session ${sessionId}`);
            yield client.disconnect();
            (0, sessionStore_1.removeSession)(sessionId);
            res.json({ message: 'Login successful!' });
        }
        else if (result === 'PASSWORD_NEEDED') {
            console.log(`[API] submit-code: Password required for session ${sessionId}`);
            res.json({ message: 'Password required. Submit via /submit-password.' });
        }
    }
    catch (error) {
        console.error(`[API] submit-code error for session ${sessionId}:`, error);
        res.status(400).json({ message: error.message || 'Failed to submit code.' });
    }
}));
router.post('/api/telegram/submit-password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sessionId, password } = req.body;
    console.log(`[API] POST /api/telegram/submit-password for session: ${sessionId}`);
    if (!sessionId || !password)
        return res.status(400).json({ message: 'Session ID and password required.' });
    const session = (0, sessionStore_1.getSession)(sessionId);
    if (!session)
        return res.status(404).json({ message: 'Session not found/expired.' });
    const { client } = session;
    try {
        const result = yield client.signIn({ password });
        if (result === 'SUCCESS') {
            console.log(`[API] submit-password: Login successful for session ${sessionId}`);
            yield client.disconnect();
            (0, sessionStore_1.removeSession)(sessionId);
            res.json({ message: 'Login successful!' });
        }
        else {
            console.warn(`[API] submit-password: Unexpected status '${result}' for session ${sessionId}`);
            res.status(400).json({ message: 'Password submission resulted in an unexpected state.' });
        }
    }
    catch (error) {
        console.error(`[API] submit-password error for session ${sessionId}:`, error);
        res.status(400).json({ message: error.message || 'Failed to submit password.' });
    }
}));
router.get('/api/telegram/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sessionId = req.query.sessionId;
    console.log(`[API] GET /api/telegram/status for session: ${sessionId}`);
    if (!sessionId) {
        // Check if API_ID and API_HASH are set as a general indicator
        const currentConfig = (0, config_1.getConfig)();
        const apiIdSet = !!currentConfig.login.API_ID;
        const apiHashset = !!currentConfig.login.API_HASH;
        return res.json({
            isConfigured: apiIdSet && apiHashset,
            message: (apiIdSet && apiHashset) ? "API credentials are set." : "API credentials (API_ID/API_HASH) are not set in config."
        });
    }
    const session = (0, sessionStore_1.getSession)(sessionId);
    if (!session)
        return res.status(404).json({ message: 'Session not found/expired.', isLoggedIn: false });
    try {
        const isLoggedIn = yield session.client.isUserAuthorized();
        const isMock = session.client.isMock || false;
        res.json({ sessionId, isLoggedIn, isMockClient: isMock });
    }
    catch (error) {
        console.error(`[API] telegram/status error for session ${sessionId}:`, error);
        res.status(500).json({ message: 'Error checking Telegram status.', error: error.message });
    }
}));
// Control Endpoints
router.post('/api/control/start', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { mode } = req.body;
    console.log(`[API] POST /api/control/start hit, mode: ${mode}`);
    if (!mode || (mode !== 'live' && mode !== 'past')) {
        return res.status(400).json({ message: 'Invalid mode specified. Use "live" or "past".' });
    }
    const currentState = (0, processState_1.getProcessState)();
    if (currentState.currentMode !== 'idle') {
        return res.status(409).json({ message: `Cannot start ${mode} mode. tgcf is already running in ${currentState.currentMode} mode. Stop it first.` });
    }
    try {
        // startTgcf will update the process state internally.
        // It's designed to be awaited for setup, but the core task (live mode) might run in background.
        // Past mode will complete.
        (0, main_1.startTgcf)(mode)
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
    }
    catch (error) {
        console.error(`[API] Error initiating startTgcf(${mode}):`, error);
        // This catch is for immediate errors from startTgcf (like pre-checks)
        (0, processState_1.setProcessState)('idle', `Failed to start ${mode} mode: ${error.message}`, error.message);
        res.status(500).json({ message: `Failed to start ${mode} mode: ${error.message}` });
    }
}));
router.post('/api/control/stop', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[API] POST /api/control/stop hit');
    const currentState = (0, processState_1.getProcessState)();
    if (currentState.currentMode === 'idle') {
        return res.status(400).json({ message: 'No tgcf process is currently running.' });
    }
    try {
        yield (0, main_1.stopTgcf)(); // stopTgcf updates process state internally
        res.json({ message: `tgcf ${currentState.currentMode} mode stopping... Check /api/status.` });
    }
    catch (error) {
        console.error('[API] Error stopping tgcf:', error);
        // State might have been updated by stopTgcf, or it might need to be forced here.
        (0, processState_1.setProcessState)('idle', `Error while stopping: ${error.message}`, error.message);
        res.status(500).json({ message: `Error stopping tgcf: ${error.message}` });
    }
}));
router.get('/api/status', (req, res) => {
    console.log('[API] GET /api/status (general) hit');
    const state = (0, processState_1.getProcessState)();
    res.json({
        currentMode: state.currentMode,
        statusMessage: state.statusMessage,
        error: state.error,
    });
});
// Added an endpoint for OCR worker termination, just in case it's needed separately.
router.post('/api/control/terminate-ocr', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[API] POST /api/control/terminate-ocr hit');
    try {
        yield (0, main_1.terminateOcrWorker)();
        res.json({ message: 'OCR worker termination attempted.' });
    }
    catch (error) {
        console.error('[API] Error terminating OCR worker:', error);
        res.status(500).json({ message: `Error terminating OCR worker: ${error.message}` });
    }
}));
exports.default = router;
