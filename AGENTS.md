# AGENTS.md

# Bolão Brasileirão 2026

## Objetivo

Aplicação web mobile-first para gerenciamento de bolão do Campeonato Brasileiro.

## Tecnologias

- HTML
- CSS
- JavaScript modular
- Supabase
- Netlify
- GitHub

## Fonte da verdade

Antes de implementar qualquer funcionalidade, consulte:

- `README.md`
- `ROADMAP.md`
- `VERSION.md`
- `CHANGELOG.md`
- `docs/architecture/`
- `docs/process/`
- `docs/releases/`

## Fluxo de desenvolvimento

1. Partir da branch `main` atualizada.
2. Criar uma branch `feature/*`, `fix/*`, `docs/*` ou `hotfix/*`, conforme o caso.
3. Implementar apenas o escopo solicitado.
4. Preservar funcionalidades e áreas não relacionadas.
5. Executar `npm run check`.
6. Testar localmente com `netlify dev`.
7. Atualizar documentação quando necessário.
8. Abrir Pull Request para `main`.
9. Nunca fazer merge automaticamente sem revisão humana.

## Git e fluxo com agentes

- Antes de qualquer tarefa, verificar Git status.
- Se o working tree não estiver limpo, interromper a execução.
- Apresentar plano antes de modificar arquivos.
- Implementar somente após aprovação explícita.
- Executar `npm run check` antes do commit.
- Mostrar o diff e os arquivos alterados.
- Nunca fazer merge automaticamente.
- Seguir `docs/ai/CODEX_WORKFLOW.md`.

## Regras de negócio protegidas

Não alterar sem tarefa específica, critérios de aceite e testes:

- fechamento dos palpites no horário do jogo;
- pontuação de 10 pontos para placar exato;
- pontuação de 5 pontos para vencedor e saldo de gols;
- pontuação de 3 pontos para vencedor;
- pontuação de 1 ponto para empate correto com placar diferente;
- dados históricos e resultados oficiais;
- estrutura e políticas do Supabase;
- compatibilidade mobile-first;
- identidade visual e Design System existentes.

## Convenções de implementação

- Fazer alterações pequenas, focadas e reversíveis.
- Evitar refatorações não solicitadas.
- Reutilizar componentes, funções e tokens existentes.
- Não duplicar regras de negócio.
- Não introduzir dependências sem justificativa explícita.
- Preservar acessibilidade, responsividade e desempenho.
- Não editar a Tela de Jogos enquanto estiver congelada, salvo correção crítica ou tarefa explícita.
- Registrar arquivos alterados, áreas preservadas, testes executados e critérios de aceite.

## Versionamento e documentação

- Atualizar `VERSION.md` e `CHANGELOG.md` quando houver entrega funcional ou mudança de versão.
- Criar ou atualizar notas em `docs/releases/` quando aplicável.
- Atualizar `ROADMAP.md` somente quando o status ou o escopo de uma entrega mudar.
- Não duplicar documentação existente; prefira links para a fonte oficial.

## Segurança

- Nunca expor chaves, tokens, segredos ou dados pessoais.
- Não alterar autenticação, políticas RLS ou migrações sem revisão específica.
- Não executar operações destrutivas em produção.
- Migrações devem ser aditivas sempre que possível e documentar rollback ou mitigação.

## Prioridade atual

Projeto JARVIS — versão registrada no repositório.

A entrega prioritária é:

**E01.6 — Gestão Inteligente de Jogos Adiados**

Antes de implementá-la, confirmar o estado atual no `ROADMAP.md`, no `CHANGELOG.md` e nas notas de versão.
