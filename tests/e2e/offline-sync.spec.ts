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

test("queues a scaffold creation while offline", async ({ context, page }) => {
  await login(page);
  await page.goto("/andaimes/novo");

  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("andcheck-offline");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
  await page.reload();

  await expect(page.getByPlaceholder(/Plataforma B/)).toBeVisible();
  await expect(page.getByPlaceholder("12.5")).toBeVisible();
  await page.waitForFunction(async () => {
    const cache = await caches.open("andcheck-offline-v4");
    return Boolean(
      (await cache.match("/sincronizacao")) &&
        (await cache.match("/andaimes")) &&
        (await cache.match("/inspecoes")) &&
        (await cache.match("/favicon.ico")),
    );
  });

  await context.setOffline(true);

  await page
    .getByPlaceholder(/Plataforma B/)
    .fill("Offline E2E - Plataforma");
  await page.getByPlaceholder("12.5").fill("4");
  await page.getByRole("button", { name: /Cadastrar Andaime/i }).click();

  await expect(page).toHaveURL(/\/sincronizacao/);

  const readQueuedAction = () =>
    page.evaluate(async () => {
      const request = indexedDB.open("andcheck-offline");
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction("syncQueue", "readonly");
      const store = transaction.objectStore("syncQueue");
      const items = await new Promise<Array<{ action: string }>>(
        (resolve, reject) => {
          const getAll = store.getAll();
          getAll.onsuccess = () => resolve(getAll.result);
          getAll.onerror = () => reject(getAll.error);
        },
      );

      db.close();
      return items[0]?.action;
    });

  await expect.poll(readQueuedAction).toBe("scaffold.create");
});
