# R03 — Inventário da origem 2026

## Finalidade

Registrar, sem alterar o ambiente, as fontes de dados do **Bolão Brasileirão 2026** que poderão fundamentar o futuro contrato de snapshot do **Bolão Brasileirão Rigazzo**.

Este documento é um inventário, não uma autorização de transferência. A R03 não cria exportador, não copia dados, não consulta valores pessoais e não modifica o Bolão 2026 nem o Rigazzo.

## Estado e limites da evidência

| Etapa | Estado | Evidência |
| --- | --- | --- |
| R03A — inventário estático | Concluída | Código, migrações e documentação versionados no Bolão 2026 |
| R03B — lista de consultas | Concluída | Lista revisada e autorizada antes do acesso remoto |
| R03C — verificação remota somente leitura | Concluída | Catálogo do Supabase e consultas agregadas, sem leitura de linhas individuais |
| R03D — consolidação | Concluída | Evidências estáticas e remotas confrontadas neste documento |

Nenhuma consulta remota ao Supabase foi executada durante a R03A. Na R03C foram consultados somente catálogos, definições estruturais e agregados previamente autorizados. Não foram selecionadas linhas individuais nem valores de nome, e-mail, celular, UUID, palpite, erro ou detalhe de log.

Os volumes representam uma fotografia observacional e podem mudar enquanto o Bolão 2026 permanece ativo. A contagem do catálogo e a consulta agregada não formaram uma transação única; a consolidação usa a contagem exata da consulta agregada e não a estimativa anterior do catálogo.

## Fontes inventariadas

| Fonte | Papel atual | Escrita no Bolão 2026 | Relevância futura |
| --- | --- | --- | --- |
| Supabase Auth | Identidade e sessão Google | Sim, pelo fluxo de autenticação | Dependência de identidade; usuários, sessões e tokens não serão transferidos |
| Tabelas e views `public` | Jogos, palpites, participantes, configurações, cache e logs | Sim, pela aplicação, RPCs e Functions | Fonte operacional principal a ser delimitada na R04 |
| football-data.org | Jogos, resultados e classificação oficial | Indireta, pelas Functions | Origem externa dos dados esportivos; não deve ser chamada pela R03 |
| Código JavaScript | Pontuação, ranking, estatísticas e fechamento | Não persiste ranking canônico | Fonte das regras derivadas que precisarão ser reproduzidas e comparadas |
| Netlify Functions | Sincronização, classificação e diagnóstico | Algumas Functions escrevem | Apenas evidência estática nesta fase; nenhuma Function será invocada |
| Configuração local do app | Temporada, competição e antecedência de fechamento | Não é conjunto histórico | Contexto operacional fixo de 2026 |

## Catálogo de objetos

### Dados esportivos

| Objeto | Natureza | Campos confirmados estaticamente | Relações e observações |
| --- | --- | --- | --- |
| `public.jogos` | Tabela | `id_jogo`, `rodada`, `time_casa`, `time_fora`, `inicio`, `estadio`, `gols_casa`, `gols_fora`, `status`, `atualizado_em`, `time_casa_id`, `time_fora_id`, `time_casa_logo`, `time_fora_logo`, `fonte`, `sincronizado_em`, `escudo_casa`, `escudo_fora`, `temporada`, `local_partida` | PK `id_jogo`; rodada entre 1 e 38; 380 registros. A origem externa é football-data.org. Há campos sobrepostos de local e escudo que a R04 deverá normalizar. |
| `public.classificacao_cache` | Tabela/cache | `id`, `payload`, `atualizado_em` | O payload derivado contém competição, temporada, rodada atual, origem e linhas da classificação. É cache reconstruível, não fonte primária confirmada. |
| payload da classificação | JSON derivado | `position`, `teamId`, `team`, `crest`, `playedGames`, `won`, `draw`, `lost`, `points`, `goalsFor`, `goalsAgainst`, `goalDifference` | Obtido da API esportiva e armazenado em `classificacao_cache`. |

Não existe tabela canônica própria de times no schema `public` observado. Identificadores, nomes e escudos estão associados aos jogos e ao payload da classificação.

### Participação e identidade

| Objeto | Natureza | Campos confirmados estaticamente | Relações e observações |
| --- | --- | --- | --- |
| `auth.users` | Tabela gerenciada pelo Supabase Auth | Dependência confirmada de UUID e e-mail no JWT | Não foi lida linha a linha e não será transferida; somente estrutura e contagem agregada de 17 usuários foram observadas. |
| `public.participantes` | Tabela | `user_id`, `email`, `nome`, `ativo`, `criado_em`, `time_favorito`, `celular` | PK e FK `user_id → auth.users.id` com exclusão em cascata; e-mail único; 17 registros. `user_id` é a identidade canônica no app. |
| `public.participantes_autorizados` | Tabela | `email`, `nome`, `ativo`, `administrador`, `criado_em`, `id`, `atualizado_em`, `celular`, `status`, `solicitado_em`, `aprovado_em`, `aprovado_por`, `time_favorito` | PK por e-mail, UUID `id` único e estados `pending`, `approved`, `rejected` ou `inactive`; 17 registros. Não há FK remota confirmada para `aprovado_por`. |
| `public.configuracoes_bolao` | Tabela | `chave`, `valor`, `atualizado_em`, `atualizado_por` | Chave conhecida: `max_participantes_ativos`. Acesso direto autenticado é bloqueado pela migração versionada e mediado por RPC. |

### Palpites e visões derivadas

| Objeto | Natureza | Campos confirmados estaticamente | Relações e observações |
| --- | --- | --- | --- |
| `public.palpites` | Tabela | `id`, `id_jogo`, `user_id`, `usuario`, `gols_casa`, `gols_fora`, `criado_em`, `atualizado_em` | PK `id`; unicidade por `(id_jogo, user_id)`; FKs para `jogos` e Auth, ambas com exclusão em cascata; 296 registros na consulta agregada. |
| `public."Palpites"` | Tabela legada | `id`, `created_at`, `usuario`, `id_jogo`, `gols_casa`, `gols_fora` | Objeto distinto por uso de maiúscula; zero registros e sem relações confirmadas. Excluir por padrão do snapshot até decisão explícita. |
| `public.palpites_encerrados_publicos` | View | `id_jogo`, `user_id`, `usuario`, `gols_casa`, `gols_fora` | Definição versionada: revela somente palpites de jogos oficialmente encerrados, não cancelados e com placar completo; `security_invoker = true`. |
| `public.contagem_palpites_participantes` | View | `usuario`, `quantidade` | Agrupa `palpites` pelo nome armazenado; não expõe `user_id`, apesar do fallback previsto no cliente. |
| `public.progresso_palpites_adm` | View | `user_id`, `usuario`, `id_jogo`, `atualizado_em` | Projeta todos os palpites para acompanhamento administrativo. |
| `public.palpites_publicos` | View legada | `usuario`, `id_jogo`, `gols_casa`, `gols_fora` | Revela após `inicio - 30 minutos`, critério diferente da view atual de encerrados; não é usada pelo carregamento atual inventariado. |
| `public.pontuacoes_detalhadas` | View derivada | IDs, usuário, rodada, palpite, resultado, `pontos`, `exato` | Calcula pontos no banco para todos os vínculos entre jogos e palpites. |
| `public.ranking` | View derivada | `usuario`, `pontos`, `exatos`, `palpites` | Consolida participantes ativos por nome; ordena pontos, exatos e nome. |

Pontuação, ranking, histórico e estatísticas são calculados no cliente. A verificação remota também encontrou a função `calcular_pontos` e as views derivadas `pontuacoes_detalhadas` e `ranking`; não existe tabela canônica persistida de pontos ou ranking. Banco e cliente adotam 10/5/3/1 pontos, e o ranking observado desempata por pontos totais, placares exatos e nome.

### Operação e diagnóstico

| Objeto | Natureza | Campos confirmados estaticamente | Uso |
| --- | --- | --- | --- |
| `public.api_sync_log` | Tabela | `id`, `criado_em`, `origem`, `sucesso`, `duracao_ms`, `chamadas_api`, `jogos_atualizados`, `erro`, `detalhes` | Auditoria operacional da sincronização; não integra automaticamente o domínio competitivo do snapshot. |
| `public.sincronizacoes` | Tabela legada/operacional | `id`, `origem`, `iniciado_em`, `concluido_em`, `sucesso`, `jogos_recebidos`, `jogos_atualizados`, `mensagem` | Zero registros. Não aparece no fluxo atual inventariado e deve ficar fora do snapshot por padrão. |

A Function de diagnóstico conhece contagens exatas de `jogos`, `palpites` e `participantes_autorizados`, mas também acessa cache e logs. Ela não será invocada na R03 porque sua resposta é mais ampla que o mínimo necessário.

## Funções e políticas observadas

### RPCs e funções

- participação e perfil: `solicitar_participacao`, `solicitar_participacao_v2`, `registrar_meu_perfil_consolidado`, `atualizar_meu_perfil`, `atualizar_meu_perfil_v2`;
- administração: `decidir_solicitacao_participacao`, `deletar_participante_bolao`, `salvar_participante_autorizado`, `alterar_status_participante_autorizado`;
- configuração: `obter_limite_participantes_ativos`, `definir_limite_participantes_ativos`, `validar_limite_participantes_ativos`;
- autorização auxiliar: `eh_administrador_atual`.

Também foram confirmadas `calcular_pontos`, `palpite_no_prazo`, `validar_palpite`, `email_autorizado`, `usuario_atual_e_admin`, `registrar_meu_perfil`, triggers auxiliares e funções legadas. `palpite_no_prazo` exige que o momento atual seja anterior a `inicio - 30 minutos`; `validar_palpite` vincula o nome canônico do participante e bloqueia palpite fora do prazo.

As duas funções administrativas ausentes das migrações foram confirmadas remotamente: `salvar_participante_autorizado(text, text, boolean)` e `alterar_status_participante_autorizado(uuid, boolean)`. Ambas são `security definer` com `search_path = public`.

### RLS e sigilo confirmados

- `participantes_autorizados` tem RLS habilitada e políticas versionadas para leitura do próprio cadastro e administração;
- `configuracoes_bolao` tem RLS habilitada e acesso mediado por funções;
- `palpites` possui política de leitura autenticada somente quando o jogo relacionado está encerrado, não cancelado e com placar completo;
- `palpites_encerrados_publicos` usa privilégios do usuário invocador e não concede leitura anônima;
- várias RPCs usam `security definer` e `search_path = public`.

O catálogo remoto confirmou RLS habilitada em todas as tabelas `public` inventariadas e também revelou políticas e grants legados ou sobrepostos, resumidos adiante. Este registro não é uma auditoria de segurança e não autoriza correções.

## Relações de domínio

| Origem | Relação observada | Destino | Evidência consolidada |
| --- | --- | --- | --- |
| `palpites.id_jogo` | jogo do palpite | `jogos.id_jogo` | FK confirmada, com exclusão em cascata |
| `palpites.user_id` | autor canônico | `auth.users.id` | FK confirmada, com exclusão em cascata; vínculo lógico adicional com `participantes.user_id` |
| `participantes.user_id` | conta autenticada | `auth.users.id` | PK/FK confirmada, com exclusão em cascata |
| cadastro autorizado por e-mail | aprovação para perfil | JWT / `participantes.email` | Relação lógica confirmada pelas funções; e-mails únicos nas duas tabelas, sem FK entre elas |
| `configuracoes_bolao.atualizado_por` | administrador que alterou | `auth.users.id` | Uso confirmado na migração, sem FK remota observada |
| `jogos.time_casa_id` / `time_fora_id` | equipes externas | football-data.org | Relação externa, sem tabela local de times |
| cache e logs | derivados da sincronização | jogos/API externa | Relação operacional; não são fontes competitivas primárias |

## Dados pessoais

| Categoria | Campos ou conjuntos | Tratamento na R03 | Diretriz para a R04 |
| --- | --- | --- | --- |
| Identificadores diretos | nome, e-mail, celular | Somente nomes de campos e contagens agregadas | Inclusão apenas sob consentimento explícito e contrato próprio |
| Identificadores técnicos | `user_id`, IDs de cadastro, `aprovado_por`, UUID do Auth | Somente estrutura e contagens | Mapear identidade sem copiar conta, sessão ou token do Auth |
| Preferências | `time_favorito` | Somente estrutura | Classificar como dado pessoal do perfil |
| Participação | status, função administrativa, datas de solicitação/aprovação | Somente estrutura e distribuições agregadas autorizadas | Aplicar minimização e finalidade definida |
| Histórico competitivo | vínculo entre participante, palpite e jogo | Sem leitura de linhas nesta fase | Preservar sigilo temporal e exigir consentimento para identidade identificada |
| Dados operacionais | erros e detalhes de sincronização | Sem leitura de valores | Excluir por padrão do snapshot competitivo |

Mesmo entre familiares e amigos, a transferência identificada continua condicionada ao consentimento registrado. A R03 não coleta nem registra esse consentimento.

## Volumes

Os volumes abaixo foram obtidos na R03C somente por agregação, sem amostras de linhas ou valores pessoais.

| Medida | Resultado observado |
| --- | --- |
| jogos | 380; 10 por rodada; 205 encerrados, 5 adiados e 170 agendados |
| palpites | 296, vinculados a 15 usuários distintos; concentrados nas rodadas 20 a 25 |
| participantes | 17 perfis e 17 usuários Auth, sem leitura do conteúdo do Auth |
| cadastros autorizados | 17 aprovados e ativos: 16 participantes e 1 administrador |
| legado | `"Palpites"` e `sincronizacoes` com zero registros |
| operação | 308 registros em `api_sync_log`, 1 cache de classificação e 1 configuração |
| integridade básica | nenhum palpite sem usuário, jogo ou placar; nenhum jogo sem rodada, início, times ou IDs externos |
| perfil | 4 perfis sem celular; nenhum perfil ativo sem time favorito; 4 autorizações sem celular e 16 sem time favorito |
| correspondência cadastral | nenhum e-mail de perfil sem autorização correspondente e vice-versa; nenhum grupo de nomes duplicados |

Há 175 jogos sem placar completo, resultado compatível com os 170 agendados e 5 adiados observados. Essa associação é uma inferência agregada; nenhuma linha foi inspecionada.

### Distribuição de palpites por rodada

| Rodada | Palpites |
| --- | ---: |
| 20 | 50 |
| 21 | 104 |
| 22 | 110 |
| 23 | 21 |
| 24 | 10 |
| 25 | 1 |

As demais rodadas estavam sem palpites na fotografia consultada.

## Correspondência preliminar com o Rigazzo

| Origem 2026 | Modelo Rigazzo R02 | Observação para a R04 |
| --- | --- | --- |
| contexto fixo Brasileirão 2026 | Competition + Season | O contexto hoje implícito deverá tornar-se explícito |
| nomes e IDs de times nos jogos/cache | Team | Será necessário definir identidade canônica e deduplicação |
| `jogos` | Match | Preservar ID externo, rodada, horários, estados e resultados |
| bolão único implícito | League | Snapshot deverá declarar a liga de destino sem inferi-la silenciosamente |
| `participantes` + cadastro autorizado | Participant + Membership | Separar conta global, perfil e vínculo com a liga |
| `palpites` | Prediction | Preservar unicidade por liga, participante e partida e o sigilo aplicável |
| logs e operações de exportação futuras | Audit | Logs atuais não substituem a auditoria do pacote/importação |
| ranking e estatísticas calculados | derivados no Rigazzo | Comparar por palpite e por jogo antes do ranking final |

Esta correspondência não define o formato do snapshot; essa decisão pertence à R04 no repositório Rigazzo.

## Consultas executadas na R03C

Esta lista foi autorizada e integralmente respeitada na verificação remota:

1. metadados de schemas, tabelas, views, colunas, tipos, nulabilidade, defaults, chaves, índices e relações dos objetos já listados;
2. definições e privilégios das views e funções já listadas, sem executá-las;
3. estado de RLS, políticas e grants dos objetos já listados;
4. contagens agregadas e distribuições não identificáveis descritas em **Volumes**;
5. contagens de nulos e distintos para avaliar completude, sem retornar valores de nome, e-mail, celular, UUID, palpites individuais, erros ou detalhes de logs;
6. verificação da existência ou ausência de tabelas canônicas de times, pontuação e ranking.

Permanecem proibidos:

- `insert`, `update`, `delete`, `upsert`, DDL, RPC funcional ou qualquer comando com efeito colateral;
- seleção de linhas, amostras ou valores individuais;
- chamada de Netlify Functions ou da API esportiva;
- leitura de tokens, sessões, credenciais, variáveis de ambiente ou conteúdo de `auth.users`;
- gravação de resultados no Rigazzo ou criação de arquivos de exportação;
- correção de schema, RLS, função, dado ou inconsistência encontrada.

Nenhuma necessidade fora dessa lista foi encontrada.

## Observações de governança e segurança

A R03 não é uma auditoria de segurança, mas o catálogo revelou itens que não devem ser ignorados em etapas futuras:

- existem políticas sobrepostas e legadas para jogos, palpites e cadastros autorizados;
- `palpites_publicos` usa o fechamento por horário, enquanto `palpites_encerrados_publicos` exige encerramento oficial;
- grants de relações e de várias funções são mais amplos que o uso atual aparente, inclusive para `anon` ou `PUBLIC`; RLS e validações internas podem restringir o efeito, mas isso não foi testado nesta entrega;
- `ranking` e `pontuacoes_detalhadas` são derivados por nome/usuário e podem não ser a melhor fonte canônica para migração;
- o banco mantém objetos legados sem dados que poderiam ser confundidos com as fontes atuais.

Esses pontos não autorizam correções no Bolão 2026 e não bloqueiam a elaboração do contrato R04. Antes de implementar o exportador real na R06, porém, o plano deverá selecionar explicitamente as fontes atuais e avaliar a superfície mínima de leitura.

## Limitações e próximo portão

- o baseline completo do banco não está versionado neste repositório;
- o inventário remoto representa o estado observado e não um snapshot transacional congelado;
- não foram executados testes de permissões como usuários `anon`, autenticado ou administrador;
- não foram lidos corpos de funções fora das três regras estritamente necessárias para pontuação e fechamento;
- tamanhos físicos foram observados apenas como apoio operacional e não definem o tamanho do futuro pacote;
- nenhuma decisão sobre inclusão, pseudonimização, criptografia ou consentimento do snapshot é tomada aqui.

A R03 está consolidada como inventário da origem. O próximo portão pertence ao repositório Rigazzo: planejar a R04 para definir o Contrato de Snapshot 2026 v1 com exemplos exclusivamente sintéticos. Esta conclusão não autoriza exportação, importação, consentimento, acesso adicional ao Supabase nem alteração funcional em qualquer dos dois produtos.
