import Link from "next/link";

const inspections = [
  {
    id: "INS-001",
    scaffold: "AND-001",
    area: "Calcinação",
    inspector: "Robson Ferraz",
    date: "21/05/2026",
    status: "Aprovado",
  },
  {
    id: "INS-002",
    scaffold: "AND-002",
    area: "Clarificação",
    inspector: "João Martins",
    date: "20/05/2026",
    status: "Pendente",
  },
  {
    id: "INS-003",
    scaffold: "AND-003",
    area: "Utilidades",
    inspector: "Carlos Silva",
    date: "18/05/2026",
    status: "Interditado",
  },
];

function getStatusClass(status: string) {
  if (status === "Aprovado") return "bg-emerald-100 text-emerald-700";
  if (status === "Pendente") return "bg-amber-100 text-amber-700";
  if (status === "Interditado") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

export default function InspecoesPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              AndCheck EHS · Histórico Técnico
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Inspeções
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Histórico visual das inspeções realizadas em andaimes.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </Link>

            <Link
              href="/inspecoes/nova"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Nova Inspeção
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Total
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-900">34</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Aprovadas
            </p>
            <p className="mt-3 text-3xl font-bold text-emerald-600">27</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Pendentes
            </p>
            <p className="mt-3 text-3xl font-bold text-amber-600">5</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Interditadas
            </p>
            <p className="mt-3 text-3xl font-bold text-red-600">2</p>
          </div>
        </div>

        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Lista de Inspeções
              </h2>
              <p className="text-sm text-slate-500">
                Consulta rápida das liberações e inspeções técnicas.
              </p>
            </div>

            <div className="flex flex-col gap-2 md:flex-row">
              <input
                placeholder="Buscar por inspeção, TAG ou inspetor..."
                className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 md:w-80"
              />

              <select className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300">
                <option>Todos os status</option>
                <option>Aprovado</option>
                <option>Pendente</option>
                <option>Interditado</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Inspeção</th>
                  <th className="px-5 py-3">Andaime</th>
                  <th className="px-5 py-3">Área</th>
                  <th className="px-5 py-3">Inspetor</th>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {inspections.map((inspection) => (
                  <tr key={inspection.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {inspection.id}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {inspection.scaffold}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {inspection.area}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {inspection.inspector}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {inspection.date}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                          inspection.status,
                        )}`}
                      >
                        {inspection.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/inspecoes/${inspection.id}`}
                        className="text-sm font-semibold text-slate-900 hover:underline"
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
