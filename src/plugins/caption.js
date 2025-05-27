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
exports.CaptionPlugin = void 0;
class CaptionPlugin {
    constructor(config) {
        this.id = "caption";
        this.config = config;
        // Ensure config properties are initialized to avoid runtime errors if not provided
        this.config.header = this.config.header || "";
        this.config.footer = this.config.footer || "";
        console.log('CaptionPlugin initialized with config:', JSON.stringify(this.config, null, 2));
    }
    modify(tm) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentText = tm.text || "";
            const header = this.config.header || "";
            const footer = this.config.footer || "";
            if (!header && !footer) {
                console.log(`CaptionPlugin: No header or footer defined for message ID ${tm.originalMessage.message_id}. No changes made.`);
                return tm;
            }
            let newTextParts = [];
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
            }
            else if (header || footer) { // Log even if text is same but header/footer were defined (e.g. currentText was already wrapped)
                console.log(`CaptionPlugin: Caption processed for message ID ${tm.originalMessage.message_id}. Resulting caption: "${tm.text}" (may be unchanged if already formatted).`);
            }
            return tm;
        });
    }
}
exports.CaptionPlugin = CaptionPlugin;
