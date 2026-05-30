// node prisma/seed-users.cjs
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("andcheck@2025", 12);

  await prisma.user.upsert({
    where: { email: "admin@andcheck.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@andcheck.com",
      password_hash: hash,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "inspetor@andcheck.com" },
    update: {},
    create: {
      name: "João Inspetor",
      email: "inspetor@andcheck.com",
      password_hash: await bcrypt.hash("inspetor@2025", 12),
      role: "inspector",
    },
  });

  console.log("✅ Usuários criados:");
  console.log("   admin@andcheck.com / andcheck@2025");
  console.log("   inspetor@andcheck.com / inspetor@2025");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
