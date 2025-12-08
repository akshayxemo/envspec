import { logger } from "./logger.js";

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
