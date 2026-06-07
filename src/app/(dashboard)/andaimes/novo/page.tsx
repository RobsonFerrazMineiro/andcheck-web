import { redirect } from "next/navigation";

import { canCurrentUser } from "@/lib/authz";
import NovoAndaimeForm from "./novo-andaime-form";

export default async function NovoAndaimePage() {
  const canCreateScaffold = await canCurrentUser("scaffolds.create");

  if (!canCreateScaffold) {
    redirect("/andaimes");
  }

  return <NovoAndaimeForm />;
}
