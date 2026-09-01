# v6.24.3 — Preflight enxuto do corte para API-Football

- Restringe a manutenção periódica da API-Football aos jogos não terminais, evitando regravação ampla do histórico encerrado.
- Preserva a verificação explícita por IDs usada nas janelas ao vivo e em operações administrativas controladas.
- Mantém os jogos sem mapeamento fora da escrita e informa quantos jogos terminais foram preservados.
- Prepara o preflight somente leitura da rodada 26 sem alterar variável, fonte oficial, Supabase ou produção.

# v6.24.2 — Acionador administrativo do ensaio 6B

- Adiciona à Central de Diagnóstico um acionador autenticado para o ensaio somente leitura da Fase 6B.
- Mantém o JWT encapsulado no cliente, exige confirmação humana e não o exibe nem registra.
- Apresenta cobertura das duas fontes, cota, hashes competitivos, zero escrita, rollback e hash do relatório.
- Mantém a football-data.org oficial e não executa automaticamente o ensaio, deploy ou corte.

# v6.24.1 — Ensaio protegido do corte para API-Football

- Adiciona um ensaio administrativo, explicitamente confirmado e somente leitura para comparar rodada e classificação nas duas fontes.
- Reutiliza o plano oficial da API-Football sem persistência e valida os dez mapeamentos, identidades, estados e reservas de cota.
- Comprova por hashes antes/depois que jogos e palpites competitivos permanecem intactos.
- Simula em memória a sequência de corte e rollback integral, mantendo a football-data.org oficial.
- Não realiza chamadas reais, escritas no Supabase, alteração de variável, deploy ou corte nesta entrega.

# v6.24.0 — Fundação do corte controlado para API-Football

- Adiciona seleção protegida e fail-closed da fonte esportiva oficial, mantendo a football-data.org como padrão.
- Prepara a API-Football para sincronizar jogos e classificação por meio dos IDs canônicos já mapeados.
- Separa o cache de classificação por fornecedor e identifica a fonte oficial em logs e diagnóstico.
- Bloqueia mapeamentos incompletos, conflitos de identidade, estados desconhecidos e consumo da reserva de cota.
- Mantém a ativação, o deploy de corte, o ensaio operacional e qualquer escrita real pela API-Football fora desta entrega.

# v6.23.3 — Momentos e marcos ativos de Meu Time

- Mantém o título “Momentos com o seu time” e substitui a lista de partidas por um comentário curto, contextual e bem-humorado.
- Deriva o comentário deterministicamente de palpites, acertos, confiança, sequência e fase recente do clube, sem IA ou chamada externa.
- Exibe desde o início os cinco marcos pessoais, distinguindo conquistas desbloqueadas e progresso pendente.
- Acrescenta o marco de participação “Primeiro capítulo” e preserva os critérios competitivos existentes.
- Mantém Supabase, sincronização esportiva, palpites, resultados e pontuação inalterados.

# v6.23.2 — Agendamentos divergentes

- Distingue horários confirmados, datas provisórias e adiamentos sem nova data.
- Prepara correção atômica e auditável do horário de Remo x Palmeiras sem alterar resultados ou IDs.
- Impede que a sincronização sobrescreva um horário confirmado pela CBF.

# v6.23.1 — Frases individuais nas disputas paralelas

- Acrescenta uma frase de efeito própria a cada participante nos dois rankings recreativos.
- Deriva cada texto deterministicamente de posição, proximidade, eficiência, acertos e tamanho da amostra.
- Mantém repertórios diferentes para eficiência e momento recente, com humor leve e não depreciativo.
- Preserva cálculos, ordenação, critérios, Ranking principal, palpites e Supabase.

# v6.23.0 — Disputas paralelas

- Adiciona à Tela de Ranking uma provocação compacta, sem alongar a classificação principal.
- Abre em modal os rankings recreativos “Quem joga, resolve” e “Tá vindo quente”.
- Compara eficiência com mínimo de 20 palpites e momento recente em três rodadas elegíveis.
- Usa frases determinísticas bem-humoradas e destaca o participante atual.
- Preserva integralmente Ranking oficial, pontuação, palpites, Supabase e demais telas.

# v6.22.7 — Calendário na Tela de Jogos

- Adiciona ao cabeçalho da Tela de Jogos um acesso direto ao calendário mensal existente.
- Mantém o acionador na mesma linha de “Jogos” e da rodada selecionada, reutilizando o padrão visual da Home.
- Preserva a seleção da rodada e a expansão da partida prioritária ao escolher uma data.
- Mantém palpites, filtros, pontuação, Supabase e sincronização inalterados.

# v6.22.6 — Jogo ao vivo expandido pela Home

- Faz cada confronto destacado no card Ao Vivo abrir sua rodada com o jogo correspondente expandido.
- Mantém o botão “Ver jogos” como acesso independente à Tela de Jogos completa.
- Reutiliza a navegação direta por partida e preserva foco, teclado, filtros, placares e atualização ao vivo.

# v6.22.5 — Link nas mensagens do WhatsApp

- Acrescenta o endereço oficial do bolão aos quatro modelos de mensagem individual do WhatsApp.
- Inclui o mesmo link no lembrete coletivo de palpites pendentes.
- Reutiliza a URL oficial configurada no aplicativo e preserva a edição e o envio manual das mensagens.

# v6.22.4 — Início estimado pelo horário programado

- Assume visualmente o início da partida quando o horário programado é atingido e a fonte ainda mantém o jogo como agendado.
- Exibe o relógio com `~` e limita a estimativa do primeiro tempo a `45+15`.
- Oculta o palpite no resumo retraído enquanto o placar oficial estiver indisponível, evitando que ele seja confundido com resultado ao vivo.
- Mantém o status oficial armazenado, placares, pontuação, Ranking e liberação de palpites dependentes exclusivamente dos dados confirmados.
- Faz estados oficiais posteriores prevalecerem imediatamente sobre a estimativa local.
- Corrige a interpretação de placares nulos e registra diagnóstico seguro da permissão, status, placar, minuto e gols recebidos na janela ao vivo.
- Separa disponibilidade técnica da API e atualidade dos dados, alertando jogos ainda agendados 30 minutos após o início.
- Corrige “posições”, esclarece as métricas de palpites e apresenta Atlético-MG e Athletico-PR sem alterar dados persistidos.
- Formaliza a contingência manual por duas fontes, IDs, precondições, transação e auditoria posterior.

# v6.22.3 — Atualização dos palpites encerrados

- Recarrega os palpites públicos quando uma partida passa a encerrada com placar válido.
- Atualiza imediatamente Ranking, Estatísticas, Home e o modal individual já aberto.
- Repete automaticamente a consulta após falhas temporárias, preservando os dados anteriores.
- Evita consultas adicionais enquanto não houver novos palpites liberados.
- Mantém protegidos os palpites de partidas futuras, ao vivo, adiadas ou canceladas.

# v6.22.2 — Recuperação segura do início tardio

- Usa o horário programado como referência auxiliar quando a API demora para declarar uma partida ao vivo.
- Limita a recuperação inicial a 15 minutos para proteger partidas que realmente começaram atrasadas.
- Mantém a referência contínua após a inicialização e não reaplica o horário programado no segundo tempo.
- Preserva minuto oficial, calibração por gols, limites de segurança e todas as regras competitivas.

# v6.22.1 — Relógio estimado sem deriva

- Preserva a referência temporal contínua entre sincronizações do relógio estimado.
- Evita o descarte repetido de segundos que aumentava progressivamente a defasagem.
- Mantém calibrações por minuto oficial ou gol somente quando elas avançam o relógio.
- Registra separadamente gols recebidos e gols com minuto aproveitável no diagnóstico da sincronização.
- Preserva banco, placares, palpites, pontuação, Ranking e limites de segurança existentes.

# v6.22.0 — Relógio estimado de baixo custo

- Mantém o minuto oficial como fonte prioritária e usa um relógio estimado, identificado por `~`, somente quando a API não fornece esse dado.
- Inicia a estimativa na primeira observação do jogo ao vivo, pausa no intervalo e retoma no segundo tempo.
- Permite que eventos de gol avancem a referência sem jamais fazer o relógio retroceder.
- Limita a exibição a `~45+15'` e `~90+15'`; depois disso, retorna ao estado seguro “AO VIVO”.
- Adiciona estado mínimo e aditivo no Supabase, além de indicadores operacionais no relatório da sincronização.
- Preserva placares, palpites, fechamento, pontuação, Ranking e demais regras competitivas.

# v6.21.6 — Relógio oficial pelo detalhe da partida

- Mantém a consulta compacta em lista para status e placares na janela ao vivo.
- Complementa partidas efetivamente em andamento ou no intervalo pelo recurso individual da football-data.org.
- Registra quantos detalhes foram consultados, falharam, ficaram fora do limite e retornaram minuto oficial.
- Preserva o limite de oito chamadas por sincronização, o fallback “AO VIVO” e todas as regras competitivas.

# v6.21.5 — Estado de intervalo preservado

- Preserva como `intervalo` o status `PAUSED` recebido da fonte esportiva.
- Exibe “INTERVALO” sem minuto estimado durante a pausa entre os tempos.
- Sincroniza minuto e acréscimos oficiais da fonte esportiva, sem cálculo baseado no horário de início.
- Mantém placar parcial, Ranking provisório e sincronização por minuto ativos durante o intervalo.
- Não altera banco, pontuação, fechamento de palpites ou estados terminais.

# v6.21.4 — Indicador único no card Ao Vivo

- Remove a seta branca residual dos jogos ao vivo exibidos na Home.
- Mantém somente a seta verde circular como indicação de navegação.
- Preserva placar, clubes, estado ao vivo, botão “Ver jogos” e ação do card.

# v6.21.3 — Entrada direta de placares

- Posiciona o foco no primeiro campo vazio quando um jogo editável é aberto pelo participante.
- Reforça nos celulares a solicitação de teclado numérico para os dois campos do placar.
- Mantém a abertura automática da tela sem acionar foco ou teclado.
- Preserva rascunhos, salvamento, avanço automático, limites e fechamento dos palpites.

# v6.21.2 — Assinatura luminosa dos heroes

- Leva aos heroes de Ranking, Estatísticas e Meu Time a iluminação verde lateral inspirada na Home.
- Mantém a Home como referência mais luminosa e preserva as identidades próprias de cada tela.
- Aplica o efeito internamente, sem alterar dimensões, conteúdo ou comportamento responsivo dos cards.
- Preserva cálculos, dados, Supabase, Tela de Jogos e demais componentes.

# v6.21.1 — Progresso compacto na Tela de Jogos

- Substitui os quatro blocos fixos por uma leitura única de palpites preenchidos.
- Adiciona barra proporcional e situação objetiva da rodada selecionada.
- Exibe jogos adiados, fechados e rodada parcial somente quando relevantes.
- Mantém navegação, filtros, cards, edição, fechamento e salvamento dos palpites inalterados.

# v6.21.0 — Hero híbrido de Meu Time

- Reorganiza o topo de Meu Time em identidade do clube, situação no campeonato, momento recente e próximo compromisso.
- Incorpora o próximo jogo ao rodapé interno do hero e remove o card duplicado abaixo dele.
- Separa os acessos à classificação e à Tela de Jogos em ações explícitas e acessíveis.
- Mantém o Índice de Sintonia como primeiro aprofundamento, agora em largura total.
- Preserva cálculos, dados, Supabase, palpites, pontuação e demais telas.

# v6.20.5 — Hero do Ranking harmonizado

- Aplica ao card principal do Ranking a mesma lógica estrutural do hero da Home.
- Cria no computador um painel lateral dedicado ao troféu e à pontuação, com divisor visual.
- Transforma esse painel em uma composição compacta no celular, preservando espaço e legibilidade.
- Faz “Para subir” e “Vantagem” ocuparem toda a faixa inferior do card.
- Mantém tamanho e acabamento do troféu, cálculos, Pódio, classificação, dados e Supabase inalterados.

# v6.20.4 — Topo consolidado do Ranking

- Incorpora “Para subir” e “Vantagem” ao card principal da Tela de Ranking.
- Remove o card separado “Sua posição” e reduz a repetição de posição e pontos antes da classificação completa.
- Mantém inalterada a presença decorativa do troféu no card principal.
- Preserva Pódio, setas de movimentação, Pontos e Palpites, Ranking provisório, pontuação, dados e Supabase.

# v6.20.3 — Movimentação legível no Ranking

- Remove o indicador circular do estado estável no Pódio e na Classificação completa.
- Exibe somente subida ou queda, com quantidade no computador e apenas seta no celular.
- Reconstrói a movimentação entre as duas últimas rodadas disponíveis, sem depender de armazenamento no navegador.
- Reorganiza Pontos e Palpites no celular para eliminar a sobreposição entre rótulos e valores.
- Preserva pontuação, ordenação oficial, Ranking provisório, dados, Supabase e demais telas.

# v6.20.2 — Harmonia do resumo das Estatísticas

- Reorganiza o card inicial em uma área objetiva de desempenho e um rodapé interno de largura total.
- Impede que momento, título e círculo de eficiência disputem a mesma coluna no celular.
- Restaura de forma permanentemente visível a explicação do significado do título atual.
- Mantém eficiência, pontos, participação, momento e título no mesmo card, com hierarquia mais clara.
- Preserva cálculos estatísticos, pontuação, dados, Supabase e demais telas.

# v6.20.1 — Consolidação da tela de Estatísticas

- Reúne “Meu desempenho” e “Seu momento” em um único card inicial mais compacto.
- Mantém eficiência, participação, leitura do momento e título atual sem repetir um card completo.
- Ordena o Histórico do Ranking da rodada mais recente para a mais antiga.
- Substitui a classificação duplicada por um acesso à tela completa de Ranking.
- Move ressalvas informativas para o final da tela e mantém alertas de dados inválidos no topo.
- Preserva cálculos estatísticos, pontuação, dados, Supabase e demais telas.

# v6.20.0 — Detalhes da recuperação competitiva

- Explica cada ocorrência no card administrativo com jogo, rodada, valores preservados e atuais e uma descrição curta e determinística.
- Separa alterações posteriores registradas, pendências de conferência e impactos em checkpoints, evitando tratar toda diferença histórica como problema atual.
- Permite registrar a conferência administrativa somente nas pendências reais, com identificação do administrador e horário preservados em área privada.
- Mantém jogos, palpites, snapshots, pontos e posições inalterados; não introduz restauração automática.
- Restringe leitura e conferência detalhadas a administradores ativos e aprovados e não retorna palpites individuais ou dados pessoais.

# v6.19.3 — Harmonia visual dos cards administrativos

- Uniformiza largura, preenchimento, cantos e espaçamento vertical dos cards da Central de Atenção ao Dashboard executivo.
- Padroniza escala dos títulos, alinhamento dos cabeçalhos, textos introdutórios e retorno à navegação rápida.
- Harmoniza o acabamento dos cards recolhidos sem impor alturas fixas ao conteúdo dinâmico.
- Preserva funcionalidades, ordem, conteúdo, identidade visual, Supabase e demais telas.

# v6.19.2 — Ranking provisório permanente na Área ADM

- Adiciona às Ações rápidas administrativas um acesso permanente ao modal existente do Ranking provisório.
- Permite ao administrador consultar a projeção da rodada atual mesmo sem jogos ou resultados em andamento.
- Preserva o critério de disponibilidade da Home e da Tela de Ranking para participantes comuns.
- Mantém cálculo, dados agregados, Supabase, pontuação oficial e demais experiências do modal inalterados.

# v6.19.1 — Preview sintético do Ranking provisório

- Permite abrir uma demonstração do modal com `?preview=ranking-provisorio` em localhost e Deploy Previews da Netlify.
- Usa somente participantes, placares e posições fictícios, sem autenticação ou consulta ao Supabase.
- Identifica visualmente o conteúdo como demonstração sintética e permite reabrir o modal após fechá-lo.
- Explicita em cada linha a comparação entre posição oficial e provisória, além da variação já indicada por setas.
- Ignora explicitamente o parâmetro no domínio oficial de produção.

# v6.19.0 — Ranking provisório

- Adiciona um modal compartilhado entre Home e Ranking para projetar a classificação durante uma rodada em aberto.
- Considera resultados encerrados, placares ao vivo e partidas suspensas com placar válido; jogos futuros ou adiados sem placar contribuem com zero temporário.
- Calcula a projeção em uma RPC agregada que não revela palpites individuais nem persiste pontos provisórios.
- Mantém Ranking oficial, Estatísticas, Destaques, histórico, compartilhamentos e snapshots isolados da projeção.

# v6.18.2 — Autorização centralizada no Supabase

- Fixa o Supabase JS em `2.110.9` no pacote e no carregamento pelo CDN.
- Remove do cliente a lista fixa de participantes e o e-mail administrativo de compatibilidade.
- Faz a primeira carga administrativa usar o cadastro individual ativo e aprovado retornado pelo Supabase.
- Remove a exceção `ADMIN_EMAILS` das Netlify Functions; ações administrativas exigem cadastro ativo, aprovado e marcado como administrador.
- Mantém tabelas, migrações, RLS, dados, regras de palpites e pontuação inalterados.

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
