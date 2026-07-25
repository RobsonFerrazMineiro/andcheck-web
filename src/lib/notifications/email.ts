import "server-only";

import { Resend } from "resend";

export type EmailProviderName = "mock" | "resend" | "unsupported";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendEmailResult = {
  success: boolean;
  provider: EmailProviderName;
  providerMessageId?: string;
  error?: string;
};

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

type ResendClient = {
  emails: {
    send(input: {
      from: string;
      to: string | string[];
      subject: string;
      html: string;
      text?: string;
      replyTo?: string;
    }): Promise<{
      data?: { id?: string } | null;
      error?: { message?: string; name?: string } | null;
    }>;
  };
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  return getEmailProvider().send(input);
}

export function getEmailProvider(): EmailProvider {
  const provider = normalizeProvider(process.env.EMAIL_PROVIDER);
  if (provider === "resend") return createResendEmailProvider();
  if (provider === "unsupported") {
    return createUnsupportedEmailProvider(process.env.EMAIL_PROVIDER);
  }
  return createMockEmailProvider();
}

export function createMockEmailProvider(): EmailProvider {
  return {
    async send(input) {
      const normalized = normalizeEmail(input.to);
      if (!normalized) {
        return {
          success: false,
          provider: "mock",
          error: "Destinatario de e-mail invalido.",
        };
      }

      return {
        success: true,
        provider: "mock",
        providerMessageId: `mock_${stableHash([
          normalized,
          input.subject,
          input.text ?? input.html,
        ].join("|"))}`,
      };
    },
  };
}

export function createResendEmailProvider(options?: {
  apiKey?: string;
  from?: string;
  client?: ResendClient;
}): EmailProvider {
  return {
    async send(input) {
      const normalized = normalizeEmail(input.to);
      if (!normalized) {
        return {
          success: false,
          provider: "resend",
          error: "Destinatario de e-mail invalido.",
        };
      }

      const apiKey = options?.apiKey ?? process.env.RESEND_API_KEY;
      const from = (options?.from ?? process.env.EMAIL_FROM)?.trim();
      if (!apiKey) {
        return {
          success: false,
          provider: "resend",
          error: "RESEND_API_KEY nao configurada.",
        };
      }
      if (!from) {
        return {
          success: false,
          provider: "resend",
          error: "EMAIL_FROM nao configurado.",
        };
      }

      try {
        const client = options?.client ?? new Resend(apiKey);
        const result = await client.emails.send({
          from,
          to: normalized,
          subject: input.subject,
          html: input.html,
          text: input.text,
          replyTo: input.replyTo,
        });

        if (result.error) {
          return {
            success: false,
            provider: "resend",
            error: sanitizeProviderError(result.error.message ?? result.error.name),
          };
        }

        return {
          success: true,
          provider: "resend",
          providerMessageId: result.data?.id,
        };
      } catch (error) {
        return {
          success: false,
          provider: "resend",
          error: sanitizeProviderError(error),
        };
      }
    },
  };
}

function createUnsupportedEmailProvider(providerName?: string): EmailProvider {
  return {
    async send() {
      return {
        success: false,
        provider: "unsupported",
        error: `EMAIL_PROVIDER=${providerName ?? ""} nao suportado.`,
      };
    },
  };
}

export function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function normalizeProvider(
  value: string | null | undefined,
): EmailProviderName {
  if (!value || value.toLowerCase() === "mock") return "mock";
  if (value.toLowerCase() === "resend") return "resend";
  return "unsupported";
}

function sanitizeProviderError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Falha ao enviar e-mail.";

  return message
    .replace(/re_[A-Za-z0-9_\-]+/g, "re_***")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer ***")
    .slice(0, 1000);
}

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
