import { AcervoClient, type ArchiveScaffoldRow } from "./acervo-client";
import { getScaffoldArchive } from "@/lib/actions/scaffold-actions";

export default async function AcervoPage() {
  const scaffolds = await getScaffoldArchive();

  const rows: ArchiveScaffoldRow[] = scaffolds.map((scaffold) => ({
    id: scaffold.id,
    code: scaffold.code,
    tag: scaffold.tag,
    area: scaffold.area,
    companyName: scaffold.tenantCompany?.name ?? scaffold.company ?? "",
    workspaceName: scaffold.workspace?.name ?? "",
    dismantledAt: scaffold.dismantled_at?.toISOString() ?? null,
    documentsCount: scaffold._count.documents,
    nonConformitiesCount: scaffold._count.nonConformities,
  }));

  return <AcervoClient initialData={rows} />;
}
