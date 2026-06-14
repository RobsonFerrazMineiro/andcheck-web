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

## Novos testes pendentes - fluxo de NC e nova inspecao

### Preparacao do cenario

- [x] Criar uma inspecao reprovada com item critico e confirmar a geracao de NC ativa.
- [x] Confirmar que o andaime fica `interditado` enquanto a NC estiver ativa.
- [x] Manter disponiveis usuarios de teste dos perfis HSE, Planejamento, Supervisor/Encarregado e Auditor.

### SUPER_ADMIN

- [x] No detalhe do andaime com NC ativa, nao ve o botao `Nova Inspecao`.
- [x] Ve o alerta orientando a concluir a tratativa para permitir nova inspecao.
- [x] O alerta nao exibe o link duplicado `Ver Nao Conformidade`.
- [x] Consegue abrir a NC pela tabela `Nao Conformidades Vinculadas`.
- [x] Ao acessar diretamente `/inspecoes/nova?scaffold_id=[id]`, ve o bloqueio da nova inspecao.
- [x] Apos encerrar a ultima NC ativa, ve a orientacao para iniciar nova inspecao.
- [x] Confirma que o andaime retorna para `pendente_liberacao`.
- [x] Confirma que o botao `Nova Inspecao` volta a aparecer.
- [x] Consegue atribuir responsavel da NC.
- [x] Consegue alterar prazo e adicionar comentario.
- [x] Consegue anexar evidencia e solicitar verificacao.
- [x] Consegue aprovar, rejeitar, encerrar ou cancelar a NC conforme o status.

### HSE_HYDRO, HSE_GERENCIADORA e HSE_EMPRESA

- [x] No detalhe do andaime com NC ativa, nao ve o botao `Nova Inspecao`.
- [x] Ve mensagem informativa de que a nova inspecao depende da conclusao da tratativa pelo responsavel.
- [x] Nao recebe instrucao para executar a tratativa operacional.
- [x] O alerta nao exibe o link duplicado `Ver Nao Conformidade`.
- [x] Consegue abrir a NC pela tabela `Nao Conformidades Vinculadas`.
- [x] Ao acessar diretamente `/inspecoes/nova?scaffold_id=[id]`, ve o bloqueio da nova inspecao.
- [x] Em NC `PENDING_VERIFICATION`, consegue aprovar, rejeitar ou encerrar conforme o fluxo.
- [x] Consegue atribuir responsavel, alterar prazo, comentar e cancelar conforme o fluxo.
- [x] Nao recebe acao operacional de solicitar verificacao durante a correcao.
- [x] Apos encerrar a ultima NC ativa, ve a orientacao para iniciar nova inspecao.
- [x] Confirma que o andaime retorna para `pendente_liberacao` e permite nova inspecao.

### PLANEJAMENTO e SUPERVISOR_ENCARREGADO

- [x] No detalhe do andaime com NC ativa, ve o alerta orientando a concluir a tratativa.
- [x] O alerta nao exibe o link duplicado `Ver Nao Conformidade`.
- [x] Consegue abrir a NC pela tabela `Nao Conformidades Vinculadas`.
- [x] Consegue anexar evidencia durante a correcao.
- [x] Consegue solicitar verificacao da NC apos concluir a tratativa.
- [x] Nao consegue aprovar, rejeitar, encerrar ou cancelar a NC.
- [x] Continua sem botao de nova inspecao por nao possuir permissao de inspecao.
- [x] Apos o encerramento da NC, ve mensagem de que o andaime aguarda inspecao por perfil habilitado.

### AUDITOR

- [x] No detalhe do andaime com NC ativa, ve apenas mensagem informativa sobre a tratativa pelo responsavel.
- [x] Nao recebe instrucao para concluir a tratativa ou iniciar nova inspecao.
- [x] O alerta nao exibe o link duplicado `Ver Nao Conformidade`.
- [x] Consegue abrir a NC pela tabela `Nao Conformidades Vinculadas` em modo somente leitura.
- [x] Nao ve acoes de atribuir, alterar prazo, comentar, anexar evidencia, solicitar verificacao, aprovar, rejeitar, encerrar ou cancelar.
- [x] Continua sem botao de nova inspecao.
- [x] Apos o encerramento da NC, nao recebe instrucao para iniciar nova inspecao.

### ADMIN_EMPRESA e MONTADOR_LIDER

- [x] No detalhe do andaime com NC ativa, ve apenas mensagem informativa sobre a tratativa pelo responsavel.
- [x] Nao recebe instrucao para concluir a tratativa ou iniciar nova inspecao.
- [x] O alerta nao exibe o link duplicado `Ver Nao Conformidade`.
- [x] Nao ve o modulo de Nao Conformidades no menu.
- [x] Nao consegue executar acoes da NC por acesso direto.
- [x] Continua sem botao de nova inspecao.
- [x] Apos o encerramento da NC, nao recebe instrucao para iniciar nova inspecao.

## Novos testes pendentes - protecao de backend

- [x] Com NC `OPEN`, a action de criacao de inspecao rejeita a solicitacao.
- [x] Com NC `ASSIGNED`, a action de criacao de inspecao rejeita a solicitacao.
- [x] Com NC `IN_PROGRESS`, a action de criacao de inspecao rejeita a solicitacao.
- [x] Com NC `PENDING_VERIFICATION`, a action de criacao de inspecao rejeita a solicitacao.
- [x] Com NC `REJECTED`, a action de criacao de inspecao rejeita a solicitacao.
- [x] Com todas as NCs `CLOSED` ou `CANCELLED`, a criacao de inspecao volta a ser permitida.
- [x] Encerrar uma NC nao retorna o andaime para `pendente_liberacao` se ainda existir outra NC ativa.

## Novos testes pendentes - anexos e arquivos

- [x] HSE Empresa consegue anexar e abrir documento tecnico do andaime.
- [x] Planejamento e Supervisor/Encarregado conseguem anexar e abrir documento tecnico do andaime.
- [x] Perfil com permissao consegue excluir documento tecnico; perfil sem permissao nao ve a acao.
- [x] HSE consegue criar inspecao com foto geral, foto de checklist e assinatura.
- [x] Planejamento e Supervisor/Encarregado conseguem anexar evidencia na NC ativa.
- [x] Fotos, evidencias, assinaturas e documentos continuam abrindo apos recarregar a pagina.
- [x] Banco recebe URL ou referencia de storage, nunca `data:image/...;base64` em campos de arquivo.
- [x] Terminal nao imprime Base64, Buffer, Blob, documento ou objeto completo com anexos.
- [x] PDF da inspecao continua exibindo as imagens e assinaturas necessarias.

## Novos testes pendentes - mapa operacional

- [x] Cada perfil que acessa `/mapa` consegue filtrar por `Liberado`.
- [x] Consegue filtrar por `Em Montagem` e `Pendente de Liberacao`.
- [x] Consegue filtrar por `Reprovado`, `Interditado`, `Vencido` e `Desmontado`.
- [x] HSE ve a acao de inspecionar apenas quando o status permite nova inspecao.
- [x] Perfis sem permissao de inspecao continuam sem a acao de inspecionar.

## Novos testes pendentes - sessao e auditoria do QR

- [x] Recarregar uma pagina autenticada faz apenas o minimo necessario de chamadas para `/api/auth/session`.
- [x] Trocar de aba e retornar nao dispara tres chamadas consecutivas para `/api/auth/session`.
- [x] Login, logout, protecao de rota e menus por perfil continuam funcionando.
- [x] Primeira consulta autenticada ao QR cria `CONSULTOU STATUS DO ANDAIME`.
- [x] Outro usuario ou outro QR cria novo log imediatamente.
- [x] Nova consulta apos 5 minutos cria novo log.
- [x] Consulta publica usa IP + QR para deduplicar dentro de 5 minutos.
- [x] Descricao da auditoria identifica apenas usuario/publico e codigo do andaime, sem dados pesados.
