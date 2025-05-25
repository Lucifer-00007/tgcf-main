import { Bot } from 'grammy';
import { Message, Typegram } from 'grammy/types'; // Using Message from grammy/types
import { FileType } from './plugin_models';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid'; // For unique filenames

export class TgcfNodeMessage {
  originalMessage: Typegram<Message>; // Raw grammY message object
  bot: Bot;
  text?: string;
  fileId?: string;
  fileType: FileType;
  filePath?: string;
  cleanupFilePath?: boolean = false;
  replyToMessageId?: number;
  senderId?: number;
  // Allow custom properties for plugins
  [key: string]: any;


  constructor(bot: Bot, message: Typegram<Message>) {
    this.bot = bot;
    this.originalMessage = message;
    this.text = message.text || message.caption;
    this.fileType = this.guessFileType();
    this.fileId = this.extractFileId();
    this.senderId = message.from?.id;
    // Note: replyToMessageId would typically be set later by a plugin or logic
    // that determines the corresponding message ID in the destination chat.
    // If the original message is a reply, originalMessage.reply_to_message?.message_id exists.
  }

  guessFileType(): FileType {
    const message = this.originalMessage;
    if (message.photo) return FileType.PHOTO;
    if (message.video) return FileType.VIDEO;
    if (message.audio) return FileType.AUDIO;
    if (message.document) {
      // Further check for GIF from document mime_type
      if (message.document.mime_type === 'image/gif' || message.document.mime_type === 'video/mp4') { // Some clients send GIFs as mp4
        return FileType.GIF;
      }
      return FileType.DOCUMENT;
    }
    if (message.sticker) return FileType.STICKER;
    if (message.video_note) return FileType.VIDEO_NOTE;
    if (message.contact) return FileType.CONTACT;
    // Add other types as needed (voice, location, poll etc.)
    return FileType.NOFILE;
  }

  extractFileId(): string | undefined {
    const message = this.originalMessage;
    if (message.photo) return message.photo[message.photo.length - 1].file_id; // Largest photo
    if (message.video) return message.video.file_id;
    if (message.audio) return message.audio.file_id;
    if (message.document) return message.document.file_id;
    if (message.sticker) return message.sticker.file_id;
    if (message.video_note) return message.video_note.file_id;
    // Add other types as needed
    return undefined;
  }

  async downloadFile(): Promise<string | undefined> {
    if (!this.fileId) {
      console.warn('No fileId found in message, cannot download.');
      return undefined;
    }

    try {
      const fileInfo = await this.bot.api.getFile(this.fileId);
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
      const uniqueFilename = `${uuidv4()}${originalExtension || '.tmp'}`;
      const destinationPath = path.join(tempDir, uniqueFilename);

      // grammY's `downloadFile` method downloads to a path
      await this.bot.downloadFile(fileInfo.file_path, destinationPath);
      
      this.filePath = destinationPath;
      this.cleanupFilePath = true;
      console.log(`File downloaded to: ${this.filePath}`);
      return this.filePath;

    } catch (error) {
      console.error(`Error downloading file for fileId ${this.fileId}:`, error);
      return undefined;
    }
  }

  async clearTemporaryFile(): Promise<void> {
    if (this.filePath && this.cleanupFilePath) {
      try {
        await fs.promises.unlink(this.filePath);
        console.log(`Temporary file ${this.filePath} deleted.`);
        this.filePath = undefined;
        this.cleanupFilePath = false;
      } catch (error) {
        console.error(`Error deleting temporary file ${this.filePath}:`, error);
      }
    }
  }
}
