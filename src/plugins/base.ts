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

// Optional: Abstract base class for plugins if common utilities are identified.
// For now, the interface is sufficient.
/*
export abstract class TgcfBasePlugin implements ITgcfPlugin {
  public readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  public async init?(): Promise<void> {
    // Default implementation: do nothing
  }

  public abstract modify(message: TgcfNodeMessage): Promise<TgcfNodeMessage | null | undefined>;

  // Example of a common utility method plugins might need
  // protected log(level: string, msg: string): void {
  //   console.log(`[${this.id}] [${level.toUpperCase()}]: ${msg}`);
  // }
}
*/
