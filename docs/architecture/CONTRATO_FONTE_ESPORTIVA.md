# Contrato normalizado da fonte esportiva

## Estado

- **Versão do contrato:** 1.0.
- **Estado:** aprovado como referência para a próxima implementação.
- **Escopo:** jogos e classificação do Brasileirão Série A 2026.
- **Fornecedor candidato validado:** API-Football.
- **Fonte oficial atual:** football-data.org.
- **Última atualização:** 2026-08-25.

Este documento especifica a fronteira interna entre fornecedores esportivos e o
Bolão. Ele é normativo para adaptadores futuros, mas **não autoriza** alteração
de código, banco, configuração, deploy ou fonte oficial.

## Hierarquia e uso

Antes de implementar, ler:

1. `AGENTS.md`;
2. `docs/ai/CODEX_WORKFLOW.md`;
3. `MIGRACAO_API_ESPORTIVA.md`;
4. este contrato;
5. código, testes e migrações diretamente afetados.

Em conflito, as instruções humanas e as regras do repositório prevalecem. Uma
mudança incompatível neste contrato exige nova decisão, versão e aprovação.

## Objetivos

- isolar formatos e códigos próprios dos fornecedores;
- preservar `public.jogos.id_jogo` como identidade competitiva;
- produzir a mesma estrutura interna para qualquer fonte;
- impedir regressões silenciosas de estado, placar e relógio;
- separar dados competitivos de eventos e diagnósticos auxiliares;
- permitir sombra, comparação e rollback sem mistura de fontes.

## Não objetivos

- definir o DDL final das tabelas de transição;
- alterar regras de fechamento, pontuação ou Ranking;
- substituir o relógio estimado existente;
- armazenar payload bruto;
- expor dados de sombra ao navegador;
- definir uma integração híbrida.

## Vocabulário normativo

- **deve:** requisito obrigatório;
- **não deve:** comportamento proibido;
- **pode:** comportamento opcional, sem alterar invariantes;
- **inválido:** resultado que não pode ser persistido;
- **ausente:** valor legítimo representado por `null`;
- **desconhecido:** valor recebido, mas não reconhecido pelo contrato.

## Fluxo obrigatório

```text
Resposta externa
      ↓ validação do envelope
Adaptador do fornecedor
      ↓ normalização sem persistência
Contrato normalizado
      ↓ validação e reconciliação
Identidade interna confirmada
      ↓ política contra regressões
Persistência autorizada
```

Somente o adaptador conhece caminhos como `fixture.status.elapsed`. Consumidores
internos recebem exclusivamente o contrato normalizado.

## Envelope da observação

Toda chamada normalizada deve produzir metadados operacionais separados do dado
competitivo.

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `provider` | string | sim | `football-data.org` ou `api-football` |
| `endpoint` | string | sim | endpoint lógico, sem chave ou query sensível |
| `observedAt` | ISO 8601 UTC | sim | instante local após receber a resposta |
| `providerUpdatedAt` | ISO 8601 UTC ou null | sim | somente se informado pela fonte |
| `requestSucceeded` | boolean | sim | sucesso de transporte e protocolo |
| `responseValid` | boolean | sim | envelope e conteúdo aceitos |
| `httpStatus` | integer ou null | sim | status quando disponível |
| `durationMs` | integer ou null | sim | duração não negativa |
| `dailyLimit` | integer ou null | sim | cabeçalho do fornecedor |
| `dailyRemaining` | integer ou null | sim | cabeçalho do fornecedor |
| `minuteLimit` | integer ou null | sim | cabeçalho do fornecedor |
| `minuteRemaining` | integer ou null | sim | cabeçalho do fornecedor |
| `errors` | array de códigos sanitizados | sim | nunca conter chave ou payload bruto |
| `warnings` | array de códigos sanitizados | sim | divergências não fatais |

### Validação do envelope da API-Football

Antes de ler `response`, o adaptador deve verificar:

- resposta HTTP bem-sucedida;
- `errors` vazio;
- `results` compatível com a consulta;
- `paging.current === paging.total` ou paginação integralmente processada;
- `response` com o tipo esperado;
- identificador solicitado presente e único em consultas por fixture.

Falha em qualquer requisito torna a observação inválida. Uma resposta inválida
não pode apagar nem substituir um valor competitivo anterior.

## Contrato normalizado de jogo

### Identidade e agenda

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `canonicalGameId` | integer ou null | sim | `id_jogo`; null antes da reconciliação |
| `providerFixtureId` | integer positivo | sim | ID externo, nunca chave competitiva |
| `competitionProviderId` | integer ou string | sim | ID da competição na fonte |
| `season` | integer | sim | quatro dígitos |
| `roundNumber` | integer ou null | sim | rodada normalizada entre 1 e 38 |
| `roundRaw` | string ou null | sim | texto original para diagnóstico |
| `kickoffAt` | ISO 8601 com fuso | sim | convertido e validado |
| `venueName` | string ou null | sim | ausência não invalida o jogo |
| `venueCity` | string ou null | sim | ausência não invalida o jogo |
| `timezoneRaw` | string ou null | sim | valor informado pela fonte |

`roundNumber` pode ser extraído de `Regular Season - N` somente para a
competição e temporada configuradas e quando `N` estiver entre 1 e 38. Outro
formato resulta em `null` e warning; nunca se deve inventar a rodada.

### Times

Cada lado usa a mesma estrutura:

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `providerTeamId` | integer positivo | sim | ID do fornecedor |
| `name` | string não vazia | sim | nome observado |
| `shortName` | string ou null | sim | não inventar abreviação |
| `code` | string ou null | sim | código observado; nunca sigla canônica automática |
| `crestUrl` | URL HTTPS ou null | sim | URL inválida vira null + warning |

A posição de mandante e visitante faz parte da identidade observada. Troca de
lado, ID ou nome após mapeamento exige divergência e revisão; não autoriza
remapeamento automático.

Local, cidade, escudos e códigos são metadados opcionais de auditoria. Sua
ausência ou divergência não invalida identidade, agenda, estado, relógio ou
placar. Apelidos, nomes de exibição e siglas canônicas pertencem ao Bolão e não
devem ser promovidos automaticamente a partir de um fornecedor.

### Estado

O jogo normalizado deve conter:

| Campo | Tipo | Obrigatório |
| --- | --- | --- |
| `status.rawCode` | string não vazia | sim |
| `status.rawLabel` | string ou null | sim |
| `status.normalized` | enum interno | sim |
| `status.isLive` | boolean | sim |
| `status.isFinal` | boolean | sim |
| `status.isKnown` | boolean | sim |

Enums internos permitidos:

- `scheduled`;
- `live`;
- `halftime`;
- `postponed`;
- `cancelled`;
- `finished`;
- `unknown`.

### Mapa API-Football → contrato interno

| Códigos externos | Estado interno | `isLive` | `isFinal` | Observação |
| --- | --- | --- | --- | --- |
| `TBD`, `NS` | `scheduled` | false | false | não iniciado |
| `1H`, `2H`, `ET`, `P`, `LIVE` | `live` | true | false | jogo em andamento |
| `HT`, `BT` | `halftime` | true | false | pausa entre períodos |
| `PST`, `SUSP`, `INT` | `postponed` | false | false | exige atenção operacional |
| `CANC`, `ABD` | `cancelled` | false | false | não promover placar a resultado |
| `FT`, `AET`, `PEN`, `AWD`, `WO` | `finished` | false | true | placar final ainda deve ser válido |
| qualquer outro | `unknown` | false | false | bloqueia persistência competitiva |

Estados `AWD` e `WO` exigem warning porque o resultado pode ser administrativo.
Estado conhecido não torna automaticamente o placar confiável.

### Relógio

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `clock.elapsed` | integer ou null | sim | 0 a 130 |
| `clock.extra` | integer ou null | sim | 0 a 30 |
| `clock.period` | enum ou null | sim | derivado somente do estado conhecido |
| `clock.isOfficial` | boolean | sim | true quando informado pela fonte |
| `clock.displayBase` | integer ou null | sim | 45, 90, 105 ou 120 quando aplicável |

Períodos permitidos: `firstHalf`, `halftime`, `secondHalf`, `extraTime`,
`extraTimeBreak`, `penalties`.

Regras:

- `elapsed` e `extra` são campos distintos;
- `extra` não deve ser somado e persistido dentro de `elapsed`;
- `HT` observado como 45+3 normaliza para `elapsed=45`, `extra=3`;
- `FT` observado como 90+6 normaliza para `elapsed=90`, `extra=6`;
- relógio oficial ausente permanece null e permite o fallback estimado atual;
- regressão de minuto dentro do mesmo período é inválida, salvo correção
  explicitamente classificada e não aplicada automaticamente;
- mudança legítima de período pode alterar a base do relógio;
- relógio nunca altera fechamento de palpites ou pontuação.

### Placar

| Campo | Tipo | Obrigatório |
| --- | --- | --- |
| `score.home` | integer não negativo ou null | sim |
| `score.away` | integer não negativo ou null | sim |
| `score.halftimeHome` | integer ou null | sim |
| `score.halftimeAway` | integer ou null | sim |
| `score.fulltimeHome` | integer ou null | sim |
| `score.fulltimeAway` | integer ou null | sim |
| `score.extraTimeHome` | integer ou null | sim |
| `score.extraTimeAway` | integer ou null | sim |
| `score.penaltyHome` | integer ou null | sim |
| `score.penaltyAway` | integer ou null | sim |

Precedência para API-Football:

1. durante jogo ao vivo, `goals.home/away` é o placar corrente;
2. em estado final, `score.fulltime` deve ser conferido contra
   `goals.home/away`;
3. eventos nunca são somados para reconstruir o placar oficial;
4. divergência entre placares finais bloqueia promoção automática do resultado;
5. resposta pontual sem placar não apaga placar anteriormente válido;
6. placar final sem os dois lados é inválido.

### Eventos auxiliares

Eventos não fazem parte do estado competitivo mínimo. Quando coletados:

| Campo | Tipo |
| --- | --- |
| `providerEventKey` | string determinística |
| `elapsed` | integer ou null |
| `extra` | integer ou null |
| `teamProviderId` | integer ou null |
| `playerProviderId` | integer ou null |
| `type` | string |
| `detail` | string ou null |

Cada jogo também expõe `eventObservation` com `available`, `count`, `valid` e
`warnings`. Esse bloco distingue uma lista presente e vazia de um campo ausente
ou inválido sem alterar a validade competitiva do jogo.

Regras obrigatórias:

- lista vazia não apaga eventos anteriormente observados;
- eventos reaparecidos podem completar o diagnóstico;
- evento de gol não altera placar por conta própria;
- deduplicação usa chave derivada de fixture, tempo, time, jogador, tipo e detalhe;
- ausência de eventos gera warning, não falha, quando estado e placar são válidos;
- lista presente e vazia é válida antes de eventos esperados; com placar positivo
  em jogo ao vivo ou encerrado, permanece registrada, mas é marcada incompleta;
- o hash da lista usa hashes de conteúdo ordenados, de modo que mera reordenação
  do fornecedor não produza uma divergência falsa;
- tipos conhecidos normalizam para `gol`, `cartao`, `substituicao` ou `var`;
  qualquer outro tipo permanece integralmente preservado como `desconhecido`;
- payload completo de escalações, atletas ou estatísticas não integra este
  contrato e não deve ser persistido sem novo escopo.

## Registro de capacidades futuras da API-Football

Este registro preserva conhecimento útil para evoluções futuras sem ampliar o
contrato obrigatório, o banco ou o produto atual. Seus itens são **opcionais**,
não participam da validade competitiva de um jogo e não constituem compromisso
de implementação.

Estados do inventário:

- **observado:** campo visto na prova ou em resposta real;
- **documentado:** capacidade confirmada na documentação do fornecedor;
- **não validado:** estrutura candidata que ainda exige resposta real;
- **fora do escopo:** não deve entrar nesta migração.

### Eventos de partida

Origem candidata: bloco `events[]` embutido em `fixtures` ou endpoint específico
de eventos.

| Conceito futuro | Caminho API-Football | Campo normalizado candidato | Estado |
| --- | --- | --- | --- |
| minuto | `events[].time.elapsed` | `elapsed` | observado |
| acréscimo | `events[].time.extra` | `extra` | observado |
| time | `events[].team.id/name` | `teamProviderId/teamName` | observado |
| jogador principal | `events[].player.id/name` | `playerProviderId/playerName` | observado |
| jogador relacionado | `events[].assist.id/name` | `relatedPlayerProviderId/relatedPlayerName` | observado |
| categoria | `events[].type` | `typeRaw` | observado |
| detalhe | `events[].detail` | `detailRaw` | observado |
| comentário | `events[].comments` | `comments` | observado |

O nome `assist` é próprio da API, mas o campo relacionado pode representar
assistência, jogador que entrou ou jogador que saiu conforme o tipo do evento.
O adaptador futuro deve interpretar a semântica por `type` e `detail`; não deve
presumir que todo `assist` é uma assistência de gol.

### Gols

Gols são uma especialização de evento, identificada inicialmente por
`events[].type === "Goal"`.

Campos candidatos:

- autor e assistência;
- time;
- minuto e acréscimo;
- `detailRaw`, como gol normal, contra ou pênalti;
- comentários do fornecedor.

Uso potencial: linha do tempo, notificações e contexto da partida. Mesmo quando
coletados, gols não reconstruirão o placar oficial; `goals.home/away` permanece
a referência corrente.

### Cartões

Cartões são eventos cujo tipo e detalhe indicam advertência ou expulsão.

Campos candidatos:

- jogador e time;
- minuto e acréscimo;
- categoria normalizada candidata: `yellow`, `secondYellow`, `red`, `unknown`;
- `typeRaw` e `detailRaw` preservados para diagnóstico.

Uso potencial: linha do tempo e contexto disciplinar. A normalização dos
detalhes ainda está **não validada** e precisa de amostras reais para cada tipo.

### Substituições

Substituições foram observadas com `events[].type === "subst"`.

Estrutura candidata:

- time;
- minuto e acréscimo;
- jogador principal;
- jogador relacionado;
- interpretação explícita de quem entrou e quem saiu.

A direção dos jogadores deve ser confirmada na documentação e em respostas
reais antes de definir nomes como `playerIn` e `playerOut`. Até lá, os papéis
permanecem principal e relacionado.

### Escalações

Origem candidata: bloco `lineups[]` embutido em fixture detalhada ou endpoint de
escalações.

| Conceito futuro | Caminho API-Football | Estado |
| --- | --- | --- |
| time | `lineups[].team.id/name/logo` | observado |
| formação | `lineups[].formation` | observado |
| titulares | `lineups[].startXI[]` | observado |
| reservas | `lineups[].substitutes[]` | observado |
| treinador | `lineups[].coach.id/name/photo` | observado |
| cores | `lineups[].team.colors` | observado |

Cada atleta de escalação pode oferecer ID, nome, número, posição e posição no
grid. Uso potencial: pré-jogo e detalhe da partida. Escalação ausente ou tardia
é legítima e nunca invalida agenda, placar ou relógio.

### Jogadores e estatísticas na partida

Respostas detalhadas observadas incluem grupos por time, jogadores e blocos de
estatísticas. O inventário candidato inclui:

- identidade externa, nome e imagem;
- número, posição, titularidade e minutos;
- nota;
- finalizações e gols;
- assistências;
- passes;
- desarmes, bloqueios e interceptações;
- duelos e dribles;
- faltas e cartões;
- pênaltis.

Esses dados são volumosos, frequentemente anuláveis e podem ter frequência de
atualização e cobertura diferentes do placar. Permanecem **não contratados** e
exigiriam finalidade de produto, análise de cota, retenção e modelo próprios.

### Metadados adicionais potencialmente úteis

| Capacidade | Origem candidata | Uso potencial | Estado |
| --- | --- | --- | --- |
| árbitro | `fixture.referee` | contexto da partida | observado |
| estádio e cidade | `fixture.venue` | agenda e detalhe | observado |
| início de períodos | `fixture.periods.first/second` | diagnóstico de relógio | observado |
| escudos | `teams.home/away.logo` | identidade visual | observado |
| vencedor | `teams.home/away.winner` | conferência final | observado |
| forma recente | linha de standings | contexto de classificação | documentado |
| descrição da zona | linha de standings | zonas continentais/rebaixamento | documentado |
| movimento na tabela | linha de standings | indicação de subida/queda | documentado |

Início de período pode auxiliar diagnóstico, mas não deve substituir
`status.elapsed` nem gerar um relógio oficial por inferência.

### Cobertura, custo e retenção

Antes de promover qualquer item deste inventário ao contrato, uma tarefa futura
deve confirmar:

1. cobertura da competição e temporada;
2. endpoint necessário e se o dado já vem na chamada de fixture;
3. frequência real de atualização;
4. custo de chamadas e impacto na cota;
5. comportamento de null, lista vazia e recomposição;
6. finalidade visível para o participante ou necessidade operacional;
7. retenção, volume, índices e segurança;
8. testes e política contra regressão.

### Exclusões explícitas desta migração

Permanecem fora do escopo atual:

- odds ao vivo ou pré-jogo;
- previsões do fornecedor;
- mercados de apostas;
- histórico amplo ou perfil completo de atletas;
- transferências, lesões, suspensões e troféus;
- imagens ou biografias além das já necessárias à identidade esportiva.

Esses recursos só podem ser reconsiderados mediante objetivo de produto,
avaliação comercial e tarefa próprios.

## Contrato normalizado de classificação

### Cabeçalho

| Campo | Tipo | Obrigatório |
| --- | --- | --- |
| `provider` | string | sim |
| `competitionProviderId` | integer ou string | sim |
| `competitionName` | string | sim |
| `season` | integer | sim |
| `currentRound` | integer ou null | sim |
| `observedAt` | ISO 8601 UTC | sim |
| `groupCount` | integer positivo | sim |
| `teamCount` | integer positivo | sim |

Para o Brasileirão Série A, espera-se um único grupo e 20 times. Quantidade
diferente é divergência bloqueante para substituir o cache oficial.

### Linha da classificação

| Campo | Tipo | Obrigatório |
| --- | --- | --- |
| `position` | integer positivo | sim |
| `providerTeamId` | integer positivo | sim |
| `teamName` | string não vazia | sim |
| `crestUrl` | URL HTTPS ou null | sim |
| `played` | integer não negativo | sim |
| `won` | integer não negativo | sim |
| `drawn` | integer não negativo | sim |
| `lost` | integer não negativo | sim |
| `points` | integer não negativo | sim |
| `goalsFor` | integer não negativo | sim |
| `goalsAgainst` | integer não negativo | sim |
| `goalDifference` | integer | sim |
| `form` | string ou null | sim |
| `description` | string ou null | sim |

Invariantes:

- posições únicas e contínuas de 1 a 20;
- IDs de times únicos;
- `played === won + drawn + lost`;
- `goalDifference === goalsFor - goalsAgainst`;
- valores inválidos bloqueiam substituição do cache;
- grupos extras não podem ser achatados silenciosamente.

## Reconciliação com o modelo atual

O contrato normalizado não é o formato direto de `upsert`. Uma etapa posterior
mapeia somente dados validados:

| Contrato | Modelo atual |
| --- | --- |
| `canonicalGameId` | `public.jogos.id_jogo` |
| `roundNumber` | `rodada` |
| `home.name` | `time_casa` |
| `away.name` | `time_fora` |
| `kickoffAt` | `inicio` |
| `venueName` | `local_partida` |
| `score.home/away` | `gols_casa/gols_fora` |
| `clock.elapsed` | `minuto` |
| `clock.extra` | `acrescimos` |
| estado normalizado | estado em português existente |
| `provider` | `fonte` |
| `observedAt` | `sincronizado_em` |

Os IDs de times da API-Football vão para campos auxiliares próprios; não
substituem silenciosamente os IDs atuais.

Mapa do estado interno para o modelo atual:

| Interno | `public.jogos.status` |
| --- | --- |
| `scheduled` | `agendado` |
| `live` | `em_andamento` |
| `halftime` | `intervalo` |
| `postponed` | `adiado` |
| `cancelled` | `cancelado` |
| `finished` | `encerrado` |
| `unknown` | sem escrita |

## Política de regressão

Comparar sempre com a última observação válida e, futuramente, com o estado
oficial existente.

Bloqueios mínimos:

- jogo encerrado não volta automaticamente a outro estado;
- placar conhecido não volta a null em jogo ao vivo;
- placar não diminui automaticamente;
- minuto não retrocede dentro do mesmo período;
- fixture não troca de times ou identidade;
- estado desconhecido não vira `agendado`;
- classificação inválida não substitui cache válido;
- lista de eventos vazia não apaga histórico auxiliar.

Toda proteção deve gerar diagnóstico sanitizado com ação, motivo, valor anterior
e valor observado.

## Resultado da Prova Externa Instrumentada

### Identificação

- **Data:** 2026-08-24 e 2026-08-25 em UTC.
- **Fixture:** 1492340.
- **Competição:** API-Football league 71, temporada 2026, rodada 24.
- **Partida:** Botafogo × Athletico-PR.
- **Método:** chamadas manuais periódicas no tester, sem escrita no Supabase.
- **Resultado final:** Botafogo 2 × 3 Athletico-PR.

### Linha do tempo observada

| Observação aproximada | Estado | Relógio | Placar | Evidência |
| --- | --- | --- | --- | --- |
| inicial | `1H` | 11' | 0 × 0 | primeiro tempo e relógio presentes |
| seguinte | `1H` | 12' | 0 × 1 | gol aos 11' apareceu |
| 20h28 BRT | `1H` | 27' | 0 × 2 | gols aos 11' e 13' |
| 20h39 BRT | `1H` | 37' | 0 × 2 | avanço sem regressão |
| 20h49 BRT | `HT` | 45+3' | 0 × 2 | intervalo e acréscimos coerentes |
| 20h59 BRT | `HT` | 45+3' | 0 × 2 | eventos vieram vazios pontualmente |
| 21h10 BRT | `2H` | 49' | 0 × 2 | segundo tempo retomado |
| 21h21 BRT | `2H` | 61' | 0 × 2 | avanço sem regressão |
| 21h32 BRT | `2H` | 71' | 0 × 2 | avanço sem regressão |
| 21h42 BRT | `2H` | 82' | 0 × 3 | gol aos 78' |
| 21h53 BRT | `2H` | 90+2' | 2 × 3 | eventos ainda em recomposição |
| 21h58 BRT | `FT` | 90+6' | 2 × 3 | resultado e cinco gols coerentes |

Horários BRT são aproximados a partir da observação e não medem a latência do
fornecedor em segundos.

### Conclusões

- estados evoluíram coerentemente de `1H` para `HT`, `2H` e `FT`;
- `elapsed` foi monotônico dentro de cada período;
- `extra` representou acréscimos separadamente;
- placar corrente e final foram disponibilizados;
- eventos ficaram temporariamente vazios/incompletos e depois reapareceram;
- eventos não são fonte adequada para reconstruir placar;
- uma partida é evidência suficiente para fechar o contrato v1, mas não comprova
  cobertura de uma rodada nem autoriza o corte.

**Recomendação da prova:** avançar para o adaptador puro e seus testes, sem
persistência.

## Exemplos sanitizados

### Jogo

```json
{
  "provider": "api-football",
  "canonicalGameId": null,
  "providerFixtureId": 1492340,
  "season": 2026,
  "roundNumber": 24,
  "status": {
    "rawCode": "FT",
    "normalized": "finished",
    "isLive": false,
    "isFinal": true,
    "isKnown": true
  },
  "clock": {
    "elapsed": 90,
    "extra": 6,
    "period": "secondHalf",
    "isOfficial": true,
    "displayBase": 90
  },
  "score": {
    "home": 2,
    "away": 3
  }
}
```

### Estado desconhecido

```json
{
  "status": {
    "rawCode": "NOVO_CODIGO",
    "rawLabel": "Rótulo recebido",
    "normalized": "unknown",
    "isLive": false,
    "isFinal": false,
    "isKnown": false
  },
  "responseValid": false,
  "errors": ["unknown_fixture_status"]
}
```

## Implementação de referência do adaptador

A implementação pura do contrato v1 está em
`src/sports-data/api-football-adapter.mjs`, com a política transversal contra
regressões em `src/sports-data/contract.mjs`. As fixtures sanitizadas ficam em
`fixtures/api-football/` e a prova executável em
`scripts/test-api-football-adapter.mjs`.

Essa implementação:

1. implementar somente funções puras de validação e normalização;
2. usar fixtures sanitizadas e testes locais;
3. cobrir todos os estados deste contrato;
4. provar estados desconhecidos e envelopes inválidos;
5. provar relógio, placar, rodada, times e classificação;
6. provar as políticas contra regressão em unidade separada;
7. não consultar nem escrever no Supabase;
8. não alterar a fonte oficial ou Functions em produção.

O comando `npm run test:api-football-adapter` valida esses critérios. Essa
referência não consulta rede, não lê credenciais, não persiste dados e não
autoriza a integração com produção.

### Integração oficial inativa

A Fase 6A reutiliza este contrato em
`netlify/functions/_api-football-official.mjs`. A seleção única de jogos e
classificação ocorre por `SPORTS_DATA_OFFICIAL_PROVIDER`; ausência da variável
mantém `football-data.org`, e qualquer valor fora da lista permitida falha sem
consultar ou gravar. A API-Football somente produz atualizações competitivas
depois de reconciliar fixture e equipes com os campos `api_football_*` do jogo
canônico. O teste continua local e não autoriza ativação em produção.

### Ensaio somente leitura do corte

A Fase 6B separa cálculo e persistência por meio de
`buildApiFootballSyncPlan`. O endpoint `ensaiar-corte-api-football` usa esse
planejador nos dez jogos canônicos da rodada, compara a football-data.org e a
API-Football e valida ambas as classificações. O contrato exige cobertura
integral, identidade reconciliada, estados conhecidos e reservas de cota.

O ensaio lê antes e depois somente os campos competitivos necessários de
`public.jogos` e `public.palpites`; seus hashes devem permanecer idênticos. O
código não contém mutações ou RPC no Supabase. A resposta omite payloads e
segredos e apresenta apenas evidências agregadas e hashes auditáveis.
Implementar o endpoint não equivale a executá-lo nem autoriza a troca da fonte.

## Evolução do contrato

Mudanças compatíveis incrementam a versão secundária. Renomear, remover ou mudar
o significado de campo incrementa a versão principal e exige plano de migração.
A implementação deve declarar explicitamente qual versão atende.

## Referências

- [Plano de migração](./MIGRACAO_API_ESPORTIVA.md)
- [Visão geral da arquitetura](./OVERVIEW.md)
- [API-Football — guia oficial](https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide)
- [API-Football — documentação v3](https://www.api-football.com/documentation-v3)
