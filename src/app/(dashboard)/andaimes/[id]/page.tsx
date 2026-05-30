import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Construction,
  MapPin,
  Ruler,
  User,
  Weight,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ScaffoldQRCard } from "@/components/scaffold/qr-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getScaffoldById } from "@/lib/actions/scaffold-actions";

const TYPE_LABELS: Record<string, string> = {
  tubular: "Tubular",
  fachadeiro: "Fachadeiro",
  multidirecional: "Multidirecional",
  suspenso: "Suspenso",
  torre: "Torre",
};

type Props = { params: Promise<{ id: string }> };

export default async function AndaimeDetailPage({ params }: Props) {
  const { id } = await params;
  const scaffold = await getScaffoldById(id);
  if (!scaffold) notFound();

  const inspections = scaffold.inspections;

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/andaimes"
            className="w-7 h-7 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            <Link href="/andaimes" className="hover:text-foreground">
              Andaimes
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">{scaffold.code}</span>
          </p>
        </div>
        <Link
          href={
            "/inspecoes/nova?scaffold_id=" +
            scaffold.id +
            "&scaffold_code=" +
            scaffold.code
          }
          className="inline-flex items-center gap-2 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white text-[10px] font-bold uppercase tracking-widest h-8 px-4 shrink-0"
        >
          <ClipboardCheck className="w-4 h-4" />
          Iniciar Inspeção
        </Link>
      </div>

      <div className="bg-primary border-l-4 border-l-sidebar-primary px-5 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-primary-foreground/40 mb-1">
              Ficha Técnica do Ativo
            </p>
            <h1 className="text-[22px] font-bold text-primary-foreground font-mono tracking-tight">
              {scaffold.code}
            </h1>
            <p className="text-[11px] text-primary-foreground/60 mt-0.5">
              {scaffold.location}
            </p>
          </div>
          <div className="shrink-0">
            <StatusBadge status={scaffold.status} size="xl" />
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <TechCard title="Dados do Andaime" icon={Construction}>
          <TechRow
            icon={Construction}
            label="Tipo de Andaime"
            value={TYPE_LABELS[scaffold.type] ?? scaffold.type}
          />
          <TechRow
            icon={MapPin}
            label="Localização"
            value={scaffold.location}
          />
          {scaffold.area && (
            <TechRow
              icon={Building2}
              label="Área / Setor"
              value={scaffold.area}
            />
          )}
          <TechRow icon={Ruler} label="Altura" value={scaffold.height + " m"} />
          {scaffold.max_load && (
            <TechRow
              icon={Weight}
              label="Carga Máxima"
              value={scaffold.max_load + " kg"}
            />
          )}
        </TechCard>

        <TechCard title="Dados da Inspeção" icon={ClipboardCheck}>
          {scaffold.responsible && (
            <TechRow
              icon={User}
              label="Responsável"
              value={scaffold.responsible}
            />
          )}
          {scaffold.company && (
            <TechRow
              icon={Building2}
              label="Empresa"
              value={scaffold.company}
            />
          )}
          {inspections.length > 0 && (
            <>
              <TechRow
                icon={User}
                label="Inspetor"
                value={inspections[0].inspector_name}
              />
              <TechRow
                icon={Calendar}
                label="Data da Inspeção"
                value={format(inspections[0].date, "dd/MM/yyyy")}
              />
              {inspections[0].validity_days > 0 && scaffold.validity_date && (
                <TechRow
                  icon={Clock}
                  label="Validade da Liberação"
                  value={
                    inspections[0].validity_days +
                    " dias (até " +
                    format(scaffold.validity_date, "dd/MM/yyyy") +
                    ")"
                  }
                />
              )}
            </>
          )}
          {scaffold.notes && (
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Observações
              </p>
              <p className="text-[11px] text-foreground leading-relaxed">
                {scaffold.notes}
              </p>
            </div>
          )}
        </TechCard>
      </div>

      <ScaffoldQRCard
        scaffoldCode={scaffold.code}
        tag={scaffold.tag}
        origin={origin}
      />

      <TechCard
        title="Histórico de Inspeções"
        icon={ClipboardCheck}
        extra={
          <span className="text-[9px] text-muted-foreground font-mono">
            {inspections.length} registro(s)
          </span>
        }
      >
        {inspections.length === 0 ? (
          <div className="text-center py-10">
            <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-[11px] text-muted-foreground">
              Nenhuma inspeção registrada para este andaime
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="grid grid-cols-3 px-4 py-2 bg-muted/40">
              {["Inspetor", "Data", "Resultado"].map((h) => (
                <p
                  key={h}
                  className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  {h}
                </p>
              ))}
            </div>
            {inspections.map((insp) => (
              <Link
                key={insp.id}
                href={"/inspecoes/" + insp.id}
                className="grid grid-cols-3 items-center px-4 py-3 hover:bg-muted/30 transition-colors group"
              >
                <p className="text-[11px] font-semibold text-foreground truncate">
                  {insp.inspector_name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {format(insp.date, "dd/MM/yyyy")}
                </p>
                <div className="flex items-center justify-between">
                  <StatusBadge status={insp.result} />
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </TechCard>
    </div>
  );
}

interface TechCardProps {
  title: string;
  icon: React.ElementType;
  extra?: React.ReactNode;
  children: React.ReactNode;
}
function TechCard({ title, icon: Icon, extra, children }: TechCardProps) {
  return (
    <div className="bg-card border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b-2 border-border">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
            {title}
          </p>
        </div>
        {extra}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}
interface TechRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
}
function TechRow({ icon: Icon, label, value }: TechRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
          {label}
        </p>
        <p className="text-[11px] font-semibold text-foreground text-right truncate">
          {value}
        </p>
      </div>
    </div>
  );
}
