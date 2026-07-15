import { config } from "dotenv";

config({ path: ".env.homolog.local", override: false, quiet: true });

const required = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "NOTIFICATION_CRON_SECRET",
];

const failures = [];
const warnings = [];

function value(name) {
  return process.env[name]?.trim() ?? "";
}

function addFailure(message) {
  failures.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

for (const name of required) {
  if (!value(name)) addFailure(`${name} nao definido.`);
}

if (value("NEXT_PUBLIC_ENABLE_SERVICE_WORKER") !== "true") {
  addFailure("NEXT_PUBLIC_ENABLE_SERVICE_WORKER deve ser true em homologacao PWA/offline.");
}

const appUrl = value("NEXT_PUBLIC_APP_URL");
const authUrl = value("AUTH_URL");
const nextAuthUrl = value("NEXTAUTH_URL");

if (appUrl && authUrl && appUrl !== authUrl) {
  addFailure("NEXT_PUBLIC_APP_URL e AUTH_URL devem apontar para o mesmo origin.");
}

if (authUrl && nextAuthUrl && authUrl !== nextAuthUrl) {
  addFailure("AUTH_URL e NEXTAUTH_URL devem apontar para o mesmo origin.");
}

if (appUrl && !appUrl.startsWith("https://")) {
  addFailure("NEXT_PUBLIC_APP_URL deve usar HTTPS em homologacao publicada.");
}

const hasBlobToken = Boolean(value("BLOB_READ_WRITE_TOKEN"));
const hasBlobOidc = Boolean(value("VERCEL_OIDC_TOKEN") && value("BLOB_STORE_ID"));
if (!hasBlobToken && !hasBlobOidc) {
  addFailure("Storage de arquivos nao configurado: defina BLOB_READ_WRITE_TOKEN ou VERCEL_OIDC_TOKEN + BLOB_STORE_ID.");
}

const emailEnabled = value("EMAIL_NOTIFICATIONS_ENABLED") !== "false";
const emailProvider = value("EMAIL_PROVIDER") || "mock";
if (emailEnabled && emailProvider === "mock") {
  addWarning("EMAIL_PROVIDER=mock: envio real de e-mail nao sera validado nesta homologacao.");
}

if (emailEnabled && emailProvider !== "mock") {
  if (!value("EMAIL_FROM")) addFailure("EMAIL_FROM deve ser definido para envio real de e-mail.");
  if (emailProvider === "resend" && !value("RESEND_API_KEY")) {
    addFailure("RESEND_API_KEY deve ser definido quando EMAIL_PROVIDER=resend.");
  }
  if (emailProvider === "sendgrid" && !value("SENDGRID_API_KEY")) {
    addFailure("SENDGRID_API_KEY deve ser definido quando EMAIL_PROVIDER=sendgrid.");
  }
  if (emailProvider === "smtp") {
    for (const name of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"]) {
      if (!value(name)) addFailure(`${name} deve ser definido quando EMAIL_PROVIDER=smtp.`);
    }
  }
}

if (value("E2E_DISABLE_AUTH_RATE_LIMIT") === "1") {
  addWarning("E2E_DISABLE_AUTH_RATE_LIMIT=1 deve ser usado apenas em ambiente automatizado, nao em homologacao manual aberta.");
}

if (warnings.length > 0) {
  console.warn("\nAvisos de homologacao:\n");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length > 0) {
  console.error("\nFalhas de configuracao de homologacao:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Homologation environment check passed.");
