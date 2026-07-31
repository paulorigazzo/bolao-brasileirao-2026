6.9.0d

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
