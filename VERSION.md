6.9.0

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
