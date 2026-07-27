# Bolão Brasileirão 2026 — v6.3.0a




## v6.2.2 — Refinamento da Área Administrativa

- contraste visual reduzido na Central de Atenção;
- filtros e prazo agora usam superfícies escuras e discretas;
- Central de Diagnóstico alinhada ao Design System;
- card renomeado e redesenhado como **Integridade dos Dados**;
- cards internos usam borda ou superfície, sem excesso de sombra;
- nenhuma regra de negócio, SQL ou função Netlify foi alterada.


## v6.2.2 — Pendências da Rodada

- filtros objetivos para visualizar todos, pendentes ou concluídos;
- contadores por status atualizados automaticamente;
- prazo do próximo fechamento com contagem regressiva e horário exato;
- destaque visual de urgência nas duas horas finais;
- última atualização de cada participante preservada nos cards;
- acesso direto aos jogos pendentes de cada participante;
- nenhuma alteração de SQL, Supabase ou regras de pontuação.

## v6.2.0 — Centro de Controle do Administrador

- nova visão operacional no topo da área administrativa;
- indicadores clicáveis de palpites, jogos, participantes e saúde do sistema;
- prioridade automática para pendências da rodada;
- integração com o diagnóstico existente;
- navegação direta para cada módulo administrativo;
- nenhuma alteração de banco de dados ou regra de negócio.

## v6.1.3 — Identidade visual premium

- Cabeçalho premium com hierarquia visual refinada.
- Acabamento unificado de cards, navegação, botões, badges, chips, tabelas, menus e modais.
- Microinterações discretas e compatíveis com movimento reduzido.
- Refino mobile-first, preservando áreas de toque.
- Exceção obrigatória da tela Tabela mantida: cards e painéis expansíveis continuam com altura automática e conteúdo sem cortes.
- Nova camada modular `css/identity-premium.css`, carregada após os demais estilos.
- Nenhuma alteração em banco, regras, API ou Netlify Functions além do identificador de versão.

## v6.0.2 — Motion Design System: navegação

- Criado `js/motion.js` como fonte única de durações, curvas e distâncias de movimento.
- Padronizada a transição entre abas com fade e deslocamento vertical sutil.
- A barra inferior ganhou indicador deslizante sincronizado com a aba ativa.
- Ícones, rótulos, sublinhado e feedback de toque usam os mesmos tokens de animação.
- Navegação repetida para a aba atual retorna suavemente ao topo.
- A preferência `prefers-reduced-motion` do aparelho é respeitada automaticamente.

## v5.7.3 — Tabela com expansão em dois níveis

- A classificação mobile continua compacta por padrão.
- Primeiro toque no card: exibe os números da campanha (PJ, V, E, D, SG, GP, GC e aproveitamento).
- Segundo nível independente: o botão **Desempenho recente** abre os últimos cinco jogos e a evolução de posição.
- Ao fechar o card ou abrir outro clube, o segundo nível também é recolhido automaticamente.
- Mantidos o destaque do time favorito, as zonas da tabela e o acesso aos jogos do clube.


## v5.7.2 — Tabela mobile em cards

- Classificação redesenhada para celulares com cards responsivos.
- Posição, escudo, clube e pontos recebem prioridade visual.
- Estatísticas PJ, V, E, D e SG ficam alinhadas em cada card.
- Toque no card expande GP, GC e aproveitamento.
- Zonas do campeonato são identificadas por faixa lateral.
- Time favorito mantém coração e identidade visual do clube.
- Classificação mobile unificada: linhas compactas expansíveis em formato de acordeão.
- Ao tocar em um clube, o card revela estatísticas completas, aproveitamento e histórico recente.
- Apenas um clube permanece expandido por vez, preservando a leitura compacta da tabela.
- Cabeçalho da classificação permanece acessível durante a rolagem.
- A visualização tradicional continua disponível em telas maiores.


## v5.6.6 — Acesso à tabela pelo card Meu Time

- Cabeçalho e resumo de classificação do card **Meu Time** agora são clicáveis.
- Chevron ao lado da posição indica a navegação para a tabela.
- A aba **Tabela** abre e rola automaticamente até o time favorito.
- A linha do clube recebe destaque visual e uma animação breve de localização.
- Interação acessível por toque, mouse e teclado.

## v5.6.5 — Destaque dos jogos do time favorito

- Todos os jogos do time favorito recebem borda e fundo suavemente personalizados.
- Um coração bicolor, baseado nas cores principais do clube, identifica a partida.
- O escudo e o nome do time favorito também são destacados no card expandido.
- O recurso funciona para o time favorito como mandante ou visitante.


## v5.6.4 — Alinhamento do histórico do Meu Time

- Rodada, resultado e posição exibidos na mesma coluna.
- Seta de tendência ao lado da posição.
- Tendências em verde, cinza e vermelho para subida, estabilidade e queda.
- Leitura vertical otimizada para celular.

Versão de revisão de qualidade, acessibilidade e estabilidade da interface.

# Bolão Brasileirão 2026 — v4.6.1

## Novidades desta versão

- Adicionada a ação **💬 Convidar participantes**, que abre o WhatsApp com uma mensagem de convite pronta e o link do bolão.
- Adicionada a ação **🔗 Copiar link do bolão**, com confirmação após a cópia.
- O endereço compartilhado é centralizado em `CONFIG.bolaoUrl`, facilitando futuras mudanças de domínio.
- Todos os cards e recursos existentes foram preservados.
- Nenhuma alteração SQL necessária.

# Bolão Brasileirão 2026 — v4.4.5

## Novidade desta versão

- Nova aba exclusiva **👑 ADM**, visível somente para o e-mail configurado em `CONFIG.adminEmail`.
- Card 1 **Central de Atenção** com estado automático da rodada.
- Exibição dos participantes pendentes, progresso por jogos e última atualização disponível.
- Estados: Tudo pronto, Atenção, Prazo próximo, Urgente, Rodada encerrada e Ranking atualizado.
- Botão de lembrete usando o compartilhamento do celular ou cópia para a área de transferência.
- Nenhuma alteração SQL necessária para esta primeira etapa do Painel ADM.

# Bolão Brasileirão 2026 — v4.3.0 Estatísticas Premium

Atualização visual e analítica da área de estatísticas, sem mudanças no Supabase ou nas regras de pontuação.

## Novidades
- Painel geral de aproveitamento.
- Indicadores de acertos, placares exatos, melhor rodada e média por jogo.
- Comparação com a média do grupo.
- Sequência atual e melhor sequência de jogos pontuando.
- Histórico por rodada mais informativo, com destaque da melhor rodada.
- Layout responsivo para celular.

Não é necessário executar SQL.


## Alteração v4.4.5

- O acesso ao Painel ADM foi removido da barra de navegação inferior.
- A opção **👑 Área do administrador** foi adicionada ao menu do usuário no canto superior direito.
- A nova opção continua visível somente para o administrador configurado.
- As opções já existentes no menu foram preservadas sem alterações.


## Alteração v4.4.4

O Card 1 do Painel ADM agora exibe todos os participantes da rodada, separados entre concluídos e pendentes, com contagem, barra de progresso e horário da última atualização. Nenhuma atualização SQL adicional é necessária.


## Alteração v4.4.4

- Os cartões dos participantes no Card 1 agora são clicáveis.
- Ao tocar em um participante, o administrador vê os 10 jogos da rodada marcados como preenchidos ou pendentes.
- Os placares permanecem privados; o painel exibe somente a existência do palpite.
- Não requer alteração SQL adicional.


## Versão 4.5.1 — Card 4: Dashboard Executivo

O Painel ADM agora inclui ações rápidas para:

- compartilhar lembrete com participantes pendentes;
- sincronizar jogos e resultados;
- recarregar e atualizar o ranking;
- compartilhar a classificação atual;
- abrir a próxima rodada cadastrada para consulta.

As ações utilizam as integrações e regras já existentes. Nenhuma alteração SQL é necessária.


## Novidades da v4.5.2

- Card 4 — Dashboard Executivo no Painel ADM.
- Indicadores de participantes, rodada, palpites registrados e jogos encerrados.
- Média de pontos do grupo e líder atual.
- Barra de adesão aos palpites da rodada.
- Destaque do participante com mais placares exatos.
- Nenhuma alteração SQL necessária.


## v4.5.3 — Navegação rápida ADM

- Menu horizontal fixo no topo da Área ADM.
- Atalhos para Atenção, Rodada, Ações e Dashboard.
- Rolagem suave até cada card.
- Destaque automático do botão correspondente ao card visível.
- Botão “Voltar ao menu ADM” ao final de cada card.
- Nenhuma alteração de banco de dados necessária.

## v4.5.4 — Correção do botão “Voltar ao menu ADM”

- Corrigido o retorno ao topo da Área ADM em celulares.
- O botão agora leva ao cabeçalho real do painel, em vez de tentar rolar até a barra fixa que já permanecia visível.
- A navegação rápida volta ao início horizontal e mantém o item ativo acessível.
- Nenhuma alteração no banco de dados é necessária.

## v4.6.0 — Refinamento da experiência ADM

- Cards administrativos expansíveis e recolhíveis, com preferência preservada no aparelho.
- Cabeçalho inteligente com rodada, adesão aos palpites e tempo para o próximo jogo.
- Indicadores de pendências e partidas ao vivo na navegação rápida.
- Atualização automática a cada 60 segundos enquanto a Área ADM estiver aberta e ao retornar à aba.
- Animações discretas de atualização, progresso e expansão, respeitando a preferência de movimento reduzido.
- Nenhuma alteração de banco de dados é necessária.

## v4.8.1 — Cards compactos
Os cards contraídos exibem siglas dos clubes e o status direto do palpite, facilitando a identificação rápida dos jogos em telas pequenas.

## v4.8.3 — Siglas padronizadas dos clubes

O cabeçalho compacto agora consulta um cadastro central com aliases para os nomes usados pelas APIs. Isso evita abreviações automáticas incorretas, como `CLR` para Clube do Remo e `MIN` para Atlético Mineiro. As siglas passam a ser `REM` e `CAM`, respectivamente.


## v4.8.5 — Correção de nomes abreviados da API

O resolvedor central agora reconhece também os nomes curtos retornados pela fonte de jogos, incluindo `Mineiro`/`MIN` como Atlético Mineiro (`CAM`) e `Paranaense`/`PAR` como Athletico Paranaense (`CAP`).

## v4.8.6 — Status padronizados das partidas
- "Agendada/Agendado" foi substituído por **Futura**.
- Status disponíveis: 📅 Futura, 🟢 Ao vivo, 🏁 Finalizada, 🟠 Adiada e ❌ Cancelada.
- O status do palpite permanece no canto superior direito dos cards.


## v4.8.7 — Atualização de partidas ao vivo

- Sincronização automática do calendário e dos placares a cada 10 minutos no Netlify.
- Partidas passam para **Ao vivo** automaticamente no horário de início, mesmo se a API ainda estiver atrasada.
- Atualização visual dos cards a cada 30 segundos sem recarregar a página.
- Correção: placar parcial não é mais interpretado como partida finalizada.

## Versão 4.8.9 — placar parcial ao vivo

Os cards de partidas em andamento mostram o placar parcial no cabeçalho e no conteúdo expandido. Durante jogos ao vivo, o navegador consulta silenciosamente os dados atualizados a cada 2 minutos. A função agendada do Netlify também foi ajustada para executar a sincronização a cada 2 minutos.


## v5.6.0 — Meu Time na Home

- novo card “Meu Time” após a Classificação na Home;
- posição, pontos, campanha, saldo de gols e últimos cinco resultados;
- próxima partida e estados contextuais;
- estado de orientação para usuários sem time favorito.


## v5.6.2 — Meu desempenho com o time favorito

- Novo card abaixo de “Meu Time” na Home.
- Exibe jogos analisados, pontos, placares exatos, resultados certos e aproveitamento.
- Considera apenas partidas finalizadas do time favorito com palpite do usuário.
- Aproveitamento = pontos obtidos ÷ máximo possível (10 pontos por jogo).
- Inclui estados próprios para ausência de time favorito ou de jogos pontuados.


## v5.6.2 — Rodadas nos últimos jogos
- O card Meu Time agora exibe discretamente o número da rodada acima de cada resultado recente.
- Os números acompanham dinamicamente os cinco últimos jogos concluídos do clube favorito.


## v5.6.4 — Evolução recente do time favorito

- Os cinco últimos jogos agora aparecem em ordem crescente de rodada.
- Os resultados permanecem alinhados com seus respectivos números de rodada.
- Foi adicionada uma linha discreta com a posição do clube ao fim de cada uma dessas rodadas.
- As setas indicam subida (↗), queda (↘) ou manutenção (→) na classificação.
- O histórico é calculado localmente a partir dos placares oficiais já sincronizados no aplicativo.

## Atualização v5.7.2 — Home redesenhada na barra inferior

- O ícone genérico de casa foi substituído por um campo de futebol vetorial e estilizado.
- A aba passou a usar o rótulo **Home**.
- No estado ativo, o ícone recebe cápsula em degradê, leve elevação e brilho discreto.
- No estado inativo, permanece minimalista e alinhado aos demais itens da navegação.
- A animação respeita a preferência de redução de movimento do aparelho.


## v6.0.2 — Motion: cards e microinterações
- Feedback de toque e ripple padronizados.
- Expansões dos cards de Jogos e Tabela com timing centralizado.
- Conteúdo em cascata discreta.
- Entrada visual única para o time favorito.
- Respeito à preferência de redução de movimento.


## v6.0.3 — Motion da Tabela e Skeleton Loading

- Skeleton cards durante o carregamento da classificação.
- Expansão e recolhimento com altura dinâmica, fade e deslocamento suave.
- Segundo nível “Desempenho recente” animado de forma independente.
- Fechamento automático e suave do card anteriormente aberto.
- Rolagem inteligente após a expansão.
- Respeito integral a `prefers-reduced-motion`.


## v6.0.4 — UX Polish

- Espaçamentos, raios, sombras e tipografia consolidados em tokens.
- Estados de toque, foco e seleção unificados.
- Skeletons e transições com ritmo consistente.
- Dicas contextuais na primeira visita a cada aba.
- Respeito integral a `prefers-reduced-motion`.
- Ajustes de acessibilidade e acabamento para telas móveis.


## v6.0.5 — Exceção de altura para a Tabela

- A tela Tabela foi removida da padronização de altura e contenção visual dos cards comuns.
- Os cards da classificação agora usam altura totalmente dinâmica.
- Removida a contenção `contain: paint` dos dois níveis expansíveis da Tabela.
- O grid da classificação passa a alinhar cada card pelo início, sem esticá-lo.
- Ao expandir “Desempenho recente”, o card principal pode crescer livremente sem cortar Rodadas, Resultados, Evolução da posição ou o botão de jogos do clube.


## v6.0.6 — Robustez da API

- Sincronização manual aceita somente `POST` e exige sessão válida de administrador.
- Agendamento Netlify desperta a cada 5 minutos, mas só consulta a API em janela de jogo ou a cada 6 horas.
- Limite interno de 8 chamadas à football-data.org por execução.
- Tratamento explícito de HTTP 429 e `Retry-After`.
- Cache persistente da classificação no Supabase, usado como fallback.
- Registro de sincronizações em `api_sync_log`.
- Execute `sql/atualizacao_v6_0_6_robustez_api.txt` no Supabase antes de publicar.


## v6.0.7 — Central de Diagnóstico
Painel administrativo de saúde da API, Supabase, cache, sincronizações, autoteste e logs recentes. Não requer nova migração SQL.


## v6.0.7a — Correção e detalhamento do diagnóstico

- Corrige o falso negativo causado pela divergência entre os IDs `brasileirao-2026` e `BSA-2026`.
- Mostra validade, idade, origem, identificador, rodada e número de clubes do cache.
- Torna o autoteste explicativo.
- Não exige alteração no Supabase.


## v6.0.8 — Consolidação técnica

- Centraliza versão, competição, temporada, identificador do cache, limites e intervalos em `netlify/functions/_constants.mjs`.
- Padroniza respostas de erro e métodos HTTP nas Netlify Functions.
- Remove duplicações de configuração entre sincronização, classificação e diagnóstico.
- Adiciona verificação automatizada de consistência com `npm run check`.
- Mantém banco de dados, interface e comportamento funcional da v6.0.7a, sem exigir novo SQL.


## v6.1.1 — Design System: fundação visual

- Fonte única de cores em `css/design-system.css`.
- Escalas de marca, neutros e estados semânticos.
- Tokens de superfícies, texto, bordas, sombras, raios, espaços, tipografia e movimento.
- Compatibilidade com os nomes históricos de variáveis para reduzir risco de regressões.
- Foco de teclado visível e padronizado.
- Respeito automático à preferência de movimento reduzido.
- Base preparada para modo claro/escuro e para a migração gradual dos componentes.

Esta etapa não altera banco de dados, variáveis de ambiente ou integrações.

## v6.1.1 — Componentes base reutilizáveis

Foi adicionada a camada `css/components.css`, responsável por padronizar cards, botões, chips, badges, alertas, campos, modais e skeletons. A padronização de altura dos cards é feita por alinhamento nas grades e altura mínima, nunca por altura fixa. A tela **Tabela** é uma exceção formal: seus cards e dois painéis expansíveis continuam com altura totalmente dinâmica para evitar corte de conteúdo.

## v6.2.2a
- corrigido o tamanho do título de Integridade dos Dados;
- ícone, título, badge e botão de expansão alinhados ao padrão dos demais cards administrativos;
- ajuste responsivo específico para telas móveis estreitas.
