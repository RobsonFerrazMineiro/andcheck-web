import { expect, test } from "@playwright/test";

const email = process.env.E2E_COMPANY_EMAIL ?? "raquel.mendes@andcheck.com";
const password = process.env.E2E_COMPANY_PASSWORD ?? "andcheck@2025";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("company user sees own audit events", async ({ page }) => {
  await login(page);

  await page.goto("/auditoria");

  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.getByText("0 evento(s) registrados")).not.toBeVisible();
  await expect(page.getByText("Raquel Mendes").first()).toBeVisible();
  await expect(
    page.locator("form[action='/auditoria']").evaluate((form) => {
      return form.scrollWidth <= form.clientWidth;
    }),
  ).resolves.toBe(true);
});
