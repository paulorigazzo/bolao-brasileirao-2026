6.14.1

# v6.13.0 — Calendário Interativo de Partidas

- Apresenta os jogos em uma grade mensal compacta e responsiva.
- Indica quantidade de partidas e presença do time favorito em cada dia.
- Abre com um toque a rodada e o jogo prioritário na Tela de Jogos.
- Mantém partidas adiadas sem data fora da grade, devidamente identificadas.

# v6.12.0 — Acesso histórico aos Destaques da Rodada

- Permite rever os Destaques diretamente pelo histórico de pontuação nas Estatísticas.
- Reutiliza o modal e o motor determinístico existentes, sem criar uma visão redundante.
- Preserva Home, Jogos, Área ADM, Supabase e regras de pontuação.

# v6.11.3 — Contexto dos jogos adiados nas Estatísticas

- Detalha todas as partidas adiadas excluídas dos cálculos estatísticos.
- Identifica a rodada original e o confronto de cada partida.
- Preserva a classificação dos jogos e todos os cálculos existentes.

# v6.11.2 — Refinamentos de layout desktop

- Alinha os confrontos de “Últimas Rodadas” às colunas comparativas superiores no computador.
- Separa contexto, estado parcial e placar para impedir sobreposições em telas largas.
- Mantém os cinco destinos da barra flutuante em uma única linha no desktop.

# v6.11.1 — Refinamentos de layout mobile

- Corrige a barra flutuante em celulares na orientação horizontal.
- Recupera espaço para nomes, time e selo `Você` na classificação completa.
- Elimina a sobreposição entre estado parcial e placar nas últimas rodadas do duelo.

# v6.11.0b — Rodadas do duelo em destaque

- Alinha “Últimas Rodadas” ao novo padrão visual dos indicadores do duelo.
- Destaca placares, vencedor, empates e rodadas parciais sem alterar os cálculos.
- Integra o histórico expandido ao mesmo card e preserva a experiência mobile-first.

# v6.11.0a — Refinamento visual do duelo

- Torna os indicadores lado a lado mais vibrantes com avatares, ícones e números maiores.
- Destaca a vantagem em cada indicador e resume vitórias e empates sem alterar os cálculos.
- Preserva o motor do duelo, a pontuação oficial e as demais telas.

# v6.11.0 — Duelo entre participantes

- Adiciona comparação direta e divertida entre dois participantes no modal do Ranking.
- Exibe placar recreativo por rodadas, indicadores oficiais, títulos temporários e momento recente.
- Usa somente palpites públicos de jogos encerrados e identifica rodadas parciais com partidas adiadas.
- Mantém o placar do duelo separado da pontuação oficial e preserva Home, Jogos e Área ADM.

# v6.10.0d — Resumo administrativo da rodada

- Substitui o compartilhamento isolado da classificação por um resumo coletivo com Destaques e Top 3.
- Restringe geração, revisão, cópia e compartilhamento à Área ADM.
- Trata rodadas consolidadas e com jogos adiados, sem expor partidas protegidas.
- Preserva integralmente a Home e as permissões dos participantes.

# v6.10.0c — Destaques em rodada com jogos adiados

- Mantém como referência a rodada mais recente que já possui resultados válidos.
- Prioriza essa rodada mesmo quando a Home já avançou para a próxima rodada aberta.
- Exibe destaques provisórios somente quando restam jogos adiados e não há partidas ao vivo ou normalmente em aberto.
- Identifica claramente a quantidade de jogos considerados e qualifica os fatos com “até agora”.
- Preserva o cálculo exclusivamente sobre jogos finalizados e a estrutura existente da Home.

# v6.10.0b — Destaques da Rodada na Home

- Integra o motor determinístico ao card existente de Integridade da Rodada.
- Exibe no máximo dois destaques após a consolidação ou em pausas longas.
- Adiciona modal acessível com fatos pessoais, coletivos e origem dos dados.
- Preserva a ordem, os demais cards e a função operacional da Home.

# v6.10.0a — Motor de Destaques da Rodada

- Cria um motor determinístico independente para fatos pessoais e coletivos por rodada.
- Rastreia a origem de cada destaque e preserva empates, identidade canônica e estados provisórios.
- Adiciona testes para rodadas completas, parciais, empates, acertos exclusivos e ausência de palpites.
- Não altera a Home nem qualquer outra interface.

# v6.9.0e — Ranking Mobile sem Sobreposição

- Consolida pontos e palpites em uma única faixa horizontal à direita.
- Impede que nomes longos ultrapassem sua coluna, usando reticências.
- Preserva a altura compacta e a apresentação desktop.

# v6.9.0d — Densidade e Descoberta no Ranking Mobile

- Reduz a altura dos cards da classificação no celular.
- Torna `Palpites`, quantidade e olho uma cápsula clicável claramente visível.
- Mantém pontos e ação na mesma faixa vertical à direita.

# v6.9.0c — Harmonia do Ranking Mobile

- Reposiciona a ação de palpites abaixo dos pontos na coluna direita.
- Remove o texto repetitivo da ação e recupera a densidade dos cards no celular.
- Mantém a área de toque acessível e o desktop inalterado.

# v6.9.0b — Alinhamento e Destaque dos Palpites

- Centraliza o placar do palpite sob o resultado oficial.
- Destaca em verde toda pontuação positiva e preserva o dourado do placar exato.

# v6.9.0a — Refinamento do Modal de Palpites

- Inclui os escudos dos clubes ao lado dos nomes no modal.
- Adota o seletor visual de rodadas da tela Jogos, com faixa numérica, setas e botão Rodada Atual.
- Preserva a proteção dos palpites e a rodada inicial com partidas encerradas.

# v6.9.0 — Transparência dos Palpites

- Permite consultar, pela classificação, os palpites individuais de cada participante.
- Revela somente partidas oficialmente encerradas e com resultado final.
- Mantém jogos futuros, ao vivo, adiados e cancelados protegidos no Supabase e na interface.
- Oferece seletor de rodada e apresenta resultado, palpite e pontos em modal responsivo.

# v6.8.0 — Cadastro Consolidado

- Reúne nome, telefone opcional e time favorito opcional na tela inicial do convite.
- Usa a lista oficial de clubes para evitar diferenças de grafia.
- Preserva os dados durante o login Google e envia a solicitação somente após a autenticação.
- Materializa automaticamente o perfil completo depois da aprovação administrativa.

# v6.7.1b — Indicação Visual no Card Meu Time 2.0

- Restaura o chevron permanente que identifica o card principal da tela Meu Time como clicável.
- Preserva o destino do card, a navegação por teclado e o comportamento das demais telas.

# v6.7.1a — Atualização de Versionamento

- Identificadores oficiais do aplicativo sincronizados em `v6.7.1a`.
- Nenhuma alteração funcional.

# v6.7.1 — Limite Configurável de Participantes

- Limite de participantes ativos configurável pela Área ADM.
- Validação centralizada no Supabase, inclusive para aprovações simultâneas.
- Feedback visível durante aprovação, recusa e falhas do banco.
- Contador de participantes ativos em relação ao limite.
- Correção das exceções de `event.target.closest` em `motion.js`.
