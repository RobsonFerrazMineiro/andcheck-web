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

async function expectNoPageOverflow(
  page: import("@playwright/test").Page,
  route: string,
) {
  await expect(page.locator("body")).not.toContainText("Application error");
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const documentWidth = document.documentElement.scrollWidth;
    const offenders = Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className:
            typeof element.className === "string" ? element.className : "",
          text: element.textContent?.trim().slice(0, 80) ?? "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.right > viewportWidth + 1 || item.left < -1)
      .slice(0, 8);

    return { documentWidth, viewportWidth, offenders };
  });

  expect(
    overflow.documentWidth,
    `${route} overflow: ${JSON.stringify(overflow)}`,
  ).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

test("mobile admin pages do not overflow horizontally", async ({ page }) => {
  await login(page);

  for (const route of [
    "/mapa",
    "/usuarios",
    "/auditoria",
    "/perfil/notificacoes",
  ]) {
    await page.goto(route);
    if (route === "/auditoria") {
      await expect(
        page.getByText("Auditoria disponível em telas maiores"),
      ).toBeVisible();
    }
    await expectNoPageOverflow(page, route);
  }
});
