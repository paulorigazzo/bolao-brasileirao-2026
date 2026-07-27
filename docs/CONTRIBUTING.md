# Guia de Contribuição

## Fluxo recomendado

1. Atualizar a branch `main`.
2. Criar uma branch por Sprint ou correção.
3. Alterar apenas os arquivos do escopo.
4. Validar em celular e computador.
5. Revisar o diff antes do commit.
6. Atualizar a documentação afetada.
7. Abrir Pull Request.
8. Publicar após validação.

## Convenção de branches

- `feature/nome-da-funcionalidade`
- `fix/nome-da-correcao`
- `docs/nome-da-documentacao`
- `release/vX.Y.Z`

## Commits

Preferir mensagens objetivas:

- `feat: adicionar histórico do ranking`
- `fix: corrigir responsividade das estatísticas`
- `docs: atualizar roadmap`
- `refactor: modularizar cards de jogos`

## Critérios de conclusão

Um item só recebe ✅ **Concluído** quando:

- está implementado;
- foi testado;
- não quebrou outras telas;
- funciona nos tamanhos de tela relevantes;
- possui tratamento básico de erro;
- a documentação foi atualizada.

## Cuidados

- Não misturar alterações não relacionadas.
- Não armazenar chaves ou senhas no repositório.
- Não alterar a regra de pontuação sem registrar a decisão.
- Não considerar protótipo visual como funcionalidade concluída.
