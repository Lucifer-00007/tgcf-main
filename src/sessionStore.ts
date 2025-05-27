import { MockTelegramClient } from './telegramClientMock'; // Using the mock client

// In-memory store for Telegram client sessions
// In a production environment, this should be replaced with a more robust solution
// like Redis or a database, especially if dealing with multiple server instances or restarts.

interface Session {
  client: MockTelegramClient;
  phoneCodeHash?: string; // Store phoneCodeHash needed for signIn
  createdAt: number;
}

const sessions = new Map<string, Session>();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes timeout for sessions

// Function to add a new session
export function addSession(sessionId: string, client: MockTelegramClient): void {
  sessions.set(sessionId, { client, createdAt: Date.now() });
  console.log(`[SessionStore] Session added: ${sessionId}`);
}

// Function to retrieve a session
export function getSession(sessionId: string): Session | undefined {
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
export function updateSessionData(sessionId: string, data: Partial<Omit<Session, 'client' | 'createdAt'>>): void {
  const session = sessions.get(sessionId);
  if (session) {
    // Only update specific fields like phoneCodeHash
    if (data.phoneCodeHash !== undefined) {
      session.phoneCodeHash = data.phoneCodeHash;
    }
    // Re-set the session to update its data in the map if necessary, or directly mutate
    // sessions.set(sessionId, { ...session, ...data }); // This would also update createdAt if not careful
    console.log(`[SessionStore] Session data updated for: ${sessionId}`);
  } else {
    console.warn(`[SessionStore] Attempted to update non-existent session: ${sessionId}`);
  }
}


// Function to remove a session
export function removeSession(sessionId: string): void {
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
