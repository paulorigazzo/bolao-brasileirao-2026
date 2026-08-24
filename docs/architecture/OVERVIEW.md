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

## Recuperação competitiva

Resultados encerrados, palpites relacionados e checkpoints de Ranking possuem uma camada interna mínima de preservação no Supabase. O desenho, os limites de acesso e o procedimento manual de reconstrução estão em [`RECUPERACAO_COMPETITIVA.md`](RECUPERACAO_COMPETITIVA.md).

## Migração da fonte esportiva

- o plano canônico para avaliar e eventualmente substituir a API esportiva está
  em [`MIGRACAO_API_ESPORTIVA.md`](MIGRACAO_API_ESPORTIVA.md);
- o documento separa decisões aceitas, propostas e pendências, além de definir
  sombra, critérios de avanço, preservação de identidades e rollback;
- o plano é referência arquitetural e não autoriza alterações de banco, código,
  configuração, contratação, deploy ou troca de fornecedor.

## Regras protegidas

- palpites fecham 30 minutos antes do horário do jogo;
- 10 pontos: placar exato;
- 5 pontos: vencedor e saldo de gols;
- 3 pontos: vencedor;
- 1 ponto: empate correto com placar diferente.

Mudanças nessas regras exigem Sprint específica, testes e atualização explícita da documentação.

## Evolução para Temporadas e Ligas

A evolução estrutural ocorrerá no produto independente **Bolão Brasileirão Rigazzo**, conforme [`BOLAO_BRASILEIRAO_RIGAZZO.md`](BOLAO_BRASILEIRAO_RIGAZZO.md). O aplicativo atual permanece como fonte oficial de 2026 e não receberá a fundação experimental. A transferência futura de dados será manual, unidirecional e sujeita a entregas próprias, sem autorização atual para código, banco ou serviços externos.
