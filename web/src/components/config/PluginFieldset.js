"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PluginFieldset;
const react_1 = __importDefault(require("react"));
function PluginFieldset({ title, pluginKey, isEnabled, onToggle, children, error, }) {
    return (<fieldset className="border border-gray-700 p-6 rounded-lg mb-8 shadow-md bg-gray-800/50">
      <legend className="text-xl font-semibold text-white px-2 py-1 rounded-md bg-gray-700">
        {title}
      </legend>
      
      <div className="flex items-center mb-6">
        <input type="checkbox" id={`enable-${pluginKey}`} checked={isEnabled} onChange={(e) => onToggle(pluginKey, e.target.checked)} className="h-5 w-5 rounded border-gray-500 text-blue-500 focus:ring-blue-400 bg-gray-600 cursor-pointer"/>
        <label htmlFor={`enable-${pluginKey}`} className="ml-3 block text-lg font-medium text-gray-200 cursor-pointer">
          Enable {title} Plugin
        </label>
      </div>

      {isEnabled && (<div className="space-y-4 pl-2 border-l-2 border-gray-700 ml-2">
          {children}
        </div>)}
      {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
    </fieldset>);
}
