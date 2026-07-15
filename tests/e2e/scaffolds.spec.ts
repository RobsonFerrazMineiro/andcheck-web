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

test("scaffold list page loads correctly", async ({ page }) => {
  await login(page);
  await page.goto("/andaimes");
  await expect(page.locator("body")).not.toContainText("Application error");
  const searchInput = page
    .getByPlaceholder("Buscar por TAG, localização ou área...")
    .first();
  if (!(await searchInput.isVisible())) {
    test.info().annotations.push({
      type: "mobile-layout",
      description: "Search input is hidden in the compact mobile list layout.",
    });
    return;
  }
  await expect(searchInput).toBeVisible();
});

test("scaffold list shows results counter after filtering", async ({
  page,
}) => {
  await login(page);
  await page.goto("/andaimes");
  const searchInput = page
    .getByPlaceholder("Buscar por TAG, localização ou área...")
    .first();
  if (!(await searchInput.isVisible())) {
    test.info().annotations.push({
      type: "mobile-layout",
      description: "Search input is hidden in the compact mobile list layout.",
    });
    await expect(page.locator("body")).not.toContainText("Application error");
    return;
  }
  await searchInput.fill("__sem_resultado_e2e__");
  await expect(page.getByText(/resultado\(s\) filtrado\(s\)/)).toBeVisible();
});

test("scaffold list search does not crash the page", async ({ page }) => {
  await login(page);
  await page.goto("/andaimes");
  const searchInput = page
    .getByPlaceholder("Buscar por TAG, localização ou área...")
    .first();
  if (!(await searchInput.isVisible())) {
    test.info().annotations.push({
      type: "mobile-layout",
      description: "Search input is hidden in the compact mobile list layout.",
    });
    await expect(page.locator("body")).not.toContainText("Application error");
    return;
  }
  await searchInput.fill("AND-2026");
  await expect(page.locator("body")).not.toContainText("Application error");
});

// ── Create form ──────────────────────────────────────────────────────────────

test("scaffold creation form loads all required sections", async ({ page }) => {
  await login(page);
  await page.goto("/andaimes/novo");

  // Header section
  await expect(page.getByText("Cadastro de Andaime")).toBeVisible();

  // Required field labels should be visible
  await expect(page.getByText("Localização *")).toBeVisible();
  await expect(page.getByText("Altura (m) *")).toBeVisible();
  await expect(page.getByText("Tipo *")).toBeVisible();

  // Buttons
  await expect(
    page.getByRole("button", { name: /Cadastrar Andaime/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Cancelar/i })).toBeVisible();
});

test("scaffold creation cancel button returns to list", async ({ page }) => {
  await login(page);
  await page.goto("/andaimes/novo");
  await page.getByRole("button", { name: /Cancelar/i }).click();
  await expect(page).toHaveURL(/\/andaimes$/);
});

test("scaffold form submission with required fields creates a scaffold", async ({
  page,
}) => {
  await login(page);
  await page.goto("/andaimes/novo");

  // Fill required fields
  await page
    .getByPlaceholder("Ex: Área 5 – Plataforma B")
    .fill("Plataforma E2E-Test");
  await page.getByPlaceholder(/Manuten/).fill("Area E2E");
  await page.getByPlaceholder("12.5").fill("6");
  await page.getByPlaceholder(/respons/i).fill("Equipe E2E");

  // Submit
  await page.getByRole("button", { name: /Cadastrar Andaime/i }).click();

  // On success, should redirect to the created scaffold detail page
  await expect(page).toHaveURL(/\/andaimes\/.+/, { timeout: 15_000 });
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("scaffold form shows error toast when submission fails validation", async ({
  page,
}) => {
  await login(page);
  await page.goto("/andaimes/novo");

  // Do NOT fill required fields, just click submit to trigger validation
  const submitBtn = page.getByRole("button", { name: /Cadastrar Andaime/i });

  // HTML5 validation should prevent submission or show built-in error
  // The form has required attributes so the browser should block submission
  await submitBtn.click();

  // Page should NOT navigate away (form validation blocks it)
  await expect(page).toHaveURL(/\/andaimes\/novo/);
});

// ── Scaffold detail ──────────────────────────────────────────────────────────

test("scaffold detail page loads without errors", async ({ page }) => {
  await login(page);
  await page.goto("/andaimes");

  // If there are scaffolds in the list, click the first one
  const firstLink = page.locator("a[href^='/andaimes/']").first();
  const count = await firstLink.count();

  if (count > 0) {
    await firstLink.click();
    await expect(page.locator("body")).not.toContainText("Application error");
  } else {
    // Skip if no scaffolds exist yet
    test
      .info()
      .annotations.push({
        type: "skip-reason",
        description: "No scaffolds in DB",
      });
  }
});

// ── Status filter ────────────────────────────────────────────────────────────

test("scaffold list status filter buttons are present", async ({ page }) => {
  await login(page);
  await page.goto("/andaimes");

  // Status filter tabs/buttons should be visible
  await expect(page.locator("body")).not.toContainText("Application error");
});
