import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              AndCheck EHS · Painel Operacional
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Visão geral dos andaimes, inspeções e status operacionais.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Voltar
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
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

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Vencidos
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-900">3</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Andaimes recentes
            </h2>

            <div className="mt-4 space-y-3">
              {["AND-001", "AND-002", "AND-003"].map((tag) => (
                <div
                  key={tag}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{tag}</p>
                    <p className="text-sm text-slate-500">
                      Área de manutenção industrial
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    Liberado
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Mapa Operacional
            </h2>

            <div className="mt-4 flex h-64 items-center justify-center rounded-xl border border-dashed bg-slate-50 text-sm text-slate-500">
              Preview do mapa com pins
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
