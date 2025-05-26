import { ITgcfPlugin } from './base';
import { TgcfNodeMessage } from '../message';
import { FormatPluginConfig, Style } from '../plugin_models';

// Define STYLE_CODES constant as specified
const STYLE_CODES: Record<Style, string> = {
  [Style.BOLD]: "**",
  [Style.ITALICS]: "__",
  [Style.CODE]: "`",
  [Style.STRIKE]: "~~",
  [Style.PLAIN]: "", // For PLAIN, no wrapping characters are applied
  [Style.PRESERVE]: "" // PRESERVE also doesn't wrap, it's handled by early exit
};

export class FormatPlugin implements ITgcfPlugin {
  readonly id = "fmt";
  private config: FormatPluginConfig;

  constructor(config: FormatPluginConfig) {
    this.config = config;
    // Ensure config.style is initialized if not provided, defaulting to PRESERVE
    if (!this.config.style) {
        this.config.style = Style.PRESERVE;
    }
    console.log('FormatPlugin initialized with config:', JSON.stringify(this.config, null, 2));
  }

  async modify(tm: TgcfNodeMessage): Promise<TgcfNodeMessage | null> {
    if (!tm.text || !this.config.style || this.config.style === Style.PRESERVE) {
      // No text to format, no style defined, or style is PRESERVE, so no change.
      console.log(`FormatPlugin: No text or style is PRESERVE for message ID ${tm.originalMessage.message_id}. No formatting applied.`);
      return tm;
    }

    if (this.config.style === Style.PLAIN) {
      // For PLAIN style, the intention is to remove existing Markdown.
      // However, tm.text is already the plain text content.
      // If the goal is to ensure no Markdown is parsed when sending,
      // this would be handled by setting `parse_mode: undefined` in the sender.
      // For now, as per spec, just setting tm.text to itself.
      // This also implies that any pre-existing markdown in tm.text is considered plain text.
      // For now, adhering to "tm.text = tm.text;"
      console.log(`FormatPlugin: Style is PLAIN for message ID ${tm.originalMessage.message_id}. Text set to itself (implies no parse_mode or escaped).`);
      // No actual change to tm.text is needed here if it's already plain.
      // If tm.text could contain markdown that needs *stripping*, that would be an action.
      // The python code `message.text = message.text` for `Style.PLAIN` suggests
      // that the sending mechanism (Telethon) handles it as plain if no explicit style is applied.
      // For grammY, this usually means sending without a `parse_mode` or ensuring the text
      // doesn't contain characters grammY would auto-interpret as markdown.
      // We'll assume tm.text is the content to be sent, and styling is about wrapping.
      // If this style means "ensure no markdown is interpreted", that's a sender concern.
    } else {
      const wrapChars = STYLE_CODES[this.config.style];
      if (wrapChars === undefined) { // Should not happen if Style enum and STYLE_CODES are in sync
        console.warn(`FormatPlugin: Unknown style ${this.config.style}. No formatting applied.`);
        return tm;
      }
      // Apply the wrapping characters for styles like BOLD, ITALICS, etc.
      tm.text = `${wrapChars}${tm.text}${wrapChars}`;
      console.log(`FormatPlugin: Applied style ${this.config.style} to message ID ${tm.originalMessage.message_id}.`);
    }
    
    // Note: grammY handles sending with parse_mode='MarkdownV2' by default for styled text.
    // The sendMessage utility might need to be aware of this or allow parse_mode overrides.
    // For now, this plugin just modifies the tm.text string.
    return tm;
  }
}
