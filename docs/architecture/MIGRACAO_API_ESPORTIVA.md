# Plano de migração da API esportiva

## Estado do documento

- **Natureza:** plano arquitetural e operacional interno.
- **Estado:** migração em andamento; Fase 5A concluída; corte ainda não autorizado.
- **Candidato em avaliação:** API-Football.
- **Fonte oficial atual:** football-data.org.
- **Última atualização:** 2026-08-25.

Este documento é a referência canônica para retomar, executar e atualizar a
migração da fonte de dados esportivos. Ele foi escrito para reduzir dependência
do histórico de conversas e tornar inequívoco para agentes de IA o que está
decidido, o que é apenas proposta e quais ações exigem aprovação humana.

## Como usar este documento

Antes de qualquer trabalho relacionado à migração, ler, nesta ordem:

1. `AGENTS.md`;
2. `docs/ai/CODEX_WORKFLOW.md`;
3. este documento;
4. `docs/architecture/OVERVIEW.md` e os arquivos diretamente afetados;
5. as decisões relacionadas em `docs/ai/DECISION_LOG.md`.

As instruções humanas explícitas e as regras do repositório prevalecem sobre
este plano. Este documento **não autoriza** compra de assinatura, alteração de
banco, código, configuração, deploy, troca de fornecedor ou merge. Cada etapa
de implementação exige tarefa, plano, aprovação e validação próprios.

### Legenda de decisão

- **DECIDIDO:** princípio já aceito e que não deve ser alterado silenciosamente.
- **PROPOSTO:** desenho recomendado, ainda dependente de aprovação específica.
- **PENDENTE:** ponto que precisa de evidência ou decisão humana.
- **PROIBIDO:** ação fora do desenho aceito.

## Resumo executivo

O objetivo é avaliar e, se comprovadamente vantajoso, substituir a
football-data.org pela API-Football sem alterar identidades internas, palpites,
pontuação ou histórico. A principal motivação é obter um relógio de jogo mais
confiável e um conjunto de dados mais completo por um custo competitivo.

A transição será reversível. Durante um período curto, as duas APIs poderão ser
mantidas pagas, mas apenas uma será a fonte oficial da aplicação. A outra será
observada em sombra, sem escrever no estado competitivo. Não haverá solução
híbrida permanente nem composição de campos entre fornecedores.

A troca da fonte oficial deve ser atômica para jogos, classificação, cache,
diagnóstico, relatórios e sincronizações manual e agendada. Não é permitido
trocar apenas parte desse conjunto e manter dependências silenciosas da fonte
anterior.

## Estado atual e evidências conhecidas

### Aplicação e banco

- O Supabase continua sendo a fonte canônica do estado consumido pelo app.
- A integração atual consulta a football-data.org e atualiza o modelo existente.
- O identificador `public.jogos.id_jogo` é chave primária e é referenciado por
  palpites; ele deve permanecer estável.
- Inspeção somente leitura realizada em 2026-08-24 encontrou 380 jogos e 917
  palpites no ambiente consultado.
- O modelo atual já possui campos de estado, minuto, acréscimos e indicação de
  estimativa. A migração deve reutilizá-los, não criar uma segunda representação
  competitiva do mesmo conceito.

### Ensaio inicial da API-Football

- Foi possível consultar a competição brasileira de 2026 e uma partida real.
- A resposta expõe identificadores próprios e campos de estado, minuto decorrido
  e acréscimos.
- Esse ensaio confirma viabilidade técnica básica, mas **não** comprova ainda
  qualidade durante uma rodada completa, estabilidade, cobertura ou consumo de
  cota.
- Nenhuma chave ou credencial pode ser registrada neste documento, no código,
  em logs versionados ou em respostas.

### Prova Externa Instrumentada concluída

- A fixture 1492340, Botafogo 2 × 3 Athletico-PR, foi observada durante uma
  partida completa entre 2026-08-24 e 2026-08-25 UTC.
- A API informou de forma coerente `1H`, `HT`, `2H`, `FT`, minuto decorrido,
  acréscimos e placar corrente e final.
- Foram observados `45+3` no intervalo e `90+6` no encerramento.
- A lista de eventos veio temporariamente vazia ou incompleta e depois foi
  recomposta, enquanto estado e placar permaneceram coerentes.
- A prova recomenda avançar para adaptador puro e testes, sem persistência.
- A linha do tempo, os limites da evidência e o contrato resultante estão em
  [`CONTRATO_FONTE_ESPORTIVA.md`](CONTRATO_FONTE_ESPORTIVA.md).

## Objetivos

1. Validar a qualidade da API-Football para agenda, estado ao vivo, minutagem,
   placares, resultados e classificação.
2. Preservar integralmente jogos, palpites, pontuação e regras competitivas.
3. Possibilitar comparação objetiva entre fornecedores antes da troca.
4. Permitir retorno rápido ao fornecedor anterior durante a estabilização.
5. Evitar dependência permanente de dois fornecedores.

## Fora do escopo deste plano

- alterar regras de fechamento ou pontuação;
- redesenhar a Tela de Jogos ou o relógio apresentado ao participante;
- corrigir automaticamente dados históricos;
- substituir `public.jogos.id_jogo` por identificadores da nova API;
- expor detalhes comerciais, credenciais ou dados da conta do fornecedor;
- autorizar novas alterações de DDL, funções, variáveis ou rotinas de produção
  sem tarefa e aprovação específicas.

## Princípios aceitos

1. **DECIDIDO — Uma fonte oficial por vez.** Em qualquer instante, apenas um
   fornecedor pode escrever o estado esportivo oficial usado pelo Bolão.
2. **DECIDIDO — Sombra sem efeito competitivo.** Dados de sombra servem somente
   para observação e comparação; não alteram jogos, palpites, pontuação,
   classificação do Bolão ou interface do participante.
3. **DECIDIDO — Identidade interna preservada.** `public.jogos.id_jogo` continua
   sendo a identidade interna, independentemente do fornecedor.
4. **DECIDIDO — Sem mistura de campos.** Não usar, por exemplo, placar de uma API
   e minuto da outra na mesma visão oficial.
5. **DECIDIDO — Mudanças aditivas e reversíveis.** O desenho deve manter o
   caminho de retorno enquanto durar a estabilização.
6. **DECIDIDO — Evidência antes do corte.** A troca só pode ocorrer depois dos
   critérios de aceite definidos e de aprovação humana explícita.
7. **DECIDIDO — Candidato, não escolha irrevogável.** A API-Football é o candidato
   atual; a adoção definitiva depende do teste de sombra.

## Autoridade das fontes por fase

| Fase | Fonte oficial | Fonte de sombra | Pode escrever em `public.jogos`? |
| --- | --- | --- | --- |
| Antes do corte | football-data.org | API-Football | somente a oficial |
| Após o corte, estabilização | API-Football | football-data.org | somente a oficial |
| Operação estabilizada | API-Football | nenhuma por padrão | somente a oficial |

O período de sombra previsto é de **uma a duas rodadas antes do corte** e de
**uma a duas rodadas após o corte**. A duração exata depende da qualidade das
evidências e deve ser decidida no portão de cada fase.

Durante a sombra, snapshots, caches e relatórios precisam identificar o
fornecedor explicitamente. Um cache produzido por uma fonte não pode ser lido
como se tivesse sido produzido pela outra. A configuração da fonte oficial deve
ser única e controlar, no mínimo, jogos, classificação, diagnóstico e os dois
modos de sincronização.

## Contrato interno normalizado

**DECIDIDO:** antes de qualquer escrita de sombra ou troca de fornecedor, deve
existir um contrato interno independente das respostas externas:

```text
Resposta do fornecedor
        ↓
Adaptador específico
        ↓
Jogo ou classificação normalizados
        ↓
Reconciliação com a identidade interna
        ↓
Persistência autorizada
```

O adaptador é a única camada autorizada a conhecer nomes de campos, códigos de
estado e formatos próprios do fornecedor. Regras como “se API-Football” não
devem se espalhar por sincronização, cache, diagnóstico ou interface.

O contrato deve preservar os conceitos já consumidos pela aplicação e separar:

- identidade externa da identidade interna;
- estado bruto do estado normalizado;
- minuto oficial do relógio estimado existente;
- instante informado pelo fornecedor do instante em que o Bolão observou o dado;
- payload competitivo do diagnóstico operacional.

A versão 1.0 está fechada em
[`CONTRATO_FONTE_ESPORTIVA.md`](CONTRATO_FONTE_ESPORTIVA.md). Alterações
incompatíveis exigem nova versão, decisão e aprovação.

## Modelo de dados da transição

A fundação descrita nesta seção foi implementada e aplicada mediante tarefas,
revisões e aprovações específicas. Qualquer ampliação continua exigindo tarefa
própria de Supabase, revisão de segurança, migração aditiva e plano de rollback.

O desenho físico foi refinado após a Prova Externa Instrumentada e a auditoria
somente leitura do Supabase. A migração local da fundação está em
`supabase/migrations/20260825021432_fundacao_sombra_api_football.sql` e foi
aplicada no Supabase após revisão e aprovação específicas.

### Campos aditivos em `public.jogos`

| Campo | Tipo proposto | Finalidade |
| --- | --- | --- |
| `api_football_id` | `bigint` | ID da partida no novo fornecedor |
| `api_football_time_casa_id` | `bigint` | ID do mandante no novo fornecedor |
| `api_football_time_fora_id` | `bigint` | ID do visitante no novo fornecedor |
| `api_football_mapeado_em` | `timestamptz` | instante da confirmação do mapeamento |

Recomendações associadas:

- índice único parcial para `api_football_id` quando não nulo;
- campos inicialmente anuláveis;
- preenchimento somente após reconciliação determinística;
- nenhuma alteração do significado dos identificadores atuais durante a sombra;
- não criar novos campos de minuto, placar ou estado se os atuais comportarem o
  valor normalizado.

### Tabela `public.transicao_api_execucoes`

Uma linha por execução comparativa.

Campos propostos: `id`, `fase`, `fonte_oficial`, `fonte_sombra`,
`iniciada_em`, `concluida_em`, sucesso por fornecedor, duração por fornecedor,
quantidade de chamadas, cota informada pela sombra, totais de registros, erros
sanitizados e `detalhes jsonb`.

### Tabela `public.transicao_api_jogos`

Uma fotografia normalizada de cada jogo observado em cada fornecedor.

Campos propostos: `execucao_id`, `fornecedor`, `id_jogo`, `id_externo`, IDs e
nomes dos times observados, competição, temporada, rodada, início previsto,
estado bruto, estado normalizado, minuto, acréscimos, placares, instante da
atualização do fornecedor, hash do conteúdo relevante, campos ausentes, erro de
normalização e indicador de validade.

Restrições propostas:

- FK de `id_jogo` para `public.jogos`;
- unicidade em `(execucao_id, fornecedor, id_jogo)`;
- nenhuma FK competitiva apontando da aplicação para esta tabela.

### Tabela `public.transicao_api_classificacoes`

Uma fotografia normalizada da classificação por execução e fornecedor.

Campos propostos: `id`, `execucao_id`, `fornecedor`, competição, temporada,
rodada informada, instante observado, quantidade de times, conteúdo normalizado
em `jsonb`, hash, validade e erro sanitizado. Recomenda-se unicidade por
`(execucao_id, fornecedor)`.

### Segurança e exposição

- RLS habilitada desde a criação.
- `REVOKE` explícito de tabela e sequência para `anon` e `authenticated`.
- Sem políticas de leitura ou escrita para `anon` e `authenticated`.
- Acesso apenas por função de backend com `service_role`.
- Confirmação das configurações de schemas expostos na Data API.
- Privilégios mínimos explícitos para o backend, sem depender apenas da ausência
  de políticas RLS.
- Nenhuma função administrativa exposta ao navegador; se uma função privilegiada
  for indispensável, ela exige revisão específica de schema, `EXECUTE` e papel.
- Não armazenar credenciais, dados pessoais, palpites nem payload bruto sem
  necessidade demonstrada.
- Preferir dados normalizados e hashes para reduzir retenção e exposição.

As tabelas ficam no schema `public` porque o backend atual acessa o Supabase
pela Data API. A auditoria confirmou que o schema `private` existente não
concede `USAGE` ao `service_role`; usá-lo exigiria RPC privilegiada ou outra
mudança arquitetural. Em `public`, as tabelas permanecem isoladas por RLS sem
políticas, revogações explícitas para `PUBLIC`, `anon` e `authenticated`, e
privilégios mínimos explícitos para `service_role`.

Não criar inicialmente uma quarta tabela de divergências: as divergências devem
ser derivadas das fotografias. Persisti-las só se houver necessidade operacional
comprovada.

## Mapeamento e normalização

O adaptador de cada fornecedor deve produzir o mesmo contrato interno. No caso
da API-Football, devem ser avaliados pelo menos:

- fixture ID → `api_football_id`;
- team IDs → IDs auxiliares do fornecedor;
- data e fuso da partida → horário canônico existente;
- status bruto → estado interno do jogo;
- `elapsed` e `extra` → minuto e acréscimos existentes;
- gols e placares por período → campos de placar existentes;
- posição, pontos, jogos e critérios da tabela → classificação normalizada.

O contrato normalizado também deve ser usado pela classificação, pelo cache e
pelo diagnóstico. Esses consumidores não podem interpretar diretamente o
payload de um fornecedor.

O mapa completo de estados, incluindo intervalo, adiamento, suspensão,
cancelamento, prorrogação e encerramento, está implementado e testado no
contrato v1. Estados desconhecidos geram diagnóstico e falha segura, nunca
inferência silenciosa.

## Reconciliação de identidades

O mapeamento inicial deve comparar temporada, rodada, mandante, visitante e
horário, com tolerância de horário explicitamente definida. O processo deve:

1. gerar candidatos sem alterar `public.jogos`;
2. aceitar automaticamente apenas correspondências inequívocas;
3. deixar nulos os casos ambíguos;
4. produzir relatório para revisão humana;
5. gravar os IDs novos somente após aprovação da reconciliação.

Meta proposta: mapear os 380 jogos da temporada, ou documentar individualmente
qualquer exceção antes do corte.

Regras adicionais:

- identificadores externos nunca se tornam chaves competitivas;
- mapeamentos ambíguos permanecem nulos;
- alteração posterior de time, horário ou rodada não pode remapear
  automaticamente um jogo já confirmado;
- todo remapeamento exige evidência, revisão humana e registro auditável.

## Critérios de avanço da Fase 5

Os critérios abaixo foram confirmados para a sombra pré-corte. Eles não
autorizam corte automático.

- cobertura de todos os jogos da rodada observada;
- mapeamento de 100% dos jogos, salvo exceção aprovada e documentada;
- estados e placares finais compatíveis, sem divergência crítica inexplicada;
- minutagem disponível e coerente em pelo menos 95% das observações nas quais o
  fornecedor declara a partida em andamento;
- minuto sem regressões indevidas e coerente com o estado do período;
- atraso de atualização medido entre observações e eventos conferíveis;
- `elapsed` e `extra` interpretados separadamente e validados nos dois tempos;
- transições de primeiro tempo, intervalo, segundo tempo e encerramento
  observadas sem regressões críticas;
- amostras manuais nos principais marcos comparadas com transmissão ou fonte
  independente, sem transformar essa conferência em integração híbrida;
- classificação com 20 times e linhas normalizadas reconciliadas;
- consumo de cota e frequência de atualização sustentáveis no plano contratado;
- ausência de impacto nos palpites, pontuação e disponibilidade do app.

Toda divergência precisa ser classificada como diferença legítima de atualização,
erro de normalização, ausência do fornecedor ou erro de identidade. O portão de
troca exige relatório e decisão humana explícita.

### Orçamento de chamadas

A validação deve estimar e medir separadamente chamadas de agenda, jogos ao vivo,
classificação, repetição por falha e margem operacional. Também deve registrar
os cabeçalhos de cota diária e limite por minuto retornados pelo fornecedor.

Em 2026-08-25 foi confirmada no painel uma assinatura Pro ativa por três meses.
O endpoint de status confirmou 7.500 chamadas diárias, e a documentação oficial
vigente informa limite de 300 chamadas por minuto, ou cinco por segundo. Esses
limites devem ser lidos dos cabeçalhos em produção e tratados como informação
temporal, não como constante permanente do código.

Para a primeira rodada, o desenho aprovado usa uma consulta de fixtures por
data e competição a cada minuto durante a janela ativa, em vez de uma chamada
por jogo. Em cenário conservador de cinco datas com quatro horas totais de
janela ativa por data, são 1.200 chamadas de jogos. Agenda, classificação,
verificações finais e
até 10% de repetição mantêm a estimativa abaixo de 1.350 chamadas por rodada.

Regras operacionais para a implementação da Fase 5B:

- atualizar agenda uma vez ao dia e antes da abertura de cada janela ativa;
- consultar jogos do dia a cada minuto, quinze minutos antes do primeiro jogo até
  trinta minutos após o último horário previsto;
- se ainda houver jogo não terminal, consultar a cada cinco minutos por no
  máximo noventa minutos adicionais;
- coletar classificação no início e no fim de cada data com jogos, respeitando
  a recomendação do fornecedor de atualização horária;
- permitir no máximo duas repetições com espera progressiva, sem acumular
  chamadas entre ciclos;
- reservar 20% da cota diária e 10% do limite por minuto; ao atingir uma dessas
  reservas, interromper a sombra e registrar a execução incompleta;
- interromper também após três falhas consecutivas, resposta inválida, estado
  desconhecido, conflito de identidade ou falha de persistência;
- nunca compensar uma interrupção escrevendo em tabelas competitivas ou
  recorrendo a uma composição híbrida de fornecedores.

## Fases e portões

| Fase | Estado em 2026-08-25 | Resultado necessário para avançar |
| --- | --- | --- |
| 0. Planejamento | concluída | plano aprovado e registrado |
| 1. Validação externa | concluída para contrato v1 | prova de uma partida registrada |
| 2. Adaptador puro e testes | concluída | contrato v1 executável, sem persistência |
| 3. Fundação no banco | concluída | migração aditiva revisada e aplicada |
| 4. Coleta em sombra | concluída | duas provas reais isoladas, válidas e revisadas |
| 5A. Acesso e desenho operacional | concluída | cobertura, limites e orçamento confirmados |
| 5B. Sombra de rodada completa | não iniciada | 1 rodada completa e critérios atendidos; segunda se necessária |
| 6. Corte controlado | não iniciada | aprovação explícita e rollback pronto |
| 7. Sombra pós-corte | não iniciada | 1–2 rodadas sem regressão material |
| 8. Encerramento | não iniciada | decisão sobre retirada do legado e dados sombra |

Cada fase deve ser uma tarefa separada quando envolver riscos, permissões ou
artefatos diferentes. O estado desta tabela só deve mudar com evidência datada.

## Portão concluído — Prova Externa Instrumentada

A partida real foi observada sem escrever no Supabase, sem alterar o app e sem
mudar a fonte oficial. A evidência completa está no contrato normalizado.

### Escopo mínimo

1. coletar periodicamente a partida durante toda a janela relevante;
2. registrar fora do banco de produção: instante da consulta, fixture ID,
   estado, `elapsed`, `extra`, placar, instante informado pelo fornecedor,
   duração, erro e cota restante;
3. conferir manualmente início, intervalo, retorno do segundo tempo, acréscimos,
   encerramento e gols quando existirem;
4. consultar uma classificação para validar cobertura e contrato;
5. produzir relatório de cobertura, coerência, atraso, chamadas e lacunas de
   normalização.

### Restrições

- nenhum dado da prova pode alimentar `public.jogos` ou a classificação oficial;
- credenciais ficam apenas em variável de ambiente local ou protegida;
- capturas brutas não entram no Git e devem ser sanitizadas se usadas como
  evidência;
- o coletor e sua frequência exigem plano de implementação próprio;
- a criação de tabelas de sombra permanece bloqueada até a revisão do relatório.

### Critério de saída atendido

A recomendação foi “avançar” para o adaptador puro e seus testes. Esse adaptador
comprovou o contrato v1 localmente, sem rede, credenciais ou persistência.

## Portão concluído — Adaptador puro e testes

A entrega implementou, sem Supabase e sem integração com produção:

- validação do envelope da API-Football;
- normalização de jogos e classificação;
- mapa completo de estados conhecidos e falha segura para desconhecidos;
- precedência de placar, relógio e eventos;
- fixtures sanitizadas e testes das políticas contra regressão.

O contrato e os critérios estão em
[`CONTRATO_FONTE_ESPORTIVA.md`](CONTRATO_FONTE_ESPORTIVA.md).

## Portão concluído — Fundação no banco

A migração aditiva foi aplicada com rollback documentado e testes estáticos.
As quatro colunas auxiliares de `public.jogos` permanecem nulas, a tabela de
classificações de transição permanece vazia e o acesso direto continua limitado
ao `service_role`. As tabelas de execuções e jogos agora contêm somente as
evidências isoladas descritas abaixo. A fundação não autoriza trocar a fonte
oficial.

## Portão concluído — Coleta em sombra

O primeiro recorte de coleta isolada e observável foi implantado e validado sem
escrever estado competitivo e sem alterar a fonte oficial.

### Primeiro recorte implementado

O coletor manual de uma partida foi implementado em
`netlify/functions/coletar-sombra-api-football.mjs`. Cada acionamento
administrativo faz no máximo uma chamada à API-Football, normaliza a resposta
pelo contrato v1 e grava somente uma execução e as fotografias comparativas em
`transicao_api_execucoes` e `transicao_api_jogos`.

Este recorte não agenda chamadas, não coleta classificação, não preenche os
campos auxiliares de `public.jogos` e não altera a fonte oficial. A Fase 4 só
será considerada concluída depois da configuração protegida da credencial, do
deploy aprovado e de uma prova real com evidências revisadas.

O acionamento do ensaio fica disponível somente no Diagnóstico do Sistema para
administradores. O controle exige confirmação, encaminha a sessão vigente à
Function e apresenta apenas o resumo sanitizado; não expõe chave, token ou
payload do fornecedor.

### Evidências reais revisadas em 2026-08-25

Foram executados dois ensaios administrativos, cada um com exatamente uma
chamada de coleta à API-Football e duas fotografias normalizadas, uma por
fornecedor:

| Execução | Jogo interno | Fixture | Comparação revisada | Resultado |
| --- | ---: | ---: | --- | --- |
| 1 | 554970 | 1492340 | Botafogo 2 × 3 Athletico-PR; `finished` nas duas fontes; API-Football em `FT`, `90+6`, intervalo 0 × 2 | duas fotografias válidas, sem campos ausentes ou erros |
| 2 | 554969 | 1492339 | Vitória 1 × 0 Botafogo; `finished` nas duas fontes; API-Football em `FT`, `90+4`, intervalo 1 × 0 | duas fotografias válidas, sem campos ausentes ou erros |

As duas execuções registraram sucesso oficial e sombra, um jogo por fonte e
nenhum erro de normalização. Diferenças apenas nominais, como `Vitória` versus
`Vitoria` e `Paranaense` versus `Atletico Paranaense`, não afetaram o pareamento
confirmado por identidade, rodada, horário e placar. Nenhuma execução escreveu
em `public.jogos`, palpites, pontuação, classificação oficial ou interface do
participante.

A cota observada passou de 88 para 81 chamadas restantes entre as duas provas.
Essa diferença inclui consultas auxiliares no tester para localizar e confirmar
fixtures; cada registro de coleta em sombra contabilizou somente uma chamada.

### Limitação confirmada do ensaio gratuito

O plano gratuito permitiu consultar fixtures conhecidas por ID, mas bloqueou a
listagem livre da temporada 2026 e restringiu consultas por data a uma janela
curta. Portanto, ele é suficiente para provas pontuais com IDs previamente
confirmados, mas não deve ser tratado como base operacional da sombra pré-corte.

## Portão concluído — Acesso e desenho operacional da Fase 5A

Em 2026-08-25, o tester autenticado confirmou, com respostas sem erro:

- plano Pro ativo e limite diário de 7.500 chamadas;
- competição 71, Serie A do Brasil, com temporada 2026 ativa e cobertura de
  fixtures, eventos, escalações, estatísticas, jogadores e classificação;
- 38 rodadas disponíveis em uma página;
- 380 fixtures da temporada disponíveis em uma única consulta e uma página;
- dez fixtures na rodada consultada, também em uma página;
- consulta por data sem a restrição temporal observada no plano gratuito;
- consulta unitária por fixture preservando estado, minuto e acréscimos;
- classificação válida com vinte posições distintas em uma página.

A evidência remove o bloqueio comercial e técnico para descobrir fixtures e
comprova que uma chamada por ciclo pode cobrir todos os jogos de uma data. A
Fase 5A não alterou aplicação, Supabase, Netlify, agendamento, mapeamentos ou
fonte oficial e não persistiu payload bruto nem credencial.

## Próximo portão — Sombra pré-corte da Fase 5B

A Fase 5B deve primeiro reconciliar os 380 jogos sem escrita competitiva,
apresentar ambiguidades para revisão e gravar os IDs auxiliares somente após
aprovação específica. Depois, deve observar uma rodada completa com jogos e
classificação conforme o orçamento e as regras operacionais aprovados.

Uma segunda rodada será exigida somente se a primeira tiver cobertura
incompleta, divergência material sem explicação ou deixar sem observação algum
marco relevante de primeiro tempo, intervalo, segundo tempo, acréscimos ou
encerramento. A implementação, o agendamento e qualquer preenchimento de IDs
exigem plano técnico e aprovação próprios.

## Estratégia de rollback

Antes do corte, devem existir:

- seleção explícita da fonte oficial por configuração controlada;
- adaptador antigo preservado e validado;
- assinatura antiga ativa durante a estabilização;
- IDs internos e dados históricos intactos;
- procedimento testado para restaurar a fonte anterior;
- observabilidade suficiente para identificar regressão rapidamente.

Motivos propostos para rollback incluem indisponibilidade recorrente, perda de
cobertura, estados ou resultados incorretos, esgotamento inesperado de cota ou
impacto na atualização do Bolão. O retorno deve trocar a fonte oficial inteira;
não deve produzir operação híbrida.

## Ações proibidas

- trocar ou recalcular `public.jogos.id_jogo`;
- permitir que a sombra escreva em tabelas competitivas;
- combinar campos de dois fornecedores na resposta oficial;
- corrigir divergências automaticamente sem regra aprovada;
- registrar tokens, chaves ou payloads sensíveis;
- executar DDL, deploy, contratação ou corte com base apenas neste documento;
- remover o fornecedor antigo antes do fim da estabilização aprovada;
- alterar a Tela de Jogos como efeito lateral desta migração.

## Decisões pendentes

- limites finais do portão de corte após as evidências da Fase 5B;
- localização e mecanismo da configuração da fonte oficial;
- tolerância de horário no mapeamento;
- retenção e limpeza das tabelas de sombra;
- tratamento futuro dos IDs legados de times e partidas;
- momento de cancelar a assinatura antiga;
- destino das tabelas de transição após estabilização.
- estratégia de namespace do cache por fornecedor durante a sombra;
- resultado da reconciliação inicial dos 380 jogos;
- necessidade de uma segunda rodada de sombra após a primeira evidência completa.

## Protocolo de atualização para agentes

Ao retomar este tema, o agente deve:

1. confirmar branch, estado do Git e fontes obrigatórias;
2. localizar a fase atual nesta página e verificar evidências mais recentes;
3. distinguir explicitamente fatos, decisões, propostas e pendências;
4. não reinterpretar uma decisão aceita sem aprovação humana;
5. registrar evidências com data, ambiente e origem, sem segredos;
6. propor tarefa separada para cada mudança de banco, código, configuração ou
   produção;
7. atualizar esta página e o Decision Log quando uma decisão duradoura mudar;
8. preservar o histórico abaixo em vez de sobrescrever silenciosamente o plano.

Se houver conflito entre o estado real e este documento, parar a implementação,
registrar a divergência e pedir decisão humana antes de prosseguir.

## Histórico do documento

| Data | Versão | Alteração |
| --- | --- | --- |
| 2026-08-24 | 0.1 | Plano inicial da avaliação e migração controlada |
| 2026-08-24 | 0.2 | Contrato normalizado, segurança, prova externa e critérios refinados |
| 2026-08-25 | 0.3 | Evidência ao vivo, contrato v1 e adaptador puro como próximo portão |
| 2026-08-25 | 0.4 | Adaptador puro validado e fundação no banco definida como próximo portão |
| 2026-08-25 | 0.5 | Fundação modelada em migração local, ainda não aplicada no Supabase |
| 2026-08-25 | 0.6 | Fundação aplicada e validada; coleta em sombra definida como próximo portão |
| 2026-08-25 | 0.7 | Coletor manual unitário implementado; prova real permanece como portão da Fase 4 |
| 2026-08-25 | 0.8 | Acionador administrativo definido para viabilizar a primeira prova real autenticada |
| 2026-08-25 | 0.9 | Duas coletas reais revisadas; Fase 4 concluída e sombra pré-corte definida como próximo portão |
| 2026-08-25 | 1.0 | Plano Pro confirmado; Fases 5A e 5B separadas; acesso, cobertura e orçamento da 5A validados |

## Referências internas

- [Visão geral da arquitetura](./OVERVIEW.md)
- [Contrato normalizado da fonte esportiva](./CONTRATO_FONTE_ESPORTIVA.md)
- [Fluxo de trabalho do Codex](../ai/CODEX_WORKFLOW.md)
- [Registro de decisões](../ai/DECISION_LOG.md)
- [Recuperação competitiva](./RECUPERACAO_COMPETITIVA.md)

## Referências externas

- [Documentação da API-Football](https://www.api-football.com/documentation-v3)
- [Planos da API-Football](https://www.api-football.com/pricing)
- [Documentação da football-data.org](https://www.football-data.org/documentation/quickstart)
