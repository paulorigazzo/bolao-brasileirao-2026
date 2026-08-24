# Índice de contexto para agentes

## Finalidade

Este índice orienta onde localizar contexto adicional conforme o escopo, o
impacto e o risco da tarefa. Ele não contém regras normativas, não substitui as
fontes apontadas e não altera a hierarquia definida em [`../../AGENTS.md`](../../AGENTS.md).

O núcleo obrigatório e o procedimento de expansão estão em
[`CODEX_WORKFLOW.md`](CODEX_WORKFLOW.md#leitura-mínima-por-tipo-de-tarefa).

## Roteamento

| Necessidade ou domínio | Onde procurar |
| --- | --- |
| Visão geral, instalação e operação | [`README.md`](../../README.md) |
| Prioridade, status e próximos passos | [`ROADMAP.md`](../../ROADMAP.md) |
| Versão funcional atual | [`VERSION.md`](../../VERSION.md) |
| Histórico de entregas | Busca temática no [`CHANGELOG.md`](../../CHANGELOG.md) e em [`../releases/`](../releases/) |
| Processo e modos de execução | [`CODEX_WORKFLOW.md`](CODEX_WORKFLOW.md) e [`../process/`](../process/) |
| Princípios permanentes | [`DEVELOPMENT_PRINCIPLES.md`](DEVELOPMENT_PRINCIPLES.md) |
| Estrutura de solicitações ao Codex | [`CODEX_PROMPT.md`](CODEX_PROMPT.md) |
| Decisão anterior de engenharia ou governança | Busca temática no [`DECISION_LOG.md`](DECISION_LOG.md) |
| Arquitetura e contratos do sistema | Documento relacionado em [`../architecture/`](../architecture/) |
| Interface, acessibilidade ou design | Código e documentação específicos do componente ou tela afetada |
| Supabase, banco, Auth, RLS ou dados | Código, documentação, políticas e migrações relacionadas em `supabase/` |
| Netlify, Functions, deploy ou infraestrutura | `netlify.toml`, código em `netlify/` e documentação relacionada |
| Versão histórica específica | Release correspondente em [`../releases/`](../releases/) e trecho do changelog |

## Expansão segura

Em históricos extensos, buscar primeiro o assunto, ler o trecho relevante e
carregar a seção ou o documento completo quando necessário. Tarefas combinadas
devem acumular as fontes dos domínios afetados.

Diante de dúvida material sobre a necessidade de uma fonte adicional, conflito
entre fontes ou impacto incerto, expandir o contexto antes de implementar.
Quanto maior o risco, maior pode e deve ser o contexto consultado. Em tarefas de
risco alto, segurança, correção e evidência prevalecem sobre economia de contexto.
