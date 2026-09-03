# Ativação controlada da API-Football — Fase 6D

## Objetivo

Promover a API-Football a fonte esportiva oficial em produção, com uma única
fonte ativa, escopo previsível de escrita, evidência de integridade e retorno
imediato à football-data.org se qualquer portão falhar.

O roteiro exigiu autorização humana explícita no portão final. A autorização
foi recebida em 2026-09-03 e a execução está registrada ao final deste arquivo.

## Escopo e preservações

O corte altera somente a seleção da fonte esportiva oficial das Netlify
Functions. Permanecem inalterados:

- os identificadores canônicos `id_jogo`;
- palpites, fechamento, pontuação e resultados históricos;
- autenticação, autorização, RLS e estrutura do Supabase;
- interface, Design System e regras de negócio;
- a football-data.org, mantida disponível para rollback e estabilização.

Não remover chaves, código legado, caches ou mecanismos de diagnóstico durante
a estabilização.

## Baseline anterior ao corte

Baseline coletada em 2026-09-03, com a football-data.org ainda oficial:

- produção saudável e autoteste `100/100`;
- deploy de produção anterior `6a99c44cef64070008999982`, publicado a partir
  da `main` no commit `8ade1350d2f36f41ef3cf3e7e767771a618deb9b`;
- cache oficial `BSA-2026`, com 20 clubes e origem `football-data.org`;
- 380 jogos cadastrados e 1.125 palpites na competição;
- rodada 26 com 10 jogos, 10 mapeamentos completos e 10 jogos com ambos os
  escudos presentes;
- 50 palpites já vinculados aos jogos da rodada 26;
- hash operacional dos jogos da rodada 26:
  `d39fa4c6d1272652a082fd743135e186`;
- hash operacional dos palpites da rodada 26:
  `ffcb503f89b81415ca244bc5dbe75b13`.

Os hashes operacionais servem somente para comparar o estado antes e depois da
primeira sincronização. Eles não substituem o hash assinado pelo relatório de
preflight.

## Portão P0 — preflight renovado

Em 2026-09-03, o preflight somente leitura da rodada 26 foi repetido antes da
ativação e apresentou:

- veredito aprovado e zero escritas;
- 10/10 jogos canônicos e 10/10 mapeamentos;
- API-Football com 10 jogos e 20 clubes;
- football-data.org com 10 jogos e 20 clubes;
- 10 mudanças propostas e zero reparos propostos;
- cota API-Football restante de 7.494/7.500 no dia e 298/300 no minuto;
- hashes de jogos e palpites preservados;
- rollback integral simulado;
- hash do relatório:
  `2dd75e56b664968eee094a1e26e7a726fd082fa20ce17e4959fc86274e5d5b1b`.

Se o preflight, as fontes, os mapeamentos, os escudos ou as cotas deixarem de
atender a esses requisitos, interromper antes da configuração.

## Portão P1 — autorização do corte

Apresentar a baseline e o resultado do P0. Obter autorização humana explícita
para as duas ações inseparáveis:

1. definir `SPORTS_DATA_OFFICIAL_PROVIDER=api-football` no contexto de produção
   e no menor escopo permitido pelo plano da Netlify;
2. criar um novo deploy de produção a partir da `main` no commit esperado.

A variável não deve ser gravada em `netlify.toml`. O plano atual da Netlify não
permite restringir uma nova variável somente a Functions. Mediante autorização
humana adicional, o corte usou todos os escopos, exclusivamente no contexto de
produção; somente as Functions consomem essa chave. Valores de ambiente usados
por Functions são aplicados no momento do deploy; não considerar o corte ativo
antes de um novo deploy publicado com sucesso.

## Portão P2 — ativação e verificação antes da sincronização

Após a autorização:

1. registrar o identificador e o commit do deploy anterior;
2. alterar somente `SPORTS_DATA_OFFICIAL_PROVIDER` no contexto e escopo
   definidos no P1;
3. criar e acompanhar o novo deploy de produção;
4. interromper se o deploy não corresponder à `main` e ao commit esperado;
5. abrir o diagnóstico protegido e confirmar:
   - API-Football como fonte oficial;
   - football-data.org em espera;
   - Supabase e Netlify Functions online;
   - ausência de erro de configuração ou valor desconhecido.

Não acionar sincronização manual se qualquer item falhar.

## Portão P3 — primeira sincronização e integridade

Executar uma sincronização manual controlada e verificar imediatamente:

- uma chamada à API-Football dentro das reservas de cota;
- somente os 10 jogos não terminais e mapeados da rodada 26 elegíveis;
- 250 jogos terminais preservados;
- 120 jogos futuros não mapeados ignorados;
- nenhum reparo de identidade inesperado;
- `id_jogo` e os 50 palpites da rodada 26 preservados;
- datas, horários, estádios, estados e placares coerentes;
- escudos presentes para os 20 lados dos 10 jogos;
- cache `BSA-2026:api-football` com 20 clubes e escudos válidos;
- logs sem erro persistente ou escrita fora do escopo.

Recalcular os hashes operacionais da baseline. O hash de palpites deve ser
idêntico. Para jogos, qualquer diferença deve corresponder exclusivamente às
10 mudanças previstas pelo preflight e ser revisada campo a campo.

## Rollback imediato

Iniciar rollback se houver:

- divergência de identidade, `id_jogo` ou palpites;
- escrita fora dos jogos elegíveis;
- classificação incompleta ou escudos ausentes de forma generalizada;
- erro persistente da API-Football, mapeamento ou quota;
- deploy incorreto ou diagnóstico sem fonte oficial inequívoca.

Procedimento:

1. definir `SPORTS_DATA_OFFICIAL_PROVIDER=football-data.org` no mesmo contexto
   e escopo;
2. criar um novo deploy de produção a partir da `main`;
3. confirmar no diagnóstico a football-data.org oficial e o cache `BSA-2026`;
4. verificar jogos, palpites, classificação, escudos e logs contra a baseline;
5. registrar o incidente e não tentar novo corte sem outro plano aprovado.

## Estabilização

Com o corte aprovado nos portões P2 e P3:

- acompanhar sincronizações, erros e cotas até o primeiro jogo da rodada 26;
- reforçar a verificação antes e durante a janela ao vivo;
- validar estados, relógio, placares, classificação e escudos após os jogos;
- manter a football-data.org disponível por uma ou duas rodadas;
- decidir em portão próprio o encerramento da estabilização e qualquer remoção
  posterior do legado.

## Evidências de aceite

- **CA1 — preflight renovado:** relatório do P0 aprovado e sem escrita.
- **CA2 — corte isolado:** diagnóstico do P2 identifica uma única fonte oficial.
- **CA3 — integridade:** hashes, IDs e palpites comparados no P3.
- **CA4 — escopo:** log do P3 comprova somente os jogos elegíveis processados.
- **CA5 — classificação e escudos:** cache e inspeção visual mostram 20 clubes.
- **CA6 — segurança operacional:** deploy, logs e cotas permanecem saudáveis.
- **CA7 — reversibilidade:** procedimento de rollback permanece executável e a
  football-data.org não é removida durante a estabilização.

## Execução real do corte

Em 2026-09-03, após aprovação dos portões P0 e P1:

- `SPORTS_DATA_OFFICIAL_PROVIDER=api-football` foi criada em todos os escopos,
  limitada ao contexto de produção, conforme a ampliação autorizada;
- o deploy de produção `6a99ce62eddc57abc4c5c7ea` foi publicado com 17
  Functions e os dois agendamentos esperados;
- a classificação pública confirmou `api-football`, 20 clubes e cache
  `BSA-2026:api-football`;
- o diagnóstico protegido confirmou Supabase e Functions online, cache válido,
  origem `api-football` e autoteste `100/100`;
- a primeira sincronização manual concluiu em 972 ms, com uma chamada à API,
  10 jogos importados, 250 terminais preservados, 120 futuros não mapeados
  ignorados e zero reparos;
- a cota restante após a sincronização foi 7.491/7.500 no dia e 298/300 no
  minuto;
- os 50 palpites da rodada 26 foram preservados, com hash operacional
  `ffcb503f89b81415ca244bc5dbe75b13` idêntico à baseline;
- os 10 jogos permaneceram mapeados e com ambos os escudos. O hash operacional
  dos jogos passou a `caef4694f09f24edd52645a5b4074991`, refletindo somente a
  promoção prevista dos 10 jogos elegíveis;
- a inspeção inicial apresentou os escudos, mas uma verificação posterior em
  dispositivo real revelou falha generalizada de resolução de
  `media.api-sports.io`, apesar do diagnóstico `100/100`.

O gatilho de escudos ausentes foi atingido e o rollback foi executado em
2026-09-03. A configuração voltou para `football-data.org`, um novo deploy foi
publicado e a sincronização restaurou os 380 jogos e os escudos anteriores. Os
50 palpites da rodada 26 permaneceram presentes. Um novo corte fica bloqueado
até que os escudos da API-Football sejam servidos pela mesma origem do Bolão e
o preflight comprove os vinte arquivos publicados.
