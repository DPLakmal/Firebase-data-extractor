import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'node:path';

/**
 * Parse and validate CLI arguments.
 * @returns {object} Parsed configuration object
 */
export function parseArgs() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: node export.js [options]')
    .option('service-account', {
      alias: 'sa',
      type: 'string',
      description: 'Path to Firebase service account JSON key file',
      default: './serviceAccountKey.json',
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Output directory for exported files',
      default: './exports',
    })
    .option('single-file', {
      type: 'boolean',
      description: 'Export all data into a single firestore-export.json file',
      default: false,
    })
    .option('split-collections', {
      type: 'boolean',
      description: 'Export each root collection as a separate JSON file',
      default: false,
    })
    .option('batch-size', {
      type: 'number',
      description: 'Number of documents to fetch per batch (for large datasets)',
      default: 300,
    })
    .option('collections', {
      alias: 'c',
      type: 'array',
      description: 'Specific root collection IDs to export (default: all)',
      default: [],
    })
    .option('pretty', {
      type: 'boolean',
      description: 'Pretty-print JSON output with indentation',
      default: true,
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Enable verbose logging',
      default: false,
    })
    .check((argv) => {
      // Manual conflict check: only error if user explicitly passes BOTH flags
      if (argv.singleFile && argv.splitCollections) {
        throw new Error(
          'Arguments --single-file and --split-collections are mutually exclusive'
        );
      }
      return true;
    })
    .example('node export.js', 'Export all data (single file by default)')
    .example('node export.js --split-collections', 'Export each root collection separately')
    .example('node export.js --sa ./key.json -o ./backup', 'Custom key and output path')
    .example('node export.js -c users orders', 'Export only "users" and "orders" collections')
    .epilogue('Ensure your service account JSON key file is present before running.')
    .strict()
    .help()
    .alias('help', 'h')
    .version('1.0.0')
    .parseSync();

  // Determine export mode — default to single-file if neither flag is set
  const mode = argv.splitCollections ? 'split' : 'single';

  // Resolve paths relative to where the user runs the command (cwd)
  const cwd = process.cwd();
  const serviceAccountPath = path.resolve(cwd, argv.serviceAccount);
  const outputDir = path.resolve(cwd, argv.output);

  return {
    serviceAccountPath,
    outputDir,
    mode,
    batchSize: argv.batchSize,
    collections: argv.collections,
    pretty: argv.pretty,
    verbose: argv.verbose,
  };
}

