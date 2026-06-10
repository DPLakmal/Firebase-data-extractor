import admin from 'firebase-admin';
import fs from 'node:fs';
import { logger } from './logger.js';

/**
 * Initialize the Firebase Admin SDK and return the Firestore instance.
 *
 * @param {string} serviceAccountPath - Absolute path to the service account JSON key file.
 * @returns {FirebaseFirestore.Firestore} Firestore database instance.
 */
export function initializeFirestore(serviceAccountPath) {
  // Validate the service account file exists
  if (!fs.existsSync(serviceAccountPath)) {
    logger.error(
      `Service account key file not found: ${serviceAccountPath}`
    );
    logger.info(
      'Download your service account key from the Firebase Console:'
    );
    logger.info(
      '  Project Settings → Service Accounts → Generate New Private Key'
    );
    process.exit(1);
  }

  let serviceAccount;
  try {
    const raw = fs.readFileSync(serviceAccountPath, 'utf-8');
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    logger.error(`Failed to parse service account key file: ${err.message}`);
    process.exit(1);
  }

  // Validate essential fields
  if (!serviceAccount.project_id || !serviceAccount.private_key) {
    logger.error(
      'Invalid service account key file — missing project_id or private_key.'
    );
    process.exit(1);
  }

  logger.info(`Project: ${serviceAccount.project_id}`);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();

  // Recommended: ignore undefined properties to avoid serialization issues
  db.settings({ ignoreUndefinedProperties: true });

  logger.success('Firestore client initialized');
  return db;
}
