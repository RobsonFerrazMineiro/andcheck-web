import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Em Prisma 7, prisma.config.ts é usado somente pelo Prisma Migrate (CLI).
// Para o Neon com pooler, o Migrate precisa de conexão direta (DIRECT_URL),
// pois o PgBouncer não suporta as queries de migração.
// O runtime usa DATABASE_URL (pooler) via pg.Pool em src/lib/prisma.ts.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DIRECT_URL"),
  },
});
