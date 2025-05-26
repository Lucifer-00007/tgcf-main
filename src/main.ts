import { startSync } from './live';
import { forwardJob } from './past';
import { initializeConfig, getConfig } from './config'; // Assuming getConfig might be useful for some logic
import { OcrPlugin }
 from './plugins/ocr'; // Only OcrPlugin has a terminate like method for now
import { loadedPlugins } from './plugins/loader';

async function main() {
  try {
    await initializeConfig();
    const config = getConfig(); // Get config after initialization

    const args = process.argv.slice(2); // Get command-line arguments, excluding 'node' and script path

    if (args.length === 0) {
      console.log("Usage: npm start [live|past]");
      console.log("Example: npm start live");
      process.exit(1);
    }

    const mode = args[0].toLowerCase();

    if (mode === 'live') {
      console.log('Starting in LIVE mode...');
      await startSync();
    } else if (mode === 'past') {
      console.log('Starting in PAST mode...');
      await forwardJob();
    } else {
      console.error(`Invalid mode: ${mode}`);
      console.log("Usage: npm start [live|past]");
      process.exit(1);
    }
  } catch (error) {
    console.error('An error occurred during execution:', error);
    process.exit(1);
  } finally {
    // Graceful shutdown for plugins that need it
    const ocrPlugin = loadedPlugins.get('ocr') as OcrPlugin | undefined;
    if (ocrPlugin && ocrPlugin.terminateWorker) {
      console.log('Terminating OCR worker...');
      await ocrPlugin.terminateWorker();
    }
    // Add other plugin termination calls here if they become necessary
    console.log('Application shutdown complete.');
  }
}

main();

// Handle unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Application specific logging, throwing an error, or other logic here
  process.exit(1); // Mandatory exit after uncaught exception
});
