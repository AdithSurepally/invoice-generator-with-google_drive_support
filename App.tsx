
import React from 'react';
import { useAuth } from './components/GoogleAuth';
import { InvoiceGenerator } from './components/InvoiceGenerator';

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function App() {
  const auth = useAuth();

  if (!auth.isReady) {
    return <LoadingSpinner />;
  }

  // The user requested to bypass the initial login screen.
  // The InvoiceGenerator component now handles the auth state internally,
  // prompting for sign-in only when a feature like 'Share to Drive' is used.
  return <InvoiceGenerator />;
}

export default App;
