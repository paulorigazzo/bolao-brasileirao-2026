# Roadmap — Bolão Brasileirão 2026

Este é o roadmap oficial e a fonte única para status e prioridade do produto. Changelog e notas de release registram entregas históricas; não substituem este documento.

## Referência atual

- Versão funcional: `v6.14.1`.
- Prioridade: **manter o Bolão 2026 estável e independente enquanto o desenvolvimento estrutural do Rigazzo segue em workspace próprio**.
- Próxima etapa coordenada: planejar a **R07A — Identidades, cofre e pseudonimização** no [Rigazzo](https://github.com/paulorigazzo/bolao-brasileirao-rigazzo), inicialmente apenas com dados sintéticos. A futura **R07B — Consentimento de exportação** pertence a este projeto e exigirá entrega independente de risco alto. A R06A foi homologada pela [PR #94](https://github.com/paulorigazzo/bolao-brasileirao-2026/pull/94); o adaptador real R06B permanece bloqueado pelos portões aplicáveis da R07, por credencial somente leitura e por autorização específica para dados reais.
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

1. **Produto independente inicializado:** Bolão Brasileirão Rigazzo com repositório e governança próprios; implementação funcional ainda não iniciada e reservada ao novo workspace;
2. **Reavaliar quando necessário:** testes automatizados por fluxo e narrativa assistida por IA;
3. **Reavaliar quando necessário:** auditoria ampliada de acessibilidade.

Os critérios e motivos do adiamento de testes por fluxo e IA estão registrados na [análise de 3 de agosto de 2026](docs/product/ANALISE_QW2_QW3_2026-08-03.md).

O pipeline inicial de qualidade no GitHub Actions foi concluído como **QW1 técnico**, sem substituir a prioridade funcional. A matriz detalhada está em [`docs/BACKLOG.md`](docs/BACKLOG.md).

## E01 — Base funcional e operação

- ✅ Login Google e autorização de participantes.
- ✅ Palpites por rodada e fechamento no horário da partida.
- ✅ Regras oficiais de pontuação, resultados e ranking.
- ✅ Sincronização de jogos, datas, locais, placares e classificação.
- ✅ Centro de Controle, diagnóstico e auditoria administrativa.
- ✅ E01.6 — Gestão Inteligente de Jogos Adiados.
- ✅ E01.7 — Consolidação da Integridade da Rodada.
- 🟡 Testes automatizados: motores e sincronização cobertos; expansão por fluxo reavaliada e adiada até existir necessidade concreta.

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
- 🟡 **R06 — Exportador somente leitura:** R06A concluída e homologada exclusivamente com dados sintéticos; a R06B permanece bloqueada pela R07A, pela R07B e pelos demais portões para acesso real somente leitura.
- 🔵 **R07A — Identidades, cofre e pseudonimização:** responsabilidade do Rigazzo, inicialmente com identidades sintéticas e sem acesso aos participantes de 2026.
- 🔵 **R07B — Consentimento de exportação:** responsabilidade do Bolão 2026, em entrega independente de risco alto e sem transferir contas ou sessões Auth.
- 🔵 **R01B–R02 e R04–R05 — Fundação isolada:** manter a fundação e o modelo de Temporadas e Ligas no novo workspace, formalizar o contrato de snapshot a partir da R03 concluída e homologar o importador sintético.
- 🔵 **R06–R09 — Equivalência de 2026:** exportar somente por leitura e importar snapshots manuais, versionados e auditáveis.
- 🔵 **R09.1 e R10.1 — Operação administrativa futura:** avaliar os botões Exportar e Importar somente após homologação das ferramentas locais e pacotes reais.
- 🔵 **R10 — Piloto privado:** validar autenticação, identidades consentidas, experiência e isolamento entre Ligas.
- 🔵 **R11 — Preparação de 2027:** criar a primeira temporada operacional nativa do Rigazzo sem sobrescrever 2026.
- 🔵 Recursos sociais ampliados após a experiência inicial do Duelo entre participantes.
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

A sequência vigente do novo produto está no [repositório oficial do Rigazzo](https://github.com/paulorigazzo/bolao-brasileirao-rigazzo). Este projeto preserva a [`decisão histórica, a divisão de responsabilidades e os contratos da origem`](docs/architecture/BOLAO_BRASILEIRAO_RIGAZZO.md). A conclusão da R01A não autoriza migrações, alterações de banco, exportações, importações, botões ou exposição aos participantes.
