import { logger } from "./logger.js";

/**
 * Logs an error message and exits the process with code 1
 * @param {string} message - The error message to display
 * @param {Error} err - The error object containing details
 */
export function fail(message, err) {
  logger.error(`\n[envspec]: ${message}`);

  if (process.env.ENVSPEC_DEBUG) {
    logger.error(err);
  } else {
    logger.error(`→ ${err.message}`);
    logger.info("(Run with --debug for details)");
  }

  process.exit(1);
}
