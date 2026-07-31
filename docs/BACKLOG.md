# Backlog

Itens ainda não comprometidos com uma entrega imediata. O status e a prioridade oficiais permanecem em [`../ROADMAP.md`](../ROADMAP.md).

## Critérios de priorização

| Classe | Significado |
|---|---|
| **QW1** | Máximo retorno com baixo ou médio esforço |
| **QW2** | Retorno muito alto com esforço moderado |
| **QW3** | Bom candidato, com esforço ou dependências maiores |
| **LP** | Longo prazo ou mudança estrutural |

Itens já concluídos, como gráficos históricos, Meu Time 2.0, explicações estatísticas determinísticas e documentação viva, não permanecem no backlog.

## Matriz atualizada

| Item | Estado real | Lacuna | Esforço | Valor | Classe | Dependências |
|---|---|---|:---:|:---:|:---:|---|
| E04.1 — Destaques determinísticos da rodada | Motor concluído | Apresentar fatos pessoais e coletivos na Home sem ampliar sua complexidade | Baixo/médio | Muito alto | **QW1** | E04.1A concluída; E04.1B pendente |
| Compartilhamento de ranking e resumo | Parcial | Ampliar o compartilhamento nativo e os textos revisáveis | Baixo/médio | Alto | **QW1** | E04.1 para resumo completo |
| Exportação CSV/Excel | Não iniciado | Gerar arquivo administrativo a partir dos dados estruturados | Baixo/médio | Alto para ADM | **QW1** | Ranking e participantes |
| GitHub Actions | Não iniciado | Executar `npm run check` automaticamente em Pull Requests | Baixo/médio | Alto técnico | **QW1 técnico** | Scripts existentes |
| Histórico consolidado por rodada | Parcial | Unir jogos, resultado, ranking e destaques em uma visão | Médio | Alto | **QW2** | Histórico e ranking existentes |
| Rankings analíticos | Parcial | Criar filtros por rodada, precisão e cenários | Médio | Alto | **QW2** | Motor estatístico |
| Comparação entre participantes | Base disponível | Criar interface e critérios de comparação | Médio | Alto | **QW2** | Ranking e estatísticas |
| Calendário consolidado | Não iniciado | Criar modal ou visão dedicada de partidas | Médio | Alto | **QW2** | Dados de jogos |
| Testes automatizados por fluxo | Parcial | Cobrir telas e jornadas além dos motores atuais | Médio | Alto técnico | **QW2** | Infraestrutura de testes |
| Narrativa assistida por IA | Não iniciado | Integrar backend seguro e modelo generativo | Alto | Alto | **QW3** | E04.1 |
| Histórico de mensagens WhatsApp | Não iniciado | Persistir mensagens e consentimentos aplicáveis | Médio/alto | Médio | **QW3** | Modelo de dados e privacidade |
| Central de notícias | Não iniciado | Definir fonte, curadoria e interface | Alto | Médio/alto | **QW3** | Integração externa |
| Heatmaps | Não iniciado | Agregar métricas e criar visualização própria | Médio | Médio | **QW3** | Motor estatístico |
| Exportação PDF | Não iniciado | Criar e validar layout de relatório | Médio/alto | Médio para ADM | **QW3** | Modelo de relatório |
| Dark mode | Não iniciado | Criar tokens, alternância e persistência | Médio | Médio | **QW3** | Design system |
| Auditoria ampliada de acessibilidade | Parcial | Revisar fluxos, foco, contraste e leitores de tela | Médio | Alto inclusivo | **QW2** | Interface atual |
| service worker e cache offline | Não iniciado | Completar a PWA e definir política de atualização | Alto | Médio/alto | **LP** | Manifesto existente |
| Push e e-mail | Não iniciado | Adicionar serviços, consentimento e backend | Alto | Alto | **LP** | Backend e PWA |
| Probabilidades e simulações | Não iniciado | Criar modelos explicáveis e validação | Alto | Alto | **LP** | Base histórica ampliada |
| Copiloto completo | Não iniciado | Criar interface, backend, linguagem natural e contexto | Muito alto | Muito alto | **LP após E04** | E04.1 e E04.2 |
| Múltiplos bolões e ligas | Não iniciado | Alterar dados, permissões, administração e navegação | Muito alto | Alto | **LP** | Redesenho da plataforma |
| Backup administrativo completo | Não iniciado | Exportar e restaurar dados com segurança | Alto | Médio | **LP** | Backend e políticas |

## Ideias futuras

- 🔮 API pública;
- 🔮 aplicativo nativo;
- 🔮 resumos em áudio;
- 🔮 assistente por voz.
