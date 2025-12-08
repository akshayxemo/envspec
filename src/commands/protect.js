import fs from "fs";
import path from "path";
import { readFileFromPath } from "../utils/readWriteEnv.js";
import {
  alreadyProtected,
  appendEntries,
  createGitignore,
} from "../utils/gitProtect.helper.js";
import { fail } from "../utils/error.js";
import { logger } from "../utils/logger.js";

const GITIGNORE = ".gitignore";
const PROTECTED_ENTRIES = [".env", ".env.local", ".env.*.backup"];

export function protectCommmitToGitCommand(options) {
  try {
    const cwd = process.cwd();
    const gitignorePath = path.join(cwd, GITIGNORE);

    if (!fs.existsSync(gitignorePath)) {
      createGitignore(gitignorePath, PROTECTED_ENTRIES);
      logger.success("✔ .gitignore created and env files protected");
      return;
    }

    const content = readFileFromPath(gitignorePath);
    const lines = content.toString().split(/\r?\n/);

    if (alreadyProtected(lines, PROTECTED_ENTRIES)) {
      logger.success("✔ Environment files are already protected");
      return;
    }

    appendEntries(gitignorePath, content.toString(), PROTECTED_ENTRIES);
    logger.success("✔ Environment files added to .gitignore");
  } catch (err) {
    fail("Failed to protect environment files", err);
  }
}
