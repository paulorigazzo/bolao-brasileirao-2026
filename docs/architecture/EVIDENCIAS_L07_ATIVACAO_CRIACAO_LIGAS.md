# Evidências da L07 — Ativação e criação centralizada de ligas

## Contrato

A leitura oficial usa a liga ativa e falha fechada, sem cálculo global
silencioso. O modo legado permanece explícito somente como contingência.

Somente o gestor central pode criar e administrar ligas. A identificação deriva
da Liga Standard e da autorização global canônica; nenhum e-mail ou `user_id`
fica gravado no código.

## Evidências exigidas antes do merge

- teste automatizado dos contratos de interface e SQL;
- ensaio SQL transacional positivo e negativo;
- equivalência e isolamento da Liga Standard;
- ausência de duplicação ou alteração de palpites;
- validação móvel e desktop com `netlify dev`;
- advisors de segurança e desempenho;
- aplicação remota reconciliada com `migration-history.json`.

Os resultados finais serão registrados nesta entrega após a aplicação remota,
ainda durante a revisão da Pull Request em Draft.
