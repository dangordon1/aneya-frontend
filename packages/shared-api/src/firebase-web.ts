/**
 * Firebase Web SDK configuration
 * Used by the web app (Vite + React)
 *
 * Note: Mobile app will use @react-native-firebase instead
 */
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

/**
 * Create Firebase app and auth instances for web
 */
export function createFirebaseWebApp(config: FirebaseConfig): { app: FirebaseApp; auth: Auth; googleProvider: GoogleAuthProvider } {
  // Validate configuration
  const requiredKeys: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !config[key]);

  if (missingKeys.length > 0) {
    console.warn('⚠️ Missing Firebase environment variables:', missingKeys.join(', '));
    console.warn('Authentication will not work until Firebase is configured.');
  } else {
    console.log('✅ Firebase configuration loaded');
    console.log('Project ID:', config.projectId);
  }

  const app = initializeApp(config);
  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();

  // Configure Google provider for better UX
  googleProvider.setCustomParameters({
    prompt: 'select_account' // Always show account selector
  });

  return { app, auth, googleProvider };
}
