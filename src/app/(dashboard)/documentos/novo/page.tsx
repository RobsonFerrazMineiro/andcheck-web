import { getDocumentFormOptions } from "@/lib/actions/document-actions";
import { NovoDocumentoForm } from "./novo-documento-form";

export default async function NovoDocumentoPage() {
  const options = await getDocumentFormOptions();
  return <NovoDocumentoForm options={options} />;
}
