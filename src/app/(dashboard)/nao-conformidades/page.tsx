import { getNonConformities } from "@/lib/actions/non-conformity-actions";
import {
  NaoConformidadesClient,
  type NonConformityRow,
} from "./nao-conformidades-client";

type NonConformityRecord = Omit<
  NonConformityRow,
  "dueDate" | "closedAt" | "createdAt" | "originInspection"
> & {
  dueDate: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  tenantCompany: { name: string };
  originInspection: {
    id: string;
    date: Date;
    result: string;
    inspector_name: string;
  };
};

export default async function NaoConformidadesPage() {
  const raw = (await getNonConformities()) as NonConformityRecord[];

  const rows: NonConformityRow[] = raw.map((nc) => ({
    id: nc.id,
    code: nc.code,
    title: nc.title,
    description: nc.description,
    classification: nc.classification,
    status: nc.status,
    companyId: nc.tenantCompany.name,
    dueDate: nc.dueDate ? nc.dueDate.toISOString() : null,
    closedAt: nc.closedAt ? nc.closedAt.toISOString() : null,
    createdAt: nc.createdAt.toISOString(),
    scaffold: nc.scaffold,
    originInspection: {
      id: nc.originInspection.id,
      date: nc.originInspection.date.toISOString(),
      result: nc.originInspection.result,
      inspector_name: nc.originInspection.inspector_name,
    },
    responsibleUser: nc.responsibleUser,
    _count: nc._count,
  }));

  return <NaoConformidadesClient initialData={rows} />;
}
