'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { getConfig, saveConfig } from '../../lib/apiClient'; // Adjusted path
import type { Config, PluginsConfig, CaptionPluginConfig, MarkPluginConfig, ReplacePluginConfig } from '../../../../src/config'; // Import types
import PluginFieldset from '../../../components/config/PluginFieldset'; // Adjusted path

// Helper to get string value, default to empty string if undefined or null
const str = (val: string | undefined | null): string => val || '';

// Define a type for the ReplaceRule to match the expected structure for UI
interface UIReplyRule {
  id: string; // For React key
  find: string;
  replace: string;
  // Add other fields like case_sensitive, regex if needed by UI, but backend uses text_raw or text object
}


export default function PluginsPage() {
  const [fullConfig, setFullConfig] = useState<Config | null>(null);
  const [pluginsConfig, setPluginsConfig] = useState<PluginsConfig | null>(null);
  
  // Specific state for complex plugins like 'replace'
  const [replaceRules, setReplaceRules] = useState<UIReplyRule[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch initial configuration
  useEffect(() => {
    async function fetchInitialConfig() {
      setIsLoading(true);
      setError(null);
      try {
        const config = await getConfig();
        setFullConfig(config);
        setPluginsConfig(config.plugins || {});
        
        // Initialize replaceRules from config.plugins.replace
        const replaceConf = config.plugins?.replace;
        if (replaceConf?.text_raw) {
            const rulesFromRaw = replaceConf.text_raw.split('\n')
                .map((line, index) => {
                    const parts = line.split('->');
                    if (parts.length === 2) {
                        return { id: `raw-${index}-${Date.now()}`, find: parts[0].trim(), replace: parts[1].trim() };
                    }
                    return null;
                })
                .filter(rule => rule !== null) as UIReplyRule[];
            setReplaceRules(rulesFromRaw);
        } else if (replaceConf?.text) {
             const rulesFromTextObj = Object.entries(replaceConf.text).map(([find, replace], index) => ({
                id: `textobj-${index}-${Date.now()}`, find, replace
            }));
            setReplaceRules(rulesFromTextObj);
        }

      } catch (err: any) {
        setError(err.message || 'Failed to fetch configuration.');
        setPluginsConfig({});
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialConfig();
  }, []);

  const handlePluginToggle = (pluginKey: keyof PluginsConfig, isEnabled: boolean) => {
    setPluginsConfig(prev => {
      if (!prev) return null;
      const updatedPluginConf = { ...(prev[pluginKey] || {}), check: isEnabled };
      return { ...prev, [pluginKey]: updatedPluginConf };
    });
    setSuccessMessage(null); setError(null);
  };

  const handleInputChange = (
    pluginKey: keyof PluginsConfig, 
    field: string, 
    value: string | number | boolean
  ) => {
    setPluginsConfig(prev => {
      if (!prev) return null;
      const currentPluginConf = prev[pluginKey] || {};
      // Type assertion needed as field is a string key of a specific plugin config type
      const updatedPluginConf = { ...currentPluginConf, [field]: value };
      return { ...prev, [pluginKey]: updatedPluginConf };
    });
    setSuccessMessage(null); setError(null);
  };

  // Specific handlers for Replace Plugin Rules
  const handleAddReplaceRule = () => {
    setReplaceRules(prev => [...prev, { id: `new-${Date.now()}`, find: '', replace: '' }]);
    setSuccessMessage(null); setError(null);
  };

  const handleReplaceRuleChange = (index: number, field: 'find' | 'replace', value: string) => {
    setReplaceRules(prev => 
      prev.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule))
    );
    setSuccessMessage(null); setError(null);
  };

  const handleRemoveReplaceRule = (id: string) => {
    setReplaceRules(prev => prev.filter(rule => rule.id !== id));
    setSuccessMessage(null); setError(null);
  };


  const handleSaveChanges = async () => {
    if (!fullConfig || !pluginsConfig) {
      setError("Configuration not loaded or plugins data is missing. Cannot save.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Construct the 'replace' plugin config from UI state (replaceRules)
    const updatedPluginsConfig = { ...pluginsConfig };
    if (updatedPluginsConfig.replace) {
        // Prioritize text_raw for simplicity, matching one of backend's preferred ways
        // If rules are empty, set text_raw to empty string or handle as per backend expectation
        updatedPluginsConfig.replace.text_raw = replaceRules
            .filter(rule => rule.find.trim() !== "" || rule.replace.trim() !== "") // Keep rules that are not entirely empty
            .map(rule => `${rule.find.trim()} -> ${rule.replace.trim()}`)
            .join('\n');
        // Clear out the 'text' object if 'text_raw' is being used to avoid conflicts,
        // or adopt a strategy (e.g. backend merges or prefers one). For now, assume text_raw is primary for UI.
        updatedPluginsConfig.replace.text = {}; // Or undefined, depending on backend preference
    }


    try {
      const configToSave = { ...fullConfig, plugins: updatedPluginsConfig };
      await saveConfig(configToSave);
      setFullConfig(configToSave); // Update local fullConfig state
      setPluginsConfig(updatedPluginsConfig); // Update local pluginsConfig state
      setSuccessMessage('Plugins configuration saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };
  

  if (isLoading) {
    return <div className="text-center p-10">Loading configuration...</div>;
  }
  if (!pluginsConfig) {
    return <div className="text-center p-10 text-red-400">Plugins configuration could not be loaded.</div>;
  }

  const renderPluginFields = (pluginKey: keyof PluginsConfig) => {
    const config = pluginsConfig[pluginKey] as any; // Use 'as any' for simplicity, or create specific types
    if (!config) return <p className="text-gray-400">This plugin is not configured.</p>;

    switch (pluginKey) {
      case 'caption':
        const captionConf = config as CaptionPluginConfig;
        return (
          <>
            <div>
              <label htmlFor="caption-header" className="block text-sm font-medium text-gray-300 mb-1">Header</label>
              <input type="text" id="caption-header" value={str(captionConf.header)} 
                     onChange={(e) => handleInputChange('caption', 'header', e.target.value)}
                     className="input-style" placeholder="Text to add before message"/>
            </div>
            <div>
              <label htmlFor="caption-footer" className="block text-sm font-medium text-gray-300 mb-1">Footer</label>
              <input type="text" id="caption-footer" value={str(captionConf.footer)}
                     onChange={(e) => handleInputChange('caption', 'footer', e.target.value)}
                     className="input-style" placeholder="Text to add after message"/>
            </div>
          </>
        );
      case 'mark':
        const markConf = config as MarkPluginConfig;
        return (
          <>
            <div>
              <label htmlFor="mark-image" className="block text-sm font-medium text-gray-300 mb-1">Watermark Image Path</label>
              <input type="text" id="mark-image" value={str(markConf.image)}
                     onChange={(e) => handleInputChange('mark', 'image', e.target.value)}
                     className="input-style" placeholder="/path/to/watermark.png"/>
            </div>
            {/* Position and frame_rate could be added here if desired */}
          </>
        );
      case 'replace':
        const replaceConf = config as ReplacePluginConfig;
        return (
          <>
            <div className="mb-4">
                <label htmlFor="replace-regex" className="flex items-center text-sm font-medium text-gray-300">
                <input type="checkbox" id="replace-regex" checked={!!replaceConf.regex}
                        onChange={(e) => handleInputChange('replace', 'regex', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-500 text-blue-500 focus:ring-blue-400 bg-gray-600 mr-2"/>
                Use Regular Expressions for all rules
                </label>
            </div>
            <h4 className="text-md font-semibold text-gray-200 mb-2">Replacement Rules (Find -> Replace):</h4>
            {replaceRules.map((rule, index) => (
              <div key={rule.id} className="flex items-center gap-2 mb-2 p-2 border border-gray-600 rounded-md">
                <input type="text" value={rule.find} placeholder="Find"
                       onChange={(e) => handleReplaceRuleChange(index, 'find', e.target.value)}
                       className="input-style flex-1"/>
                <span className="text-gray-400">→</span>
                <input type="text" value={rule.replace} placeholder="Replace"
                       onChange={(e) => handleReplaceRuleChange(index, 'replace', e.target.value)}
                       className="input-style flex-1"/>
                <button onClick={() => handleRemoveReplaceRule(rule.id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded-md bg-gray-700 hover:bg-gray-600 text-xs">Remove</button>
              </div>
            ))}
            <button onClick={handleAddReplaceRule}
                    className="mt-2 text-sm bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded-md">
              Add Rule
            </button>
            <p className="text-xs text-gray-500 mt-2">
                Note: These rules will be saved into the 'text_raw' field, formatted as 'find -> replace' per line.
                The 'text' object field will be cleared if using this UI.
            </p>
          </>
        );
      default:
        // For other plugins, show their JSON representation
        return (
          <div>
            <label htmlFor={`${pluginKey}-json`} className="block text-sm font-medium text-gray-300 mb-1">Raw JSON Configuration</label>
            <textarea id={`${pluginKey}-json`} rows={5}
                      value={JSON.stringify(config, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          // This is a bit risky, ideally validate against schema
                          setPluginsConfig(prev => ({...prev, [pluginKey]: parsed }));
                        } catch (parseError) {
                          console.warn(`Error parsing JSON for ${pluginKey}:`, parseError);
                          // Optionally set a local error state for this specific textarea
                        }
                      }}
                      className="input-style font-mono text-xs"
                      placeholder={`JSON for ${pluginKey}`}/>
            <p className="text-xs text-gray-500 mt-1">Edit with caution. Ensure 'check: ${config.check}' is preserved if you want to toggle enable/disable.</p>
          </div>
        );
    }
  };


  return (
    <div className="container mx-auto p-4">
      <div className="bg-gray-800 shadow-xl rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold text-white text-center mb-10">Manage Plugins</h1>

        {error && <div className="bg-red-900/70 text-red-200 p-3 rounded-md my-4 text-center">{error}</div>}
        {successMessage && <div className="bg-green-900/70 text-green-200 p-3 rounded-md my-4 text-center">{successMessage}</div>}

        {Object.keys(pluginsConfig).map((key) => {
          const pluginKey = key as keyof PluginsConfig;
          const currentPluginConf = pluginsConfig[pluginKey] as any; // Use any for simplicity here
          if (!currentPluginConf) return null; // Should not happen if pluginsConfig is properly initialized

          return (
            <PluginFieldset
              key={pluginKey}
              title={pluginKey.charAt(0).toUpperCase() + pluginKey.slice(1)} // Capitalize first letter
              pluginKey={pluginKey}
              isEnabled={!!currentPluginConf.check}
              onToggle={handlePluginToggle}
            >
              {renderPluginFields(pluginKey)}
            </PluginFieldset>
          );
        })}

        <div className="mt-12 text-center">
          <button
            onClick={handleSaveChanges}
            disabled={isSaving || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 disabled:opacity-50 text-lg"
          >
            {isSaving ? 'Saving Plugin Configurations...' : 'Save All Plugin Configurations'}
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
      `}</style>
    </div>
  );
}
