
import React from 'react';
import { authService } from './GoogleAuth';
import { GoogleIcon } from './icons';

export const LoginScreen: React.FC = () => {
  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl text-center">
        <div>
          <img className="mx-auto h-12 w-auto" src="/logo.png" alt="Invoice Pro" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to Invoice Pro
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            To create and manage your invoices, please sign in with your Google Account.
          </p>
        </div>
        <div className="pt-6">
           <button
            onClick={() => authService.signIn()}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
           >
            <GoogleIcon className="w-5 h-5" />
            <span>Sign in with Google</span>
           </button>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Your data is securely stored in your own Google Drive.
        </p>
      </div>
    </main>
  );
};
