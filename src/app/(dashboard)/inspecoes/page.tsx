import { getInspections } from "@/lib/actions/inspection-actions";
import { canCurrentUser } from "@/lib/authz";
import { InspecoesClient, type InspectionRow } from "./inspecoes-client";

type InspectionRecord = {
  id: string;
  scaffold_id: string;
  scaffold_code: string;
  scaffold: { location: string | null } | null;
  date: Date;
  inspector_name: string;
  result: string;
  validity_days: number;
  notes: string | null;
};

export default async function InspecoesPage() {
  const [raw, canCreateInspection] = await Promise.all([
    getInspections(),
    canCurrentUser("inspections.create"),
  ]);
  const inspections: InspectionRow[] = (raw as InspectionRecord[]).map((i) => ({
    id: i.id,
    scaffold_id: i.scaffold_id,
    scaffold_code: i.scaffold_code,
    scaffold_location: i.scaffold?.location ?? null,
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
