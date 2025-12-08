// src/utils/logger.js
export const logger = {
  success: (msg) => console.log(`\x1b[32m${msg}\x1b[0m`),
  error: (msg) => console.error(`\x1b[31m${msg}\x1b[0m`),
  warn: (msg) => console.warn(`\x1b[33m${msg}\x1b[0m`),
  log: (msg) => console.log(msg),
  info: (msg) => console.info(msg),
};