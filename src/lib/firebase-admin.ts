import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";

/** Firebase Admin is initialized only when a protected server action needs it. */
function getServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      return JSON.parse(raw) as ServiceAccount;
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON inválido.");
    }
  }
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) return { projectId, clientEmail, privateKey };
  throw new Error("Firebase Admin não configurado.");
}

function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const bucket = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  return initializeApp({ credential: cert(getServiceAccount()), ...(bucket ? { storageBucket: bucket } : {}) });
}

export function firebaseStorage() {
  if (!process.env.FIREBASE_STORAGE_BUCKET?.trim()) throw new Error("FIREBASE_STORAGE_BUCKET não configurado.");
  return getStorage(adminApp()).bucket();
}

export function firebaseMessaging() {
  return getMessaging(adminApp());
}
