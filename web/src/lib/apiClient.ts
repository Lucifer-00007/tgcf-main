const API_BASE_URL = '/api';

interface ApiErrorResponse {
  message: string;
  error?: any;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  if (!response.ok) {
    let errorData: ApiErrorResponse = { message: `HTTP error! status: ${response.status}` };
    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
      } catch (e) { /* Use default error */ }
    }
    console.error('API Error Response:', errorData);
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  // For 202 Accepted or 204 No Content, response.json() might fail if body is empty
  if (response.status === 202 || response.status === 204) {
    // Try to parse JSON, but return a default success message if body is truly empty or not JSON
    try {
        if (contentType && contentType.includes('application/json')) {
            // peek if there's content
            const text = await response.text();
            if (text) {
                return JSON.parse(text) as Promise<T>;
            }
        }
        return { message: response.statusText || 'Request accepted' } as unknown as Promise<T>;
    } catch (e) {
        return { message: response.statusText || 'Request accepted' } as unknown as Promise<T>;
    }
  }
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  // Fallback for non-JSON responses if any endpoint behaves that way
  return response.text().then(text => ({ message: text }) as unknown as T) ;
}

// Auth and Config Endpoints (from previous steps)
export async function initiateLogin(phoneNumber: string): Promise<{ sessionId: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/telegram/initiate-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  });
  return handleResponse<{ sessionId: string; message: string }>(response);
}

export async function submitCode(sessionId: string, code: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/telegram/submit-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, code }),
  });
  return handleResponse<{ message: string }>(response);
}

export async function submitPassword(sessionId: string, password: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/telegram/submit-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, password }),
  });
  return handleResponse<{ message: string }>(response);
}

// Renamed to avoid conflict if this is for login status vs process status
export async function getTelegramLoginStatus(sessionId?: string): Promise<{ sessionId?: string; isLoggedIn: boolean; message?: string; apiCredentialsSet?: boolean; activeSessions?: number; }> {
  const url = sessionId ? `${API_BASE_URL}/telegram/status?sessionId=${sessionId}` : `${API_BASE_URL}/telegram/status`;
  const response = await fetch(url);
  return handleResponse<any>(response);
}

export async function getConfig<T = any>(): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/config`);
  return handleResponse<T>(response);
}

export async function saveConfig<T = any>(configData: T): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configData),
  });
  return handleResponse<{ message: string }>(response);
}

// New Process Control and Status Endpoints
export interface TgcfProcessStatus {
  currentMode: 'idle' | 'live' | 'past';
  statusMessage: string;
  error: string | null;
}

export async function getTgcfProcessStatus(): Promise<TgcfProcessStatus> {
  const response = await fetch(`${API_BASE_URL}/status`);
  return handleResponse<TgcfProcessStatus>(response);
}

export async function startTgcfMode(mode: 'live' | 'past'): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/control/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  return handleResponse<{ message: string }>(response); // Expects 202 Accepted
}

export async function stopTgcfMode(): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/control/stop`, {
    method: 'POST',
  });
  return handleResponse<{ message: string }>(response); // Expects 202 Accepted
}

export async function terminateOcr(): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/control/terminate-ocr`, {
    method: 'POST',
  });
  return handleResponse<{ message: string }>(response);
}
