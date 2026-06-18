import { getDocumentManagementData } from "@/lib/actions/document-actions";
import { DocumentosClient } from "./documentos-client";

export default async function DocumentosPage() {
  const data = await getDocumentManagementData();
  return <DocumentosClient initialData={data} />;
}
