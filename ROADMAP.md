# Roadmap — Bolão Brasileirão 2026

Este é o roadmap oficial e a fonte única para status e prioridade do produto. Changelog e notas de release registram entregas históricas; não substituem este documento.

## Referência atual

- Versão funcional: `v6.10.0d`.
- Prioridade: **QW1 — E03 Sprint G: Duelo entre participantes**.
- Próxima etapa recomendada: **E03 Sprint G — comparação direta, analítica e divertida entre dois participantes**.
- Tela de Jogos: congelada para evolução ampla, salvo correção crítica ou tarefa explícita.

## Legenda

- ✅ Concluído: disponível no código atual.
- 🟡 Parcial: existe uma base utilizável, mas o item ainda não está completo.
- 🔵 Planejado: aprovado como direção, ainda não implementado.
- 🔮 Longo prazo: visão futura, sem compromisso de versão.

## Priorização por Quick Wins

A classificação considera valor percebido, esforço restante e reaproveitamento do código existente:

- **QW1:** máximo retorno com baixo ou médio esforço;
- **QW2:** retorno muito alto com esforço moderado;
- **QW3:** bom candidato, mas com dependências ou esforço maior;
- **LP:** longo prazo ou mudança estrutural.

Prioridade funcional:

1. **QW1:** E03 Sprint G — duelo entre participantes;
2. **QW2:** histórico consolidado por rodada;
3. **QW2:** calendário consolidado de partidas.

O pipeline inicial de qualidade no GitHub Actions foi concluído como **QW1 técnico**, sem substituir a prioridade funcional. A matriz detalhada está em [`docs/BACKLOG.md`](docs/BACKLOG.md).

## E01 — Base funcional e operação

- ✅ Login Google e autorização de participantes.
- ✅ Palpites por rodada e fechamento no horário da partida.
- ✅ Regras oficiais de pontuação, resultados e ranking.
- ✅ Sincronização de jogos, datas, locais, placares e classificação.
- ✅ Centro de Controle, diagnóstico e auditoria administrativa.
- ✅ E01.6 — Gestão Inteligente de Jogos Adiados.
- ✅ E01.7 — Consolidação da Integridade da Rodada.
- 🟡 Testes automatizados: motor estatístico e sincronização cobertos; cobertura por tela ainda incompleta.

## E02 — Experiência e personalização

- ✅ Design system, identidade JARVIS e experiência mobile-first.
- ✅ Cards de jogos compactos e expansíveis.
- ✅ Tabela do campeonato responsiva.
- ✅ Meu Time 2.0 e personalização pelo clube favorito.
- ✅ Gestão de perfil e participantes.
- ✅ Comunicação individual e manual via WhatsApp.
- ✅ Transparência individual dos palpites após o encerramento oficial das partidas.
- ✅ Limite configurável de participantes ativos.
- ✅ Cadastro consolidado com nome, telefone opcional e time favorito opcional.
- 🟡 PWA: manifesto e ícones disponíveis; service worker e cache offline ausentes.
- 🟡 Acessibilidade: navegação por teclado, estados e rótulos presentes; auditoria completa ainda pendente.
- 🔵 Dark mode.
- 🔵 Calendário consolidado de partidas.
- 🔵 Central de notícias contextual.

## E03 — Inteligência estatística determinística

- ✅ Sprint A — base estatística e integridade dos indicadores.
- ✅ Sprint B — clareza, eficiência e confiabilidade.
- ✅ Sprint C — evolução por rodada e insights automáticos.
- ✅ Sprint D — perfil inteligente de palpites.
- ✅ Sprint E — histórico do ranking e trajetória do participante.
- ✅ Sprint F — dashboard, recordes, regularidade, comparações e medalhas.
- 🔵 **Sprint G — Duelo entre participantes:** comparação direta acessada pelo Ranking, com métricas contextuais, placar recreativo por rodadas, títulos temporários, frase divertida e momento recente determinísticos.
- ✅ Indicadores pessoais relacionados ao time favorito.
- ✅ Textos de momento e recomendações produzidos por regras locais.

Esses recursos não utilizam IA generativa. Métricas e conclusões são calculadas por `js/statistics-engine.js` e apresentadas por `js/app.js`.

## E04 — Inteligência narrativa

- ✅ **E04.1:** motor rastreável concluído na E04.1A, experiência controlada na Home entregue na E04.1B e resumo coletivo administrativo entregue na E04.1C.
- 🔵 E04.2 — Narrativa assistida por IA sobre métricas verificadas.
- 🔵 Explicação das mudanças no ranking.
- 🔵 Destaques e curiosidades da rodada.
- ✅ **E04.1C:** resumo coletivo determinístico e revisável, restrito à Área ADM e sem compartilhamento pelos participantes.

Princípio: o sistema calcula os fatos; a IA apenas explica dados autorizados e deve indicar origem e limitações.

## E05 — Copiloto do Bolão

- 🔵 Perguntas predefinidas sobre ranking, rodada e desempenho.
- 🔵 Interface contextual do Copiloto.
- 🔵 Perguntas em linguagem natural.
- 🔵 Contexto específico por tela.
- 🔵 Apoio administrativo baseado em diagnósticos existentes.
- 🔮 Memória de preferências.

## E06 — Expansão do produto

- 🔵 Ligas paralelas e múltiplos bolões.
- 🔵 Convites e gestão por liga.
- 🔵 Recursos sociais ampliados após a validação do Duelo entre participantes.
- ✅ **QW1 técnico:** Pipeline inicial de qualidade no GitHub Actions.
- 🔵 Pipeline automatizado de releases.
- 🔮 Simulações e recursos preditivos.
- 🔮 Aplicativo nativo.

## Fora do escopo imediato

- geração automática de palpites;
- disparos automáticos ou em massa por WhatsApp;
- previsões apresentadas como fatos;
- mudanças nas regras de pontuação;
- evolução ampla da Tela de Jogos enquanto estiver congelada.
