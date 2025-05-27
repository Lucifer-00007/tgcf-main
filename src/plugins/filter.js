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
exports.FilterPlugin = void 0;
const plugin_models_1 = require("../plugin_models");
class FilterPlugin {
    constructor(config) {
        this.id = "filter";
        this.config = config;
        // Ensure sub-configs and their lists are initialized to avoid runtime errors if not provided
        this.config.users = this.config.users || { blacklist: [], whitelist: [] };
        this.config.users.blacklist = this.config.users.blacklist || [];
        this.config.users.whitelist = this.config.users.whitelist || [];
        this.config.files = this.config.files || { blacklist: [], whitelist: [] };
        this.config.files.blacklist = this.config.files.blacklist || [];
        this.config.files.whitelist = this.config.files.whitelist || [];
        this.config.text = this.config.text || { blacklist: [], whitelist: [], case_sensitive: false, regex: false };
        this.config.text.blacklist = this.config.text.blacklist || [];
        this.config.text.whitelist = this.config.text.whitelist || [];
        console.log('FilterPlugin initialized with config:', JSON.stringify(this.config, null, 2));
    }
    modify(tm) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            // Users Filter
            if (this.config.users) {
                const senderIdStr = (_a = tm.senderId) === null || _a === void 0 ? void 0 : _a.toString();
                if (senderIdStr) { // Only filter if senderId is available
                    if (this.config.users.blacklist && this.config.users.blacklist.length > 0) {
                        if (this.config.users.blacklist.includes(senderIdStr)) {
                            console.log(`FilterPlugin: Sender ${senderIdStr} is in blacklist. Filtering message ID ${tm.originalMessage.message_id}.`);
                            return null;
                        }
                    }
                    if (this.config.users.whitelist && this.config.users.whitelist.length > 0) {
                        if (!this.config.users.whitelist.includes(senderIdStr)) {
                            console.log(`FilterPlugin: Sender ${senderIdStr} is not in whitelist. Filtering message ID ${tm.originalMessage.message_id}.`);
                            return null;
                        }
                    }
                }
            }
            // Files Filter
            if (this.config.files) {
                // Ensure tm.fileType is valid and not FileType.NOFILE if filters are applied,
                // unless NOFILE itself is being filtered.
                if (tm.fileType !== plugin_models_1.FileType.NOFILE ||
                    ((_b = this.config.files.blacklist) === null || _b === void 0 ? void 0 : _b.includes(plugin_models_1.FileType.NOFILE)) ||
                    ((_c = this.config.files.whitelist) === null || _c === void 0 ? void 0 : _c.includes(plugin_models_1.FileType.NOFILE))) {
                    if (this.config.files.blacklist && this.config.files.blacklist.length > 0) {
                        if (this.config.files.blacklist.includes(tm.fileType)) {
                            console.log(`FilterPlugin: FileType ${tm.fileType} is in blacklist. Filtering message ID ${tm.originalMessage.message_id}.`);
                            return null;
                        }
                    }
                    if (this.config.files.whitelist && this.config.files.whitelist.length > 0) {
                        if (!this.config.files.whitelist.includes(tm.fileType)) {
                            console.log(`FilterPlugin: FileType ${tm.fileType} is not in whitelist. Filtering message ID ${tm.originalMessage.message_id}.`);
                            return null;
                        }
                    }
                }
                else if (tm.fileType === plugin_models_1.FileType.NOFILE &&
                    this.config.files.whitelist && this.config.files.whitelist.length > 0 &&
                    !this.config.files.whitelist.includes(plugin_models_1.FileType.NOFILE)) {
                    // If it's NOFILE, and whitelist is active but doesn't explicitly allow NOFILE, then filter it.
                    console.log(`FilterPlugin: FileType is NOFILE and it's not in a non-empty whitelist. Filtering message ID ${tm.originalMessage.message_id}.`);
                    return null;
                }
            }
            // Text Filter
            if (this.config.text) {
                const textToFilter = tm.text || "";
                if (this.config.text.blacklist && this.config.text.blacklist.length > 0) {
                    for (const pattern of this.config.text.blacklist) {
                        if (this.config.text.regex) {
                            if (new RegExp(pattern).test(textToFilter)) {
                                console.log(`FilterPlugin: Text matches regex blacklist pattern "${pattern}". Filtering message ID ${tm.originalMessage.message_id}.`);
                                return null;
                            }
                        }
                        else {
                            const searchPattern = this.config.text.case_sensitive ? pattern : pattern.toLowerCase();
                            const sourceText = this.config.text.case_sensitive ? textToFilter : textToFilter.toLowerCase();
                            if (sourceText.includes(searchPattern)) {
                                console.log(`FilterPlugin: Text includes blacklist string "${pattern}". Filtering message ID ${tm.originalMessage.message_id}.`);
                                return null;
                            }
                        }
                    }
                }
                if (this.config.text.whitelist && this.config.text.whitelist.length > 0) {
                    let matchedWhitelist = false;
                    for (const pattern of this.config.text.whitelist) {
                        if (this.config.text.regex) {
                            if (new RegExp(pattern).test(textToFilter)) {
                                matchedWhitelist = true;
                                break;
                            }
                        }
                        else {
                            const searchPattern = this.config.text.case_sensitive ? pattern : pattern.toLowerCase();
                            const sourceText = this.config.text.case_sensitive ? textToFilter : textToFilter.toLowerCase();
                            if (sourceText.includes(searchPattern)) {
                                matchedWhitelist = true;
                                break;
                            }
                        }
                    }
                    if (!matchedWhitelist) {
                        console.log(`FilterPlugin: Text does not match any whitelist patterns. Filtering message ID ${tm.originalMessage.message_id}.`);
                        return null;
                    }
                }
            }
            // If the message passes all filters
            console.log(`FilterPlugin: Message ID ${tm.originalMessage.message_id} passed all filters.`);
            return tm;
        });
    }
}
exports.FilterPlugin = FilterPlugin;
