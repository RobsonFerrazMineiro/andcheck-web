import Link from "next/link";

const checklistGroups = [
  {
    title: "Segurança Documental",
    items: [
      { text: "ART/RRT de montagem está disponível e válida", critical: true },
      { text: "Projeto estrutural do andaime disponível", critical: true },
      { text: "PT emitida e válida", critical: true },
      { text: "Montador possui capacitação NR-18 e NR-35", critical: true },
    ],
  },
  {
    title: "Estrutura",
    items: [
      {
        text: "Base/sapatas apoiadas em superfície firme e nivelada",
        critical: true,
      },
      { text: "Contraventamentos instalados corretamente", critical: true },
      { text: "Plataformas de trabalho completas e travadas", critical: true },
      {
        text: "Sem deformações, trincas ou corrosão visível nos tubos",
        critical: true,
      },
    ],
  },
  {
    title: "Acesso e Proteção",
    items: [
      { text: "Escada de acesso instalada corretamente", critical: true },
      { text: "Guarda-corpo superior instalado", critical: true },
      { text: "Guarda-corpo intermediário instalado", critical: true },
      { text: "Sinalização e isolamento da área executados", critical: false },
    ],
  },
  {
    title: "EPIs e Segurança",
    items: [
      { text: "Capacete com jugular disponível", critical: true },
      {
        text: "Cinto de segurança tipo paraquedista com talabarte duplo",
        critical: true,
      },
      {
        text: "Trabalhadores com ASO válido para trabalho em altura",
        critical: true,
      },
      { text: "Treinamento NR-35 vigente", critical: true },
    ],
  },
];

export default function NovaInspecaoPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              AndCheck EHS · Liberação de Andaime
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Nova Inspeção
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Preenchimento visual do formulário padrão de liberação de
              andaimes.
            </p>
          </div>

          <Link
            href="/inspecoes"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Voltar
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                1. Identificação do Andaime
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="TAG / Código" placeholder="AND-001" />
                <Field label="Tipo" placeholder="Tubular / Multidirecional" />
                <Field label="Área / Setor" placeholder="Ex: Clarificação" />
                <Field
                  label="Referência de Localização"
                  placeholder="Ex: T-28D-06B"
                />
                <Field label="Altura" placeholder="Ex: 1.8 m" />
                <Field label="Carga Máxima" placeholder="Ex: 105 kg" />
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                2. Dados da Inspeção
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Inspetor" placeholder="Nome do inspetor" />
                <Field label="Responsável" placeholder="Responsável técnico" />
                <Field label="Empresa" placeholder="Empresa executante" />
                <Field label="Validade" placeholder="Ex: 7 dias" />
                <Field label="Condição do Tempo" placeholder="Ex: Nublado" />
                <Field label="Temperatura" placeholder="Ex: 29 °C" />
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                3. Checklist Técnico
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Formulário fixo baseado em NR-18, NR-35 e ABNT NBR 6494.
              </p>

              <div className="mt-5 space-y-6">
                {checklistGroups.map((group) => (
                  <div key={group.title} className="rounded-xl border">
                    <div className="border-b bg-slate-50 px-4 py-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                        {group.title}
                      </h3>
                    </div>

                    <div className="divide-y">
                      {group.items.map((item) => (
                        <div
                          key={item.text}
                          className="grid gap-3 p-4 md:grid-cols-[1fr_auto]"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {item.text}
                            </p>

                            {item.critical && (
                              <span className="mt-2 inline-flex rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700">
                                Crítico
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                              Conforme
                            </button>

                            <button className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                              Não Conforme
                            </button>

                            <button className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              N/A
                            </button>
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

              <p className="mt-1 text-sm text-slate-500">
                Área visual preparada para upload ou captura de evidências.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="flex h-36 items-center justify-center rounded-xl border border-dashed bg-slate-50 text-sm text-slate-500">
                  + Adicionar foto
                </div>

                <div className="flex h-36 items-center justify-center rounded-xl border bg-slate-100 text-sm text-slate-400">
                  Foto 1
                </div>

                <div className="flex h-36 items-center justify-center rounded-xl border bg-slate-100 text-sm text-slate-400">
                  Foto 2
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                5. Observações
              </h2>

              <textarea
                placeholder="Descreva observações gerais, pendências ou ações corretivas..."
                className="mt-4 min-h-32 w-full rounded-xl border p-4 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Resultado Prévio
              </h2>

              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                  Aguardando preenchimento
                </p>

                <p className="mt-2 text-sm text-emerald-700">
                  O resultado será calculado após a validação dos itens
                  críticos.
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Localização
              </h2>

              <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-dashed bg-slate-50 text-center text-sm text-slate-500">
                Mapa para captura automática ou seleção manual
              </div>

              <button className="mt-4 w-full rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Usar localização do dispositivo
              </button>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Ações</h2>

              <button className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Finalizar Inspeção
              </button>

              <button className="mt-3 w-full rounded-lg border px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Salvar Rascunho
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <input
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
      />
    </label>
  );
}
