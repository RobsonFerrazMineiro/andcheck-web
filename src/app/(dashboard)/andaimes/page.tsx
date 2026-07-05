import { getScaffolds } from "@/lib/actions/scaffold-actions";
import { canCurrentUser } from "@/lib/authz";
import { AndaimesClient, type ScaffoldRow } from "./andaimes-client";

type ScaffoldRecord = {
  id: string;
  code: string;
  type: string;
  status: string;
  location: string;
  area: string;
  height: number;
  responsible: string;
  validity_date: Date | null;
  _count: { inspections: number };
};

export default async function AndaimesPage() {
  const [raw, canCreateScaffold] = await Promise.all([
    getScaffolds(),
    canCurrentUser("scaffolds.create"),
  ]);
  const scaffolds: ScaffoldRow[] = (raw as ScaffoldRecord[]).map((s) => ({
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
  return (
    <AndaimesClient
      initialData={scaffolds}
      canCreateScaffold={canCreateScaffold}
    />
  );
}
