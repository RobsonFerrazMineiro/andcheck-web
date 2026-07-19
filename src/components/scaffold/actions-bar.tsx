"use client";

import {
  CheckCircle2,
  ClipboardCheck,
  HardHat,
  Loader2,
  Pencil,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  ActionMenu,
  actionMenuItemClassName,
} from "@/components/shared/action-menu";
import {
  completeAssembly,
  dismantleScaffold,
} from "@/lib/actions/scaffold-actions";
import {
  canNavigateAfterOfflineWrite,
  checkServerConnectivity,
} from "@/lib/offline/connectivity";
import { localDb } from "@/lib/offline/local-db";
import { createOfflineId } from "@/lib/offline/types";

const DISMANTLE_REASONS = [
  "Finalizacao da atividade",
  "Encerramento de parada",
  "Solicitação da operação",
  "Substituicao do andaime",
  "Readequacao de projeto",
  "Condicao insegura",
  "Outros",
];

export interface ScaffoldActionsBarProps {
  scaffoldId: string;
  scaffoldCode: string;
  status: string;
  canCreateInspection: boolean;
  hasActiveNonConformity: boolean;
  canCompleteAssembly: boolean;
  canDismantle: boolean;
  canUpdateScaffold?: boolean;
}

export function ScaffoldActionsBar({
  scaffoldId,
  scaffoldCode,
  status,
  canCreateInspection,
  hasActiveNonConformity,
  canCompleteAssembly,
  canDismantle,
  canUpdateScaffold = false,
}: ScaffoldActionsBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [dismantleOpen, setDismantleOpen] = useState(false);
  const [dismantleReason, setDismantleReason] = useState("");
  const [dismantleReasonDescription, setDismantleReasonDescription] =
    useState("");
  const [dismantleError, setDismantleError] = useState<string | null>(null);

  async function updateLocalScaffoldStatus(
    nextStatus: string,
    patch: Record<string, unknown> = {},
  ) {
    const current = await localDb.scaffolds.get(scaffoldId);
    if (!current) return;

    await localDb.scaffolds.put({
      ...current,
      ...patch,
      status: nextStatus,
      syncStatus: "pending",
    });
  }

  function handleCompleteAssembly() {
    startTransition(async () => {
      const toastId = toast.loading("Concluindo montagem...");
      try {
        if ((await checkServerConnectivity()) === "offline") {
          const completedAt = new Date().toISOString();
          await updateLocalScaffoldStatus("pendente_liberacao", {
            assembly_completed_at: completedAt,
          });
          await localDb.syncQueue.upsertLatest({
            id: createOfflineId("scaffold_complete_assembly"),
            action: "scaffold.assembly.complete",
            entityType: "scaffold",
            entityId: scaffoldId,
            payload: { id: scaffoldId },
          });
          toast.success("Montagem salva offline para sincronização.", {
            id: toastId,
          });
          if (canNavigateAfterOfflineWrite()) {
            router.push("/sincronizacao");
          }
          return;
        }

        await completeAssembly(scaffoldId);
        toast.success("Montagem concluída. Andaime pendente de inspeção.", {
          id: toastId,
        });
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível concluir a montagem.",
          { id: toastId },
        );
      }
    });
  }

  function handleDismantle() {
    setDismantleOpen(true);
    setDismantleError(null);
  }

  function submitDismantle() {
    if (!dismantleReason) {
      setDismantleError("Selecione o motivo da desmontagem.");
      return;
    }
    if (dismantleReason === "Outros" && !dismantleReasonDescription.trim()) {
      setDismantleError("Informe a descrição do motivo.");
      return;
    }

    startTransition(async () => {
      const toastId = toast.loading("Registrando desmontagem...");
      try {
        if ((await checkServerConnectivity()) === "offline") {
          const dismantledAt = new Date().toISOString();
          await updateLocalScaffoldStatus("desmontado", {
            dismantled_at: dismantledAt,
          });
          await localDb.syncQueue.upsertLatest({
            id: createOfflineId("scaffold_dismantle"),
            action: "scaffold.dismantle",
            entityType: "scaffold",
            entityId: scaffoldId,
            payload: {
              id: scaffoldId,
              reason: dismantleReason,
              reasonDescription: dismantleReasonDescription.trim() || undefined,
            },
          });
          setDismantleOpen(false);
          toast.success("Desmontagem salva offline para sincronização.", {
            id: toastId,
          });
          if (canNavigateAfterOfflineWrite()) {
            router.push("/sincronizacao");
          }
          return;
        }

        await dismantleScaffold(scaffoldId, {
          reason: dismantleReason,
          reasonDescription: dismantleReasonDescription,
        });
        setDismantleOpen(false);
        toast.success("Desmontagem registrada.", { id: toastId });
        router.refresh();
      } catch (error) {
        toast.error("Não foi possível registrar a desmontagem.", {
          id: toastId,
        });
        setDismantleError(
          error instanceof Error ? error.message : "Não foi possível desmontar.",
        );
      }
    });
  }

  if (status === "desmontado") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 border border-slate-300 text-slate-600">
        <HardHat className="w-4 h-4 shrink-0" />
        <p className="text-[11px] font-semibold uppercase tracking-wide">
          Andaime encerrado - este andaime foi desmontado e esta fora de
          operação.
        </p>
      </div>
    );
  }

  if (status === "em_montagem") {
    const hasAssemblyActions =
      canUpdateScaffold || canCompleteAssembly || canDismantle;

    return (
      <>
        <ConfirmDialog
          open={completeOpen}
          title="Concluir montagem"
          description="O andaime será movido para pendente de inspeção."
          details={
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{scaffoldCode}</p>
              <p className="text-xs text-muted-foreground">
                Após confirmar, será necessário realizar uma inspeção para liberar o andaime.
              </p>
            </div>
          }
          confirmLabel="Concluir montagem"
          pending={isPending}
          onCancel={() => setCompleteOpen(false)}
          onConfirm={() => {
            setCompleteOpen(false);
            handleCompleteAssembly();
          }}
        />
        {hasAssemblyActions && (
          <ActionMenu>
            {canUpdateScaffold && (
              <Link
                href={`/andaimes/${scaffoldId}/editar`}
                className={actionMenuItemClassName}
              >
                <Pencil className="w-4 h-4" />
                Editar
              </Link>
            )}
            {canCompleteAssembly && (
              <button
                onClick={() => setCompleteOpen(true)}
                disabled={isPending}
                className={actionMenuItemClassName}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {isPending ? "Aguarde..." : "Concluir Montagem"}
              </button>
            )}
            {canDismantle && (
              <button
                onClick={handleDismantle}
                disabled={isPending}
                className={actionMenuItemClassName}
              >
                <Wrench className="w-4 h-4" />
                Registrar Desmontagem
              </button>
            )}
          </ActionMenu>
        )}
        {dismantleOpen && (
          <DismantleDialog
            scaffoldCode={scaffoldCode}
            reason={dismantleReason}
            reasonDescription={dismantleReasonDescription}
            error={dismantleError}
            isPending={isPending}
            onReasonChange={setDismantleReason}
            onReasonDescriptionChange={setDismantleReasonDescription}
            onCancel={() => setDismantleOpen(false)}
            onConfirm={submitDismantle}
          />
        )}
      </>
    );
  }

  return (
    <>
      <ActionRow
        scaffoldId={scaffoldId}
        scaffoldCode={scaffoldCode}
        canUpdateScaffold={canUpdateScaffold}
        canCreateInspection={canCreateInspection}
        hasActiveNonConformity={hasActiveNonConformity}
        showDismantle={canDismantle && status !== "interditado" && status !== "reprovado"}
        onDismantle={handleDismantle}
        isPending={isPending}
      />
      {dismantleOpen && (
        <DismantleDialog
          scaffoldCode={scaffoldCode}
          reason={dismantleReason}
          reasonDescription={dismantleReasonDescription}
          error={dismantleError}
          isPending={isPending}
          onReasonChange={setDismantleReason}
          onReasonDescriptionChange={setDismantleReasonDescription}
          onCancel={() => setDismantleOpen(false)}
          onConfirm={submitDismantle}
        />
      )}
    </>
  );
}

function ActionRow({
  scaffoldId,
  scaffoldCode,
  canCreateInspection,
  canUpdateScaffold,
  hasActiveNonConformity,
  showDismantle = false,
  onDismantle,
  isPending = false,
}: {
  scaffoldId: string;
  scaffoldCode: string;
  canCreateInspection: boolean;
  canUpdateScaffold: boolean;
  hasActiveNonConformity: boolean;
  showDismantle?: boolean;
  onDismantle?: () => void;
  isPending?: boolean;
}) {
  const hasActions =
    canUpdateScaffold ||
    (canCreateInspection && !hasActiveNonConformity) ||
    showDismantle;

  if (!hasActions) return null;

  return (
    <ActionMenu>
      {canUpdateScaffold && (
        <Link
          href={`/andaimes/${scaffoldId}/editar`}
          className={actionMenuItemClassName}
        >
          <Pencil className="w-4 h-4" />
          Editar
        </Link>
      )}
      {canCreateInspection && !hasActiveNonConformity && (
        <Link
          href={`/inspecoes/nova?scaffold_id=${scaffoldId}&scaffold_code=${scaffoldCode}`}
          className={actionMenuItemClassName}
        >
          <ClipboardCheck className="w-4 h-4" />
          Nova Inspeção
        </Link>
      )}
      {showDismantle && (
        <button
          onClick={onDismantle}
          disabled={isPending}
          className={actionMenuItemClassName}
        >
          <Wrench className="w-4 h-4" />
          Registrar Desmontagem
        </button>
      )}
    </ActionMenu>
  );
}

function DismantleDialog({
  scaffoldCode,
  reason,
  reasonDescription,
  error,
  isPending,
  onReasonChange,
  onReasonDescriptionChange,
  onCancel,
  onConfirm,
}: {
  scaffoldCode: string;
  reason: string;
  reasonDescription: string;
  error: string | null;
  isPending: boolean;
  onReasonChange: (value: string) => void;
  onReasonDescriptionChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open
      title="Registrar desmontagem"
      description="Confirme a desmontagem do andaime e informe o motivo operacional."
      details={
        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Andaime
            </p>
            <p className="mt-1 font-mono text-sm font-bold text-foreground">
              {scaffoldCode}
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Motivo da desmontagem *
            </label>
            <select
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              className="h-9 w-full border border-border bg-background px-3 text-[11px] text-foreground outline-none"
            >
              <option value="">Selecionar motivo</option>
              {DISMANTLE_REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          {reason === "Outros" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Descrição do motivo *
              </label>
              <textarea
                value={reasonDescription}
                onChange={(event) =>
                  onReasonDescriptionChange(event.target.value)
                }
                className="min-h-20 w-full resize-none border border-border bg-background px-3 py-2 text-[11px] text-foreground outline-none"
                placeholder="Descreva o motivo da desmontagem"
              />
            </div>
          )}
          {error && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>
      }
      confirmLabel="Confirmar desmontagem"
      destructive
      pending={isPending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
