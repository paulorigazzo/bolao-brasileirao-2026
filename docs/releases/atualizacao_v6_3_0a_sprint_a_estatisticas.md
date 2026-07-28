# Bolão Brasileirão 2026 — V6.3.0A

SPRINT A — CORREÇÃO DA BASE ESTATÍSTICA

Alterações implementadas exclusivamente na tela Estatísticas:

1. Criado js/statistics-engine.js, motor puro e reutilizável para classificar jogos.
2. Corrigido o card "Meu progresso".
3. A participação agora considera somente jogos encerrados e elegíveis:
   jogos encerrados com palpite / total de jogos encerrados elegíveis.
4. Jogos encerrados sem palpite são identificados como perdidos, e não como disponíveis.
5. "Disponíveis" agora representa apenas partidas futuras ainda abertas para palpite.
6. Jogos adiados e cancelados ficam fora do cálculo de participação.
7. Partidas ao vivo ou já bloqueadas aguardando resultado são exibidas separadamente.
8. Adicionado teste automatizado do motor estatístico.
9. Versão atualizada para v6.3.0a.

Nenhum card ou cálculo de outras telas foi alterado.
