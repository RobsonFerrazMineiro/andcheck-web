# Sprint Separada - Saneamento Visual e Encoding

## Objetivo

Corrigir inconsistencias visuais e problemas de encoding/mojibake sem misturar esse trabalho com o fechamento da Sprint E4.

## Escopo

- Revisar textos com caracteres corrompidos em telas, testes e mensagens de erro.
- Corrigir labels, placeholders, titulos e mensagens mantendo a nomenclatura atual do produto.
- Validar que as correcoes nao alterem regras enterprise, SST Lite, RBAC ou fluxo de dados.
- Conferir telas principais em desktop e mobile:
  - Dashboard
  - Andaimes
  - Inspecoes
  - Nao conformidades
  - Notificacoes
  - Auditoria
- Atualizar testes E2E afetados por textos corrigidos.

## Fora de Escopo

- Novas features de auditoria.
- Mudancas em schema Prisma.
- Mudancas de permissao/RBAC.
- Redesign amplo do dashboard.
- Regras enterprise aplicadas ao SST Lite.

## Criterios de Aceite

- Nenhum texto visivel com mojibake nas telas principais.
- Testes E2E ajustados para os textos corretos.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` e smoke E2E passando.
- Sem alteracao de comportamento funcional fora de texto/visual.

## Observacoes

Esta sprint deve ser tratada como saneamento tecnico e visual. O E4 permanece focado em auditoria avancada, compliance, trilha de eventos e exportacao.
