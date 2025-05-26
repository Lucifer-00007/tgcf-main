import sharp, { GravityEnum } from 'sharp';
import ffmpeg from 'fluent-ffmpeg'; // Import fluent-ffmpeg
import { ITgcfPlugin } from './base';
import { TgcfNodeMessage } from '../message';
import { MarkPluginConfig, FileType, WatermarkPosition as PluginWatermarkPosition } from '../plugin_models';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

// FFmpeg Path Note:
// fluent-ffmpeg requires FFmpeg to be installed on the system.
// If FFmpeg is not in the system's PATH, its path can be set explicitly:
// import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
// ffmpeg.setFfmpegPath(ffmpegInstaller.path);
// For this implementation, we assume FFmpeg is available in the PATH.

// Watermark positioning is handled by mapping PluginWatermarkPosition to library-specific gravity/overlay settings.
// Complex string positions (e.g., 'scale:0.5:0:0') might require specific parsing if fully supported beyond direct pass-through.

export class MarkPlugin implements ITgcfPlugin {
  readonly id = "mark";
  private config: MarkPluginConfig;
  private watermarkImagePath?: string;

  constructor(config: MarkPluginConfig) {
    this.config = config;
    if (!this.config.image) {
        console.warn("MarkPlugin: Watermark image path is not configured.");
    }
    if (!this.config.position) {
        this.config.position = PluginWatermarkPosition.CENTRE; // Default position
    }
    if (!this.config.frame_rate && this.config.frame_rate !==0) { // allow 0 frame rate? Python default is 15
        this.config.frame_rate = 15;
    }
    console.log('MarkPlugin initialized with config:', JSON.stringify(this.config, null, 2));
  }

  async init?(): Promise<void> {
    if (this.config.image) {
      const imagePath = path.resolve(this.config.image); // Resolve relative paths
      if (fs.existsSync(imagePath)) {
        this.watermarkImagePath = imagePath;
        console.log(`MarkPlugin: Watermark image found at ${this.watermarkImagePath}`);
      } else {
        console.error(`MarkPlugin: Watermark image not found at configured path: ${this.config.image} (resolved to ${imagePath}). Watermarking will be disabled.`);
        this.watermarkImagePath = undefined; // Ensure it's undefined if not found
      }
    } else {
      console.warn("MarkPlugin: No watermark image path configured. Watermarking will be disabled.");
      this.watermarkImagePath = undefined;
    }
  }

  async modify(tm: TgcfNodeMessage): Promise<TgcfNodeMessage | null> {
    if (tm.fileType !== FileType.PHOTO && tm.fileType !== FileType.VIDEO && tm.fileType !== FileType.GIF) {
      // console.log(`MarkPlugin: FileType is ${tm.fileType}. No watermarking applied for message ID ${tm.originalMessage.message_id}.`);
      return tm;
    }

    if (!this.watermarkImagePath) {
      console.warn(`MarkPlugin: Watermark image not available. Skipping watermarking for message ID ${tm.originalMessage.message_id}.`);
      return tm;
    }

    console.log(`MarkPlugin: Attempting to download file for watermarking (Message ID: ${tm.originalMessage.message_id}, FileType: ${tm.fileType})`);
    const originalFilePath = await tm.downloadFile();
    if (!originalFilePath) {
      console.error(`MarkPlugin: Failed to download original file for message ID ${tm.originalMessage.message_id}. Cannot apply watermark.`);
      return tm;
    }
    console.log(`MarkPlugin: Original file downloaded to ${originalFilePath}`);

    const watermarkedFilePath = await this.applyWatermark(originalFilePath, tm.fileType);
    if (watermarkedFilePath) {
      await tm.clearTemporaryFile(); // Clean up the original download
      tm.filePath = watermarkedFilePath;
      tm.cleanupFilePath = true; // Mark the new watermarked file for cleanup
      console.log(`MarkPlugin: Watermark applied to ${tm.fileType}. New file path: ${watermarkedFilePath} for original message ID ${tm.originalMessage.message_id}`);
    } else {
      console.warn(`MarkPlugin: Failed to apply watermark to ${tm.fileType} for message ID ${tm.originalMessage.message_id}. Original file path: ${originalFilePath}`);
      // The original downloaded file remains in tm.filePath and will be cleaned up by the loader if no other changes.
    }
    return tm;
  }

  private async applyWatermark(inputPath: string, fileType: FileType): Promise<string | undefined> {
    console.log(`MarkPlugin: applyWatermark called for input: ${inputPath}, type: ${fileType}, watermark image: ${this.watermarkImagePath}`);
    if (!this.watermarkImagePath) {
      console.error("MarkPlugin: Watermark image path is not set in applyWatermark.");
      return undefined;
    }

    const tempDir = path.join(os.tmpdir(), 'tgcf_watermarked');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const originalExtension = path.extname(inputPath) || (fileType === FileType.VIDEO ? '.mp4' : (fileType === FileType.PHOTO ? '.jpg' : '.gif'));
    const outputFileName = `${uuidv4()}${originalExtension}`;
    const outputPath = path.join(tempDir, outputFileName);

    if (fileType === FileType.PHOTO || fileType === FileType.GIF) {
      let gravity: GravityEnum = sharp.gravity.center;
      switch (this.config.position) {
        case PluginWatermarkPosition.TOP_LEFT: gravity = sharp.gravity.northwest; break;
        case PluginWatermarkPosition.TOP_RIGHT: gravity = sharp.gravity.northeast; break;
        case PluginWatermarkPosition.BOTTOM_LEFT: gravity = sharp.gravity.southwest; break;
        case PluginWatermarkPosition.BOTTOM_RIGHT: gravity = sharp.gravity.southeast; break;
        case PluginWatermarkPosition.CENTRE: gravity = sharp.gravity.center; break;
        default:
          if (typeof this.config.position === 'string' && this.config.position in sharp.gravity) {
            gravity = this.config.position as GravityEnum;
          } else {
            console.warn(`MarkPlugin (Sharp): Unsupported position "${this.config.position}". Defaulting to center.`);
          }
      }
      try {
        console.log(`MarkPlugin (Sharp): Applying watermark. Input: ${inputPath}, Watermark: ${this.watermarkImagePath}, Output: ${outputPath}, Gravity: ${gravity}`);
        await sharp(inputPath)
          .composite([{ input: this.watermarkImagePath, gravity: gravity }])
          .toFile(outputPath);
        console.log(`MarkPlugin (Sharp): Watermarked file saved to ${outputPath}`);
        return outputPath;
      } catch (error) {
        console.error(`MarkPlugin (Sharp): Error during image watermarking for ${inputPath}:`, error);
        return undefined;
      }
    } else if (fileType === FileType.VIDEO) {
      let overlayFilter: string;
      // Margins for FFmpeg overlay filter. Default to 10px.
      const margin = 10; 
      switch (this.config.position) {
        case PluginWatermarkPosition.TOP_LEFT: overlayFilter = `overlay=${margin}:${margin}`; break;
        case PluginWatermarkPosition.TOP_RIGHT: overlayFilter = `overlay=W-w-${margin}:${margin}`; break;
        case PluginWatermarkPosition.BOTTOM_LEFT: overlayFilter = `overlay=${margin}:H-h-${margin}`; break;
        case PluginWatermarkPosition.BOTTOM_RIGHT: overlayFilter = `overlay=W-w-${margin}:H-h-${margin}`; break;
        case PluginWatermarkPosition.CENTRE: overlayFilter = "overlay=(W-w)/2:(H-h)/2"; break;
        default:
          console.warn(`MarkPlugin (FFmpeg): Unsupported position "${this.config.position}". Defaulting to top-right.`);
          overlayFilter = `overlay=W-w-${margin}:${margin}`; // Default to top-right for FFmpeg
      }

      return new Promise<string | undefined>((resolve, reject) => {
        const command = ffmpeg(inputPath)
          .input(this.watermarkImagePath!) // Add watermark image as another input
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
          .on('error', (err: Error) => {
            console.error(`MarkPlugin (FFmpeg): Error during video watermarking for ${inputPath}:`, err.message);
            // Check if the error message indicates missing ffmpeg
            if (err.message.includes('ENOENT') || err.message.includes('spawn ffmpeg ENOENT')) {
                console.error("MarkPlugin (FFmpeg): FFmpeg executable not found. Please ensure FFmpeg is installed and in your system's PATH, or set the path via FFMPEG_PATH environment variable or ffmpeg.setFfmpegPath().");
            }
            resolve(undefined); // Resolve with undefined on error as per function signature
          })
          .save(outputPath);
      });
    } else {
      console.log(`MarkPlugin: applyWatermark called for unsupported type ${fileType}. Skipping.`);
      return undefined;
    }
  }
}
