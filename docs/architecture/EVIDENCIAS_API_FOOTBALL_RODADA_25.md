# Evidências operacionais da API-Football — rodada 25

## Estado do documento

- Período observado: 29 a 31 de agosto de 2026.
- Campanha: `5b3-round-25`.
- Fuso de apresentação: `America/Sao_Paulo`.
- Estado: relatório incremental até 30 de agosto de 2026, 12h06.
- Veredicto final: pendente do encerramento da rodada.

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
de agosto houve três. O PR #170 passou a consultar cada marco diretamente e
preservou a janela curta apenas para falhas consecutivas. Não houve nova
repetição nas seis primeiras execuções posteriores ao deploy.

## Evidências positivas até 30 de agosto

- identidade, mando e agenda reconciliados em todos os jogos observados;
- diferença máxima de agenda igual a zero minuto;
- placares e estados concordantes entre as duas fontes nas verificações
  realizadas;
- relógio e acréscimos disponíveis pela API-Football, inclusive 90+5, 90+6 e
  45+8 em evidências reais;
- execuções posteriores aos hotfixes sem falhas ou duplicações;
- cota diária com ampla margem em todos os pontos verificados;
- fotografias válidas e sem erro de normalização;
- recuperação terminal concluída sem interromper a coleta corrente;
- ausência de promoção automática de dados de sombra.

## Lacunas e decisões pendentes

- concluir os jogos de 30 e 31 de agosto;
- comprovar marcos `fim` únicos para as duas datas restantes;
- consolidar consumo de cota, falhas, idempotência e metadados opcionais;
- concluir a auditoria visual dos escudos antes de qualquer promoção;
- planejar e implementar `transicao_api_eventos` após a rodada;
- verificar as condições de retenção antes de armazenar payload original de
  eventos;
- decidir, no relatório final, entre avançar, repetir a sombra ou investigar.

## Critério para o veredicto de 31 de agosto

O resultado será favorável ao próximo portão somente se os dez jogos tiverem
fotografias suficientes e terminais, os marcos não se repetirem, as divergências
forem explicadas, a cota permanecer segura e não houver mutação competitiva. A
eventual aprovação autorizará apenas o planejamento do estágio seguinte; corte,
configuração e deploy continuarão sujeitos a autorizações próprias.

## Referências

- [Plano canônico da migração](./MIGRACAO_API_ESPORTIVA.md)
- [Contrato da fonte esportiva](./CONTRATO_FONTE_ESPORTIVA.md)
- [Registro de decisões](../ai/DECISION_LOG.md)
- PR #169 — correção da referência de data da coleta agendada
- PR #170 — recuperação terminal e memória permanente dos marcos
