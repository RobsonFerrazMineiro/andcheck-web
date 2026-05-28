import Link from "next/link";

type InspectionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const checklistGroups = [
  {
    title: "Segurança Documental",
    items: [
      {
        text: "ART/RRT de montagem está disponível e válida",
        critical: true,
        result: "Conforme",
      },
      {
        text: "Projeto estrutural do andaime disponível",
        critical: true,
        result: "Conforme",
      },
      { text: "PT emitida e válida", critical: true, result: "Conforme" },
    ],
  },
  {
    title: "Estrutura",
    items: [
      {
        text: "Base/sapatas apoiadas em superfície firme e nivelada",
        critical: true,
        result: "Conforme",
      },
      {
        text: "Contraventamentos instalados corretamente",
        critical: true,
        result: "Conforme",
      },
      {
        text: "Plataformas de trabalho completas e travadas",
        critical: true,
        result: "Conforme",
      },
    ],
  },
  {
    title: "Acesso e Proteção",
    items: [
      {
        text: "Guarda-corpo superior instalado",
        critical: true,
        result: "Conforme",
      },
      {
        text: "Guarda-corpo intermediário instalado",
        critical: true,
        result: "Conforme",
      },
      {
        text: "Sinalização e isolamento da área executados",
        critical: false,
        result: "Conforme",
      },
    ],
  },
];

function getResultClass(result: string) {
  if (result === "Conforme") return "bg-emerald-100 text-emerald-700";
  if (result === "Não Conforme") return "bg-red-100 text-red-700";
  if (result === "N/A") return "bg-slate-100 text-slate-600";

  return "bg-slate-100 text-slate-700";
}

export default async function InspectionDetailPage({
  params,
}: InspectionDetailPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              AndCheck EHS · Relatório Técnico
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">{id}</h1>

            <p className="mt-1 text-sm text-slate-600">
              Visualização da inspeção, checklist, evidências e rastreabilidade.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/inspecoes"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Voltar
            </Link>

            <Link
              href="/relatorios"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Gerar PDF
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Status
            </p>
            <p className="mt-3 text-xl font-bold text-emerald-600">Aprovado</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Andaime
            </p>
            <p className="mt-3 text-xl font-bold text-slate-900">AND-001</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Conformidade
            </p>
            <p className="mt-3 text-xl font-bold text-emerald-600">100%</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Validade
            </p>
            <p className="mt-3 text-xl font-bold text-slate-900">28/05/2026</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                1. Identificação do Andaime
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InfoItem label="TAG / Código" value="AND-001" />
                <InfoItem label="Tipo" value="Multidirecional" />
                <InfoItem label="Área / Setor" value="Clarificação" />
                <InfoItem label="Localização" value="T-28D-06B" />
                <InfoItem label="Altura" value="1.8 m" />
                <InfoItem label="Carga Máxima" value="105 kg" />
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                2. Dados da Inspeção
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InfoItem label="Inspetor" value="Robson Ferraz" />
                <InfoItem label="Responsável" value="Nilson Mendes" />
                <InfoItem label="Empresa" value="KW Brasil" />
                <InfoItem label="Data da Inspeção" value="21/05/2026" />
                <InfoItem label="Condição do Tempo" value="Nublado" />
                <InfoItem label="Temperatura" value="29 °C" />
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                3. Checklist Técnico
              </h2>

              <div className="mt-5 space-y-5">
                {checklistGroups.map((group) => (
                  <div
                    key={group.title}
                    className="overflow-hidden rounded-xl border"
                  >
                    <div className="border-b bg-slate-50 px-4 py-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                        {group.title}
                      </h3>
                    </div>

                    <div className="divide-y">
                      {group.items.map((item) => (
                        <div
                          key={item.text}
                          className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <p className="font-medium text-slate-900">
                            {item.text}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {item.critical && (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-700">
                                Crítico
                              </span>
                            )}

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getResultClass(
                                item.result,
                              )}`}
                            >
                              {item.result}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                4. Registro Fotográfico
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="flex h-36 items-center justify-center rounded-xl border bg-slate-100 text-sm text-slate-400">
                  Foto 1
                </div>

                <div className="flex h-36 items-center justify-center rounded-xl border bg-slate-100 text-sm text-slate-400">
                  Foto 2
                </div>

                <div className="flex h-36 items-center justify-center rounded-xl border bg-slate-100 text-sm text-slate-400">
                  Foto 3
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                5. Observações
              </h2>

              <p className="mt-3 rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
                Andaime em condições adequadas de uso. Inspeção aprovada sem não
                conformidades críticas.
              </p>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">QR Code</h2>

              <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-dashed bg-slate-50 text-sm text-slate-500">
                QR Code da inspeção
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Consulta pública para auditoria, validade e status operacional.
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Localização
              </h2>

              <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-dashed bg-slate-50 text-center text-sm text-slate-500">
                Mapa com pin do andaime
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Assinatura
              </h2>

              <div className="mt-4 rounded-xl border bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Robson Ferraz
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Inspetor responsável
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
