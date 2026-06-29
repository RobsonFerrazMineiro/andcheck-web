import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;

// PrismaClient é global em dev para evitar múltiplas instâncias com hot-reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function hasRequiredDelegates(client: PrismaClient) {
  const delegatedClient = client as unknown as {
    nonConformity?: unknown;
    document?: unknown;
    notification?: unknown;
    notificationPreference?: unknown;
    emailDeliveryLog?: unknown;
  };

  return Boolean(
    delegatedClient.nonConformity &&
      delegatedClient.document &&
      delegatedClient.notification &&
      delegatedClient.notificationPreference &&
      delegatedClient.emailDeliveryLog,
  );
}

function createPrismaClient() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.prisma && hasRequiredDelegates(globalForPrisma.prisma)
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
