import { ITgcfPlugin } from './base';
import { TgcfNodeMessage } from '../message';
import { CaptionPluginConfig } from '../plugin_models';

export class CaptionPlugin implements ITgcfPlugin {
  readonly id = "caption";
  private config: CaptionPluginConfig;

  constructor(config: CaptionPluginConfig) {
    this.config = config;
    // Ensure config properties are initialized to avoid runtime errors if not provided
    this.config.header = this.config.header || "";
    this.config.footer = this.config.footer || "";
    console.log('CaptionPlugin initialized with config:', JSON.stringify(this.config, null, 2));
  }

  async modify(tm: TgcfNodeMessage): Promise<TgcfNodeMessage | null> {
    const currentText = tm.text || "";
    const header = this.config.header || "";
    const footer = this.config.footer || "";

    if (!header && !footer) {
      console.log(`CaptionPlugin: No header or footer defined for message ID ${tm.originalMessage.message_id}. No changes made.`);
      return tm;
    }

    let newTextParts: string[] = [];

    if (header) {
      newTextParts.push(header);
    }

    if (currentText) {
      newTextParts.push(currentText);
    }

    if (footer) {
      newTextParts.push(footer);
    }
    
    const newText = newTextParts.join('\n');

    if (tm.text !== newText.trim()) { // Check if there's an actual change before logging
        tm.text = newText.trim();
        console.log(`CaptionPlugin: Caption modified for message ID ${tm.originalMessage.message_id}. New caption: "${tm.text}"`);
    } else if (header || footer) { // Log even if text is same but header/footer were defined (e.g. currentText was already wrapped)
        console.log(`CaptionPlugin: Caption processed for message ID ${tm.originalMessage.message_id}. Resulting caption: "${tm.text}" (may be unchanged if already formatted).`);
    }
    
    return tm;
  }
}
