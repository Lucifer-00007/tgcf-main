"use strict";
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
exports.cleanupTgcfMessageFile = cleanupTgcfMessageFile;
exports.sendMessage = sendMessage;
const grammy_1 = require("grammy");
const grammy_2 = require("grammy"); // Import InputFile
const message_1 = require("./message"); // Corrected import path for TgcfNodeMessage
// Helper function to clean up temporary files from TgcfNodeMessage
function cleanupTgcfMessageFile(tgcfMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        if (tgcfMessage && tgcfMessage.filePath && tgcfMessage.cleanupFilePath) {
            console.log(`UTILS: Cleaning up temporary file: ${tgcfMessage.filePath}`);
            yield tgcfMessage.clearTemporaryFile();
        }
    });
}
function sendMessage(bot, destination, originalGrammyMessage, // The original grammY message
sourceChatId, showForwardedFrom, tgcfMessage // The processed TgcfNodeMessage
) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const messageToLogId = originalGrammyMessage.message_id;
        const textToSend = (tgcfMessage === null || tgcfMessage === void 0 ? void 0 : tgcfMessage.text) || originalGrammyMessage.text || originalGrammyMessage.caption;
        const entitiesToSend = ((_a = tgcfMessage === null || tgcfMessage === void 0 ? void 0 : tgcfMessage.originalMessage) === null || _a === void 0 ? void 0 : _a.entities) || originalGrammyMessage.entities || ((_b = tgcfMessage === null || tgcfMessage === void 0 ? void 0 : tgcfMessage.originalMessage) === null || _b === void 0 ? void 0 : _b.caption_entities) || originalGrammyMessage.caption_entities;
        const captionToSend = (tgcfMessage === null || tgcfMessage === void 0 ? void 0 : tgcfMessage.text) || originalGrammyMessage.caption; // Use tgcfMessage.text as caption if available
        // Determine which bot instance to use for sending
        const senderBot = (tgcfMessage === null || tgcfMessage === void 0 ? void 0 : tgcfMessage.overrideSendBot) || bot;
        if (tgcfMessage === null || tgcfMessage === void 0 ? void 0 : tgcfMessage.overrideSendBot) {
            console.log(`Using override sender bot for message ID ${messageToLogId} to destination ${destination}.`);
        }
        console.log(`Attempting to send/forward message ID ${messageToLogId} from ${sourceChatId} to ${destination} using bot ${senderBot === bot ? 'main' : 'override'}.`);
        try {
            if (showForwardedFrom) {
                // Forwarding inherently uses the bot that calls the method.
                // If an override bot is meant to forward, it should do so.
                yield senderBot.api.forwardMessage(destination, sourceChatId, messageToLogId);
                console.log(`Message ${messageToLogId} forwarded from ${sourceChatId} to ${destination} using ${senderBot === bot ? 'main' : 'override'} bot.`);
            }
            else {
                const fileInput = (tgcfMessage === null || tgcfMessage === void 0 ? void 0 : tgcfMessage.filePath) ? new grammy_2.InputFile(tgcfMessage.filePath) : (tgcfMessage === null || tgcfMessage === void 0 ? void 0 : tgcfMessage.fileId) || undefined;
                if ((tgcfMessage === null || tgcfMessage === void 0 ? void 0 : tgcfMessage.filePath) && !fileInput) {
                    console.warn(`File path ${tgcfMessage.filePath} provided but InputFile creation failed. Falling back to file_id if available.`);
                }
                const fileType = (tgcfMessage === null || tgcfMessage === void 0 ? void 0 : tgcfMessage.fileType) || (new message_1.TgcfNodeMessage(bot, originalGrammyMessage)).guessFileType();
                if (textToSend && fileType === 'nofile') {
                    yield senderBot.api.sendMessage(destination, textToSend, { entities: entitiesToSend });
                    console.log(`Message ${messageToLogId} (text) copied from ${sourceChatId} to ${destination}`);
                }
                else if (fileInput && fileType === 'photo') {
                    yield senderBot.api.sendPhoto(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
                    console.log(`Message ${messageToLogId} (photo) copied from ${sourceChatId} to ${destination}`);
                }
                else if (fileInput && fileType === 'video') {
                    yield senderBot.api.sendVideo(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
                    console.log(`Message ${messageToLogId} (video) copied from ${sourceChatId} to ${destination}`);
                }
                else if (fileInput && fileType === 'audio') {
                    yield senderBot.api.sendAudio(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
                    console.log(`Message ${messageToLogId} (audio) copied from ${sourceChatId} to ${destination}`);
                }
                else if (fileInput && (fileType === 'document' || fileType === 'gif')) {
                    yield senderBot.api.sendDocument(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
                    console.log(`Message ${messageToLogId} (${fileType}) copied from ${sourceChatId} to ${destination}`);
                }
                else if (fileInput && fileType === 'sticker') {
                    yield senderBot.api.sendSticker(destination, fileInput);
                    console.log(`Message ${messageToLogId} (sticker) copied from ${sourceChatId} to ${destination}`);
                }
                else if (fileInput && fileType === 'voice') {
                    yield senderBot.api.sendVoice(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
                    console.log(`Message ${messageToLogId} (voice) copied from ${sourceChatId} to ${destination}`);
                }
                else if (fileInput && fileType === 'video_note') {
                    yield senderBot.api.sendVideoNote(destination, fileInput);
                    console.log(`Message ${messageToLogId} (video_note) copied from ${sourceChatId} to ${destination}`);
                }
                else if (originalGrammyMessage.location) {
                    yield senderBot.api.sendLocation(destination, originalGrammyMessage.location.latitude, originalGrammyMessage.location.longitude);
                    console.log(`Message ${messageToLogId} (location) copied from ${sourceChatId} to ${destination}`);
                }
                else if (originalGrammyMessage.contact) {
                    yield senderBot.api.sendContact(destination, originalGrammyMessage.contact.phone_number, originalGrammyMessage.contact.first_name, { last_name: originalGrammyMessage.contact.last_name, vcard: originalGrammyMessage.contact.vcard });
                    console.log(`Message ${messageToLogId} (contact) copied from ${sourceChatId} to ${destination}`);
                }
                else if (originalGrammyMessage.poll) {
                    console.warn(`Message ID ${messageToLogId} from ${sourceChatId} is a poll. Copying polls is not directly supported, attempting to forward.`);
                    yield senderBot.api.forwardMessage(destination, sourceChatId, messageToLogId);
                }
                else if (textToSend) {
                    yield senderBot.api.sendMessage(destination, textToSend, { entities: entitiesToSend });
                    console.log(`Message ${messageToLogId} (fallback text) copied from ${sourceChatId} to ${destination}`);
                }
                else {
                    console.warn(`Message ID ${messageToLogId} from ${sourceChatId} is of an unsupported type or fileInput is missing. Attempting to forward.`);
                    yield senderBot.api.forwardMessage(destination, sourceChatId, messageToLogId);
                }
            }
        }
        catch (error) {
            console.error(`Error sending message ID ${messageToLogId} from ${sourceChatId} to ${destination} using ${senderBot === bot ? 'main' : 'override'} bot:`, error);
            if (error instanceof grammy_1.GrammyError) {
                console.error('GrammyError details:', error.description, error.error_code);
            }
            // Do not re-throw here to prevent one failed send from stopping others,
            // unless specific handling is required by the caller.
        }
    });
}
