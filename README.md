# Bolão Brasileirão 2026

Aplicação web mobile-first para palpites do Campeonato Brasileiro, com login Google, fechamento dos palpites no horário da partida, ranking, estatísticas, classificação oficial e área administrativa.

## Versão atual

`v6.7.1 — Projeto JARVIS`

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

## Gestão de participantes — v6.5.2

Cada usuário aprovado pode editar seu nome e cadastrar opcionalmente um celular com WhatsApp em **Meu Perfil**. O administrador também pode copiar um link de cadastro; novos usuários entram com Google, enviam uma solicitação e aguardam aprovação na Área ADM.

A implantação desta versão requer a execução da migração em `supabase/migrations/20260728_v6_5_0_gestao_participantes.sql`.


### Exclusão permanente de participante
A Área ADM permite excluir os dados de um participante do bolão. Antes de publicar, execute `supabase/migrations/20260728_v6_5_1_exclusao_participante.sql`. A operação remove palpites, perfil e autorização, mas preserva a conta externa de autenticação.

## Comunicação via WhatsApp — v6.5.3

A Área ADM permite preparar mensagens individuais para participantes com celular cadastrado. O administrador escolhe um modelo, revisa o texto e conclui o envio manualmente no WhatsApp. Não existem histórico interno, automação ou disparos em massa.


## Projeto JARVIS — v6.7.1

- Área ADM: card de partidas adiadas expansível, com detalhes de confronto, programação e local.

JARVIS é o codinome da identidade visual oficial do Bolão. A versão aplica a marca Série 4.1 ao cabeçalho, carregamento, apresentação, favicon, PWA e compartilhamento, sem alterar funcionalidades.
