"use client";

import { CheckCircle2, ClipboardCheck, HardHat, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  completeAssembly,
  dismantleScaffold,
} from "@/lib/actions/scaffold-actions";

const DISMANTLE_REASONS = [
  "Finalizacao da atividade",
  "Encerramento de parada",
  "Solicitacao da operacao",
  "Substituicao do andaime",
  "Readequacao de projeto",
  "Condicao insegura",
  "Outros",
];

interface Props {
  scaffoldId: string;
  scaffoldCode: string;
  status: string;
  canCreateInspection: boolean;
  hasActiveNonConformity: boolean;
  canCompleteAssembly: boolean;
  canDismantle: boolean;
}

export function ScaffoldActionsBar({
  scaffoldId,
  scaffoldCode,
  status,
  canCreateInspection,
  hasActiveNonConformity,
  canCompleteAssembly,
  canDismantle,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dismantleOpen, setDismantleOpen] = useState(false);
  const [dismantleReason, setDismantleReason] = useState("");
  const [dismantleReasonDescription, setDismantleReasonDescription] =
    useState("");
  const [dismantleError, setDismantleError] = useState<string | null>(null);

  function handleCompleteAssembly() {
    startTransition(async () => {
      await completeAssembly(scaffoldId);
      router.refresh();
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
      setDismantleError("Informe a descricao do motivo.");
      return;
    }

    startTransition(async () => {
      try {
        await dismantleScaffold(scaffoldId, {
          reason: dismantleReason,
          reasonDescription: dismantleReasonDescription,
        });
        setDismantleOpen(false);
        router.refresh();
      } catch (error) {
        setDismantleError(
          error instanceof Error ? error.message : "Nao foi possivel desmontar.",
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
          operacao.
        </p>
      </div>
    );
  }

  if (status === "em_montagem") {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          {canCompleteAssembly && (
            <button
              onClick={handleCompleteAssembly}
              disabled={isPending}
              className="inline-flex h-8 items-center gap-2 bg-blue-600 px-4 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isPending ? "Aguarde..." : "Concluir Montagem"}
            </button>
          )}
          {canDismantle && (
            <button
              onClick={handleDismantle}
              disabled={isPending}
              className="inline-flex h-8 items-center gap-2 border border-border px-4 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted"
            >
              <Wrench className="w-4 h-4" />
              Registrar Desmontagem
            </button>
          )}
        </div>
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
  hasActiveNonConformity,
  showDismantle = false,
  onDismantle,
  isPending = false,
}: {
  scaffoldId: string;
  scaffoldCode: string;
  canCreateInspection: boolean;
  hasActiveNonConformity: boolean;
  showDismantle?: boolean;
  onDismantle?: () => void;
  isPending?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canCreateInspection && !hasActiveNonConformity && (
        <Link
          href={`/inspecoes/nova?scaffold_id=${scaffoldId}&scaffold_code=${scaffoldCode}`}
          className="inline-flex items-center gap-2 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white text-[10px] font-bold uppercase tracking-widest h-8 px-4"
        >
          <ClipboardCheck className="w-4 h-4" />
          Nova Inspecao
        </Link>
      )}
      {showDismantle && (
        <button
          onClick={onDismantle}
          disabled={isPending}
          className="inline-flex items-center gap-2 border border-border hover:bg-muted text-foreground text-[10px] font-bold uppercase tracking-widest h-8 px-4"
        >
          <Wrench className="w-4 h-4" />
          Registrar Desmontagem
        </button>
      )}
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md border border-border bg-card shadow-xl">
        <div className="border-b border-border bg-primary px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-primary-foreground/50">
            Registrar Desmontagem
          </p>
          <h2 className="mt-1 font-mono text-[15px] font-bold text-primary-foreground">
            {scaffoldCode}
          </h2>
        </div>
        <div className="space-y-4 p-4">
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
                Descricao do motivo *
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
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-8 border border-border px-4 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="h-8 bg-accent px-4 text-[10px] font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-50"
          >
            {isPending ? "Aguarde..." : "Confirmar Desmontagem"}
          </button>
        </div>
      </div>
    </div>
  );
}
