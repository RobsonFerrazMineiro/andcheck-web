import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".codex-work",
  "coverage",
  "node_modules",
  "referencia-codigo",
  "test-results",
]);
const ignoredFiles = new Set([
  "check-encoding.mjs",
  "package-lock.json",
  "pnpm-lock.yaml",
  "qa-static-check.mjs",
]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".ini",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".prisma",
  ".ts",
  ".tsx",
  ".txt",
]);
const suspiciousPatterns = [
  /Ã[^\sA-Z]/,
  /Ãƒ/,
  /Ã‚/,
  /Ã¢/,
  /Â/,
  /â(?:€|€¢|€”|€“|€¦|„¢|€œ|€|€˜|€™)/,
  /ï¿½/,
  /\uFFFD/,
];
const findings = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!ignoredDirectories.has(entry)) walk(fullPath);
      continue;
    }

    if (ignoredFiles.has(entry) || !textExtensions.has(path.extname(entry))) {
      continue;
    }

    checkFile(fullPath);
  }
}

function checkFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!suspiciousPatterns.some((pattern) => pattern.test(line))) return;

    findings.push({
      file: path.relative(root, filePath).replaceAll("\\", "/"),
      line: index + 1,
      text: line.trim().slice(0, 140),
    });
  });
}

walk(root);

if (findings.length > 0) {
  console.error("\nEncoding check found possible mojibake:\n");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line}: ${finding.text}`);
  }
  process.exit(1);
}

console.log("Encoding check passed.");
