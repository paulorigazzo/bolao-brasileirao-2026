# Backlog

Itens planejados e ainda não concluídos. O status e a prioridade oficiais permanecem em [`../ROADMAP.md`](../ROADMAP.md).

## Critérios de priorização

| Classe | Significado |
|---|---|
| **QW1** | Máximo retorno com baixo ou médio esforço |
| **QW2** | Retorno muito alto com esforço moderado |
| **QW3** | Bom candidato, com esforço ou dependências maiores |
| **LP** | Longo prazo ou mudança estrutural |

Itens já concluídos, como gráficos históricos, Meu Time 2.0, explicações estatísticas determinísticas e documentação viva, não permanecem no backlog.

A reavaliação do histórico consolidado concluiu que uma nova tela repetiria conteúdos já existentes. A lacuna de consulta histórica foi atendida pela E04.1D, com acesso aos Destaques da Rodada pelas Estatísticas e reutilização do modal existente.

O calendário consolidado foi atendido pela E02.1 como uma visão mensal interativa na Home, mantendo detalhes e palpites na Tela de Jogos e evitando uma segunda listagem de partidas.

## Matriz atualizada

| Item | Estado real | Lacuna | Esforço | Valor | Classe | Dependências |
|---|---|---|:---:|:---:|:---:|---|
| Testes automatizados por fluxo | Parcial | Cobrir telas e jornadas além dos motores atuais | Médio | Alto técnico | **QW2** | Infraestrutura de testes |
| Exportação CSV/Excel | Adiado | Confirmar uma necessidade administrativa concreta antes de gerar arquivos estruturados | Baixo/médio | Médio para ADM | **QW3** | Demanda administrativa validada, ranking e participantes |
| Narrativa assistida por IA | Não iniciado | Integrar backend seguro e modelo generativo | Alto | Alto | **QW3** | E04.1 |
| Histórico de mensagens WhatsApp | Não iniciado | Persistir mensagens e consentimentos aplicáveis | Médio/alto | Médio | **QW3** | Modelo de dados e privacidade |
| Central de notícias | Não iniciado | Definir fonte, curadoria e interface | Alto | Médio/alto | **QW3** | Integração externa |
| Heatmaps | Não iniciado | Agregar métricas e criar visualização própria | Médio | Médio | **QW3** | Motor estatístico |
| Exportação PDF | Não iniciado | Criar e validar layout de relatório | Médio/alto | Médio para ADM | **QW3** | Modelo de relatório |
| Dark mode | Não iniciado | Criar tokens, alternância e persistência | Médio | Médio | **QW3** | Design system |
| Auditoria ampliada de acessibilidade | Reavaliado e adiado | Retomar diante de barreira reproduzível, exigência formal ou escopo dedicado; ver [auditoria de 03/08/2026](accessibility/AUDIT_2026-08-03.md) | Médio | Alto inclusivo quando houver necessidade comprovada | **Sob demanda** | Evidência concreta ou objetivo de conformidade |
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
