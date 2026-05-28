import Link from "next/link";

type QRPageProps = {
  params: Promise<{
    tag: string;
  }>;
};

export default async function QRPage({ params }: QRPageProps) {
  const { tag } = await params;

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <section className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="bg-slate-900 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-300">
              AndCheck EHS
            </p>

            <h1 className="mt-2 text-2xl font-bold">Verificação de Andaime</h1>

            <p className="mt-1 text-sm text-slate-300">
              Consulta pública de status, validade e rastreabilidade.
            </p>
          </div>

          <div className="p-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                Status Atual
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-700">
                Liberado
              </p>

              <p className="mt-1 text-sm text-emerald-700">
                Andaime válido para uso operacional.
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              <InfoItem label="TAG / Código" value={tag} />
              <InfoItem label="Tipo" value="Multidirecional" />
              <InfoItem label="Área / Setor" value="Clarificação" />
              <InfoItem label="Localização" value="T-28D-06B" />
              <InfoItem label="Validade" value="28/05/2026" />
              <InfoItem label="Última Inspeção" value="21/05/2026" />
              <InfoItem label="Responsável" value="Nilson Mendes" />
              <InfoItem label="Empresa" value="KW Brasil" />
            </div>

            <div className="mt-5 rounded-xl border bg-slate-50 p-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Resumo da Última Inspeção
              </h2>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-xl font-bold text-emerald-600">27</p>
                  <p className="mt-1 text-[10px] uppercase text-slate-500">
                    Conformes
                  </p>
                </div>

                <div className="rounded-lg border bg-white p-3">
                  <p className="text-xl font-bold text-red-600">0</p>
                  <p className="mt-1 text-[10px] uppercase text-slate-500">
                    Não Conf.
                  </p>
                </div>

                <div className="rounded-lg border bg-white p-3">
                  <p className="text-xl font-bold text-slate-700">7</p>
                  <p className="mt-1 text-[10px] uppercase text-slate-500">
                    N/A
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border bg-slate-50 p-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Evidências Fotográficas
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="flex h-24 items-center justify-center rounded-lg border bg-white text-xs text-slate-400">
                  Foto 1
                </div>

                <div className="flex h-24 items-center justify-center rounded-lg border bg-white text-xs text-slate-400">
                  Foto 2
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border bg-slate-50 p-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Localização
              </h2>

              <div className="mt-3 flex h-40 items-center justify-center rounded-lg border border-dashed bg-white text-center text-xs text-slate-400">
                Mapa público com pin do andaime
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs leading-relaxed text-slate-500">
                Esta página é somente para consulta. Alterações, liberações e
                registros técnicos só podem ser realizados por usuários
                autorizados no sistema AndCheck.
              </p>
            </div>

            <Link
              href="/"
              className="mt-5 block rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
            >
              Acessar AndCheck
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-slate-400">
          NR-18 · NR-35 · ABNT NBR 6494 · ISO 45001
        </p>
      </section>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
