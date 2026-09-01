# Evidências operacionais da API-Football — rodada 25

## Estado do documento

- Período observado: 29 a 31 de agosto de 2026.
- Campanha: `5b3-round-25`.
- Fuso de apresentação: `America/Sao_Paulo`.
- Estado: relatório consolidado em 31 de agosto de 2026, 22h02.
- Veredicto final: favorável ao planejamento do próximo portão, sem autorizar
  corte, configuração ou deploy.

Este relatório registra evidências operacionais da Fase 5B.3B.2. Ele não
autoriza corte, promoção de dados, alteração da fonte oficial ou desativação da
football-data.org.

## Base preservada

- 380 jogos avaliados na reconciliação da temporada;
- 255 mapeamentos completos e inequívocos;
- 125 jogos integralmente nulos por divergência de agenda;
- nenhum mapeamento parcial;
- rodada 25 com dez jogos e dez mapeamentos completos;
- `id_jogo`, horários, resultados oficiais, palpites, pontuação e demais dados
  competitivos fora da autoridade da sombra.

## Linha do tempo

| Data e hora de Brasília | Evidência | Resultado |
| --- | --- | --- |
| 29/08, 18h15 | abertura da primeira janela real | acionador presente, mas coleta ainda sem execução persistida |
| 29/08, 18h27–18h31 | logs da Function | falha `data is not defined` antes da chamada à API e da persistência |
| 29/08, 18h39 | merge e deploy do PR #169 | referência de data corrigida e janela ativa coberta por teste |
| 29/08, 18h40 | execução 5 | primeira coleta bem-sucedida: três jogos, duas chamadas e classificação |
| 29/08, 23h15 | execução 212 | Vasco x Cruzeiro ainda ao vivo: API-Football 3 x 0 em 90+2; oficial 2 x 0 |
| 30/08, manhã | estado canônico consolidado | Vasco 3 x 1 Cruzeiro encerrado; ausência de fotografia terminal confirmada |
| 30/08, 11h58 | merge e deploy do PR #170 | marcos permanentes e recuperação terminal publicados |
| 30/08, 12h00 | execução 289 | recuperação de 29/08 com três jogos finais concordantes e marco `fim` único |
| 30/08, 12h01 | execução 290 | retorno automático à coleta dos seis jogos da data corrente |
| 30/08, 12h06 | execução 295 | Athletico-PR 1 x 1 Fluminense no intervalo; API-Football em 45+8 e fontes concordantes |
| 30/08, 21h28 | execução 792 | seis jogos da data encerrados e concordantes; marco `fim` único |
| 31/08, 19h45 | abertura da última janela | Remo x Coritiba integralmente mapeado; marco `inicio` único |
| 31/08, 22h01 | execução 857 | Remo 2 x 3 Coritiba encerrado nas duas fontes; marco `fim` único |

## Incidentes e correções

### Referência de data indefinida

O filtro de histórico usava uma variável inexistente. O acionador executava a
cada minuto, mas encerrava antes de chamar o fornecedor ou gravar fotografias.
O PR #169 corrigiu a referência, acrescentou injeção controlada do coletor para
teste e incluiu um cenário dentro da janela ativa.

### Fechamento terminal incompleto

A janela estendida terminava rigidamente 120 minutos após o último início. O
último jogo ultrapassou esse limite e ficou sem fotografia final. O PR #170
removeu o prazo do ciclo terminal condicionado, acrescentou recuperação da data
anterior e manteve o orçamento protegido.

### Repetição do marco inicial

Os marcos eram inferidos das vinte execuções recentes. Em cadência de um minuto,
o marco `inicio` desaparecia da consulta e a classificação era coletada de novo.
Em 29 de agosto houve dez registros de `inicio`; antes do segundo hotfix, em 30
de agosto houve quatro. O PR #170 passou a consultar cada marco diretamente e
preservou a janela curta apenas para falhas consecutivas. Depois do deploy, os
marcos `fim` de 29 e 30 de agosto foram registrados uma única vez; em 31 de
agosto, `inicio` e `fim` também foram registrados uma única vez cada.

## Consolidação final

- dez jogos com fotografias finais válidas nas duas fontes;
- dez jogos encerrados e dez placares finais concordantes;
- 846 execuções da campanha, sem falhas, execuções abertas ou chaves de
  idempotência duplicadas;
- 8.258 fotografias de jogos, cobrindo dez jogos e dois fornecedores, sem linha
  inválida ou erro de normalização;
- 36 fotografias de classificação em dezoito execuções e dois fornecedores;
- identidade, mando e agenda reconciliados em todos os jogos observados;
- diferença máxima de agenda igual a zero minuto;
- relógio e acréscimos disponíveis pela API-Football, inclusive 90+5, 90+6 e
  45+8 em evidências reais;
- cota final em 7.486 de 7.500 chamadas, com ampla margem em todos os portões;
- dez observações finais com os dois escudos, nome e cidade do local;
- códigos de três letras ausentes nas dez observações finais, campo opcional
  que não invalida a fotografia nem substitui a sigla canônica do Bolão;
- recuperação terminal concluída sem interromper a coleta corrente;
- 255 mapeamentos completos na temporada, 125 jogos integralmente nulos, nenhum
  preenchimento parcial e dez mapeamentos completos na rodada;
- persistência restrita às tabelas de transição, sem promoção automática de
  dados de sombra ou mudança da fonte oficial.

## Veredicto

A rodada completa forneceu evidência suficiente para avançar ao planejamento do
próximo portão. Não é necessário repetir outra rodada com o mesmo contrato:
as lacunas operacionais observadas foram explicadas, corrigidas e exercitadas
até o fechamento terminal. Este veredicto não autoriza corte, deploy, mudança
de variáveis ou retirada da football-data.org.

## Próximos portões separados

- desativar controladamente a campanha e comprovar ausência de novas execuções,
  sem remover sua auditoria;
- concluir a auditoria visual dos escudos antes de qualquer promoção;
- planejar e implementar `transicao_api_eventos`, validar retenção e somente
  então autorizar eventual reprocessamento controlado da rodada 25;
- planejar a Fase 6 com seleção explícita da fonte, rollback testado e
  autorizações independentes para configuração, deploy e corte.

O procedimento de desativação deve definir `API_FOOTBALL_SHADOW_ENABLED` como
inativo, preservar as demais configurações para rastreabilidade, verificar que
nenhuma nova execução foi criada e manter todas as tabelas de transição. Sua
execução é uma mudança operacional separada e depende de autorização humana.

## Referências

- [Plano canônico da migração](./MIGRACAO_API_ESPORTIVA.md)
- [Contrato da fonte esportiva](./CONTRATO_FONTE_ESPORTIVA.md)
- [Registro de decisões](../ai/DECISION_LOG.md)
- PR #169 — correção da referência de data da coleta agendada
- PR #170 — recuperação terminal e memória permanente dos marcos
