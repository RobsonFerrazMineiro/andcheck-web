"use server";

import { requireAnyPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function getNonConformities() {
  await requireAnyPermission([
    "non_conformities.view",
    "non_conformities.create",
    "non_conformities.update",
    "non_conformities.close",
    "non_conformities.add_evidence",
  ]);

  return prisma.nonConformity.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      scaffold: {
        select: {
          id: true,
          code: true,
          area: true,
          location: true,
          company: true,
        },
      },
      originInspection: {
        select: {
          id: true,
          date: true,
          result: true,
          inspector_name: true,
        },
      },
      responsibleUser: {
        select: {
          id: true,
          name: true,
          company: true,
        },
      },
      _count: {
        select: {
          checklistItems: true,
          evidences: true,
          history: true,
        },
      },
    },
  });
}

export async function getNonConformityById(id: string) {
  await requireAnyPermission([
    "non_conformities.view",
    "non_conformities.create",
    "non_conformities.update",
    "non_conformities.close",
    "non_conformities.add_evidence",
  ]);

  return prisma.nonConformity.findUnique({
    where: { id },
    include: {
      scaffold: {
        select: {
          id: true,
          code: true,
          area: true,
          location: true,
          company: true,
          responsible: true,
        },
      },
      originInspection: {
        select: {
          id: true,
          date: true,
          result: true,
          inspector_name: true,
          scaffold_code: true,
        },
      },
      responsibleUser: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          department: true,
          position: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      checklistItems: {
        include: {
          checklistEntry: true,
        },
        orderBy: { createdAt: "asc" },
      },
      evidences: {
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      history: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
