"use client";

import { Button } from "@/components/ui/button";
import { setWorkspaceActive } from "@/lib/actions/workspace-actions";
import { Loader2, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export function WorkspaceStatusButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            await setWorkspaceActive(id, !active);
            toast.success(`Workspace ${active ? "desativado" : "ativado"}.`);
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Nao foi possivel alterar o status.");
          }
        });
      }}
    >
      {isPending ? <Loader2 className="animate-spin" /> : <Power />}
      {active ? "Desativar" : "Ativar"}
    </Button>
  );
}
