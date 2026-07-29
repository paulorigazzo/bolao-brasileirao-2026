# Fluxo de desenvolvimento com Codex

## Antes de iniciar uma tarefa

- Verificar o Git status.
- Trabalhar somente com o working tree limpo.
- Confirmar que a branch base está atualizada.
- Ler o `AGENTS.md` e a documentação relacionada.
- Identificar os arquivos potencialmente afetados.
- Apresentar um plano antes da implementação.
- Aguardar aprovação humana.

## Implementação

- Criar uma branch específica para a tarefa.
- Implementar somente o escopo aprovado.
- Evitar refatorações paralelas.
- Preservar áreas não relacionadas.
- Executar testes e verificações.
- Mostrar o diff completo.
- Aguardar revisão antes do commit.

## Escopo das alterações

Cada Pull Request deve conter apenas um objetivo claro.

Não misturar:

- documentação;
- refatorações;
- correções;
- novas funcionalidades;

na mesma Pull Request, salvo quando estritamente necessário.

## Publicação

- Confirmar os arquivos alterados.
- Criar um commit com mensagem adequada.
- Fazer push da branch.
- Abrir um Pull Request, preferencialmente como Draft.
- Aguardar os checks e o Netlify Deploy Preview.
- Realizar validação visual ou funcional.
- Nunca fazer merge automaticamente.
- Excluir a branch após o merge.
- Atualizar a `main` local.

## Responsabilidades

### ChatGPT

- Definição funcional.
- Arquitetura.
- UX.
- Critérios de aceite.
- Revisão.

### Codex

- Análise do repositório.
- Implementação.
- Testes.
- Diff.
- Commit, push e criação do Pull Request após aprovação.

### Humano

- Aprovação do plano.
- Teste funcional.
- Revisão do Pull Request.
- Decisão de merge.

## Regras de segurança aprendidas

- O botão Undo do Codex não substitui a verificação do Git status.
- Nunca iniciar uma nova tarefa com alterações pendentes.
- Verificar se o GitHub CLI está instalado e autenticado antes de operações remotas.
- Arquivos temporários usados para montar Pull Requests não devem ser incluídos no commit.
- Parar diante de erros ou dependências ausentes, sem improvisar.
- Nunca fazer merge sem revisão humana.

## Histórico de validação

### 2026-07-29

Este fluxo foi validado pela primeira vez durante a integração do Codex ao projeto.

Fluxo validado:

- Análise
- Plano
- Aprovação humana
- Branch dedicada
- Implementação
- `npm run check`
- Revisão do diff
- Commit
- Push
- Pull Request
- Netlify Deploy Preview
- Revisão humana
- Merge
