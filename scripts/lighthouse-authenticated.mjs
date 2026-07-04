import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";

const targetUrl =
  process.env.LIGHTHOUSE_URL ?? "http://localhost:3000/dashboard";
const baseUrl = new URL(targetUrl).origin;
const email = process.env.E2E_EMAIL ?? "admin@andcheck.com";
const password = process.env.E2E_PASSWORD ?? "andcheck@2025";
const port = Number(process.env.LIGHTHOUSE_PORT ?? "9222");
const reportDir = path.resolve("reports", "lighthouse");

function score(category) {
  return category.score === null ? null : Math.round(category.score * 100);
}

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

async function main() {
  const userDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "andcheck-lighthouse-"),
  );

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    args: [`--remote-debugging-port=${port}`],
  });

  try {
    const page = await context.newPage();
    await login(page);
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    const runnerResult = await lighthouse(targetUrl, {
      port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices"],
    });

    if (!runnerResult?.lhr) {
      throw new Error("Lighthouse nao retornou resultado.");
    }

    const { lhr, report } = runnerResult;
    const now = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonPath = path.join(reportDir, `authenticated-${now}.json`);
    const summaryPath = path.join(reportDir, "latest-summary.md");
    const scores = {
      performance: score(lhr.categories.performance),
      accessibility: score(lhr.categories.accessibility),
      bestPractices: score(lhr.categories["best-practices"]),
    };

    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(jsonPath, report, "utf8");
    await fs.writeFile(
      summaryPath,
      [
        "# Lighthouse autenticado",
        "",
        `URL: ${targetUrl}`,
        `Data: ${new Date().toISOString()}`,
        "",
        `- Performance: ${scores.performance}`,
        `- Accessibility: ${scores.accessibility}`,
        `- Best Practices: ${scores.bestPractices}`,
        "",
        `Relatorio JSON: ${path.relative(process.cwd(), jsonPath)}`,
        "",
      ].join("\n"),
      "utf8",
    );

    console.log("Lighthouse authenticated summary");
    console.log(`Performance: ${scores.performance}`);
    console.log(`Accessibility: ${scores.accessibility}`);
    console.log(`Best Practices: ${scores.bestPractices}`);
    console.log(`Report: ${path.relative(process.cwd(), jsonPath)}`);
  } finally {
    await context.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
