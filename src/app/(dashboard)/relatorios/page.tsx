import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Construction,
  Download,
  FileBarChart2,
  FileText,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { getInspections } from "@/lib/actions/inspection-actions";
import { getScaffolds } from "@/lib/actions/scaffold-actions";

export default async function RelatoriosPage() {
  const [inspections, scaffolds] = await Promise.all([getInspections(), getScaffolds()]);

  const aprovados        = inspections.filter((i) => i.result === "aprovado").length;
  const comRessalvas     = inspections.filter((i) => i.result === "aprovado_com_ressalvas").length;
  const reprovados       = inspections.filter((i) => i.result === "reprovado").length;
  const liberadosAtivos  = scaffolds.filter((s) => s.status === "liberado").length;
  const vencidos         = scaffolds.filter((s) => s.status === "vencido").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            AndCheck EHS · Documentação Controlada
          </p>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
            Relatórios & Exportações
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {inspections.length} inspeções registradas · Exportação PDF disponível em breve
          </p>
        </div>
      </div>

      {/* Resumo KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Insp. Aprovadas",   value: aprovados,       color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Com Ressalvas",      value: comRessalvas,    color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" },
          { label: "Reprovadas",         value: reprovados,      color: "text-red-600",     bg: "bg-red-50 border-red-200" },
          { label: "Andaimes Liberados", value: liberadosAtivos, color: "text-blue-600",    bg: "bg-blue-50 border-blue-200" },
          { label: "Vencidos",           value: vencidos,        color: "text-red-700",     bg: "bg-red-50/60 border-red-300" },
        ].map((k) => (
          <div key={k.label} className={"border p-3 text-center " + k.bg}>
            <p className={"text-[24px] font-black font-mono " + k.color}>{k.value}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground leading-tight mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Cards de tipos de relatório */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: FileBarChart2,
            title: "Relatório Gerencial",
            desc: "Resumo executivo de KPIs, tendências e conformidade global da instalação.",
            badge: "Em breve",
          },
          {
            icon: FileText,
            title: "Relatório por Andaime",
            desc: "Histórico completo por ativo: inspeções, validades, responsáveis e ações.",
            badge: "Em breve",
          },
          {
            icon: AlertTriangle,
            title: "Relatório de Não Conformidades",
            desc: "Listagem de todos os itens reprovados e pendentes de regularização.",
            badge: "Em breve",
          },
        ].map((r) => (
          <div key={r.title} className="bg-card border border-border p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 bg-primary/8 flex items-center justify-center">
                <r.icon className="w-4.5 h-4.5 text-primary/60" />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest bg-muted text-muted-foreground px-2 py-0.5">
                {r.badge}
              </span>
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wide">{r.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{r.desc}</p>
            </div>
            <button
              disabled
              className="w-full flex items-center justify-center gap-1.5 h-8 text-[10px] font-bold uppercase tracking-widest border border-border text-muted-foreground/40 cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar PDF
            </button>
          </div>
        ))}
      </div>

      {/* Tabela histórico completo */}
      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Histórico Completo de Inspeções
          </p>
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            {inspections.length} registros
          </p>
        </div>

        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2.5 bg-primary">
          {["Nº Doc.", "Andaime", "Data", "Inspetor", "Validade", "Resultado", ""].map((h, i) => (
            <p key={i} className={"text-[9px] font-bold uppercase tracking-widest text-primary-foreground/60 " +
              (i === 0 ? "col-span-2" : i === 1 ? "col-span-2" : i === 2 ? "col-span-2" :
               i === 3 ? "col-span-2" : i === 4 ? "col-span-1" : i === 5 ? "col-span-2" : "col-span-1")}
            >{h}</p>
          ))}
        </div>

        <div className="divide-y divide-border">
          {inspections.map((insp, idx) => {
            const docNum = "AND-" + insp.scaffold_code + "-" + format(insp.date, "yyyyMMdd");
            const resultIcon = insp.result === "aprovado"
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              : insp.result === "reprovado"
              ? <XCircle className="w-3.5 h-3.5 text-red-600" />
              : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
            return (
              <div key={insp.id} className={"flex md:grid md:grid-cols-12 md:gap-4 items-center px-4 py-3 " + (idx % 2 === 1 ? "bg-muted/20" : "bg-card")}>
                <p className="md:col-span-2 font-mono text-[10px] font-bold text-foreground truncate">{docNum}</p>
                <p className="md:col-span-2 text-[11px] font-mono font-bold text-foreground hidden md:block">{insp.scaffold_code}</p>
                <p className="md:col-span-2 text-[11px] text-muted-foreground font-mono hidden md:block">
                  {format(insp.date, "dd/MM/yyyy")}
                </p>
                <p className="md:col-span-2 text-[11px] text-muted-foreground truncate hidden md:block">{insp.inspector_name}</p>
                <p className="md:col-span-1 text-[11px] text-muted-foreground hidden md:block">
                  {insp.validity_days > 0 ? insp.validity_days + "d" : "—"}
                </p>
                <div className="md:col-span-2 hidden md:flex items-center">
                  <StatusBadge status={insp.result} />
                </div>
                <div className="md:col-span-1 flex items-center gap-2 ml-auto md:ml-0">
                  {resultIcon}
                  <Link
                    href={"/inspecoes/" + insp.id}
                    className="text-[9px] font-bold uppercase tracking-widest text-primary hover:underline"
                  >
                    Ver
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2.5 bg-muted/30 border-t border-border">
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            {inspections.length} registro(s) · Documento Controlado · AndCheck EHS · NR-18 / NR-35 / NBR 6494
          </p>
        </div>
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/inspecoes/nova"
          className="flex items-center gap-3 bg-card border border-border p-4 hover:bg-muted/30 transition-colors group"
        >
          <ClipboardCheck className="w-5 h-5 text-primary/40 group-hover:text-primary/60 transition-colors" />
          <div>
            <p className="text-[11px] font-bold text-foreground uppercase tracking-wide">Nova Inspeção</p>
            <p className="text-[10px] text-muted-foreground">Registrar vistoria agora</p>
          </div>
        </Link>
        <Link
          href="/andaimes"
          className="flex items-center gap-3 bg-card border border-border p-4 hover:bg-muted/30 transition-colors group"
        >
          <Construction className="w-5 h-5 text-primary/40 group-hover:text-primary/60 transition-colors" />
          <div>
            <p className="text-[11px] font-bold text-foreground uppercase tracking-wide">Gestão de Andaimes</p>
            <p className="text-[10px] text-muted-foreground">Ver todos os ativos</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
