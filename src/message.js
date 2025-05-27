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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TgcfNodeMessage = void 0;
const plugin_models_1 = require("./plugin_models");
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid"); // For unique filenames
class TgcfNodeMessage {
    constructor(bot, message) {
        var _a;
        this.cleanupFilePath = false;
        this.bot = bot;
        this.originalMessage = message;
        this.text = message.text || message.caption;
        this.fileType = this.guessFileType();
        this.fileId = this.extractFileId();
        this.senderId = (_a = message.from) === null || _a === void 0 ? void 0 : _a.id;
        // Note: replyToMessageId would typically be set later by a plugin or logic
        // that determines the corresponding message ID in the destination chat.
        // If the original message is a reply, originalMessage.reply_to_message?.message_id exists.
    }
    guessFileType() {
        const message = this.originalMessage;
        if (message.photo)
            return plugin_models_1.FileType.PHOTO;
        if (message.video)
            return plugin_models_1.FileType.VIDEO;
        if (message.audio)
            return plugin_models_1.FileType.AUDIO;
        if (message.document) {
            // Further check for GIF from document mime_type
            if (message.document.mime_type === 'image/gif' || message.document.mime_type === 'video/mp4') { // Some clients send GIFs as mp4
                return plugin_models_1.FileType.GIF;
            }
            return plugin_models_1.FileType.DOCUMENT;
        }
        if (message.sticker)
            return plugin_models_1.FileType.STICKER;
        if (message.video_note)
            return plugin_models_1.FileType.VIDEO_NOTE;
        if (message.contact)
            return plugin_models_1.FileType.CONTACT;
        // Add other types as needed (voice, location, poll etc.)
        return plugin_models_1.FileType.NOFILE;
    }
    extractFileId() {
        const message = this.originalMessage;
        if (message.photo)
            return message.photo[message.photo.length - 1].file_id; // Largest photo
        if (message.video)
            return message.video.file_id;
        if (message.audio)
            return message.audio.file_id;
        if (message.document)
            return message.document.file_id;
        if (message.sticker)
            return message.sticker.file_id;
        if (message.video_note)
            return message.video_note.file_id;
        // Add other types as needed
        return undefined;
    }
    downloadFile() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.fileId) {
                console.warn('No fileId found in message, cannot download.');
                return undefined;
            }
            try {
                const fileInfo = yield this.bot.api.getFile(this.fileId);
                if (!fileInfo.file_path) {
                    console.warn(`File path not available for fileId: ${this.fileId}`);
                    return undefined;
                }
                // Ensure temp directory exists
                const tempDir = path.join(os.tmpdir(), 'tgcf_downloads');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                // Generate a unique filename, trying to preserve original extension
                const originalExtension = path.extname(fileInfo.file_path);
                const uniqueFilename = `${(0, uuid_1.v4)()}${originalExtension || '.tmp'}`;
                const destinationPath = path.join(tempDir, uniqueFilename);
                // grammY's `downloadFile` method downloads to a path
                yield this.bot.downloadFile(fileInfo.file_path, destinationPath);
                this.filePath = destinationPath;
                this.cleanupFilePath = true;
                console.log(`File downloaded to: ${this.filePath}`);
                return this.filePath;
            }
            catch (error) {
                console.error(`Error downloading file for fileId ${this.fileId}:`, error);
                return undefined;
            }
        });
    }
    clearTemporaryFile() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.filePath && this.cleanupFilePath) {
                try {
                    yield fs.promises.unlink(this.filePath);
                    console.log(`Temporary file ${this.filePath} deleted.`);
                    this.filePath = undefined;
                    this.cleanupFilePath = false;
                }
                catch (error) {
                    console.error(`Error deleting temporary file ${this.filePath}:`, error);
                }
            }
        });
    }
}
exports.TgcfNodeMessage = TgcfNodeMessage;
