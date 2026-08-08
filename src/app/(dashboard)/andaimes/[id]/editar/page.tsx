import { notFound, redirect } from "next/navigation";

import { getScaffoldById } from "@/lib/actions/scaffold-actions";
import { canCurrentUser } from "@/lib/authz";
import NovoAndaimeForm from "../../novo/novo-andaime-form";

type Props = { params: Promise<{ id: string }> };

type EditableScaffoldRecord = {
  id: string;
  code: string;
  type: string;
  status: string;
  location: string;
  area: string;
  areaId?: string | null;
  height: number;
  width: number | null;
  length: number | null;
  max_load: number | null;
  responsible: string;
  responsibleUserId?: string | null;
  company: string | null;
  mountingCompanyId?: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default async function EditarAndaimePage({ params }: Props) {
  const canUpdateScaffold = await canCurrentUser("scaffolds.update");
  if (!canUpdateScaffold) redirect("/andaimes");

  const { id } = await params;
  const scaffoldResult = await getScaffoldById(id);
  if (!scaffoldResult) notFound();

  const scaffold = scaffoldResult as EditableScaffoldRecord;
  if (scaffold.status === "desmontado") {
    redirect(`/acervo/${encodeURIComponent(scaffold.code)}`);
  }

  return <NovoAndaimeForm mode="edit" scaffold={scaffold} />;
}
