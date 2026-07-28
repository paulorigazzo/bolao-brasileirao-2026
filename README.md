# Bolão Brasileirão 2026

Aplicação web mobile-first para palpites do Campeonato Brasileiro, com login Google, fechamento dos palpites no horário da partida, ranking, estatísticas, classificação oficial e área administrativa.

## Versão atual

`v6.4.0b — Meu Time 2.0`

O desenvolvimento atual está concentrado na Tela de Estatísticas. A Tela de Jogos está congelada momentaneamente na `v6.3.0d5`, salvo correção crítica.

## Tecnologias

- HTML, CSS e JavaScript modular;
- Supabase;
- Netlify e Netlify Functions;
- GitHub, GitHub Desktop e VS Code.

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

## Documentação

- [Versão atual](VERSION.md)
- [Changelog](CHANGELOG.md)
- [Roadmap](ROADMAP.md)
- [Fluxo de desenvolvimento](docs/process/DEVELOPMENT_WORKFLOW.md)
- [Deploy no Netlify](docs/deployment/NETLIFY.md)
- [Arquitetura](docs/architecture/OVERVIEW.md)
- [Notas detalhadas das versões](docs/releases/)

## Fluxo oficial

`feature branch → VS Code → netlify dev → testes → commit → push → Pull Request → main → Netlify`


## Meu Time 2.0

A v6.4.0b transforma o time favorito em uma experiência transversal, com tela dedicada, forma recente, próximo jogo, desempenho pessoal, sintonia, perfil e história da temporada.

## Gestão de participantes — v6.5.0

Cada usuário aprovado pode editar seu nome e cadastrar opcionalmente um celular com WhatsApp em **Meu Perfil**. O administrador também pode copiar um link de cadastro; novos usuários entram com Google, enviam uma solicitação e aguardam aprovação na Área ADM.

A implantação desta versão requer a execução da migração em `supabase/migrations/20260728_v6_5_0_gestao_participantes.sql`.
