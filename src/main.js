"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTgcf = startTgcf;
exports.stopTgcf = stopTgcf;
exports.terminateOcrWorker = terminateOcrWorker;
const express_1 = __importDefault(require("express"));
const api_1 = __importDefault(require("./api"));
const live_1 = require("./live"); // Assuming stopLiveMode exists or can be added
const past_1 = require("./past"); // Assuming stopPastMode exists or can be added
const config_1 = require("./config");
const loader_1 = require("./plugins/loader");
const processState_1 = require("./processState"); // Import process state functions
const PORT = process.env.PORT || 3000;
// Exported functions for API control
function startTgcf(mode) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((0, processState_1.getProcessState)().currentMode !== 'idle') {
            throw new Error(`Cannot start ${mode} mode. A process is already running in ${(0, processState_1.getProcessState)().currentMode} mode.`);
        }
        yield (0, config_1.initializeConfig)(); // Ensure config is loaded/reloaded
        const currentConfig = (0, config_1.getConfig)();
        console.log(`[TGCF_CORE] Starting tgcf in ${mode} mode via API call.`);
        // Prepare a stop function specific to the mode being started
        let specificStopFunction;
        if (mode === 'live') {
            (0, processState_1.setProcessState)('live', `tgcf is starting in live mode...`);
            // Assuming executeLiveMode is async but might run its core loop in background
            // and stopLiveMode is designed to halt it.
            specificStopFunction = () => __awaiter(this, void 0, void 0, function* () {
                yield (0, live_1.stopLiveMode)(); // This needs to be implemented in live.ts
                console.log('[TGCF_CORE] Live mode stopped via API.');
                (0, processState_1.setProcessState)('idle', 'Live mode stopped.');
            });
            (0, processState_1.setProcessState)('live', `tgcf live mode is running.`, null, specificStopFunction);
            try {
                yield (0, live_1.startSync)(); // If this blocks, API won't respond until it's done/errors
                // If it's non-blocking (e.g. bot.start() is), this is fine.
                // If executeLiveMode completes without error (e.g. bot was stopped by another signal not API)
                // and specificStopFunction was not called.
                if ((0, processState_1.getProcessState)().currentMode === 'live') { // Check if still supposed to be live
                    (0, processState_1.setProcessState)('idle', 'Live mode finished unexpectedly or was externally stopped.');
                }
            }
            catch (error) {
                console.error(`[TGCF_CORE] Error during live mode execution:`, error);
                (0, processState_1.setProcessState)('idle', `Error in live mode: ${error.message}`, error.message);
                throw error; // Re-throw to be caught by API handler
            }
        }
        else if (mode === 'past') {
            (0, processState_1.setProcessState)('past', `tgcf is starting in past mode...`);
            specificStopFunction = () => __awaiter(this, void 0, void 0, function* () {
                yield (0, past_1.stopPastMode)(); // This needs to be implemented in past.ts
                console.log('[TGCF_CORE] Past mode stopped (or completed) via API.');
                (0, processState_1.setProcessState)('idle', 'Past mode stopped/completed.');
            });
            (0, processState_1.setProcessState)('past', `tgcf past mode is running.`, null, specificStopFunction);
            try {
                yield (0, past_1.forwardJob)(); // past mode is expected to complete
                (0, processState_1.setProcessState)('idle', 'Past mode job completed successfully.');
            }
            catch (error) {
                console.error(`[TGCF_CORE] Error during past mode execution:`, error);
                (0, processState_1.setProcessState)('idle', `Error in past mode: ${error.message}`, error.message);
                throw error; // Re-throw
            }
        }
        else {
            const NOP_SPECIFIC_STOP_FN = () => __awaiter(this, void 0, void 0, function* () { });
            (0, processState_1.setProcessState)('idle', `Invalid mode: ${mode}`, `Invalid mode: ${mode}`, NOP_SPECIFIC_STOP_FN);
            throw new Error(`Invalid mode: ${mode}`);
        }
    });
}
function stopTgcf() {
    return __awaiter(this, void 0, void 0, function* () {
        const currentState = (0, processState_1.getProcessState)();
        if (currentState.currentMode === 'idle') {
            console.log('[TGCF_CORE] No process is currently running.');
            return;
        }
        console.log(`[TGCF_CORE] Attempting to stop ${currentState.currentMode} mode via API call.`);
        const stopFn = currentState.stopFunction;
        if (stopFn) {
            try {
                yield stopFn(); // This will call the specific stopLiveMode or stopPastMode
                // State update is now handled within the specificStopFunction or by startTgcf's try/catch/finally
            }
            catch (error) {
                console.error(`[TGCF_CORE] Error stopping ${currentState.currentMode} mode:`, error);
                (0, processState_1.setProcessState)('idle', `Error stopping ${currentState.currentMode} mode: ${error.message}`, error.message);
                throw error;
            }
        }
        else {
            console.warn(`[TGCF_CORE] No specific stop function registered for ${currentState.currentMode} mode. Setting to idle.`);
            (0, processState_1.setProcessState)('idle', `${currentState.currentMode} mode was running without a stop function, set to idle.`);
        }
    });
}
// Graceful shutdown for OCR plugin, callable from API or main shutdown
function terminateOcrWorker() {
    return __awaiter(this, void 0, void 0, function* () {
        const ocrPlugin = loader_1.loadedPlugins.get('ocr');
        if (ocrPlugin && ocrPlugin.terminateWorker) {
            console.log('[TGCF_CORE] Terminating OCR worker...');
            yield ocrPlugin.terminateWorker();
            console.log('[TGCF_CORE] OCR worker terminated.');
        }
        else {
            console.log('[TGCF_CORE] OCR worker not loaded or does not need termination.');
        }
    });
}
// Main application entry point
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const args = process.argv.slice(2);
        if (args.length === 0) {
            // No arguments, start API server
            console.log('No CLI arguments provided, starting API server...');
            const app = (0, express_1.default)();
            yield (0, config_1.initializeConfig)(); // Initialize config for API server
            console.log('Configuration initialized for API server.');
            app.use(api_1.default);
            app.listen(PORT, () => {
                console.log(`API Server listening on port ${PORT}`);
            });
            // Set initial process state for API mode
            (0, processState_1.setProcessState)('idle', 'API server started. tgcf is idle.');
        }
        else {
            // Arguments provided, run CLI mode
            console.log('CLI arguments provided, running in CLI mode...');
            const modeArg = args[0].toLowerCase();
            try {
                if (modeArg === 'live' || modeArg === 'past') {
                    yield startTgcf(modeArg);
                }
                else {
                    console.error(`Invalid mode: ${modeArg}`);
                    console.log("Usage: npm start [live|past] (for CLI mode)");
                    console.log("Or: npm start (for API server mode)");
                    process.exit(1);
                }
            }
            catch (error) {
                console.error(`An error occurred during CLI execution:`, error);
                // State should have been set by startTgcf on error
                process.exit(1);
            }
            finally {
                // Graceful shutdown for plugins (relevant for CLI mode if process ends)
                yield terminateOcrWorker(); // Ensure OCR worker is terminated
                console.log('CLI Application shutdown complete.');
            }
        }
    });
}
main().catch(error => {
    console.error('Critical error in main execution:', error);
    (0, processState_1.setProcessState)('idle', `Critical error: ${error.message}`, error.message);
    process.exit(1);
});
// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    const reasonError = reason instanceof Error ? reason.message : String(reason);
    (0, processState_1.setProcessState)('idle', `Unhandled Rejection: ${reasonError}`, reasonError);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    (0, processState_1.setProcessState)('idle', `Uncaught Exception: ${error.message}`, error.message);
    if (process.argv.slice(2).length > 0) { // If in CLI mode
        terminateOcrWorker().finally(() => process.exit(1));
    }
    else {
        // For API server, log and potentially let PM2/Docker handle restart.
        // Terminating OCR might be good if the server is about to be restarted.
        terminateOcrWorker();
    }
});
// SIGINT/SIGTERM handling for graceful shutdown (especially for API server mode)
const gracefulShutdown = (signal) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    (0, processState_1.setProcessState)('idle', `Shutting down due to ${signal}.`);
    try {
        yield stopTgcf(); // Attempt to stop any running tgcf mode
    }
    catch (e) {
        console.error("Error during stopTgcf in graceful shutdown:", e);
    }
    try {
        yield terminateOcrWorker(); // Terminate OCR worker
    }
    catch (e) {
        console.error("Error during OCR termination in graceful shutdown:", e);
    }
    console.log("Graceful shutdown complete. Exiting.");
    process.exit(0);
});
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
