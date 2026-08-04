# Prompt-base para tarefas com Codex

## Finalidade

Template declarativo e reutilizável para registrar os parâmetros de uma tarefa com Codex.

Fontes normativas:

- regras obrigatórias: `AGENTS.md`;
- procedimento operacional e contratos de saída: `docs/ai/CODEX_WORKFLOW.md`.

## Modelo

```text
Modo: [Planejamento | Implementação | Publicação | Recuperação | Encerramento]

Objetivo:
[Descreva um único resultado esperado.]

Contexto:
[Informe versão, entrega, problema observado e referências relevantes.]

Escopo:
- [Item incluído ou excluído]

Risco:
[baixo | médio | alto]

Justificativa do risco:
[Explique brevemente o maior nível aplicável.]

Critérios de aceite:
- CA1 — [resultado verificável]
- CA2 — [resultado verificável]

Evidências previstas:
[Para risco baixo, liste as validações pertinentes. Para risco médio ou alto, associe cada CA à evidência que o comprovará.]

Autorizações Git:
- Commit: [autorizado | não autorizado]
- Push: [autorizado | não autorizado]
- Pull Request: [autorizado | não autorizado]
- Merge: [autorizado | não autorizado]

Documentação adicional (quando aplicável):
- [caminho/arquivo]
```

## Exemplo documental

```text
Modo: Implementação

Objetivo:
Atualizar a documentação operacional da entrega D01.

Contexto:
Consolidação da documentação de governança.

Escopo:
- Atualizar os documentos de governança indicados.

Risco:
baixo

Justificativa do risco:
Alteração exclusivamente documental, sem efeito funcional.

Critérios de aceite:
- CA1 — Documentos sem responsabilidades duplicadas.
- CA2 — Links internos e terminologia consistentes.

Evidências previstas:
- Revisão cruzada dos documentos.
- Verificação de links e terminologia.

Autorizações Git:
- Commit: não autorizado
- Push: não autorizado
- Pull Request: não autorizado
- Merge: não autorizado

Documentação adicional (quando aplicável):
- docs/ai/
```
