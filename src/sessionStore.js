"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSession = addSession;
exports.getSession = getSession;
exports.updateSessionData = updateSessionData;
exports.removeSession = removeSession;
const sessions = new Map();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes timeout for sessions
// Function to add a new session
function addSession(sessionId, client) {
    sessions.set(sessionId, { client, createdAt: Date.now() });
    console.log(`[SessionStore] Session added: ${sessionId}`);
}
// Function to retrieve a session
function getSession(sessionId) {
    const session = sessions.get(sessionId);
    if (session && (Date.now() - session.createdAt > SESSION_TIMEOUT_MS)) {
        console.log(`[SessionStore] Session expired: ${sessionId}`);
        sessions.delete(sessionId);
        return undefined;
    }
    if (session) {
        // Optionally update createdAt to implement a sliding window timeout
        // session.createdAt = Date.now(); 
    }
    return session;
}
// Function to update session data (e.g., with phoneCodeHash)
function updateSessionData(sessionId, data) {
    const session = sessions.get(sessionId);
    if (session) {
        // Only update specific fields like phoneCodeHash
        if (data.phoneCodeHash !== undefined) {
            session.phoneCodeHash = data.phoneCodeHash;
        }
        // Re-set the session to update its data in the map if necessary, or directly mutate
        // sessions.set(sessionId, { ...session, ...data }); // This would also update createdAt if not careful
        console.log(`[SessionStore] Session data updated for: ${sessionId}`);
    }
    else {
        console.warn(`[SessionStore] Attempted to update non-existent session: ${sessionId}`);
    }
}
// Function to remove a session
function removeSession(sessionId) {
    sessions.delete(sessionId);
    console.log(`[SessionStore] Session removed: ${sessionId}`);
}
// Cleanup job for expired sessions (optional, as getSession also handles expiry)
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.createdAt > SESSION_TIMEOUT_MS) {
            console.log(`[SessionStore] Cleanup: Session expired and removed: ${sessionId}`);
            sessions.delete(sessionId);
        }
    }
}, 60 * 60 * 1000); // Run cleanup every hour
console.log('[SessionStore] Initialized.');
