// src/config.ts
export interface Config {
  admins?: number[] | string[]; // Assuming admin IDs or usernames
  show_forwarded_from?: boolean;

  advanced?: {
    live_transmission_timeout?: number;
    use_test_server?: boolean;
    [key: string]: any; // For other potential advanced settings
  };

  connections?: {
    telegram_api_id?: number;
    telegram_api_hash?: string;
    telegram_phone?: string;
    [key: string]: any; // For other potential connection settings
  };

  plugins?: {
    [pluginName: string]: { // e.g., "filter", "format", "replace"
      enabled?: boolean;
      [setting: string]: any; // Plugin-specific settings
    };
  };

  filter?: { // Example if filters are a top-level config or part of plugins
    rules?: any[]; // Define a more specific type for rules if possible
    [key: string]: any;
  };
  
  // Add any other top-level configuration sections or properties
  // Try to replace 'any' with more specific types wherever possible
  // for better type safety.
  [key: string]: any; // Fallback for unspecified parts of the config
}