import express from 'express';
import apiRouter from './api';
import { startSync as executeLiveMode, stopLiveMode } from './live'; // Assuming stopLiveMode exists or can be added
import { forwardJob as executePastMode, stopPastMode } from './past'; // Assuming stopPastMode exists or can be added
import { initializeConfig, getConfig, Config } from './config';
import { OcrPlugin } from './plugins/ocr';
import { loadedPlugins } from './plugins/loader';
import { setProcessState, getProcessState } from './processState'; // Import process state functions

const PORT = process.env.PORT || 3000;

// Exported functions for API control
export async function startTgcf(mode: 'live' | 'past'): Promise<void> {
  if (getProcessState().currentMode !== 'idle') {
    throw new Error(`Cannot start ${mode} mode. A process is already running in ${getProcessState().currentMode} mode.`);
  }

  await initializeConfig(); // Ensure config is loaded/reloaded
  const currentConfig = getConfig();
  console.log(`[TGCF_CORE] Starting tgcf in ${mode} mode via API call.`);
  
  // Prepare a stop function specific to the mode being started
  let specificStopFunction: () => Promise<void>;

  if (mode === 'live') {
    setProcessState('live', `tgcf is starting in live mode...`);
    // Assuming executeLiveMode is async but might run its core loop in background
    // and stopLiveMode is designed to halt it.
    specificStopFunction = async () => {
        await stopLiveMode(); // This needs to be implemented in live.ts
        console.log('[TGCF_CORE] Live mode stopped via API.');
        setProcessState('idle', 'Live mode stopped.');
    };
    setProcessState('live', `tgcf live mode is running.`, null, specificStopFunction);
    try {
        await executeLiveMode(); // If this blocks, API won't respond until it's done/errors
                                // If it's non-blocking (e.g. bot.start() is), this is fine.
        // If executeLiveMode completes without error (e.g. bot was stopped by another signal not API)
        // and specificStopFunction was not called.
        if (getProcessState().currentMode === 'live') { // Check if still supposed to be live
            setProcessState('idle', 'Live mode finished unexpectedly or was externally stopped.');
        }
    } catch (error: any) {
        console.error(`[TGCF_CORE] Error during live mode execution:`, error);
        setProcessState('idle', `Error in live mode: ${error.message}`, error.message);
        throw error; // Re-throw to be caught by API handler
    }
  } else if (mode === 'past') {
    setProcessState('past', `tgcf is starting in past mode...`);
    specificStopFunction = async () => {
        await stopPastMode(); // This needs to be implemented in past.ts
        console.log('[TGCF_CORE] Past mode stopped (or completed) via API.');
        setProcessState('idle', 'Past mode stopped/completed.');
    };
    setProcessState('past', `tgcf past mode is running.`, null, specificStopFunction);
    try {
        await executePastMode(); // past mode is expected to complete
        setProcessState('idle', 'Past mode job completed successfully.');
    } catch (error: any) {
        console.error(`[TGCF_CORE] Error during past mode execution:`, error);
        setProcessState('idle', `Error in past mode: ${error.message}`, error.message);
        throw error; // Re-throw
    }
  } else {
    const NOP_SPECIFIC_STOP_FN = async () => {};
    setProcessState('idle', `Invalid mode: ${mode}`, `Invalid mode: ${mode}`, NOP_SPECIFIC_STOP_FN);
    throw new Error(`Invalid mode: ${mode}`);
  }
}

export async function stopTgcf(): Promise<void> {
  const currentState = getProcessState();
  if (currentState.currentMode === 'idle') {
    console.log('[TGCF_CORE] No process is currently running.');
    return;
  }

  console.log(`[TGCF_CORE] Attempting to stop ${currentState.currentMode} mode via API call.`);
  const stopFn = currentState.stopFunction;
  if (stopFn) {
    try {
      await stopFn(); // This will call the specific stopLiveMode or stopPastMode
      // State update is now handled within the specificStopFunction or by startTgcf's try/catch/finally
    } catch (error: any) {
      console.error(`[TGCF_CORE] Error stopping ${currentState.currentMode} mode:`, error);
      setProcessState('idle', `Error stopping ${currentState.currentMode} mode: ${error.message}`, error.message);
      throw error;
    }
  } else {
    console.warn(`[TGCF_CORE] No specific stop function registered for ${currentState.currentMode} mode. Setting to idle.`);
    setProcessState('idle', `${currentState.currentMode} mode was running without a stop function, set to idle.`);
  }
}

// Graceful shutdown for OCR plugin, callable from API or main shutdown
export async function terminateOcrWorker() {
  const ocrPlugin = loadedPlugins.get('ocr') as OcrPlugin | undefined;
  if (ocrPlugin && ocrPlugin.terminateWorker) {
    console.log('[TGCF_CORE] Terminating OCR worker...');
    await ocrPlugin.terminateWorker();
    console.log('[TGCF_CORE] OCR worker terminated.');
  } else {
    console.log('[TGCF_CORE] OCR worker not loaded or does not need termination.');
  }
}


// Main application entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments, start API server
    console.log('No CLI arguments provided, starting API server...');
    const app = express();
    await initializeConfig(); // Initialize config for API server
    console.log('Configuration initialized for API server.');
    app.use(apiRouter);
    app.listen(PORT, () => {
      console.log(`API Server listening on port ${PORT}`);
    });
    // Set initial process state for API mode
    setProcessState('idle', 'API server started. tgcf is idle.');
  } else {
    // Arguments provided, run CLI mode
    console.log('CLI arguments provided, running in CLI mode...');
    const modeArg = args[0].toLowerCase();
    try {
      if (modeArg === 'live' || modeArg === 'past') {
        await startTgcf(modeArg as 'live' | 'past');
      } else {
        console.error(`Invalid mode: ${modeArg}`);
        console.log("Usage: npm start [live|past] (for CLI mode)");
        console.log("Or: npm start (for API server mode)");
        process.exit(1);
      }
    } catch (error) {
      console.error(`An error occurred during CLI execution:`, error);
      // State should have been set by startTgcf on error
      process.exit(1);
    } finally {
      // Graceful shutdown for plugins (relevant for CLI mode if process ends)
      await terminateOcrWorker(); // Ensure OCR worker is terminated
      console.log('CLI Application shutdown complete.');
    }
  }
}

main().catch(error => {
  console.error('Critical error in main execution:', error);
  setProcessState('idle', `Critical error: ${error.message}`, error.message);
  process.exit(1);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  const reasonError = reason instanceof Error ? reason.message : String(reason);
  setProcessState('idle', `Unhandled Rejection: ${reasonError}`, reasonError);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  setProcessState('idle', `Uncaught Exception: ${error.message}`, error.message);
  if (process.argv.slice(2).length > 0) { // If in CLI mode
    terminateOcrWorker().finally(() => process.exit(1));
  } else {
    // For API server, log and potentially let PM2/Docker handle restart.
    // Terminating OCR might be good if the server is about to be restarted.
    terminateOcrWorker();
  }
});

// SIGINT/SIGTERM handling for graceful shutdown (especially for API server mode)
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  setProcessState('idle', `Shutting down due to ${signal}.`);
  try {
    await stopTgcf(); // Attempt to stop any running tgcf mode
  } catch (e) {
    console.error("Error during stopTgcf in graceful shutdown:", e);
  }
  try {
    await terminateOcrWorker(); // Terminate OCR worker
  } catch(e) {
    console.error("Error during OCR termination in graceful shutdown:", e);
  }
  console.log("Graceful shutdown complete. Exiting.");
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
