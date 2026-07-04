import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["src/app", "src/components", "src/lib"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const findings = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(fullPath);
      continue;
    }
    if (extensions.has(path.extname(entry))) checkFile(fullPath);
  }
}

function checkFile(filePath) {
  const relativePath = path.relative(root, filePath).replaceAll("\\", "/");
  const source = readFileSync(filePath, "utf8");

  checkMojibake(relativePath, source);
  checkDialogLabels(relativePath, source);
  checkUnsafeLogging(relativePath, source);
  checkServerActionAuth(relativePath, source);
}

function addFinding(file, message) {
  findings.push({ file, message });
}

function checkMojibake(file, source) {
  if (/Ã[^\sA-Z]|Â|�/.test(source)) {
    addFinding(file, "Possivel encoding quebrado encontrado.");
  }
}

function checkDialogLabels(file, source) {
  if (!source.includes('role="dialog"')) return;
  const hasAccessibleName =
    source.includes("aria-labelledby=") || source.includes("aria-label=");
  if (!hasAccessibleName) {
    addFinding(file, "Dialog sem aria-label ou aria-labelledby.");
  }
  if (!source.includes("aria-modal=")) {
    addFinding(file, "Dialog sem aria-modal explicito.");
  }
}

function checkUnsafeLogging(file, source) {
  if (!source.includes("console.error")) return;
  if (!source.includes("sanitizeForLog")) {
    addFinding(file, "console.error sem sanitizeForLog em arquivo de servidor/rota.");
  }
}

function checkServerActionAuth(file, source) {
  if (!source.startsWith('"use server";') && !source.startsWith("'use server';")) {
    return;
  }
  const isPublicOrReadOnly =
    file.includes("notification-actions.ts") ||
    file.includes("profile-actions.ts") ||
    file.includes("audit-actions.ts");
  const hasAuthGuard =
    source.includes("requirePermission(") ||
    source.includes("requireAnyPermission(") ||
    source.includes("requireRole(") ||
    source.includes("getCurrentUserAccess(");
  if (!isPublicOrReadOnly && !hasAuthGuard) {
    addFinding(file, "Server Action sem guarda aparente de autenticacao/RBAC.");
  }
}

for (const sourceRoot of sourceRoots) {
  walk(path.join(root, sourceRoot));
}

if (findings.length > 0) {
  console.error("\nQA static check found issues:\n");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}`);
  }
  process.exit(1);
}

console.log("QA static check passed.");
