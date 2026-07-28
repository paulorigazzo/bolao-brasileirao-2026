# Changelog

## [6.3.0f1] — Reestruturação visual da Tela de Estatísticas

- Reorganização da tela por prioridade de leitura.
- Painel executivo reduzido aos quatro indicadores essenciais.
- Evolução por rodada promovida e inclusão da maior evolução.
- Remoção visual de comparações e sequências redundantes.
- Recordes e medalhas consolidados em um único bloco com abas.
- Insights limitados aos três cartões prioritários já existentes.
- Nenhuma alteração nas regras de pontuação ou nas demais telas.


Todas as alterações relevantes do projeto são registradas aqui. Os relatórios detalhados de cada entrega permanecem em `docs/releases/`.

## [6.3.0f1] — Dashboard Analítico

### Adicionado
- painel executivo com posição, distância para o líder, percentil e regularidade;
- recordes pessoais e sequências;
- comparação direta com participantes próximos;
- medalhas automáticas com estados conquistado e bloqueado;
- novos insights interpretativos calculados localmente;
- estados vazios e layout responsivo.

### Preservado
- Tela de Jogos e demais áreas fora de Estatísticas;
- regras de pontuação, Supabase e Netlify Functions.

## [6.3.0e] — Histórico do Ranking

### Adicionado
- posição acumulada após cada rodada encerrada;
- melhor e pior colocação;
- maior subida e maior queda;
- pontos acumulados e comparação com os demais participantes;
- estados vazios seguros e refinamento mobile.

### Preservado
- Tela de Jogos congelada funcionalmente na `v6.3.0d5`;
- Home, Ranking principal, ADM, login, navegação e regras de pontuação.

## [6.3.0d5] — Refinamentos da Tela de Jogos

### Adicionado
- botão contextual `Salvar e próximo →` ou `Salvar palpite`;
- avanço automático para o próximo jogo sem palpite;
- exibição do local em até duas linhas.

## [6.3.0d1–d4] — Estabilidade e salvamento dos palpites

- preservação de rascunhos;
- atualização leve sem recolher cards;
- salvamento individual e salvamento em lote;
- avanço automático entre jogos.

## [6.3.0d] — Perfil inteligente

- desempenho por tipo de resultado;
- clubes de maior pontuação e maior dificuldade;
- painéis analíticos e testes específicos.

## [6.3.0c] — Evolução e insights

- evolução por rodada;
- tendência recente;
- insights automáticos;
- hotfix de auditoria e integridade de placares.

## [6.3.0a–b] — Base estatística

- reconstrução e validação dos indicadores;
- melhoria de clareza, eficiência e confiabilidade.

## [6.2.x] — Administração e integridade

- Centro de Controle;
- pendências da rodada;
- refinamento da Área ADM;
- diagnóstico e integridade dos dados.

## [6.1.x] — Interface premium

- componentes base;
- identidade visual premium;
- tema do torcedor;
- correções de build do Netlify.

## Histórico anterior

O histórico detalhado das versões anteriores permanece documentado nos relatórios existentes e no histórico Git.
