# R06 — Exportador somente leitura

## Estado

A R06A está concluída e homologada pela [PR #94](https://github.com/paulorigazzo/bolao-brasileirao-2026/pull/94), integrada à `main` pelo commit `a2f84de`. A entrega implementa somente o núcleo sintético local: não conecta ao Supabase, não lê dados reais e não conclui a homologação do exportador de produção.

O contrato canônico pertence ao Rigazzo. Esta implementação está travada em `snapshot-2026/v1.1`, definido na R04.1 pelo commit `cec847c` e verificado até o merge `6648194` da R05.1. Mudança incompatível exige atualização explícita e testes de compatibilidade.

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

1. R04.1 concluída no Rigazzo com classificação própria para teste pseudonimizado, sem reutilizar semanticamente `consented-pseudonymous`;
2. R05.1 concluída no Rigazzo para aceitar essa classificação sem identidade direta;
3. autorização específica para acesso a dados reais;
4. credencial PostgreSQL dedicada sem qualquer privilégio de escrita;
5. transação `READ ONLY` e `REPEATABLE READ`;
6. lista fechada de tabelas e colunas selecionadas pela R03/R04.1;
7. geração de referências opacas estáveis sem transportar a correspondência com pessoas reais;
8. testes negativos de escrita, identidade direta e proteção dos artefatos reais.

`SUPABASE_SERVICE_ROLE_KEY` é incompatível com essa garantia e não poderá ser usada pelo exportador.

R04.1 e R05.1 estão concluídas no Rigazzo. A R07A e a R07B identificada ficam adiadas enquanto nenhuma pessoa real for associada ao Auth do Rigazzo e nenhuma identidade direta for transferida. Esses portões não autorizam conexão ou acesso a dados reais.

## Limites da R06B.1

A R06B.1 prepara somente componentes locais e injetáveis:

- validação de `snapshot-2026/v1.1` com `pseudonymous-test`;
- HMAC-SHA-256 com chave mínima de 32 bytes e separação por domínio;
- consultas fechadas somente a `public.jogos` e `public.palpites`;
- seleção exclusiva de partidas encerradas e palpites vinculados a elas;
- preflight de `SELECT` e rejeição de `INSERT`, `UPDATE`, `DELETE` ou `TRUNCATE`;
- transação `REPEATABLE READ READ ONLY` com rollback diante de falha;
- ausência de cliente de rede concreto, credencial, endpoint e acesso remoto.

O `user_id` aparece apenas como chave transitória dentro do adaptador injetável e é convertido em referência opaca antes da montagem do snapshot. Nome, e-mail, telefone, `usuario`, Auth e a chave HMAC não integram pacote ou logs.

## Portão da R06B.2

A execução real exigirá nova autorização e, adicionalmente:

1. cliente PostgreSQL fixado e verificado;
2. credencial dedicada com `SELECT` somente nas fontes permitidas;
3. custódia definida para a chave HMAC;
4. preflight remoto limitado à função, aos privilégios e às contagens;
5. revisão humana antes de gerar qualquer arquivo real;
6. arquivo fora do Git e validação canônica no Rigazzo.

## Exclusões preservadas

- Área ADM e botão **Exportar rodada**;
- Netlify Functions e deploy;
- migrações, RLS ou alterações no Supabase 2026;
- conexão com o Rigazzo;
- cofre de identidades;
- pacote real, incremental ou consentido;
- mudança na versão funcional do aplicativo.
