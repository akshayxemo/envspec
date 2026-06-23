import fs from "fs";

/**
 * Checks if the gitignore file already contains the protected entries
 * @param {Array<string>} lines - Array of lines from the gitignore file
 * @param {Array<string>} protectedEntries - Array of entries that should be protected
 * @returns {boolean} True if any of the protected entries are already present
 */
export function alreadyProtected(lines, protectedEntries) {
  return protectedEntries.some((entry) => lines.includes(entry));
}

/**
 * Creates a new .gitignore file with protected entries
 * @param {string} filePath - Path where to create the .gitignore file
 * @param {Array<string>} protectedEntries - Array of entries to add to gitignore
 */
export function createGitignore(filePath, protectedEntries) {
  const content =
    ["# envspec protected files", ...protectedEntries].join("\n") + "\n";

  fs.writeFileSync(filePath, content);
}

/**
 * Appends protected entries to an existing .gitignore file
 * @param {string} filePath - Path to the existing .gitignore file
 * @param {string} existingContent - Current content of the .gitignore file
 * @param {Array<string>} protectedEntries - Array of entries to append
 */
export function appendEntries(filePath, existingContent, protectedEntries) {
  const needsNewline = !existingContent.endsWith("\n");

  const block = ["", "# envspec protected files", ...protectedEntries].join(
    "\n"
  );

  fs.appendFileSync(filePath, (needsNewline ? "\n" : "") + block + "\n");
}