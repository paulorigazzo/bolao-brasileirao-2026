# Bolão Brasileirão 2026

Aplicação web mobile-first para palpites do Campeonato Brasileiro, com login Google, fechamento dos palpites no horário da partida, ranking, estatísticas, classificação oficial e área administrativa.

## Estado atual

- Versão funcional: `v6.15.2`.
- Prioridade, status e sequência atuais: [`ROADMAP.md`](ROADMAP.md).
- Evolução para Temporadas e Ligas: conduzida no produto independente [Bolão Brasileirão Rigazzo](https://github.com/paulorigazzo/bolao-brasileirao-rigazzo) como evolução caseira e incremental, reutilizando seletivamente a experiência visual de 2026. O programa de transferência R06B.2–R11 está congelado e a [direção vigente e o histórico da decisão](docs/architecture/BOLAO_BRASILEIRAO_RIGAZZO.md) permanecem documentados sem alteração funcional deste aplicativo.
- Tela de Jogos: congelada para evolução ampla, salvo correção crítica ou tarefa explícita.

## Funcionalidades disponíveis

- palpites por rodada com fechamento individual no horário da partida;
- pontuação, ranking, histórico e estatísticas pessoais;
- destaques pessoais e coletivos por rodada, com resumo controlado na Home e detalhamento acessível;
- explicação determinística das mudanças de posição no Ranking pelos Destaques da Rodada;
- consulta individual de palpites de partidas encerradas pela classificação;
- duelo determinístico entre dois participantes, com placar por rodadas, títulos e momento recente;
- dashboard estatístico com evolução, perfil, recordes, regularidade, comparações e medalhas;
- tabela do Campeonato Brasileiro;
- Meu Time 2.0, com forma, próximo jogo, desempenho pessoal, sintonia e história da temporada;
- tratamento de jogos adiados, cancelados e rodadas parcialmente concluídas;
- calendário mensal interativo com acesso direto à partida mais relevante de cada dia;
- gestão administrativa, diagnóstico, sincronização e auditoria;
- snapshots competitivos internos para reconstrução de jogos encerrados, palpites e Ranking;
- cadastro consolidado com nome, telefone opcional e time favorito opcional, seguido de aprovação administrativa;
- preparação manual de mensagens individuais pelo WhatsApp;
- manifesto web e ativos de PWA, ainda sem service worker ou cache offline.

Não há Copiloto, chat ou geração de texto por IA em produção. Os textos inteligentes atuais são produzidos por regras determinísticas no navegador.

## Tecnologias

- HTML, CSS e JavaScript modular;
- Supabase;
- Netlify e Netlify Functions;
- GitHub.

## Desenvolvimento local

```powershell
npm install
netlify dev
```

Abra `http://localhost:8888`.

## Verificações

```powershell
npm run check
```

O comando verifica versões e referências, sintaxe, motor estatístico e política de sincronização.

## Documentação

- [Versão atual](VERSION.md)
- [Changelog oficial](CHANGELOG.md)
- [Roadmap oficial](ROADMAP.md)
- [Estratégia de IA](docs/AI_STRATEGY.md)
- [Visão do produto](docs/PRODUCT_VISION.md)
- [Arquitetura](docs/architecture/OVERVIEW.md)
- [Recuperação competitiva](docs/architecture/RECUPERACAO_COMPETITIVA.md)
- [Bolão Brasileirão Rigazzo — repositório oficial](https://github.com/paulorigazzo/bolao-brasileirao-rigazzo)
- [Rigazzo — decisão histórica e contratos da origem](docs/architecture/BOLAO_BRASILEIRAO_RIGAZZO.md)
- [Fluxo do Codex](docs/ai/CODEX_WORKFLOW.md)
- [Deploy no Netlify](docs/deployment/NETLIFY.md)
- [Notas detalhadas das versões](docs/releases/)

## Fluxo oficial

`branch específica → implementação → validação local → revisão → commit → push → Pull Request → revisão humana → main → Netlify`

## Migrações atuais

As entregas de gestão de participantes e limite configurável dependem das migrações versionadas em [`supabase/migrations/`](supabase/migrations/). A aplicação não executa migrações automaticamente.
