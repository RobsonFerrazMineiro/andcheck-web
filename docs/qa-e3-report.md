# Sprint E3 - Enterprise Quality Assurance

## Status

Sprint iniciada com base automatizada de testes, QA local e primeiros E2E
autenticados em desktop/mobile.

## Estrutura criada

- Vitest para testes unitarios e de componentes.
- Testing Library para componentes React.
- Playwright para testes E2E.
- `qa:static` para verificacoes estaticas de qualidade.
- `analyze:bundle` para analise local dos artefatos `.next`.

## Testes iniciais

- Unitarios:
  - `input-validation`
  - `semantic-tones`
  - `notification-catalog`
  - `sequential-codes`
  - `management-reports`
- Componentes:
  - `StatusBadge`
  - `EmptyState`
  - `NotificationBell`
- E2E:
  - redirecionamento de rota protegida
  - login invalido
  - login valido e smoke das rotas principais autenticadas
  - filtros nao destrutivos de andaimes e inspecoes
  - smoke dos formularios de novo andaime e nova inspecao
  - filtros da pagina de notificacoes

## Testes adicionados na continuacao da Sprint E3

- Unitarios novos:
  - `inspection-outcome` — 19 testes cobrindo `hasCriticalChecklistFailure`,
    `calculateInspectionResult` e `calculateScaffoldStatus` (100% cobertura).
  - `non-conformity-status` — 12 testes cobrindo `isActiveNonConformityStatus`
    e a constante `ACTIVE_NON_CONFORMITY_STATUSES` (100% cobertura).
  - `safe-log` — 27 testes cobrindo `sanitizeForLog` com primitivos, strings,
    Data URIs base64, objetos aninhados, arrays, referencias circulares,
    ArrayBuffer e instancias de Error (90%+ cobertura).
  - `executive-dashboard` — 26 testes cobrindo `getExecutiveDashboard` com
    mocks completos do Prisma: calculo de todos os KPIs, distribuicao por
    status, rankings por empresa/area/inspetor, opcoes de filtro e insights
    (93%+ cobertura).
  - `semantic-tones` expandido — 47 testes cobrindo todas as 7 funcoes exportadas
    e as constantes `SEMANTIC_TONE_HEX` e `SEMANTIC_TONE_CLASSES` atingindo
    100% em todas as metricas (stmts, branches, funcs, lines).
  - `management-reports` expandido — 50 testes totais:
    - `calculateKpiTrend` (casos stable, negative, absoluteDiff/percentDiff).
    - `summarizeChecklistNonConformity` (rotulos canonicos, truncagem, limpeza).
    - `resolveManagementReportFilterLabels` (all, por id, fallback gracioso).
    - `getManagementReportData` — 24 novos testes com mock completo do Prisma
      (vi.hoisted + mockResolvedValueOnce encadeado para os 11 queries do
      Promise.all): KPIs de andaimes/inspecoes/NCs, vencidas com timer fixo,
      taxas de utilizacao e onTimeClosure, medias de dias, tendencias de
      5 metricas, rankings por empresa/area/inspetor/tipo-NC, export rows e
      granularidade dos graficos; inclui teste de dados vazios (zeros e nulls).
- E2E novos:
  - `scaffolds.spec.ts` — 8 testes: carregamento da lista, busca por texto,
    formulario de criacao, cancelar, criar andaime com campos obrigatorios,
    validacao HTML5, detalhe do andaime.
  - `non-conformities.spec.ts` — 8 testes: carregamento da lista, ausencia de
    erros de console, busca por texto, filtros por status, detalhe, mobile.
  - `inspections.spec.ts` — 12 testes: lista, busca, filtros de resultado,
    formulario de criacao com validacao de submit desabilitado, pre-selecao de
    andaime via URL, criacao completa de inspecao (scaffold + formulario +
    submit), detalhe da inspecao.
  - `scaffold-transitions.spec.ts` — 9 testes do ciclo de vida de status:
    - andaime recém-criado inicia em EM MONTAGEM.
    - botao "Concluir Montagem" visivel para em_montagem.
    - banner de desmontado ausente para em_montagem.
    - botao abre ConfirmDialog com role="dialog".
    - botao Cancelar no dialog fecha sem transicao.
    - confirmar transiciona para PEND. LIBERACAO (aguarda router.refresh).
    - botao "Registrar Desmontagem" visivel.
    - dialog de desmontagem exibe seletor de motivo.
    - submeter sem motivo exibe erro de validacao.

## Resultado atual

- Vitest: 12 arquivos, **197 testes passando**.
- Playwright: 10 testes base + 37 novos (andaimes + NCs + inspecoes +
  transicoes de status) = **47 testes E2E**.
- QA estatico: passando.
- `pnpm typecheck`: passando.
- `pnpm lint`: passando.
- `pnpm build` (Next.js 16 / Turbopack): passando.
- `pnpm audit --audit-level moderate`: sem vulnerabilidades.
- Cobertura formal (`pnpm test:coverage`):
  - Overall: Stmts 59.7%, Branches 52.4%, Funcs 59.9%, Lines 59.9%.
  - Servicos criticos:
    - `executive-dashboard.ts`: Stmts 93.7%, Funcs 89.8%, Lines 94.5%.
    - `management-reports.ts` (funcoes exportadas + getManagementReportData):
      cobertura da funcao principal aumentada de ~5% para ~60%+ com os novos
      24 testes de mock completo do Prisma.
    - `inspection-outcome.ts`: **100%** em todas as metricas.
    - `non-conformity-status.ts`: **100%** em todas as metricas.
    - `semantic-tones.ts`: **100%** em todas as metricas.
    - `safe-log.ts`: Stmts 90.6%, Funcs 83.3%.
    - `notifications/catalog.ts`: Stmts 90.5%, Funcs 100%.
    - `sequential-codes (scaffold-code + nc-code)`: >90%.
    - `management-reports.ts` (funcoes exportadas): 100% nas funcoes exportadas.
- Lighthouse autenticado contra build de producao (3 de julho de 2026):
  - Performance: **92**.
  - Accessibility: **100** (corrigido de 96 voltando a 100).
  - Best Practices: **100**.

## Ajustes de infraestrutura

- Adicionado script `test:coverage`.
- Adicionado provider `@vitest/coverage-v8`.
- Playwright agora permite `E2E_SKIP_WEBSERVER=1` para validar contra um
  servidor local ja aberto.
- Adicionado script `lighthouse:auth` para auditoria autenticada.
- ESLint ignora artefatos gerados em `coverage/` e `test-results/`.
- Prisma Client foi regenerado com `pnpm exec prisma generate` apos alteracao
  de dependencias.
- Adicionado override de seguranca para `@opentelemetry/core@2.8.0`, necessario
  por dependencia transiente do Lighthouse.
- Corrigidos achados de acessibilidade do Lighthouse:
  - marcadores Leaflet com nome acessivel.
  - menu mobile com `aria-label`.
  - seletor de contexto mobile com nome acessivel alinhado ao texto visivel.
  - contraste de textos auxiliares e botao primario.
- Otimizados paineis pesados do Dashboard Operacional para carregar grafico e
  mapa apenas quando estiverem proximos da viewport.
- Migradas fontes de `next/font/google` para pacotes locais npm:
  - `geist@1.7.2` para Geist Mono (via `geist/font/mono`, next/font/local).
  - `@fontsource-variable/inter@5.2.8` para Inter Variable (via CSS @import).
  - Elimina dependencia de rede do Google Fonts no build, compativel com
    Next.js 16 + Turbopack que e o bundler padrao de producao.
  - Design visual preservado: Inter Variable e visualmente identica ao Inter
    regular; Geist Mono segue o mesmo design da versao Google Fonts.

## Ajustes de acessibilidade (rodada final)

- `empty-state.tsx`: removida opacidade `/70` de `text-muted-foreground/70` —
  texto pequeno com opacity reduzida falhava contraste 4.5:1 (WCAG AA).
- `context-switcher.tsx`: `aria-label` do botao mobile agora e condicional —
  quando `canSwitchCompany=false` omite o company name do label, eliminando
  o mismatch entre nome acessivel e texto visivel (WCAG 2.5.3).

## Validacoes pendentes

- Lighthouse Performance >= 95: atualmente 92 — investigar bundle com
  `pnpm analyze:bundle` para identificar chunks pesados nao lazy-loaded.
