# Plano de migração da API esportiva

## Estado do documento

- **Natureza:** plano arquitetural e operacional interno.
- **Estado:** migração em andamento; gravação controlada da Fase 5B.2 aplicada
  e validada; corte não autorizado.
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
| 5B. Sombra de rodada completa | concluída | rodada 25 integralmente observada, reconciliada e auditada |
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

## Portão concluído — Reconciliação seca da Fase 5B.1

Em 2026-08-25, uma única consulta autenticada retornou as 380 fixtures da
temporada, com paginação completa, IDs únicos e rodadas de 1 a 38. O payload
bruto permaneceu somente na memória do tester. Foram extraídos para o motor
local apenas fixture, rodada, horário, mandante, visitante e IDs dos times.

O motor comparou esses dados com os 380 jogos canônicos do Supabase usando
temporada, rodada, mando, aliases explícitos e tolerância máxima aprovada de
trinta minutos. O resultado foi:

- 255 correspondências inequívocas;
- 125 jogos bloqueados somente por diferença de horário superior à tolerância;
- nenhuma ambiguidade, duplicidade, inversão de mando, conflito de ID ou falha
  estrutural;
- todos os 255 jogos aceitos com diferença de horário igual a zero;
- rodada 24 integralmente reconciliada;
- bloqueios concentrados em um jogo da rodada 15, quatro da rodada 21 e todos
  os jogos das rodadas 27 a 38;
- 55 diferenças entre uma e 23 horas e 70 entre um e seis dias;
- hash da reconciliação aceita
  `eba86a38c9514427d04d2d23547ce25c5366547d5051c014bbb35dbc0c0bbe1f`.

Foram confirmados aliases explícitos para Atlético-MG, Athletico-PR,
RB Bragantino, Remo, Chapecoense, Grêmio, São Paulo, Vasco da Gama e Vitória.
Não foi usada correspondência aproximada por texto.

A distribuição mostra que a identidade esportiva coincide, mas parte da agenda
futura ainda diverge entre as fontes. A política de falha segura foi mantida:
os 125 casos não foram aceitos automaticamente. Após a execução, os quatro
campos auxiliares continuaram nulos nos 380 jogos e nenhuma tabela de transição
ou competitiva foi escrita.

## Portão concluído — Gravação controlada da Fase 5B.2

A retomada deve começar por uma tarefa nova e exclusiva para a Fase 5B.2. A
recomendação técnica registrada é gravar somente as 255 correspondências
inequívocas, preservando os campos dos outros 125 jogos nulos até a convergência
da agenda. Nenhum ID pode ser gravado antes da aprovação explícita desse plano
de dados e de sua execução atômica, auditável e reversível.

O plano da 5B.2 deve, no mínimo:

- reproduzir ou validar o conjunto aceito pelo hash registrado na 5B.1;
- bloquear qualquer correspondência nova, alterada ou fora da tolerância sem
  revisão humana;
- gravar somente `api_football_id`, `api_football_time_casa_id`,
  `api_football_time_fora_id` e a origem auxiliar prevista no modelo;
- preservar `id_jogo`, horários canônicos, resultados e demais dados
  competitivos;
- registrar estado anterior e posterior suficiente para auditoria e rollback;
- confirmar ao final 255 jogos mapeados, 125 ainda nulos e nenhuma alteração
  fora dos campos auxiliares autorizados.

Em 2026-08-25, a reprodução protegida da reconciliação confirmou novamente 255
mapeamentos aceitos, 125 bloqueados e o hash
`eba86a38c9514427d04d2d23547ce25c5366547d5051c014bbb35dbc0c0bbe1f`.
Foram preparados localmente:

- a migração transacional
  `supabase/migrations/20260825050228_gravacao_mapeamentos_api_football_5b2.sql`;
- o rollback operacional não automático
  `supabase/rollback/rollback_gravacao_mapeamentos_api_football_5b2.sql`;
- o gerador determinístico e o teste que recalcula o hash diretamente das 255
  linhas materializadas.

A migração bloqueia execução diante de estado inicial divergente, grava somente
os quatro campos auxiliares autorizados, exige 255 linhas atualizadas, preserva
125 linhas nulas, compara hashes dos campos competitivos antes e depois e inclui
auditoria na mesma transação. O rollback exige a auditoria original e os valores
posteriores intactos antes de restaurar os quatro campos para nulo.

Em 2026-08-25, após autorização humana específica, a migração foi aplicada pelo
conector oficial do Supabase e registrada remotamente como `20260825050228`.
As validações posteriores confirmaram 255 mapeamentos completos, 125 jogos com
os quatro campos auxiliares nulos, zero preenchimentos parciais, 255 fixtures
distintas, um único instante de mapeamento e o mesmo hash aprovado. A auditoria
contém 255 linhas mapeadas e 125 IDs bloqueados; os hashes do estado competitivo
antes e depois são iguais.

Ponto de retomada confirmado em 2026-08-25: a Fase 5B.2 está concluída. Não
houve deploy, troca da fonte oficial, alteração de palpites, resultados,
horários ou demais dados competitivos. A Fase 5B.3 continua sujeita a tarefa,
plano e autorização próprios.

Depois dos mapeamentos aprovados, a Fase 5B.3 deve observar uma rodada completa
com jogos e classificação conforme o orçamento e as regras operacionais
aprovados.

### Núcleo inativo da Fase 5B.3A

O núcleo técnico da observação de rodada foi implementado sem Function pública,
cron, deploy, chamada real ao fornecedor ou escrita no Supabase remoto. O módulo
prepara uma consulta de fixtures por data e ciclo, reconcilia exclusivamente IDs
auxiliares já aprovados, normaliza jogos e classificação e limita a persistência
às três tabelas de transição.

As políticas executáveis cobrem a janela de quinze minutos antes do primeiro
jogo até trinta minutos após o último horário, a extensão de cinco em cinco
minutos por até noventa minutos, as reservas de 20% da cota diária e 10% da cota
por minuto e a interrupção diante de identidade divergente, estado desconhecido,
resposta inválida ou persistência malsucedida. O fuso da data esportiva é
explicitamente `America/Sao_Paulo`.

Este núcleo não ativa a Fase 5B.3B. A seleção da rodada, a Function agendada, a
configuração do cron, o deploy e o início das chamadas continuam bloqueados até
preflight e autorização operacional próprios.

### Ativação preparada da Fase 5B.3B.1

O preflight somente leitura de 2026-08-25 selecionou a rodada 25: dez jogos
futuros, dez mapeamentos completos e três datas esportivas, de 29 a 31 de
agosto. A implementação prepara uma Function agendada a cada minuto, mas exige
simultaneamente ativação explícita, campanha, rodada e datas válidas; na ausência
de qualquer requisito, encerra sem chamada ao fornecedor e sem escrita.

O acionador aplica a janela e a cadência aprovadas, impede repetição pelo minuto
da campanha, observa no máximo duas tentativas adicionais, interrompe após três
falhas consecutivas e coleta classificação somente nos marcos de início e fim de
cada data. Identidade, competição, temporada, rodada e diferença de agenda de no
máximo trinta minutos são revalidadas em cada ciclo. O cache oficial da
classificação precisa conter vinte clubes e ter no máximo uma hora.

Uma migração aditiva acrescenta apenas a chave opcional de idempotência a
`transicao_api_execucoes`, com índice único parcial e sem ampliar permissões. A
aplicação foi autorizada e registrada no Supabase como `20260825060519`; as
validações preservaram RLS, privilégios, contagens de sombra, 255 mapeamentos
completos e 125 integralmente nulos. A Function e o cron foram integrados, mas
as variáveis permanecem ausentes e a coleta continua desativada. Deploy
operacional e início da 5B.3B.2 ainda exigem autorização própria.

### Metadados opcionais preparados na Fase 5B.3B.2A

Antes da ativação da rodada 25, a coleta foi ampliada localmente para preservar
também nome e cidade do local, URLs de escudo e códigos de time observados na
mesma resposta de fixtures. Esses valores são opcionais, não geram chamadas
adicionais, não participam da autoridade competitiva e nunca são promovidos
automaticamente para `public.jogos`.

A migração aditiva acrescenta seis colunas anuláveis somente a
`transicao_api_jogos`. A fotografia da fonte oficial reutiliza exclusivamente
local e escudos já disponíveis em `public.jogos`; cidade e códigos permanecem
nulos quando não estão persistidos, sem inferência por aliases. Apelidos, nomes
de exibição e siglas canônicas ficam reservados a um futuro catálogo de clubes,
que não integra esta fase.

A aplicação remota foi autorizada e registrada como `20260825151356`. A
validação confirmou as seis colunas anuláveis e comentadas, RLS preservada,
ausência de privilégios públicos, privilégios mínimos do `service_role`, hash
competitivo inalterado, 255 mapeamentos completos, 125 integralmente nulos e as
contagens anteriores das tabelas sombra. Nenhuma coleta foi iniciada.

A simulação operacional e a ativação da campanha continuam submetidas a portões
independentes. O rollback por remoção das colunas é seguro antes da primeira
evidência real; depois dela, a campanha deve ser desativada e a auditoria
preservada antes de qualquer remoção.

Uma segunda rodada será exigida somente se a primeira tiver cobertura
incompleta, divergência material sem explicação ou deixar sem observação algum
marco relevante de primeiro tempo, intervalo, segundo tempo, acréscimos ou
encerramento. A implementação, o agendamento e qualquer preenchimento de IDs
exigem plano técnico e aprovação próprios.

### Portão visual da Fase 5B.3C

As URLs de escudo observadas na rodada são evidência, não autoridade visual. A
Fase 5B.3C introduz uma auditoria local e somente leitura que consolida cada
clube pelo ID da API-Football, compara a URL observada com o escudo canônico e
verifica HTTPS, disponibilidade, tipo de conteúdo, tamanho do arquivo,
dimensões, proporção e consistência entre observações.

Arquivos tecnicamente idênticos ao canônico podem ser aprovados de forma
determinística. Arquivos diferentes permanecem pendentes de comparação visual;
ausências, inconsistências e falhas técnicas são rejeitadas. Nenhum resultado
da auditoria promove URLs para `public.jogos`, altera a interface ou cria nova
tabela. Um catálogo canônico e a eventual cópia para armazenamento controlado
dependem de tarefa e aprovação próprias.

### Execução operacional da Fase 5B.3B.2

A campanha `5b3-round-25` foi ativada para observar os dez jogos da rodada 25,
distribuídos entre 29 e 31 de agosto de 2026. O estado de identidade permaneceu
em dez mapeamentos completos na rodada, 255 completos na temporada, 125
integralmente nulos e nenhum preenchimento parcial. A coleta grava somente nas
tabelas de transição e mantém a football-data.org como fonte oficial.

Em 29 de agosto, a primeira janela real revelou dois defeitos antes do corte. A
Function inicialmente falhou com `ReferenceError: data is not defined` ao
consultar o histórico da campanha. O hotfix do PR #169 corrigiu a referência,
acrescentou cobertura da janela ativa e restabeleceu a coleta. Depois, o jogo
Vasco 3 x 1 Cruzeiro terminou após a última fotografia elegível: às 23h15, a
API-Football mostrava 3 x 0 em 90+2 e a fonte oficial ainda mostrava 2 x 0. A
janela rígida de 120 minutos impediu uma fotografia terminal. A mesma análise
mostrou que o marco `inicio` era repetido quando saía das vinte execuções mais
recentes.

O hotfix do PR #170 separou a detecção permanente dos marcos da janela usada
para falhas consecutivas, removeu o prazo rígido do ciclo terminal e acrescentou
recuperação de data autorizada anterior sem marco `fim`. Após o deploy, a
execução 289 recuperou 29 de agosto com as duas fontes encerradas e concordantes
em 2 x 1, 2 x 1 e 3 x 1, registrou o marco `fim` uma única vez e, no minuto
seguinte, a campanha retomou os seis jogos de 30 de agosto. Durante
Athletico-PR 1 x 1 Fluminense, as duas fontes concordaram no intervalo e a
API-Football preservou 45+8; as seis primeiras execuções posteriores ao fix
tiveram sucesso, sem falha, duplicação ou nova repetição de classificação.

O relatório consolidado e as evidências reproduzíveis estão em
[Evidências operacionais da rodada 25](./EVIDENCIAS_API_FOOTBALL_RODADA_25.md).
Ao final de 31 de agosto, a campanha somou 846 execuções sem falhas, execuções
abertas ou chaves duplicadas e 8.258 fotografias válidas. Os dez jogos
terminaram com estados e placares concordantes nas duas fontes, diferença de
agenda zero e um marco `fim` por data depois da correção. Remo 2 x 3 Coritiba
encerrou a observação na execução 857.

O veredicto é favorável ao planejamento do próximo portão, sem exigir uma
segunda rodada com o mesmo contrato. Isso conclui a Fase 5B, mas não autoriza a
Fase 6: desativação da campanha, configuração da fonte, deploy, corte e rollback
continuam sujeitos a tarefas e autorizações independentes.

### Extensão planejada para eventos

A fotografia atual preserva placar e relógio observado, mas não persiste o
minuto específico de gols ou os demais eventos retornados pela API-Football. A
extensão aprovada para planejamento deverá criar uma tabela sombra própria e
capturar todos os tipos de evento disponíveis, mantendo campos originais e uma
normalização opcional. Gols, cartões, substituições, VAR, tipos desconhecidos e
correções posteriores deverão ser auditáveis e idempotentes.

A migração, a implementação e o reprocessamento da rodada 25 permanecem
sujeitos a plano e autorizações próprios. O relatório consolidado removeu apenas
essa dependência temporal; não iniciou persistência de eventos.

### Encerramento operacional da campanha

A campanha concluída deve ser desativada antes de preparar outro acionamento.
O procedimento deverá tornar `API_FOOTBALL_SHADOW_ENABLED` inativo, preservar
campanha, rodada e datas para rastreabilidade, manter toda a auditoria e
confirmar que nenhum novo registro foi criado depois da mudança. Reativar a
mesma chave de controle é o rollback operacional, mas somente dentro de nova
janela e autorização explícitas.

Esta documentação não executa a desativação. A mudança de variável no Netlify,
sua verificação e qualquer deploy formam um portão de produção separado.

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
- retenção e limpeza das tabelas de sombra;
- tratamento futuro dos IDs legados de times e partidas;
- momento de cancelar a assinatura antiga;
- destino das tabelas de transição após estabilização.
- estratégia de namespace do cache por fornecedor durante a sombra;
- estratégia para os 255 mapeamentos aceitos e os 125 horários divergentes;
- necessidade de nova sombra somente se o contrato mudar ou a futura extensão
  de eventos exigir evidência operacional própria.

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
| 2026-08-25 | 1.1 | Reconciliação seca da 5B.1 concluída; 255 jogos aceitos e 125 horários mantidos bloqueados |
| 2026-08-25 | 1.2 | Ponto de retomada da 5B.2 documentado com escopo mínimo, recomendação e portões de segurança |
| 2026-08-25 | 1.3 | Núcleo inativo da 5B.3A implementado; ativação da rodada permanece bloqueada |
| 2026-08-25 | 1.4 | Ativação fail-closed da 5B.3B.1 preparada para a rodada 25, ainda sem deploy ou coleta |
| 2026-08-25 | 1.5 | Metadados opcionais de local, escudos e códigos preparados na 5B.3B.2A, ainda sem aplicação remota |
| 2026-08-25 | 1.6 | Migração de metadados aplicada e reconciliada com a versão remota `20260825151356` |
| 2026-08-29 | 1.7 | Portão visual 5B.3C definido com auditoria técnica e revisão humana dos escudos |
| 2026-08-30 | 1.8 | Execução real da rodada 25, hotfixes #169 e #170, recuperação terminal e extensão de eventos registradas |
| 2026-08-31 | 1.9 | Rodada 25 consolidada com dez jogos concordantes; Fase 5B concluída e corte ainda bloqueado |

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
