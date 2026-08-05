# Visão geral da arquitetura

O Bolão Brasileirão 2026 é uma aplicação web mobile-first construída com HTML, CSS e JavaScript modular.

## Camadas principais

- `index.html`: estrutura das telas e pontos de montagem da interface.
- `css/`: design system, componentes, temas e estilos específicos.
- `js/app.js`: integração da interface, navegação e fluxos da aplicação.
- `js/statistics-engine.js`: cálculos e regras exclusivas da Tela de Estatísticas.
- `js/round-highlights-engine.js`: fatos pessoais e coletivos rastreáveis por rodada, sem dependência da interface.
- `js/config.js`: configuração central do aplicativo.
- `js/motion.js`: tokens e comportamentos de animação.
- `netlify/functions/`: sincronização de jogos, classificação e diagnóstico.
- `scripts/`: verificações automatizadas e testes.

## Serviços

- Supabase: autenticação e persistência de dados.
- Netlify: hospedagem, deploy e execução das Functions.
- GitHub: fonte oficial do código, histórico e revisão por Pull Request.

## Regras protegidas

- palpites fecham no horário do jogo;
- 10 pontos: placar exato;
- 5 pontos: vencedor e saldo de gols;
- 3 pontos: vencedor;
- 1 ponto: empate correto com placar diferente.

Mudanças nessas regras exigem Sprint específica, testes e atualização explícita da documentação.

## Evolução para Temporadas e Ligas

A evolução estrutural ocorrerá no produto independente **Bolão Brasileirão Rigazzo**, conforme [`BOLAO_BRASILEIRAO_RIGAZZO.md`](BOLAO_BRASILEIRAO_RIGAZZO.md). O aplicativo atual permanece como fonte oficial de 2026 e não receberá a fundação experimental. A transferência futura de dados será manual, unidirecional e sujeita a entregas próprias, sem autorização atual para código, banco ou serviços externos.
