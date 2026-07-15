import { afterEach, describe, expect, it } from "vitest";

import { sendEmail } from "@/lib/notifications/email";

const originalProvider = process.env.EMAIL_PROVIDER;

describe("notification email delivery", () => {
  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.EMAIL_PROVIDER;
    } else {
      process.env.EMAIL_PROVIDER = originalProvider;
    }
  });

  it("allows explicit mock delivery for local development", async () => {
    process.env.EMAIL_PROVIDER = "mock";

    await expect(
      sendEmail({
        to: "admin@andcheck.com",
        subject: "Teste",
        html: "<p>Teste</p>",
        text: "Teste",
      }),
    ).resolves.toMatchObject({ provider: "mock" });
  });

  it("does not report success for a real provider without an adapter", async () => {
    process.env.EMAIL_PROVIDER = "resend";

    await expect(
      sendEmail({
        to: "admin@andcheck.com",
        subject: "Teste",
        html: "<p>Teste</p>",
        text: "Teste",
      }),
    ).rejects.toThrow("Envio real de e-mail nao implementado");
  });
});
