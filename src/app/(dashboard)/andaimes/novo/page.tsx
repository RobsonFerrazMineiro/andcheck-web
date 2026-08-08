import { redirect } from "next/navigation";

import { canCurrentUser } from "@/lib/authz";
import { getNewScaffoldFormContext } from "@/lib/actions/scaffold-actions";
import NovoAndaimeForm from "./novo-andaime-form";

export default async function NovoAndaimePage() {
  const canCreateScaffold = await canCurrentUser("scaffolds.create");

  if (!canCreateScaffold) {
    redirect("/andaimes");
  }

  const formContext = await getNewScaffoldFormContext();

  return <NovoAndaimeForm formContext={formContext} />;
}
