// Mock implementation for Telegram client interactions
// This is to simulate the behavior of a library like Telethon or MTProto for user login.
// In a real application, you would replace this with actual Telegram client library calls.

export interface SignInParams {
  code?: string;
  password?: string;
  phoneCodeHash?: string; // Usually obtained after sendCode
}

export class MockTelegramClient {
  private phoneNumber?: string;
  private phoneCodeHash?: string;
  private connected: boolean = false;
  private authorized: boolean = false;
  private needsPassword?: boolean = false;

  public isMock = true; // Property to identify it as a mock client

  constructor(public apiId?: number, public apiHash?: string) {
    // In a real client, apiId and apiHash would be used.
  }

  async connect(): Promise<void> {
    console.log('[MockTelegramClient] Attempting to connect...');
    return new Promise(resolve => {
      setTimeout(() => {
        this.connected = true;
        console.log('[MockTelegramClient] Connected.');
        resolve();
      }, 500);
    });
  }

  async sendCode(phoneNumber: string): Promise<{ phoneCodeHash: string }> {
    console.log(`[MockTelegramClient] Sending code to ${phoneNumber}...`);
    if (!this.connected) {
      throw new Error('Client not connected');
    }
    if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) { // Simple phone number validation
        throw new Error('Invalid phone number format');
    }
    this.phoneNumber = phoneNumber;
    return new Promise(resolve => {
      setTimeout(() => {
        this.phoneCodeHash = `mock-hash-${Date.now()}`;
        console.log(`[MockTelegramClient] Code sent. Phone code hash: ${this.phoneCodeHash}`);
        resolve({ phoneCodeHash: this.phoneCodeHash });
      }, 1000);
    });
  }

  async signIn(params: SignInParams): Promise<'SUCCESS' | 'PASSWORD_NEEDED'> {
    console.log('[MockTelegramClient] Signing in with params:', params);
    if (!this.connected) {
      throw new Error('Client not connected');
    }
    if (!this.phoneNumber || !this.phoneCodeHash) {
      throw new Error('Must call sendCode first.');
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (params.code) {
          if (params.code === '12345') { // Mock valid code
            // Simulate needing a password for a specific user/code for testing
            if (this.phoneNumber === '+9999912345') { 
              this.needsPassword = true;
              console.log('[MockTelegramClient] Code correct, password needed.');
              resolve('PASSWORD_NEEDED');
            } else {
              this.authorized = true;
              this.needsPassword = false;
              console.log('[MockTelegramClient] Login successful with code.');
              resolve('SUCCESS');
            }
          } else {
            console.log('[MockTelegramClient] Incorrect code.');
            reject(new Error('Incorrect code'));
          }
        } else if (params.password) {
          if (this.needsPassword && params.password === 'password123') { // Mock valid password
            this.authorized = true;
            this.needsPassword = false;
            console.log('[MockTelegramClient] Login successful with password.');
            resolve('SUCCESS');
          } else {
            console.log('[MockTelegramClient] Incorrect password or password not needed.');
            reject(new Error('Incorrect password or password not needed'));
          }
        } else {
          reject(new Error('Either code or password must be provided.'));
        }
      }, 1000);
    });
  }

  async isUserAuthorized(): Promise<boolean> {
    return this.authorized;
  }

  async disconnect(): Promise<void> {
    console.log('[MockTelegramClient] Disconnecting...');
    this.connected = false;
    this.authorized = false;
    this.phoneNumber = undefined;
    this.phoneCodeHash = undefined;
    console.log('[MockTelegramClient] Disconnected.');
  }
}
