
// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

let app: admin.app.App;
let db: admin.firestore.Firestore;

function initializeAdmin() {
  // If the app is already initialized, just return the existing instances.
  if (admin.apps.length > 0) {
    app = admin.app();
    db = admin.firestore();
    return;
  }

  // If not initialized, create a new instance.
  try {
    // Use Application Default Credentials and explicitly set the project ID.
    // This is the standard and recommended way for Google Cloud environments.
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'hyperdelivery-c381b',
    });
    db = admin.firestore();
    console.log('✅ Firebase Admin initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    // Add a more descriptive error message to help with debugging.
    throw new Error('Firebase Admin initialization failed. Check your environment variables and service account key.');
  }
}

// Export a function that initializes and returns the db instance.
// This ensures the SDK is only initialized when first needed.
export function getAdminDb() {
  if (!db) {
    initializeAdmin();
  }
  return db;
}
