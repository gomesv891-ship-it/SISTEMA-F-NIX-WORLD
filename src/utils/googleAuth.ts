import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Google Auth Provider with Google Sheets and Drive.file scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
// Token must strictly be cached in memory (never persisted to localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
const TOKEN_CACHE_KEY = 'fenix_google_access_token';

// Purge any legacy persisted tokens from previous sessions to prevent 401 unauthenticated errors
try {
  sessionStorage.removeItem(TOKEN_CACHE_KEY);
  localStorage.removeItem(TOKEN_CACHE_KEY);
} catch {
  // ignore
}

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    sessionStorage.removeItem(TOKEN_CACHE_KEY);
    localStorage.removeItem(TOKEN_CACHE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent('fenix_google_token_changed', { detail: { token } }));
};

export const clearCachedAccessToken = () => {
  setCachedAccessToken(null);
};

// Initialize auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = getCachedAccessToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      setCachedAccessToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso da autorização Google.');
    }

    setCachedAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Erro na autenticação Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Erro no logout Google:', err);
  } finally {
    setCachedAccessToken(null);
  }
};
