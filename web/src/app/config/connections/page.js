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
exports.default = ConnectionsPage;
const react_1 = require("react");
const apiClient_1 = require("../../lib/apiClient"); // Adjusted path
const initialFormState = {
    con_name: '',
    use_this: true,
    source: '',
    dest: '',
    offset: '',
    end: '',
};
function ConnectionsPage() {
    const [fullConfig, setFullConfig] = (0, react_1.useState)(null);
    const [connections, setConnections] = (0, react_1.useState)([]);
    const [newConnectionForm, setNewConnectionForm] = (0, react_1.useState)(initialFormState);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [successMessage, setSuccessMessage] = (0, react_1.useState)(null);
    const [editingIndex, setEditingIndex] = (0, react_1.useState)(null); // To edit existing connection
    // Fetch initial configuration
    (0, react_1.useEffect)(() => {
        function fetchInitialConfig() {
            return __awaiter(this, void 0, void 0, function* () {
                setIsLoading(true);
                setError(null);
                try {
                    const config = yield (0, apiClient_1.getConfig)();
                    setFullConfig(config);
                    setConnections(config.forwards || []);
                }
                catch (err) {
                    setError(err.message || 'Failed to fetch configuration.');
                    setConnections([]);
                }
                finally {
                    setIsLoading(false);
                }
            });
        }
        fetchInitialConfig();
    }, []);
    const handleFormChange = (e) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target;
            setNewConnectionForm(prev => (Object.assign(Object.assign({}, prev), { [name]: checked })));
        }
        else {
            setNewConnectionForm(prev => (Object.assign(Object.assign({}, prev), { [name]: value })));
        }
    };
    const parseInputToNumberOrString = (input) => {
        return /^\d+$/.test(input.trim()) ? parseInt(input.trim(), 10) : input.trim();
    };
    const handleAddOrUpdateConnection = (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        if (!newConnectionForm.source.trim() || !newConnectionForm.dest.trim() || !newConnectionForm.con_name.trim()) {
            setError("Connection Name, Source and at least one Destination are required.");
            return;
        }
        const destinationsArray = newConnectionForm.dest.split(',')
            .map(d => d.trim())
            .filter(d => d)
            .map(parseInputToNumberOrString);
        if (destinationsArray.length === 0) {
            setError("At least one valid Destination is required.");
            return;
        }
        const newForwardRule = {
            con_name: newConnectionForm.con_name.trim(),
            use_this: newConnectionForm.use_this,
            source: parseInputToNumberOrString(newConnectionForm.source),
            dest: destinationsArray,
            offset: newConnectionForm.offset.trim() ? parseInt(newConnectionForm.offset.trim(), 10) : undefined,
            end: newConnectionForm.end.trim() ? parseInt(newConnectionForm.end.trim(), 10) : (newConnectionForm.end.trim() === '' ? null : undefined),
        };
        // Validate offset and end are numbers if provided
        if (newConnectionForm.offset.trim() && isNaN(newForwardRule.offset)) {
            setError("Offset must be a valid number.");
            return;
        }
        if (newConnectionForm.end.trim() && newForwardRule.end !== null && isNaN(newForwardRule.end)) {
            setError("End must be a valid number or empty for null.");
            return;
        }
        let updatedConnections;
        if (editingIndex !== null) {
            updatedConnections = connections.map((conn, index) => index === editingIndex ? newForwardRule : conn);
            setSuccessMessage('Connection updated successfully!');
        }
        else {
            updatedConnections = [...connections, newForwardRule];
            setSuccessMessage('Connection added successfully! Click "Save Connections" to persist.');
        }
        setConnections(updatedConnections);
        setNewConnectionForm(initialFormState); // Reset form
        setEditingIndex(null); // Reset editing mode
    };
    const handleEditConnection = (index) => {
        var _a, _b;
        const connToEdit = connections[index];
        setNewConnectionForm({
            con_name: connToEdit.con_name || `Connection ${index + 1}`,
            use_this: connToEdit.use_this,
            source: String(connToEdit.source),
            dest: connToEdit.dest.join(', '),
            offset: ((_a = connToEdit.offset) === null || _a === void 0 ? void 0 : _a.toString()) || '',
            end: connToEdit.end === null ? '' : (((_b = connToEdit.end) === null || _b === void 0 ? void 0 : _b.toString()) || ''),
        });
        setEditingIndex(index);
        setError(null);
        setSuccessMessage(null);
    };
    const handleRemoveConnection = (indexToRemove) => {
        setConnections(connections.filter((_, index) => index !== indexToRemove));
        if (editingIndex === indexToRemove) { // If removing the item being edited
            setNewConnectionForm(initialFormState);
            setEditingIndex(null);
        }
        setSuccessMessage('Connection removed locally. Click "Save Connections" to persist changes.');
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
            const updatedConfig = Object.assign(Object.assign({}, fullConfig), { forwards: connections });
            yield (0, apiClient_1.saveConfig)(updatedConfig);
            setFullConfig(updatedConfig); // Update local fullConfig state
            setSuccessMessage('Connections configuration saved successfully!');
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
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          {editingIndex !== null ? 'Edit Connection' : 'Add New Connection'}
        </h1>

        {error && <div className="bg-red-900/70 text-red-200 p-3 rounded-md my-4 text-center">{error}</div>}
        {/* Success message for add/update is shown near form, global save success is also here */}
        {successMessage && !error && <div className="bg-green-900/70 text-green-200 p-3 rounded-md my-4 text-center">{successMessage}</div>}

        <form onSubmit={handleAddOrUpdateConnection} className="mb-10 p-6 bg-gray-750 rounded-lg shadow space-y-4">
          <div>
            <label htmlFor="con_name" className="block text-sm font-medium text-gray-300">Connection Name</label>
            <input type="text" name="con_name" id="con_name" value={newConnectionForm.con_name} onChange={handleFormChange} required className="mt-1 input-style" placeholder="e.g., My News Channel Forward"/>
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="use_this" id="use_this" checked={newConnectionForm.use_this} onChange={handleFormChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-gray-700 border-gray-600"/>
            <label htmlFor="use_this" className="ml-2 block text-sm text-gray-300">Enable this connection</label>
          </div>
          <div>
            <label htmlFor="source" className="block text-sm font-medium text-gray-300">Source (Chat ID or Username)</label>
            <input type="text" name="source" id="source" value={newConnectionForm.source} onChange={handleFormChange} required className="mt-1 input-style" placeholder="e.g., -100123456789 or my_channel_username"/>
          </div>
          <div>
            <label htmlFor="dest" className="block text-sm font-medium text-gray-300">Destinations (Comma-separated IDs/Usernames)</label>
            <input type="text" name="dest" id="dest" value={newConnectionForm.dest} onChange={handleFormChange} required className="mt-1 input-style" placeholder="e.g., my_group, another_user_id"/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="offset" className="block text-sm font-medium text-gray-300">Offset (Message ID, optional)</label>
              <input type="number" name="offset" id="offset" value={newConnectionForm.offset} onChange={handleFormChange} className="mt-1 input-style" placeholder="e.g., 12345"/>
            </div>
            <div>
              <label htmlFor="end" className="block text-sm font-medium text-gray-300">End (Message ID, optional, empty for none)</label>
              <input type="text" name="end" id="end" value={newConnectionForm.end} onChange={handleFormChange} className="mt-1 input-style" placeholder="e.g., 67890 or empty"/>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            {editingIndex !== null && (<button type="button" onClick={() => { setEditingIndex(null); setNewConnectionForm(initialFormState); setError(null); setSuccessMessage(null); }} className="secondary-button">Cancel Edit</button>)}
            <button type="submit" className="primary-button">
              {editingIndex !== null ? 'Update Connection' : 'Add Connection to List'}
            </button>
          </div>
        </form>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Current Connections:</h2>
          {connections.length === 0 ? (<p className="text-gray-400 text-center">No connections configured yet. Add one using the form above.</p>) : (<div className="space-y-4">
              {connections.map((conn, index) => (<div key={index} className={`p-4 rounded-lg shadow ${conn.use_this ? 'bg-gray-700' : 'bg-gray-600 opacity-70'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-white">{conn.con_name || `Connection ${index + 1}`} {!conn.use_this && "(Disabled)"}</h3>
                    <div className="space-x-2">
                      <button onClick={() => handleEditConnection(index)} className="text-sm bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-1 px-3 rounded-md transition duration-150">Edit</button>
                      <button onClick={() => handleRemoveConnection(index)} className="text-sm bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-md transition duration-150">Remove</button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300"><strong className="font-medium text-gray-200">Source:</strong> {conn.source}</p>
                  <p className="text-sm text-gray-300"><strong className="font-medium text-gray-200">Destinations:</strong> {conn.dest.join(', ')}</p>
                  {conn.offset !== undefined && <p className="text-sm text-gray-300"><strong className="font-medium text-gray-200">Offset:</strong> {conn.offset}</p>}
                  {conn.end !== undefined && <p className="text-sm text-gray-300"><strong className="font-medium text-gray-200">End:</strong> {conn.end === null ? 'None (process all)' : conn.end}</p>}
                </div>))}
            </div>)}
        </div>

        {connections.length > 0 && (<div className="mt-10 text-center">
            <button onClick={handleSaveChanges} disabled={isSaving || isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 disabled:opacity-50 text-lg">
                {isSaving ? 'Saving Connections...' : 'Save All Connections to Config'}
            </button>
            </div>)}
      </div>
      {/* Helper for input styles, can be global */}
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
        .primary-button {
            background-color: #2563EB; /* bg-blue-600 */
            color: white;
            font-weight: 600; /* font-semibold */
            padding: 0.5rem 1rem;
            border-radius: 0.375rem; /* rounded-md */
        }
        .primary-button:hover {
            background-color: #1D4ED8; /* hover:bg-blue-700 */
        }
        .secondary-button {
            background-color: #4B5563; /* bg-gray-600 */
            color: white;
            font-weight: 600; /* font-semibold */
            padding: 0.5rem 1rem;
            border-radius: 0.375rem; /* rounded-md */
        }
        .secondary-button:hover {
            background-color: #374151; /* hover:bg-gray-700 */
        }
      `}</style>
    </div>);
}
