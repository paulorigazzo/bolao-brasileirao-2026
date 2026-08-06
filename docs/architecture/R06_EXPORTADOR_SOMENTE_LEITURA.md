# R06 — Exportador somente leitura

## Estado

A R06A está concluída e homologada pela [PR #94](https://github.com/paulorigazzo/bolao-brasileirao-2026/pull/94), integrada à `main` pelo commit `a2f84de`. A entrega implementa somente o núcleo sintético local: não conecta ao Supabase, não lê dados reais e não conclui a homologação do exportador de produção.

O contrato canônico pertence ao Rigazzo. Esta implementação está travada em `snapshot-2026/v1`, definido no commit `300c23a` e verificado até o merge `764fdad` da R05. Mudança incompatível exige atualização explícita e testes de compatibilidade.

## Limites da R06A

- aceita exclusivamente `dataClassification: synthetic-only`;
- lê uma fixture JSON local com estrutura lógica da origem;
- não possui cliente Supabase, credencial, endpoint, chamada de rede, Function ou RPC;
- rejeita campos pessoais, identificadores Auth, segredos, endpoints e comandos;
- não exporta ranking, pontuação, cache, logs ou objetos legados;
- não exporta palpite associado a partida que não esteja encerrada;
- gera apenas arquivo JSON local compatível com as oito coleções do Snapshot v1;
- calcula o hash SHA-256 com `json-sort-keys-and-arrays-v1`;
- não sobrescreve arquivo existente e remove o temporário diante de falha.

## Uso sintético

```powershell
npm run snapshot:export -- --input fixtures/snapshot-export/origin.synthetic.json --output .artifacts/snapshots/r06a-demo.json
```

O comando informa somente versão, identificador do pacote, classificação, hash e caminho de saída. O diretório `.artifacts/` é local e ignorado pelo Git.

## Transformações

| Origem sintética | Snapshot v1 |
| --- | --- |
| contexto da competição | `competitions` |
| contexto da temporada | `seasons` |
| referências repetidas nos jogos | `teams` deduplicados por referência externa |
| jogos | `matches` |
| bolão implícito | `leagues` |
| participantes sintéticos | `participants` |
| papel e estado | `memberships` |
| palpites de jogos encerrados | `predictions` |

O prazo é calculado como 30 minutos antes do início. Estados convergem para `scheduled`, `postponed`, `finished` e `cancelled`; partidas não finalizadas sempre recebem placares nulos.

## Portão da R06B

O adaptador real permanece bloqueado. Seu plano deverá exigir, no mínimo:

1. R07 concluída para consentimento e pseudonimização;
2. autorização específica para acesso a dados reais;
3. credencial PostgreSQL dedicada sem qualquer privilégio de escrita;
4. transação `READ ONLY` e `REPEATABLE READ`;
5. lista fechada de tabelas e colunas selecionadas pela R03/R04;
6. testes negativos de escrita e proteção dos artefatos reais.

`SUPABASE_SERVICE_ROLE_KEY` é incompatível com essa garantia e não poderá ser usada pelo exportador.

O próximo trabalho coordenado pertence ao repositório Rigazzo: planejar e concluir a R07 — Identidades e consentimento. A conclusão da R06A não autoriza iniciar a R06B, acessar dados reais ou criar mecanismos de consentimento neste projeto.

## Exclusões preservadas

- Área ADM e botão **Exportar rodada**;
- Netlify Functions e deploy;
- migrações, RLS ou alterações no Supabase 2026;
- conexão com o Rigazzo;
- cofre de identidades;
- pacote real, incremental ou consentido;
- mudança na versão funcional do aplicativo.
