# Preparação da temporada 2027

## Objetivo e estado

Plano aprovado para preparar o aplicativo para 2027, reutilizando o projeto Supabase atual e suas estruturas, preservando 2026 fora do aplicativo e iniciando a nova competição com novo cadastro e dados competitivos zerados.

Decisões confirmadas pelo responsável em 17/10/2026. A aprovação desta entrega autoriza somente o registro documental. Implementação funcional, acesso operacional, limpeza, alteração de Auth, migrações e publicação exigem planos específicos e as autorizações do [workflow](../ai/CODEX_WORKFLOW.md). O Rigazzo permanece congelado e não é dependência.

Base: [DEC-2026-066](../ai/DECISION_LOG.md#dec-2026-066--preparação-de-2027-no-supabase-atual), [ligas com palpites compartilhados](../architecture/LIGAS_COM_PALPITES_COMPARTILHADOS.md), [recuperação competitiva](../architecture/RECUPERACAO_COMPETITIVA.md) e [roadmap](../../ROADMAP.md).

## Decisões aprovadas

| Tema | Decisão |
| --- | --- |
| Ambiente | Reutilizar o app, o Supabase atual e suas tabelas, funções e políticas, com adaptações específicas aprovadas. |
| Histórico | Preservar 2026 em backup técnico restaurável e relatórios finais legíveis, fora do app de 2027. |
| Dados iniciais | Jogos, palpites, resultados, ranking e estatísticas sem resíduos competitivos de 2026; carregar somente os jogos oficiais de 2027 disponíveis. |
| Pontuação | Manter 10 pontos por exato, 5 por vencedor e saldo, 3 por vencedor e 1 por empate correto com placar diferente. Acrescentar 1 ponto total por placar exato invertido, sem acumulação, desde a rodada 1 de 2027. |
| Fechamento | Manter 30 minutos antes de cada partida. |
| Desempates e exceções | Preservar o comportamento atual para desempates, adiamentos, cancelamentos e correções oficiais; explicitá-lo no regulamento. |
| Ligas | Iniciar apenas com a Liga Standard. Outras serão criadas conforme a necessidade durante 2027, sem transportar membros automaticamente. |
| Administração | Somente o responsável atual como administrador; prever recuperação de seu acesso. |
| Participantes | Limite inicial de 30; novo cadastro e aprovação manual de todos, com associação à Standard. |
| Nome e endereço | Nome público Bolão Brasileirão 2027; endereço sem ano, preferencialmente bolaorigazzo.netlify.app, sujeito à disponibilidade. Tratar links antigos e redirecionamentos. |
| Home | Manter a vigente; avaliar a Home 2.0 em entrega própria, sem dependência para a virada. |
| Notificações | Exigir nova ativação por aparelho após o cadastro de 2027. |
| Abertura | Permitir cadastros após homologação, mesmo com calendário incompleto, informando essa condição. |
| Corte | Após encerrar 2026, testar restauração, aprovar ensaio e obter autorização específica para limpeza e publicação. |
| Custos | Qualquer custo adicional exige apresentação de valor, finalidade e aprovação prévia. |

Exemplos para o regulamento e os testes: resultado 2 × 1 e palpite 1 × 2 devem render 1 ponto total; palpite 2 × 1 continua rendendo 10. Empates não geram categoria adicional: resultado e palpite 1 × 1 continuam sendo exato de 10 pontos. A nova regra não altera 2026 nem autoriza recalcular seu histórico.

## Escopo, risco e preservações

O registro deste plano tem risco baixo, exclusivamente documental. A execução da transição tem risco alto por envolver produção, dados, Auth, permissões, temporadas, integração e pontuação. Cada entrega deverá apresentar escopo, arquivos, critérios, evidências e recuperação antes de implementar.

Preservar identidade visual, mobile-first, acessibilidade, desempenho, palpites compartilhados entre ligas e regras não alteradas expressamente. Não incluir refatorações amplas, novas dependências, evolução geral da Tela de Jogos, transferência ao Rigazzo ou melhorias opcionais. Não substituir indiscriminadamente referências a 2026 em migrações, fixtures e documentos históricos.

## Fase 1 — Consolidar a especificação e organizar as entregas

- [ ] Transformar as decisões acima em especificação verificável do regulamento, cadastro, ligas e abertura.
- [ ] Conferir as regras vigentes no código e no banco; documentar divergências antes de implementar.
- [ ] Designar responsável por execução, conferência, recuperação e aprovação; o responsável humano decide os portões.
- [ ] Separar entregas documentais, adaptação anual, regulamento, integração e roteiro de corte, com branches e aprovações próprias.
- [ ] Definir marcos de execução, sem presumir datas, clubes ou disponibilidade da tabela de 2027.

Saída: especificações por entrega, dependências, critérios e responsáveis definidos. As fases preparatórias podem avançar durante 2026 somente sem afetar sua operação.

## Fase 2 — Atualizar o inventário e a matriz de tratamento

- [ ] Usar o [inventário histórico](../architecture/R03_INVENTARIO_ORIGEM_2026.md) apenas como ponto de partida; atualizar catálogo e volumes agregados com evidência atual, sem expor dados pessoais.
- [ ] Confrontar repositório e ambiente real: schemas, tabelas, views, RPCs, políticas, grants, triggers, chaves e dependências.
- [ ] Classificar cada objeto como preservar, arquivar, limpar ou recriar, com justificativa e conferência prevista.
- [ ] Incluir jogos, palpites, participantes, autorizações, Auth, sessões, temporadas, ligas, membros e designações.
- [ ] Incluir inscrições push, caches de classificação/eventos/detalhes, observações de agenda, logs e estruturas históricas de transição esportiva.
- [ ] Incluir todos os objetos privados: snapshots, resultados históricos, checkpoints, conferências, auditorias e contextos de operações protegidas.
- [ ] Identificar dependências e proteções contra exclusão; definir tratamento específico sem apagar a estrutura ou desabilitar proteções indiscriminadamente.
- [ ] Inventariar Storage se utilizado, configurações de autenticação Google, Netlify, agendamentos, integração, custos e limites. Registrar nomes e finalidades das configurações, nunca seus segredos.
- [ ] Localizar referências anuais e estados persistidos no cliente, inclusive rascunhos, liga ativa e preferências.

Saída: matriz revisável com objeto, ação, ordem, precondições, contagens esperadas e evidência. Não executar a limpeza nesta fase.

### Notificações — complemento aprovado em 28/10/2026

Incluir explicitamente os três conjuntos abaixo no inventário, backup, restauração e roteiro de tratamento. As novas tabelas não são apenas logs descartáveis: seus marcadores impedem reenvios durante a temporada.

| Objeto | Papel e dependências | Tratamento a preparar para o corte |
| --- | --- | --- |
| `public.push_subscriptions` | Inscrições por aparelho, vinculadas ao usuário; referenciadas pelos dois controles de envio. | Preservar no backup privado e testar restauração; reinicializar inscrições conforme a nova adesão por aparelho, sem reutilizar automaticamente autorizações de 2026. |
| `public.push_automaticos` | Marcadores de ativação e baseline, trabalhos por temporada/rodada/tipo/aparelho, tentativas, reservas e registro de tentativa de transporte (`envio_tentado_em`). FK para inscrições com exclusão em cascata. | Preservar os marcadores de 2026 até o backup e a limpeza especificamente autorizada; tratar filas e reservas em andamento e preparar controles próprios de 2027, sem resumos retroativos ou duplicidade. |
| `public.push_consolidados_adm` | Controle separado dos avisos ao administrador, com ativação, eventos agregados e trabalhos por aparelho; FK para inscrições e autorreferência `evento_id`, ambas com exclusão em cascata. | Preservar eventos e trabalhos no backup, conferir vínculos e definir ordem de limpeza; inicializar o controle de 2027 sem reativar trabalhos ou eventos de 2026. |

Fontes: [migração dos automáticos](../../supabase/migrations/20261027172231_add_automatic_round_push.sql), [migração dos consolidados](../../supabase/migrations/20261027232038_add_admin_push_consolidation.sql), [release dos automáticos](../releases/v6.52.0-notificacoes-automaticas.md) e [release dos consolidados](../releases/v6.54.0-consolidados-push-adm.md). Confirmar o estado efetivo no ambiente no inventário futuro; esta atualização usa somente o repositório e não consulta produção.

### Matriz de consultas e limite de retorno

Com 30 participantes e 380 jogos, o cenário de participação completa contém **11.400 palpites**, 380 por participante e 300 por rodada; ultrapassa 1.000 na quarta rodada. Ligas privadas compartilham os mesmos palpites, sem multiplicá-los. O limite padrão da API é por resposta, não por tabela nem por linhas examinadas internamente no PostgreSQL. Confirmar a configuração efetiva do projeto durante o inventário; não depender de aumento do limite para garantir completude. Referências oficiais: [consulta](https://supabase.com/docs/reference/javascript/select) e [paginação](https://supabase.com/docs/reference/javascript/range).

| Consulta ou consumidor | Volume e proteção observada em 28/10/2026 | Atividade para 2027 |
| --- | --- | --- |
| Palpites encerrados por liga, estatísticas, duelos e disputas paralelas | Até 11.400; `loadLeaguePublicPicks` pagina de 500 em 500, ordena por jogo/usuário e confere total, duplicidade e páginas completas. | Preservar a proteção na entrada e atualização automática; homologar todo o campeonato e erros intermediários sem apresentar amostras como histórico completo. |
| Ranking oficial, provisório, movimentação e contagem de palpites por liga | Agregações no banco retornam uma linha por participante, cerca de 30, embora processem milhares de palpites. | Comparar totais com referência independente; não confundir limite de resposta com limite do cálculo SQL. |
| Meus palpites | Até 380 por participante na temporada; consulta sem paginação. | Confirmar isolamento anual e quantidade completa após o corte. |
| Jogos, caches de eventos e detalhes | Até 380 linhas por conjunto no modelo de uma temporada; eventos e jogadores ficam dentro do conteúdo de cada jogo. | Conferir limpeza e escopo anual; reavaliar se passar a haver histórico de várias temporadas no mesmo conjunto. |
| Progresso administrativo | Consulta sem paginação aos jogos da rodada atual e das rodadas pendentes anteriores; pode superar 1.000 com 34 jogos preenchidos por 30 participantes. | Revisar paginação ou divisão da consulta por conjuntos limitados antes da abertura; ensaiar muitas pendências sem omitir palpites nem criar falsas pendências. |
| Acompanhamento de notificações dos participantes e do ADM | Ambas as fontes usam páginas de 500, ordenadas por ID, com falha explícita para volume excessivo. Com um aparelho por participante, os três tipos em 38 rodadas podem gerar até 3.420 trabalhos (30 × 38 × 3), além dos controles. | Validar totais completos e filtros com múltiplos aparelhos; aferir tempo de resposta, pois o servidor agrega o histórico antes de paginar a apresentação. |
| Processamento de automáticos e consolidados | Seleção e cálculos no banco; reservas de até 100 trabalhos por execução. O histórico total pode superar 1.000 sem ser transferido integralmente ao processador. | Testar processamento de todos os lotes, concorrência, tentativas e continuidade; conferir a nova pontuação nos resumos. |
| Designações de participantes às ligas | RPC sem paginação retorna também histórico; o limite de 30 ativos não limita o acúmulo de designações. | Medir projeção e tratar completude da consulta quando ultrapassar 1.000, sem depender apenas da quantidade de usuários. |
| Inscrições e status de comunicação | Consultas sem paginação; número de aparelhos não equivale ao limite de participantes. Consultas cadastrais também podem acumular solicitações e inativos. | Conferir crescimento e prever leitura integral quando necessário, inclusive no envio manual; testar risco de inscrições ou cadastros omitidos. |
| Lembrete manual por rodada | Palpites filtrados por membros/jogos, até 300 no cenário normal; inscrições consultadas sem paginação. Existe limite operacional próprio de 100 aparelhos por envio. | Preservar distinção entre limite intencional de envio e truncamento da consulta; testar completude da seleção antes de validar o limite. |
| Modo legado de contingência | Desativado; `loadLegacyCompetitiveContext` lê palpites encerrados em uma única consulta sem paginação. | Não reativar para 2027 sem corrigir e homologar essa leitura; não tratá-lo como recuperação segura do histórico completo. |
| Auditorias de ligas | RPCs limitam intencionalmente as listagens aos 100 registros recentes. | Documentar que a tela não é exportação integral e preservar todo o histórico pelo backup. |
| Diagnóstico e recuperação | Contagens exatas e agregações no banco não exigem transferir todas as linhas; os logs recentes têm limite intencional. | Conferir resultados agregados e não usar essas telas como cópia integral dos registros. |
| Backup e exportação | O procedimento completo ainda será definido; uma consulta REST única pode omitir registros de tabelas públicas e privadas. | Comprovar extração e restauração integrais com contagens por objeto, sem tratar o exportador sintético existente como backup. |

Fontes do código: [palpites paginados](../../js/league-public-picks.js), [consumidores do app](../../js/app.js), [progresso ADM](../../js/admin-pick-progress.js), [paginação de notificações](../../netlify/functions/_admin-notifications.mjs) e [status de comunicação](../../netlify/functions/status-comunicacao-participantes.mjs). A [release v6.51.4](../releases/v6.51.4-palpites-encerrados-completos.md) registra a correção do histórico de palpites; preservar sua cobertura de regressão.

## Fase 3 — Preparar e testar a preservação de 2026

- [ ] Definir pacote de backup: estrutura e dados, schemas privados, tratamento de Auth, Storage se utilizado, configurações necessárias, versão do código e referência de deploy.
- [ ] Definir locais privados para cópia principal e segunda cópia, acesso, retenção e responsável. Manter arquivos sensíveis fora do Git.
- [ ] Preparar relatórios legíveis dos resultados e rankings finais das ligas, com critérios de desempate.
- [ ] Restaurar uma cópia em ambiente isolado, sem sincronizações, notificações ou escritas no ambiente real.
- [ ] Verificar contagens, relacionamentos, permissões, resultados, palpites e equivalência dos rankings; registrar tempo e limitações da recuperação.
- [ ] Conferir extração integral de `push_subscriptions`, `push_automaticos` e `push_consolidados_adm`, incluindo marcadores, reservas e autorreferências; restaurar sem executar filas nem enviar notificações.
- [ ] Preparar o procedimento do backup final após suspender escritas na janela de corte; definir sua verificação antes da limpeza.

Portão: restauração comprovada. Snapshots competitivos, exportador sintético e existência de um arquivo de backup não substituem a restauração testada do pacote completo. Confirmar capacidades e limitações atuais do serviço antes de escolher ferramentas e comandos.

## Fase 4 — Adaptar o aplicativo e homologar 2027

- [ ] Atualizar configuração anual, contexto de temporada e Liga Standard, incluindo filtros e RPCs presos a 2026.
- [ ] Preparar cadastro, aprovação manual, limite de 30, associação à Standard e inicialização segura do único administrador.
- [ ] Implementar a regra de placar invertido para 2027, alinhando todos os cálculos relevantes no cliente e no banco, sem mudar a pontuação de 2026.
- [ ] Confirmar cobertura e cota da API-Football para 2027; revisar temporada, competição, formato de rodadas, clubes, IDs, escudos e mapeamento de jogos.
- [ ] Validar classificação, eventos, estatísticas e escalações desde o início de 2027, conforme disponibilidade da fonte, removendo dependências funcionais dos pilotos de 2026 quando necessário ao novo ano.
- [ ] Tratar calendário incompleto, horários provisórios e recursos ainda indisponíveis sem inventar dados nem liberar jogos sem informações necessárias ao fechamento seguro.
- [ ] Atualizar nome, título, metadados, manifesto PWA, mensagens, regulamento, Central e ativos anuais aplicáveis; revisar vídeos e imagens com ano incorporado.
- [ ] Conferir disponibilidade do endereço sem ano; planejar mudança, links antigos, OAuth, URLs de retorno, instalação e efeitos da mudança de origem sobre notificações e armazenamento.
- [ ] Planejar invalidação ou separação dos caches e estados antigos: liga, rascunhos, cadastro, preferências e service worker. Reativar push apenas com nova adesão por aparelho.
- [ ] Preparar versão e documentação funcional próprias, com mitigação e ordem de aplicação para banco e código.

Saída: versão candidata homologável. Validar ferramentas e documentação oficial vigente nas tarefas técnicas; este plano não prescreve comandos operacionais não verificados.

## Fase 5 — Elaborar o roteiro de corte e recuperação

- [ ] Detalhar responsável, alvo, precondição, ação, resultado esperado, conferência e recuperação de cada etapa.
- [ ] Preparar manutenção e bloqueio de escritas: cadastros, palpites, sincronizações manuais/agendadas, lembretes e demais produtores identificados.
- [ ] Suspender também os processadores automáticos e de consolidados ADM; resolver ou invalidar reservas de trabalhos em andamento conforme roteiro ensaiado. Antes de remover inscrições, conferir os controles que seriam apagados pelas FKs em cascata e preservar suas evidências no backup.
- [ ] Impedir que abas antigas, sessões existentes ou tarefas em andamento gravem durante o corte ou recuperem autorizações de 2026.
- [ ] Definir reinicialização de Auth, sessões, autorizações, membros e inscrições push por procedimento suportado, testado e revisado especificamente.
- [ ] Preparar procedimentos de limpeza e inicialização com alvos e precondições explícitos, conferência prévia de contagens, controle de repetição e comportamento em falhas parciais.
- [ ] Definir tratamento dos registros protegidos, sequências e relacionamentos a partir do inventário; não autorizar exclusão genérica em cascata.
- [ ] Ordenar alterações de banco, configurações e deploy para evitar código antigo operando sobre dados incompatíveis.
- [ ] Definir critérios de interrupção, ponto de retorno, restauração e comunicação. Reverter apenas o deploy não recupera dados apagados.
- [ ] Prever tratamento dos cadastros e palpites novos se uma restauração for necessária após a abertura; não sobrescrevê-los silenciosamente.
- [ ] Para migrações, seguir o workflow: mecanismo de aplicação definido, reconciliação de arquivo/registro/histórico remoto e check aprovado antes dos portões correspondentes.

Saída: roteiro operacional revisado, ainda sem execução em produção. Autorização específica deve identificar ambiente, alvos, janela e procedimento aprovado.

## Fase 6 — Ensaiar a transição e registrar evidências

- [ ] Executar o roteiro completo em ambiente isolado com estrutura representativa, sem enviar comunicações reais.
- [ ] Testar falhas parciais, repetição, sessões antigas, acesso indevido, recuperação administrativa e restauração.
- [ ] Executar `npm run check`, testes específicos de código e SQL e conferência de histórico de migrações quando aplicável.
- [ ] Validar com `netlify dev`, celular e desktop, toque, teclado, foco e atualização de instalação existente; selecionar outros cenários conforme o impacto.
- [ ] Validar estados vazios, ausência de liga, nenhuma partida, calendário incompleto, estatísticas insuficientes e indisponibilidade da fonte.
- [ ] Homologar cenário sintético com 30 participantes, 380 jogos e 11.400 palpites, comparando históricos e agregados com referência independente. Incluir fronteiras 999/1.000/1.001, falha de página intermediária, alterações entre páginas e troca de liga; resultados incompletos devem ser rejeitados.
- [ ] Simular pelo menos 34 jogos no conjunto de progresso ADM, histórico de designações acima de 1.000 e múltiplos aparelhos nos dois controles de notificações; conferir contagens, desempenho e processamento de todos os lotes sem disparos reais.
- [ ] Testar reinicialização de notificações para 2027: nenhuma retomada de trabalhos de 2026, nova adesão, ativação/baseline corretas, ausência de resumo retroativo, duplicidade ou aviso ao ADM sobre seu próprio consolidado e pontuação do resumo coerente com o novo regulamento.
- [ ] Registrar os critérios CA01–CA14 abaixo, resultados e pendências; corrigir impedimentos antes do corte.

Portão: ensaio aprovado pelo responsável, restauração comprovada e nenhuma pendência impeditiva.

## Fase 7 — Encerrar 2026 e preparar a abertura

- [ ] Confirmar conclusão oficial das partidas e resolver adiamentos, divergências e ocorrências de recuperação.
- [ ] Conferir resultados, desempates e rankings finais de todas as ligas; emitir relatórios finais.
- [ ] Confirmar cobertura esportiva e dados disponíveis para 2027, sem exigir tabela completa para abrir cadastros homologados.
- [ ] Combinar data, duração prevista e comunicação da manutenção; informar novo cadastro, regulamento, endereço e ativação de notificações.
- [ ] Aprovar checklist de prontidão, custos eventuais e roteiro de corte antes de qualquer operação de limpeza.

## Fase 8 — Executar o corte especificamente autorizado

- [ ] Confirmar autorização, ambiente e versão dos procedimentos; iniciar manutenção e interromper escritas, inclusive tarefas em andamento.
- [ ] Gerar backup final e relatórios; verificar integridade e recuperação prevista antes de prosseguir.
- [ ] Conferir alvos e contagens; executar somente o tratamento aprovado para cada conjunto, preservando estrutura e histórico de migrações.
- [ ] Inicializar 2027, configurações, único administrador e Standard; conferir ausência de autorizações e vínculos antigos.
- [ ] Aplicar a versão compatível e configurações na ordem ensaiada; carregar jogos oficiais disponíveis sem resíduos de 2026.
- [ ] Conferir login, cadastro, permissões, calendário, caches, sincronização, diagnóstico e prontidão da recuperação.
- [ ] Reativar serviços gradualmente; liberar após conferência e aprovação operacional, aplicando recuperação se houver falha impeditiva.

## Fase 9 — Acompanhar a abertura e a primeira rodada

- [ ] Abrir cadastros com antecedência para aprovação e suporte; informar eventual calendário incompleto.
- [ ] Acompanhar limite de 30, associação à Standard, novo consentimento push e ausência de acesso administrativo indevido.
- [ ] Monitorar integração, cota, horários, erros e ausência de comunicações para inscrições antigas.
- [ ] Conferir primeiro fechamento real, resultados, aplicação da nova regra, rankings e estatísticas.
- [ ] Validar primeiras capturas e checkpoints de recuperação e executar rotina de backup de 2027.
- [ ] Registrar incidentes e tratá-los em entregas próprias; concluir a transição após a primeira rodada operacionalmente validada.

## Fase 10 — Registrar entregas e encerrar o trabalho

- [ ] Manter neste plano o acompanhamento das atividades e evidências, sem duplicar os roteiros técnicos específicos.
- [ ] Atualizar roadmap quando mudar o estado; registrar decisões duradouras e atualizar versão, changelog e releases nas entregas funcionais.
- [ ] Revisar diff, arquivos novos, testes, preservações e limitações em cada entrega.
- [ ] Executar commit, push e PR somente com as autorizações correspondentes; merge humano, sem excluir branches durante o merge.
- [ ] Após merge confirmado e autorização de Encerramento, atualizar main e remover as branches integradas conforme o workflow.

## Critérios de aceite da transição

| ID | Critério | Evidência exigida antes da conclusão |
| --- | --- | --- |
| CA01 | Histórico de 2026 preservado e recuperável | Restauração isolada, comparação de contagens, relações e rankings; relatórios finais e duas cópias verificadas. |
| CA02 | Nenhum resíduo competitivo ou operacional incompatível em 2027 | Matriz de tratamento executada e consultas de integridade por objeto, incluindo schemas privados e caches. |
| CA03 | Novo cadastro, aprovação, limite de 30 e único administrador | Jornadas completas, tentativa do 31º participante e recuperação administrativa testada. |
| CA04 | Contas e sessões antigas não recuperam permissões | Testes negativos com sessão antiga, usuário pendente, inativo, comum e sem sessão, inclusive escrita direta e RPCs aplicáveis. |
| CA05 | Standard inicial e isolamento das ligas preservados | Conferência de temporada e membros; testes de visibilidade, papel e uso compartilhado dos palpites em cenário sintético com outra liga. |
| CA06 | Integração usa somente a temporada correta | Conferência de competição, temporada, clubes, IDs, rodadas, agenda e classificação; testes de duplicidade e dados de outro ano rejeitados. |
| CA07 | Pontuação e fechamento equivalentes ao regulamento | Casos de 10/5/3/1, invertido de 1 sem acumular, empates, zero, desempates e fronteira dos 30 minutos no cliente e banco. Evidência de preservação de 2026. |
| CA08 | Recuperação funciona em 2027 | Capturas sintéticas, históricos e checkpoints verificados; diagnóstico saudável e recuperação ensaiada. |
| CA09 | Interface funciona desde o início da temporada | Validação de estados vazios e incompletos em celular/desktop, toque, teclado e foco; Home vigente preservada. |
| CA10 | Endereço, cache, instalação e push coerentes | URL disponível confirmada, links e retorno OAuth testados, atualização de instalação antiga, rascunhos isolados e nova ativação por aparelho. |
| CA11 | Corte e recuperação controlados | Ensaio completo com falha parcial, bloqueio de escritas antigas, backup final e roteiro com ordem, limites e responsáveis aprovados. |
| CA12 | Primeira rodada validada operacionalmente | Conferência do fechamento, resultados, pontos, rankings, integração, notificações e recuperação, com ocorrências impeditivas resolvidas. |
| CA13 | Histórico e operações completos acima de 1.000 registros | Cenário de 11.400 palpites com comparação independente; progresso ADM e designações acima do limite; notificações em múltiplos aparelhos, paginação, fronteiras, falhas intermediárias e tempos registrados, sem totais parciais apresentados como completos. |
| CA14 | Controles de notificações preservados e reinicializados corretamente | Backup e restauração das três tabelas, conferência de FKs/autorreferência, suspensão de processadores e reservas, controles novos de 2027, nenhuma fila antiga retomada, duplicidade ou resumo retroativo, nova adesão por aparelho e pontos dos resumos equivalentes ao regulamento. |

## Arquivos potenciais e ações Git

Esta entrega documental altera somente este arquivo, o trecho de 2027 do `ROADMAP.md` e a atualização da DEC-2026-066 em `docs/ai/DECISION_LOG.md`, na branch aprovada `docs/plano-temporada-2027`. Não muda versão, changelog ou release.

O complemento aprovado em 28/10/2026 altera somente este plano, na branch `docs/notificacoes-plano-2027`, incluindo controles de notificações e completude das consultas. Preserva cronograma, decisões funcionais, roadmap e versão; não executa as correções, a limpeza ou a homologação futura aqui previstas. Validação documental: diff, consistência, links e verificações documentais do projeto. Commit, push e PR dependem de autorização específica para esta entrega.

As futuras entregas podem envolver `js/config.js`, `js/app.js`, contexto de ligas, motores de cálculo, `netlify/functions/`, `src/sports-data/`, novas migrações/testes/registro canônico em `supabase/`, scripts, `index.html`, manifesto, service worker, ativos, Central e documentação. Esta lista é um mapa de investigação, não autorização ampla de alteração. Cada implementação partirá da main atualizada e proporá branch própria com prefixo adequado.

## Pendências obrigatórias antes do corte

- [ ] Definir locais privados das duas cópias, acesso e retenção do backup.
- [ ] Confirmar disponibilidade do endereço preferido; se indisponível, obter decisão sobre alternativa sem ano.
- [ ] Definir data e duração da manutenção após o encerramento de 2026.
- [ ] Concluir inventário, planos técnicos, restauração, ensaio e evidências de prontidão.
- [ ] Obter autorizações específicas de execução e publicação. A aprovação do regulamento de 2027 não autoriza alterar 2026 ou apagar dados atuais.
