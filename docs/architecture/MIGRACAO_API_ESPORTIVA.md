# Plano de migração da API esportiva

## Estado do documento

- **Natureza:** plano arquitetural e operacional interno.
- **Estado:** planejamento aprovado; migração ainda não autorizada.
- **Candidato em avaliação:** API-Football.
- **Fonte oficial atual:** football-data.org.
- **Última atualização:** 2026-08-24.

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
- definir ou executar agora a contratação comercial;
- implantar DDL, funções, variáveis ou rotinas de produção.

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

## Modelo de dados proposto

Tudo nesta seção é **PROPOSTO** e requer tarefa específica de Supabase, revisão
de segurança, migração aditiva e plano de rollback.

O desenho físico abaixo permanece candidato até a conclusão da Prova Externa
Instrumentada. A prova pode demonstrar que há campos desnecessários, ausentes ou
que duas tabelas atendem melhor do que três. Nenhuma tabela ou coluna deve ser
criada apenas porque aparece neste plano.

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

As tabelas são propostas no schema `public` porque o backend atual acessa o
Supabase pela API. Usar schema privado exigiria uma mudança arquitetural
adicional. Essa escolha deve ser confirmada na revisão de implementação.

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
cancelamento, prorrogação e encerramento, permanece **PENDENTE** até ser
documentado e testado contra respostas reais. Estados desconhecidos devem gerar
telemetria e falha segura, nunca inferência silenciosa.

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

## Critérios propostos de avanço

Os números abaixo são **PROPOSTOS** e precisam ser confirmados antes da fase de
sombra. Eles não autorizam corte automático.

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

Na verificação de 2026-08-24, a API-Football informava 100 chamadas diárias no
plano gratuito e 7.500 no primeiro plano pago. Esses valores são temporais e
devem ser reconfirmados antes de contratação ou teste prolongado. O plano
gratuito pode servir a ensaio curto, mas não deve ser presumido suficiente para
uma observação completa com frequência de um minuto.

## Fases e portões

| Fase | Estado em 2026-08-25 | Resultado necessário para avançar |
| --- | --- | --- |
| 0. Planejamento | concluída | plano aprovado e registrado |
| 1. Validação externa | concluída para contrato v1 | prova de uma partida registrada |
| 2. Adaptador puro e testes | não iniciada | contrato v1 executável, sem persistência |
| 3. Fundação no banco | não iniciada | migração aditiva revisada e aplicada |
| 4. Coleta em sombra | não iniciada | coleta isolada e observável |
| 5. Sombra pré-corte | não iniciada | 1–2 rodadas e critérios atendidos |
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

A recomendação foi “avançar” para o adaptador puro e seus testes. A fundação no
Supabase continua bloqueada até esse adaptador comprovar o contrato v1.

## Próximo portão — Adaptador puro e testes

A próxima entrega deve implementar, sem Supabase e sem integração com produção:

- validação do envelope da API-Football;
- normalização de jogos e classificação;
- mapa completo de estados conhecidos e falha segura para desconhecidos;
- precedência de placar, relógio e eventos;
- fixtures sanitizadas e testes das políticas contra regressão.

O contrato e os critérios estão em
[`CONTRATO_FONTE_ESPORTIVA.md`](CONTRATO_FONTE_ESPORTIVA.md).

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

- confirmação comercial e técnica do fornecedor definitivo;
- limites finais dos critérios de aceite;
- frequência de consulta ao vivo e orçamento de chamadas;
- localização e mecanismo da configuração da fonte oficial;
- tolerância de horário no mapeamento;
- retenção e limpeza das tabelas de sombra;
- tratamento futuro dos IDs legados de times e partidas;
- momento de cancelar a assinatura antiga;
- destino das tabelas de transição após estabilização.
- estratégia de namespace do cache por fornecedor durante a sombra;
- ferramenta e frequência da futura sombra de uma a duas rodadas.

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
