# Bolão Brasileirão 2026 — V6.3.0C1

HOTFIX — AUDITORIA DE JOGOS ADIADOS

VALIDAÇÃO TÉCNICA
- O status "Adiada" exibido no painel vem do status gravado no Supabase.
- A sincronização mapeia POSTPONED/SUSPENDED da football-data.org para "adiado".
- Foi encontrada uma lacuna: placares antigos eram removidos de jogos futuros, mas podiam permanecer em jogos adiados ou cancelados.

CORREÇÕES
1. Placar incompatível é removido automaticamente de partidas futuras, adiadas e canceladas.
2. Cada alerta mostra times, placar, rodada, data, local, status gravado e ID.
3. Mensagem explica a ação esperada da próxima sincronização.
4. Novo teste automatizado da política de status e placar.

COMMIT SUGERIDO
fix(admin): v6.3.0c1 auditoria de jogos adiados
