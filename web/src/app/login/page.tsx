'use client';

import { useState, useEffect, FormEvent } from 'react';
import { initiateLogin, submitCode, submitPassword, getTelegramStatus } from '../lib/apiClient';

type LoginStep = 'enterPhoneNumber' | 'enterCode' | 'enterPassword' | 'loading' | 'loggedIn' | 'error';

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>('enterPhoneNumber');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isInitialStatusLoading, setIsInitialStatusLoading] = useState(true);

  // Check initial login status (e.g., if already logged in via a persistent session on backend - mock for now)
  useEffect(() => {
    // This is a simplified check. In a real app, you might have a persistent session token
    // stored in localStorage/cookie that you verify with the backend.
    // For now, we assume no persistent frontend session, always start fresh or check a temp one.
    // If a sessionId was somehow preserved (e.g. browser refresh if we stored it), we could check it.
    // For this example, we'll just ensure we're not loggedIn initially.
    const checkCurrentStatus = async () => {
        setIsInitialStatusLoading(true);
        try {
            // This specific status check for an *existing* session is less relevant
            // for a fresh login page load, but demonstrates usage.
            // We're mostly interested in whether the API itself thinks a user is logged in,
            // which for this mock client usually means checking if API_ID/HASH are set.
            // The backend /api/telegram/status (without sessionId) is not implemented yet.
            // So we'll just assume we start at phone number step.
            console.log("Checking initial login status (placeholder)...");
        } catch (e: any) {
            console.warn("Could not check initial status:", e.message);
        } finally {
            setIsInitialStatusLoading(false);
        }
    };
    checkCurrentStatus();
  }, []);


  const handlePhoneNumberSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await initiateLogin(phoneNumber);
      setSessionId(response.sessionId);
      setSuccessMessage(response.message || 'Code sent successfully!');
      setStep('enterCode');
    } catch (err: any) {
      setError(err.message || 'Failed to send code.');
      setStep('error'); // Or back to 'enterPhoneNumber' with error displayed
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      setError('Session ID is missing.');
      setStep('error');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await submitCode(sessionId, code);
      if (response.message.includes('Password required')) {
        setSuccessMessage(response.message);
        setStep('enterPassword');
      } else {
        setSuccessMessage(response.message || 'Login successful!');
        setStep('loggedIn');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit code.');
      setStep('error'); // Or back to 'enterCode'
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      setError('Session ID is missing.');
      setStep('error');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await submitPassword(sessionId, password);
      setSuccessMessage(response.message || 'Login successful!');
      setStep('loggedIn');
    } catch (err: any) {
      setError(err.message || 'Failed to submit password.');
      setStep('error'); // Or back to 'enterPassword'
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetFlow = () => {
    setStep('enterPhoneNumber');
    setPhoneNumber('');
    setCode('');
    setPassword('');
    setSessionId(null);
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
  }

  if (isInitialStatusLoading) {
    return <div className="text-center p-10">Loading login status...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <div className="bg-gray-800 shadow-xl rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold text-white text-center mb-6">Telegram Login</h1>

        {isLoading && <div className="text-center text-blue-400 my-4">Loading...</div>}
        {error && <div className="text-center text-red-400 bg-red-900/50 p-3 rounded-md my-4">{error} <button onClick={resetFlow} className="ml-2 text-sm underline">(Try Again)</button></div>}
        {successMessage && !error && step !== 'loggedIn' && <div className="text-center text-green-400 bg-green-900/50 p-3 rounded-md my-4">{successMessage}</div>}

        {step === 'loggedIn' && (
          <div className="text-center">
            <p className="text-2xl text-green-400 mb-4">{successMessage || 'Login Successful!'}</p>
            <p className="text-gray-300">You have successfully logged in.</p>
            <button
                onClick={resetFlow}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150"
              >
                Log Out / Start Over
            </button>
          </div>
        )}

        {step === 'enterPhoneNumber' && (
          <form onSubmit={handlePhoneNumberSubmit} className="space-y-6">
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300">
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                placeholder="+12345678900"
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        )}

        {step === 'enterCode' && (
          <form onSubmit={handleCodeSubmit} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-300">
                Verification Code
              </label>
              <input
                type="text"
                id="code"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="12345"
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Submit Code'}
            </button>
             <button type="button" onClick={resetFlow} className="mt-2 w-full text-sm text-gray-400 hover:text-gray-200 underline">Start Over</button>
          </form>
        )}

        {step === 'enterPassword' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Two-Factor Authentication Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Your 2FA password"
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Submit Password'}
            </button>
            <button type="button" onClick={resetFlow} className="mt-2 w-full text-sm text-gray-400 hover:text-gray-200 underline">Start Over</button>
          </form>
        )}
      </div>
    </div>
  );
}
