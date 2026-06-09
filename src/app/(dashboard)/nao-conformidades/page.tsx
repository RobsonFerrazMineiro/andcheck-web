import { getNonConformities } from "@/lib/actions/non-conformity-actions";
import { NaoConformidadesClient } from "./nao-conformidades-client";

export default async function NaoConformidadesPage() {
  const raw = await getNonConformities();

  const rows = raw.map((nc) => ({
    id: nc.id,
    code: nc.code,
    title: nc.title,
    description: nc.description,
    classification: nc.classification,
    status: nc.status,
    companyId: nc.companyId,
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
