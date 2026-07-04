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

test("inspection list page loads correctly", async ({ page }) => {
  await login(page);
  await page.goto("/inspecoes");
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page).toHaveURL(/\/inspecoes/);
});

test("inspection list search does not crash the page", async ({ page }) => {
  await login(page);
  await page.goto("/inspecoes");
  await page
    .getByPlaceholder("Buscar por andaime (TAG) ou inspetor...")
    .fill("__sem_resultado_e2e__");
  await expect(page.getByText(/resultado\(s\) filtrado\(s\)/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("inspection list clears search correctly", async ({ page }) => {
  await login(page);
  await page.goto("/inspecoes");
  const searchInput = page.getByPlaceholder(
    "Buscar por andaime (TAG) ou inspetor...",
  );
  await searchInput.fill("__sem_resultado_e2e__");
  await searchInput.clear();
  await expect(page.locator("body")).not.toContainText("Application error");
});

// ── Create form ──────────────────────────────────────────────────────────────

test("inspection create form loads correctly", async ({ page }) => {
  await login(page);
  await page.goto("/inspecoes/nova");
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page).toHaveURL(/\/inspecoes\/nova/);
});

test("inspection create form shows required fields", async ({ page }) => {
  await login(page);
  await page.goto("/inspecoes/nova");

  // Key form elements should be visible
  await expect(page.getByText("Nova Inspeção")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Registrar Inspe/i }),
  ).toBeVisible();
});

test("submit button is disabled when no scaffold is selected", async ({
  page,
}) => {
  await login(page);
  await page.goto("/inspecoes/nova");

  const submitBtn = page.getByRole("button", { name: /Registrar Inspe/i });
  // Without selecting a scaffold, submit should be disabled
  await expect(submitBtn).toBeDisabled();
});

test("inspection cancel navigation returns to list", async ({ page }) => {
  await login(page);
  await page.goto("/inspecoes/nova");
  await page
    .getByRole("link", { name: /voltar|cancelar/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/inspecoes$/);
});

// ── Create inspection via URL with existing scaffold ─────────────────────────

test("inspection form pre-selects scaffold when scaffold_id is in URL", async ({
  page,
}) => {
  await login(page);

  // Navigate to the scaffold list to find any existing scaffold
  await page.goto("/andaimes");
  const firstScaffoldLink = page
    .locator("a[href^='/andaimes/']")
    .filter({ hasNotText: "novo" })
    .first();
  const scaffoldLinkCount = await firstScaffoldLink.count();

  if (scaffoldLinkCount === 0) {
    test.info().annotations.push({
      type: "skip-reason",
      description: "No scaffolds in DB to use for inspection test",
    });
    return;
  }

  const scaffoldHref = await firstScaffoldLink.getAttribute("href");
  const scaffoldId = scaffoldHref?.split("/").pop();
  if (!scaffoldId) return;

  await page.goto(`/inspecoes/nova?scaffold_id=${scaffoldId}`);
  await expect(page.locator("body")).not.toContainText("Application error");

  // Submit button should be enabled when a valid scaffold is pre-selected
  // and inspector name is filled in
  const inspectorInput = page.getByPlaceholder(/nome do inspetor/i);
  if ((await inspectorInput.count()) > 0) {
    await inspectorInput.fill("Inspector E2E");
    const submitBtn = page.getByRole("button", { name: /Registrar Inspe/i });
    await expect(submitBtn).not.toBeDisabled({ timeout: 5_000 });
  }
});

test("full inspection creation with scaffold creates inspection record", async ({
  page,
}) => {
  await login(page);

  // First create a scaffold to inspect
  await page.goto("/andaimes/novo");
  await page.getByPlaceholder("Ex: Área 5 – Plataforma B").fill("Inspecao E2E");
  await page.getByPlaceholder("12.5").fill("4");
  await page.getByRole("button", { name: /Cadastrar Andaime/i }).click();
  await expect(page).toHaveURL(/\/andaimes\/.+/, { timeout: 15_000 });

  // Extract the scaffold ID from URL
  const scaffoldUrl = page.url();
  const scaffoldId = scaffoldUrl.split("/andaimes/")[1];
  if (!scaffoldId) return;

  // Navigate to create inspection pre-linked to this scaffold
  await page.goto(`/inspecoes/nova?scaffold_id=${scaffoldId}`);
  await expect(page.locator("body")).not.toContainText("Application error");

  // Fill inspector name
  const inspectorInput = page.getByPlaceholder(/nome do inspetor/i);
  if ((await inspectorInput.count()) === 0) return;
  await inspectorInput.fill("Inspector E2E");

  // Submit the inspection
  const submitBtn = page.getByRole("button", { name: /Registrar Inspe/i });
  await expect(submitBtn).not.toBeDisabled({ timeout: 5_000 });
  await submitBtn.click();

  // Should navigate to inspection detail or andaime detail
  await expect(page).toHaveURL(/\/(inspecoes|andaimes)\/.+/, {
    timeout: 20_000,
  });
  await expect(page.locator("body")).not.toContainText("Application error");
});

// ── Inspection detail ────────────────────────────────────────────────────────

test("inspection detail page loads without errors when inspection exists", async ({
  page,
}) => {
  await login(page);
  await page.goto("/inspecoes");

  const firstLink = page
    .locator("a[href^='/inspecoes/']")
    .filter({ hasNotText: "nova" })
    .first();
  const count = await firstLink.count();

  if (count > 0) {
    await firstLink.click();
    await expect(page.locator("body")).not.toContainText("Application error");
  } else {
    test.info().annotations.push({
      type: "skip-reason",
      description: "No inspections in DB",
    });
  }
});

// ── Result filters ───────────────────────────────────────────────────────────

test("inspection list result filter for aprovado does not crash", async ({
  page,
}) => {
  await login(page);
  await page.goto("/inspecoes?result=aprovado");
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("inspection list result filter for reprovado does not crash", async ({
  page,
}) => {
  await login(page);
  await page.goto("/inspecoes?result=reprovado");
  await expect(page.locator("body")).not.toContainText("Application error");
});
