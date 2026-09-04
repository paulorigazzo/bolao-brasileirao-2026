# Evidências da L04 — Equivalência da Liga Standard

## Status

Auditoria executada em 4 de setembro de 2026. A Liga Standard **Brasileirão
2026** reproduziu o modelo competitivo vigente e atendeu ao portão da L04.

Este resultado não ativa consultas por liga na interface. A introdução do
contexto de liga permanece condicionada a plano e aprovação próprios na L05.

## Método

A verificação reproduz o cálculo usado pelo aplicativo diretamente sobre as
tabelas canônicas, identificado por `user_id` e `id_jogo`, e compara o resultado
com as consultas contextualizadas da Liga Standard.

O roteiro [`standard-league-equivalence.sql`](../../supabase/tests/standard-league-equivalence.sql)
é executado em uma única transação e termina obrigatoriamente com `rollback`.
Ele cobre:

- pontos, placares exatos, palpites avaliados, posição e desempates;
- ranking oficial e provisório nas 38 rodadas;
- classificação de partidas encerradas, ao vivo, suspensas, adiadas, futuras e
  canceladas;
- unicidade do palpite por participante e partida;
- isolamento entre duas ligas sintéticas;
- associação retroativa de membro que já possui palpites;
- preservação das tabelas centrais antes e depois dos cenários.

O teste local [`test-standard-league-equivalence.mjs`](../../scripts/test-standard-league-equivalence.mjs)
impede que o roteiro adquira `commit`, alterações estruturais ou escritas nas
tabelas centrais.

## Resultado

O banco retornou:

```text
L04_OK: equivalência, isolamento, retroatividade e rollback comprovados.
```

Retrato agregado observado após a execução:

| Evidência | Resultado |
| --- | ---: |
| Membros ativos da Liga Standard | 21 |
| Partidas da temporada | 380 |
| Palpites da temporada | 1.125 |
| Partidas encerradas | 246 |
| Partidas adiadas | 4 |
| Partidas futuras | 130 |
| Duplicidades em `(user_id, id_jogo)` | 0 |
| Ligas sintéticas persistidas | 0 |
| Associações sintéticas persistidas | 0 |

Não havia partidas ao vivo, suspensas ou canceladas no instante da auditoria.
Esses estados permanecem cobertos pelo classificador comparativo das 38 rodadas
e pelos testes sintéticos já existentes do ranking provisório.

## Critérios de aceite

- **CA1 — Equivalência individual:** atendido; nenhuma divergência por membro e
  partida repercutiu no ranking oficial.
- **CA2 — Equivalência agregada:** atendido; pontos, exatos, avaliados e
  contagens coincidiram.
- **CA3 — Ordenação:** atendido; posição e desempates por pontos, exatos e nome
  coincidiram.
- **CA4 — Provisório:** atendido nas 38 rodadas, incluindo resumo dos estados
  das partidas.
- **CA5 — Isolamento:** atendido; membro de uma liga sintética não visualizou
  nem consultou o ranking da outra.
- **CA6 — Retroatividade:** atendido; o membro adicionado recebeu todo o recorte
  válido da temporada sem cópia de palpites ou pontos.
- **CA7 — Palpite único:** atendido; nenhuma duplicidade foi encontrada.
- **CA8 — Preservação:** atendido; quantidades e assinaturas de `jogos`,
  `palpites`, `participantes` e `participantes_autorizados` não mudaram.
- **CA9 — Retorno:** atendido; o rollback removeu todas as entidades sintéticas.

## Observação sobre o ranking legado

A referência de equivalência é o cálculo efetivamente usado pelo aplicativo,
com identidade canônica por `user_id`. A view histórica `ranking`, que ainda
possui associações legadas por nome, não foi promovida a fonte de verdade e não
deve ser usada para invalidar ou substituir essa identidade.

## Conclusão

O portão de equivalência e isolamento da L04 está atendido. A próxima etapa
elegível é a L05 — contexto de liga na interface — mantendo a Tela de Jogos com
um único palpite compartilhado e sem ativação automática nesta entrega.
