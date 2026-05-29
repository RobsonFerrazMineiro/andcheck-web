import { getScaffolds } from "@/lib/actions/scaffold-actions";
import { AndaimesClient } from "./andaimes-client";

export default async function AndaimesPage() {
  const raw = await getScaffolds();
  const scaffolds = raw.map((s) => ({
    id: s.id,
    code: s.code,
    type: s.type as string,
    status: s.status as string,
    location: s.location,
    area: s.area,
    height: s.height,
    responsible: s.responsible,
    validity_date: s.validity_date ? s.validity_date.toISOString() : null,
    _count: s._count,
  }));
  return <AndaimesClient initialData={scaffolds} />;
}
