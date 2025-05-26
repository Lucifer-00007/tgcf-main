import { ITgcfPlugin } from './base';
import { TgcfNodeMessage } from '../message';
import { OcrPluginConfig, FileType } from '../plugin_models';
import Tesseract from 'tesseract.js'; // Import tesseract.js

export class OcrPlugin implements ITgcfPlugin {
  readonly id = "ocr";
  private config: OcrPluginConfig;
  private worker?: Tesseract.Worker;

  constructor(config: OcrPluginConfig) {
    this.config = config;
    console.log('OcrPlugin initialized with config:', JSON.stringify(this.config, null, 2));
  }

  async init?(): Promise<void> {
    try {
      console.log("OcrPlugin: Initializing Tesseract worker...");
      // TODO: Make language configurable in OcrPluginConfig (e.g., this.config.lang || 'eng')
      const lang = 'eng'; 
      this.worker = await Tesseract.createWorker({
        logger: m => {
            if (process.env.TESSERACT_DEBUG === 'true' || m.status === 'error') { // Basic conditional logging
                 console.log(`Tesseract Worker: status=${m.status}, progress=${m.progress === 1 ? 'done' : (m.progress * 100).toFixed(2) + '%'}`);
            }
        } 
      });
      await this.worker.loadLanguage(lang);
      await this.worker.initialize(lang);
      console.log("OcrPlugin: Tesseract worker initialized successfully for language:", lang);
    } catch (error) {
      console.error("OcrPlugin: Error initializing Tesseract worker:", error);
      this.worker = undefined; // Ensure worker is undefined if init fails
    }
  }

  async modify(tm: TgcfNodeMessage): Promise<TgcfNodeMessage | null> {
    if (tm.fileType !== FileType.PHOTO) {
      return tm;
    }

    if (!this.worker) {
        console.error("OcrPlugin: OCR worker not initialized. Cannot perform OCR.");
        return tm;
    }

    console.log(`OcrPlugin: Attempting to download image for OCR (Message ID: ${tm.originalMessage.message_id})`);
    const imagePath = await tm.downloadFile();
    if (!imagePath) {
      console.error(`OcrPlugin: Failed to download image for message ID ${tm.originalMessage.message_id}. Cannot perform OCR.`);
      return tm;
    }
    console.log(`OcrPlugin: Image downloaded to ${imagePath}`);

    const extractedText = await this.performOcr(imagePath);
    if (extractedText !== undefined && extractedText !== null) { // Check for null also, as some operations might return it
      if (extractedText.trim() !== "") {
        tm.text = extractedText.trim();
        console.log(`OcrPlugin: OCR extracted text from image for message ID ${tm.originalMessage.message_id}. New text: "${tm.text}"`);
      } else {
        console.log(`OcrPlugin: OCR ran for message ID ${tm.originalMessage.message_id} but found no text or only whitespace.`);
      }
    } else { // OCR failed (performOcr returned undefined)
      console.warn(`OcrPlugin: OCR failed or returned no data for message ID ${tm.originalMessage.message_id}. Text not changed.`);
    }
    // The downloaded file (imagePath) from tm.downloadFile() will be cleaned up by the plugin loader's finally block.
    return tm;
  }

  private async performOcr(imagePath: string): Promise<string | undefined> {
    if (!this.worker) {
      console.error("OcrPlugin: OCR worker not initialized in performOcr.");
      return undefined;
    }
    console.log(`OcrPlugin: performOcr called for image: ${imagePath}`);
    try {
      const { data: { text } } = await this.worker.recognize(imagePath);
      return text;
    } catch (error) {
      console.error(`OcrPlugin: Error during OCR for ${imagePath}:`, error);
      return undefined;
    }
  }

  async terminateWorker(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
        this.worker = undefined;
        console.log("OcrPlugin: Tesseract worker terminated successfully.");
      } catch(error) {
        console.error("OcrPlugin: Error terminating Tesseract worker:", error);
        this.worker = undefined; // Ensure it's marked as undefined even if termination fails
      }
    }
  }
}
