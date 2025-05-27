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
exports.MarkPlugin = void 0;
const sharp_1 = __importDefault(require("sharp"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg")); // Import fluent-ffmpeg
const plugin_models_1 = require("../plugin_models");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const uuid_1 = require("uuid");
// FFmpeg Path Note:
// fluent-ffmpeg requires FFmpeg to be installed on the system.
// If FFmpeg is not in the system's PATH, its path can be set explicitly:
// import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
// ffmpeg.setFfmpegPath(ffmpegInstaller.path);
// For this implementation, we assume FFmpeg is available in the PATH.
// Watermark positioning is handled by mapping PluginWatermarkPosition to library-specific gravity/overlay settings.
// Complex string positions (e.g., 'scale:0.5:0:0') might require specific parsing if fully supported beyond direct pass-through.
class MarkPlugin {
    constructor(config) {
        this.id = "mark";
        this.config = config;
        if (!this.config.image) {
            console.warn("MarkPlugin: Watermark image path is not configured.");
        }
        if (!this.config.position) {
            this.config.position = plugin_models_1.WatermarkPosition.CENTRE; // Default position
        }
        if (!this.config.frame_rate && this.config.frame_rate !== 0) { // allow 0 frame rate? Python default is 15
            this.config.frame_rate = 15;
        }
        console.log('MarkPlugin initialized with config:', JSON.stringify(this.config, null, 2));
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.config.image) {
                const imagePath = path.resolve(this.config.image); // Resolve relative paths
                if (fs.existsSync(imagePath)) {
                    this.watermarkImagePath = imagePath;
                    console.log(`MarkPlugin: Watermark image found at ${this.watermarkImagePath}`);
                }
                else {
                    console.error(`MarkPlugin: Watermark image not found at configured path: ${this.config.image} (resolved to ${imagePath}). Watermarking will be disabled.`);
                    this.watermarkImagePath = undefined; // Ensure it's undefined if not found
                }
            }
            else {
                console.warn("MarkPlugin: No watermark image path configured. Watermarking will be disabled.");
                this.watermarkImagePath = undefined;
            }
        });
    }
    modify(tm) {
        return __awaiter(this, void 0, void 0, function* () {
            if (tm.fileType !== plugin_models_1.FileType.PHOTO && tm.fileType !== plugin_models_1.FileType.VIDEO && tm.fileType !== plugin_models_1.FileType.GIF) {
                return tm;
            }
            if (!this.watermarkImagePath) {
                console.warn(`MarkPlugin: Watermark image not available. Skipping watermarking for message ID ${tm.originalMessage.message_id}.`);
                return tm;
            }
            console.log(`MarkPlugin: Attempting to download file for watermarking (Message ID: ${tm.originalMessage.message_id}, FileType: ${tm.fileType})`);
            const originalFilePath = yield tm.downloadFile();
            if (!originalFilePath) {
                console.error(`MarkPlugin: Failed to download original file for message ID ${tm.originalMessage.message_id}. Cannot apply watermark.`);
                return tm;
            }
            console.log(`MarkPlugin: Original file downloaded to ${originalFilePath}`);
            const watermarkedFilePath = yield this.applyWatermark(originalFilePath, tm.fileType);
            if (watermarkedFilePath) {
                yield tm.clearTemporaryFile(); // Clean up the original download
                tm.filePath = watermarkedFilePath;
                tm.cleanupFilePath = true; // Mark the new watermarked file for cleanup
                console.log(`MarkPlugin: Watermark applied to ${tm.fileType}. New file path: ${watermarkedFilePath} for original message ID ${tm.originalMessage.message_id}`);
            }
            else {
                console.warn(`MarkPlugin: Failed to apply watermark to ${tm.fileType} for message ID ${tm.originalMessage.message_id}. Original file path: ${originalFilePath}`);
                // The original downloaded file remains in tm.filePath and will be cleaned up by the loader if no other changes.
            }
            return tm;
        });
    }
    applyWatermark(inputPath, fileType) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`MarkPlugin: applyWatermark called for input: ${inputPath}, type: ${fileType}, watermark image: ${this.watermarkImagePath}`);
            if (!this.watermarkImagePath) {
                console.error("MarkPlugin: Watermark image path is not set in applyWatermark.");
                return undefined;
            }
            const tempDir = path.join(os.tmpdir(), 'tgcf_watermarked');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const originalExtension = path.extname(inputPath) || (fileType === plugin_models_1.FileType.VIDEO ? '.mp4' : (fileType === plugin_models_1.FileType.PHOTO ? '.jpg' : '.gif'));
            const outputFileName = `${(0, uuid_1.v4)()}${originalExtension}`;
            const outputPath = path.join(tempDir, outputFileName);
            if (fileType === plugin_models_1.FileType.PHOTO || fileType === plugin_models_1.FileType.GIF) {
                let gravity = sharp_1.default.gravity.center;
                switch (this.config.position) {
                    case plugin_models_1.WatermarkPosition.TOP_LEFT:
                        gravity = sharp_1.default.gravity.northwest;
                        break;
                    case plugin_models_1.WatermarkPosition.TOP_RIGHT:
                        gravity = sharp_1.default.gravity.northeast;
                        break;
                    case plugin_models_1.WatermarkPosition.BOTTOM_LEFT:
                        gravity = sharp_1.default.gravity.southwest;
                        break;
                    case plugin_models_1.WatermarkPosition.BOTTOM_RIGHT:
                        gravity = sharp_1.default.gravity.southeast;
                        break;
                    case plugin_models_1.WatermarkPosition.CENTRE:
                        gravity = sharp_1.default.gravity.center;
                        break;
                    default:
                        if (typeof this.config.position === 'string' && this.config.position in sharp_1.default.gravity) {
                            gravity = this.config.position;
                        }
                        else {
                            console.warn(`MarkPlugin (Sharp): Unsupported position "${this.config.position}". Defaulting to center.`);
                        }
                }
                try {
                    console.log(`MarkPlugin (Sharp): Applying watermark. Input: ${inputPath}, Watermark: ${this.watermarkImagePath}, Output: ${outputPath}, Gravity: ${gravity}`);
                    yield (0, sharp_1.default)(inputPath)
                        .composite([{ input: this.watermarkImagePath, gravity: gravity }])
                        .toFile(outputPath);
                    console.log(`MarkPlugin (Sharp): Watermarked file saved to ${outputPath}`);
                    return outputPath;
                }
                catch (error) {
                    console.error(`MarkPlugin (Sharp): Error during image watermarking for ${inputPath}:`, error);
                    return undefined;
                }
            }
            else if (fileType === plugin_models_1.FileType.VIDEO) {
                let overlayFilter;
                // Margins for FFmpeg overlay filter. Default to 10px.
                const margin = 10;
                switch (this.config.position) {
                    case plugin_models_1.WatermarkPosition.TOP_LEFT:
                        overlayFilter = `overlay=${margin}:${margin}`;
                        break;
                    case plugin_models_1.WatermarkPosition.TOP_RIGHT:
                        overlayFilter = `overlay=W-w-${margin}:${margin}`;
                        break;
                    case plugin_models_1.WatermarkPosition.BOTTOM_LEFT:
                        overlayFilter = `overlay=${margin}:H-h-${margin}`;
                        break;
                    case plugin_models_1.WatermarkPosition.BOTTOM_RIGHT:
                        overlayFilter = `overlay=W-w-${margin}:H-h-${margin}`;
                        break;
                    case plugin_models_1.WatermarkPosition.CENTRE:
                        overlayFilter = "overlay=(W-w)/2:(H-h)/2";
                        break;
                    default:
                        console.warn(`MarkPlugin (FFmpeg): Unsupported position "${this.config.position}". Defaulting to top-right.`);
                        overlayFilter = `overlay=W-w-${margin}:${margin}`; // Default to top-right for FFmpeg
                }
                return new Promise((resolve, reject) => {
                    const command = (0, fluent_ffmpeg_1.default)(inputPath)
                        .input(this.watermarkImagePath) // Add watermark image as another input
                        .complexFilter(overlayFilter); // Apply overlay filter
                    if (this.config.frame_rate && this.config.frame_rate > 0) {
                        command.outputOptions(`-r ${this.config.frame_rate}`);
                    }
                    console.log(`MarkPlugin (FFmpeg): Applying watermark. Input: ${inputPath}, Watermark: ${this.watermarkImagePath}, Output: ${outputPath}, Filter: ${overlayFilter}`);
                    command
                        .on('end', () => {
                        console.log(`MarkPlugin (FFmpeg): Video watermarking finished. Output: ${outputPath}`);
                        resolve(outputPath);
                    })
                        .on('error', (err) => {
                        console.error(`MarkPlugin (FFmpeg): Error during video watermarking for ${inputPath}:`, err.message);
                        // Check if the error message indicates missing ffmpeg
                        if (err.message.includes('ENOENT') || err.message.includes('spawn ffmpeg ENOENT')) {
                            console.error("MarkPlugin (FFmpeg): FFmpeg executable not found. Please ensure FFmpeg is installed and in your system's PATH, or set the path via FFMPEG_PATH environment variable or ffmpeg.setFfmpegPath().");
                        }
                        resolve(undefined); // Resolve with undefined on error as per function signature
                    })
                        .save(outputPath);
                });
            }
            else {
                console.log(`MarkPlugin: applyWatermark called for unsupported type ${fileType}. Skipping.`);
                return undefined;
            }
        });
    }
}
exports.MarkPlugin = MarkPlugin;
