# Estratégia de Inteligência Artificial

## Objetivo

Usar IA para explicar dados, reduzir trabalho administrativo e enriquecer a experiência sem transformar o produto em um gerador automático de palpites.

## Pilares

### 1. Copiloto do Bolão

Assistente contextual capaz de responder perguntas sobre ranking, jogos, palpites, desempenho e histórico.

**Status:** ⬜ **Planejado**

### 2. IA Estatística

Interpretação de gráficos, padrões, tendências, clubes e comparações.

**Status:** 🟡 **Em andamento — camada de dados em construção**

### 3. IA Administrativa

Auditoria, inconsistências, rodadas incompletas e participantes sem palpites.

**Status:** 🔵 **Parcialmente implementado — regras tradicionais já existem em parte**

### 4. IA Narrativa

Resumos de rodada, mudanças no ranking e textos para compartilhamento.

**Status:** ⬜ **Planejado**

### 5. IA Preditiva

Simulações e probabilidades futuras.

**Status:** 🔮 **Visão de longo prazo**

## Princípios

- A IA deve mostrar a origem dos dados usados.
- Respostas devem respeitar permissões e privacidade.
- Estatísticas determinísticas devem ser calculadas pelo sistema, não inventadas pelo modelo.
- O modelo deve explicar resultados calculados por código.
- Sugestões de palpites, se implementadas, devem ser opcionais e claramente identificadas.
- Chaves de API nunca devem ficar expostas no navegador.

## Arquitetura prevista

1. Front-end envia pergunta e contexto permitido.
2. Função serverless autentica o usuário.
3. Função consulta dados necessários no Supabase.
4. Código calcula métricas objetivas.
5. Modelo de IA interpreta e redige a resposta.
6. Resposta retorna com contexto e limitações.

## Sequência recomendada

1. Consolidar estatísticas e qualidade dos dados.
2. Criar resumos narrativos de rodada.
3. Implementar perguntas pré-definidas.
4. Implementar chat em linguagem natural.
5. Adicionar contexto por tela.
6. Avaliar recursos preditivos.
