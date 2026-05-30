"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  HardHat,
  ShieldOff,
  Wrench,
} from "lucide-react";
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
}

export function ScaffoldActionsBar({
  scaffoldId,
  scaffoldCode,
  status,
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

  /* ── DESMONTADO ── */
  if (status === "desmontado") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 border border-slate-300 text-slate-600">
        <HardHat className="w-4 h-4 shrink-0" />
        <p className="text-[11px] font-semibold uppercase tracking-wide">
          Andaime encerrado — este andaime foi desmontado e está fora de
          operação.
        </p>
      </div>
    );
  }

  /* ── INTERDITADO ── */
  if (status === "interditado") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 bg-red-100 border border-red-400 text-red-900">
          <ShieldOff className="w-4 h-4 shrink-0" />
          <p className="text-[11px] font-bold uppercase tracking-wide">
            ANDAIME INTERDITADO — uso proibido até nova inspeção com liberação.
          </p>
        </div>
        <ActionRow scaffoldId={scaffoldId} scaffoldCode={scaffoldCode} />
      </div>
    );
  }

  /* ── REPROVADO ── */
  if (status === "reprovado") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-300 text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-[11px] font-semibold uppercase tracking-wide">
            Andaime reprovado — corrija as não-conformidades e realize nova
            inspeção.
          </p>
        </div>
        <ActionRow scaffoldId={scaffoldId} scaffoldCode={scaffoldCode} />
      </div>
    );
  }

  /* ── EM MONTAGEM ── */
  if (status === "em_montagem") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleCompleteAssembly}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[10px] font-bold uppercase tracking-widest h-8 px-4"
        >
          <CheckCircle2 className="w-4 h-4" />
          {isPending ? "Aguarde…" : "Concluir Montagem"}
        </button>
        <button
          onClick={handleDismantle}
          disabled={isPending}
          className="inline-flex items-center gap-2 border border-border hover:bg-muted text-foreground text-[10px] font-bold uppercase tracking-widest h-8 px-4"
        >
          <Wrench className="w-4 h-4" />
          Registrar Desmontagem
        </button>
      </div>
    );
  }

  /* ── PENDENTE LIBERAÇÃO ── */
  if (status === "pendente_liberacao") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-300 text-amber-800 flex-1 min-w-0">
          <ClipboardCheck className="w-4 h-4 shrink-0" />
          <p className="text-[11px] font-semibold uppercase tracking-wide">
            Montagem concluída — aguardando inspeção de liberação.
          </p>
        </div>
        <ActionRow
          scaffoldId={scaffoldId}
          scaffoldCode={scaffoldCode}
          showDismantle
          onDismantle={handleDismantle}
          isPending={isPending}
        />
      </div>
    );
  }

  /* ── LIBERADO / VENCIDO / demais ── */
  return (
    <ActionRow
      scaffoldId={scaffoldId}
      scaffoldCode={scaffoldCode}
      showDismantle
      onDismantle={handleDismantle}
      isPending={isPending}
    />
  );
}

/* ── helper: linha de ação com botão Nova Inspeção (e opcionalmente Desmontar) ── */
function ActionRow({
  scaffoldId,
  scaffoldCode,
  showDismantle = false,
  onDismantle,
  isPending = false,
}: {
  scaffoldId: string;
  scaffoldCode: string;
  showDismantle?: boolean;
  onDismantle?: () => void;
  isPending?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/inspecoes/nova?scaffold_id=${scaffoldId}&scaffold_code=${scaffoldCode}`}
        className="inline-flex items-center gap-2 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white text-[10px] font-bold uppercase tracking-widest h-8 px-4"
      >
        <ClipboardCheck className="w-4 h-4" />
        Nova Inspeção
      </Link>
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
