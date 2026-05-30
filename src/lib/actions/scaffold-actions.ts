"use server";

import { prisma } from "@/lib/prisma";
import { ScaffoldStatus, ScaffoldType } from "@prisma/client";

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
  company?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  location_description?: string;
}) {
  return prisma.scaffold.create({
    data: {
      ...data,
      tag: crypto.randomUUID(),
      status: "em_montagem",
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
