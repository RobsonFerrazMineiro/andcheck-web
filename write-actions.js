const fs = require("fs");

const scaffoldActions = `"use server";

import { prisma } from "@/lib/prisma";
import { ScaffoldStatus, ScaffoldType } from "@prisma/client";

export type { ScaffoldStatus, ScaffoldType };

// ── Listar todos ──────────────────────────────────────────────────────────────
export async function getScaffolds() {
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
    where: { OR: [{ tag }, { id: tag }] },
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
export async function createScaffold(data: {
  code: string;
  type: ScaffoldType;
  location: string;
  area: string;
  height: number;
  width?: number;
  length?: number;
  max_load?: number;
  responsible: string;
  notes?: string;
}) {
  return prisma.scaffold.create({
    data: {
      ...data,
      tag: crypto.randomUUID(),
      status: "pendente",
    },
  });
}

// ── Atualizar status ──────────────────────────────────────────────────────────
export async function updateScaffoldStatus(id: string, status: ScaffoldStatus) {
  return prisma.scaffold.update({ where: { id }, data: { status } });
}

// ── Deletar ───────────────────────────────────────────────────────────────────
export async function deleteScaffold(id: string) {
  return prisma.scaffold.delete({ where: { id } });
}
`;

const inspectionActions = `"use server";

import { prisma } from "@/lib/prisma";
import { InspectionResult } from "@prisma/client";

export type { InspectionResult };

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
`;

fs.writeFileSync(
  "src/lib/actions/scaffold-actions.ts",
  scaffoldActions,
  "utf8",
);
fs.writeFileSync(
  "src/lib/actions/inspection-actions.ts",
  inspectionActions,
  "utf8",
);
console.log("actions ok");
console.log(
  "scaffold-actions:",
  fs.statSync("src/lib/actions/scaffold-actions.ts").size,
);
console.log(
  "inspection-actions:",
  fs.statSync("src/lib/actions/inspection-actions.ts").size,
);
