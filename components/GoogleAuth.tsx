import React, { useState, useEffect } from 'react';
import { GOOGLE_CONFIG } from '../config';
import { GoogleIcon } from './icons';
import { initGapiClient, setGapiToken } from '../utils/googleDrive';

// Define the shape of our authentication state
export type AuthState = {
  isReady: boolean;
  isSignedIn: boolean;
  user: any | null;
  token: string | null;
};

type Listener = (state: AuthState) => void;

const AUTH_STORAGE_KEY = 'google_auth_session';

// --- A robust, singleton authentication service using the Observer pattern ---
class AuthService {
  private state: AuthState = {
    isReady: false,
    isSignedIn: false,
    user: null,
    token: null,
  };
  private listeners: Set<Listener> = new Set();
  private tokenClient: any = null;

  constructor() {
    this.init();
  }

  private setState(newState: Partial<AuthState>) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Method for React components to subscribe to state changes
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Immediately notify the new subscriber with the current state
    listener(this.state);
    // Return an unsubscribe function
    return () => this.listeners.delete(listener);
  }
  
  // Method to get the current state without subscribing
  public getState = (): AuthState => {
    return this.state;
  }

  private loadGoogleScripts = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const SCRIPT_ID_GAPI = 'gapi-script';
      const SCRIPT_ID_GSI = 'gsi-script';

      if (document.getElementById(SCRIPT_ID_GAPI) && document.getElementById(SCRIPT_ID_GSI)) {
          return resolve();
      }

      const gapiScript = document.createElement('script');
      gapiScript.id = SCRIPT_ID_GAPI;
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      
      gapiScript.onload = () => {
          const gsiScript = document.createElement('script');
          gsiScript.id = SCRIPT_ID_GSI;
          gsiScript.src = 'https://accounts.google.com/gsi/client';
          gsiScript.async = true;
          gsiScript.defer = true;
          gsiScript.onload = () => resolve();
          gsiScript.onerror = () => reject(new Error('Failed to load Google Sign-In (GSI) script.'));
          document.body.appendChild(gsiScript);
      };

      gapiScript.onerror = () => {
          reject(new Error('Failed to load Google API (GAPI) script. Check network or ad-blockers.'));
      };

      document.body.appendChild(gapiScript);
    });
  }

  private restoreOrRefreshSession = () => {
    const persistedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (persistedAuth) {
        try {
            const { token, user, expiresAt } = JSON.parse(persistedAuth);
            if (token && user && expiresAt && expiresAt > Date.now()) {
                // Session is valid, restore it.
                setGapiToken(token);
                this.setState({ isSignedIn: true, user: user, token: token });
                return; // Early exit, we are authenticated.
            }
        } catch (e) {
            console.error("Failed to parse persisted auth session, attempting to refresh.", e);
        }
    }

    // If we're here, the stored session is invalid, expired, or non-existent.
    // Clean up local storage and attempt a silent token refresh.
    localStorage.removeItem(AUTH_STORAGE_KEY);
    if (this.tokenClient) {
      // This will attempt a silent sign-in. If the user has an active Google session
      // and has previously granted consent, it will succeed and fire the callback.
      // Otherwise, it fails silently, and the user remains logged out.
      this.tokenClient.requestAccessToken({ prompt: '' });
    }
  };

  private init = async () => {
    try {
        await this.loadGoogleScripts();
        await initGapiClient(); // This initializes gapi.client
        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPES,
            callback: this.handleAuthChange,
        });
        
        this.restoreOrRefreshSession();

        this.setState({ isReady: true });
    } catch (error) {
        const message = `Google API scripts failed to load. This might be due to a network issue or an ad-blocker. Please check your connection, disable ad-blockers, and refresh the page. Details: ${error instanceof Error ? error.message : String(error)}`;
        console.error(message, error);
        alert(message);
    }
  }

  private handleAuthChange = (tokenResponse: any) => {
    if (tokenResponse.error || !tokenResponse.access_token) {
      console.error("Google Auth Error:", tokenResponse);
      this.signOut(); // Ensure clean state on error
      return;
    }
    const currentToken = tokenResponse.access_token;
    // tokenResponse.expires_in is a string with seconds. Default to 1 hour.
    const expiresIn = (parseInt(tokenResponse.expires_in, 10) || 3600) * 1000;
    const expiresAt = Date.now() + expiresIn;

    setGapiToken(currentToken);

    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${currentToken}` }
    })
    .then(res => res.json())
    .then(profile => {
      if (profile.error) {
        throw new Error(profile.error_description || 'Failed to fetch user profile.');
      }

      const session = { token: currentToken, user: profile, expiresAt };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));

      this.setState({
        isSignedIn: true,
        user: profile,
        token: currentToken,
      });
    })
    .catch(err => {
      console.error("Failed to sign in.", err);
      alert(`Error after sign-in: ${err.message}`);
      this.signOut();
    });
  }

  public signIn = () => {
    if (this.state.isReady && this.tokenClient) {
      // This will trigger the Google Sign-In flow (UI popup) if the user is not
      // already signed in and has not granted consent. If they have, it may
      // return a token without showing a popup.
      this.tokenClient.requestAccessToken({ prompt: '' });
    } else {
      alert("Google Sign-In is not ready yet. Please wait a moment.");
    }
  }

  public signOut = () => {
    if (this.state.token) {
      try {
        (window as any).google?.accounts.oauth2.revoke(this.state.token, () => {});
      } catch (e) {
        console.error("Error revoking token", e);
      }
    }
    setGapiToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    this.setState({
      isSignedIn: false,
      user: null,
      token: null,
    });
  }
}

// Create and export the singleton instance of our service
export const authService = new AuthService();

// --- A custom React hook to easily use the AuthService in components ---
export const useAuth = (): AuthState => {
  const [state, setState] = useState(authService.getState());

  useEffect(() => {
    const unsubscribe = authService.subscribe(setState);
    return unsubscribe;
  }, []);

  return state;
};


// --- The UI component for displaying auth status and buttons ---
export const AuthDisplay: React.FC = () => {
  const { isSignedIn, user, isReady } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!isReady) {
    return (
      <button
        disabled
        className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 bg-gray-200 border border-gray-300 rounded-md shadow-sm cursor-wait"
      >
        <GoogleIcon className="w-4 h-4" />
        <span>Initializing...</span>
      </button>
    );
  }

  if (isSignedIn && user) {
    return (
      <div className="relative">
        <button onClick={() => setIsDropdownOpen(prev => !prev)} className="flex items-center gap-2">
          <img src={user.picture} alt="User profile" className="w-8 h-8 rounded-full" />
        </button>
        {isDropdownOpen && (
          <div
             onMouseLeave={() => setIsDropdownOpen(false)}
             className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-30"
          >
            <div className="px-4 py-2 text-sm text-gray-700 border-b">
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); authService.signOut(); setIsDropdownOpen(false); }}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign Out
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={authService.signIn}
      className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      <GoogleIcon className="w-4 h-4" />
      <span>Sign in with Google</span>
    </button>
  );
};
