import { ITgcfPlugin } from './base';
import { TgcfNodeMessage } from '../message';
import { ReplacePluginConfig } from '../plugin_models';

export class ReplacePlugin implements ITgcfPlugin {
  readonly id = "replace";
  private config: ReplacePluginConfig;
  private replacements: [RegExp, string][] = [];

  constructor(config: ReplacePluginConfig) {
    this.config = config;
    // Ensure config properties are initialized to avoid runtime errors
    this.config.text = this.config.text || {};
    this.config.text_raw = this.config.text_raw || "";
    this.config.regex = this.config.regex || false;
    
    this.compileReplacements();
    console.log('ReplacePlugin initialized with config:', JSON.stringify(this.config, null, 2));
    console.log('Compiled replacements:', this.replacements.map(r => [r[0].toString(), r[1]]));
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  private compileReplacements(): void {
    this.replacements = []; // Clear any existing compiled replacements

    if (this.config.text_raw && this.config.text_raw.trim() !== "") {
      const lines = this.config.text_raw.split('\n');
      for (const line of lines) {
        if (line.trim() === "") continue; // Skip empty lines
        const parts = line.split('->');
        if (parts.length === 2) {
          const pattern = parts[0].trim();
          const replacement = parts[1].trim();
          if (pattern) { // Ensure pattern is not empty
            if (this.config.regex) {
              try {
                this.replacements.push([new RegExp(pattern, 'g'), replacement]);
              } catch (e) {
                console.error(`ReplacePlugin: Invalid regex pattern "${pattern}" from text_raw. Skipping. Error:`, e);
              }
            } else {
              this.replacements.push([new RegExp(this.escapeRegExp(pattern), 'g'), replacement]);
            }
          } else {
            console.warn(`ReplacePlugin: Empty pattern found in text_raw line "${line}". Skipping.`);
          }
        } else {
          console.warn(`ReplacePlugin: Malformed line in text_raw "${line}". Expected "pattern -> replacement". Skipping.`);
        }
      }
    } else if (this.config.text && Object.keys(this.config.text).length > 0) {
      for (const [key, value] of Object.entries(this.config.text)) {
        if (key) { // Ensure key is not empty
          if (this.config.regex) {
            try {
              this.replacements.push([new RegExp(key, 'g'), value]);
            } catch (e) {
              console.error(`ReplacePlugin: Invalid regex key "${key}" from text object. Skipping. Error:`, e);
            }
          } else {
            this.replacements.push([new RegExp(this.escapeRegExp(key), 'g'), value]);
          }
        } else {
          console.warn(`ReplacePlugin: Empty key found in text object. Skipping.`);
        }
      }
    }
  }

  async modify(tm: TgcfNodeMessage): Promise<TgcfNodeMessage | null> {
    if (!tm.text || this.replacements.length === 0) {
      // No text to process or no replacements defined
      if (this.replacements.length === 0 && this.config.check) { // Only log if check is true but no valid replacements compiled
        console.log(`ReplacePlugin: No valid replacements compiled for message ID ${tm.originalMessage.message_id}. No changes made.`);
      } else if (!tm.text) {
        // console.log(`ReplacePlugin: No text in message ID ${tm.originalMessage.message_id}. No changes made.`);
      }
      return tm;
    }

    let modifiedText = tm.text;
    for (const [pattern, replacement] of this.replacements) {
      modifiedText = modifiedText.replace(pattern, replacement);
    }

    if (tm.text !== modifiedText) {
      console.log(`ReplacePlugin: Text replaced for message ID ${tm.originalMessage.message_id}. Original: "${tm.text}", New: "${modifiedText}"`);
      tm.text = modifiedText;
    } else {
      // console.log(`ReplacePlugin: No replacements made to text for message ID ${tm.originalMessage.message_id}.`);
    }
    
    return tm;
  }
}
