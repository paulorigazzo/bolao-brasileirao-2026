# Bolão Brasileirão 2026 — V6.3.0D3

MELHORIA DE UX: SALVAMENTO INDIVIDUAL DE PALPITES

IMPLEMENTADO
- Botão “Salvar este palpite” dentro de cada card aberto e editável.
- Salvamento individual sem recolher o card, alterar a rolagem ou abrir automaticamente outro jogo.
- Manutenção do botão “Salvar todos” na barra fixa inferior.
- Contagem dinâmica de alterações pendentes: “Salvar todos (N)”.
- Estado “Tudo salvo” quando não há rascunhos pendentes.
- Destaque “Alteração não salva” atualizado durante a digitação.
- O salvamento coletivo processa apenas rascunhos completos e não salvos da rodada, inclusive quando algum card estiver oculto por filtro.
- Rascunhos só são removidos após confirmação do Supabase.

ARQUIVOS FUNCIONAIS ALTERADOS
- js/app.js
- css/styles.css

VERSÃO ATUALIZADA EM
- index.html
- package.json
- netlify/functions/_constants.mjs

TESTE MANUAL RECOMENDADO
1. Digitar um placar em um card e salvar apenas esse palpite.
2. Confirmar que o card permanece aberto e na mesma posição.
3. Alterar dois ou mais cards e conferir a contagem na barra fixa.
4. Salvar todos e confirmar que a contagem zera e aparece “Tudo salvo”.
5. Aplicar um filtro com rascunhos fora da visualização e confirmar que “Salvar todos” salva todas as pendências da rodada.
