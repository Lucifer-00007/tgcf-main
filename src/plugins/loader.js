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
exports.loadedPlugins = void 0;
exports.loadPlugins = loadPlugins;
exports.applyPlugins = applyPlugins;
const message_1 = require("../message"); // Corrected: Import once
const telegram_utils_1 = require("../telegram_utils"); // Import the helper
const filter_1 = require("./filter");
const format_1 = require("./format"); // Import actual FormatPlugin
const replace_1 = require("./replace"); // Import actual ReplacePlugin
const caption_1 = require("./caption"); // Import actual CaptionPlugin
const mark_1 = require("./mark"); // Import actual MarkPlugin
const ocr_1 = require("./ocr"); // Import actual OcrPlugin
const sender_1 = require("./sender"); // Import actual SenderPlugin
exports.loadedPlugins = new Map();
function loadPlugins(bot, pluginsConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        exports.loadedPlugins.clear();
        console.log('Plugins configuration:', JSON.stringify(pluginsConfig, null, 2));
        if (pluginsConfig.filter && pluginsConfig.filter.check) {
            console.log('Loading FilterPlugin...');
            const plugin = new filter_1.FilterPlugin(pluginsConfig.filter); // Use actual FilterPlugin
            // FilterPlugin does not have an init method as per current design
            // if (plugin.init) await plugin.init(); 
            exports.loadedPlugins.set(plugin.id, plugin);
            console.log(`Plugin ${plugin.id} loaded.`);
        }
        if (pluginsConfig.fmt && pluginsConfig.fmt.check) {
            console.log('Loading FormatPlugin...');
            const plugin = new format_1.FormatPlugin(pluginsConfig.fmt); // Use actual FormatPlugin
            // FormatPlugin does not have an init method as per current design
            // if (plugin.init) await plugin.init();
            exports.loadedPlugins.set(plugin.id, plugin);
            console.log(`Plugin ${plugin.id} loaded.`);
        }
        if (pluginsConfig.replace && pluginsConfig.replace.check) {
            console.log('Loading ReplacePlugin...');
            const plugin = new replace_1.ReplacePlugin(pluginsConfig.replace); // Use actual ReplacePlugin
            // ReplacePlugin does not have an init method as per current design
            // if (plugin.init) await plugin.init();
            exports.loadedPlugins.set(plugin.id, plugin);
            console.log(`Plugin ${plugin.id} loaded.`);
        }
        if (pluginsConfig.caption && pluginsConfig.caption.check) {
            console.log('Loading CaptionPlugin...');
            const plugin = new caption_1.CaptionPlugin(pluginsConfig.caption); // Use actual CaptionPlugin
            // CaptionPlugin does not have an init method as per current design
            // if (plugin.init) await plugin.init();
            exports.loadedPlugins.set(plugin.id, plugin);
            console.log(`Plugin ${plugin.id} loaded.`);
        }
        if (pluginsConfig.mark && pluginsConfig.mark.check) {
            console.log('Loading MarkPlugin (Watermark)...');
            const plugin = new mark_1.MarkPlugin(pluginsConfig.mark); // Use actual MarkPlugin
            if (plugin.init)
                yield plugin.init(); // MarkPlugin has an init method
            exports.loadedPlugins.set(plugin.id, plugin);
            console.log(`Plugin ${plugin.id} loaded.`);
        }
        if (pluginsConfig.ocr && pluginsConfig.ocr.check) {
            console.log('Loading OcrPlugin...');
            const plugin = new ocr_1.OcrPlugin(pluginsConfig.ocr); // Use actual OcrPlugin
            if (plugin.init)
                yield plugin.init(); // OcrPlugin has an init method
            exports.loadedPlugins.set(plugin.id, plugin);
            console.log(`Plugin ${plugin.id} loaded.`);
        }
        if (pluginsConfig.sender && pluginsConfig.sender.check) {
            console.log('Loading SenderPlugin...');
            const plugin = new sender_1.SenderPlugin(pluginsConfig.sender); // Use actual SenderPlugin
            if (plugin.init)
                yield plugin.init(); // SenderPlugin has an init method
            exports.loadedPlugins.set(plugin.id, plugin);
            console.log(`Plugin ${plugin.id} loaded.`);
        }
        console.log(`${exports.loadedPlugins.size} plugins loaded in total.`);
    });
}
function applyPlugins(bot, originalMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        let tgcfMessage = new message_1.TgcfNodeMessage(bot, originalMessage);
        for (const plugin of exports.loadedPlugins.values()) {
            try {
                const modifiedMessage = yield plugin.modify(tgcfMessage);
                if (!modifiedMessage) {
                    console.log(`Message processing stopped by plugin: ${plugin.id}. Original message ID: ${originalMessage.message_id}`);
                    yield (0, telegram_utils_1.cleanupTgcfMessageFile)(tgcfMessage); // Use helper
                    return null;
                }
                tgcfMessage = modifiedMessage; // Update tgcfMessage with the result from the plugin
            }
            catch (error) {
                console.error(`Error applying plugin ${plugin.id} to message ID ${originalMessage.message_id}:`, error);
                // Decide if processing should stop on plugin error. For now, let's stop.
                yield (0, telegram_utils_1.cleanupTgcfMessageFile)(tgcfMessage); // Use helper
                return null; // Or re-throw, or return tgcfMessage as it was before error
            }
        }
        // If the message survived all plugins, it's returned.
        // The caller is responsible for calling tgcfMessage.clearTemporaryFile() after handling.
        return tgcfMessage;
    });
}
