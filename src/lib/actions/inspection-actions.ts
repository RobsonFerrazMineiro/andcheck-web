"use server";

import { prisma } from "@/lib/prisma";
import { InspectionResult } from "@prisma/client";

// ── Listar todas ──────────────────────────────────────────────────────────────
export async function getInspections() {
  return prisma.inspection.findMany({
    orderBy: { date: "desc" },
    include: {
      scaffold: { select: { code: true, location: true, area: true } },
      _count: { select: { checklist: true } },
    },
  });
}

// ── Buscar por ID ─────────────────────────────────────────────────────────────
export async function getInspectionById(id: string) {
  return prisma.inspection.findUnique({
    where: { id },
    include: {
      scaffold: true,
      checklist: { orderBy: { category: "asc" } },
    },
  });
}

// ── Listar por andaime ────────────────────────────────────────────────────────
export async function getInspectionsByScaffold(scaffold_id: string) {
  return prisma.inspection.findMany({
    where: { scaffold_id },
    orderBy: { date: "desc" },
    include: { checklist: true },
  });
}

// ── Criar ─────────────────────────────────────────────────────────────────────
export async function createInspection(data: {
  scaffold_id: string;
  scaffold_code: string;
  inspector_name: string;
  result: InspectionResult;
  validity_days: number;
  notes?: string;
  checklist: {
    item_id: string;
    item_label: string;
    category: string;
    value: "CL_OK" | "CL_FAIL" | "CL_WARN" | "CL_NA";
    critical: boolean;
    observation?: string;
  }[];
}) {
  const { checklist, ...inspectionData } = data;

  const inspection = await prisma.inspection.create({
    data: {
      ...inspectionData,
      checklist: { create: checklist },
    },
    include: { checklist: true },
  });

  // Atualizar status e validade do andaime
  const validityDate =
    data.validity_days > 0
      ? new Date(Date.now() + data.validity_days * 86_400_000)
      : null;

  await prisma.scaffold.update({
    where: { id: data.scaffold_id },
    data: {
      status: data.result === "reprovado" ? "reprovado" : "liberado",
      validity_date: validityDate,
    },
  });

  return inspection;
}

// ── Stats gerais ──────────────────────────────────────────────────────────────
export async function getInspectionStats() {
  const [total, aprovados, comRessalvas, reprovados] = await Promise.all([
    prisma.inspection.count(),
    prisma.inspection.count({ where: { result: "aprovado" } }),
    prisma.inspection.count({ where: { result: "aprovado_com_ressalvas" } }),
    prisma.inspection.count({ where: { result: "reprovado" } }),
  ]);
  return { total, aprovados, comRessalvas, reprovados };
}
