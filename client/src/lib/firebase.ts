import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// these are the minimum fields needed for auth to initialize correctly
const requiredKeys: Array<keyof typeof firebaseConfig> = [
  "apiKey",
  "authDomain",
  "projectId",
  "appId",
];

for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    throw new Error(`Missing Firebase env var for ${key}. Check your VITE_FIREBASE_* settings.`);
  }
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
