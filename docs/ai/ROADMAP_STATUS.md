# Status para agentes de IA

## Estado atual

A versão registrada no `README.md` do repositório é:

**v6.7.0b — Projeto JARVIS**

O desenvolvimento atual indicado no repositório está concentrado na Tela de Estatísticas. A Tela de Jogos está congelada momentaneamente na `v6.3.0d5`, salvo correção crítica ou tarefa explícita.

## Prioridade acordada

**E01.6 — Gestão Inteligente de Jogos Adiados**

Antes de iniciar a implementação, o agente deve:

1. consultar `ROADMAP.md`;
2. consultar `CHANGELOG.md`;
3. consultar `VERSION.md`;
4. revisar as notas mais recentes em `docs/releases/`;
5. localizar a implementação atual de partidas adiadas;
6. confirmar quais partes da E01.6 já estão implementadas;
7. propor um plano incremental sem duplicar funcionalidades existentes.

## Critérios gerais

A solução deve:

- diferenciar jogo adiado de jogo futuro comum;
- preservar palpites já registrados;
- não reabrir nem encerrar palpites indevidamente;
- comportar partidas sem nova data definida;
- atualizar a exibição quando a nova data for conhecida;
- manter consistência entre Home, Jogos, Área ADM, ranking e estatísticas;
- preservar a neutralidade das telas e a personalização por time favorito;
- funcionar em dispositivos móveis;
- ser validada com casos reais existentes no projeto.

## Observação

Este arquivo é um resumo operacional. O `ROADMAP.md` continua sendo a fonte oficial para escopo, status e priorização.
