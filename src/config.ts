import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface Forward {
  con_name?: string;
  use_this: boolean;
  source: number | string;
  dest: Array<number | string>;
  offset?: number;
  end?: number | null;
}

export interface LiveSettings {
  sequential_updates?: boolean;
  delete_sync?: boolean;
  delete_on_edit?: string | null;
}

export interface PastSettings {
  delay?: number;
}

export interface LoginConfig {
  API_ID?: number;
  API_HASH?: string;
  user_type?: number; // 0:bot, 1:user
  phone_no?: number;
  USERNAME?: string;
  SESSION_STRING?: string;
  BOT_TOKEN?: string;
}

export interface BotMessages {
  start?: string;
  bot_help?: string;
}

import { PluginsConfig } from './plugin_models'; // Import PluginsConfig

export interface Config {
  pid?: number;
  theme?: string;
  login: LoginConfig;
  admins: Array<number | string>;
  forwards: Forward[];
  show_forwarded_from?: boolean;
  mode?: number; // 0: live, 1:past
  live: LiveSettings;
  past: PastSettings;
  plugins: PluginsConfig; // Changed from PluginConfig to PluginsConfig
  bot_messages?: BotMessages;
}

export const CONFIG_FILE_NAME = 'tgcf_config.json';

export const DEFAULT_CONFIG: Config = {
  login: {
    user_type: 0, // Default to bot
  },
  admins: [],
  forwards: [],
  show_forwarded_from: false,
  mode: 0, // Default to live mode
  live: {
    sequential_updates: false,
    delete_sync: false,
    delete_on_edit: '.deleteMe',
  },
  past: {
    delay: 0,
  },
  theme: 'light',
  bot_messages: {
    start: 'Hi! I am alive',
    bot_help: 'For details visit github.com/aahnik/tgcf',
  },
  plugins: { // Default values for all plugin configurations
    filter: {
      check: false,
      users: { blacklist: [], whitelist: [] },
      files: { blacklist: [], whitelist: [] },
      text: { blacklist: [], whitelist: [], case_sensitive: false, regex: false },
    },
    fmt: {
      check: false,
      style: 'preserve', // Assuming Style.PRESERVE is 'preserve'
    },
    mark: {
      check: false,
      image: "image.png",
      position: 'C', // Assuming WatermarkPosition.CENTRE is 'C'
      frame_rate: 15,
    },
    ocr: {
      check: false,
    },
    replace: {
      check: false,
      text: {},
      text_raw: "",
      regex: false,
    },
    caption: {
      check: false,
      header: "",
      footer: "",
    },
    sender: {
      check: false,
      user_type: 0,
      BOT_TOKEN: "",
      SESSION_STRING: "",
    },
  },
};

// Function to load configuration from a file
export function loadConfigFromFile(filePath: string): Config {
  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsedConfig = JSON.parse(fileContent) as Config;
      // Merge with default config to ensure all keys are present
      return { ...DEFAULT_CONFIG, ...parsedConfig };
    } else {
      console.warn(`Config file not found at ${filePath}. Using default configuration.`);
      return { ...DEFAULT_CONFIG };
    }
  } catch (error) {
    console.error(`Error loading or parsing config file at ${filePath}:`, error);
    console.warn('Using default configuration due to error.');
    return { ...DEFAULT_CONFIG };
  }
}

import { Bot } from 'grammy'; // Import Bot for resolveChatId

// Function to resolve chat identifier (username, link, or ID) to a numerical chat ID
export async function resolveChatId(bot: Bot, identifier: string | number): Promise<number | undefined> {
  try {
    if (typeof identifier === 'number') {
      const chat = await bot.api.getChat(identifier);
      return chat.id;
    }

    let chatIdentifier = identifier;
    if (identifier.startsWith('https://t.me/joinchat/') || identifier.startsWith('https://t.me/+')) {
        // This is a private invite link. grammY's getChat cannot directly use these.
        // Resolving these requires joining the chat or other methods not directly supported by bot.api.getChat with the link itself.
        // For now, we'll log a warning and skip. A user might need to add the bot to the chat
        // or use a username/public link if available.
        console.warn(`Private chat invite link "${identifier}" cannot be resolved directly by getChat. Please use a username or ensure the bot is a member and use the chat ID.`);
        return undefined;
    } else if (identifier.startsWith('https://t.me/')) {
        // Attempt to parse username from public link
        const parts = identifier.split('/');
        const lastPart = parts[parts.length - 1];
        // Remove query parameters if any, e.g. https://t.me/username/123 -> username
        chatIdentifier = `@${lastPart.split('?')[0]}`;
    } else if (!identifier.startsWith('@') && isNaN(parseInt(identifier))) {
        // If it's not a number, not starting with @, and not a known link format, assume it's a username and prepend @
        chatIdentifier = `@${identifier}`;
    }


    const chat = await bot.api.getChat(chatIdentifier);
    return chat.id;
  } catch (error: any) {
    console.warn(`Could not resolve chat ID for identifier "${identifier}" (processed as "${typeof identifier === 'string' && !identifier.startsWith('@') && identifier.includes('/') ? identifier : identifier}"): ${error.message || error}`);
    if (error.description) {
        console.warn(`More details: ${error.description}`);
    }
    // Attempt to provide more specific feedback for common issues
    if (error.message && error.message.includes('chat not found')) {
        console.warn(`Hint: Ensure the bot is a member of the chat/channel, or the username/ID is correct and public.`);
    }
    return undefined;
  }
}

// Function to save configuration to a file
export function saveConfigToFile(filePath: string, config: Config): void {
  try {
    const configString = JSON.stringify(config, null, 2); // Pretty print JSON
    fs.writeFileSync(filePath, configString, 'utf-8');
    console.log(`Configuration saved to ${filePath}`);
  } catch (error) {
    console.error(`Error saving config file at ${filePath}:`, error);
  }
}

import { MongoClient, Db, Collection } from 'mongodb';

// MongoDB Constants
export const MONGO_DB_NAME_DEFAULT = 'tgcf-config';
export const MONGO_COL_NAME_DEFAULT = 'tgcf-instance-0';

// MongoDB Helper Functions
export async function connectToDB(connectionString: string): Promise<MongoClient | null> {
  try {
    const client = new MongoClient(connectionString);
    await client.connect();
    console.log('Successfully connected to MongoDB.');
    return client;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    return null;
  }
}

export async function closeDBConnection(client: MongoClient): Promise<void> {
  try {
    await client.close();
    console.log('MongoDB connection closed.');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}


// Helper function to merge specific nested configuration objects
function mergeNestedConfigObjects(
  targetConfig: Config, // The config object to be updated
  sourceConfig: Partial<Config>, // The config object with new values (can be partial)
  baseConfig: Config // The base configuration (e.g., DEFAULT_CONFIG or currentConfig)
): void {
  // Merge 'login', 'live', 'past', 'bot_messages' objects
  // For each, spread the corresponding object from baseConfig, then spread the one from sourceConfig (if it exists)
  // This ensures that all keys from baseConfig are present, and values from sourceConfig override them.
  targetConfig.login = { ...(baseConfig.login || {}), ...(sourceConfig.login || {}) };
  targetConfig.live = { ...(baseConfig.live || {}), ...(sourceConfig.live || {}) };
  targetConfig.past = { ...(baseConfig.past || {}), ...(sourceConfig.past || {}) };
  targetConfig.bot_messages = { ...(baseConfig.bot_messages || {}), ...(sourceConfig.bot_messages || {}) };

  // Deep merge for 'plugins'
  // Start with a copy of the plugins structure from baseConfig
  targetConfig.plugins = { ...(baseConfig.plugins || {}) } as PluginsConfig;
  if (sourceConfig.plugins) {
    for (const pluginKey in sourceConfig.plugins) {
      // Ensure pluginKey is a valid key of PluginsConfig and exists in baseConfig.plugins
      // The hasOwnProperty check is on sourceConfig.plugins to iterate only its keys.
      if (sourceConfig.plugins.hasOwnProperty(pluginKey)) {
        const key = pluginKey as keyof PluginsConfig;
        const sourcePluginValue = sourceConfig.plugins[key];
        const basePluginValue = baseConfig.plugins ? baseConfig.plugins[key] : undefined;

        if (typeof sourcePluginValue === 'object' && sourcePluginValue !== null &&
            basePluginValue && typeof basePluginValue === 'object' && basePluginValue !== null) {
          // If both source and base plugin values are objects, merge them
          // @ts-ignore - Trusting the structure for now
          targetConfig.plugins[key] = { ...basePluginValue, ...sourcePluginValue };
        } else {
          // Otherwise, the source value (even if not an object, e.g. 'check: true') overrides/sets the value
          // @ts-ignore - Trusting the structure for now
          targetConfig.plugins[key] = sourcePluginValue;
        }
      }
    }
  }
}


// Read/Write Config from/to MongoDB
export async function readConfigFromDB(client: MongoClient, dbName: string, colName: string): Promise<Config | null> {
  try {
    const db: Db = client.db(dbName);
    const collection: Collection<any> = db.collection(colName);
    const mongoConfigDoc = await collection.findOne({ _id: 0 });

    if (mongoConfigDoc && mongoConfigDoc.config) {
      // Use a deep copy of DEFAULT_CONFIG as the absolute base
      const baseDefaultConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      // Start with a shallow merge of top-level properties from mongoConfigDoc.config onto the baseDefaultConfig
      let loadedConfig = { ...baseDefaultConfig, ...mongoConfigDoc.config } as Config;
      
      // Apply the specific nested merging logic using the helper.
      // The source for mergeNestedConfigObjects is mongoConfigDoc.config.
      // The base for comparison within the helper is baseDefaultConfig.
      mergeNestedConfigObjects(loadedConfig, mongoConfigDoc.config, baseDefaultConfig);
      
      // Arrays like 'admins' and 'forwards' are overwritten by the initial spread if present in mongoConfigDoc.config.
      // If not in mongoConfigDoc.config, they retain values from baseDefaultConfig.
      // Ensure arrays are properly assigned (mongoConfigDoc.config values preferred, then default)
      loadedConfig.admins = mongoConfigDoc.config.admins !== undefined ? mongoConfigDoc.config.admins : baseDefaultConfig.admins;
      loadedConfig.forwards = mongoConfigDoc.config.forwards !== undefined ? mongoConfigDoc.config.forwards : baseDefaultConfig.forwards;

      return loadedConfig;
    }
    console.warn(`Config not found in MongoDB (db: ${dbName}, collection: ${colName}, _id: 0). Returning null.`);
    return null;
  } catch (error) {
    console.error(`Error reading config from MongoDB (db: ${dbName}, collection: ${colName}):`, error);
    return null;
  }
}

export async function saveConfigToDB(client: MongoClient, dbName: string, colName: string, config: Config): Promise<void> {
  try {
    const db: Db = client.db(dbName);
    const collection: Collection<any> = db.collection(colName);
    await collection.updateOne({ _id: 0 }, { $set: { config } }, { upsert: true });
    console.log(`Configuration saved to MongoDB (db: ${dbName}, collection: ${colName}).`);
  } catch (error) {
    console.error(`Error saving config to MongoDB (db: ${dbName}, collection: ${colName}):`, error);
  }
}

// Config Type Detection
export async function detectConfigType(configFileName: string): Promise<'json' | 'mongo' | 'default'> {
  const mongoConStr = process.env.MONGO_CON_STR;
  if (mongoConStr) {
    const client = await connectToDB(mongoConStr);
    if (client) {
      await closeDBConnection(client); // Close test connection
      console.log('MongoDB connection string found and connection successful. Using MongoDB for configuration.');
      return 'mongo';
    } else {
      console.warn('MongoDB connection string found, but connection failed. Falling back to other methods.');
    }
  }

  if (fs.existsSync(path.join(process.cwd(), configFileName))) {
    console.log(`Local config file '${configFileName}' found. Using JSON for configuration.`);
    return 'json';
  }

  console.log('No MongoDB connection string or local config file found. Using default configuration.');
  return 'default';
}


// Global variable to hold the current configuration, initialized with default.
// It will be updated by initializeConfig.
export let currentConfig: Config = { ...DEFAULT_CONFIG };
let currentConfigType: 'json' | 'mongo' | 'default' = 'default';


// Main Configuration Logic Initialization
export async function initializeConfig(): Promise<Config> {
  currentConfigType = await detectConfigType(CONFIG_FILE_NAME);
  let loadedConfig: Config | null = null;

  if (currentConfigType === 'mongo') {
    const mongoConStr = process.env.MONGO_CON_STR;
    if (mongoConStr) {
      const client = await connectToDB(mongoConStr);
      if (client) {
        const dbName = process.env.MONGO_DB_NAME || MONGO_DB_NAME_DEFAULT;
        const colName = process.env.MONGO_COL_NAME || MONGO_COL_NAME_DEFAULT;
        loadedConfig = await readConfigFromDB(client, dbName, colName);
        await closeDBConnection(client);

        if (!loadedConfig) {
          console.warn('No configuration found in MongoDB. Using default configuration and saving to MongoDB.');
          loadedConfig = { ...DEFAULT_CONFIG };
          const newClient = await connectToDB(mongoConStr); // Reconnect to save
          if (newClient) {
            await saveConfigToDB(newClient, dbName, colName, loadedConfig);
            await closeDBConnection(newClient);
          }
        }
      } else {
        console.error('Failed to connect to MongoDB during initialization. Falling back to JSON or default.');
        // Fallback: Try JSON
        if (fs.existsSync(path.join(process.cwd(), CONFIG_FILE_NAME))) {
          console.log('MongoDB connection failed, falling back to JSON file.');
          loadedConfig = loadConfigFromFile(path.join(process.cwd(), CONFIG_FILE_NAME));
          currentConfigType = 'json';
        } else {
          loadedConfig = { ...DEFAULT_CONFIG };
          currentConfigType = 'default';
        }
      }
    } else {
         // This case should ideally not happen if detectConfigType returned 'mongo'
         // but as a safeguard:
        console.error('MONGO_CON_STR not found during mongo initialization. Falling back.');
        if (fs.existsSync(path.join(process.cwd(), CONFIG_FILE_NAME))) {
          loadedConfig = loadConfigFromFile(path.join(process.cwd(), CONFIG_FILE_NAME));
          currentConfigType = 'json';
        } else {
          loadedConfig = { ...DEFAULT_CONFIG };
          currentConfigType = 'default';
        }
    }
  } else if (currentConfigType === 'json') {
    loadedConfig = loadConfigFromFile(path.join(process.cwd(), CONFIG_FILE_NAME));
  } else { // 'default'
    loadedConfig = { ...DEFAULT_CONFIG };
  }

  // Use a deep copy of DEFAULT_CONFIG as the absolute base
  const baseDefaultConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  // Initial assignment: if loadedConfig exists, spread it over baseDefaultConfig, otherwise use baseDefaultConfig
  currentConfig = loadedConfig ? { ...baseDefaultConfig, ...loadedConfig } : baseDefaultConfig;

  if (loadedConfig) {
    // Apply specific nested merging logic. Source is loadedConfig, base for comparison is baseDefaultConfig.
    mergeNestedConfigObjects(currentConfig, loadedConfig, baseDefaultConfig);
    // Ensure arrays are properly assigned (loadedConfig values preferred, then default)
    currentConfig.admins = loadedConfig.admins !== undefined ? loadedConfig.admins : baseDefaultConfig.admins;
    currentConfig.forwards = loadedConfig.forwards !== undefined ? loadedConfig.forwards : baseDefaultConfig.forwards;
  }
  // If loadedConfig is null, currentConfig is already baseDefaultConfig, which is correct.

  console.log(`Configuration initialized. Type: ${currentConfigType}. Current config:`, JSON.stringify(currentConfig, null, 2));
  return currentConfig;
}

// Call initializeConfig at the start.
// The application might need to await this if it depends on config immediately.
// For now, currentConfig is available synchronously but will be updated.
initializeConfig().then(config => {
    console.log('Async configuration loading complete.');
}).catch(error => {
    console.error('Critical error during async configuration loading:', error);
    // Potentially fallback to a very basic default if init fails catastrophically
    currentConfig = { ...DEFAULT_CONFIG };
    currentConfigType = 'default';
});


// Function to get the current configuration
export function getConfig(): Config {
  return currentConfig;
}

// Function to update the current configuration (e.g., after modification)
// This function needs to be aware of the config type to save correctly.
export async function updateConfig(newConfig: Partial<Config>): Promise<void> { // newConfig can be partial
  // Use a deep copy of currentConfig as the base for this update
  const baseCurrentConfig = JSON.parse(JSON.stringify(currentConfig));
  
  // Start with a shallow merge of newConfig onto baseCurrentConfig for top-level properties
  let updatedConfig = { ...baseCurrentConfig, ...newConfig } as Config;

  // Apply specific nested merging logic. Source is newConfig. Base for merge is baseCurrentConfig.
  // This correctly handles partial updates to nested objects like login, live, etc.
  mergeNestedConfigObjects(updatedConfig, newConfig, baseCurrentConfig);

  // Handle arrays: newConfig values overwrite if present, otherwise keep values from baseCurrentConfig.
  // If newConfig.admins is undefined, it means no change to admins, so keep baseCurrentConfig.admins.
  // If newConfig.admins is an empty array [], it means clear the admins.
  updatedConfig.admins = newConfig.admins !== undefined ? [...newConfig.admins] : [...baseCurrentConfig.admins];
  updatedConfig.forwards = newConfig.forwards !== undefined ? [...newConfig.forwards] : [...baseCurrentConfig.forwards];
  
  // Other top-level properties not explicitly handled by mergeNestedConfigObjects or array logic
  // (e.g. pid, theme, show_forwarded_from, mode) are taken from the initial spread { ...baseCurrentConfig, ...newConfig }
  // If they are not in newConfig, they retain their values from baseCurrentConfig.

  currentConfig = updatedConfig;

  if (currentConfigType === 'mongo') {
    const mongoConStr = process.env.MONGO_CON_STR;
    if (mongoConStr) {
      const client = await connectToDB(mongoConStr);
      if (client) {
        const dbName = process.env.MONGO_DB_NAME || MONGO_DB_NAME_DEFAULT;
        const colName = process.env.MONGO_COL_NAME || MONGO_COL_NAME_DEFAULT;
        await saveConfigToDB(client, dbName, colName, currentConfig);
        await closeDBConnection(client);
      } else {
        console.error('Failed to connect to MongoDB for updating config. Changes might not be persisted in DB.');
        // Fallback or error handling: Maybe save to JSON as a backup?
        // For now, just logs error.
      }
    } else {
      console.error('MONGO_CON_STR not found for updating config in MongoDB.');
    }
  } else { // 'json' or 'default'
    saveConfigToFile(path.join(process.cwd(), CONFIG_FILE_NAME), currentConfig);
    if (currentConfigType === 'default' && fs.existsSync(path.join(process.cwd(), CONFIG_FILE_NAME))) {
        currentConfigType = 'json';
    }
  }
}

// Function to load and resolve from-to mappings
export async function loadFromTo(bot: Bot, forwards: Forward[]): Promise<Map<number, { destinations: number[], forwardConfig: Forward }>> {
  const fromToMap = new Map<number, { destinations: number[], forwardConfig: Forward }>();

  console.log('Loading and resolving chat IDs for forwarding...');
  if (!forwards || forwards.length === 0) {
    console.warn('No forward rules found in the configuration.');
    return fromToMap;
  }

  for (const forward of forwards) {
    if (!forward.use_this) {
      console.log(`Skipping forward config "${forward.con_name || 'Unnamed'}" as use_this is false.`);
      continue;
    }

    if (!forward.source) {
        console.warn(`Skipping forward config "${forward.con_name || 'Unnamed'}" due to empty source.`);
        continue;
    }
    if (!forward.dest || forward.dest.length === 0) {
        console.warn(`Skipping forward config "${forward.con_name || 'Unnamed'}" due to empty destination list.`);
        continue;
    }

    const sourceId = await resolveChatId(bot, forward.source);
    if (!sourceId) {
      console.warn(`Could not resolve source chat ID for "${forward.source}" in forward config "${forward.con_name || 'Unnamed'}". Skipping this forward rule.`);
      continue;
    }

    const destinationIds: number[] = [];
    for (const destIdentifier of forward.dest) {
      const destId = await resolveChatId(bot, destIdentifier);
      if (destId) {
        destinationIds.push(destId);
      } else {
        console.warn(`Could not resolve destination chat ID for "${destIdentifier}" in forward config "${forward.con_name || 'Unnamed'}". It will be skipped for this destination in this rule.`);
      }
    }

    if (destinationIds.length > 0) {
      // Ensure offset is a number, default to 0 if not set or invalid
      const offset = (typeof forward.offset === 'number' && !isNaN(forward.offset)) ? forward.offset : 0;
      const end = (typeof forward.end === 'number' && !isNaN(forward.end)) ? forward.end : null; // null means no end

      fromToMap.set(sourceId, {
        destinations: destinationIds,
        forwardConfig: { ...forward, offset, end } // Store a copy of forwardConfig with validated offset/end
      });
      console.log(`Resolved: Source ${sourceId} (Original: "${forward.source}") -> Destinations ${destinationIds.join(', ')} for rule "${forward.con_name || 'Unnamed'}" with offset ${offset} and end ${end === null ? 'No End' : end}`);
    } else {
      console.warn(`No destination chat IDs could be resolved for source "${forward.source}" in forward config "${forward.con_name || 'Unnamed'}". Skipping this forward rule entirely.`);
    }
  }
  console.log('Finished resolving chat IDs for forwarding.');
  return fromToMap;
}

export async function loadAdmins(bot: Bot, adminIdentifiers: (string | number)[]): Promise<number[]> {
  const adminIds: number[] = [];
  if (!adminIdentifiers || adminIdentifiers.length === 0) {
    console.log('No admin identifiers provided in config. Admins list will be empty.');
    return adminIds;
  }

  console.log('Resolving admin chat IDs...');
  for (const identifier of adminIdentifiers) {
    const adminId = await resolveChatId(bot, identifier);
    if (adminId) {
      adminIds.push(adminId);
      console.log(`Resolved admin: Identifier "${identifier}" -> ID ${adminId}`);
    } else {
      console.warn(`Could not resolve admin chat ID for identifier "${identifier}".`);
    }
  }
  console.log(`Finished resolving admin chat IDs. Total resolved admins: ${adminIds.length}`);
  return adminIds;
}
