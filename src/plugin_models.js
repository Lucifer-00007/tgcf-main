"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASYNC_PLUGIN_IDS = exports.WatermarkPosition = exports.Style = exports.FileType = void 0;
// Defines the type of a file.
var FileType;
(function (FileType) {
    FileType["AUDIO"] = "audio";
    FileType["GIF"] = "gif";
    FileType["VIDEO"] = "video";
    FileType["VIDEO_NOTE"] = "video_note";
    FileType["STICKER"] = "sticker";
    FileType["CONTACT"] = "contact";
    FileType["PHOTO"] = "photo";
    FileType["DOCUMENT"] = "document";
    FileType["NOFILE"] = "nofile";
})(FileType || (exports.FileType = FileType = {}));
// Enum for text formatting styles
var Style;
(function (Style) {
    Style["BOLD"] = "bold";
    Style["ITALICS"] = "italics";
    Style["CODE"] = "code";
    Style["STRIKE"] = "strike";
    Style["PLAIN"] = "plain";
    Style["PRESERVE"] = "preserve";
})(Style || (exports.Style = Style = {}));
// Enum for watermark positions (assuming it's similar to python's watermark library)
// This might need adjustment based on actual watermark library used in JS/TS
var WatermarkPosition;
(function (WatermarkPosition) {
    WatermarkPosition["TOP_LEFT"] = "TL";
    WatermarkPosition["TOP_RIGHT"] = "TR";
    WatermarkPosition["BOTTOM_LEFT"] = "BL";
    WatermarkPosition["BOTTOM_RIGHT"] = "BR";
    WatermarkPosition["CENTRE"] = "C";
})(WatermarkPosition || (exports.WatermarkPosition = WatermarkPosition = {}));
// List of plugin IDs that may need asynchronous initialization
exports.ASYNC_PLUGIN_IDS = ['sender'];
