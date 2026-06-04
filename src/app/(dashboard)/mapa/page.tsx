import { isPast } from "date-fns";
import { ClipboardCheck, Construction, MapPin, QrCode } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { getScaffolds } from "@/lib/actions/scaffold-actions";
import { MapaClient } from "./mapa-client";

export default async function MapaPage() {
  const raw = await getScaffolds();
  const scaffolds = raw.map((s) => ({
    id: s.id,
    code: s.code,
    location: s.location,
    area: s.area,
    status: s.status as string,
    responsible: s.responsible,
    validity_date: s.validity_date ? s.validity_date.toISOString() : null,
    latitude: (s as { latitude?: number | null }).latitude ?? null,
    longitude: (s as { longitude?: number | null }).longitude ?? null,
    effectiveStatus:
      s.status === "liberado" && s.validity_date && isPast(s.validity_date)
        ? ("vencido" as string)
        : (s.status as string),
    lastInspection: s.inspections[0]
      ? {
          date: s.inspections[0].date.toISOString(),
          result: s.inspections[0].result as string,
        }
      : null,
  }));

  const total = scaffolds.length;
  const comCoords = scaffolds.filter(
    (s) => s.latitude !== null && s.longitude !== null,
  ).length;
  const semCoords = total - comCoords;

  const liberados = scaffolds.filter(
    (s) => s.effectiveStatus === "liberado",
  ).length;
  const emMontagem = scaffolds.filter(
    (s) => s.effectiveStatus === "em_montagem",
  ).length;
  const pendenteLiberacao = scaffolds.filter(
    (s) => s.effectiveStatus === "pendente_liberacao",
  ).length;
  const reprovados = scaffolds.filter((s) =>
    ["reprovado", "interditado"].includes(s.effectiveStatus),
  ).length;
  const vencidos = scaffolds.filter(
    (s) => s.effectiveStatus === "vencido",
  ).length;

  const STATUS_DOT: Record<string, string> = {
    liberado: "bg-emerald-500",
    em_montagem: "bg-blue-500",
    pendente_liberacao: "bg-amber-400",
    reprovado: "bg-red-500",
    interditado: "bg-red-900",
    vencido: "bg-gray-600",
    desmontado: "bg-gray-400",
    pendente: "bg-amber-400",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            AndCheck EHS · Visualização Espacial
          </p>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
            Mapa Operacional
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {total} andaimes cadastrados · {comCoords} georreferenciados
            {semCoords > 0 && (
              <span className="text-amber-600">
                {" "}
                · {semCoords} sem coordenadas
              </span>
            )}
          </p>
        </div>
        <Link
          href="/andaimes/novo"
          className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground text-[10px] font-bold uppercase tracking-widest h-8 px-4 shrink-0"
        >
          <Construction className="w-3.5 h-3.5" />
          Novo Andaime
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Liberados",
            value: liberados,
            color: "text-emerald-600",
            bg: "bg-emerald-50 border-emerald-200",
            bar: "border-l-emerald-600",
          },
          {
            label: "Em Montagem",
            value: emMontagem,
            color: "text-blue-600",
            bg: "bg-blue-50 border-blue-200",
            bar: "border-l-blue-600",
          },
          {
            label: "Pend. Liberação",
            value: pendenteLiberacao,
            color: "text-amber-600",
            bg: "bg-amber-50 border-amber-200",
            bar: "border-l-amber-500",
          },
          {
            label: "Reprov. / Interdit.",
            value: reprovados,
            color: "text-red-600",
            bg: "bg-red-50 border-red-200",
            bar: "border-l-red-600",
          },
          {
            label: "Vencidos",
            value: vencidos,
            color: "text-gray-600",
            bg: "bg-gray-50 border-gray-300",
            bar: "border-l-gray-600",
          },
        ].map((k) => (
          <div
            key={k.label}
            className={
              "border border-l-4 p-3 text-center " + k.bg + " " + k.bar
            }
          >
            <p className={"text-[26px] font-black font-mono " + k.color}>
              {k.value}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {k.label}
            </p>
          </div>
        ))}
      </div>

      {/* Mapa satélite */}
      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Mapa de Satélite — Posicionamento Real
          </p>
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            {comCoords} andaimes no mapa · clique no pin para detalhes
          </p>
        </div>
        <div style={{ height: 480 }}>
          <MapaClient scaffolds={scaffolds} />
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-card border border-border p-4 flex flex-wrap gap-4">
        {[
          { label: "Liberado", dot: "bg-emerald-500" },
          { label: "Em Montagem", dot: "bg-blue-500" },
          { label: "Pend. Liberação", dot: "bg-amber-400" },
          { label: "Reprovado", dot: "bg-red-500" },
          { label: "Interditado", dot: "bg-red-900" },
          { label: "Vencido", dot: "bg-gray-600" },
          { label: "Desmontado", dot: "bg-gray-400" },
        ].map((v) => (
          <div key={v.label} className="flex items-center gap-2">
            <div className={"w-3 h-3 rounded-full " + v.dot} />
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {v.label}
            </p>
          </div>
        ))}
      </div>

      {/* Lista tabular */}
      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Todos os Andaimes — Listagem
          </p>
        </div>
        <div className="divide-y divide-border">
          {scaffolds.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div
                className={
                  "w-2 h-2 rounded-full shrink-0 " +
                  (STATUS_DOT[s.effectiveStatus] ?? "bg-gray-400")
                }
              />
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[12px] font-mono text-foreground">
                  {s.code}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {s.location} · {s.area}
                  {!s.latitude && (
                    <span className="text-amber-500 ml-1">· sem coords</span>
                  )}
                </p>
              </div>
              <StatusBadge status={s.effectiveStatus} />
              <div className="flex gap-1.5 shrink-0">
                <Link
                  href={"/andaimes/" + s.id}
                  className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded"
                  title="Detalhe"
                >
                  <Construction className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
                <Link
                  href={"/qr/" + s.id}
                  className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded"
                  title="QR Code"
                >
                  <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
                <Link
                  href={"/inspecoes/nova?scaffold_id=" + s.id}
                  className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded"
                  title="Inspecionar"
                >
                  <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
