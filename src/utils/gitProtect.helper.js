import fs from "fs";

export function alreadyProtected(lines, protectedEntries) {
  return protectedEntries.some((entry) => lines.includes(entry));
}

export function createGitignore(filePath, protectedEntries) {
  const content =
    ["# Environment variables", ...protectedEntries].join("\n") + "\n";

  fs.writeFileSync(filePath, content);
}

export function appendEntries(filePath, existingContent, protectedEntries) {
  const needsNewline = !existingContent.endsWith("\n");

  const block = ["", "# Environment variables", ...protectedEntries].join("\n");

  fs.appendFileSync(filePath, (needsNewline ? "\n" : "") + block + "\n");
}