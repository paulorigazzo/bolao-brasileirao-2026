# Bolão Brasileirão 2026

Aplicação web mobile-first para palpites do Campeonato Brasileiro, com login Google, fechamento dos palpites no horário da partida, ranking, estatísticas, classificação oficial e área administrativa.

## Estado atual

- Versão funcional: `v6.9.0c`.
- Prioridade: preparar a E04 — Inteligência Narrativa da Rodada.
- Roadmap oficial: [`ROADMAP.md`](ROADMAP.md).
- Tela de Jogos: congelada para evolução ampla, salvo correção crítica ou tarefa explícita.

## Funcionalidades disponíveis

- palpites por rodada com fechamento individual no horário da partida;
- pontuação, ranking, histórico e estatísticas pessoais;
- consulta individual de palpites de partidas encerradas pela classificação;
- dashboard estatístico com evolução, perfil, recordes, regularidade, comparações e medalhas;
- tabela do Campeonato Brasileiro;
- Meu Time 2.0, com forma, próximo jogo, desempenho pessoal, sintonia e história da temporada;
- tratamento de jogos adiados, cancelados e rodadas parcialmente concluídas;
- gestão administrativa, diagnóstico, sincronização e auditoria;
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
- [Fluxo do Codex](docs/ai/CODEX_WORKFLOW.md)
- [Deploy no Netlify](docs/deployment/NETLIFY.md)
- [Notas detalhadas das versões](docs/releases/)

## Fluxo oficial

`branch específica → implementação → validação local → revisão → commit → push → Pull Request → revisão humana → main → Netlify`

## Migrações atuais

As entregas de gestão de participantes e limite configurável dependem das migrações versionadas em [`supabase/migrations/`](supabase/migrations/). A aplicação não executa migrações automaticamente.
