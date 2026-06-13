// node prisma/seed-users.cjs
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const rbacData = require("../src/lib/rbac-data.json");
const signaturePolicyData = require("../src/lib/signature-policy-data.json");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedRbac() {
  const permissions = new Map();
  for (const permission of rbacData.permissions) {
    const record = await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name },
      create: permission,
    });
    permissions.set(record.code, record);
  }

  const roles = new Map();
  for (const role of rbacData.roles) {
    const record = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, is_system: true },
      create: { ...role, is_system: true },
    });
    roles.set(record.code, record);
  }

  for (const [roleCode, permissionCodes] of Object.entries(
    rbacData.rolePermissions,
  )) {
    const role = roles.get(roleCode);
    if (!role) continue;

    const effectivePermissionCodes = permissionCodes.includes("*")
      ? rbacData.permissions.map((permission) => permission.code)
      : permissionCodes;

    for (const permissionCode of effectivePermissionCodes) {
      const permission = permissions.get(permissionCode);
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: role.id,
            permission_id: permission.id,
          },
        },
        update: {},
        create: {
          role_id: role.id,
          permission_id: permission.id,
        },
      });
    }
  }

  return { roles, permissions };
}

async function seedSignaturePolicies() {
  for (const policy of signaturePolicyData.policies) {
    const record = await prisma.inspectionSignaturePolicy.upsert({
      where: { id: `seed-${policy.name}` },
      update: {
        name: policy.name,
        description: policy.description,
        is_default: policy.isDefault,
        is_active: true,
      },
      create: {
        id: `seed-${policy.name}`,
        name: policy.name,
        description: policy.description,
        is_default: policy.isDefault,
        is_active: true,
      },
    });

    for (const requirement of policy.requirements) {
      await prisma.inspectionSignatureRequirement.upsert({
        where: {
          policy_id_role_code: {
            policy_id: record.id,
            role_code: requirement.roleCode,
          },
        },
        update: {
          label: requirement.label,
          sort_order: requirement.sortOrder,
          min_count: 1,
          is_required: true,
        },
        create: {
          policy_id: record.id,
          role_code: requirement.roleCode,
          label: requirement.label,
          sort_order: requirement.sortOrder,
          min_count: 1,
          is_required: true,
        },
      });
    }
  }
}

async function main() {
  const { roles, permissions } = await seedRbac();
  await seedSignaturePolicies();
  const hash = await bcrypt.hash("andcheck@2025", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@andcheck.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@andcheck.com",
      password_hash: hash,
      role: "admin",
    },
  });

  const inspector = await prisma.user.upsert({
    where: { email: "inspetor@andcheck.com" },
    update: {},
    create: {
      name: "Joao Inspetor",
      email: "inspetor@andcheck.com",
      password_hash: await bcrypt.hash("inspetor@2025", 12),
      role: "inspector",
    },
  });

  const defaultAssignments = [
    { user: admin, roleCode: "SUPER_ADMIN" },
    { user: inspector, roleCode: "HSE_EMPRESA" },
  ];

  for (const assignment of defaultAssignments) {
    const role = roles.get(assignment.roleCode);
    if (!role) continue;

    await prisma.userRole.upsert({
      where: {
        user_id_role_id: {
          user_id: assignment.user.id,
          role_id: role.id,
        },
      },
      update: {},
      create: {
        user_id: assignment.user.id,
        role_id: role.id,
      },
    });
  }

  console.log("RBAC criado:");
  console.log(`   ${roles.size} perfis`);
  console.log(`   ${permissions.size} permissoes`);
  console.log(`   ${signaturePolicyData.policies.length} politica(s) de assinatura`);
  console.log("Usuarios criados:");
  console.log("   admin@andcheck.com / andcheck@2025");
  console.log("   inspetor@andcheck.com / inspetor@2025");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
