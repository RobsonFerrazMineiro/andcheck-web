import { getInspections } from "@/lib/actions/inspection-actions";
import { canCurrentUser } from "@/lib/authz";
import { InspecoesClient } from "./inspecoes-client";

export default async function InspecoesPage() {
  const [raw, canCreateInspection] = await Promise.all([
    getInspections(),
    canCurrentUser("inspections.create"),
  ]);
  const inspections = raw.map((i) => ({
    id: i.id,
    scaffold_id: i.scaffold_id,
    scaffold_code: i.scaffold_code,
    date: i.date.toISOString(),
    inspector_name: i.inspector_name,
    result: i.result as string,
    validity_days: i.validity_days,
    notes: i.notes,
  }));
  return (
    <InspecoesClient
      initialData={inspections}
      canCreateInspection={canCreateInspection}
    />
  );
}
