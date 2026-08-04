# Estratégia de Inteligência Artificial

## Objetivo

Usar IA para explicar dados, reduzir trabalho administrativo e enriquecer a experiência sem transformar o produto em um gerador automático de palpites.

## Estado real

O produto já possui uma camada determinística madura de estatísticas, insights, recomendações, integridade da rodada e diagnóstico administrativo. Ela não usa modelos generativos.

Ainda não existem no código:

- provedor ou modelo de IA;
- chat ou Copiloto;
- Netlify Function dedicada à IA;
- perguntas em linguagem natural;
- memória de conversas ou preferências;
- geração automática de resumos.

## Pilares

### Inteligência estatística

**Status:** ✅ Base determinística concluída.

Calcula evolução, perfil, recordes, regularidade, comparações, medalhas e indicadores relacionados ao clube favorito.

### Inteligência administrativa

**Status:** 🟡 Parcial.

Diagnóstico, auditoria, integridade e pendências usam regras tradicionais. Explicações por IA e sugestões assistidas ainda são planejadas.

### Inteligência narrativa

**Status:** ✅ Base determinística concluída; uso de IA generativa adiado.

Resumos de rodada, mudanças no ranking, destaques e textos revisáveis partem de fatos calculados pelo sistema.

A narrativa determinística e rastreável foi entregue sem modelos generativos. A evolução assistida por IA permanece adiada até existir um caso de uso sem redundância e com valor demonstrado, conforme o [`ROADMAP.md`](../ROADMAP.md).

### Copiloto do Bolão

**Status:** 🔮 Longo prazo após E04.

Deve começar com perguntas predefinidas e evoluir para linguagem natural somente após a camada narrativa estar validada.

### Inteligência preditiva

**Status:** 🔮 Longo prazo.

Simulações e probabilidades devem ser opcionais, explicáveis e claramente diferentes de resultados oficiais.

## Princípios

- O sistema calcula; o modelo explica.
- A origem dos dados e as limitações devem ser visíveis.
- Respostas devem respeitar autenticação, autorização e privacidade.
- Chaves e segredos nunca ficam no navegador.
- Nenhum texto gerado pode alterar pontuação, resultados ou dados históricos.
- Sugestões de palpites não fazem parte do escopo imediato.

## Arquitetura prevista

1. O front-end envia uma solicitação e apenas o contexto permitido.
2. Uma Netlify Function autentica e autoriza o usuário.
3. O backend obtém os dados necessários no Supabase.
4. O código calcula métricas objetivas.
5. O modelo recebe somente fatos e instruções controladas.
6. A resposta retorna com origem, período analisado e limitações.

## Sequência

1. E04.1 — resumo determinístico da rodada.
2. Compartilhamento determinístico e revisável.
3. E04.2 — narrativa assistida por IA.
4. E05.1 — perguntas predefinidas.
5. E05.2 — linguagem natural.
6. E05.3 — contexto por tela.
7. Avaliação futura de recursos preditivos.
