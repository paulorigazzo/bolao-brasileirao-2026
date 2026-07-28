# Versão atual

- **Versão:** `v6.3.0f2`
- **Nome:** Consolidação Arquitetural da Tela de Estatísticas — Sprint 2
- **Status:** candidata para validação

## Escopo

A Sprint 2 centraliza o modelo de apresentação das estatísticas no motor, elimina cálculos duplicados da interface e divide a renderização dos painéis principais em funções menores.

## Alterações principais

- modelo único `buildStatisticsDashboardModel`;
- insights gerados em um único ponto;
- painel executivo, recordes, medalhas e insights desacoplados de `renderStats`;
- remoção de cálculos redundantes de sequência e comparação;
- testes automatizados do novo modelo.
