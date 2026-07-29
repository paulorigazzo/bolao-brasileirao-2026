# Status operacional para agentes de IA

## Fonte oficial

Consultar [`../../ROADMAP.md`](../../ROADMAP.md) para status, prioridade e sequência do produto. Este arquivo é apenas um resumo operacional.

## Estado confirmado

- Versão funcional: `v6.7.1b`.
- E01.6 e E01.7: concluídas.
- Estatísticas determinísticas A–F: concluídas.
- Meu Time 2.0, gestão de participantes, WhatsApp manual, identidade JARVIS e limite configurável: concluídos.
- PWA: parcial, pois há manifesto e ícones, mas não service worker ou cache offline.
- IA generativa e Copiloto: não implementados.

## Prioridade

**E04 — Inteligência Narrativa da Rodada**

Sequência recomendada:

1. **QW1 — E04.1:** definir e validar um resumo determinístico da rodada;
2. **QW1:** permitir compartilhar o resumo determinístico revisável;
3. **QW2:** consolidar histórico por rodada e rankings analíticos;
4. **QW3 — E04.2:** usar IA apenas para explicar métricas verificadas;
5. **LP — E05:** começar o Copiloto por perguntas predefinidas.

Quick Wins técnicos, como GitHub Actions e ampliação dos testes, podem evoluir em paralelo sem substituir a prioridade funcional.

## Itens que não devem ser reimplementados

- gráficos históricos;
- dashboard Meu Time 2.0;
- explicações estatísticas determinísticas;
- documentação viva;
- histórico e trajetória do ranking já presentes na tela de Estatísticas.

## Restrições

- métricas objetivas devem ser calculadas pelo código;
- respostas devem mostrar origem e limitações;
- segredos nunca podem ser expostos no navegador;
- permissões e privacidade do Supabase devem ser preservadas;
- a Tela de Jogos permanece congelada para evolução ampla.
