# Sprint P3 - Auditoria de Padronizacao Final

## Escopo

Esta auditoria inicia a P3 sem alterar regras de negocio. O objetivo e mapear
tokens, componentes compartilhados, duplicacoes visuais e pontos de risco antes
de refatoracoes.

## Fontes oficiais existentes

- `src/app/globals.css`
  - Define tokens CSS globais: `background`, `card`, `muted`, `accent`,
    `border`, `input`, `sidebar`, raios e motion.
  - Paleta base atual: fundo geral cinza claro, cards brancos, sidebar escura,
    accent laranja.
- `src/lib/design-system.ts`
  - Fonte principal para tipografia e surfaces.
  - Ja possui `typography.pageTitle`, `sectionLabel`, `panelTitle`,
    `tableHeader`, `badge`, `action`, `kpiValue`.
  - Ja possui `surface.panelHeader` e `surface.tableHeader`.
- `src/lib/semantic-tones.ts`
  - Fonte oficial para tons semanticos:
    `success`, `critical`, `warning`, `neutral`, `disabled`.
  - Mapeia status de andaime, inspecao, NC, documento e notificacao.
- `src/components/ui/*`
  - Base shadcn/local para `Button`, `Input`, `Select`, `Badge`, `Card`,
    `Label`, `Textarea`, `Skeleton`.
- `src/components/shared/*`
  - Componentes compartilhados mais importantes:
    `StatusBadge`, `ActionMenu`, `FilterShell`, `MobileFilterPanel`,
    `EmptyState`, `ErrorState`, `ConfirmDialog`, `FormModal`,
    `AuditTimeline`.

## Padroes ja consolidados

- Listagens principais de `Andaimes` e `Inspecoes` usam cards compactos com:
  - `andcheck-lift`
  - `typography`
  - `StatusBadge`
  - grids responsivos.
- Filtros principais usam `FilterShell` e `FilterField`.
- Dropdowns principais ja usam `useExclusiveMenu` em `ActionMenu`,
  `UserMenu`, `MobileHeader` e `NotificationBell`, cobrindo clique fora,
  ESC e fechamento ao abrir outro menu.
- Acoes em detalhes usam `ActionMenu` em parte relevante dos modulos.
- Empty states possuem componente compartilhado.
- Modais de formulario usam `FormModal`.

## Divergencias encontradas

### Badges e status

Existem badges locais ainda duplicados:

- `NaoConformidadesClient` possui `Badge` local e mapas `STATUS_STYLE`.
- `nao-conformidades/[id]/page.tsx` possui `Badge` local.
- `inspecoes/[id]/page.tsx` possui `NcBadge` local.
- `scaffold/linked-records-button.tsx` possui `NcBadge` local.
- `empresas-client.tsx` possui `StatusBadge` local para ativo/inativo.
- `workspaces-client.tsx` possui `StatusBadge` local para ativo/inativo.
- `workspaces/[id]/page.tsx` possui `WorkspaceStatusPill`.
- `workspaces/[id]/operational-areas-manager.tsx` possui `AreaStatusBadge`.
- `sincronizacao/sync-client.tsx` possui `StatusBadge` local.
- `components/scaffold/document-section.tsx` possui `StatusBadge` local.

Risco: consolidar tudo de uma vez pode alterar semantica visual especifica.
Recomendacao: criar helpers pequenos para ativo/inativo e NC antes de substituir.

### Botoes

O componente `Button` ja possui variantes oficiais suficientes:

- `default`
- `outline`
- `secondary`
- `ghost`
- `destructive`
- `link`
- tamanhos `default`, `sm`, `xs`, `icon`, `icon-sm`, etc.

Ainda ha varios botoes locais com classes manuais, especialmente em:

- `relatorios/page.tsx`
- `report-export-actions.tsx`
- `mapa/page.tsx`
- `mapa-client.tsx`
- `qr-card.tsx`
- `location-picker.tsx`
- `usuarios-client.tsx`
- `inspecoes/[id]/page.tsx`
- formularios de nova inspecao e novo andaime.

Recomendacao: substituir por `Button` por grupos, comecando por botoes de acao
simples fora de formularios criticos.

### Filtros

`FilterShell` e `FilterField` sao o padrao compartilhado atual.

Divergencias:

- `Relatorios Gerenciais` usa `<select>` e `<input type="date">` nativos.
- Demais paginas usam `Input` e `Select` shadcn.
- O visual acinzentado dos campos de filtro foi centralizado em `FilterField`
  no commit anterior, mas `Relatorios` ainda tem helper proprio.

Recomendacao: em fase posterior, migrar `Relatorios Gerenciais` para
`FilterShell` + `FilterField` + `Input`/`Select` shadcn, mantendo comportamento
server-side por formulario.

### Cabecalhos de paginas

Padrao comum:

- eyebrow com icone
- titulo usando `typography.pageTitle`
- descricao curta
- divisor inferior
- acoes no lado direito quando aplicavel.

Divergencias:

- Detalhes (`andaimes/[id]`, `inspecoes/[id]`, `nao-conformidades/[id]`) usam
  cards escuros locais parecidos, mas nao compartilhados.
- `workspaces/[id]` ja foi aproximado do padrao de panels.
- Alguns modulos ainda usam classes tipograficas inline em vez de
  `typography`.

Recomendacao: criar um componente pequeno de `DetailHero` apenas se a terceira
pagina repetir exatamente o mesmo padrao. Ate la, ajustar localmente com cuidado.

### Cards e paineis

Padroes existentes:

- KPI cards locais repetidos em `empresas`, `workspaces`, `relatorios`,
  `usuarios`, `sincronizacao`, `mapa`.
- Panels com `surface.panelHeader` aparecem em alguns modulos, mas nao em todos.
- Tabelas modernas usam `surface.tableHeader`; outras ainda usam header local.

Recomendacao: primeiro expandir `design-system.ts` com tokens de card/KPI se
necessario. Evitar criar um componente KPI unico antes de confirmar que todos os
KPIs compartilham a mesma estrutura.

### Tipografia

`typography` esta bem definido, mas ainda ha muitas classes repetidas:

- `text-[9px] font-bold uppercase tracking-widest`
- `text-[10px] font-bold uppercase tracking-widest`
- `font-mono text-[10px]`

Recomendacao: substituir gradualmente por `typography.sectionLabel`,
`typography.panelTitle`, `typography.codeMuted`, `typography.action` quando o
contexto for equivalente.

### Dropdowns, modais e drawers

Padroes bons:

- `ActionMenu` usa clique fora, ESC e `useExclusiveMenu`.
- `UserMenu`, `MobileHeader` e `NotificationBell` tambem implementam fechamento.
- `FormModal` e `ConfirmDialog` existem como padroes compartilhados.

Pontos a revisar:

- Drawers/listas vinculadas em `LinkedRecordsButton` e historico precisam manter
  largura/scroll/fechamento coerentes.
- Algumas telas ainda usam blocos locais de detalhe em vez de drawer padrao.

### Encoding

O terminal exibiu mojibake em varios arquivos por causa da saida do PowerShell,
mas isso nao confirma que o arquivo esta corrompido. A P3 deve rodar
`pnpm qa:encoding` ou o check equivalente antes de fechamento.

## Ordem recomendada de execucao

1. Congelar tokens oficiais
   - manter `globals.css`, `design-system.ts`, `semantic-tones.ts` como fonte.
   - adicionar tokens apenas quando removem repeticao real.
2. Normalizar filtros
   - preservar `FilterShell`/`FilterField`.
   - migrar `Relatorios` para o mesmo wrapper sem mudar comportamento.
3. Normalizar botoes simples
   - substituir classes manuais por `Button` onde nao ha risco funcional.
4. Normalizar badges
   - criar/expandir componentes compartilhados para ativo/inativo e NC.
   - trocar duplicacoes pagina por pagina.
5. Normalizar headers/cards de detalhe
   - alinhar `Andaime`, `Inspecao`, `NC`, `Acervo`.
6. Revisar mobile/tablet
   - focar fluxos operacionais: novo andaime, nova inspecao, detalhe, NC, mapa.
7. Rodar validacoes completas
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test`
   - `pnpm test:e2e`
   - `pnpm qa`
   - `pnpm build`

## Primeiras intervencoes seguras propostas

- Migrar filtros de `Relatorios Gerenciais` para `FilterShell`/`FilterField`,
  mantendo `<form action="/relatorios">`.
- Trocar botoes de exportacao e aplicar filtros para `Button` quando nao alterar
  comportamento.
- Criar componente compartilhado `ActiveStatusBadge` ou expandir `StatusBadge`
  para casos booleanos, substituindo duplicacoes em Empresas/Workspaces/Areas.
- Consolidar `NcBadge` em componente compartilhado usando
  `nonConformityStatusTone`.

## Fora de escopo nesta auditoria

- Alterar RBAC, DataScope, politicas de assinatura, regras de multiempresa,
  offline/sincronizacao ou validade.
- Reescrever arquitetura de paginas.
- Criar novo design system paralelo.

## Rodada inicial aplicada

- `Relatorios Gerenciais` passou a usar `FilterShell` e `FilterField`,
  mantendo o formulario server-side existente.
- Campos dentro de `FilterShell` receberam fundo operacional acinzentado
  centralizado em `globals.css`.
- Badges booleanos de ativo/inativo foram consolidados em `ActiveStatusBadge`.
- Status ativo/inativo de Usuarios tambem passou a reutilizar
  `ActiveStatusBadge`.
- Detalhe de Empresa tambem passou a reutilizar `ActiveStatusBadge`.
- Badges de status/classificacao de NC foram consolidados em
  `NonConformityBadge`.
- Status de documentos corporativos e documentos operacionais do andaime foram
  concentrados em `DocumentStatusBadge`.
- O botao de aplicar filtros em `Relatorios Gerenciais` passou a usar o
  componente `Button`.
- Botoes de exportacao da Auditoria/Relatorios e acoes de QR/localizacao foram
  migrados para `Button` preservando `typography.action`.
- Botoes de Usuarios e da secao compartilhada de documentos tambem passaram a
  usar `Button`.
- Acoes de impressao de relatorios e voltar em ranking passaram a usar
  `Button`.
- Botoes de PDF/impressao do detalhe de inspecao passaram a usar `Button`,
  preservando as classes do `ActionMenu`.
- Botoes do `ConfirmDialog`, do preview de documentos e do menu compartilhado
  de acoes de andaime tambem passaram a usar `Button`.
- O botao de fechar do detalhe de Auditoria e os itens do menu de acoes de
  Nao Conformidades passaram a usar `Button`.
- O filtro rapido de tipo em Empresas, os controles principais da galeria de
  evidencias de NC e os botoes do checklist de inspecao passaram a usar
  `Button`.
- Acoes de layout/header (`UserMenu`, `MobileHeader`, `ContextSwitcher`) e o
  submit do login tambem passaram a usar `Button`.
- Botoes restantes de `Mapa`, sugestao inteligente do novo andaime, acoes da
  nova inspecao, miniaturas/evidencias e linha expansivel da timeline foram
  padronizados para `Button`.
- Labels e estilos de tipo de empresa foram centralizados em
  `company-types.ts`.
- Labels de tipo de andaime foram centralizados em `scaffold-types.ts`,
  removendo mapas locais duplicados em QR, Acervo, Andaimes e Inspecoes.
- Status da fila de Sincronizacao foram incorporados ao `StatusBadge`
  compartilhado, removendo o badge local da pagina.
- `Mapa Operacional` foi mantido fora desta rodada porque o arquivo apresentou
  ruido de fim de linha ao editar; tratar em etapa separada.
- Rotulos visiveis pontuais foram corrigidos em filtros de Acervo, Auditoria,
  Empresas, Notificacoes e Workspaces.

## Validacoes executadas

- `pnpm typecheck`: passou.
- `pnpm lint`: passou.
- `pnpm test`: passou, 261 testes.
- `pnpm qa:static`: passou.
- `node scripts/check-encoding.mjs`: passou.
- `pnpm build`: passou.
- `pnpm audit --audit-level moderate`: falhou por vulnerabilidades
  preexistentes de dependencias, incluindo `next-auth`, `@auth/core` e pacotes
  transitivos.
- `pnpm test:e2e`: nao concluiu dentro do limite de 3 minutos do comando nesta
  rodada.
