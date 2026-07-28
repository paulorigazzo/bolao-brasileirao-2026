# Fluxo de desenvolvimento

## Branches

- `main`: versão estável e publicada em produção.
- `feature/*`: novas funcionalidades, refinamentos e correções.
- `hotfix/*`: correções urgentes de produção, quando necessário.

## Processo oficial

1. Atualizar a branch `main` no GitHub Desktop.
2. Criar ou selecionar uma branch `feature/*`.
3. Abrir o repositório no VS Code.
4. Substituir os arquivos completos fornecidos no pacote da Sprint.
5. Manter `netlify dev` em execução.
6. Testar em `http://localhost:8888`.
7. Executar `npm run check`.
8. Revisar as alterações no Source Control do VS Code ou no GitHub Desktop.
9. Fazer commit e push.
10. Abrir Pull Request para `main`.
11. Validar o deploy de preview, quando disponível.
12. Fazer merge e confirmar o deploy de produção.

## Princípio de segurança

Cada Sprint deve declarar claramente:

- arquivos alterados;
- áreas funcionais preservadas;
- testes executados;
- critérios de aceite;
- branch e mensagem de commit sugeridas.

## Substituição de arquivos completos

Este é o método preferido do projeto. Os arquivos recebidos devem substituir os correspondentes dentro da pasta local do repositório. A substituição não deve apagar arquivos não mencionados no pacote.
