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
exports.default = AdminsPage;
const react_1 = require("react");
const apiClient_1 = require("../../lib/apiClient"); // Adjusted path
function AdminsPage() {
    const [fullConfig, setFullConfig] = (0, react_1.useState)(null);
    const [admins, setAdmins] = (0, react_1.useState)([]);
    const [newAdmin, setNewAdmin] = (0, react_1.useState)(''); // Input is always string
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [successMessage, setSuccessMessage] = (0, react_1.useState)(null);
    // Fetch initial configuration
    (0, react_1.useEffect)(() => {
        function fetchInitialConfig() {
            return __awaiter(this, void 0, void 0, function* () {
                setIsLoading(true);
                setError(null);
                try {
                    const config = yield (0, apiClient_1.getConfig)();
                    setFullConfig(config);
                    setAdmins(config.admins || []); // Initialize with current admins or empty array
                }
                catch (err) {
                    setError(err.message || 'Failed to fetch configuration.');
                    setAdmins([]); // Default to empty if fetch fails
                }
                finally {
                    setIsLoading(false);
                }
            });
        }
        fetchInitialConfig();
    }, []);
    const handleAddAdmin = (e) => {
        e.preventDefault();
        if (!newAdmin.trim()) {
            setError("Admin ID or Username cannot be empty.");
            return;
        }
        // Attempt to convert to number if it's purely numeric, otherwise keep as string
        const adminToAdd = /^\d+$/.test(newAdmin.trim())
            ? parseInt(newAdmin.trim(), 10)
            : newAdmin.trim();
        if (admins.includes(adminToAdd)) {
            setError(`Admin "${adminToAdd}" already exists.`);
            return;
        }
        setAdmins([...admins, adminToAdd]);
        setNewAdmin('');
        setError(null); // Clear error on successful add
        setSuccessMessage(null); // Clear previous success message
    };
    const handleRemoveAdmin = (adminToRemove) => {
        setAdmins(admins.filter(admin => admin !== adminToRemove));
        setSuccessMessage(null); // Clear previous success message
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
            const updatedConfig = Object.assign(Object.assign({}, fullConfig), { admins: admins });
            yield (0, apiClient_1.saveConfig)(updatedConfig);
            setFullConfig(updatedConfig); // Update local fullConfig state
            setSuccessMessage('Admin configuration saved successfully!');
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
        <h1 className="text-3xl font-bold text-white text-center mb-8">Manage Admins</h1>

        {error && <div className="bg-red-900/70 text-red-200 p-3 rounded-md my-4 text-center">{error}</div>}
        {successMessage && <div className="bg-green-900/70 text-green-200 p-3 rounded-md my-4 text-center">{successMessage}</div>}

        <form onSubmit={handleAddAdmin} className="mb-8 flex flex-col sm:flex-row items-stretch gap-3">
          <input type="text" value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} placeholder="Enter Admin ID or Username" className="flex-grow mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-150 whitespace-nowrap">
            Add Admin
          </button>
        </form>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Current Admins:</h2>
          {admins.length === 0 ? (<p className="text-gray-400">No admins configured.</p>) : (<ul className="space-y-2">
              {admins.map((admin, index) => (<li key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded-md shadow">
                  <span className="text-gray-200">{admin}</span>
                  <button onClick={() => handleRemoveAdmin(admin)} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-150">
                    Remove
                  </button>
                </li>))}
            </ul>)}
        </div>

        <div className="mt-10 text-center">
          <button onClick={handleSaveChanges} disabled={isSaving || isLoading} // Also disable if initial load is happening
     className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 disabled:opacity-50 text-lg">
            {isSaving ? 'Saving...' : 'Save Admin Configuration'}
          </button>
        </div>
      </div>
    </div>);
}
