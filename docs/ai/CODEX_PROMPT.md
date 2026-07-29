# Prompt-base para tarefas com Codex

## Como usar

Copie o modelo abaixo ao iniciar uma tarefa. Preencha os campos e remova instruções que não se apliquem. O prompt não substitui `AGENTS.md` nem `docs/ai/CODEX_WORKFLOW.md`.

## Modelo

```text
Modo: [Planejamento | Implementação | Publicação | Recuperação]

Objetivo:
[Descreva um único resultado esperado.]

Contexto:
[Informe versão, entrega, problema observado e referências relevantes.]

Escopo:
1. [Item incluído]
2. [Item incluído]

Fora do escopo:
- [Área que deve permanecer inalterada]
- [Área que deve permanecer inalterada]

Arquivos esperados:
- [caminho/arquivo]

Critérios de aceite:
1. [Resultado verificável]
2. [Resultado verificável]

Validações obrigatórias:
- [comando ou verificação]
- [teste manual, se aplicável]

Restrições:
- Ler AGENTS.md e docs/ai/CODEX_WORKFLOW.md antes de iniciar.
- Verificar o Git status e interromper se o working tree não estiver limpo.
- Apresentar o plano e aguardar aprovação antes de modificar arquivos.
- Não ampliar o escopo sem nova aprovação.
- Não alterar regras protegidas, banco ou infraestrutura sem autorização específica.

Git:
- Branch: [tipo/nome-da-branch]
- Commit: [permitido somente após aprovação | não realizar]
- Push: [permitido somente após aprovação | não realizar]
- Pull Request: [permitido somente após aprovação | não realizar]
- Merge: nunca realizar automaticamente.

Ao finalizar:
1. Mostrar a branch e os arquivos modificados.
2. Resumir as alterações por arquivo.
3. Informar áreas preservadas.
4. Informar validações executadas e resultados.
5. Mostrar o diff para revisão.
6. Informar riscos, limitações e pendências.
7. Aguardar revisão humana.
```

## Campos mínimos

Uma solicitação deve, sempre que possível, definir:

- um objetivo;
- inclusões e exclusões;
- critérios verificáveis;
- permissões Git;
- condições de encerramento.

Se um campo essencial estiver ausente, o agente deve primeiro tentar obtê-lo das fontes da verdade. Somente deve pedir esclarecimento quando uma suposição puder alterar materialmente o resultado.

## Exemplo documental

```text
Modo: Implementação

Objetivo:
Atualizar a documentação operacional da entrega D01.

Escopo:
- Atualizar os documentos de governança indicados.
- Alterar somente arquivos Markdown.

Fora do escopo:
- Código, SQL, Supabase, Netlify e funcionalidades.
- ROADMAP.md.

Critérios de aceite:
- Documentos sem responsabilidades duplicadas.
- Links internos e terminologia consistentes.
- Nenhum arquivo fora do escopo alterado.

Git:
- Branch: docs/documentation-v2
- Não realizar commit, push ou Pull Request.

Ao finalizar:
- Mostrar o diff e aguardar revisão humana.
```
