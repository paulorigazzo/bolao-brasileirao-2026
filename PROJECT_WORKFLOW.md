# Fluxo de trabalho do projeto

## Branches

- `main`: versão estável e publicada em produção.
- `feature/*`: desenvolvimento de novas funcionalidades e correções.

## Processo

1. Criar ou selecionar uma branch `feature/*`.
2. Implementar alterações pequenas e testáveis.
3. Executar `npm run check`.
4. Fazer commit e push.
5. Abrir um Pull Request para `main`.
6. Revisar e aprovar a versão.
7. Fazer merge na `main`.
8. Confirmar o deploy automático no Netlify.

## Deploy

O Netlify acompanha exclusivamente a branch `main`.

Alterações em branches de desenvolvimento não devem modificar o site de produção.