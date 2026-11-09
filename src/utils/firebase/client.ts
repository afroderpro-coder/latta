import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase Storage credentials are provided
export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY
);

let app: FirebaseApp | undefined;
let storage: FirebaseStorage | undefined;

if (typeof window !== "undefined" && isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    storage = getStorage(app);
  } catch (err) {
    console.warn("[Firebase] Client initialization error:", err);
  }
}

export { app, storage };
