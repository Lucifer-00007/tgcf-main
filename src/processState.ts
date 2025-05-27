// src/processState.ts

export type TgcfMode = 'idle' | 'live' | 'past';

interface ProcessState {
  currentMode: TgcfMode;
  statusMessage: string;
  error: string | null;
  // If we were using child_process, processId would be here.
  // For direct function calls, we might need a way to signal stop.
  stopFunction?: () => Promise<void>; // Function to call to stop the current process
}

// Initialize state
const state: ProcessState = {
  currentMode: 'idle',
  statusMessage: 'tgcf is currently idle.',
  error: null,
  stopFunction: undefined,
};

export function getProcessState() {
  return { ...state }; // Return a copy to prevent direct modification
}

export function setProcessState(
  mode: TgcfMode, 
  message: string, 
  error: string | null = null,
  stopFn?: () => Promise<void>
) {
  state.currentMode = mode;
  state.statusMessage = message;
  state.error = error;
  state.stopFunction = stopFn;
  console.log(`[ProcessState] Set to: ${mode}, Message: ${message}, Error: ${error ? error : 'None'}`);
}

export function setStopFunction(stopFn?: () => Promise<void>) {
    state.stopFunction = stopFn;
}

export function getStopFunction(): (() => Promise<void>) | undefined {
    return state.stopFunction;
}

console.log('[ProcessState] Initialized.');
