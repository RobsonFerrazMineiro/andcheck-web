# Checklist de teste - perfis RBAC

Use este roteiro para validar manualmente os acessos por perfil no AndCheck.

## Preparacao

- Rodar a aplicacao em `http://localhost:3000`.
- Garantir que as migrations foram aplicadas.
- Rodar `pnpm db:seed:users` se precisar atualizar papeis/permissoes no banco.
- Criar ou editar usuarios de teste para cada perfil em `/usuarios`.
- Testar sempre em janela anonima ou fazendo logout/login entre perfis.

## Rotas base

- `/dashboard` - painel operacional.
- `/andaimes` - lista de andaimes.
- `/andaimes/novo` - cadastro de andaime.
- `/andaimes/[id]` - detalhe do andaime.
- `/inspecoes` - lista de inspecoes.
- `/inspecoes/nova` - nova inspecao.
- `/inspecoes/[id]` - detalhe da inspecao.
- `/mapa` - mapa operacional.
- `/relatorios` - relatórios e historico.
- `/usuarios` - gestao de usuarios.
- `/qr/[tag]` - pagina publica de QR.

## SUPER_ADMIN

- [x] Acessa `/dashboard`.
- [x] Acessa `/andaimes`.
- [x] Acessa `/andaimes/novo`.
- [x] Consegue cadastrar andaime.
- [x] Acessa detalhe de andaime.
- [x] Consegue concluir montagem.
- [x] Consegue registrar desmontagem.
- [x] Consegue anexar documento.
- [x] Consegue excluir documento.
- [x] Acessa `/inspecoes`.
- [x] Acessa `/inspecoes/nova`.
- [x] Consegue criar/finalizar inspecao.
- [x] Acessa detalhe de inspecao.
- [x] Acessa `/mapa`.
- [x] Acessa `/relatorios`.
- [x] Acessa `/usuarios`.
- [x] Consegue criar usuario.
- [x] Consegue desativar usuario.

## HSE_HYDRO

- [x] Acessa `/dashboard`.
- [x] Acessa `/andaimes`.
- [x] Nao ve botao de novo andaime.
- [x] Ao abrir `/andaimes/novo`, deve voltar para `/andaimes`.
- [x] Acessa detalhe de andaime.
- [x] Nao ve acoes de concluir montagem/desmontagem.
- [x] Nao consegue anexar documento.
- [x] Acessa `/inspecoes`.
- [x] Acessa `/inspecoes/nova`.
- [x] Consegue criar/finalizar inspecao.
- [x] Acessa detalhe de inspecao.
- [x] Acessa `/mapa`.
- [x] Ve acao de inspecionar no mapa.
- [x] Acessa `/relatorios`.
- [x] Nao ve menu `/usuarios`.
- [x] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## HSE_GERENCIADORA

- [x] Acessa `/dashboard`.
- [x] Acessa `/andaimes`.
- [x] Nao ve botao de novo andaime.
- [x] Ao abrir `/andaimes/novo`, deve voltar para `/andaimes`.
- [x] Acessa detalhe de andaime.
- [x] Nao ve acoes de concluir montagem/desmontagem.
- [x] Nao consegue anexar documento.
- [x] Acessa `/inspecoes`.
- [x] Acessa `/inspecoes/nova`.
- [x] Consegue criar/finalizar inspecao.
- [x] Acessa detalhe de inspecao.
- [x] Acessa `/mapa`.
- [x] Ve acao de inspecionar no mapa.
- [x] Acessa `/relatorios`.
- [x] Nao ve menu `/usuarios`.
- [x] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## ADMIN_EMPRESA

- [x] Acessa `/dashboard`.
- [x] Acessa `/andaimes`.
- [x] Nao ve botao de novo andaime.
- [x] Ao abrir `/andaimes/novo`, deve voltar para `/andaimes`.
- [x] Acessa detalhe de andaime.
- [x] Nao ve acoes de concluir montagem/desmontagem.
- [x] Nao consegue anexar documento.
- [x] Acessa `/inspecoes`.
- [x] Nao ve botao de nova inspecao.
- [x] Ao abrir `/inspecoes/nova`, deve voltar para `/inspecoes`.
- [x] Acessa detalhe de inspecao.
- [x] Acessa `/mapa`.
- [x] Nao ve acao de inspecionar no mapa.
- [x] Ao abrir `/relatorios`, deve voltar para `/dashboard`.
- [x] Acessa `/usuarios`.
- [x] Consegue criar usuario comum da empresa.
- [x] Consegue editar/desativar usuario permitido.
- [x] Nao consegue editar/desativar seu proprio usuario.
- [x] Nao consegue criar ou alterar `SUPER_ADMIN`.

## HSE_EMPRESA

- [x] Acessa `/dashboard`.
- [x] Acessa `/andaimes`.
- [x] Nao ve botao de novo andaime.
- [x] Ao abrir `/andaimes/novo`, deve voltar para `/andaimes`.
- [x] Acessa detalhe de andaime.
- [x] Nao ve acoes de concluir montagem/desmontagem.
- [x] Consegue anexar documento.
- [x] Acessa `/inspecoes`.
- [x] Acessa `/inspecoes/nova`.
- [x] Consegue criar/finalizar inspecao.
- [x] Acessa detalhe de inspecao.
- [x] Acessa `/mapa`.
- [x] Ve acao de inspecionar no mapa.
- [x] Acessa `/relatorios`.
- [x] Nao ve menu `/usuarios`.
- [x] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## PLANEJAMENTO

- [x] Acessa `/dashboard`.
- [x] Acessa `/andaimes`.
- [x] Ve botao de novo andaime.
- [x] Acessa `/andaimes/novo`.
- [x] Consegue cadastrar andaime.
- [x] Acessa detalhe de andaime.
- [x] Consegue concluir montagem.
- [x] Consegue registrar desmontagem.
- [x] Consegue anexar documento.
- [x] Acessa `/inspecoes`.
- [x] Nao ve botao de nova inspecao.
- [x] Ao abrir `/inspecoes/nova`, deve voltar para `/inspecoes`.
- [x] Acessa detalhe de inspecao.
- [x] Acessa `/mapa`.
- [x] Nao ve acao de inspecionar no mapa.
- [x] Acessa `/relatorios`.
- [x] Nao ve menu `/usuarios`.
- [x] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## SUPERVISOR_ENCARREGADO

- [x] Acessa `/dashboard`.
- [x] Acessa `/andaimes`.
- [x] Ve botao de novo andaime.
- [x] Acessa `/andaimes/novo`.
- [x] Consegue cadastrar andaime.
- [x] Acessa detalhe de andaime.
- [x] Consegue concluir montagem.
- [x] Consegue registrar desmontagem.
- [x] Consegue anexar documento.
- [x] Acessa `/inspecoes`.
- [x] Nao ve botao de nova inspecao.
- [x] Ao abrir `/inspecoes/nova`, deve voltar para `/inspecoes`.
- [x] Acessa detalhe de inspecao.
- [x] Acessa `/mapa`.
- [x] Nao ve acao de inspecionar no mapa.
- [x] Acessa `/relatorios`.
- [x] Nao ve menu `/usuarios`.
- [x] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## MONTADOR_LIDER

- [x] Acessa `/dashboard`.
- [x] Acessa `/andaimes`.
- [x] Ve botao de novo andaime.
- [x] Acessa `/andaimes/novo`.
- [x] Consegue cadastrar andaime.
- [x] Acessa detalhe de andaime.
- [x] Consegue concluir montagem.
- [x] Consegue registrar desmontagem.
- [x] Nao deve conseguir editar status via acao de update generica.
- [x] Nao consegue anexar documento.
- [x] Acessa `/inspecoes`.
- [x] Nao ve botao de nova inspecao.
- [x] Ao abrir `/inspecoes/nova`, deve voltar para `/inspecoes`.
- [x] Acessa detalhe de inspecao.
- [x] Acessa `/mapa`.
- [x] Nao ve acao de inspecionar no mapa.
- [x] Ao abrir `/relatorios`, deve voltar para `/dashboard`.
- [x] Nao ve menu `/usuarios`.
- [x] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## AUDITOR

- [x] Acessa `/dashboard`.
- [x] Acessa `/andaimes`.
- [x] Nao ve botao de novo andaime.
- [x] Ao abrir `/andaimes/novo`, deve voltar para `/andaimes`.
- [x] Acessa detalhe de andaime.
- [x] Nao ve acoes de concluir montagem/desmontagem.
- [x] Nao consegue anexar documento.
- [x] Acessa `/inspecoes`.
- [x] Nao ve botao de nova inspecao.
- [x] Ao abrir `/inspecoes/nova`, deve voltar para `/inspecoes`.
- [x] Acessa detalhe de inspecao.
- [x] Acessa `/mapa`.
- [x] Nao ve acao de inspecionar no mapa.
- [x] Acessa `/relatorios`.
- [x] Nao ve menu `/usuarios`.
- [x] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## Testes publicos e sessao

- [x] Sem login, abrir `/dashboard` redireciona para `/login`.
- [x] Sem login, abrir `/andaimes` redireciona para `/login`.
- [x] Sem login, abrir `/inspecoes` redireciona para `/login`.
- [x] Sem login, abrir `/qr/[tag]` carrega pagina publica.
- [x] Usuario desativado nao consegue logar.
- [x] Usuario que foi desativado com sessao antiga deve ser redirecionado para `/login` ao acessar dashboard.
