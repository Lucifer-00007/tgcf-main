"use strict";
'use client';
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
exports.default = AdvancedConfigPage;
const react_1 = require("react");
const apiClient_1 = require("../../lib/apiClient"); // Adjusted path
const initialFormState = {
    show_forwarded_from: false,
    mode: 'live',
    live_sequential_updates: false,
    live_delete_sync: false,
    live_delete_on_edit: '',
    past_delay: 0,
    theme: 'light',
    bot_messages_start: '',
    bot_messages_bot_help: '',
};
function AdvancedConfigPage() {
    const [fullConfig, setFullConfig] = (0, react_1.useState)(null);
    const [formState, setFormState] = (0, react_1.useState)(initialFormState);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [successMessage, setSuccessMessage] = (0, react_1.useState)(null);
    // Fetch initial configuration
    (0, react_1.useEffect)(() => {
        function fetchInitialConfig() {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f;
                setIsLoading(true);
                setError(null);
                try {
                    const config = yield (0, apiClient_1.getConfig)();
                    setFullConfig(config);
                    // Map loaded config to form state
                    setFormState({
                        show_forwarded_from: !!config.show_forwarded_from,
                        mode: config.mode === 1 ? 'past' : 'live', // 0 is live, 1 is past
                        live_sequential_updates: !!((_a = config.live) === null || _a === void 0 ? void 0 : _a.sequential_updates),
                        live_delete_sync: !!((_b = config.live) === null || _b === void 0 ? void 0 : _b.delete_sync),
                        live_delete_on_edit: ((_c = config.live) === null || _c === void 0 ? void 0 : _c.delete_on_edit) || '', // Default to empty string if null/undefined
                        past_delay: ((_d = config.past) === null || _d === void 0 ? void 0 : _d.delay) || 0,
                        theme: config.theme || 'light',
                        bot_messages_start: ((_e = config.bot_messages) === null || _e === void 0 ? void 0 : _e.start) || '',
                        bot_messages_bot_help: ((_f = config.bot_messages) === null || _f === void 0 ? void 0 : _f.bot_help) || '',
                    });
                }
                catch (err) {
                    setError(err.message || 'Failed to fetch configuration.');
                    setFormState(initialFormState); // Reset to defaults on error
                }
                finally {
                    setIsLoading(false);
                }
            });
        }
        fetchInitialConfig();
    }, []);
    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target;
            setFormState(prev => (Object.assign(Object.assign({}, prev), { [name]: checked })));
        }
        else if (type === 'number') {
            setFormState(prev => (Object.assign(Object.assign({}, prev), { [name]: value === '' ? 0 : parseFloat(value) }))); // Handle empty string for numbers
        }
        else {
            setFormState(prev => (Object.assign(Object.assign({}, prev), { [name]: value })));
        }
        setSuccessMessage(null);
        setError(null);
    };
    const handleSaveChanges = () => __awaiter(this, void 0, void 0, function* () {
        if (!fullConfig) {
            setError("Original configuration not loaded. Cannot save.");
            return;
        }
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);
        try {
            // Construct the updated config parts from formState
            const updatedLiveSettings = {
                sequential_updates: formState.live_sequential_updates,
                delete_sync: formState.live_delete_sync,
                delete_on_edit: formState.live_delete_on_edit.trim() === '' ? null : formState.live_delete_on_edit.trim(),
            };
            const updatedPastSettings = {
                delay: formState.past_delay,
            };
            const updatedBotMessages = {
                start: formState.bot_messages_start,
                bot_help: formState.bot_messages_bot_help,
            };
            const configToSave = Object.assign(Object.assign({}, fullConfig), { show_forwarded_from: formState.show_forwarded_from, mode: formState.mode === 'past' ? 1 : 0, live: Object.assign(Object.assign({}, (fullConfig.live || {})), updatedLiveSettings), past: Object.assign(Object.assign({}, (fullConfig.past || {})), updatedPastSettings), theme: formState.theme, bot_messages: Object.assign(Object.assign({}, (fullConfig.bot_messages || {})), updatedBotMessages) });
            yield (0, apiClient_1.saveConfig)(configToSave);
            setFullConfig(configToSave); // Update local fullConfig state
            setSuccessMessage('Advanced configuration saved successfully!');
        }
        catch (err) {
            setError(err.message || 'Failed to save configuration.');
        }
        finally {
            setIsSaving(false);
        }
    });
    if (isLoading) {
        return <div className="text-center p-10">Loading configuration...</div>;
    }
    return (<div className="container mx-auto p-4">
      <div className="bg-gray-800 shadow-xl rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold text-white text-center mb-10">Advanced Settings</h1>

        {error && <div className="bg-red-900/70 text-red-200 p-3 rounded-md my-4 text-center">{error}</div>}
        {successMessage && <div className="bg-green-900/70 text-green-200 p-3 rounded-md my-4 text-center">{successMessage}</div>}

        <div className="space-y-8">
          {/* General Settings */}
          <fieldset className="border border-gray-700 p-6 rounded-lg bg-gray-800/50">
            <legend className="text-xl font-semibold text-white px-2">General</legend>
            <div className="space-y-4 mt-4">
              <div className="flex items-center">
                <input type="checkbox" name="show_forwarded_from" id="show_forwarded_from" checked={formState.show_forwarded_from} onChange={handleInputChange} className="h-5 w-5 rounded border-gray-500 text-blue-500 focus:ring-blue-400 bg-gray-600 cursor-pointer"/>
                <label htmlFor="show_forwarded_from" className="ml-3 block text-sm font-medium text-gray-200">Show "Forwarded From"</label>
              </div>
              <div>
                <label htmlFor="mode" className="block text-sm font-medium text-gray-300 mb-1">Operation Mode</label>
                <select name="mode" id="mode" value={formState.mode} onChange={handleInputChange} className="input-style">
                  <option value="live">Live (Forward new messages)</option>
                  <option value="past">Past (Forward existing messages)</option>
                </select>
              </div>
              <div>
                <label htmlFor="theme" className="block text-sm font-medium text-gray-300 mb-1">UI Theme</label>
                <input type="text" name="theme" id="theme" value={formState.theme} onChange={handleInputChange} className="input-style" placeholder="e.g., light, dark"/>
              </div>
            </div>
          </fieldset>

          {/* Live Mode Settings */}
          <fieldset className="border border-gray-700 p-6 rounded-lg bg-gray-800/50">
            <legend className="text-xl font-semibold text-white px-2">Live Mode Settings</legend>
            <div className="space-y-4 mt-4">
              <div className="flex items-center">
                <input type="checkbox" name="live_sequential_updates" id="live_sequential_updates" checked={formState.live_sequential_updates} onChange={handleInputChange} className="h-5 w-5 rounded border-gray-500 text-blue-500 focus:ring-blue-400 bg-gray-600 cursor-pointer"/>
                <label htmlFor="live_sequential_updates" className="ml-3 block text-sm font-medium text-gray-200">Sequential Updates</label>
              </div>
              <div className="flex items-center">
                <input type="checkbox" name="live_delete_sync" id="live_delete_sync" checked={formState.live_delete_sync} onChange={handleInputChange} className="h-5 w-5 rounded border-gray-500 text-blue-500 focus:ring-blue-400 bg-gray-600 cursor-pointer"/>
                <label htmlFor="live_delete_sync" className="ml-3 block text-sm font-medium text-gray-200">Delete Sync (Sync message deletions)</label>
              </div>
              <div>
                <label htmlFor="live_delete_on_edit" className="block text-sm font-medium text-gray-300 mb-1">Delete on Edit (Trigger string, empty for none)</label>
                <input type="text" name="live_delete_on_edit" id="live_delete_on_edit" value={formState.live_delete_on_edit} onChange={handleInputChange} className="input-style" placeholder="e.g., .deleteMe or empty"/>
                <p className="text-xs text-gray-500 mt-1">If a message is edited to this exact string, it will be deleted. Leave empty to disable.</p>
              </div>
            </div>
          </fieldset>

          {/* Past Mode Settings */}
          <fieldset className="border border-gray-700 p-6 rounded-lg bg-gray-800/50">
            <legend className="text-xl font-semibold text-white px-2">Past Mode Settings</legend>
            <div className="space-y-4 mt-4">
              <div>
                <label htmlFor="past_delay" className="block text-sm font-medium text-gray-300 mb-1">Delay Between Messages (ms)</label>
                <input type="number" name="past_delay" id="past_delay" value={formState.past_delay} onChange={handleInputChange} className="input-style" placeholder="e.g., 1000"/>
              </div>
            </div>
          </fieldset>
          
          {/* Bot Messages Settings */}
          <fieldset className="border border-gray-700 p-6 rounded-lg bg-gray-800/50">
            <legend className="text-xl font-semibold text-white px-2">Bot Messages</legend>
            <div className="space-y-4 mt-4">
              <div>
                <label htmlFor="bot_messages_start" className="block text-sm font-medium text-gray-300 mb-1">Start Message</label>
                <input type="text" name="bot_messages_start" id="bot_messages_start" value={formState.bot_messages_start} onChange={handleInputChange} className="input-style" placeholder="Message for /start command"/>
              </div>
              <div>
                <label htmlFor="bot_messages_bot_help" className="block text-sm font-medium text-gray-300 mb-1">Help Message</label>
                <input type="text" name="bot_messages_bot_help" id="bot_messages_bot_help" value={formState.bot_messages_bot_help} onChange={handleInputChange} className="input-style" placeholder="Message for /help command"/>
              </div>
            </div>
          </fieldset>
        </div>

        <div className="mt-12 text-center">
          <button onClick={handleSaveChanges} disabled={isSaving || isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 disabled:opacity-50 text-lg">
            {isSaving ? 'Saving Advanced Settings...' : 'Save Advanced Settings'}
          </button>
        </div>
      </div>
      <style jsx global>{`
        .input-style {
          display: block;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background-color: #374151; /* bg-gray-700 */
          border: 1px solid #4B5563; /* border-gray-600 */
          border-radius: 0.375rem; /* rounded-md */
          color: white;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
        }
        .input-style:focus {
          outline: none;
          box-shadow: 0 0 0 2px #3B82F6; /* focus:ring-blue-500 */
          border-color: #3B82F6; /* focus:border-blue-500 */
        }
        /* Ensure number input spinners are visible in dark mode if needed */
        .input-style[type="number"]::-webkit-inner-spin-button,
        .input-style[type="number"]::-webkit-outer-spin-button {
          opacity: 0.2; /* Or a color that contrasts with dark background */
        }
      `}</style>
    </div>);
}
