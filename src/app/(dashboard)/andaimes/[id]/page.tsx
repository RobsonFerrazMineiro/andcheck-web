import Link from "next/link";

type ScaffoldDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const inspections = [
  {
    id: "INS-001",
    date: "21/05/2026",
    inspector: "Robson Ferraz",
    status: "Aprovado",
  },
  {
    id: "INS-002",
    date: "14/05/2026",
    inspector: "João Martins",
    status: "Aprovado com ressalvas",
  },
];

export default async function ScaffoldDetailPage({
  params,
}: ScaffoldDetailPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              AndCheck EHS · Detalhes do Andaime
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">{id}</h1>

            <p className="mt-1 text-sm text-slate-600">
              Informações gerais, localização, histórico e rastreabilidade.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/andaimes"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Voltar
            </Link>

            <Link
              href="/inspecoes/nova"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Nova Inspeção
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">
              1. Identificação do Andaime
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoItem label="TAG / Código" value={id} />
              <InfoItem label="Tipo" value="Multidirecional" />
              <InfoItem label="Área / Setor" value="Clarificação" />
              <InfoItem label="Localização" value="T-28D-06B" />
              <InfoItem label="Altura" value="1.8 m" />
              <InfoItem label="Carga Máxima" value="105 kg" />
              <InfoItem label="Empresa" value="KW Brasil" />
              <InfoItem label="Responsável" value="Nilson Mendes" />
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Status Operacional
            </h2>

            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                Liberado
              </p>

              <p className="mt-2 text-sm text-emerald-700">
                Válido até 28/05/2026.
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-dashed bg-slate-50 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">QR Code</p>

              <div className="mx-auto mt-4 flex h-32 w-32 items-center justify-center rounded-lg border bg-white text-xs text-slate-400">
                QR
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Verificação pública e auditoria.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Localização do Andaime
          </h2>

          <div className="mt-4 flex h-72 items-center justify-center rounded-xl border border-dashed bg-slate-50">
            <div className="text-center">
              <p className="font-semibold text-slate-700">
                Mapa da localização
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Futuramente exibirá pin com latitude e longitude.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Histórico de Inspeções
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Inspeção</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Inspetor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {inspections.map((inspection) => (
                  <tr key={inspection.id}>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {inspection.id}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {inspection.date}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {inspection.inspector}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {inspection.status}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/inspecoes/${inspection.id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
