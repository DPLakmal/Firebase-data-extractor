import { serializeDocument } from './serializer.js';
import { logger } from './logger.js';

/**
 * Export a single document and recursively traverse all its subcollections.
 *
 * Returns the document as a plain object with:
 *  - __id__: the document ID
 *  - __path__: the full document path
 *  - __data__: serialized field data
 *  - __subcollections__: { [collectionId]: { docs } }
 *
 * @param {FirebaseFirestore.DocumentSnapshot} docSnapshot - The document to export.
 * @param {number} batchSize - Number of documents to fetch per query batch.
 * @param {number} depth - Current recursion depth (for logging indentation).
 * @returns {Promise<object>} Serialized document with subcollections.
 */
export async function exportDocument(docSnapshot, batchSize, depth = 0) {
  logger.document(docSnapshot.ref.path);

  const doc = {
    __id__: docSnapshot.id,
    __path__: docSnapshot.ref.path,
    __data__: serializeDocument(docSnapshot),
    __subcollections__: {},
  };

  // Discover all subcollections of this document
  let subcollectionRefs;
  try {
    subcollectionRefs = await docSnapshot.ref.listCollections();
  } catch (err) {
    logger.warn(
      `Failed to list subcollections for ${docSnapshot.ref.path}: ${err.message}`
    );
    return doc;
  }

  // Recursively export each subcollection
  for (const subColRef of subcollectionRefs) {
    const subColData = await exportCollection(subColRef, batchSize, depth + 1);
    doc.__subcollections__[subColRef.id] = subColData;
  }

  return doc;
}

/**
 * Export an entire collection, fetching documents in batches to handle
 * large datasets without exhausting memory.
 *
 * @param {FirebaseFirestore.CollectionReference} collectionRef - The collection to export.
 * @param {number} batchSize - Number of documents per batch.
 * @param {number} depth - Current recursion depth.
 * @returns {Promise<object>} Object with collection metadata and documents array.
 */
export async function exportCollection(collectionRef, batchSize, depth = 0) {
  const indent = '  '.repeat(depth);
  const collectionPath = collectionRef.path;

  logger.collectionStart(`${indent}${collectionPath}`);

  const result = {
    __collectionId__: collectionRef.id,
    __path__: collectionPath,
    __documents__: [],
  };

  let lastDoc = null;
  let batchIndex = 0;

  // Paginate through the collection using cursor-based batching
  while (true) {
    let query = collectionRef.orderBy('__name__').limit(batchSize);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    let snapshot;
    try {
      snapshot = await query.get();
    } catch (err) {
      logger.error(
        `Error fetching batch ${batchIndex} from ${collectionPath}: ${err.message}`
      );
      break;
    }

    if (snapshot.empty) {
      break;
    }

    logger.debug(
      `${indent}  Batch ${batchIndex}: ${snapshot.size} documents from ${collectionPath}`
    );

    // Process each document in the batch
    for (const docSnapshot of snapshot.docs) {
      const exportedDoc = await exportDocument(docSnapshot, batchSize, depth);
      result.__documents__.push(exportedDoc);
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    batchIndex++;

    // If we got fewer than batchSize, we've reached the end
    if (snapshot.size < batchSize) {
      break;
    }
  }

  logger.debug(
    `${indent}  Finished ${collectionPath}: ${result.__documents__.length} documents`
  );

  return result;
}

/**
 * Export all root-level collections (or a filtered subset).
 *
 * @param {FirebaseFirestore.Firestore} db - Firestore instance.
 * @param {number} batchSize - Documents per batch.
 * @param {string[]} filterCollections - If non-empty, only export these collection IDs.
 * @returns {Promise<object>} Full export data keyed by collection ID.
 */
export async function exportAllCollections(db, batchSize, filterCollections = []) {
  logger.info('Discovering root collections...');

  let rootCollections;
  try {
    rootCollections = await db.listCollections();
  } catch (err) {
    logger.error(`Failed to list root collections: ${err.message}`);
    throw err;
  }

  // Apply filter if specified
  if (filterCollections.length > 0) {
    const filterSet = new Set(filterCollections);
    const before = rootCollections.length;
    rootCollections = rootCollections.filter((col) => filterSet.has(col.id));
    logger.info(
      `Filtered to ${rootCollections.length} of ${before} root collections: ${rootCollections.map((c) => c.id).join(', ')}`
    );
  } else {
    logger.info(
      `Found ${rootCollections.length} root collections: ${rootCollections.map((c) => c.id).join(', ')}`
    );
  }

  if (rootCollections.length === 0) {
    logger.warn('No collections to export.');
    return {};
  }

  const exportData = {};

  for (const collectionRef of rootCollections) {
    logger.info('');
    logger.info(
      `${'━'.repeat(50)}`
    );
    logger.info(`Exporting root collection: ${collectionRef.id}`);
    logger.info(
      `${'━'.repeat(50)}`
    );

    const collectionData = await exportCollection(collectionRef, batchSize, 0);
    exportData[collectionRef.id] = collectionData;
  }

  return exportData;
}
