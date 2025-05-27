"use strict";
// src/processState.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProcessState = getProcessState;
exports.setProcessState = setProcessState;
exports.setStopFunction = setStopFunction;
exports.getStopFunction = getStopFunction;
// Initialize state
const state = {
    currentMode: 'idle',
    statusMessage: 'tgcf is currently idle.',
    error: null,
    stopFunction: undefined,
};
function getProcessState() {
    return Object.assign({}, state); // Return a copy to prevent direct modification
}
function setProcessState(mode, message, error = null, stopFn) {
    state.currentMode = mode;
    state.statusMessage = message;
    state.error = error;
    state.stopFunction = stopFn;
    console.log(`[ProcessState] Set to: ${mode}, Message: ${message}, Error: ${error ? error : 'None'}`);
}
function setStopFunction(stopFn) {
    state.stopFunction = stopFn;
}
function getStopFunction() {
    return state.stopFunction;
}
console.log('[ProcessState] Initialized.');
