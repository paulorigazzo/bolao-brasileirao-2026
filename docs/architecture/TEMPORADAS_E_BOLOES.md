# Arquitetura de Temporadas e Bolões

## Finalidade

Este documento é a fonte principal para a evolução do Bolão Brasileirão 2026 em uma plataforma capaz de preservar temporadas encerradas, preparar o Campeonato Brasileiro de 2027 e, futuramente, operar bolões independentes.

A direção foi aprovada em 4 de agosto de 2026. A implementação ainda não foi iniciada. Qualquer mudança em código, banco, Supabase, Netlify ou interface exige plano e aprovação próprios.

## Objetivos

- preservar integralmente a operação e o histórico de 2026;
- separar conceitualmente campeonato, temporada e bolão;
- usar os dados reais de 2026 para validar uma estrutura paralela;
- preparar 2027 sem sobrescrever jogos, palpites, ranking ou estatísticas anteriores;
- permitir bolões com membros, palpites e rankings independentes;
- manter regras oficiais, partidas e resultados em fontes centralizadas;
- tornar cada etapa pequena, auditável e reversível.

## Estado atual

O aplicativo opera como um único bolão e uma única temporada. Participantes, palpites encerrados e ranking são carregados em contexto global. Há dependências explícitas de 2026 em interface, mensagens, identidade, configuração da API, cache e diagnóstico, além de referências fixas a 38 rodadas e 380 partidas.

Essas referências não devem ser substituídas indiscriminadamente: documentos e releases históricos precisam continuar identificando 2026. Somente dependências operacionais futuras deverão receber configuração por temporada.

## Modelo conceitual

```text
Campeonato
└── Temporada
    └── Bolão
        ├── Participantes
        ├── Administradores
        ├── Convites
        ├── Palpites
        ├── Ranking
        └── Experiências competitivas
```

### Campeonato

Representa a competição, inicialmente o Campeonato Brasileiro Série A. Não contém palpites nem participantes.

### Temporada

Representa uma edição anual da competição. Determina clubes, jogos, rodadas, datas, resultados, classificação oficial, sincronização e caches correspondentes.

Estados previstos: `preparação`, `ativa`, `encerrada` e `arquivada`.

### Bolão

Representa um grupo competitivo pertencente a uma temporada. Determina membros, funções administrativas, convites, palpites, ranking e experiências coletivas.

Na primeira evolução multibolão, todos os bolões devem reutilizar o mesmo campeonato, os mesmos jogos, as mesmas regras de fechamento e a mesma pontuação oficial. Regras personalizadas, campeonatos diferentes e calendários próprios ficam fora do escopo inicial.

## Propriedade dos dados

| Dado | Escopo proposto | Observação |
|---|---|---|
| Conta e identidade | Global | Uma conta pode participar de várias temporadas e bolões |
| Perfil e contato | Global | Não deve ser duplicado em cada bolão |
| Time favorito | Global, validado por temporada | Pode exigir confirmação se o clube não participar da edição |
| Campeonato | Global | Fonte comum da competição |
| Clubes participantes | Temporada | A composição pode mudar a cada ano |
| Jogos, rodadas e resultados | Temporada | Não devem ser copiados por bolão |
| Classificação oficial | Temporada | Compartilhada por todos os bolões da edição |
| Membros e funções | Bolão | Um usuário pode ter associações diferentes |
| Convites | Bolão | Devem ser revogáveis, limitados e rastreáveis |
| Palpites | Bolão e partida | Permitem palpites diferentes em bolões independentes |
| Ranking e desempates | Bolão e temporada | Reutilizam regras oficiais centralizadas |
| Destaques e duelos | Bolão e temporada | Somente entre membros autorizados do contexto |
| Histórico | Temporada e bolão | Torna-se somente leitura após consolidação |

## Princípios aprovados

1. O Bolão 2026 permanece a fonte oficial durante toda a validação paralela.
2. A transição será aditiva: copiar antes de migrar e preservar antes de substituir.
3. Jogos, resultados e regras de pontuação não serão duplicados por bolão.
4. A cópia de 2026 será usada como gêmeo comparativo, não como segunda fonte oficial.
5. A Temporada 2027 será a primeira candidata a nascer integralmente na nova arquitetura.
6. Ser autenticado não concede acesso automático a qualquer bolão.
7. Administração da plataforma e administração de um bolão serão funções distintas.
8. Nenhum novo fluxo será exposto aos participantes antes da equivalência e do retorno serem comprovados.
9. A Tela de Jogos permanecerá inalterada nas fases documentais e de fundação invisível.
10. Regras personalizadas por bolão ficam fora da primeira implementação.

## Estratégia de transição

### T01 — Fundação conceitual

- formalizar entidades, limites e propriedade dos dados;
- inventariar dependências operacionais de 2026;
- definir segurança, auditoria, observabilidade e retorno;
- registrar decisões pendentes sem antecipar implementação.

**Portão de saída:** arquitetura e fases aprovadas, sem mudança funcional.

### T02 — Fundação paralela

- criar estruturas aditivas de campeonato, temporada, bolão e associação de membros;
- cadastrar a Temporada 2026 e o Bolão Principal 2026;
- associar participantes atuais sem alterar sua autorização global;
- manter todas as leituras e gravações oficiais no modelo existente.

**Portão de saída:** estrutura nova isolada, permissões verificadas e comportamento atual inalterado.

### T03 — Gêmeo comparativo de 2026

- copiar associações e palpites para a estrutura nova;
- manter jogos e resultados na fonte oficial compartilhada;
- calcular ranking e indicadores pelo novo contexto;
- registrar origem, horário e situação de cada cópia;
- não permitir que falhas da cópia bloqueiem palpites oficiais.

**Portão de saída:** retrato inicial reconciliado e processo de atualização rastreável.

### T04 — Auditoria prolongada

- acompanhar diversas rodadas reais;
- comparar cada novo palpite e resultado;
- validar jogos adiados, rodadas parciais, empates e desempates;
- testar isolamento entre usuários e bolões;
- medir consultas, carregamento e cálculo;
- testar o retorno ao modelo atual.

**Portão de saída:** equivalência integral, ausência de acesso cruzado e retorno comprovado.

### T05 — Preparação da Temporada 2027

- cadastrar a temporada inicialmente como `preparação`;
- importar e validar clubes, calendário e parâmetros oficiais;
- criar o Bolão Principal 2027;
- renovar participantes por convite ou confirmação;
- manter ranking e palpites zerados na nova edição;
- manter 2026 acessível e protegido como histórico.

**Portão de saída:** calendário validado, participantes confirmados e fluxo completo testado antes do primeiro fechamento.

### T06 — Primeiro bolão independente

- criar um piloto restrito a participantes selecionados;
- permitir palpites próprios no novo bolão;
- manter partidas, resultados, fechamento e pontuação compartilhados;
- contextualizar todas as áreas competitivas pelo mesmo bolão ativo;
- impedir visibilidade de dados sem associação válida.

**Portão de saída:** ciclo operacional completo sem impacto no Bolão Principal.

### T07 — Migração controlada

- ativar o novo modelo para o Bolão Principal somente após os portões anteriores;
- manter temporariamente as estruturas e o retorno anteriores;
- observar a operação antes de retirar qualquer compatibilidade;
- exigir nova decisão para desativar ou remover estruturas legadas.

**Portão de saída:** estabilidade comprovada e decisão humana específica sobre a descontinuação do legado.

## Auditoria de equivalência

A validação deve comparar dados na menor unidade possível, não apenas o ranking final:

- participantes e associações;
- quantidade e conteúdo dos palpites;
- autor, partida e horário de cada registro;
- pontos por partida e por rodada;
- placares exatos e jogos pontuados;
- total, posição e critérios de desempate;
- partidas adiadas, canceladas e rodadas parciais;
- ranking histórico e movimentações;
- destaques pessoais e coletivos;
- Duelo entre participantes;
- estatísticas dependentes do grupo;
- visibilidade dos palpites encerrados.

Toda divergência deve ser classificada como esperada, pendente de replicação ou indevida. Divergências indevidas impedem o avanço.

## Segurança

- habilitar proteção por linha em todas as novas tabelas expostas;
- combinar autenticação com associação ativa e função no bolão;
- nunca confiar no identificador de bolão enviado somente pela interface;
- não usar metadados editáveis pelo usuário para autorização;
- proteger consultas, inclusões, alterações e exclusões separadamente;
- usar visões que respeitem as permissões da pessoa que consulta;
- evitar funções privilegiadas como correção genérica de permissões;
- manter chaves administrativas fora do navegador;
- separar administrador da plataforma de proprietário ou administrador do bolão;
- testar explicitamente usuários sem bolão comum.

O desenho detalhado das políticas dependerá de uma entrega específica de Supabase e revisão de segurança atualizada.

## Retorno e interrupção

O retorno previsto consiste em desativar a leitura experimental, manter o Bolão Principal no modelo atual e preservar os novos registros para diagnóstico. Durante a estabilização, nenhuma etapa pode depender da exclusão do legado.

A execução deve ser interrompida diante de:

- divergência não explicada de ranking ou palpite;
- acesso a dados de outro bolão;
- perda ou alteração de dados oficiais;
- impacto perceptível no salvamento atual;
- degradação relevante de desempenho;
- ausência de cópia de segurança ou retorno testado;
- necessidade de ampliar o escopo aprovado.

## Impactos futuros por área

| Área | Impacto esperado |
|---|---|
| Supabase | Alto: novas entidades, índices, políticas e auditoria |
| Sincronização | Médio: contexto e cache por temporada |
| Home | Médio: posição, Top 3 e destaques do bolão ativo |
| Jogos | Alto no multibolão: palpite precisa do contexto do bolão |
| Ranking | Alto: participantes, posição e comparação por bolão |
| Estatísticas | Alto: separar indicadores globais, de temporada e de bolão |
| Meu Time | Médio: preservar perfil e contextualizar histórico |
| Destaques | Alto: fatos coletivos e movimentações por bolão |
| Compare Comigo | Médio: adversários autorizados no bolão ativo |
| Área ADM | Alto: separar operação global e gestão local |
| Cadastro e convites | Alto: autorização da plataforma não substitui associação ao bolão |
| Mensagens | Médio: identificar temporada e bolão destinatário |
| Identidade e PWA | Médio: retirar dependências operacionais fixas de 2026 |
| Testes | Alto: equivalência, isolamento, migração e retorno |

## Preparação anual

Antes de cada nova temporada será necessário:

1. cadastrar a edição em preparação;
2. confirmar clubes e parâmetros oficiais;
3. importar e validar o calendário;
4. criar os bolões correspondentes;
5. renovar ou convidar membros;
6. testar sincronização, palpites e fechamento;
7. ativar a temporada por configuração;
8. manter as temporadas anteriores disponíveis como histórico.

O endereço e a marca permanentes do produto devem ser avaliados antes de 2027. A recomendação atual é separar a marca estável do rótulo da temporada, sem reescrever registros históricos.

## Decisões ainda pendentes

- forma definitiva de renovação dos participantes para 2027;
- duração mínima da auditoria paralela;
- endereço permanente e política de redirecionamento do domínio de 2026;
- tratamento do time favorito quando o clube não disputar a temporada;
- prazo de retenção do legado após a migração;
- limites iniciais de bolões e membros por usuário;
- momento em que a Tela de Jogos poderá receber contexto multibolão;
- critérios para permitir configurações próprias em versões futuras.

Esses itens exigem decisões específicas antes das fases que os utilizem.

## Versionamento deste planejamento

Este documento não representa uma entrega funcional e não altera a versão do aplicativo. Roadmap, Backlog e registros de decisão apontam para esta fonte; detalhes técnicos futuros devem ser adicionados aqui ou em documentos específicos vinculados, sem duplicar o conteúdo.
