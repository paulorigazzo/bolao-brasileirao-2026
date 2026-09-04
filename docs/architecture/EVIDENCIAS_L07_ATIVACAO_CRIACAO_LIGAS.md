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

## Aplicação remota

- projeto canônico: `hfrygykchiqhxcgabedm`;
- migração registrada: `20260904194756_centralize_league_administration`;
- aplicação concluída com a Pull Request em Draft;
- arquivo local e histórico canônico reconciliados com a versão remota.

## Resultados

- `L07_OK`: criação, autorização exclusiva, ciclo de vida, auditoria e rollback;
- `L06_OK`: gestão de membros e preservação após a centralização;
- `L04_OK`: equivalência, isolamento e retroatividade;
- produção preservada com 1 liga, 1 administrador ativo e 1.135 palpites;
- nenhuma duplicação de palpite e nenhum dado sintético persistente;
- `anon` não executa criação nem consulta a condição de gestor;
- contas autenticadas não leem diretamente a auditoria e não alteram papéis;
- RLS permanece habilitada na auditoria privada.

Os advisors não apontaram falha específica que invalide a L07. Os avisos sobre
funções privilegiadas autenticadas são esperados para esta API: cada função faz
autorização interna pelo gestor central. Alertas históricos fora do escopo foram
preservados para tratamento próprio.
