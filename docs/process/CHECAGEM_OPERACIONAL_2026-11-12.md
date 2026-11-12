# Checagem operacional — 12 de novembro de 2026

Verificação de produção na versão 6.61.1 pela sessão autenticada do administrador. Horários de Brasília. Este registro descreve o estado observado naquela data.

## Resultados observados

| Área | Evidência |
| --- | --- |
| Disponibilidade | Página pública respondeu HTTP 200. |
| Serviços | Central de Diagnóstico exibiu 100/100, Supabase, Netlify Functions e API-Football online. A disponibilidade da fonte esportiva é inferida por seus logs. |
| Sincronização | Última execução exibida em 12/11 às 16:23:05, com sucesso. |
| Classificação | Cache atualizado em 12/11 às 16:31:13, com 20 clubes. |
| Integridade | Auditoria dos dados carregados da liga selecionada exibiu nenhuma inconsistência estrutural. |
| Rodada vigente | Rodada 35 com dez jogos futuros, oito de 23 participantes em dia e 15 com pendências na liga selecionada. Próximo fechamento exibido em 14/11 às 18h. |
| Avisos aos participantes | Resumo da temporada exibiu 59 aceitos pelo serviço, zero em andamento e zero falhas. Registros do resumo da rodada 34 em 06/11 às 22:05. |
| Avisos ao ADM | Resumo da temporada exibiu 17 aceitos pelo serviço, zero em andamento e zero falhas. Rodada 34 com registros de lembretes de 12h, 2h e resumo. Última movimentação exibida em 06/11 às 22:10. |
| Próximo lembrete | Previsto em 14/11 às 06h30, referente às 12h antes do primeiro jogo da rodada 35, condicionado a palpites pendentes e abertos. |
| Consulta do participante | Ranking e Estatísticas carregaram. Um palpite existente da rodada 35 reapareceu após recarregar o app. |
| Entregas | GitHub consultado sem PRs abertas. Main local e remota coincidiam no merge da PR #288. |

## Validações ainda pendentes

- Gravação de um novo palpite em jogo aberto, com autorização específica para o teste.
- Recebimento de uma notificação em aparelho inscrito. Aceitação pelo serviço comprova o processamento registrado, enquanto entrega e leitura no aparelho requerem confirmação adicional.
- Identificação da partida antiga e confirmação oficial de sua data. A Home mostrou um jogo da rodada 21 com palpites abertos. O diagnóstico indicou um jogo pendente de rodada anterior, uma data em verificação e nenhum jogo sem nova data.

## Referências

- [Roadmap](../../ROADMAP.md).
- [Contexto de jogos reagendados](../releases/v6.44.2-contexto-jogos-reagendados.md).
- PRs integradas que sustentam a atualização de status no Roadmap: #277 e #280 a #288, no [repositório](https://github.com/paulorigazzo/bolao-brasileirao-2026/pulls?q=is%3Apr+is%3Amerged).
