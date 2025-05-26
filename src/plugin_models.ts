// Defines the type of a file.
export enum FileType {
  AUDIO = "audio",
  GIF = "gif", // Document of mimetype image/gif
  VIDEO = "video",
  VIDEO_NOTE = "video_note",
  STICKER = "sticker",
  CONTACT = "contact",
  PHOTO = "photo", // A photo (not a document)
  DOCUMENT = "document", // A generic document
  NOFILE = "nofile", // Message does not contain a file
}

// Base interface for filter lists (used for users and text patterns)
export interface FilterListConfig {
  blacklist?: string[];
  whitelist?: string[];
}

// Interface for file filter lists
export interface FilesFilterListConfig {
  blacklist?: FileType[];
  whitelist?: FileType[];
}

// Interface for text filtering configuration
export interface TextFilterConfig extends FilterListConfig {
  case_sensitive?: boolean;
  regex?: boolean;
}

// Enum for text formatting styles
export enum Style {
  BOLD = "bold",
  ITALICS = "italics",
  CODE = "code",
  STRIKE = "strike",
  PLAIN = "plain",
  PRESERVE = "preserve", // Keep original formatting
}

// Interface for filter plugin configuration
export interface FilterPluginConfig {
  check: boolean;
  users?: FilterListConfig;
  files?: FilesFilterListConfig;
  text?: TextFilterConfig;
}

// Interface for format plugin configuration
export interface FormatPluginConfig {
  check: boolean;
  style?: Style;
}

// Enum for watermark positions (assuming it's similar to python's watermark library)
// This might need adjustment based on actual watermark library used in JS/TS
export enum WatermarkPosition {
  TOP_LEFT = "TL",
  TOP_RIGHT = "TR",
  BOTTOM_LEFT = "BL",
  BOTTOM_RIGHT = "BR",
  CENTRE = "C",
}

// Interface for watermark plugin configuration
export interface MarkPluginConfig {
  check: boolean;
  image?: string; // Path or URL to watermark image
  // Python's watermark library also supports (scale, x_margin, y_margin) tuples for position,
  // which is complex for direct translation here.
  // Current implementation supports simple enum positions and direct string pass-through for libraries like sharp.
  position?: WatermarkPosition | string; // Allow string for custom like 'scale:0.5:0:0'
  frame_rate?: number; // For video watermarking
}

// Interface for OCR plugin configuration
export interface OcrPluginConfig {
  check: boolean;
  // Add any OCR specific options here, e.g., language
  // lang?: string;
}

// Interface for text replacement plugin configuration
export interface ReplacePluginConfig {
  check: boolean;
  text?: { [key: string]: string }; // Simple key-value replacements
  text_raw?: string; // Raw string for complex replacements (e.g., multiple lines or structures)
  regex?: boolean;
}

// Interface for caption plugin configuration
export interface CaptionPluginConfig {
  check: boolean;
  header?: string;
  footer?: string;
}

// Interface for sender plugin configuration
export interface SenderPluginConfig {
  check: boolean;
  user_type?: number; // 0:bot, 1:user
  BOT_TOKEN?: string;
  SESSION_STRING?: string; // For user accounts (MTProto)
}

// Main interface to group all plugin configurations
export interface PluginsConfig {
  filter?: FilterPluginConfig;
  fmt?: FormatPluginConfig; // 'fmt' to match Python 'fmt'
  mark?: MarkPluginConfig;
  ocr?: OcrPluginConfig;
  replace?: ReplacePluginConfig;
  caption?: CaptionPluginConfig;
  sender?: SenderPluginConfig;
}

// List of plugin IDs that may need asynchronous initialization
export const ASYNC_PLUGIN_IDS: string[] = ['sender'];
