import fs from "fs";
import dotenv from "dotenv";

export function readEnvSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return dotenv.parse(fs.readFileSync(filePath));
}

export function readFileFromPath(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function writeEnvFile(filePath, obj) {
  const content = Object.entries(obj)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  fs.writeFileSync(filePath, content + "\n");
}
