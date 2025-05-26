import { TgcfNodeMessage } from '../message';

/**
 * Interface for all tgcf plugins.
 *
 * Each plugin must implement this interface to be loaded and used by the application.
 */
export interface ITgcfPlugin {
  /**
   * A unique identifier for the plugin (e.g., "filter", "formatter", "watermark").
   */
  readonly id: string;

  /**
   * An optional asynchronous method to initialize the plugin.
   * This can be used for setting up resources, loading data, or any other
   * one-time setup that the plugin might require before it starts processing messages.
   * If a plugin is listed in `ASYNC_PLUGIN_IDS` in `plugin_models.ts`, this method
   * will be awaited during application startup.
   */
  init?(): Promise<void>;

  /**
   * The core method of the plugin that processes or modifies a message.
   *
   * @param message The `TgcfNodeMessage` object to be processed.
   *                Plugins can modify this object directly (e.g., change its text,
   *                download its file to `filePath`, add custom properties).
   * @returns
   *  - A `Promise` resolving to the modified `TgcfNodeMessage` if processing is successful
   *    and the message should continue through the plugin chain.
   *  - A `Promise` resolving to `null` or `undefined` if the message should be filtered out
   *    or processing should stop for this message.
   *  - If a plugin encounters an error, it should ideally handle it gracefully or throw
   *    an error that can be caught by the plugin execution system.
   */
  modify(message: TgcfNodeMessage): Promise<TgcfNodeMessage | null | undefined>;
}

// Note: An abstract base class (TgcfBasePlugin) was previously considered here
// but deemed not essential for the current plugin structure.
// The ITgcfPlugin interface is used directly by all plugins.
