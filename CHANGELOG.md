# v6.18.1 — Contratos e rastreabilidade

- Formaliza o fechamento dos palpites 30 minutos antes de cada partida, alinhando as fontes oficiais ao comportamento existente no cliente e no Supabase.
- Registra a restauração das siglas de três letras abaixo dos escudos nos cards recolhidos da Tela de Jogos.
- Renova o identificador de cache dos ativos para distribuir a correção visual integrada pelo PR #114.
- Substitui orientações SQL antigas por mensagens operacionais baseadas no diagnóstico e nas migrações versionadas.
- Preserva fechamento, pontuação, banco, autenticação, sincronização e demais comportamentos funcionais.

# v6.18.0 — Sincronização ao vivo por minuto

- A função agendada passa a verificar a janela de jogos a cada minuto.
- Durante a janela, a football-data.org recebe somente os IDs das partidas próximas ainda não terminais.
- A sincronização completa permanece disponível para manutenção a cada seis horas e para a ação administrativa manual.
- Sessões abertas passam a reler o Supabase a cada minuto, sem chamar automaticamente a API externa.
- Logs distinguem o modo ao vivo do modo completo e registram quantas partidas foram solicitadas.

# v6.17.6 — Fallback de resultado final

- Corrige a URL usada para consultar o detalhe de uma partida encerrada sem placar completo na listagem da competição.
- O fallback passa a reutilizar explicitamente a base oficial configurada para a football-data.org.
- Adiciona teste direto para a composição da URL de detalhe.
- Frequência, janela, fornecedor, banco e política de gravação permanecem inalterados.

# v6.17.5 — Centralização da sincronização automática

- A sincronização automática com a fonte esportiva passa a pertencer exclusivamente ao agendamento do Netlify.
- Sessões comuns e administrativas continuam relendo os jogos no Supabase sem chamar automaticamente a API externa.
- O botão administrativo de sincronização manual permanece disponível como contingência autenticada.
- Frequência do agendamento, Functions, Supabase, fornecedor e regras competitivas permanecem inalterados.

# v6.17.4 — Atualização de jogos em sessões abertas

- O navegador passa a reler o Supabase perto do horário das partidas, sem depender de já conhecer um jogo como ao vivo.
- A Home acompanha as mudanças de status e placar recebidas pela atualização silenciosa.
- O retorno a uma aba visível verifica imediatamente se os jogos precisam ser atualizados.
- Requisições simultâneas de atualização são bloqueadas na mesma sessão.
- A API externa, as Netlify Functions, o Supabase e as regras competitivas permanecem inalterados.

# v6.17.3 — Ações alinhadas nos cards dos participantes

- Posiciona o botão compacto de WhatsApp à esquerda e o acesso aos jogos à direita, na mesma linha.
- Mantém a correção de recorte do frame superior introduzida na `v6.17.2`.
- Preserva cards externos, modal, modelos de mensagem, dados e demais telas.

# v6.17.2 — Correção do recorte nos detalhes dos participantes

- Impede que o botão invisível de detalhes recorte o ícone, o nome e o contador de palpites.
- Restringe a correção à Situação da Rodada na Central de Atenção administrativa.
- Preserva cards, posições, botão WhatsApp e demais telas do aplicativo.

# v6.17.1 — Ajustes visuais no WhatsApp e cadastro

- Reduz o arredondamento somente do botão de WhatsApp exibido na Situação da Rodada.
- Garante contraste consistente para texto, cursor, placeholder e preenchimento automático nos campos do cadastro inicial.
- Preserva os cards, os demais botões e o fluxo funcional de cadastro.

# v6.17.0 — WhatsApp na Situação da Rodada

- Adiciona o botão individual de WhatsApp aos cards dos participantes na Central de Atenção.
- Reutiliza o mesmo modal, os mesmos modelos e a mesma confirmação existentes na Lista de Participantes.
- Mantém o acesso aos detalhes dos palpites como ação independente no restante do card.
- Desabilita a ação quando não há celular válido e preserva o envio exclusivamente manual.

# v6.16.0 — Proteção de recuperação no painel ADM

- Adiciona um card administrativo entre Integridade dos Dados e Dashboard executivo.
- Exibe status, última captura, cobertura de jogos e palpites, checkpoint e divergências.
- Mantém o schema privado inacessível diretamente e libera somente um resumo agregado para administradores ativos e aprovados.
- Não executa restauração automática nem substitui o backup integral do Supabase.

# v6.15.2 — Acesso consistente aos perfis no Ranking

- Substitui a autorização legada por lista fixa por uma verificação dinâmica de participante ativo e aprovado.
- Corrige perfis duplicados, palpites zerados e ausência de escudos para participantes comuns no Ranking.
- Preserva pontos, posições, perfis, palpites e resultados existentes.

# v6.15.1 — Time favorito consistente no Ranking

- Exibe no Ranking o time favorito informado durante a solicitação, mesmo antes do primeiro acesso após a aprovação.
- Prioriza o perfil consolidado e usa o cadastro de autorização como fallback por identidade normalizada.
- Mantém Ranking e ADM consistentes sem alterar pontos, posições, palpites ou dados do Supabase.

# v6.15.0 — Recuperação competitiva

- Preserva o primeiro placar final válido e a identificação mínima de cada jogo encerrado.
- Preserva os palpites vinculados ao jogo na mesma transação do snapshot.
- Registra alterações posteriores de status ou placar sem bloquear a sincronização.
- Cria baseline da implantação e checkpoints de pontuação e posições quando uma rodada fica integralmente encerrada.
- Mantém os dados de recuperação em schema privado, imutável para o fluxo normal e sem exposição pela aplicação.

# v6.14.2 — Preservação de resultados encerrados

- Impede que uma regressão isolada da fonte externa apague o status e o placar de uma partida já encerrada.
- Registra a divergência nos logs da sincronização para revisão administrativa.
- Mantém a remoção automática de placares incompatíveis em partidas que nunca estiveram encerradas.
- Versiona a restauração auditável dos oito resultados confirmados da rodada 20.
- Preserva palpites, regras de pontuação, rodadas 19 e 21, autenticação, RLS e interface.

# v6.14.1 — Time do coração na gestão de participantes

- Mostra o escudo e o nome do time do coração de cada participante na Área ADM.
- Usa o perfil atual como fonte prioritária e preserva a escolha feita durante uma solicitação ainda pendente.
- Mantém as iniciais e informa claramente quando o time do coração não foi escolhido.
- Preserva ações administrativas, dados, permissões, Ranking, Home, Meu Time e Jogos.

# v6.14.0 — Explicação da movimentação no Ranking

- Explica por que o participante subiu ou caiu após uma rodada.
- Identifica participantes ultrapassados ou que passaram à frente e compara a pontuação da rodada.
- Trata empates pelos critérios oficiais e limita a quantidade de nomes para preservar a leitura no celular.
- Reutiliza o fato existente no modal de Destaques, sem criar card, tela ou serviço externo.
- Preserva integralmente a classificação oficial, a Home, Jogos, Área ADM e Supabase.

# v6.13.0 — Calendário Interativo de Partidas

## Adicionado

- Calendário mensal acessível pela Home, com quantidade de jogos por dia e indicação do time favorito.
- Navegação de um toque para a rodada e a partida mais relevante da data selecionada.
- Tratamento específico para partidas adiadas que aguardam nova data.
- Motor determinístico e testes para agrupamento por data, fuso horário e prioridade do destino.

## Preservado

- Estrutura visual da Tela de Jogos, regras de palpites, pontuação, Área ADM e Supabase.
- Organização original das partidas por rodada.

# v6.12.0 — Acesso histórico aos Destaques da Rodada

## Adicionado

- Acesso aos Destaques da Rodada diretamente pelo histórico de pontuação nas Estatísticas.
- Identificação visual e acessível de cada rodada como ação disponível.
- Cobertura automatizada para impedir mistura de jogos e resultados entre rodadas históricas.

## Preservado

- O mesmo modal, motor determinístico e tratamento de rodadas consolidadas ou com jogos adiados.
- Home, Tela de Jogos, Área ADM, Supabase e regras de pontuação permanecem inalterados.

# v6.11.3 — Contexto dos jogos adiados nas Estatísticas

- O card “Qualidade das Estatísticas” explicita que a contagem abrange a temporada.
- Lista cada partida adiada com seu confronto e sua rodada original.
- Mantém inalteradas as regras de classificação e os cálculos estatísticos.

# v6.11.2 — Refinamentos de layout desktop

- Organiza cada rodada do duelo em uma faixa de contexto e outra de confronto no desktop.
- Alinha os placares recentes às mesmas três colunas dos indicadores oficiais.
- Mantém os cinco destinos da barra flutuante em uma única linha no computador.
- Preserva cálculos, resultados, navegação e experiência mobile.

# v6.11.1 — Refinamentos de layout mobile

- Mantém os cinco destinos da barra flutuante organizados em uma linha no modo paisagem.
- Reequilibra identidade e indicadores nos cards da classificação completa.
- Separa contexto e placar nas últimas rodadas do duelo em telas estreitas.
- Preserva navegação, regras, dados e padrões visuais existentes.

# v6.11.0b — Rodadas do duelo em destaque

- Aplica à seção “Últimas Rodadas” a mesma linguagem visual dos indicadores oficiais.
- Adiciona selo de rodada, placares maiores, selo VS e destaque do vencedor.
- Integra o histórico completo ao card e mantém empates e rodadas parciais claramente identificados.

# v6.11.0a — Refinamento visual do duelo

- Reforça a comparação lado a lado com avatares, ícones, números maiores e selo VS.
- Evidencia o melhor resultado de cada indicador e apresenta um resumo compacto das vantagens.
- Mantém regras, dados e estrutura geral do Duelo entre participantes inalterados.

# v6.11.0 — Duelo entre participantes

## Adicionado

- Aba “Comparar comigo” no modal de palpites do Ranking.
- Placar recreativo por rodadas vencidas, empates e indicadores oficiais lado a lado.
- Títulos temporários, frase divertida e momento do duelo produzidos por regras determinísticas.
- Histórico recente e expansão das rodadas comparáveis.
- Motor independente e testes automatizados para o confronto.

## Segurança e experiência

- Somente partidas oficialmente encerradas e palpites públicos entram nos cálculos.
- Rodadas com apenas jogos adiados são identificadas como parciais.
- Home, Tela de Jogos, Área ADM, Supabase e regras de pontuação permanecem inalterados.

# v6.10.0d — Resumo administrativo da rodada

## Adicionado

- Prévia editável do resumo coletivo da rodada com até três Destaques e Top 3.
- Identificação consolidada ou provisória, com quantidade de jogos considerados e adiados.
- Ações para restaurar, copiar e compartilhar manualmente o texto.

## Alterado

- “Compartilhar classificação” foi substituído por “Compartilhar resumo da rodada”, evitando ações redundantes.

## Preservado

- A funcionalidade é exclusiva da Área ADM; a Home e o modal dos participantes não foram alterados.
- Não há envio automático, persistência de mensagens ou integração externa nova.

# v6.10.0c — Destaques em rodada com jogos adiados

## Corrigido

- Rodadas parcialmente concluídas não retrocedem para a rodada anterior quando restam apenas jogos adiados.
- Quando a Home já avançou para uma rodada futura, os Destaques localizam primeiro a rodada parcial elegível mais recente.
- A Home e o modal identificam o caráter provisório dos destaques e quantos jogos foram considerados.
- Fatos variáveis recebem a qualificação “até agora”.

## Preservado

- Jogos adiados continuam excluídos do cálculo.
- Rodadas ao vivo ou ainda normalmente em aberto continuam sem narrativa parcial.

# v6.10.0b — Destaques da Rodada na Home

## Adicionado

- Faixa compacta com até dois destaques no card de Integridade da Rodada.
- Modal com desempenho pessoal, impacto no ranking, destaques coletivos e origem dos dados.
- Chamada contextual para a última rodada após seu encerramento ou durante pausas superiores a sete dias.

## Segurança e experiência

- Destaques completos aparecem somente para rodadas consolidadas.
- Palpites futuros, ao vivo e adiados permanecem protegidos.
- Ordem, Hero, Visão Geral, partidas ao vivo, Top 3 e Meu Time permanecem inalterados.

# v6.10.0a — Motor de Destaques da Rodada

## Adicionado

- Motor puro e determinístico de fatos pessoais e coletivos por rodada.
- Evidências rastreáveis para pontuação, ranking, movimentos, placares exatos e contexto individual.
- Tratamento explícito de empates, jogos não pontuáveis, dados insuficientes e rodadas provisórias.
- Cobertura automatizada dos principais cenários do motor.

## Preservado

- Home, Tela de Jogos e demais interfaces.
- Regras de pontuação, Supabase, Netlify Functions e dados históricos.
- Ausência de IA generativa e de compartilhamento automático.

# v6.9.0e — Ranking Mobile sem Sobreposição

## Corrigido

- Elimina a sobreposição entre pontos e a ação de palpites na classificação mobile.
- Reserva uma faixa horizontal exclusiva para os indicadores à direita.
- Limita nomes longos ao espaço disponível com reticências, sem aumentar a altura dos cards.

## Preservado

- Classificação e ação no desktop.
- Modal, pontuação, sigilo dos palpites e infraestrutura.

# v6.9.0d — Densidade e Descoberta no Ranking Mobile

## Ajustado

- Reduz a altura dos cards da classificação completa no celular.
- Mantém pontos e acesso aos palpites na mesma faixa vertical à direita.
- Transforma `Palpites`, quantidade e olho em uma única cápsula visualmente clicável.
- Preserva área de toque mínima de 44 pixels, foco e rótulo acessível.

## Preservado

- Classificação e ação no desktop.
- Modal, pontuação, sigilo dos palpites e infraestrutura.

# v6.9.0c — Harmonia do Ranking Mobile

## Ajustado

- Reorganiza a ação de consulta dos palpites na classificação mobile.
- Exibe **Palpites**, quantidade e ícone de visualização de forma compacta abaixo dos pontos.
- Remove o texto repetitivo **Ver palpites** dos cards no celular.
- Reduz a altura ocupada pela ação sem comprometer a área de toque.

## Preservado

- Classificação e ação no desktop.
- Modal, acessibilidade, regras de pontuação e proteção dos palpites.

# v6.9.0b — Alinhamento e Destaque dos Palpites

## Ajustado

- Centraliza o placar apostado exatamente abaixo do resultado da partida.
- Exibe em verde as pontuações de 1, 3 e 5 pontos.
- Preserva em dourado a pontuação de 10 pontos e o selo **Placar exato**.
- Mantém a pontuação zero com apresentação neutra.

# v6.9.0a — Refinamento do Modal de Palpites

## Ajustado

- Exibe os escudos dos clubes ao lado dos respectivos nomes nos confrontos.
- Substitui o seletor simples pelo padrão visual da tela Jogos.
- Acrescenta navegação por setas, faixa numérica e botão **Rodada Atual**.

## Preservado

- Rodada inicial com partidas oficialmente encerradas.
- Sigilo dos palpites ainda protegidos e regras de pontuação.
- Tela de Jogos e seu estado de rodada independente.

# v6.9.0 — Transparência dos Palpites

## Adicionado

- Ação de consulta na coluna **Palpites** da classificação.
- Modal individual com seletor de rodada, resultado, palpite e pontos.
- Visualização adaptada aos cards da classificação no celular.
- Visão segura do Supabase restrita a partidas oficialmente encerradas.

## Preservado

- Sigilo dos palpites em jogos futuros, ao vivo, adiados ou cancelados.
- Fechamento, edição, pontuação e identidade canônica por `user_id`.
- Tela de Jogos, comparação coletiva e gamificação das Estatísticas.

# v6.8.0 — Cadastro Consolidado

## Adicionado

- Formulário de cadastro integrado à tela inicial do convite.
- Nome de exibição obrigatório antes do login Google.
- Telefone com WhatsApp opcional e normalizado.
- Time favorito opcional selecionado na lista oficial de clubes.
- Persistência temporária dos dados durante o redirecionamento OAuth.
- RPCs versionadas para solicitar participação e criar o perfil completo após a aprovação.

## Preservado

- E-mail originado exclusivamente da conta Google.
- Aprovação administrativa e limite configurável de participantes.
- Privacidade do telefone, identidade por `user_id` e dados históricos.
- Regras de palpites, pontuação, ranking e Tela de Jogos.

# v6.7.1b — Indicação Visual no Card Meu Time 2.0

## Corrigido
- Restaura o chevron permanente no card principal da tela Meu Time.
- Mantém clique, toque, foco por teclado e navegação para a tabela do campeonato.
- Nenhum outro card, regra de negócio ou fluxo foi alterado.

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
