import { spawnSync } from "node:child_process";

const prismaCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const fallbackDirectUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://prisma:prisma@localhost:5432/prisma";

const result = spawnSync(prismaCommand, ["prisma", "generate"], {
  env: {
    ...process.env,
    DIRECT_URL: fallbackDirectUrl,
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
