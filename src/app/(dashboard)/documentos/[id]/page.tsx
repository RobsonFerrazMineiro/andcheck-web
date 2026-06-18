import { getDocumentDetail } from "@/lib/actions/document-actions";
import { notFound } from "next/navigation";
import { DocumentoDetalheClient } from "./documento-detalhe-client";

export default async function DocumentoDetalhePage(props: PageProps<"/documentos/[id]">) {
  const { id } = await props.params;
  const data = await getDocumentDetail(id);
  if (!data) notFound();

  return <DocumentoDetalheClient data={data} />;
}
