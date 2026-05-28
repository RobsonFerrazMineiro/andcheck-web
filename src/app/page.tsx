import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
            AndCheck EHS
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Sistema de Gestão e Liberação de Andaimes
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Protótipo inicial das páginas do AndCheck. Nesta etapa vamos criar
            somente as telas visuais, sem banco de dados, sem autenticação e sem
            funções integradas.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/dashboard"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h2 className="font-semibold text-slate-900">Dashboard</h2>
            <p className="mt-1 text-sm text-slate-500">
              KPIs e visão geral dos andaimes.
            </p>
          </Link>

          <Link
            href="/mapa"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h2 className="font-semibold text-slate-900">Mapa Operacional</h2>
            <p className="mt-1 text-sm text-slate-500">
              Localização dos andaimes em campo.
            </p>
          </Link>

          <Link
            href="/andaimes"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h2 className="font-semibold text-slate-900">Andaimes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cadastro e consulta de estruturas.
            </p>
          </Link>

          <Link
            href="/inspecoes"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h2 className="font-semibold text-slate-900">Inspeções</h2>
            <p className="mt-1 text-sm text-slate-500">
              Histórico e nova inspeção.
            </p>
          </Link>

          <Link
            href="/relatorios"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h2 className="font-semibold text-slate-900">Relatórios</h2>
            <p className="mt-1 text-sm text-slate-500">
              PDFs, auditoria e documentação.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
