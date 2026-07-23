export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

/** Public Firebase identifiers only; never put Admin credentials here. */
export function getFirebaseWebConfig(): FirebaseWebConfig {
  let parsed: Partial<FirebaseWebConfig> = {};
  const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG?.trim();
  if (raw) {
    try { parsed = JSON.parse(raw) as Partial<FirebaseWebConfig>; } catch { parsed = {}; }
  }
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || parsed.apiKey || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || parsed.authDomain || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || parsed.projectId || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || parsed.storageBucket || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || parsed.messagingSenderId || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || parsed.appId || "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || parsed.measurementId,
  };
}
