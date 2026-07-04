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

test("redirects protected routes to login", async ({ page }) => {
  await page.goto("/andaimes");
  await expect(page).toHaveURL(/\/login/);
});

test("rejects invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("invalid@example.com");
  await page.getByLabel("Senha").fill("invalid-password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha invalidos.")).toBeVisible();
});

test("logs in and loads primary authenticated routes", async ({ page }) => {
  await login(page);

  for (const route of [
    "/dashboard",
    "/andaimes",
    "/inspecoes",
    "/nao-conformidades",
    "/relatorios",
    "/dashboard-gerencial",
    "/notificacoes",
    "/auditoria",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(route.replace("/", "\\/")));
    await expect(page.locator("body")).not.toContainText("Application error");
  }
});

test("filters scaffold and inspection lists without application errors", async ({
  page,
}) => {
  await login(page);

  await page.goto("/andaimes");
  await page
    .getByPlaceholder("Buscar por TAG, localização ou área...")
    .fill("__sem_resultado_e2e__");
  await expect(page.getByText(/resultado\(s\) filtrado\(s\)/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");

  await page.goto("/inspecoes");
  await page
    .getByPlaceholder("Buscar por andaime (TAG) ou inspetor...")
    .fill("__sem_resultado_e2e__");
  await expect(page.getByText(/resultado\(s\) filtrado\(s\)/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("loads create forms and notification filters", async ({ page }) => {
  await login(page);

  for (const route of ["/andaimes/novo", "/inspecoes/nova"]) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(route.replace("/", "\\/")));
    await expect(page.locator("body")).not.toContainText("Application error");
  }

  await page.goto("/notificacoes?filter=critical");
  await expect(page).toHaveURL(/\/notificacoes\?filter=critical/);
  await expect(page.getByRole("link", { name: "Críticas" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});
