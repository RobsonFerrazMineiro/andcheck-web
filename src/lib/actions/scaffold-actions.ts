"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAnyPermission,
  requirePermission,
  requireRole,
} from "@/lib/authz";
import {
  AuditAction,
  AuditEntityType,
  createAuditLog,
  logScaffoldStatusConsultation,
} from "@/lib/audit";
import { generateNextScaffoldTag } from "@/lib/scaffold-code";
import {
  assertRecordInDataScope,
  dataScopeWhere,
  getDataScope,
  getOwnedCreationContext,
} from "@/lib/data-scope";
import {
  enumValue,
  optionalNumber,
  optionalText,
  requiredId,
  requiredNumber,
  requiredText,
} from "@/lib/input-validation";
import { createNotification } from "@/lib/notifications/service";
import {
  ScaffoldStatus,
  ScaffoldType,
  type NotificationChannel,
  type NotificationSeverity,
  type NotificationType,
} from "@prisma/client";

const SCAFFOLD_TYPES = Object.values(ScaffoldType);
const SCAFFOLD_STATUSES = Object.values(ScaffoldStatus);

function parseScaffoldInput(data: {
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
  return {
    type: enumValue(data.type, SCAFFOLD_TYPES, "Tipo do andaime"),
    location: requiredText(data.location, "Localizacao", 180),
    area: requiredText(data.area, "Area", 120),
    height: requiredNumber(data.height, "Altura", { min: 0.1, max: 200 }),
    width: optionalNumber(data.width, "Largura", { min: 0, max: 200 }) ?? undefined,
    length:
      optionalNumber(data.length, "Comprimento", { min: 0, max: 500 }) ??
      undefined,
    max_load:
      optionalNumber(data.max_load, "Carga maxima", { min: 0, max: 100000 }) ??
      undefined,
    responsible: requiredText(data.responsible, "Responsavel tecnico", 140),
    company: optionalText(data.company, "Empresa montadora", 160) ?? undefined,
    notes: optionalText(data.notes, "Observacoes", 1000) ?? undefined,
    latitude: optionalNumber(data.latitude, "Latitude", { min: -90, max: 90 }) ?? undefined,
    longitude: optionalNumber(data.longitude, "Longitude", { min: -180, max: 180 }) ?? undefined,
    location_description:
      optionalText(data.location_description, "Descricao da localizacao", 240) ??
      undefined,
  };
}

// ── Listar todos ──────────────────────────────────────────────────────────────
export async function getScaffolds() {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();

  return prisma.scaffold.findMany({
    where: {
      ...dataScopeWhere(scope),
      status: { not: "desmontado" },
    },
    orderBy: { code: "asc" },
    include: {
      tenantCompany: { select: { id: true, name: true } },
      _count: { select: { inspections: true } },
      inspections: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true, result: true },
      },
    },
  });
}

export async function getScaffoldMapData() {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();

  return prisma.scaffold.findMany({
    where: {
      ...dataScopeWhere(scope),
      status: { not: "desmontado" },
    },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      location: true,
      area: true,
      status: true,
      responsible: true,
      companyId: true,
      location_description: true,
      validity_date: true,
      latitude: true,
      longitude: true,
      tenantCompany: { select: { name: true } },
      inspections: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true, result: true },
      },
    },
  });
}

export async function getScaffoldArchive() {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();

  // FUTURO:
  //
  // Quando Scaffold.status === DESMONTADO
  // exibir automaticamente no Acervo de Andaimes.
  //
  // Nesta sprint a tela permanece preparada
  // aguardando integração.
  return prisma.scaffold.findMany({
    where: { status: "desmontado", ...dataScopeWhere(scope) },
    orderBy: [{ dismantled_at: "desc" }, { code: "asc" }],
    include: {
      tenantCompany: { select: { id: true, name: true } },
      workspace: { select: { id: true, name: true } },
      inspections: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true, result: true },
      },
      _count: { select: { documents: true, nonConformities: true } },
    },
  });
}

// ── Buscar por ID ─────────────────────────────────────────────────────────────
export async function getScaffoldById(id: string) {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();

  return prisma.scaffold.findFirst({
    where: { id, ...dataScopeWhere(scope) },
    include: {
      inspections: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          inspector_name: true,
          result: true,
          validity_days: true,
        },
      },
      nonConformities: {
        orderBy: { createdAt: "desc" },
        include: {
          responsibleUser: {
            select: {
              id: true,
              name: true,
              company: true,
            },
          },
        },
      },
    },
  });
}

export async function getArchivedScaffoldByTag(tag: string) {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();

  const scaffold = await prisma.scaffold.findFirst({
    where: {
      OR: [{ tag }, { code: tag }, { id: tag }],
      ...dataScopeWhere(scope),
    },
    include: {
      tenantCompany: { select: { id: true, name: true } },
      workspace: { select: { id: true, name: true } },
      documents: {
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          type: true,
          title: true,
          file_name: true,
          file_size: true,
          mime_type: true,
          uploaded_by: true,
          expires_at: true,
          observation: true,
          created_at: true,
        },
      },
      inspections: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          inspector_name: true,
          result: true,
          validity_days: true,
          notes: true,
        },
      },
      nonConformities: {
        orderBy: { createdAt: "desc" },
        include: {
          responsibleUser: {
            select: { id: true, name: true, company: true },
          },
          _count: { select: { evidences: true, history: true } },
        },
      },
    },
  });

  if (!scaffold) return null;

  const relatedAuditTargets = [
    { entityType: "SCAFFOLD" as const, entityId: scaffold.id },
    { entityType: "QR_CODE" as const, entityId: scaffold.id },
    ...scaffold.inspections.map((inspection) => ({
      entityType: "INSPECTION" as const,
      entityId: inspection.id,
    })),
    ...scaffold.nonConformities.map((nonConformity) => ({
      entityType: "NON_CONFORMITY" as const,
      entityId: nonConformity.id,
    })),
    ...scaffold.documents.map((document) => ({
      entityType: "DOCUMENT" as const,
      entityId: document.id,
    })),
  ];

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: relatedAuditTargets,
      ...dataScopeWhere(scope),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      entityType: true,
      action: true,
      description: true,
      userName: true,
      oldValue: true,
      newValue: true,
      createdAt: true,
    },
  });

  return { scaffold, auditLogs };
}

// ── Buscar por tag (QR) ───────────────────────────────────────────────────────
export async function getScaffoldByTag(tag: string) {
  const lookupTag = requiredId(tag, "Tag do andaime");
  const scaffold = await prisma.scaffold.findFirst({
    where: { OR: [{ tag: lookupTag }, { code: lookupTag }, { id: lookupTag }] },
    select: {
      id: true,
      code: true,
      tag: true,
      type: true,
      status: true,
      location: true,
      responsible: true,
      company: true,
      validity_date: true,
      inspections: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true, result: true, inspector_name: true },
      },
    },
  });
  if (scaffold) {
    await logScaffoldStatusConsultation(scaffold);
  }
  return scaffold;
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
  const scope = await getDataScope();
  const input = parseScaffoldInput(data);
  const requestedCompany = input.company?.trim();
  const selectedCompany =
    scope.isGlobal && requestedCompany
      ? await prisma.company.findFirst({
          where: {
            OR: [
              { id: requestedCompany },
              { name: { equals: requestedCompany, mode: "insensitive" } },
              {
                tradeName: {
                  equals: requestedCompany,
                  mode: "insensitive",
                },
              },
            ],
          },
          select: { id: true, name: true },
        })
      : null;
  const creationContext = scope.isGlobal
    ? {
        companyId: selectedCompany?.id ?? scope.actorCompanyId,
        workspaceId: scope.actorWorkspaceId,
      }
    : getOwnedCreationContext(scope);
  const tenantCompany =
    selectedCompany ??
    (await prisma.company.findUnique({
      where: { id: creationContext.companyId },
      select: { name: true },
    }));

  const code = await generateNextScaffoldTag(attempt);
  try {
    const scaffold = await prisma.scaffold.create({
      data: {
        ...input,
        ...creationContext,
        company: tenantCompany?.name ?? input.company,
        code,
        tag: code, // QR Code usa o mesmo código fixo e legível
        status: "em_montagem",
      },
    });
    await createAuditLog({
      entityType: AuditEntityType.SCAFFOLD,
      entityId: scaffold.id,
      entityLabel: scaffold.code,
      action: AuditAction.CREATE,
      description: `Andaime ${scaffold.code} criado`,
      newValue: {
        code: scaffold.code,
        status: scaffold.status,
        type: scaffold.type,
        location: scaffold.location,
        area: scaffold.area,
        company: scaffold.company,
        latitude: scaffold.latitude,
        longitude: scaffold.longitude,
      },
      companyId: scaffold.companyId,
      workspaceId: scaffold.workspaceId,
    });
    await createNotification({
      companyId: scaffold.companyId,
      workspaceId: scaffold.workspaceId,
      type: "SCAFFOLD_CREATED",
      severity: "INFO",
      title: `Andaime ${scaffold.code} criado`,
      message: `O andaime ${scaffold.code} foi criado e esta em montagem.`,
      entityType: "SCAFFOLD",
      entityId: scaffold.id,
      channels: ["INTERNAL"],
      metadata: {
        entityLabel: scaffold.code,
        status: scaffold.status,
        area: scaffold.area,
      },
    });
    revalidatePath("/andaimes");
    revalidatePath("/dashboard");
    revalidatePath("/mapa");
    revalidatePath(`/andaimes/${scaffold.id}`);
    return scaffold;
  } catch (err: unknown) {
    // Conflito de unique constraint por concorrência → tenta novamente
    const isUniqueViolation =
      err instanceof Error && err.message.includes("Unique constraint");
    if (isUniqueViolation) {
      return createScaffold(input, attempt + 1);
    }
    throw err;
  }
}

export async function updateScaffold(
  id: string,
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
) {
  await requirePermission("scaffolds.update");
  const scope = await getDataScope();
  const scaffoldId = requiredId(id, "Andaime");
  const input = parseScaffoldInput(data);
  const oldScaffold = await prisma.scaffold.findUnique({
    where: { id: scaffoldId },
  });
  assertRecordInDataScope(scope, oldScaffold);

  const scaffold = await prisma.scaffold.update({
    where: { id: scaffoldId },
    data: input,
  });

  await createAuditLog({
    entityType: AuditEntityType.SCAFFOLD,
    entityId: scaffold.id,
    entityLabel: scaffold.code,
    action: AuditAction.UPDATE,
    description: `Dados do andaime ${scaffold.code} atualizados`,
    oldValue: oldScaffold
      ? {
          type: oldScaffold.type,
          location: oldScaffold.location,
          area: oldScaffold.area,
          height: oldScaffold.height,
          width: oldScaffold.width,
          length: oldScaffold.length,
          max_load: oldScaffold.max_load,
          responsible: oldScaffold.responsible,
          company: oldScaffold.company,
          notes: oldScaffold.notes,
          latitude: oldScaffold.latitude,
          longitude: oldScaffold.longitude,
          location_description: oldScaffold.location_description,
        }
      : undefined,
    newValue: input,
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
  });

  revalidatePath("/andaimes");
  revalidatePath("/dashboard");
  revalidatePath("/mapa");
  revalidatePath(`/andaimes/${scaffold.id}`);
  revalidatePath(`/andaimes/${scaffold.id}/editar`);
  return scaffold;
}

const STATUS_NOTIFICATION: Partial<
  Record<
    ScaffoldStatus,
    {
      type: NotificationType;
      severity: NotificationSeverity;
      label: string;
      channels: NotificationChannel[];
    }
  >
> = {
  liberado: {
    type: "SCAFFOLD_RELEASED",
    severity: "SUCCESS",
    label: "liberado",
    channels: ["INTERNAL"],
  },
  reprovado: {
    type: "SCAFFOLD_REJECTED",
    severity: "WARNING",
    label: "reprovado",
    channels: ["INTERNAL", "EMAIL"],
  },
  interditado: {
    type: "SCAFFOLD_INTERDICTED",
    severity: "CRITICAL",
    label: "interditado",
    channels: ["INTERNAL", "EMAIL"],
  },
  desmontado: {
    type: "SCAFFOLD_DISASSEMBLED",
    severity: "INFO",
    label: "desmontado",
    channels: ["INTERNAL"],
  },
};

// ── Atualizar status ──────────────────────────────────────────────────────────
export async function updateScaffoldStatus(id: string, status: ScaffoldStatus) {
  await requirePermission("scaffolds.update");
  const scope = await getDataScope();
  const scaffoldId = requiredId(id, "Andaime");
  const nextStatus = enumValue(status, SCAFFOLD_STATUSES, "Status do andaime");
  const oldScaffold = await prisma.scaffold.findUnique({ where: { id: scaffoldId } });
  assertRecordInDataScope(scope, oldScaffold);
  const scaffold = await prisma.scaffold.update({
    where: { id: scaffoldId },
    data: { status: nextStatus },
  });
  await createAuditLog({
    entityType: AuditEntityType.SCAFFOLD,
    entityId: scaffold.id,
    entityLabel: scaffold.code,
    action: AuditAction.STATUS_CHANGE,
    description: `Status do andaime ${scaffold.code} alterado de ${oldScaffold?.status ?? "-"} para ${scaffold.status}`,
    oldValue: { status: oldScaffold?.status ?? null },
    newValue: { status: scaffold.status },
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
  });
  const notification = STATUS_NOTIFICATION[nextStatus];
  if (notification) {
    await createNotification({
      companyId: scaffold.companyId,
      workspaceId: scaffold.workspaceId,
      type: notification.type,
      severity: notification.severity,
      title: `Andaime ${scaffold.code} ${notification.label}`,
      message: `O andaime ${scaffold.code} foi ${notification.label}.`,
      entityType: "SCAFFOLD",
      entityId: scaffold.id,
      channels: notification.channels,
      metadata: {
        entityLabel: scaffold.code,
        status: scaffold.status,
        area: scaffold.area,
      },
    });
  }
  return scaffold;
}

// ── Concluir montagem → PENDENTE_LIBERACAO ────────────────────────────────────
export async function completeAssembly(id: string) {
  await requirePermission("scaffolds.complete_assembly");
  const scope = await getDataScope();
  const scaffoldId = requiredId(id, "Andaime");
  const oldScaffold = await prisma.scaffold.findUnique({ where: { id: scaffoldId } });
  assertRecordInDataScope(scope, oldScaffold);
  const scaffold = await prisma.scaffold.update({
    where: { id: scaffoldId },
    data: {
      status: "pendente_liberacao",
      assembly_completed_at: new Date(),
    },
  });
  await createAuditLog({
    entityType: AuditEntityType.SCAFFOLD,
    entityId: scaffold.id,
    entityLabel: scaffold.code,
    action: AuditAction.COMPLETE,
    description: `Montagem do andaime ${scaffold.code} concluida`,
    oldValue: { status: oldScaffold?.status ?? null },
    newValue: {
      status: scaffold.status,
      assembly_completed_at: scaffold.assembly_completed_at?.toISOString(),
    },
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
  });
  await createNotification({
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
    type: "INSPECTION_PENDING",
    severity: "WARNING",
    title: `Inspecao pendente: ${scaffold.code}`,
    message: `O andaime ${scaffold.code} concluiu montagem e aguarda inspecao para liberacao.`,
    entityType: "SCAFFOLD",
    entityId: scaffold.id,
    channels: ["INTERNAL", "EMAIL"],
    metadata: {
      entityLabel: scaffold.code,
      status: scaffold.status,
      area: scaffold.area,
    },
  });
  return scaffold;
}

// ── Desmontar → DESMONTADO ────────────────────────────────────────────────────
const DISMANTLE_REASONS = new Set([
  "Finalizacao da atividade",
  "Encerramento de parada",
  "Solicitacao da operacao",
  "Substituicao do andaime",
  "Readequacao de projeto",
  "Condicao insegura",
  "Outros",
]);

export async function dismantleScaffold(
  id: string,
  input?: { reason?: string; reasonDescription?: string },
) {
  await requirePermission("scaffolds.dismantle");
  const scaffoldId = requiredId(id, "Andaime");
  const reason = optionalText(input?.reason, "Motivo da desmontagem", 80);
  const reasonDescription = optionalText(
    input?.reasonDescription,
    "Descricao do motivo",
    500,
  );
  if (!reason || !DISMANTLE_REASONS.has(reason)) {
    throw new Error("Motivo da desmontagem obrigatorio.");
  }
  if (reason === "Outros" && !reasonDescription) {
    throw new Error("Descricao do motivo obrigatoria.");
  }

  const scope = await getDataScope();
  const oldScaffold = await prisma.scaffold.findUnique({ where: { id: scaffoldId } });
  assertRecordInDataScope(scope, oldScaffold);
  const scaffold = await prisma.scaffold.update({
    where: { id: scaffoldId },
    data: {
      status: "desmontado",
      dismantled_at: new Date(),
    },
  });
  await createAuditLog({
    entityType: AuditEntityType.SCAFFOLD,
    entityId: scaffold.id,
    entityLabel: scaffold.code,
    action: AuditAction.STATUS_CHANGE,
    description: `Andaime ${scaffold.code} desmontado`,
    oldValue: { status: oldScaffold?.status ?? null },
    newValue: {
      status: scaffold.status,
      dismantled_at: scaffold.dismantled_at?.toISOString(),
      dismantleReason: reason,
      dismantleReasonDescription: reason === "Outros" ? reasonDescription : null,
    },
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
  });
  await createNotification({
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
    type: "SCAFFOLD_DISASSEMBLED",
    severity: "INFO",
    title: `Andaime ${scaffold.code} desmontado`,
    message: `O andaime ${scaffold.code} foi desmontado.`,
    entityType: "SCAFFOLD",
    entityId: scaffold.id,
    channels: ["INTERNAL"],
    metadata: {
      entityLabel: scaffold.code,
      status: scaffold.status,
      area: scaffold.area,
      reason,
    },
  });
  return scaffold;
}

// ── Deletar ───────────────────────────────────────────────────────────────────
export async function deleteScaffold(id: string) {
  await requireRole("SUPER_ADMIN");
  const scaffoldId = requiredId(id, "Andaime");
  const oldScaffold = await prisma.scaffold.findUnique({ where: { id: scaffoldId } });
  const scaffold = await prisma.scaffold.delete({ where: { id: scaffoldId } });
  await createAuditLog({
    entityType: AuditEntityType.SCAFFOLD,
    entityId: scaffold.id,
    entityLabel: scaffold.code,
    action: AuditAction.DELETE,
    description: `Andaime ${scaffold.code} excluido`,
    oldValue: oldScaffold
      ? {
          code: oldScaffold.code,
          status: oldScaffold.status,
          type: oldScaffold.type,
          location: oldScaffold.location,
          area: oldScaffold.area,
          company: oldScaffold.company,
        }
      : undefined,
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
  });
  return scaffold;
}
