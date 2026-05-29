import Link from "next/link";

const scaffolds = [
  {
    tag: "AND-001",
    area: "Calcinação",
    type: "Tubular",
    location: "Calcinador C-02",
    height: "14 m",
    status: "Liberado",
    validUntil: "28/05/2026",
  },
  {
    tag: "AND-002",
    area: "Clarificação",
    type: "Multidirecional",
    location: "T-28D-06B",
    height: "1.8 m",
    status: "Pendente",
    validUntil: "—",
  },
  {
    tag: "AND-003",
    area: "Utilidades",
    type: "Torre",
    location: "Torre de Resfriamento T-03",
    height: "18 m",
    status: "Interditado",
    validUntil: "—",
  },
];

function getStatusClass(status: string) {
  if (status === "Liberado") return "bg-emerald-100 text-emerald-700";
  if (status === "Pendente") return "bg-amber-100 text-amber-700";
  if (status === "Interditado") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-700";
}

export default function AndaimesPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              AndCheck EHS · Registro de Ativos
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">Andaimes</h1>

            <p className="mt-1 text-sm text-slate-600">
              Controle visual dos andaimes cadastrados, status operacional e
              validade.
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
              href="/andaimes/novo"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Novo Andaime
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Total
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-900">25</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Liberados
            </p>
            <p className="mt-3 text-3xl font-bold text-emerald-600">18</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Pendentes
            </p>
            <p className="mt-3 text-3xl font-bold text-amber-600">5</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Interditados
            </p>
            <p className="mt-3 text-3xl font-bold text-red-600">2</p>
          </div>
        </div>

        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Lista de Andaimes
              </h2>
              <p className="text-sm text-slate-500">
                Consulta rápida dos ativos operacionais.
              </p>
            </div>

            <div className="flex flex-col gap-2 md:flex-row">
              <input
                placeholder="Buscar por TAG, área ou localização..."
                className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 md:w-80"
              />

              <select className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300">
                <option>Todos os status</option>
                <option>Liberado</option>
                <option>Pendente</option>
                <option>Interditado</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">TAG</th>
                  <th className="px-5 py-3">Área</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Localização</th>
                  <th className="px-5 py-3">Altura</th>
                  <th className="px-5 py-3">Validade</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {scaffolds.map((scaffold) => (
                  <tr key={scaffold.tag} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {scaffold.tag}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {scaffold.area}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {scaffold.type}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {scaffold.location}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {scaffold.height}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {scaffold.validUntil}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                          scaffold.status,
                        )}`}
                      >
                        {scaffold.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/andaimes/${scaffold.tag}`}
                        className="text-sm font-semibold text-slate-900 hover:underline"
                      >
                        Ver detalhes
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
