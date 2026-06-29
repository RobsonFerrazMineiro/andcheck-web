import "server-only";

import { sanitizeForLog } from "@/lib/safe-log";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult = {
  provider: string;
  providerMessageId?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const provider = process.env.EMAIL_PROVIDER || "mock";

  if (provider !== "mock") {
    console.warn(
      `EMAIL_PROVIDER=${provider} ainda nao esta implementado. Usando mock para ${input.to}.`,
    );
  }

  try {
    return {
      provider: "mock",
      providerMessageId: `mock_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`,
    };
  } catch (error) {
    console.error("Falha no mock de e-mail:", sanitizeForLog(error));
    throw error;
  }
}

export function renderNotificationEmail({
  title,
  message,
  companyName,
  workspaceName,
  entityLabel,
  status,
  actionUrl,
  createdAt,
}: {
  title: string;
  message: string;
  companyName?: string | null;
  workspaceName?: string | null;
  entityLabel?: string | null;
  status?: string | null;
  actionUrl: string;
  createdAt: Date;
}) {
  const rows = [
    ["Empresa", companyName],
    ["Area", workspaceName],
    ["TAG/Entidade", entityLabel],
    ["Status", status],
    ["Data/hora", createdAt.toLocaleString("pt-BR")],
  ].filter(([, value]) => Boolean(value));

  const text = [
    title,
    "",
    message,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Acesse o AndCheck: ${actionUrl}`,
    "",
    "Mensagem automatica. Nao responda este e-mail.",
  ].join("\n");

  const details = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#64748b">${label}</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0f172a">${value}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
            <tr>
              <td style="padding:20px 24px;border-bottom:1px solid #e2e8f0">
                <strong style="font-size:14px;letter-spacing:.08em;text-transform:uppercase">AndCheck</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:24px">
                <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${escapeHtml(title)}</h1>
                <p style="margin:0 0 20px;color:#334155;line-height:1.5">${escapeHtml(message)}</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:10px 0;margin-bottom:20px">${details}</table>
                <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;padding:10px 14px;font-weight:700;font-size:13px">Acessar AndCheck</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px">
                Mensagem automatica. Nao responda este e-mail.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, text };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
