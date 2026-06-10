#!/usr/bin/env node

/**
 * Firestore Data Extractor
 *
 * Production-quality CLI tool to export all Firebase Firestore data,
 * including deeply nested subcollections, into local JSON files.
 *
 * Usage:
 *   node export.js                          # Single file export (default)
 *   node export.js --split-collections      # One file per root collection
 *   node export.js --sa ./key.json          # Custom service account path
 *   node export.js -o ./backup              # Custom output directory
 *   node export.js -c users orders          # Export specific collections
 *   node export.js --help                   # Show all options
 */

import { parseArgs } from './src/config.js';
import { initializeFirestore } from './src/firestore.js';
import { exportAllCollections } from './src/exporter.js';
import { writeSingleFile, writeSplitFiles } from './src/writer.js';
import { logger, setVerbose } from './src/logger.js';

async function main() {
  // ── Parse CLI arguments ──────────────────────────────────────────────
  const config = parseArgs();
  setVerbose(config.verbose);

  console.log('');
  console.log(
    '\x1b[36m\x1b[1m  ╔═══════════════════════════════════════════════╗\x1b[0m'
  );
  console.log(
    '\x1b[36m\x1b[1m  ║       🔥  Firestore Data Extractor  🔥       ║\x1b[0m'
  );
  console.log(
    '\x1b[36m\x1b[1m  ╚═══════════════════════════════════════════════╝\x1b[0m'
  );
  console.log('');

  logger.info(`Mode:         ${config.mode === 'split' ? 'Split collections' : 'Single file'}`);
  logger.info(`Output:       ${config.outputDir}`);
  logger.info(`Batch size:   ${config.batchSize}`);
  if (config.collections.length > 0) {
    logger.info(`Collections:  ${config.collections.join(', ')}`);
  }
  console.log('');

  // ── Initialize Firestore ─────────────────────────────────────────────
  const db = initializeFirestore(config.serviceAccountPath);
  console.log('');

  // ── Export data ──────────────────────────────────────────────────────
  logger.resetCounters();
  const exportData = await exportAllCollections(
    db,
    config.batchSize,
    config.collections
  );

  // ── Write output ─────────────────────────────────────────────────────
  console.log('');
  if (config.mode === 'split') {
    writeSplitFiles(config.outputDir, exportData, config.pretty);
  } else {
    writeSingleFile(config.outputDir, exportData, config.pretty);
  }

  // ── Summary ──────────────────────────────────────────────────────────
  logger.summary();

  // Clean shutdown
  process.exit(0);
}

// ── Execute ──────────────────────────────────────────────────────────────
main().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  if (err.stack) {
    logger.debug(err.stack);
  }
  process.exit(1);
});
