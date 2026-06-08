# Checklist de teste - perfis RBAC

Use este roteiro para validar manualmente os acessos por perfil no AndCheck.

## Preparacao

- Rodar a aplicacao em `http://localhost:3000`.
- Garantir que as migrations foram aplicadas.
- Rodar `npm run db:seed:users` se precisar atualizar papeis/permissoes no banco.
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

- [ ] Acessa `/dashboard`.
- [ ] Acessa `/andaimes`.
- [ ] Acessa `/andaimes/novo`.
- [ ] Consegue cadastrar andaime.
- [ ] Acessa detalhe de andaime.
- [ ] Consegue concluir montagem.
- [ ] Consegue registrar desmontagem.
- [ ] Consegue anexar documento.
- [ ] Consegue excluir documento.
- [ ] Acessa `/inspecoes`.
- [ ] Acessa `/inspecoes/nova`.
- [ ] Consegue criar/finalizar inspecao.
- [ ] Acessa detalhe de inspecao.
- [ ] Acessa `/mapa`.
- [ ] Acessa `/relatorios`.
- [ ] Acessa `/usuarios`.
- [ ] Consegue criar usuario.
- [ ] Consegue desativar usuario.

## HSE_HYDRO

- [ ] Acessa `/dashboard`.
- [ ] Acessa `/andaimes`.
- [ ] Nao ve botao de novo andaime.
- [ ] Ao abrir `/andaimes/novo`, deve voltar para `/andaimes`.
- [ ] Acessa detalhe de andaime.
- [ ] Nao ve acoes de concluir montagem/desmontagem.
- [ ] Nao consegue anexar documento.
- [ ] Acessa `/inspecoes`.
- [ ] Acessa `/inspecoes/nova`.
- [ ] Consegue criar/finalizar inspecao.
- [ ] Acessa detalhe de inspecao.
- [ ] Acessa `/mapa`.
- [ ] Ve acao de inspecionar no mapa.
- [ ] Acessa `/relatorios`.
- [ ] Nao ve menu `/usuarios`.
- [ ] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## HSE_GERENCIADORA

- [ ] Acessa `/dashboard`.
- [ ] Acessa `/andaimes`.
- [ ] Nao ve botao de novo andaime.
- [ ] Ao abrir `/andaimes/novo`, deve voltar para `/andaimes`.
- [ ] Acessa detalhe de andaime.
- [ ] Nao ve acoes de concluir montagem/desmontagem.
- [ ] Nao consegue anexar documento.
- [ ] Acessa `/inspecoes`.
- [ ] Acessa `/inspecoes/nova`.
- [ ] Consegue criar/finalizar inspecao.
- [ ] Acessa detalhe de inspecao.
- [ ] Acessa `/mapa`.
- [ ] Ve acao de inspecionar no mapa.
- [ ] Acessa `/relatorios`.
- [ ] Nao ve menu `/usuarios`.
- [ ] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## ADMIN_EMPRESA

- [ ] Acessa `/dashboard`.
- [ ] Acessa `/andaimes`.
- [ ] Nao ve botao de novo andaime.
- [ ] Ao abrir `/andaimes/novo`, deve voltar para `/andaimes`.
- [ ] Acessa detalhe de andaime.
- [ ] Nao ve acoes de concluir montagem/desmontagem.
- [ ] Nao consegue anexar documento.
- [ ] Acessa `/inspecoes`.
- [ ] Nao ve botao de nova inspecao.
- [ ] Ao abrir `/inspecoes/nova`, deve voltar para `/inspecoes`.
- [ ] Acessa detalhe de inspecao.
- [ ] Acessa `/mapa`.
- [ ] Nao ve acao de inspecionar no mapa.
- [ ] Ao abrir `/relatorios`, deve voltar para `/dashboard`.
- [ ] Acessa `/usuarios`.
- [ ] Consegue criar usuario comum da empresa.
- [ ] Consegue editar/desativar usuario permitido.
- [ ] Nao consegue criar ou alterar `SUPER_ADMIN`.

## HSE_EMPRESA

- [ ] Acessa `/dashboard`.
- [ ] Acessa `/andaimes`.
- [ ] Nao ve botao de novo andaime.
- [ ] Ao abrir `/andaimes/novo`, deve voltar para `/andaimes`.
- [ ] Acessa detalhe de andaime.
- [ ] Nao ve acoes de concluir montagem/desmontagem.
- [ ] Consegue anexar documento.
- [ ] Acessa `/inspecoes`.
- [ ] Acessa `/inspecoes/nova`.
- [ ] Consegue criar/finalizar inspecao.
- [ ] Acessa detalhe de inspecao.
- [ ] Acessa `/mapa`.
- [ ] Ve acao de inspecionar no mapa.
- [ ] Acessa `/relatorios`.
- [ ] Nao ve menu `/usuarios`.
- [ ] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## PLANEJAMENTO

- [ ] Acessa `/dashboard`.
- [ ] Acessa `/andaimes`.
- [ ] Ve botao de novo andaime.
- [ ] Acessa `/andaimes/novo`.
- [ ] Consegue cadastrar andaime.
- [ ] Acessa detalhe de andaime.
- [ ] Consegue concluir montagem.
- [ ] Consegue registrar desmontagem.
- [ ] Consegue anexar documento.
- [ ] Acessa `/inspecoes`.
- [ ] Nao ve botao de nova inspecao.
- [ ] Ao abrir `/inspecoes/nova`, deve voltar para `/inspecoes`.
- [ ] Acessa detalhe de inspecao.
- [ ] Acessa `/mapa`.
- [ ] Nao ve acao de inspecionar no mapa.
- [ ] Acessa `/relatorios`.
- [ ] Nao ve menu `/usuarios`.
- [ ] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## SUPERVISOR_ENCARREGADO

- [ ] Acessa `/dashboard`.
- [ ] Acessa `/andaimes`.
- [ ] Ve botao de novo andaime.
- [ ] Acessa `/andaimes/novo`.
- [ ] Consegue cadastrar andaime.
- [ ] Acessa detalhe de andaime.
- [ ] Consegue concluir montagem.
- [ ] Consegue registrar desmontagem.
- [ ] Consegue anexar documento.
- [ ] Acessa `/inspecoes`.
- [ ] Nao ve botao de nova inspecao.
- [ ] Ao abrir `/inspecoes/nova`, deve voltar para `/inspecoes`.
- [ ] Acessa detalhe de inspecao.
- [ ] Acessa `/mapa`.
- [ ] Nao ve acao de inspecionar no mapa.
- [ ] Acessa `/relatorios`.
- [ ] Nao ve menu `/usuarios`.
- [ ] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## MONTADOR_LIDER

- [ ] Acessa `/dashboard`.
- [ ] Acessa `/andaimes`.
- [ ] Ve botao de novo andaime.
- [ ] Acessa `/andaimes/novo`.
- [ ] Consegue cadastrar andaime.
- [ ] Acessa detalhe de andaime.
- [ ] Consegue concluir montagem.
- [ ] Consegue registrar desmontagem.
- [ ] Nao deve conseguir editar status via acao de update generica.
- [ ] Nao consegue anexar documento.
- [ ] Acessa `/inspecoes`.
- [ ] Nao ve botao de nova inspecao.
- [ ] Ao abrir `/inspecoes/nova`, deve voltar para `/inspecoes`.
- [ ] Acessa detalhe de inspecao.
- [ ] Acessa `/mapa`.
- [ ] Nao ve acao de inspecionar no mapa.
- [ ] Ao abrir `/relatorios`, deve voltar para `/dashboard`.
- [ ] Nao ve menu `/usuarios`.
- [ ] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## AUDITOR

- [ ] Acessa `/dashboard`.
- [ ] Acessa `/andaimes`.
- [ ] Nao ve botao de novo andaime.
- [ ] Ao abrir `/andaimes/novo`, deve voltar para `/andaimes`.
- [ ] Acessa detalhe de andaime.
- [ ] Nao ve acoes de concluir montagem/desmontagem.
- [ ] Nao consegue anexar documento.
- [ ] Acessa `/inspecoes`.
- [ ] Nao ve botao de nova inspecao.
- [ ] Ao abrir `/inspecoes/nova`, deve voltar para `/inspecoes`.
- [ ] Acessa detalhe de inspecao.
- [ ] Acessa `/mapa`.
- [ ] Nao ve acao de inspecionar no mapa.
- [ ] Acessa `/relatorios`.
- [ ] Nao ve menu `/usuarios`.
- [ ] Ao abrir `/usuarios`, deve voltar para `/dashboard`.

## Testes publicos e sessao

- [ ] Sem login, abrir `/dashboard` redireciona para `/login`.
- [ ] Sem login, abrir `/andaimes` redireciona para `/login`.
- [ ] Sem login, abrir `/inspecoes` redireciona para `/login`.
- [ ] Sem login, abrir `/qr/[tag]` carrega pagina publica.
- [ ] Usuario desativado nao consegue logar.
- [ ] Usuario que foi desativado com sessao antiga deve ser redirecionado para `/login` ao acessar dashboard.

## Evidencias recomendadas

- [ ] Print do menu lateral por perfil.
- [ ] Print de tentativa bloqueada em `/andaimes/novo`.
- [ ] Print de tentativa bloqueada em `/inspecoes/nova`.
- [ ] Print de tentativa bloqueada em `/usuarios`.
- [ ] Print de tentativa bloqueada em `/relatorios`.
- [ ] Print de criacao de andaime por `SUPERVISOR_ENCARREGADO`.
- [ ] Print de criacao de andaime por `MONTADOR_LIDER`.
- [ ] Print comprovando que `MONTADOR_LIDER` nao edita andaime.
