/**
 * Structured logger with progress tracking and colored output.
 * Avoids external dependencies — uses ANSI codes directly.
 */

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

/** @type {{ docs: number, collections: number, startTime: number }} */
const counters = {
  docs: 0,
  collections: 0,
  startTime: Date.now(),
};

let verboseMode = false;

/**
 * Enable or disable verbose logging.
 * @param {boolean} enabled
 */
export function setVerbose(enabled) {
  verboseMode = enabled;
}

/**
 * Format elapsed time since export started.
 * @returns {string}
 */
function elapsed() {
  const ms = Date.now() - counters.startTime;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${seconds}.${String(ms % 1000).padStart(3, '0')}s`;
}

/**
 * Print a timestamped log message.
 * @param {'info'|'success'|'warn'|'error'|'debug'|'progress'} level
 * @param {string} message
 */
function log(level, message) {
  const timestamp = `${COLORS.gray}[${elapsed()}]${COLORS.reset}`;
  const prefixes = {
    info: `${COLORS.cyan}ℹ${COLORS.reset}`,
    success: `${COLORS.green}✔${COLORS.reset}`,
    warn: `${COLORS.yellow}⚠${COLORS.reset}`,
    error: `${COLORS.red}✖${COLORS.reset}`,
    debug: `${COLORS.magenta}⊙${COLORS.reset}`,
    progress: `${COLORS.blue}→${COLORS.reset}`,
  };
  const prefix = prefixes[level] || prefixes.info;
  console.log(`${timestamp} ${prefix} ${message}`);
}

export const logger = {
  info: (msg) => log('info', msg),
  success: (msg) => log('success', msg),
  warn: (msg) => log('warn', msg),
  error: (msg) => log('error', msg),
  debug: (msg) => {
    if (verboseMode) log('debug', msg);
  },
  progress: (msg) => log('progress', msg),

  /**
   * Log start of a collection export.
   * @param {string} collectionPath
   */
  collectionStart(collectionPath) {
    counters.collections++;
    log('progress', `${COLORS.bright}Collection:${COLORS.reset} ${collectionPath}`);
  },

  /**
   * Log a document being processed.
   * @param {string} docPath
   */
  document(docPath) {
    counters.docs++;
    if (verboseMode) {
      log('debug', `  Document: ${docPath}`);
    }
    // Print a progress summary every 100 documents
    if (counters.docs % 100 === 0) {
      log(
        'info',
        `${COLORS.dim}Progress: ${counters.docs} documents across ${counters.collections} collections${COLORS.reset}`
      );
    }
  },

  /**
   * Print final export summary.
   */
  summary() {
    const duration = elapsed();
    console.log('');
    console.log(
      `${COLORS.green}${COLORS.bright}═══════════════════════════════════════════${COLORS.reset}`
    );
    console.log(
      `${COLORS.green}${COLORS.bright}  Export Complete${COLORS.reset}`
    );
    console.log(
      `${COLORS.green}${COLORS.bright}═══════════════════════════════════════════${COLORS.reset}`
    );
    console.log(
      `  ${COLORS.cyan}Collections:${COLORS.reset}  ${counters.collections}`
    );
    console.log(
      `  ${COLORS.cyan}Documents:${COLORS.reset}    ${counters.docs}`
    );
    console.log(
      `  ${COLORS.cyan}Duration:${COLORS.reset}     ${duration}`
    );
    console.log(
      `${COLORS.green}${COLORS.bright}═══════════════════════════════════════════${COLORS.reset}`
    );
    console.log('');
  },

  /**
   * Reset counters (useful for testing).
   */
  resetCounters() {
    counters.docs = 0;
    counters.collections = 0;
    counters.startTime = Date.now();
  },
};
