# v6.7.1a — Atualização de Versionamento

- Identificadores oficiais do aplicativo sincronizados em `v6.7.1a`.
- Nenhuma alteração funcional.

# v6.7.1 — Limite Configurável de Participantes

## Adicionado
- Configuração administrativa do número máximo de participantes ativos.
- RPCs seguras para consultar e atualizar o limite no Supabase.
- Contador de vagas e estado de limite atingido na Área ADM.
- Feedback de processamento, sucesso e erro no fluxo de aprovação.

## Ajustado
- A regra fixa de 10 participantes é substituída por validação configurável no banco.
- Aprovações concorrentes são serializadas para preservar o limite.
- Botão Aprovar é desabilitado quando não há vagas.

## Corrigido
- Erros de `event.target.closest is not a function` nas microinterações de ponteiro.

# v6.7.0b — Consolidação da Integridade da Rodada

## Adicionado
- Apresentação centralizada dos estados da rodada a partir de `roundLifecycleSummary()`.
- Card Integridade da Rodada na Home, evoluindo o componente já existente.
- Segmentos e contagens próprias para partidas adiadas e canceladas.
- Selo de integridade na tela de Estatísticas.
- Resumo operacional da integridade na Área ADM.

## Ajustado
- Jogos adiados deixam de compor a contagem de partidas futuras na Home.
- Próximo jogo ignora partidas adiadas e canceladas.
- Mensagens de dados provisórios são exibidas somente quando aplicáveis.

# v6.7.0a-r2 — Correção dos Escudos no Card de Jogos Adiados

- Normaliza os escudos no card expansível da Área ADM.
- Limita largura e altura dos escudos em desktop e celular.
- Mantém proporção com `object-fit: contain` e evita que imagens ultrapassem o card.

# v6.7.0a — Gestão Inteligente de Jogos Adiados

## Adicionado
- Card expansível na Área ADM com detalhamento das partidas adiadas, incluindo confrontos, programação original e local.
- Estado consolidado de rodada com status parcial e indicador provisório.
- Filtro de partidas adiadas.
- Comunicação específica nos cards, Ranking e Administração.

## Corrigido
- Jogos adiados deixam de ser contados como fechados ou próximos.
- Jogos adiados não são abertos automaticamente para palpite.
- Palpites permanecem bloqueados após o adiamento, inclusive quando a API alterar a data.

# v6.6.0 — Projeto JARVIS

- Nova identidade visual oficial baseada na Série 4.1.
- Marca aplicada ao cabeçalho, carregamento, apresentação, favicon e PWA.
- Ativos vetoriais, ícones e imagem social adicionados.
- Nenhuma alteração nas regras de negócio.

# v6.5.3 — Comunicação individual via WhatsApp

- Adiciona botão **WhatsApp** à gestão de cada participante com celular válido.
- Inclui modelos de lembrete de palpites, fechamento da rodada, aprovação e boas-vindas.
- Permite editar livremente a mensagem antes de abrir o WhatsApp.
- Mantém o envio individual, manual e sob confirmação do administrador.
- Não cria histórico, automações, disparos em massa ou novos campos de consentimento.

# v6.5.2 — Simplificação do menu do usuário

## 6.5.2 — Auditoria de identidade dos participantes

- Ranking e identificação do usuário atual priorizam `user_id`.
- Contagens de palpites mantêm identidade canônica após salvamento.
- Fallback por nome fica restrito à compatibilidade com registros legados.
- Redução do risco de duplicação após alteração do nome de exibição.


- remove a opção redundante “Meu time” do menu da conta;
- mantém “Meu perfil” como acesso aos dados pessoais e preferências;
- preserva “Meu Time” na navegação principal inferior, onde permanece a experiência esportiva completa.

## [6.5.1] - 2026-07-28

### Adicionado
- Botão **Deletar** ao lado da ação de ativação/desativação na gestão de participantes.
- Confirmação em duas etapas, incluindo digitação exata do nome do participante.
- Função segura no Supabase para apagar perfil, autorização e palpites do participante.

### Segurança
- A exclusão é restrita ao administrador autenticado.
- O administrador não pode excluir o próprio cadastro nem outro administrador por essa tela.
- A conta Google/Supabase Auth não é apagada; apenas os dados do usuário dentro do bolão.

## [6.5.0e] - 2026-07-28

### Corrigido
- Consolida nomes históricos e atuais pelo `user_id`, evitando participantes duplicados após renomear o perfil.
- Reassocia palpites públicos, contagens, ranking, Home, estatísticas e demais cards ao nome canônico atual.
- Mantém apenas uma identidade por participante sem alterar palpites encerrados no banco.

## [6.5.0e] - 2026-07-28

### Corrigido
- Remove a atualização retroativa da coluna `usuario` em palpites encerrados, que acionava a proteção de prazo e abortava a alteração do nome.
- Mantém os palpites históricos intactos e resolve o nome atual do participante pelo `user_id`.
- Normaliza, após cada carregamento, os nomes usados em Ranking, Home, Estatísticas e demais telas.
- Preserva a alteração de celular e a confirmação real da persistência no Supabase.

## v6.4.0b — Meu Time 2.0

- Nova tela dedicada **Meu Time** na navegação principal.
- Contexto compartilhado do clube favorito com classificação, forma e próximo jogo.
- Estatísticas pessoais completas nos jogos do clube.
- Índice de Sintonia e Perfil do Torcedor.
- História da Temporada e conquistas contextuais.
- Card da Home passa a direcionar para a experiência Meu Time.
- Personalização permanece informativa e não altera pontuação ou vantagem competitiva.

## v6.3.0 — Final — Polimento da Experiência

- Novo card Momento do Participante.
- Títulos dinâmicos conforme o desempenho.
- Recomendações personalizadas e linguagem mais humana.
- Regularidade apresentada com leitura visual por estrelas.
- Insights analíticos complementares movidos para área expansível.
- Refinamentos visuais, responsivos e de acessibilidade.

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

## [6.5.0] - 2026-07-28

### Adicionado
- Tela de edição dos dados do participante, com nome e celular opcional.
- Link público de cadastro com aprovação posterior do administrador.
- Estados de solicitação pendente, aprovada, recusada e inativa.
- Ações de aprovação e recusa na Área ADM.
- Migração SQL em formatos SQL e TXT.

### Segurança
- Usuários pendentes não acessam as telas internas nem os palpites.
- Celular não é carregado nas telas públicas do aplicativo.
- Alterações de nome são vinculadas ao `user_id`.


### v6.6.0 — Correção de fidelidade da marca JARVIS
- Substituição da reconstrução vetorial incorreta pelo PNG oficial aprovado.
- Aplicação direta no cabeçalho, carregamento e apresentação.
- Derivação técnica de favicon e ícones PWA sem alteração do desenho da marca.
