# Recuperação competitiva

## Finalidade

A camada de recuperação competitiva preserva os dados mínimos necessários para reconstruir resultados, pontos e Ranking do Bolão 2026 sem depender obrigatoriamente de uma fonte esportiva externa.

Ela complementa os backups do Supabase. Não é uma cópia integral do banco, não substitui recuperação contra perda completa do projeto e não integra o fluxo de transferência para o Rigazzo.

## Fontes preservadas

O schema privado mantém:

- o primeiro resultado final válido de cada jogo, com ID, rodada, clubes, horário, placar, fonte e data de confirmação;
- os palpites vinculados ao jogo no instante da primeira captura;
- alterações posteriores de status ou placar, com os valores anterior e novo;
- um baseline criado na implantação;
- checkpoints de pontos, placares exatos e posições quando os dez jogos de uma rodada ficam encerrados.

Ranking e pontos permanecem derivados. O checkpoint é evidência de conferência, não uma nova fonte canônica.

## Segurança e imutabilidade

- O schema `private` não é exposto pela aplicação.
- `anon`, `authenticated` e `service_role` não recebem acesso direto às tabelas ou funções.
- RLS permanece habilitada como defesa adicional, sem políticas de leitura pública.
- Triggers com escopo restrito inserem os snapshots na mesma transação que finaliza o jogo.
- Atualizações e exclusões nas tabelas de snapshot são rejeitadas pelo fluxo normal.
- Não são copiados e-mail, celular, sessão, token ou conteúdo de `auth.users`.

## Regras de captura

1. Um jogo somente é capturado com status `encerrado` e placar completo.
2. `id_jogo` garante que o primeiro resultado preservado não seja sobrescrito.
3. Os palpites do jogo são copiados apenas quando o snapshot do jogo é criado.
4. Mudanças posteriores de status ou placar geram histórico, mas não são bloqueadas.
5. O checkpoint de rodada somente é criado quando existem exatamente dez jogos e todos possuem resultado final válido.
6. Baseline e checkpoint de cada rodada são idempotentes.

## Reconstrução

Uma recuperação deve ser manual e revisada:

1. identificar o jogo ou período afetado;
2. consultar o snapshot original e o histórico de alterações;
3. comparar, quando necessário, o placar com uma fonte esportiva independente;
4. validar a contagem e o conteúdo dos palpites preservados;
5. recalcular pontos pelas regras 10/5/3/1 e desempatar por pontos, exatos e nome;
6. comparar o resultado com o checkpoint aplicável;
7. aplicar eventual correção em transação com IDs e precondições explícitas;
8. executar nova consulta de verificação antes de concluir.

Nenhum snapshot deve ser restaurado automaticamente apenas porque uma API externa divergiu.

## Retorno operacional

Se a captura causar impacto não previsto, desabilitar os triggers de `public.jogos` antes de qualquer outra ação. Os registros já preservados devem permanecer intactos. A remoção das funções ou tabelas exige decisão humana específica e migração própria.
