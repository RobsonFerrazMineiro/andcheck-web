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
