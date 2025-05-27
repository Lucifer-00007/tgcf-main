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
exports.ReplacePlugin = void 0;
class ReplacePlugin {
    constructor(config) {
        this.id = "replace";
        this.replacements = [];
        this.config = config;
        // Ensure config properties are initialized to avoid runtime errors
        this.config.text = this.config.text || {};
        this.config.text_raw = this.config.text_raw || "";
        this.config.regex = this.config.regex || false;
        this.compileReplacements();
        console.log('ReplacePlugin initialized with config:', JSON.stringify(this.config, null, 2));
        console.log('Compiled replacements:', this.replacements.map(r => [r[0].toString(), r[1]]));
    }
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }
    compileReplacements() {
        this.replacements = []; // Clear any existing compiled replacements
        if (this.config.text_raw && this.config.text_raw.trim() !== "") {
            const lines = this.config.text_raw.split('\n');
            for (const line of lines) {
                if (line.trim() === "")
                    continue; // Skip empty lines
                const parts = line.split('->');
                if (parts.length === 2) {
                    const pattern = parts[0].trim();
                    const replacement = parts[1].trim();
                    if (pattern) { // Ensure pattern is not empty
                        if (this.config.regex) {
                            try {
                                this.replacements.push([new RegExp(pattern, 'g'), replacement]);
                            }
                            catch (e) {
                                console.error(`ReplacePlugin: Invalid regex pattern "${pattern}" from text_raw. Skipping. Error:`, e);
                            }
                        }
                        else {
                            this.replacements.push([new RegExp(this.escapeRegExp(pattern), 'g'), replacement]);
                        }
                    }
                    else {
                        console.warn(`ReplacePlugin: Empty pattern found in text_raw line "${line}". Skipping.`);
                    }
                }
                else {
                    console.warn(`ReplacePlugin: Malformed line in text_raw "${line}". Expected "pattern -> replacement". Skipping.`);
                }
            }
        }
        else if (this.config.text && Object.keys(this.config.text).length > 0) {
            for (const [key, value] of Object.entries(this.config.text)) {
                if (key) { // Ensure key is not empty
                    if (this.config.regex) {
                        try {
                            this.replacements.push([new RegExp(key, 'g'), value]);
                        }
                        catch (e) {
                            console.error(`ReplacePlugin: Invalid regex key "${key}" from text object. Skipping. Error:`, e);
                        }
                    }
                    else {
                        this.replacements.push([new RegExp(this.escapeRegExp(key), 'g'), value]);
                    }
                }
                else {
                    console.warn(`ReplacePlugin: Empty key found in text object. Skipping.`);
                }
            }
        }
    }
    modify(tm) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!tm.text || this.replacements.length === 0) {
                // No text to process or no replacements defined
                if (this.replacements.length === 0 && this.config.check) { // Only log if check is true but no valid replacements compiled
                    console.log(`ReplacePlugin: No valid replacements compiled for message ID ${tm.originalMessage.message_id}. No changes made.`);
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
            }
            return tm;
        });
    }
}
exports.ReplacePlugin = ReplacePlugin;
