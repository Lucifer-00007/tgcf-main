import { ITgcfPlugin } from './base';
import { TgcfNodeMessage } from '../message';
import { ITgcfPlugin } from './base';
import { TgcfNodeMessage } from '../message';
import { Bot } from 'grammy';
import { Message as TypegramMessage } from 'grammy/types'; // Using TypegramMessage as alias
import { PluginsConfig } from '../plugin_models'; // Removed individual plugin config imports

// Removed placeholder import comments for actual plugin classes

import { FilterPlugin } from './filter'; // Import actual FilterPlugin
import { FormatPlugin } from './format'; // Import actual FormatPlugin
import { ReplacePlugin } from './replace'; // Import actual ReplacePlugin
import { CaptionPlugin } from './caption'; // Import actual CaptionPlugin
import { MarkPlugin } from './mark'; // Import actual MarkPlugin
import { OcrPlugin } from './ocr'; // Import actual OcrPlugin
import { SenderPlugin } from './sender'; // Import actual SenderPlugin

export const loadedPlugins = new Map<string, ITgcfPlugin>();

// DummyPlugin class removed as it's no longer needed.

export async function loadPlugins(bot: Bot, pluginsConfig: PluginsConfig): Promise<void> {
  loadedPlugins.clear();
  console.log('Plugins configuration:', JSON.stringify(pluginsConfig, null, 2));

  if (pluginsConfig.filter && pluginsConfig.filter.check) {
    console.log('Loading FilterPlugin...');
    const plugin = new FilterPlugin(pluginsConfig.filter); // Use actual FilterPlugin
    // FilterPlugin does not have an init method as per current design
    // if (plugin.init) await plugin.init(); 
    loadedPlugins.set(plugin.id, plugin);
    console.log(`Plugin ${plugin.id} loaded.`);
  }

  if (pluginsConfig.fmt && pluginsConfig.fmt.check) {
    console.log('Loading FormatPlugin...');
    const plugin = new FormatPlugin(pluginsConfig.fmt); // Use actual FormatPlugin
    // FormatPlugin does not have an init method as per current design
    // if (plugin.init) await plugin.init();
    loadedPlugins.set(plugin.id, plugin);
    console.log(`Plugin ${plugin.id} loaded.`);
  }

  if (pluginsConfig.replace && pluginsConfig.replace.check) {
    console.log('Loading ReplacePlugin...');
    const plugin = new ReplacePlugin(pluginsConfig.replace); // Use actual ReplacePlugin
    // ReplacePlugin does not have an init method as per current design
    // if (plugin.init) await plugin.init();
    loadedPlugins.set(plugin.id, plugin);
    console.log(`Plugin ${plugin.id} loaded.`);
  }

  if (pluginsConfig.caption && pluginsConfig.caption.check) {
    console.log('Loading CaptionPlugin...');
    const plugin = new CaptionPlugin(pluginsConfig.caption); // Use actual CaptionPlugin
    // CaptionPlugin does not have an init method as per current design
    // if (plugin.init) await plugin.init();
    loadedPlugins.set(plugin.id, plugin);
    console.log(`Plugin ${plugin.id} loaded.`);
  }
  
  if (pluginsConfig.mark && pluginsConfig.mark.check) {
    console.log('Loading MarkPlugin (Watermark)...');
    const plugin = new MarkPlugin(pluginsConfig.mark); // Use actual MarkPlugin
    if (plugin.init) await plugin.init(); // MarkPlugin has an init method
    loadedPlugins.set(plugin.id, plugin);
    console.log(`Plugin ${plugin.id} loaded.`);
  }

  if (pluginsConfig.ocr && pluginsConfig.ocr.check) {
    console.log('Loading OcrPlugin...');
    const plugin = new OcrPlugin(pluginsConfig.ocr); // Use actual OcrPlugin
    if (plugin.init) await plugin.init(); // OcrPlugin has an init method
    loadedPlugins.set(plugin.id, plugin);
    console.log(`Plugin ${plugin.id} loaded.`);
  }

  if (pluginsConfig.sender && pluginsConfig.sender.check) {
    console.log('Loading SenderPlugin...');
    const plugin = new SenderPlugin(pluginsConfig.sender); // Use actual SenderPlugin
    if (plugin.init) await plugin.init(); // SenderPlugin has an init method
    loadedPlugins.set(plugin.id, plugin);
    console.log(`Plugin ${plugin.id} loaded.`);
  }
  console.log(`${loadedPlugins.size} plugins loaded in total.`);
}

export async function applyPlugins(bot: Bot, originalMessage: TypegramMessage): Promise<TgcfNodeMessage | null> {
  let tgcfMessage = new TgcfNodeMessage(bot, originalMessage);

  for (const plugin of loadedPlugins.values()) {
    try {
      const modifiedMessage = await plugin.modify(tgcfMessage);
      if (!modifiedMessage) {
        console.log(`Message processing stopped by plugin: ${plugin.id}. Original message ID: ${originalMessage.message_id}`);
        if (tgcfMessage.filePath && tgcfMessage.cleanupFilePath) { // Check if the current tgcfMessage instance has a file to clean
            await tgcfMessage.clearTemporaryFile();
        }
        return null;
      }
      tgcfMessage = modifiedMessage; // Update tgcfMessage with the result from the plugin
    } catch (error) {
      console.error(`Error applying plugin ${plugin.id} to message ID ${originalMessage.message_id}:`, error);
      // Decide if processing should stop on plugin error. For now, let's stop.
      if (tgcfMessage.filePath && tgcfMessage.cleanupFilePath) {
        await tgcfMessage.clearTemporaryFile();
      }
      return null; // Or re-throw, or return tgcfMessage as it was before error
    }
  }
  
  // If the message survived all plugins, it's returned.
  // The caller is responsible for calling tgcfMessage.clearTemporaryFile() after handling.
  return tgcfMessage;
}
