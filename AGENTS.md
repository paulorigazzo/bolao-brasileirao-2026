# AGENTS.md

# Bolão Brasileirão 2026

## Objetivo

Aplicação web mobile-first para gerenciamento de bolão do Campeonato Brasileiro.

## Tecnologias

- HTML;
- CSS;
- JavaScript modular;
- Supabase;
- Netlify;
- GitHub.

## Aplicação destas regras

Estas instruções se aplicam a todo o repositório e a qualquer agente de IA que atue nele.

Em caso de divergência, prevalece a seguinte ordem:

1. instrução humana explícita para a tarefa atual;
2. este `AGENTS.md`;
3. `docs/ai/CODEX_WORKFLOW.md`;
4. documentação oficial relacionada ao escopo;
5. contexto externo ou histórico de conversas.

Uma instrução humana não autoriza implicitamente ações destrutivas, exposição de segredos, merge automático ou mudanças fora do escopo.

## Fonte da verdade

Antes de implementar, consultar:

- `README.md`;
- `ROADMAP.md`;
- `VERSION.md`;
- `CHANGELOG.md`;
- `docs/architecture/`;
- `docs/process/`;
- `docs/releases/`;
- a documentação específica do escopo.

Para trabalho com agentes, consultar também:

- `docs/ai/CODEX_WORKFLOW.md`;
- `docs/ai/DEVELOPMENT_PRINCIPLES.md`;
- `docs/ai/CODEX_PROMPT.md`;
- `docs/ai/DECISION_LOG.md`.

O repositório prevalece sobre pacotes antigos, arquivos locais externos e memória de conversas.

## Modos de execução

Toda solicitação deve usar, quando aplicável, um destes modos:

- **Planejamento:** analisar o repositório e propor um plano, sem modificar arquivos.
- **Implementação:** executar alterações previamente aprovadas e validá-las.
- **Publicação:** realizar somente as ações Git ou de entrega explicitamente autorizadas.
- **Recuperação:** diagnosticar e restaurar um estado seguro após falha, regressão ou interrupção.

Os modos não substituem os portões de aprovação. Em especial, Implementação não autoriza Publicação, e Publicação nunca autoriza merge automático.

## Portões obrigatórios

### Antes de modificar arquivos

1. Verificar a branch e o Git status.
2. Interromper se o working tree não estiver limpo.
3. Ler as fontes da verdade relacionadas.
4. Identificar objetivo, escopo, exclusões, critérios de aceite e riscos.
5. Apresentar um plano com os arquivos potencialmente afetados.
6. Aguardar aprovação humana explícita.
7. Criar uma branch `feature/*`, `fix/*`, `docs/*` ou `hotfix/*`, conforme a tarefa.

### Durante a implementação

- Implementar somente o escopo aprovado.
- Manter alterações pequenas, focadas e reversíveis.
- Preservar áreas não relacionadas.
- Não ampliar o escopo sem nova aprovação.
- Parar diante de conflito, dependência ausente, risco não previsto ou alteração externa no working tree.
- Não registrar segredos, tokens, chaves ou dados pessoais em código, documentação, logs ou respostas.

## Fidelidade à especificação

- Tratar objetivo, escopo, exclusões, critérios de aceite e restrições aprovados como contrato da tarefa.
- Implementar todos os requisitos aprovados sem omissões, substituições silenciosas ou interpretações que alterem seu sentido.
- Não adicionar comportamentos, arquivos ou decisões não solicitados, mesmo que pareçam melhorias.
- Validar cada critério de aceite com evidência proporcional ao risco.
- Diante de ambiguidade material, conflito ou impossibilidade técnica, interromper e solicitar decisão humana.
- Registrar no encerramento qualquer desvio autorizado, limitação ou item não atendido.

### Antes da entrega para revisão

1. Revisar o diff completo.
2. Confirmar que somente arquivos aprovados foram alterados.
3. Executar as validações proporcionais ao escopo.
4. Informar arquivos alterados, resumo por arquivo, áreas preservadas, testes, limitações e critérios de aceite.
5. Aguardar revisão humana antes de commit, push, Pull Request ou merge, salvo autorização explícita e específica para cada etapa.

## Fluxo de desenvolvimento

1. Partir da `main` atualizada.
2. Criar uma branch específica.
3. Implementar apenas o escopo aprovado.
4. Executar `npm run check` quando houver alteração que possa ser validada pelo projeto.
5. Testar localmente com `netlify dev` quando houver impacto funcional ou visual.
6. Atualizar documentação de versão quando aplicável.
7. Mostrar o diff e aguardar revisão.
8. Após autorização, realizar commit, push e abrir Pull Request para `main`.
9. Nunca fazer merge automaticamente.

O procedimento detalhado está em `docs/ai/CODEX_WORKFLOW.md`.

## Regras de negócio protegidas

Não alterar sem tarefa específica, critérios de aceite e testes:

- fechamento dos palpites no horário do jogo;
- 10 pontos para placar exato;
- 5 pontos para vencedor e saldo de gols;
- 3 pontos para vencedor;
- 1 ponto para empate correto com placar diferente;
- dados históricos e resultados oficiais;
- estrutura e políticas do Supabase;
- compatibilidade mobile-first;
- identidade visual e Design System existentes.

## Áreas sensíveis

- Não alterar autenticação, políticas RLS, migrações ou estrutura do Supabase sem revisão específica.
- Não alterar Netlify, Functions, deploy ou variáveis de ambiente sem tarefa explícita.
- Migrações devem ser aditivas sempre que possível e documentar rollback ou mitigação.
- Não executar operações destrutivas em produção.
- Não editar a Tela de Jogos enquanto estiver congelada, salvo correção crítica ou tarefa explícita.

## Convenções de implementação

- Evitar refatorações não solicitadas.
- Reutilizar componentes, funções e tokens existentes.
- Não duplicar regras de negócio.
- Não introduzir dependências sem justificativa e aprovação explícitas.
- Preservar acessibilidade, responsividade e desempenho.
- Adotar os princípios de `docs/ai/DEVELOPMENT_PRINCIPLES.md`.
- Registrar decisões duradouras de engenharia e governança em `docs/ai/DECISION_LOG.md`.

## Versionamento e documentação

- Atualizar `VERSION.md` e `CHANGELOG.md` quando houver entrega funcional, mudança de versão ou necessidade explícita de registro oficial.
- Criar ou atualizar notas em `docs/releases/` quando aplicável.
- Atualizar `ROADMAP.md` somente quando o status ou o escopo de uma entrega mudar.
- Não duplicar documentação; preferir links para a fonte oficial.
- Alterações exclusivamente documentais não exigem automaticamente nova versão.

## Validação proporcional

- Alteração de código: executar `npm run check` e testes específicos.
- Alteração funcional ou visual: também validar com `netlify dev`.
- Alteração exclusivamente documental: revisar estrutura, links, consistência, ortografia e diff; executar `npm run check` quando o comando também validar documentação ou quando solicitado.
- Informar claramente qualquer validação não executada e o motivo.

## Prioridade atual

A versão, o estado e a prioridade oficiais devem ser confirmados em `VERSION.md`, `ROADMAP.md`, `CHANGELOG.md` e nas notas mais recentes de `docs/releases/`. Não assumir como atual uma prioridade registrada apenas em conversas ou documentos auxiliares.
