import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const { firestoreDatabaseId, ...config } = firebaseConfig;
const app = initializeApp(config);
export const auth = getAuth(app);

function initializeFirestore() {
  const normalizedDatabaseId = firestoreDatabaseId?.trim();

  if (!normalizedDatabaseId) {
    return getFirestore(app);
  }

  try {
    return getFirestore(app, normalizedDatabaseId);
  } catch (error) {
    console.warn('[Firebase] Failed to initialize the configured Firestore database. Falling back to the default database.', error);
    return getFirestore(app);
  }
}

export const db = initializeFirestore();
export const storage = getStorage(app);
