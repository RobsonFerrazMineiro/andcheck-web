# Checklist de Paginas Pre-Deploy

Status: em andamento

Legenda:
- [ ] Nao validado
- [x] Validado
- [!] Bug encontrado
- [-] Nao aplicavel

## Criterios Por Pagina

Para cada pagina, registrar:
- Desktop validado
- Tablet validado
- Mobile validado
- Online validado
- Offline validado
- Responsividade
- Acessibilidade
- Performance
- Bugs encontrados
- Correcoes realizadas
- Pendencias

## Mobile Operacional

### Painel Operacional (`/dashboard`)
- Desktop validado: [ ]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [ ]
- Offline validado: [ ]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias:

### Andaimes (`/andaimes`)
- Desktop validado: [x]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [x]
- Offline validado: [ ]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias: validar tablet/mobile visual fora do recorte offline

### Detalhe de Andaime (`/andaimes/[id]`)
- Desktop validado: [x]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [x]
- Offline validado: [ ]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias: validar offline cache/detalhe e tablet/mobile

### Novo Andaime (`/andaimes/novo`)
- Desktop validado: [x]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [x]
- Offline validado: [x]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados: BUG-001
- Correcoes realizadas: Area/setor e responsavel tecnico marcados como obrigatorios
- Pendencias: validar tablet/mobile visual

### Inspecoes (`/inspecoes`)
- Desktop validado: [x]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [x]
- Offline validado: [ ]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias: validar tablet/mobile visual

### Nova Inspecao (`/inspecoes/nova`)
- Desktop validado: [x]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [x]
- Offline validado: [ ]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias: validar fluxo offline de inspecao manualmente/com E2E especifico

### Detalhe de Inspecao (`/inspecoes/[id]`)
- Desktop validado: [x]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [x]
- Offline validado: [ ]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias: validar tablet/mobile visual e offline cache

### Nao Conformidades (`/nao-conformidades`)
- Desktop validado: [x]
- Tablet validado: [ ]
- Mobile validado: [x]
- Online validado: [x]
- Offline validado: [ ]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias: validar criacao/edicao/evidencias e tablet

### Detalhe de Nao Conformidade (`/nao-conformidades/[id]`)
- Desktop validado: [x]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [x]
- Offline validado: [ ]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias: validar evidencias/uploads e tablet/mobile

### Acervo de Andaimes (`/acervo`)
- Desktop validado: [ ]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [ ]
- Offline validado: [ ]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias:

### Detalhe do Acervo (`/acervo/[tag]`)
- Desktop validado: [ ]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [ ]
- Offline validado: [ ]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias:

### Mapa Operacional (`/mapa`)
- Desktop validado: [ ]
- Tablet validado: [ ]
- Mobile validado: [x]
- Online validado: [x]
- Offline validado: [ ]
- Responsividade: [x]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas: E2E-002 ajustou navegacao do spec responsivo para `domcontentloaded`
- Pendencias: validar offline real/cache e tablet/desktop

### Notificacoes (`/notificacoes`)
- Desktop validado: [x]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [x]
- Offline validado: [ ]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas: E2E-005 ajustou seletor do filtro Criticas
- Pendencias: validar tablet/mobile visual

### Perfil (`/perfil`)
- Desktop validado: [ ]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [ ]
- Offline validado: [ ]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias: `/perfil/notificacoes` aprovado no E2E mobile responsivo; validar desktop/tablet

### Sincronizacao (`/sincronizacao`)
- Desktop validado: [x]
- Tablet validado: [ ]
- Mobile validado: [x]
- Online validado: [x]
- Offline validado: [x]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas: E2E-003 corrigiu o spec de update offline
- Pendencias: validar tela visualmente em tablet e falhas reais com backend de homologacao

## Tablet E Desktop

### Dashboard Executivo (`/dashboard-gerencial`)
- Desktop validado: [ ]
- Tablet validado: [ ]
- Mobile validado: [-]
- Online validado: [ ]
- Offline validado: [-]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias:

### Usuarios (`/usuarios`)
- Desktop validado: [ ]
- Tablet validado: [ ]
- Mobile validado: [x]
- Online validado: [x]
- Offline validado: [-]
- Responsividade: [x]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias: validar CRUD completo, permissoes e desktop/tablet

### Auditoria (`/auditoria`)
- Desktop validado: [x]
- Tablet validado: [ ]
- Mobile validado: [x]
- Online validado: [x]
- Offline validado: [-]
- Responsividade: [x]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas: validado fallback mobile "Auditoria disponivel em telas maiores"
- Correcoes realizadas: validado fallback mobile "Auditoria disponivel em telas maiores"; E2E-005 corrigiu seletor de contagem
- Pendencias: validar tablet

### Empresas (`/empresas`)
- Desktop validado: [ ]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [ ]
- Offline validado: [-]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias:

### Workspaces (`/workspaces`)
- Desktop validado: [ ]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [ ]
- Offline validado: [-]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias:

### Relatorios Gerenciais (`/relatorios`)
- Desktop validado: [ ]
- Tablet validado: [ ]
- Mobile validado: [ ]
- Online validado: [ ]
- Offline validado: [-]
- Responsividade: [ ]
- Acessibilidade: [ ]
- Performance: [ ]
- Bugs encontrados:
- Correcoes realizadas:
- Pendencias:

## Checklist Adicional - Rodada UX Polish

Usar esta lista apos a proxima build/deploy de homologacao para conferir o que ainda depende de validacao visual/manual.

### Padrao global
- [ ] Conferir em desktop, tablet e celular se as paginas seguem a ordem: breadcrumb, titulo, descricao, linha divisoria, area de acoes e conteudo.
- [ ] Confirmar que nao ha scroll horizontal, texto vazando, cards desalinhados, botoes cortados ou sobreposicao de elementos.
- [ ] Validar textos longos em empresa, workspace, usuario, e-mail, cargo, area/setor e codigos de andaime.
- [ ] Confirmar que as alteracoes foram apenas visuais, sem mudar RBAC, offline, sincronizacao, banco, APIs ou fluxo operacional.

### Menus e acoes
- [ ] Em detalhe de andaime, detalhe de inspecao e detalhe de nao conformidade, validar o menu "Acoes" em desktop e mobile.
- [ ] Confirmar que todas as acoes antigas continuam funcionando: editar, nova inspecao, desmontagem, exportar PDF, imprimir, comentarios, responsavel, prazo e cancelar quando aplicavel.
- [ ] Testar dropdowns de perfil, empresa/workspace, notificacoes, menu mobile e demais menus: clique fora fecha, ESC fecha e abrir outro menu nao deixa menus sobrepostos.

### Timeline e historico
- [ ] Em telas com timeline, validar que somente os ultimos 5 eventos aparecem inicialmente.
- [ ] Clicar em "Ver historico completo" e confirmar que modal/drawer abre, rola corretamente, fecha no X, fecha com ESC e nao quebra no mobile.

### Andaimes e inspecoes
- [ ] Em `/andaimes`, conferir se cards de validade e inspecoes ficaram compactos e legiveis em mobile/tablet.
- [ ] Em `/inspecoes`, conferir se validade, observacoes e data ficaram compactos e sem quebra visual.
- [ ] Em `/andaimes/[id]` e `/inspecoes/[id]`, testar layout mobile, menu de acoes, listas relacionadas, timeline e acesso offline de pagina ja carregada.

### Novo andaime
- [ ] Conferir texto acima dos botoes do mapa: "Arraste o pin ou clique no mapa para ajustar a posicao exata do andaime."
- [ ] Validar que "Centralizar no pin" e "Localizacao atual" nao quebram em celular.
- [ ] Testar geolocalizacao, clique no mapa e arraste do pin.
- [ ] Confirmar que toast de localizacao detectada nao sobrepoe o cabecalho.
- [ ] Validar salvamento online e offline, bloqueio contra duplo clique e destino apos salvar.

### Nova inspecao
- [ ] Conferir se o select de andaime tem campo de pesquisa, altura maxima e scroll interno.
- [ ] Testar busca por codigo/nome do andaime e selecao em celular real.
- [ ] Confirmar que a lista nao ocupa a tela inteira nem gera scroll horizontal.
- [ ] No bloco de assinatura, validar que o botao "Limpar" fica acima da area de assinatura.
- [ ] Testar camera e galeria para fotos dos itens do checklist em mobile real.

### Mapa operacional
- [ ] Confirmar que a lista lateral mostra apenas uma parte da lista.
- [ ] Clicar em "Ver todos" e validar modal/bottom sheet com lista completa.
- [ ] Testar filtros, selecao de andaime e pins no mapa sem scroll longo excessivo.

### Sincronizacao e offline
- [ ] Conferir se `/sincronizacao` usa o mesmo padrao visual das demais paginas.
- [ ] Validar cards no mobile e tabela no desktop.
- [ ] Testar fila com item pendente, falha, retry individual e retry em lote.
- [ ] Testar ida offline/online em homologacao real e confirmar que o status visual atualiza em tempo aceitavel.

### Notificacoes e preferencias
- [ ] Em `/notificacoes`, validar filtros simplificados, "Marcar lidas" e "Arquivar todas".
- [ ] Confirmar que arquivar todas respeita escopo do usuario e nao afeta notificacoes indevidas.
- [ ] Em `/perfil/notificacoes`, conferir agrupamento, checkboxes/toggles, textos e estados indisponiveis.

### Perfil e areas administrativas
- [ ] Em `/perfil`, validar hierarquia visual, dados longos, sessao, troca de senha e estados offline/online.
- [ ] Em `/usuarios`, testar tabela em desktop/tablet/mobile com nomes, e-mails, perfis e empresas longos.
- [ ] Em `/empresas`, `/empresas/[id]`, `/workspaces`, `/workspaces/[id]`, `/documentos/[id]` e paginas admin, validar header, cards, acoes e responsividade.
- [ ] Em `/auditoria`, validar comportamento em tablet e modal/detalhe quando aplicavel.
- [ ] Em `/relatorios`, validar filtros, selects, cards e graficos em mobile/tablet.

### PWA e instalacao
- [ ] Em Android real, abrir homologacao HTTPS e verificar se aparece opcao de instalar o app.
- [ ] Em iOS/iPadOS real, validar instalacao via "Adicionar a Tela de Inicio".
- [ ] Confirmar icone, nome do app, tela inicial e comportamento offline apos instalado.
- [ ] Reabrir app instalado online e offline e validar paginas ja carregadas.

## Bugs Encontrados

| ID | Severidade | Pagina/Fluxo | Ambiente | Descricao | Status |
| --- | --- | --- | --- | --- | --- |
| QA-001 | Medio | Layout autenticado | Global | Texto com encoding quebrado em labels de usuario/workspace | Corrigido |
| QA-002 | Baixo | Service Worker | Global | `console.error` client-side bloqueado pelo QA static | Corrigido |
| QA-003 | Medio | OfflineProvider | Testes automatizados | Teste desatualizado esperava sync imediato em evento de fila | Corrigido |
| E2E-001 | Medio | Login E2E | Homologacao local | Auth falhava quando `NEXTAUTH_URL` divergida da porta testada | Mitigado |
| E2E-002 | Baixo | Mobile responsivo | Testes automatizados | Spec dependia do evento `load` completo em paginas com assets assinc | Corrigido |
| E2E-003 | Baixo | Offline update | Testes automatizados | Spec aceitava `/andaimes/novo` como detalhe e navegava pela lista sem necessidade | Corrigido |
| E2E-004 | Baixo | Login E2E | Testes automatizados | Rate limit de auth bloqueava suites longas com muitos logins sequenciais | Mitigado |
| BUG-001 | Alto | Novo Andaime | Online/offline | UI deixava area e responsavel como opcionais, mas backend exige ambos | Corrigido |
| E2E-005 | Baixo | Specs E2E | Testes automatizados | Seletores antigos/frouxos em auditoria, notificacoes, inspecoes e transicoes | Corrigido |
| EMAIL-001 | Alto | Notificacoes por e-mail | Producao | Provedor real sem adapter podia registrar sucesso mockado | Corrigido |
| STORAGE-001 | Medio | Evidencias/documentos | Producao | Novos anexos aceitavam URL externa como storage valido | Corrigido |
