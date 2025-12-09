import fs from "fs";

export function alreadyProtected(lines, protectedEntries) {
  return protectedEntries.some((entry) => lines.includes(entry));
}

export function createGitignore(filePath, protectedEntries) {
  const content =
    ["# envspec protected files", ...protectedEntries].join("\n") + "\n";

  fs.writeFileSync(filePath, content);
}

export function appendEntries(filePath, existingContent, protectedEntries) {
  const needsNewline = !existingContent.endsWith("\n");

  const block = ["", "# envspec protected files", ...protectedEntries].join(
    "\n"
  );

  fs.appendFileSync(filePath, (needsNewline ? "\n" : "") + block + "\n");
}