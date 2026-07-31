# QW1 técnico — Pipeline inicial de qualidade

## Objetivo

Executar automaticamente as verificações existentes do projeto em toda Pull Request direcionada à `main`.

## Entrega

- workflow de qualidade no GitHub Actions;
- instalação reproduzível das dependências com `npm ci`;
- execução automática de `npm run check`;
- cancelamento de execuções anteriores quando a mesma Pull Request recebe novas alterações;
- permissões restritas à leitura do repositório.

## Preservado

- versão funcional `v6.10.0d`;
- telas e comportamentos do aplicativo;
- Netlify, Supabase e variáveis de ambiente;
- publicação, merge e releases, que continuam dependentes de ação humana.

## Validação

Além da execução local de `npm run check`, o primeiro resultado real do pipeline deve ser confirmado na Pull Request desta entrega.
