import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger.js';

/**
 * Ensure a directory exists, creating it recursively if needed.
 * @param {string} dirPath - Absolute path to the directory.
 */
export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.debug(`Created directory: ${dirPath}`);
  }
}

/**
 * Write data to a JSON file using a streaming approach to minimize
 * peak memory usage for very large datasets.
 *
 * For datasets under ~200 MB serialized, this uses JSON.stringify directly.
 * The file is written atomically (write to tmp, then rename) to prevent
 * corruption if the process is interrupted.
 *
 * @param {string} filePath - Absolute path for the output file.
 * @param {object} data - The data to serialize.
 * @param {boolean} pretty - Whether to pretty-print with indentation.
 */
export function writeJsonFile(filePath, data, pretty = true) {
  ensureDir(path.dirname(filePath));

  const tmpPath = `${filePath}.tmp`;

  try {
    const jsonString = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    fs.writeFileSync(tmpPath, jsonString, 'utf-8');

    // Atomic rename
    fs.renameSync(tmpPath, filePath);

    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    logger.success(`Written: ${filePath} (${sizeMB} MB)`);
  } catch (err) {
    // Clean up temp file on failure
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    throw err;
  }
}

/**
 * Write all export data as a single JSON file.
 *
 * @param {string} outputDir - Output directory.
 * @param {object} data - Full export data.
 * @param {boolean} pretty - Pretty-print flag.
 */
export function writeSingleFile(outputDir, data, pretty) {
  const filePath = path.join(outputDir, 'firestore-export.json');

  const wrapper = {
    __exportMetadata__: {
      exportedAt: new Date().toISOString(),
      toolVersion: '1.0.0',
      mode: 'single-file',
      collectionCount: Object.keys(data).length,
    },
    collections: data,
  };

  logger.info(`Writing single export file...`);
  writeJsonFile(filePath, wrapper, pretty);
}

/**
 * Write each root collection as a separate JSON file.
 *
 * @param {string} outputDir - Output directory.
 * @param {object} data - Full export data keyed by collection ID.
 * @param {boolean} pretty - Pretty-print flag.
 */
export function writeSplitFiles(outputDir, data, pretty) {
  const collectionIds = Object.keys(data);

  logger.info(`Writing ${collectionIds.length} collection files...`);

  for (const collectionId of collectionIds) {
    const filePath = path.join(outputDir, `${collectionId}.json`);

    const wrapper = {
      __exportMetadata__: {
        exportedAt: new Date().toISOString(),
        toolVersion: '1.0.0',
        mode: 'split-collections',
        collectionId,
      },
      collection: data[collectionId],
    };

    writeJsonFile(filePath, wrapper, pretty);
  }

  // Also write a manifest listing all exported collections
  const manifestPath = path.join(outputDir, '_manifest.json');
  const manifest = {
    exportedAt: new Date().toISOString(),
    collections: collectionIds.map((id) => ({
      id,
      file: `${id}.json`,
      documentCount: data[id].__documents__?.length ?? 0,
    })),
  };
  writeJsonFile(manifestPath, manifest, pretty);
}
