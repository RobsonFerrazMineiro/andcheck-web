import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, ".next");
const staticDir = path.join(nextDir, "static");
const serverDir = path.join(nextDir, "server");

if (!existsSync(nextDir)) {
  console.error("No .next directory found. Run `pnpm build` first.");
  process.exit(1);
}

const files = [];
collect(staticDir, ["js", "css"]);
collect(serverDir, ["js"]);

const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
const largestFiles = files
  .toSorted((a, b) => b.size - a.size)
  .slice(0, 20);

console.log("Next build bundle summary");
console.log(`Total analyzed JS/CSS: ${formatBytes(totalBytes)}`);
console.log("\nLargest files:");
for (const file of largestFiles) {
  console.log(`${formatBytes(file.size).padStart(10)}  ${file.relativePath}`);
}

function collect(dir, allowedExtensions) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collect(fullPath, allowedExtensions);
      continue;
    }
    const extension = path.extname(entry).slice(1);
    if (!allowedExtensions.includes(extension)) continue;
    files.push({
      relativePath: path.relative(root, fullPath).replaceAll("\\", "/"),
      size: stat.size,
    });
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toFixed(1)} KiB`;
  return `${(kib / 1024).toFixed(2)} MiB`;
}
