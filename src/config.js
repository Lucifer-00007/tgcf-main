"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentConfig = exports.MONGO_COL_NAME_DEFAULT = exports.MONGO_DB_NAME_DEFAULT = exports.DEFAULT_CONFIG = exports.CONFIG_FILE_NAME = void 0;
exports.loadConfigFromFile = loadConfigFromFile;
exports.resolveChatId = resolveChatId;
exports.saveConfigToFile = saveConfigToFile;
exports.connectToDB = connectToDB;
exports.closeDBConnection = closeDBConnection;
exports.readConfigFromDB = readConfigFromDB;
exports.saveConfigToDB = saveConfigToDB;
exports.detectConfigType = detectConfigType;
exports.initializeConfig = initializeConfig;
exports.getConfig = getConfig;
exports.updateConfig = updateConfig;
exports.loadFromTo = loadFromTo;
exports.loadAdmins = loadAdmins;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
exports.CONFIG_FILE_NAME = 'tgcf_config.json';
exports.DEFAULT_CONFIG = {
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
    plugins: {
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
function loadConfigFromFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parsedConfig = JSON.parse(fileContent);
            // Merge with default config to ensure all keys are present
            return Object.assign(Object.assign({}, exports.DEFAULT_CONFIG), parsedConfig);
        }
        else {
            console.warn(`Config file not found at ${filePath}. Using default configuration.`);
            return Object.assign({}, exports.DEFAULT_CONFIG);
        }
    }
    catch (error) {
        console.error(`Error loading or parsing config file at ${filePath}:`, error);
        console.warn('Using default configuration due to error.');
        return Object.assign({}, exports.DEFAULT_CONFIG);
    }
}
// Function to resolve chat identifier (username, link, or ID) to a numerical chat ID
function resolveChatId(bot, identifier) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (typeof identifier === 'number') {
                const chat = yield bot.api.getChat(identifier);
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
            }
            else if (identifier.startsWith('https://t.me/')) {
                // Attempt to parse username from public link
                const parts = identifier.split('/');
                const lastPart = parts[parts.length - 1];
                // Remove query parameters if any, e.g. https://t.me/username/123 -> username
                chatIdentifier = `@${lastPart.split('?')[0]}`;
            }
            else if (!identifier.startsWith('@') && isNaN(parseInt(identifier))) {
                // If it's not a number, not starting with @, and not a known link format, assume it's a username and prepend @
                chatIdentifier = `@${identifier}`;
            }
            const chat = yield bot.api.getChat(chatIdentifier);
            return chat.id;
        }
        catch (error) {
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
    });
}
// Function to save configuration to a file
function saveConfigToFile(filePath, config) {
    try {
        const configString = JSON.stringify(config, null, 2); // Pretty print JSON
        fs.writeFileSync(filePath, configString, 'utf-8');
        console.log(`Configuration saved to ${filePath}`);
    }
    catch (error) {
        console.error(`Error saving config file at ${filePath}:`, error);
    }
}
const mongodb_1 = require("mongodb");
// MongoDB Constants
exports.MONGO_DB_NAME_DEFAULT = 'tgcf-config';
exports.MONGO_COL_NAME_DEFAULT = 'tgcf-instance-0';
// MongoDB Helper Functions
function connectToDB(connectionString) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = new mongodb_1.MongoClient(connectionString);
            yield client.connect();
            console.log('Successfully connected to MongoDB.');
            return client;
        }
        catch (error) {
            console.error('Error connecting to MongoDB:', error);
            return null;
        }
    });
}
function closeDBConnection(client) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield client.close();
            console.log('MongoDB connection closed.');
        }
        catch (error) {
            console.error('Error closing MongoDB connection:', error);
        }
    });
}
// Helper function to merge specific nested configuration objects
function mergeNestedConfigObjects(targetConfig, // The config object to be updated
sourceConfig, // The config object with new values (can be partial)
baseConfig // The base configuration (e.g., DEFAULT_CONFIG or currentConfig)
) {
    // Merge 'login', 'live', 'past', 'bot_messages' objects
    // For each, spread the corresponding object from baseConfig, then spread the one from sourceConfig (if it exists)
    // This ensures that all keys from baseConfig are present, and values from sourceConfig override them.
    targetConfig.login = Object.assign(Object.assign({}, (baseConfig.login || {})), (sourceConfig.login || {}));
    targetConfig.live = Object.assign(Object.assign({}, (baseConfig.live || {})), (sourceConfig.live || {}));
    targetConfig.past = Object.assign(Object.assign({}, (baseConfig.past || {})), (sourceConfig.past || {}));
    targetConfig.bot_messages = Object.assign(Object.assign({}, (baseConfig.bot_messages || {})), (sourceConfig.bot_messages || {}));
    // Deep merge for 'plugins'
    // Start with a copy of the plugins structure from baseConfig
    targetConfig.plugins = Object.assign({}, (baseConfig.plugins || {}));
    if (sourceConfig.plugins) {
        for (const pluginKey in sourceConfig.plugins) {
            // Ensure pluginKey is a valid key of PluginsConfig and exists in baseConfig.plugins
            // The hasOwnProperty check is on sourceConfig.plugins to iterate only its keys.
            if (sourceConfig.plugins.hasOwnProperty(pluginKey)) {
                const key = pluginKey;
                const sourcePluginValue = sourceConfig.plugins[key];
                const basePluginValue = baseConfig.plugins ? baseConfig.plugins[key] : undefined;
                if (typeof sourcePluginValue === 'object' && sourcePluginValue !== null &&
                    basePluginValue && typeof basePluginValue === 'object' && basePluginValue !== null) {
                    // If both source and base plugin values are objects, merge them
                    // @ts-ignore - Trusting the structure for now
                    targetConfig.plugins[key] = Object.assign(Object.assign({}, basePluginValue), sourcePluginValue);
                }
                else {
                    // Otherwise, the source value (even if not an object, e.g. 'check: true') overrides/sets the value
                    // @ts-ignore - Trusting the structure for now
                    targetConfig.plugins[key] = sourcePluginValue;
                }
            }
        }
    }
}
// Read/Write Config from/to MongoDB
function readConfigFromDB(client, dbName, colName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = client.db(dbName);
            const collection = db.collection(colName);
            const mongoConfigDoc = yield collection.findOne({ _id: 0 });
            if (mongoConfigDoc && mongoConfigDoc.config) {
                // Use a deep copy of DEFAULT_CONFIG as the absolute base
                const baseDefaultConfig = JSON.parse(JSON.stringify(exports.DEFAULT_CONFIG));
                // Start with a shallow merge of top-level properties from mongoConfigDoc.config onto the baseDefaultConfig
                let loadedConfig = Object.assign(Object.assign({}, baseDefaultConfig), mongoConfigDoc.config);
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
        }
        catch (error) {
            console.error(`Error reading config from MongoDB (db: ${dbName}, collection: ${colName}):`, error);
            return null;
        }
    });
}
function saveConfigToDB(client, dbName, colName, config) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = client.db(dbName);
            const collection = db.collection(colName);
            yield collection.updateOne({ _id: 0 }, { $set: { config } }, { upsert: true });
            console.log(`Configuration saved to MongoDB (db: ${dbName}, collection: ${colName}).`);
        }
        catch (error) {
            console.error(`Error saving config to MongoDB (db: ${dbName}, collection: ${colName}):`, error);
        }
    });
}
// Config Type Detection
function detectConfigType(configFileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const mongoConStr = process.env.MONGO_CON_STR;
        if (mongoConStr) {
            const client = yield connectToDB(mongoConStr);
            if (client) {
                yield closeDBConnection(client); // Close test connection
                console.log('MongoDB connection string found and connection successful. Using MongoDB for configuration.');
                return 'mongo';
            }
            else {
                console.warn('MongoDB connection string found, but connection failed. Falling back to other methods.');
            }
        }
        if (fs.existsSync(path.join(process.cwd(), configFileName))) {
            console.log(`Local config file '${configFileName}' found. Using JSON for configuration.`);
            return 'json';
        }
        console.log('No MongoDB connection string or local config file found. Using default configuration.');
        return 'default';
    });
}
// Global variable to hold the current configuration, initialized with default.
// It will be updated by initializeConfig.
exports.currentConfig = Object.assign({}, exports.DEFAULT_CONFIG);
let currentConfigType = 'default';
// Main Configuration Logic Initialization
function initializeConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        currentConfigType = yield detectConfigType(exports.CONFIG_FILE_NAME);
        let loadedConfig = null;
        if (currentConfigType === 'mongo') {
            const mongoConStr = process.env.MONGO_CON_STR;
            if (mongoConStr) {
                const client = yield connectToDB(mongoConStr);
                if (client) {
                    const dbName = process.env.MONGO_DB_NAME || exports.MONGO_DB_NAME_DEFAULT;
                    const colName = process.env.MONGO_COL_NAME || exports.MONGO_COL_NAME_DEFAULT;
                    loadedConfig = yield readConfigFromDB(client, dbName, colName);
                    yield closeDBConnection(client);
                    if (!loadedConfig) {
                        console.warn('No configuration found in MongoDB. Using default configuration and saving to MongoDB.');
                        loadedConfig = Object.assign({}, exports.DEFAULT_CONFIG);
                        const newClient = yield connectToDB(mongoConStr); // Reconnect to save
                        if (newClient) {
                            yield saveConfigToDB(newClient, dbName, colName, loadedConfig);
                            yield closeDBConnection(newClient);
                        }
                    }
                }
                else {
                    console.error('Failed to connect to MongoDB during initialization. Falling back to JSON or default.');
                    // Fallback: Try JSON
                    if (fs.existsSync(path.join(process.cwd(), exports.CONFIG_FILE_NAME))) {
                        console.log('MongoDB connection failed, falling back to JSON file.');
                        loadedConfig = loadConfigFromFile(path.join(process.cwd(), exports.CONFIG_FILE_NAME));
                        currentConfigType = 'json';
                    }
                    else {
                        loadedConfig = Object.assign({}, exports.DEFAULT_CONFIG);
                        currentConfigType = 'default';
                    }
                }
            }
            else {
                // This case should ideally not happen if detectConfigType returned 'mongo'
                // but as a safeguard:
                console.error('MONGO_CON_STR not found during mongo initialization. Falling back.');
                if (fs.existsSync(path.join(process.cwd(), exports.CONFIG_FILE_NAME))) {
                    loadedConfig = loadConfigFromFile(path.join(process.cwd(), exports.CONFIG_FILE_NAME));
                    currentConfigType = 'json';
                }
                else {
                    loadedConfig = Object.assign({}, exports.DEFAULT_CONFIG);
                    currentConfigType = 'default';
                }
            }
        }
        else if (currentConfigType === 'json') {
            loadedConfig = loadConfigFromFile(path.join(process.cwd(), exports.CONFIG_FILE_NAME));
        }
        else { // 'default'
            loadedConfig = Object.assign({}, exports.DEFAULT_CONFIG);
        }
        // Use a deep copy of DEFAULT_CONFIG as the absolute base
        const baseDefaultConfig = JSON.parse(JSON.stringify(exports.DEFAULT_CONFIG));
        // Initial assignment: if loadedConfig exists, spread it over baseDefaultConfig, otherwise use baseDefaultConfig
        exports.currentConfig = loadedConfig ? Object.assign(Object.assign({}, baseDefaultConfig), loadedConfig) : baseDefaultConfig;
        if (loadedConfig) {
            // Apply specific nested merging logic. Source is loadedConfig, base for comparison is baseDefaultConfig.
            mergeNestedConfigObjects(exports.currentConfig, loadedConfig, baseDefaultConfig);
            // Ensure arrays are properly assigned (loadedConfig values preferred, then default)
            exports.currentConfig.admins = loadedConfig.admins !== undefined ? loadedConfig.admins : baseDefaultConfig.admins;
            exports.currentConfig.forwards = loadedConfig.forwards !== undefined ? loadedConfig.forwards : baseDefaultConfig.forwards;
        }
        // If loadedConfig is null, currentConfig is already baseDefaultConfig, which is correct.
        console.log(`Configuration initialized. Type: ${currentConfigType}. Current config:`, JSON.stringify(exports.currentConfig, null, 2));
        return exports.currentConfig;
    });
}
// Call initializeConfig at the start.
// The application might need to await this if it depends on config immediately.
// For now, currentConfig is available synchronously but will be updated.
initializeConfig().then(config => {
    console.log('Async configuration loading complete.');
}).catch(error => {
    console.error('Critical error during async configuration loading:', error);
    // Potentially fallback to a very basic default if init fails catastrophically
    exports.currentConfig = Object.assign({}, exports.DEFAULT_CONFIG);
    currentConfigType = 'default';
});
// Function to get the current configuration
function getConfig() {
    return exports.currentConfig;
}
// Function to update the current configuration (e.g., after modification)
// This function needs to be aware of the config type to save correctly.
function updateConfig(newConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        // Use a deep copy of currentConfig as the base for this update
        const baseCurrentConfig = JSON.parse(JSON.stringify(exports.currentConfig));
        // Start with a shallow merge of newConfig onto baseCurrentConfig for top-level properties
        let updatedConfig = Object.assign(Object.assign({}, baseCurrentConfig), newConfig);
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
        exports.currentConfig = updatedConfig;
        if (currentConfigType === 'mongo') {
            const mongoConStr = process.env.MONGO_CON_STR;
            if (mongoConStr) {
                const client = yield connectToDB(mongoConStr);
                if (client) {
                    const dbName = process.env.MONGO_DB_NAME || exports.MONGO_DB_NAME_DEFAULT;
                    const colName = process.env.MONGO_COL_NAME || exports.MONGO_COL_NAME_DEFAULT;
                    yield saveConfigToDB(client, dbName, colName, exports.currentConfig);
                    yield closeDBConnection(client);
                }
                else {
                    console.error('Failed to connect to MongoDB for updating config. Changes might not be persisted in DB.');
                    // Fallback or error handling: Maybe save to JSON as a backup?
                    // For now, just logs error.
                }
            }
            else {
                console.error('MONGO_CON_STR not found for updating config in MongoDB.');
            }
        }
        else { // 'json' or 'default'
            saveConfigToFile(path.join(process.cwd(), exports.CONFIG_FILE_NAME), exports.currentConfig);
            if (currentConfigType === 'default' && fs.existsSync(path.join(process.cwd(), exports.CONFIG_FILE_NAME))) {
                currentConfigType = 'json';
            }
        }
    });
}
// Function to load and resolve from-to mappings
function loadFromTo(bot, forwards) {
    return __awaiter(this, void 0, void 0, function* () {
        const fromToMap = new Map();
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
            const sourceId = yield resolveChatId(bot, forward.source);
            if (!sourceId) {
                console.warn(`Could not resolve source chat ID for "${forward.source}" in forward config "${forward.con_name || 'Unnamed'}". Skipping this forward rule.`);
                continue;
            }
            const destinationIds = [];
            for (const destIdentifier of forward.dest) {
                const destId = yield resolveChatId(bot, destIdentifier);
                if (destId) {
                    destinationIds.push(destId);
                }
                else {
                    console.warn(`Could not resolve destination chat ID for "${destIdentifier}" in forward config "${forward.con_name || 'Unnamed'}". It will be skipped for this destination in this rule.`);
                }
            }
            if (destinationIds.length > 0) {
                // Ensure offset is a number, default to 0 if not set or invalid
                const offset = (typeof forward.offset === 'number' && !isNaN(forward.offset)) ? forward.offset : 0;
                const end = (typeof forward.end === 'number' && !isNaN(forward.end)) ? forward.end : null; // null means no end
                fromToMap.set(sourceId, {
                    destinations: destinationIds,
                    forwardConfig: Object.assign(Object.assign({}, forward), { offset, end }) // Store a copy of forwardConfig with validated offset/end
                });
                console.log(`Resolved: Source ${sourceId} (Original: "${forward.source}") -> Destinations ${destinationIds.join(', ')} for rule "${forward.con_name || 'Unnamed'}" with offset ${offset} and end ${end === null ? 'No End' : end}`);
            }
            else {
                console.warn(`No destination chat IDs could be resolved for source "${forward.source}" in forward config "${forward.con_name || 'Unnamed'}". Skipping this forward rule entirely.`);
            }
        }
        console.log('Finished resolving chat IDs for forwarding.');
        return fromToMap;
    });
}
function loadAdmins(bot, adminIdentifiers) {
    return __awaiter(this, void 0, void 0, function* () {
        const adminIds = [];
        if (!adminIdentifiers || adminIdentifiers.length === 0) {
            console.log('No admin identifiers provided in config. Admins list will be empty.');
            return adminIds;
        }
        console.log('Resolving admin chat IDs...');
        for (const identifier of adminIdentifiers) {
            const adminId = yield resolveChatId(bot, identifier);
            if (adminId) {
                adminIds.push(adminId);
                console.log(`Resolved admin: Identifier "${identifier}" -> ID ${adminId}`);
            }
            else {
                console.warn(`Could not resolve admin chat ID for identifier "${identifier}".`);
            }
        }
        console.log(`Finished resolving admin chat IDs. Total resolved admins: ${adminIds.length}`);
        return adminIds;
    });
}
