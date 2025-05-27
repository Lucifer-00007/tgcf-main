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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrPlugin = void 0;
const plugin_models_1 = require("../plugin_models");
const tesseract_js_1 = __importDefault(require("tesseract.js")); // Import tesseract.js
class OcrPlugin {
    constructor(config) {
        this.id = "ocr";
        this.config = config;
        console.log('OcrPlugin initialized with config:', JSON.stringify(this.config, null, 2));
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("OcrPlugin: Initializing Tesseract worker...");
                // TODO: Make language configurable in OcrPluginConfig (e.g., this.config.lang || 'eng')
                const lang = 'eng';
                this.worker = yield tesseract_js_1.default.createWorker({
                    logger: m => {
                        if (process.env.TESSERACT_DEBUG === 'true' || m.status === 'error') { // Basic conditional logging
                            console.log(`Tesseract Worker: status=${m.status}, progress=${m.progress === 1 ? 'done' : (m.progress * 100).toFixed(2) + '%'}`);
                        }
                    }
                });
                yield this.worker.loadLanguage(lang);
                yield this.worker.initialize(lang);
                console.log("OcrPlugin: Tesseract worker initialized successfully for language:", lang);
            }
            catch (error) {
                console.error("OcrPlugin: Error initializing Tesseract worker:", error);
                this.worker = undefined; // Ensure worker is undefined if init fails
            }
        });
    }
    modify(tm) {
        return __awaiter(this, void 0, void 0, function* () {
            if (tm.fileType !== plugin_models_1.FileType.PHOTO) {
                return tm;
            }
            if (!this.worker) {
                console.error("OcrPlugin: OCR worker not initialized. Cannot perform OCR.");
                return tm;
            }
            console.log(`OcrPlugin: Attempting to download image for OCR (Message ID: ${tm.originalMessage.message_id})`);
            const imagePath = yield tm.downloadFile();
            if (!imagePath) {
                console.error(`OcrPlugin: Failed to download image for message ID ${tm.originalMessage.message_id}. Cannot perform OCR.`);
                return tm;
            }
            console.log(`OcrPlugin: Image downloaded to ${imagePath}`);
            const extractedText = yield this.performOcr(imagePath);
            if (extractedText !== undefined && extractedText !== null) { // Check for null also, as some operations might return it
                if (extractedText.trim() !== "") {
                    tm.text = extractedText.trim();
                    console.log(`OcrPlugin: OCR extracted text from image for message ID ${tm.originalMessage.message_id}. New text: "${tm.text}"`);
                }
                else {
                    console.log(`OcrPlugin: OCR ran for message ID ${tm.originalMessage.message_id} but found no text or only whitespace.`);
                }
            }
            else { // OCR failed (performOcr returned undefined)
                console.warn(`OcrPlugin: OCR failed or returned no data for message ID ${tm.originalMessage.message_id}. Text not changed.`);
            }
            // The downloaded file (original imagePath) is managed by the TgcfNodeMessage instance (tm).
            // If tm.downloadFile() was called, tm.filePath is set and tm.cleanupFilePath is true.
            // This file will be cleaned up by the cleanupTgcfMessageFile utility, typically
            // after all plugins have run or if processing is halted.
            return tm;
        });
    }
    performOcr(imagePath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.worker) {
                console.error("OcrPlugin: OCR worker not initialized in performOcr.");
                return undefined;
            }
            console.log(`OcrPlugin: performOcr called for image: ${imagePath}`);
            try {
                const { data: { text } } = yield this.worker.recognize(imagePath);
                return text;
            }
            catch (error) {
                console.error(`OcrPlugin: Error during OCR for ${imagePath}:`, error);
                return undefined;
            }
        });
    }
    terminateWorker() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.worker) {
                try {
                    yield this.worker.terminate();
                    this.worker = undefined;
                    console.log("OcrPlugin: Tesseract worker terminated successfully.");
                }
                catch (error) {
                    console.error("OcrPlugin: Error terminating Tesseract worker:", error);
                    this.worker = undefined; // Ensure it's marked as undefined even if termination fails
                }
            }
        });
    }
}
exports.OcrPlugin = OcrPlugin;
