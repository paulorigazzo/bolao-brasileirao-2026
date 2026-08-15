# Roadmap — Bolão Brasileirão 2026

Este é o roadmap oficial e a fonte única para status e prioridade do produto. Changelog e notas de release registram entregas históricas; não substituem este documento.

## Referência atual

- Versão funcional: `v6.21.4`.
- Prioridade: **manter o Bolão 2026 estável e independente e simplificar o Rigazzo como evolução caseira com Temporadas e Ligas**.
- Próxima etapa coordenada: redefinir no [Rigazzo](https://github.com/paulorigazzo/bolao-brasileirao-rigazzo) um MVP local com identidade visual reutilizada, dados sintéticos, Temporadas, Ligas, palpites e ranking. O programa R06B.2–R11 de transferência e equivalência de 2026 está congelado; a R06B.1 permanece somente na branch histórica `feature/r06b-read-only-pseudonymous-exporter`, sem merge na `main` e sem conexão real.
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

Situação das candidatas recentes:

1. **Rigazzo simplificado:** produto independente inicializado; a próxima definição deve priorizar o MVP caseiro de Temporadas e Ligas, sem depender da importação de 2026;
2. **Reavaliar quando necessário:** testes automatizados por fluxo e narrativa assistida por IA;
3. **Reavaliar quando necessário:** auditoria ampliada de acessibilidade.

Os critérios e motivos do adiamento de testes por fluxo e IA estão registrados na [análise de 3 de agosto de 2026](docs/product/ANALISE_QW2_QW3_2026-08-03.md).

O pipeline inicial de qualidade no GitHub Actions foi concluído como **QW1 técnico**, sem substituir a prioridade funcional. A matriz detalhada está em [`docs/BACKLOG.md`](docs/BACKLOG.md).

## E01 — Base funcional e operação

- ✅ Login Google e autorização de participantes.
- ✅ Palpites por rodada e fechamento 30 minutos antes do horário da partida.
- ✅ Regras oficiais de pontuação, resultados e ranking.
- ✅ Ranking provisório agregado para rodadas em aberto, isolado da classificação oficial.
- ✅ Preview sintético do Ranking provisório restrito a localhost e Deploy Previews.
- ✅ Consulta permanente do Ranking provisório da rodada atual pela Área ADM.
- ✅ Sincronização de jogos, datas, locais, placares e classificação.
- ✅ Sincronização ao vivo por minuto, restrita às partidas próximas e preservando a manutenção completa.
- ✅ Centro de Controle, diagnóstico, auditoria e acompanhamento da proteção de recuperação.
- ✅ Detalhamento determinístico das ocorrências de recuperação, com classificação informativa, conferência administrativa auditável e verificação de checkpoint.
- ✅ Ritmo visual uniforme entre os cards operacionais da Área ADM.
- ✅ E01.6 — Gestão Inteligente de Jogos Adiados.
- ✅ E01.7 — Consolidação da Integridade da Rodada.
- ✅ E01.8 — Recuperação competitiva com snapshots mínimos de jogos encerrados, palpites e checkpoints de Ranking.
- 🟡 Testes automatizados: motores e sincronização cobertos; expansão por fluxo reavaliada e adiada até existir necessidade concreta.

## E02 — Experiência e personalização

- ✅ Design system, identidade JARVIS e experiência mobile-first.
- ✅ Cards de jogos compactos e expansíveis.
- ✅ Tabela do campeonato responsiva.
- ✅ Meu Time 2.0 e personalização pelo clube favorito.
- ✅ Gestão de perfil e participantes.
- ✅ Comunicação individual e manual via WhatsApp na gestão de participantes e na Situação da Rodada.
- ✅ Transparência individual dos palpites após o encerramento oficial das partidas.
- ✅ Limite configurável de participantes ativos.
- ✅ Cadastro consolidado com nome, telefone opcional e time favorito opcional.
- 🟡 PWA: manifesto e ícones disponíveis; service worker e cache offline ausentes.
- 🟡 Acessibilidade: base de navegação, estados e rótulos presente; a [auditoria preliminar de 3 de agosto de 2026](docs/accessibility/AUDIT_2026-08-03.md) não demonstrou falha crítica e adiou uma intervenção ampla até existir necessidade concreta.
- 🔵 Dark mode.
- ✅ **E02.1 — Calendário Interativo de Partidas:** visão mensal pela Home, com quantidade de jogos, destaque do time favorito e acesso direto à partida na rodada original.
- 🔵 Central de notícias contextual.

## E03 — Inteligência estatística determinística

- ✅ Sprint A — base estatística e integridade dos indicadores.
- ✅ Sprint B — clareza, eficiência e confiabilidade.
- ✅ Sprint C — evolução por rodada e insights automáticos.
- ✅ Sprint D — perfil inteligente de palpites.
- ✅ Sprint E — histórico do ranking e trajetória do participante.
- ✅ Sprint F — dashboard, recordes, regularidade, comparações e medalhas.
- ✅ **Sprint G — Duelo entre participantes:** comparação direta acessada pelo Ranking, com métricas contextuais, placar recreativo por rodadas, títulos temporários, frase divertida e momento recente determinísticos.
- ✅ Indicadores pessoais relacionados ao time favorito.
- ✅ Textos de momento e recomendações produzidos por regras locais.

Esses recursos não utilizam IA generativa. Métricas e conclusões são calculadas por `js/statistics-engine.js` e `js/participant-duel-engine.js`, e apresentadas por `js/app.js`.

## E04 — Inteligência narrativa

- ✅ **E04.1:** motor rastreável concluído na E04.1A, experiência controlada na Home entregue na E04.1B e resumo coletivo administrativo entregue na E04.1C.
- ✅ **E04.1D:** acesso histórico aos Destaques da Rodada pelas Estatísticas, reutilizando o modal e o motor existentes sem criar uma visão redundante.
- ✅ **E04.1E:** explicação determinística das mudanças de posição, identificando participantes ultrapassados, desempenho na rodada e critérios de desempate no modal existente.
- 🟡 E04.2 — Narrativa assistida por IA reavaliada e adiada até existir um caso de uso sem redundância e com valor demonstrado.
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

- ✅ **R00 e R00.1 — Estratégia e handoff:** novo produto formalizado, responsabilidades separadas e sequência corrigida, sem código ou serviço externo.
- ✅ **R01A — Bootstrap do Rigazzo:** repositório privado e documentação inicial criados; fonte oficial transferida para o [novo projeto](https://github.com/paulorigazzo/bolao-brasileirao-rigazzo), sem alteração funcional do Bolão 2026.
- ✅ **R03 — Inventário somente leitura de 2026:** fontes, esquema, relações, funções, políticas, volumes agregados, dados pessoais e limitações documentados sem copiar dados nem modificar produção.
- ✅ **Simplificação estratégica:** Rigazzo redefinido como evolução caseira e incremental, com reaproveitamento seletivo da identidade visual e das regras comprovadas do Bolão 2026.
- 🟡 **R06A — Exportador sintético:** permanece integrado como entrega histórica, sem conexão real e sem constituir dependência do novo MVP.
- ⏸️ **R06B.1 — Adaptador pseudonimizado preparado:** preservado somente na branch histórica `feature/r06b-read-only-pseudonymous-exporter`, sem merge na `main`, sem manutenção ativa e disponível apenas para reaproveitamento seletivo futuro.
- ⏸️ **R04.1, R05.1 e R06B.2–R11:** programa de transferência, equivalência, identidades e importação de 2026 congelado por tempo indeterminado.
- ✅ **R07B.0 — Diretriz de transferência pseudonimizada:** os testes iniciais usarão somente dados competitivos necessários, sem nome, e-mail, telefone, `user_id` ou identificadores Auth; não há alteração funcional no Bolão 2026.
- 🔵 **MVP local do Rigazzo:** reutilizar seletivamente design system, ativos e padrões visuais; implementar Temporadas, Ligas, participantes, partidas, palpites e ranking com dados sintéticos.
- 🔵 **Piloto familiar:** criar Supabase e Netlify próprios somente depois da validação local, com autenticação, RLS e custos previamente aprovados.
- 🔮 **Histórico de 2026:** manter no aplicativo original; qualquer resumo ou importação futura será opcional e dependerá de necessidade demonstrada.
- ✅ **QW1 técnico:** Pipeline inicial de qualidade no GitHub Actions.

## Fora do escopo imediato

- geração automática de palpites;
- disparos automáticos ou em massa por WhatsApp;
- previsões apresentadas como fatos;
- mudanças nas regras de pontuação;
- transferência ou importação inicial do histórico de 2026 no Rigazzo;
- snapshots incrementais de transferência para o Rigazzo, cofre de identidades, equivalência automatizada e botões de exportação ou importação;
- Copiloto, IA generativa, pipeline automatizado de releases e aplicativo nativo no Rigazzo;
- evolução ampla da Tela de Jogos enquanto estiver congelada.

A implementação do MVP será detalhada no [repositório oficial do Rigazzo](https://github.com/paulorigazzo/bolao-brasileirao-rigazzo) quando o GitHub estiver disponível. Este projeto preserva a [`direção vigente e o histórico das decisões`](docs/architecture/BOLAO_BRASILEIRAO_RIGAZZO.md). A simplificação não autoriza migrações, serviços pagos, alterações de banco, exportações, importações, botões ou exposição aos participantes.
