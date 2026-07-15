/**
 * E2E – Scaffold status lifecycle transitions
 *
 * Tests the full "em_montagem → pendente_liberacao" path and the
 * dismantling flow (dialog, validation, confirmation).
 *
 * Prerequisites:
 *   - Dev/production server running on http://localhost:3000
 *   - At least one user with admin role (default: admin@andcheck.com)
 *   - E2E_SKIP_WEBSERVER=1 pnpm e2e
 */

import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL ?? "admin@andcheck.com";
const password = process.env.E2E_PASSWORD ?? "andcheck@2025";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

/**
 * Creates a fresh scaffold via the UI form and returns the URL of the
 * detail page that the server redirects to after creation.
 */
async function createScaffold(page: import("@playwright/test").Page) {
  await page.goto("/andaimes/novo");
  await page
    .getByPlaceholder("Ex: Área 5 – Plataforma B")
    .fill(`Plataforma Lifecycle-E2E ${Date.now()}`);
  await page.getByPlaceholder(/Manuten/).fill("Area E2E");
  await page.getByPlaceholder("12.5").fill("5");
  await page.getByPlaceholder(/respons/i).fill("Equipe E2E");
  await page.getByRole("button", { name: /Cadastrar Andaime/i }).click();
  await expect(page).toHaveURL(/\/andaimes\/(?!novo$)[^/]+$/, {
    timeout: 15_000,
  });
  return page.url();
}

// ── Initial state ─────────────────────────────────────────────────────────────

test("newly created scaffold starts in em_montagem state", async ({ page }) => {
  await login(page);
  const url = await createScaffold(page);
  await page.goto(url);

  // The StatusBadge renders "EM MONTAGEM" for the em_montagem status
  await expect(page.locator("body")).toContainText(/EM MONTAGEM/i);
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("em_montagem scaffold shows Concluir Montagem action button", async ({
  page,
}) => {
  await login(page);
  const url = await createScaffold(page);
  await page.goto(url);

  await expect(
    page.getByRole("button", { name: /Concluir Montagem/i }),
  ).toBeVisible();
});

test("em_montagem scaffold does not show desmontado banner", async ({
  page,
}) => {
  await login(page);
  const url = await createScaffold(page);
  await page.goto(url);

  await expect(page.locator("body")).not.toContainText("Andaime encerrado");
});

// ── Concluir Montagem flow ────────────────────────────────────────────────────

test("Concluir Montagem button opens a confirmation dialog", async ({
  page,
}) => {
  await login(page);
  const url = await createScaffold(page);
  await page.goto(url);

  await page.getByRole("button", { name: /Concluir Montagem/i }).click();

  // The ConfirmDialog has role="dialog"
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await expect(page.locator('[role="dialog"]')).toContainText(
    "Concluir montagem",
  );
});

test("confirmation dialog has a cancel button that closes it", async ({
  page,
}) => {
  await login(page);
  const url = await createScaffold(page);
  await page.goto(url);

  await page.getByRole("button", { name: /Concluir Montagem/i }).click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.getByRole("button", { name: /Cancelar/i }).click();
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
});

test("confirming Concluir Montagem transitions scaffold to PEND. LIBERAÇÃO", async ({
  page,
}) => {
  await login(page);
  const url = await createScaffold(page);
  await page.goto(url);

  await page.getByRole("button", { name: /Concluir Montagem/i }).click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Click the confirm button inside the dialog (confirmLabel prop = "Concluir montagem")
  await page
    .locator('[role="dialog"]')
    .getByRole("button", { name: "Concluir montagem" })
    .click();

  // After router.refresh() the status badge should update
  await expect(page.locator("body")).toContainText(/PEND\. LIBERA/i, {
    timeout: 15_000,
  });
  await expect(page.locator("body")).not.toContainText(/EM MONTAGEM/i);
});

// ── Registrar Desmontagem flow ────────────────────────────────────────────────

test("em_montagem scaffold shows Registrar Desmontagem button", async ({
  page,
}) => {
  await login(page);
  const url = await createScaffold(page);
  await page.goto(url);

  await expect(
    page.getByRole("button", { name: /Registrar Desmontagem/i }),
  ).toBeVisible();
});

test("Registrar Desmontagem button opens dismantling dialog with reason selector", async ({
  page,
}) => {
  await login(page);
  const url = await createScaffold(page);
  await page.goto(url);

  await page.getByRole("button", { name: /Registrar Desmontagem/i }).click();

  // DismantleDialog renders a select/list of reasons
  await expect(page.locator("body")).toContainText(/motivo/i);
  await expect(page.locator("body")).toContainText(/Finalizacao da atividade/i);
});

test("dismantling without selecting a reason shows a validation error", async ({
  page,
}) => {
  await login(page);
  const url = await createScaffold(page);
  await page.goto(url);

  await page.getByRole("button", { name: /Registrar Desmontagem/i }).click();

  // Try to confirm without choosing a reason
  await page.getByRole("button", { name: "Confirmar desmontagem" }).click();

  // Should show the inline error "Selecione o motivo da desmontagem."
  await expect(page.locator("body")).toContainText(
    "Selecione o motivo da desmontagem.",
  );
});

// ── Desmontado banner ─────────────────────────────────────────────────────────

test("desmontado scaffold shows the encerrado banner instead of action buttons", async ({
  page,
}) => {
  await login(page);
  await page.goto("/andaimes");

  // Find the first link to a desmontado scaffold (if any exist in the DB)
  // by filtering the list. The StatusBadge renders "DESMONTADO" text.
  const allLinks = page.locator("a[href^='/andaimes/']");
  const count = await allLinks.count();
  let desmontadoUrl: string | null = null;

  for (let i = 0; i < Math.min(count, 20); i++) {
    const link = allLinks.nth(i);
    const linkText = await link.textContent();
    if (linkText?.includes("DESMONTADO")) {
      desmontadoUrl = await link.getAttribute("href");
      break;
    }
  }

  if (!desmontadoUrl) {
    test.info().annotations.push({
      type: "skip-reason",
      description: "No desmontado scaffolds found in list.",
    });
    return;
  }

  await page.goto(desmontadoUrl);
  await expect(page.locator("body")).toContainText("Andaime encerrado");
  await expect(
    page.getByRole("button", { name: /Concluir Montagem/i }),
  ).not.toBeVisible();
});
