"use client";

import { CheckCircle2, ClipboardCheck, HardHat, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  completeAssembly,
  dismantleScaffold,
} from "@/lib/actions/scaffold-actions";

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

  function handleCompleteAssembly() {
    startTransition(async () => {
      await completeAssembly(scaffoldId);
      router.refresh();
    });
  }

  function handleDismantle() {
    if (!confirm(`Confirma a desmontagem do andaime ${scaffoldCode}?`)) return;
    startTransition(async () => {
      await dismantleScaffold(scaffoldId);
      router.refresh();
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
      <div className="flex flex-wrap items-center gap-2">
        {canCompleteAssembly && (
          <button
            onClick={handleCompleteAssembly}
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[10px] font-bold uppercase tracking-widest h-8 px-4"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isPending ? "Aguarde..." : "Concluir Montagem"}
          </button>
        )}
        {canDismantle && (
          <button
            onClick={handleDismantle}
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

  return (
    <ActionRow
      scaffoldId={scaffoldId}
      scaffoldCode={scaffoldCode}
      canCreateInspection={canCreateInspection}
      hasActiveNonConformity={hasActiveNonConformity}
      showDismantle={canDismantle && status !== "interditado" && status !== "reprovado"}
      onDismantle={handleDismantle}
      isPending={isPending}
    />
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
