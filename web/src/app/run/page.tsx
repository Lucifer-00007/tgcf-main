'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getTgcfProcessStatus,
  startTgcfMode, 
  stopTgcfMode, 
  terminateOcr,
  type TgcfStatus as TgcfProcessStatus, // Using the specific interface name
  type TgcfProcessMode 
} from '../lib/apiClient'; // Assuming this path is correct and file exists

const initialStatus: TgcfProcessStatus = {
  currentMode: 'idle',
  statusMessage: 'Fetching status...',
  error: null,
};

export default function RunControlPage() {
  const [status, setStatus] = useState<TgcfProcessStatus>(initialStatus);
  const [isLoadingApi, setIsLoadingApi] = useState(false); // For button actions
  const [errorApi, setErrorApi] = useState<string | null>(null); // For API call errors
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // For success messages from API

  const fetchStatus = useCallback(async (isBackgroundTask = false) => {
    if (!isBackgroundTask) {
      // Potentially set a global loading state if needed, but for now,
      // individual button loading states are handled by isLoadingApi.
      // We want to avoid a full page "Loading status..." for background refreshes.
    }
    // Clear action-specific errors/success messages on new status fetch if they are not persistent
    // setErrorApi(null); 
    // setSuccessMessage(null);
    try {
      const newStatus = await getTgcfProcessStatus();
      setStatus(newStatus);
      if (newStatus.error) { // If the status itself contains an error message
        setErrorApi(newStatus.error);
      } else {
        setErrorApi(null); // Clear API error if status is fine
      }
    } catch (err: any) {
      console.error('Error fetching status:', err);
      setErrorApi(`Failed to fetch status: ${err.message}`);
      // Keep last known status, or set to a specific error status:
      // setStatus({ currentMode: 'idle', statusMessage: `Error fetching status: ${err.message}`, error: err.message });
    }
  }, []);

  useEffect(() => {
    fetchStatus(); // Initial fetch
    const intervalId = setInterval(() => fetchStatus(true), 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchStatus]);

  const handleStart = async (mode: 'live' | 'past') => {
    setIsLoadingApi(true);
    setErrorApi(null);
    setSuccessMessage(null);
    try {
      const response = await startTgcfMode(mode);
      setSuccessMessage(response.message || `Successfully requested to start ${mode} mode.`);
      // Fetch status after a short delay to allow backend to update its state
      setTimeout(() => fetchStatus(), 1000); 
    } catch (err: any) {
      setErrorApi(err.message || `Failed to start ${mode} mode.`);
      setTimeout(() => fetchStatus(), 1000); // Also fetch status on error to get latest state
    } finally {
      // setIsLoadingApi(false); // Let status refresh handle loading state indirectly
      // The setIsLoadingApi(false) will be handled by the status update or if an error occurs directly in the catch
    }
  };

  const handleStop = async () => {
    setIsLoadingApi(true);
    setErrorApi(null);
    setSuccessMessage(null);
    try {
      const response = await stopTgcfMode();
      setSuccessMessage(response.message || 'Successfully requested to stop tgcf.');
      setTimeout(() => fetchStatus(), 1000);
    } catch (err: any) {
      setErrorApi(err.message || 'Failed to stop tgcf.');
      setTimeout(() => fetchStatus(), 1000);
    } finally {
      // setIsLoadingApi(false);
    }
  };
  
  const handleTerminateOcr = async () => {
    setIsLoadingApi(true); 
    setErrorApi(null);
    setSuccessMessage(null);
    try {
      const response = await terminateOcr();
      setSuccessMessage(response.message || 'Successfully requested to terminate OCR worker.');
    } catch (err: any) {
      setErrorApi(err.message || 'Failed to terminate OCR worker.');
    } finally {
      setIsLoadingApi(false); 
    }
  };

  const getStatusColorClasses = (currentMode: TgcfProcessMode, error: string | null): string => {
    if (error) return 'bg-red-800/80 border-red-700 text-red-100'; 
    switch (currentMode) {
      case 'live':
        return 'bg-green-800/80 border-green-600 text-green-100';
      case 'past':
        return 'bg-blue-800/80 border-blue-600 text-blue-100';
      case 'idle':
        return 'bg-gray-700/80 border-gray-600 text-gray-100';
      default:
        return 'bg-gray-700/80 border-gray-600 text-gray-300';
    }
  };
  
  // isLoadingApi is true when a start/stop action is initiated and waiting for the first status update
  // after the API call. We set it to false once the status is fetched or an error occurs in the action.
  // The fetchStatus itself doesn't set isLoadingApi to false for background tasks.
  useEffect(() => {
    if (status.currentMode === 'live' || status.currentMode === 'past') {
        if (successMessage?.includes('start')) setIsLoadingApi(false);
    } else if (status.currentMode === 'idle') {
        if (successMessage?.includes('stop') || errorApi) setIsLoadingApi(false);
    }
    // If an API error occurred during start/stop, that error itself will be displayed.
    // If the process state has an error, that's also displayed.
    if (errorApi) setIsLoadingApi(false);

  }, [status, successMessage, errorApi]);


  return (
    <div className="container mx-auto p-4">
      <div className="bg-gray-800 shadow-xl rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold text-white text-center mb-8">Run and Monitor tgcf</h1>

        {/* Status Display */}
        <div className={`border-2 p-6 rounded-lg shadow-md mb-8 ${getStatusColorClasses(status.currentMode, errorApi || status.error)}`}>
          <h2 className="text-2xl font-semibold mb-3 flex items-center">
            Current Status
          </h2>
          <p className="mb-1 text-lg">
            <span className="font-semibold">Mode:</span> 
            <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
              status.currentMode === 'live' ? 'bg-green-500 text-green-900' :
              status.currentMode === 'past' ? 'bg-blue-500 text-blue-900' :
              status.error || errorApi ? 'bg-red-500 text-red-900' : 
              'bg-gray-500 text-gray-900'
            }`}>
              {status.error || errorApi ? 'ERROR' : status.currentMode.toUpperCase()}
            </span>
          </p>
          <p className="mb-1 whitespace-pre-wrap break-words">
            <span className="font-semibold">Details:</span> {isLoadingApi && !errorApi && !status.error ? 'Processing request...' : status.statusMessage}
          </p>
          {(errorApi || status.error) && ( 
            <p className="mt-3 text-sm p-3 bg-red-900/70 border border-red-700 rounded whitespace-pre-wrap break-words">
              <span className="font-semibold block mb-1">Error Details:</span> {errorApi || status.error}
            </p>
          )}
        </div>
        
        {successMessage && !errorApi && (
          <div className="bg-green-900/70 border border-green-700 text-green-200 p-3 rounded-md my-4 text-center">
            {successMessage}
          </div>
        )}

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => handleStart('live')}
            disabled={isLoadingApi || status.currentMode !== 'idle'}
            className="primary-button text-lg py-3 px-6"
          >
            {isLoadingApi && status.currentMode === 'idle' && !successMessage?.toLowerCase().includes('stopping') ? 'Starting...' : 'Start Live'}
          </button>
          <button
            onClick={() => handleStart('past')}
            disabled={isLoadingApi || status.currentMode !== 'idle'}
            className="primary-button text-lg py-3 px-6"
          >
            {isLoadingApi && status.currentMode === 'idle' && !successMessage?.toLowerCase().includes('stopping') ? 'Starting...' : 'Start Past'}
          </button>
          <button
            onClick={handleStop}
            disabled={isLoadingApi || status.currentMode === 'idle'}
            className="danger-button text-lg py-3 px-6 md:col-span-1 lg:col-span-1" 
          >
            {isLoadingApi && status.currentMode !== 'idle' ? 'Stopping...' : 'Stop Current Task'}
          </button>
        </div>
        
        <div className="mt-8 border-t border-gray-700 pt-8">
            <h2 className="text-xl font-semibold text-white mb-4">Advanced Controls</h2>
             <button
                onClick={handleTerminateOcr}
                disabled={isLoadingApi} 
                className="secondary-button text-sm py-2 px-4"
            >
                {isLoadingApi ? 'Processing...' : 'Terminate OCR Worker'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
                Use this if the OCR worker seems stuck. tgcf will attempt to restart it on next use if needed.
            </p>
        </div>

      </div>
      <style jsx global>{`
        .primary-button {
            background-color: #2563EB; /* bg-blue-600 */
            color: white;
            font-weight: 600;
            border-radius: 0.375rem; /* rounded-md */
            transition: background-color 0.15s ease-in-out, opacity 0.15s ease-in-out;
        }
        .primary-button:hover:not(:disabled) {
            background-color: #1D4ED8; /* hover:bg-blue-700 */
        }
        .primary-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .danger-button {
            background-color: #DC2626; /* bg-red-600 */
            color: white;
            font-weight: 600;
            border-radius: 0.375rem; /* rounded-md */
            transition: background-color 0.15s ease-in-out, opacity 0.15s ease-in-out;
        }
        .danger-button:hover:not(:disabled) {
            background-color: #B91C1C; /* hover:bg-red-700 */
        }
        .danger-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
         .secondary-button {
            background-color: #4B5563; /* bg-gray-600 */
            color: white;
            font-weight: 600; 
            border-radius: 0.375rem; /* rounded-md */
            transition: background-color 0.15s ease-in-out, opacity 0.15s ease-in-out;
        }
        .secondary-button:hover:not(:disabled) {
            background-color: #374151; /* hover:bg-gray-700 */
        }
        .secondary-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
