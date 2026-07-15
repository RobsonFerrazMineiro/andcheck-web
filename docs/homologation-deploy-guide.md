# Guia de Deploy de Homologacao

Objetivo: publicar uma versao de homologacao do AndCheck para testes manuais em celular e tablet reais, com foco em PWA/offline, sincronizacao, storage e fluxos operacionais.

## 1. Preparacao Local

Antes de publicar:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm qa
pnpm build
pnpm audit --audit-level moderate
```

Resultado esperado atual:
- Typecheck, lint, testes, QA, build e audit aprovados.
- Suite E2E completa deve ser rodada em modo serial quando usada localmente: `pnpm test:e2e -- --workers=1`.

## 2. Variaveis de Homologacao

Use `.env.homolog.example` como referencia para configurar o ambiente publicado. Para validar localmente antes de copiar as variaveis para o provedor, crie um `.env.homolog.local`; esse arquivo fica ignorado pelo Git.

Obrigatorias para homologacao:
- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `NOTIFICATION_CRON_SECRET`
- `NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true`
- Storage configurado com `BLOB_READ_WRITE_TOKEN` ou `VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID`

As tres URLs publicas devem apontar para o mesmo origin HTTPS:
- `AUTH_URL`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

Valide localmente ou no shell do ambiente antes de liberar a URL:

```bash
pnpm homolog:check
```

## 3. Banco de Dados

Para um banco de homologacao novo ou atualizado:

```bash
pnpm prisma generate
pnpm prisma migrate deploy
pnpm db:seed
pnpm db:seed:users
```

Use um banco separado de producao. Nao use `prisma migrate dev` em homologacao publicada.

## 4. Configuracao Recomendada no Vercel

Runtime:
- Node.js 20 ou superior.
- pnpm conforme `packageManager`: `pnpm@11.5.3`.

Build:
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output: padrao do Next.js

Storage:
- Configure Vercel Blob antes de testar fotos, assinaturas e evidencias.

E-mail:
- Se `EMAIL_PROVIDER=mock`, registre que envio real de e-mail segue pendente.
- Para validar e-mail real, configure `EMAIL_PROVIDER`, `EMAIL_FROM` e as credenciais do provedor.

## 5. Teste em Celular Real

Preparacao:
- Abrir a URL HTTPS de homologacao no Chrome/Android ou Safari/iOS.
- Fazer login.
- Acessar online pelo menos: `/dashboard`, `/andaimes`, `/andaimes/novo`, `/inspecoes`, `/inspecoes/nova`, `/sincronizacao`.
- Abrir online um detalhe real de andaime e um detalhe real de inspecao antes de testar offline.

Fluxos minimos:
- Criar andaime online.
- Criar andaime offline e sincronizar ao voltar a internet.
- Alterar status de andaime offline e sincronizar.
- Criar nova inspecao offline e sincronizar.
- Abrir detalhe de andaime previamente carregado em modo offline.
- Abrir detalhe de inspecao previamente carregado em modo offline.
- Anexar foto/evidencia em homologacao com storage real.
- Confirmar que nao cai na tela do navegador sem internet quando a pagina ja foi carregada/cacheada.

## 6. Teste em Tablet Real

Viewports alvo:
- 768 x 1024
- 820 x 1180
- Retrato e paisagem

Validar:
- Menu lateral/topo.
- Tabelas de andaimes, usuarios, auditoria e sincronizacao.
- Formularios de novo andaime e nova inspecao.
- Detalhes de andaime e inspecao.
- Mapa operacional.
- Ausencia de overflow horizontal indevido.
- Botoes principais sem duplo clique aparente em acoes de salvamento.

## 7. Criterios Para Aprovar Homologacao

Aprovar somente se:
- Deploy abre em HTTPS sem erro de auth.
- Service Worker registra no dominio final.
- Fluxos offline criticos funcionam em celular real.
- Sincronizacao envia fila pendente ao voltar a conexao.
- Uploads usam storage real e abrem depois do reload.
- Tablet nao apresenta quebra visual bloqueadora.
- Nenhum bug alto/critico fica aberto.

Pendencias aceitas com registro:
- Envio real de e-mail, se homologacao ficar com `EMAIL_PROVIDER=mock`.
- Ajustes visuais menores sem impacto operacional.
