import { Suspense } from "react";

import { getScaffolds } from "@/lib/actions/scaffold-actions";
import { NovaInspecaoForm } from "./nova-inspecao-form";

export default async function NovaInspecaoPage() {
  const raw = await getScaffolds();
  const scaffolds = raw.map((s) => ({
    id: s.id,
    code: s.code,
    location: s.location,
    area: s.area,
  }));
  return (
    <Suspense>
      <NovaInspecaoForm scaffolds={scaffolds} />
    </Suspense>
  );
}
