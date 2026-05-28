import Link from "next/link";

const reports = [
  {
    id: "AND-INS-0001-2026",
    scaffold: "AND-001",
    date: "21/05/2026",
    status: "Aprovado",
  },
  {
    id: "AND-INS-0002-2026",
    scaffold: "AND-002",
    date: "20/05/2026",
    status: "Pendente",
  },
  {
    id: "AND-INS-0003-2026",
    scaffold: "AND-003",
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

export default function RelatoriosPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              AndCheck EHS · Documentação Controlada
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Relatórios & PDFs
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Área preparada para relatórios técnicos, PDFs normativos e
              auditorias.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border bg-white shadow-sm lg:col-span-2">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Relatórios Gerados
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Lista visual de documentos técnicos gerados pelo AndCheck.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Documento</th>
                    <th className="px-5 py-3">Andaime</th>
                    <th className="px-5 py-3">Data</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {report.id}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {report.scaffold}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {report.date}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                            report.status,
                          )}`}
                        >
                          {report.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button className="text-sm font-semibold text-slate-900 hover:underline">
                          Visualizar PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Preview do PDF
              </h2>

              <div className="mt-4 rounded-xl border bg-slate-50 p-4">
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4 border-b pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        AndCheck
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        Relatório de Inspeção
                      </p>
                    </div>

                    <div className="flex h-14 w-14 items-center justify-center rounded border bg-slate-50 text-[10px] text-slate-400">
                      QR
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="h-3 rounded bg-slate-200" />
                    <div className="h-3 w-4/5 rounded bg-slate-200" />
                    <div className="h-3 w-3/5 rounded bg-slate-200" />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="h-12 rounded bg-emerald-100" />
                    <div className="h-12 rounded bg-red-100" />
                    <div className="h-12 rounded bg-slate-200" />
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Esta área será conectada futuramente ao gerador real de PDF.
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Padrão Documental
              </h2>

              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>• Documento controlado</li>
                <li>• QR Code de verificação</li>
                <li>• Registro fotográfico</li>
                <li>• Checklist categorizado</li>
                <li>• Assinatura do inspetor</li>
                <li>• Normas referenciadas</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
