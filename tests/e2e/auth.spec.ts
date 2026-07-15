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

test("opens admin creation forms in modals", async ({ page }) => {
  await login(page);

  for (const item of [
    {
      route: "/usuarios",
      button: /Novo Usuário/i,
      title: /Cadastro de Usuário/i,
    },
    {
      route: "/empresas",
      button: /Nova empresa/i,
      title: /Nova empresa/i,
    },
    {
      route: "/workspaces",
      button: /Novo workspace/i,
      title: /Novo workspace/i,
    },
  ]) {
    await page.goto(item.route);
    await page.getByRole("button", { name: item.button }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: item.title }),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Fechar modal" }).click();
    await expect(dialog).toBeHidden();
  }
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
  const scaffoldSearchInput = page
    .getByPlaceholder("Buscar por TAG, localização ou área...")
    .first();
  if (await scaffoldSearchInput.isVisible()) {
    await scaffoldSearchInput.fill("__sem_resultado_e2e__");
    await expect(page.getByText(/resultado\(s\) filtrado\(s\)/)).toBeVisible();
  } else {
    test.info().annotations.push({
      type: "mobile-layout",
      description: "Scaffold search input is hidden in compact mobile layout.",
    });
  }
  await expect(page.locator("body")).not.toContainText("Application error");

  await page.goto("/inspecoes");
  const inspectionSearchInput = page
    .getByPlaceholder("Buscar por andaime (TAG) ou inspetor...")
    .first();
  if (await inspectionSearchInput.isVisible()) {
    await inspectionSearchInput.fill("__sem_resultado_e2e__");
    await expect(page.getByText(/resultado\(s\) filtrado\(s\)/)).toBeVisible();
  } else {
    test.info().annotations.push({
      type: "mobile-layout",
      description: "Inspection search input is hidden in compact mobile layout.",
    });
  }
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
  await expect(page.getByRole("link", { name: "Criticas" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});
