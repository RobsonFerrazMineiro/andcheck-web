import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL ?? "admin@andcheck.com";
const password = process.env.E2E_PASSWORD ?? "andcheck@2025";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// ── List & navigation ────────────────────────────────────────────────────────

test("NC list page loads correctly", async ({ page }) => {
  await login(page);
  await page.goto("/nao-conformidades");
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page).toHaveURL(/\/nao-conformidades/);
});

test("NC list renders without JS errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await login(page);
  await page.goto("/nao-conformidades");
  await expect(page.locator("body")).not.toContainText("Application error");

  // Tolerate known browser warnings but not runtime application errors
  const appErrors = errors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("fonts") &&
      !e.includes("hydration") &&
      !e.includes("Warning:"),
  );
  expect(appErrors).toHaveLength(0);
});

test("NC list search by text does not crash the page", async ({ page }) => {
  await login(page);
  await page.goto("/nao-conformidades");

  // Look for a search input that may exist
  const searchInput = page.getByPlaceholder(/buscar|pesquisar|search/i);
  const count = await searchInput.count();

  if (count > 0) {
    await searchInput.first().fill("__sem_resultado_e2e__");
    await expect(page.locator("body")).not.toContainText("Application error");
  }
});

// ── Status filter tabs ───────────────────────────────────────────────────────

test("NC list status filter for OPEN does not crash", async ({ page }) => {
  await login(page);
  await page.goto("/nao-conformidades?status=OPEN");
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page).toHaveURL(/\/nao-conformidades/);
});

test("NC list status filter for CLOSED does not crash", async ({ page }) => {
  await login(page);
  await page.goto("/nao-conformidades?status=CLOSED");
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("NC list status filter for IN_PROGRESS does not crash", async ({
  page,
}) => {
  await login(page);
  await page.goto("/nao-conformidades?status=IN_PROGRESS");
  await expect(page.locator("body")).not.toContainText("Application error");
});

// ── Detail page ──────────────────────────────────────────────────────────────

test("NC detail page loads without errors when NC exists", async ({ page }) => {
  await login(page);
  await page.goto("/nao-conformidades");

  // If there are NCs in the list, navigate to the first detail
  const firstLink = page.locator("a[href^='/nao-conformidades/']").first();
  const count = await firstLink.count();

  if (count > 0) {
    const href = await firstLink.getAttribute("href");
    if (href) {
      await page.goto(href);
      await expect(page.locator("body")).not.toContainText("Application error");
    }
  } else {
    test.info().annotations.push({
      type: "skip-reason",
      description: "No NCs in DB to navigate to",
    });
  }
});

// ── Mobile viewport ──────────────────────────────────────────────────────────

test("NC list is usable on mobile viewport", async ({ page }) => {
  await login(page);
  await page.goto("/nao-conformidades");
  await expect(page.locator("body")).not.toContainText("Application error");
  // Should render without horizontal overflow causing empty screens
  const width = await page.evaluate(() => document.body.scrollWidth);
  const viewport = page.viewportSize();
  expect(width).toBeLessThanOrEqual((viewport?.width ?? 0) + 30);
});
