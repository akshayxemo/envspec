import fs from "fs";
import dotenv from "dotenv";

/**
 * Safely reads and parses an environment file
 * @param {string} filePath - Path to the .env file
 * @returns {Object|null} Parsed environment variables object, or null if file doesn't exist
 */
export function readEnvSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return dotenv.parse(fs.readFileSync(filePath));
}

/**
 * Safely reads a file from the given path
 * @param {string} filePath - Path to the file
 * @returns {Buffer|null} File contents as Buffer, or null if file doesn't exist
 */
export function readFileFromPath(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

/**
 * Writes environment variables to a .env file
 * @param {string} filePath - Path where to write the .env file
 * @param {Object} obj - Object containing key-value pairs to write
 */
export function writeEnvFile(filePath, obj) {
  const content = Object.entries(obj)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  fs.writeFileSync(filePath, content + "\n");
}
