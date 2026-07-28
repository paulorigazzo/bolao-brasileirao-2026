# Bolão Brasileirão 2026 — V6.3.0C

SPRINT C — LEITURA E EVOLUÇÃO DAS ESTATÍSTICAS

ESCOPO
- Alterações restritas à tela Estatísticas.
- Nenhum card ou cálculo de outras telas foi redesenhado.

IMPLEMENTADO
1. Melhor rodada detalhada com pontos, acertos, jogos e placares exatos.
2. Evolução por rodada com média por jogo e variação contra a rodada anterior.
3. Tendência recente calculada a partir das últimas rodadas.
4. Identificação automática do tipo de acerto mais frequente.
5. Painel "O que seus números revelam" com insights automáticos.
6. Estados seguros quando ainda existem poucos resultados.
7. Testes automatizados do analisador de desempenho por rodada.

VALIDAÇÃO
- npm run check
- npm run test:stats

MENSAGEM DE COMMIT SUGERIDA
feat(stats): v6.3.0c Sprint C
