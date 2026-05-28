import Link from "next/link";

const scaffolds = [
  {
    tag: "AND-001",
    area: "Calcinação",
    status: "Liberado",
  },
  {
    tag: "AND-002",
    area: "Redução",
    status: "Pendente",
  },
  {
    tag: "AND-003",
    area: "Utilidades",
    status: "Interditado",
  },
];

export default function MapaPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between rounded-xl border bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              AndCheck EHS
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Mapa Operacional
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Visualização geográfica dos andaimes da planta.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border px-4 py-2 text-sm font-medium"
          >
            Dashboard
          </Link>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs uppercase text-slate-500">Liberados</p>

            <p className="mt-2 text-3xl font-bold text-emerald-600">18</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs uppercase text-slate-500">Pendentes</p>

            <p className="mt-2 text-3xl font-bold text-amber-600">5</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs uppercase text-slate-500">Interditados</p>

            <p className="mt-2 text-3xl font-bold text-red-600">2</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-xs uppercase text-slate-500">Total</p>

            <p className="mt-2 text-3xl font-bold text-slate-900">25</p>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Planta Operacional</h2>

            <div className="flex gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                Liberado
              </span>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                Pendente
              </span>

              <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                Interditado
              </span>
            </div>
          </div>

          <div className="flex h-[500px] items-center justify-center rounded-xl border border-dashed bg-slate-50">
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-700">
                Mapa Operacional
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Leaflet será integrado na próxima etapa
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Andaimes Mapeados</h2>

          <div className="space-y-3">
            {scaffolds.map((scaffold) => (
              <div
                key={scaffold.tag}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-semibold">{scaffold.tag}</p>

                  <p className="text-sm text-slate-500">{scaffold.area}</p>
                </div>

                <span className="text-sm font-medium">{scaffold.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
