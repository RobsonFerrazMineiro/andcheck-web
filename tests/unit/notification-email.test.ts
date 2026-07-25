import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createMockEmailProvider,
  createResendEmailProvider,
  sendEmail,
} from "@/lib/notifications/email";
import { buildNotificationEmail } from "@/lib/notifications/email-template";

const originalEnv = {
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

describe("notification email providers", () => {
  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("keeps mock delivery deterministic and independent from external keys", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_PROVIDER = "mock";

    const input = {
      to: "Admin@AndCheck.com",
      subject: "Teste",
      html: "<p>Teste</p>",
      text: "Teste",
    };

    await expect(sendEmail(input)).resolves.toMatchObject({
      success: true,
      provider: "mock",
    });
    await expect(createMockEmailProvider().send(input)).resolves.toEqual(
      await createMockEmailProvider().send(input),
    );
  });

  it("sends the expected payload through Resend", async () => {
    const send = vi.fn().mockResolvedValue({
      data: { id: "email_123" },
      error: null,
    });
    const provider = createResendEmailProvider({
      apiKey: "re_test_secret",
      from: "AndCheck <notificacoes@example.com>",
      client: { emails: { send } },
    });

    await expect(
      provider.send({
        to: "admin@andcheck.com",
        subject: "Alerta",
        html: "<p>Alerta</p>",
        text: "Alerta",
      }),
    ).resolves.toMatchObject({
      success: true,
      provider: "resend",
      providerMessageId: "email_123",
    });

    expect(send).toHaveBeenCalledWith({
      from: "AndCheck <notificacoes@example.com>",
      to: "admin@andcheck.com",
      subject: "Alerta",
      html: "<p>Alerta</p>",
      text: "Alerta",
      replyTo: undefined,
    });
  });

  it("returns controlled Resend failures without exposing secrets", async () => {
    const provider = createResendEmailProvider({
      apiKey: "re_test_secret",
      from: "AndCheck <notificacoes@example.com>",
      client: {
        emails: {
          send: vi.fn().mockRejectedValue(new Error("Bearer re_test_secret falhou")),
        },
      },
    });

    const result = await provider.send({
      to: "admin@andcheck.com",
      subject: "Alerta",
      html: "<p>Alerta</p>",
      text: "Alerta",
    });

    expect(result).toMatchObject({ success: false, provider: "resend" });
    expect(result.error).toContain("Bearer ***");
    expect(result.error).not.toContain("re_test_secret");
  });
});

describe("notification email template", () => {
  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("renders corporate HTML, text and contextual action data", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.andcheck.com";

    const email = buildNotificationEmail({
      title: "Andaime AND-001 vencido",
      message: "O andaime AND-001 esta vencido.",
      severity: "CRITICAL",
      notificationType: "SCAFFOLD_EXPIRED",
      recipientName: "Robson",
      companyName: "Montisol",
      workspaceName: "Hydro Alunorte",
      entityType: "SCAFFOLD",
      entityId: "scaffold-1",
      metadata: {
        entityLabel: "AND-001",
        area: "Murucupi",
        status: "liberado",
      },
      occurredAt: new Date("2026-07-25T12:00:00.000Z"),
    });

    expect(email.subject).toBe("[AndCheck] Andaime AND-001 vencido");
    expect(email.html).toContain("ANDCHECK");
    expect(email.html).toContain("Montisol");
    expect(email.html).toContain("AND-001");
    expect(email.html).toContain("TAG");
    expect(email.html).toContain("Murucupi");
    expect(email.html).toContain("Severidade");
    expect(email.html).toContain("Crítica");
    expect(email.html).toContain("ANDAIME VENCIDO");
    expect(email.html).toContain("Liberado");
    expect(email.html).not.toContain(">liberado<");
    expect(email.html).toContain("Visualizar andaime");
    expect(email.html).toContain("https://app.andcheck.com/andaimes/scaffold-1");
    expect(email.html).toContain("/perfil/notificacoes");
    expect(email.html).toContain("AndCheck Enterprise");
    expect(email.text).toContain("O andaime AND-001 está vencido.");
    expect(email.text).toContain("Visualizar andaime:");
  });

  it("hides absent optional fields", () => {
    const email = buildNotificationEmail({
      title: "Notificacao geral",
      message: "Mensagem operacional.",
      severity: "INFO",
      notificationType: "INSPECTION_COMPLETED",
      occurredAt: new Date("2026-07-25T12:00:00.000Z"),
      appBaseUrl: "https://app.andcheck.com",
    });

    expect(email.html).not.toContain("undefined");
    expect(email.html).not.toContain("null");
    expect(email.html).not.toContain("TAG/Entidade");
    expect(email.actionUrl).toBe("https://app.andcheck.com/notificacoes");
    expect(email.actionLabel).toBe("Abrir no AndCheck");
  });

  it("formats inspection result status as a display label", () => {
    const email = buildNotificationEmail({
      title: "Inspecao aprovada: AND-001",
      message: "A inspeção do andaime AND-001 foi aprovada.",
      severity: "SUCCESS",
      notificationType: "INSPECTION_APPROVED",
      entityType: "INSPECTION",
      entityId: "inspection-1",
      metadata: {
        entityLabel: "AND-001",
        status: "aprovado",
      },
      occurredAt: new Date("2026-07-25T12:00:00.000Z"),
      appBaseUrl: "https://app.andcheck.com",
    });

    expect(email.subject).toBe("[AndCheck] Inspeção aprovada: AND-001");
    expect(email.html).toContain("INSPEÇÃO APROVADA");
    expect(email.html).toContain("Visualizar inspeção");
    expect(email.html).toContain("Aprovado");
    expect(email.html).not.toContain(">aprovado<");
    expect(email.text).toContain("Status: Aprovado");
  });
});
