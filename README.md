# AndCheck Web

Aplicacao web do AndCheck para gestao de andaimes, inspecoes, nao conformidades, usuarios e auditoria.

## Requisitos

- Node.js 20.9 ou superior
- pnpm 11.5.3 ou superior
- PostgreSQL acessivel pela variavel `DATABASE_URL`

O projeto usa exclusivamente pnpm. O campo `packageManager` do `package.json` permite que o Corepack selecione a versao correta.

## Instalacao

```bash
corepack enable
pnpm install --frozen-lockfile
```

Para atualizar dependencias durante o desenvolvimento, execute `pnpm install` sem `--frozen-lockfile`.

## Desenvolvimento

```bash
pnpm dev
```

A aplicacao fica disponivel em [http://localhost:3000](http://localhost:3000).

## Banco de dados

```bash
pnpm prisma generate
pnpm prisma migrate deploy
pnpm db:seed
pnpm db:seed:users
```

## Validacao

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Producao

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm build
pnpm start
```
