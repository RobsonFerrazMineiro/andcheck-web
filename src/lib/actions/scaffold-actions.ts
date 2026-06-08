"use server";

import { prisma } from "@/lib/prisma";
import {
  requireAnyPermission,
  requirePermission,
  requireRole,
} from "@/lib/authz";
import { generateNextScaffoldTag } from "@/lib/scaffold-code";
import { ScaffoldStatus, ScaffoldType } from "@prisma/client";

// ── Listar todos ──────────────────────────────────────────────────────────────
export async function getScaffolds() {
  await requireAnyPermission(["read.all", "read.own_company"]);

  return prisma.scaffold.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: { select: { inspections: true } },
      inspections: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true, result: true },
      },
    },
  });
}

// ── Buscar por ID ─────────────────────────────────────────────────────────────
export async function getScaffoldById(id: string) {
  await requireAnyPermission(["read.all", "read.own_company"]);

  return prisma.scaffold.findUnique({
    where: { id },
    include: {
      inspections: {
        orderBy: { date: "desc" },
        include: { checklist: true },
      },
    },
  });
}

// ── Buscar por tag (QR) ───────────────────────────────────────────────────────
export async function getScaffoldByTag(tag: string) {
  return prisma.scaffold.findFirst({
    where: { OR: [{ tag }, { code: tag }, { id: tag }] },
    include: {
      inspections: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true, result: true, inspector_name: true },
      },
    },
  });
}

// ── Criar ─────────────────────────────────────────────────────────────────────
export async function createScaffold(
  data: {
    type: ScaffoldType;
    location: string;
    area: string;
    height: number;
    width?: number;
    length?: number;
    max_load?: number;
    responsible: string;
    company?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
    location_description?: string;
  },
  attempt = 0,
): Promise<Awaited<ReturnType<typeof prisma.scaffold.create>>> {
  await requirePermission("scaffolds.create");

  const code = await generateNextScaffoldTag(attempt);
  try {
    return await prisma.scaffold.create({
      data: {
        ...data,
        code,
        tag: code, // QR Code usa o mesmo código fixo e legível
        status: "em_montagem",
      },
    });
  } catch (err: unknown) {
    // Conflito de unique constraint por concorrência → tenta novamente
    const isUniqueViolation =
      err instanceof Error && err.message.includes("Unique constraint");
    if (isUniqueViolation) {
      return createScaffold(data, attempt + 1);
    }
    throw err;
  }
}

// ── Atualizar status ──────────────────────────────────────────────────────────
export async function updateScaffoldStatus(id: string, status: ScaffoldStatus) {
  await requirePermission("scaffolds.update");
  return prisma.scaffold.update({ where: { id }, data: { status } });
}

// ── Concluir montagem → PENDENTE_LIBERACAO ────────────────────────────────────
export async function completeAssembly(id: string) {
  await requirePermission("scaffolds.complete_assembly");
  return prisma.scaffold.update({
    where: { id },
    data: {
      status: "pendente_liberacao",
      assembly_completed_at: new Date(),
    },
  });
}

// ── Desmontar → DESMONTADO ────────────────────────────────────────────────────
export async function dismantleScaffold(id: string) {
  await requirePermission("scaffolds.dismantle");
  return prisma.scaffold.update({
    where: { id },
    data: {
      status: "desmontado",
      dismantled_at: new Date(),
    },
  });
}

// ── Deletar ───────────────────────────────────────────────────────────────────
export async function deleteScaffold(id: string) {
  await requireRole("SUPER_ADMIN");
  return prisma.scaffold.delete({ where: { id } });
}
