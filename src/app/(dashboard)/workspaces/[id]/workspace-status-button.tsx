"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { setWorkspaceActive } from "@/lib/actions/workspace-actions";
import { Loader2, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function WorkspaceStatusButton({
  id,
  active,
  className,
}: {
  id: string;
  active: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function toggleStatus() {
    startTransition(async () => {
      try {
        await setWorkspaceActive(id, !active);
        toast.success(`Workspace ${active ? "desativado" : "ativado"}.`);
        setConfirmOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível alterar o status.",
        );
      }
    });
  }

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title={active ? "Desativar workspace" : "Ativar workspace"}
        description={
          active
            ? "O workspace será desativado e deixará de aparecer como ativo nas operações."
            : "O workspace será reativado para uso operacional."
        }
        confirmLabel={active ? "Desativar workspace" : "Ativar workspace"}
        destructive={active}
        pending={isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={toggleStatus}
      />
      <Button
        variant={className ? "ghost" : "outline"}
        className={className}
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation();
          setConfirmOpen(true);
        }}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Power />}
        {active ? "Desativar" : "Ativar"}
      </Button>
    </>
  );
}
