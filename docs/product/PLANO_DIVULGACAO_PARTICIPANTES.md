# Divulgação de novidades aos participantes

Documento de trabalho para revisar temas, selecionar conteúdos e acompanhar produção, publicação na Central e divulgação aos participantes. Registrado em 11/10/2026; controle conciliado em 28/10/2026 com as revisões da Central publicadas no commit `42b176a`, mantendo o app na v6.55.0.

Título sugerido da campanha: **Veja o que ficou melhor no seu bolão**.

## Como usar

Cada tema tem controle independente de decisão, produção, publicação na Central e divulgação aos grupos. A tabela de controle consolidada abaixo representa o estado atual; as fichas preservam o histórico das versões anteriores e não devem ser interpretadas como pendências atuais quando houver revisão posterior registrada.

- Decisão: A revisar / Selecionado / Adiado / Descartado.
- Produção: Não iniciada / Em roteiro / Em produção / Criado / Em revisão / Aprovado.
- Publicação na Central: Não publicado / Publicado / Substituído por vídeo atual do tema.
- Divulgação aos grupos: Não programada / Programada / Divulgada. Publicar na Central não comprova envio por WhatsApp.
- Registrar responsáveis, links dos materiais, canal e datas na ficha do tema.
- Antes da gravação, conferir o comportamento na versão em produção e escolher exemplos legíveis. Prioridades são sugestões, não decisões aprovadas.

## Padrão de vinheta para novos vídeos

Decisão aprovada em 13/10/2026: todos os vídeos criados daqui em diante devem usar a vinheta Entrada em campo, mantendo a identidade visual do bolão e sua assinatura sonora original.

- Abertura: `central/vinhetas/entrada-em-campo-abertura.mp4`, 2,4 segundos.
- Encerramento: `central/vinhetas/entrada-em-campo-encerramento.mp4`, 2 segundos, com Bora pro próximo palpite?.
- Incorporar os 4,4 segundos ao limite total aprovado de cada vídeo; ajustar o roteiro antes da gravação, sem cortar fala ou acelerar as animações para acomodar a vinheta.
- Preservar H.264 Main nível 3.1, 20 fps, yuv420p, áudio AAC e faststart na exportação final; conferir duração e decodificação integral.
- Os dois arquivos são reutilizáveis e independentes do vídeo de apresentação. A aplicação retroativa aos oito tutoriais e à apresentação da Central foi aprovada e publicada no commit `c9415bd`; qualquer nova alteração depende de solicitação específica.
- A vinheta de abertura foi implementada no app, sem som, na versão 6.47.1 (PR #255). O carregamento concluído interrompe a animação; falhas e preferência por movimento reduzido usam o logo estático. Ver [nota da versão](../releases/v6.47.1-vinheta-abertura.md).

## Opções de conteúdo

| ID | Tema e mensagem ao participante | Formato e demonstração sugeridos | Prioridade sugerida |
| --- | --- | --- | --- |
| 01 | **Meu time reunido na Home.** Posição, pontos do clube, campanha, últimos resultados, próxima partida e desempenho dos seus palpites em um card expansível, inicialmente recolhido. Toque no cabeçalho para abrir. Últimos jogos abre a Classificação no favorito. | Imagem do card completo e vídeo percorrendo o bloco e tocando em Últimos jogos. | Alta |
| 02 | **Visão Geral mais organizada.** Números maiores e centralizados, alinhamento uniforme e cores para pontos confirmados, palpites completos e pendências. | Imagem antes/depois, destacando organização e leitura. | Média |
| 03 | **Campanha de qualquer clube.** Uma linha por rodada, escudos, placares, pontos conquistados e acumulados, posição e evolução; seleção de outros clubes e retorno ao favorito. | Vídeo abrindo Ver campanha, explorando a lista, trocando o clube e voltando pelo escudo do favorito. | Alta |
| 04 | **Estatísticas mais fáceis de entender.** Variação da média em pts/jogo, com setas e comparação explicada. O resumo do histórico mostra média quando aplicável, com mínimo de três rodadas. | Imagem com destaques na variação e na média do histórico, usando exemplo real. | Média |
| 05 | **Prazo dos palpites visível nos cards.** Na rodada atual, Fecha em… aparece sem expandir o jogo. Após o prazo e antes do início, aparece Palpites encerrados. | Duas imagens: prazo aberto e palpites encerrados. | Alta |
| 06 | **Ligas: seus palpites, diferentes disputas.** Cada liga reúne um grupo com ranking próprio. Os mesmos palpites valem nas ligas das quais você participa. | Vídeo: mostrar liga no cabeçalho, abrir menu do usuário → Liga ativa, trocar de liga e comparar rankings. Mensagem: Você palpita uma vez e participa de diferentes disputas. | Alta |
| 07 | **Ranking provisório durante os jogos.** Veja como ficaria a classificação se os jogos terminassem com os placares daquele momento. | Vídeo abrindo a projeção durante jogo ao vivo e destacando a natureza provisória dos pontos. | Alta — primeira leva de vídeos |
| 08 | **Destaques e Ranking da rodada.** Consulte seu desempenho, destaques do grupo e classificação específica da rodada, mesmo sem estar entre os líderes do campeonato. | Vídeo abrindo pela Home e percorrendo as três áreas; distinguir projeção e resultado consolidado. | Alta — primeira leva de vídeos |
| 09 | **Jogos com estatísticas e escalações.** Autores e minutos dos gols, estatísticas e escalações em Lista ou Campo, com camisas dos clubes e detalhes dos jogadores. | Vídeo expandindo um jogo, abrindo Estatísticas, mudando para Campo e tocando em uma camisa. | Alta — primeira leva de vídeos |
| 10 | **Rodadas em uma faixa deslizante.** Consulte outras rodadas e retorne rapidamente à atual. | Vídeo curto deslizando a faixa, selecionando uma rodada e usando Rodada Atual. | Média |
| 11 | **Jogos reagendados continuam acessíveis.** Partidas antigas pendentes têm acessos próprios, mantendo o foco na rodada atual. | Imagem ou vídeo de aviso real e abertura da partida reagendada. | Média — depende de exemplo disponível |
| 12 | **Ativação de notificações.** Habilite seu aparelho para receber lembretes automáticos de pendências, o resumo da rodada e avisos manuais da administração. | Tutorial do convite Ativar notificações e da autorização do navegador. | Alta |
| 13 | **Disputas Paralelas.** Conheça rankings recreativos que oferecem outras formas de comparar o desempenho dos participantes, usando os mesmos resultados, sem mudar a classificação oficial. | Vídeo: abrir Ranking → Ver disputas paralelas, explorar as opções e mostrar como consultar seu desempenho. Manter narração, legendas, toques destacados e vinhetas, em até 30 s. | Alta |
| 14 | **Central do Participante.** Encontre guias, vídeos e respostas sobre o bolão. | Vídeo mostrando o acesso à Central pelo menu, a busca e os guias de onde tocar. | Publicado |
| 15 | **Conheça o Bolão: apresentação do app.** Apresentar de forma leve as funcionalidades básicas e mais úteis, conectando cada recurso ao benefício para o participante. | Vídeo promocional com imagens e telas reais, navegação e animações fiéis ao app, narração descontraída e acabamento profissional. Briefing na ficha 15. | A definir |
| 16 | **Instalar no Android.** Adicione o bolão à tela inicial pelo Chrome. | Tutorial com menus ilustrados, tela real do app e narração Antonio. | Publicado |
| 17 | **Instalar no iPhone.** Adicione o bolão à Tela de Início pelo Safari. | Tutorial com menus ilustrados, tela real do app e narração Antonio. | Publicado |

## Cuidados com as mensagens

- **03 — Campanha:** mostra somente até a rodada atual. Posições históricas são calculadas pelos resultados disponíveis, não tabelas oficiais históricas. Pontos dos clubes e pontos do bolão são conceitos distintos.
- **04 — Estatísticas:** variação compara a média de pontos por jogo com a rodada anterior disponível. O resumo mostra a média do histórico completo apenas sem tendência clara e com pelo menos três rodadas; nos demais casos, esse bloco fica oculto.
- **05 — Prazo:** a regra continua sendo fechamento 30 minutos antes do jogo. Outras rodadas e jogos encerrados mantêm seu comportamento.
- **06 — Ligas:** menu do usuário → Liga ativa é o caminho de troca. Ranking, Estatísticas, Destaques e Duelos acompanham a liga selecionada; jogos e palpites próprios permanecem os mesmos. Inclusão em outras ligas é feita pela administração; não anunciar criação ou entrada livre pelo participante.
- **07 — Ranking provisório:** acesso disponível após o início da rodada e enquanto ela não estiver consolidada, inclusive entre partidas. Não apresentar projeção como pontuação oficial ou definitiva.
- **08 — Destaques:** identificar quando os dados são provisórios e quando estão consolidados.
- **09 — Detalhes:** dependem da disponibilidade dos dados esportivos. Campo representa titulares da formação inicial; eventos de substitutos aparecem nos detalhes correspondentes. Não prometer cobertura completa de todas as rodadas.
- **11 — Reagendados:** usar data e situação atuais. Nem toda partida antiga pendente está com palpites abertos.
- **12 — Notificações:** ativação por aparelho, sujeita à compatibilidade e à permissão do navegador. Lembretes automáticos previstos para 12h e 2h antes do primeiro jogo, somente com palpites pendentes e abertos; resumo pessoal após a rodada completa, incluindo reagendados, sem restrição de horário. Mantém avisos manuais e uma preferência por aparelho. Várias ligas não multiplicam os avisos. Não prometer entrega garantida.

- **13 — Disputas Paralelas:** são rankings recreativos; não alteram pontuação ou classificação oficial. Conferir opções e critérios na versão em produção antes de escrever o roteiro, sem prometer prêmios.

## Organização sugerida

**O que mudou:** temas 01–06, 10 e 11.

**Você já conhece?:** temas 07, 08, 09, 12 e 13. São recursos que ficam em áreas expandidas, modais ou aparecem em momentos específicos. Não há dados de uso que comprovem que sejam pouco conhecidos.

Primeira leva sugerida: três vídeos curtos sobre Ranking provisório, Destaques da rodada e Escalações no Campo. Complementar com imagens de Meu time, Visão Geral e prazo dos palpites.

**Home 2.0:** reservar para divulgação futura. Continua experimental e acessível pela ADM, sem substituir a Home dos participantes.

## Controle de revisão, produção e divulgação

| ID | Tema | Decisão | Produção | Central do Participante | Divulgação aos grupos | Material / revisão atual |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Meu time na Home | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#meu-time) | Não programada | Publicado em 28/10/2026: 31,13 s; commit `42b176a` |
| 02 | Visão Geral | Descartado como tutorial próprio | Não se aplica | Não publicado | Não programada | Decisão do usuário: não produzir tutorial dedicado |
| 03 | Campanha dos clubes | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#campanha) | Não programada | Publicado em 28/10/2026: 33,92 s; commit `42b176a` |
| 04 | Estatísticas | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#estatisticas) | Não programada | Versão atual com Antonio e vinheta Entrada em campo; duração indicada de 33 s |
| 05 | Prazo dos palpites | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#palpites) | Não programada | Versão atual com vinheta Entrada em campo; duração indicada de 33 s |
| 06 | Ligas | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#ligas) | Não programada | Ranking sem pódio na versão atual; commit `73e1476`, duração indicada de 34 s |
| 07 | Ranking provisório | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#ranking) | Não programada | Publicado em 28/10/2026: 34,82 s; commit `42b176a` |
| 08 | Destaques da rodada | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#destaques) | Não programada | Publicado em 28/10/2026: 45,82 s; commit `42b176a` |
| 09 | Detalhes dos jogos e escalações | Selecionado | Aprovado — vídeo atual do tema | [Publicado](https://bolaorigazzo2026.netlify.app/central/#escalacoes) | Não programada | Escalações em Lista e Campo, commit `8888150`, duração indicada de 32 s. O vídeo original 09 é material anterior, não uma nova pendência de publicação |
| 10 | Seletor de rodadas | A revisar | Não iniciada | Não publicado | Não programada | Tema ainda sem vídeo dedicado |
| 11 | Jogos reagendados | A revisar | Não iniciada | Não publicado | Não programada | Depende de exemplo disponível |
| 12 | Notificações | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#notificacoes) | Não programada | Publicado em 28/10/2026: 44,82 s; commit `42b176a` |
| 13 | Disputas Paralelas | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#disputas) | Não programada | Inclui Recordes por rodada e Ranking atual; commit `c9059ac`, duração indicada de 35 s |
| 14 | Central do Participante | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#conheca-central) | Não programada | Publicado em 28/10/2026: 32,40 s; commit `42b176a` |
| 15 | Apresentação promocional do app | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#conheca-bolao) | Não programada | Publicado em 28/10/2026: 59,50 s; commit `42b176a` |
| 16 | Instalar no Android | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#instalar-android) | Não programada | Menus ilustrados, tela real do bolão e Antonio; duração indicada de 42 s; commit `d3d9f42` |
| 17 | Instalar no iPhone | Selecionado | Aprovado | [Publicado](https://bolaorigazzo2026.netlify.app/central/#instalar-iphone) | Não programada | Menus ilustrados, tela real do bolão e Antonio; duração indicada de 43 s; commit `d3d9f42` |

As durações indicadas são as exibidas no catálogo quando não foi registrada a duração medida. A apresentação do app fica fora da lista de tutoriais, na abertura recolhível da Central. Não foi identificado registro de envio aos grupos; por isso, a divulgação permanece não programada.

**Pendência de vídeo já produzido:** nenhuma. As sete revisões foram aprovadas e publicadas em 28/10/2026. Os temas 10 e 11 ainda não foram produzidos. O tema 02 foi dispensado como tutorial próprio. Versões antigas, testes e vinhetas independentes são materiais de trabalho.

### Modelo de ficha por conteúdo

Copiar quando um tema for selecionado; criar fichas separadas se houver mais de uma peça para o mesmo tema.

- ID do tema / peça:
- Objetivo e mensagem principal:
- Formato e duração:
- Roteiro / texto:
- Tela e exemplo usados:
- Responsável:
- Arquivo ou link do material:
- Revisão e aprovação:
- Canal de divulgação:
- Data prevista:
- Data efetiva / link da publicação:
- Observações e ajustes:

## Referências das entregas

- [Meu time unificado](../releases/v6.46.2-home-favorito-unificado.md), [acesso à Classificação](../releases/v6.46.3-home-ultimos-jogos-classificacao.md) e [compactação](../releases/v6.46.4-home-meu-time-compacto.md).
- [Visão Geral](../releases/v6.46.1-home-visao-geral.md).
- [Campanha dos clubes](../releases/v6.45.0-modal-campanha-clube.md).
- [Variação nas Estatísticas](../releases/v6.45.1-clareza-variacao-estatisticas.md) e [média do histórico](../releases/v6.45.2-momento-estatisticas-com-dados.md).
- [Prazo dos palpites](../releases/v6.44.5-prazo-palpites-cabecalho.md).
- [Contexto das ligas](../releases/v6.25.0-contexto-de-liga-na-interface.md) e [liga no cabeçalho](../releases/v6.39.1-liga-ativa-no-cabecalho.md).
- [Destaques ao vivo](../releases/v6.42.0-destaques-ao-vivo.md).
- [Detalhes no Campo](../releases/v6.40.0-detalhes-dos-jogadores-no-campo.md) e [eventos de substitutos](../releases/v6.44.0-eventos-substitutos-campo.md).
- [Seletor de rodadas](../releases/v6.44.3-seletor-rodadas-horizontal.md).
- [Jogos reagendados](../releases/v6.44.2-contexto-jogos-reagendados.md).
- [Convite para notificações](../releases/v6.35.0-convite-ativacao-push.md).

## Ficha 09 / vídeo 01 — Detalhes dos jogos

- Objetivo: apresentar os recursos do card expandido e estimular sua exploração.
- Formato: MP4 vertical, 720 × 1280, 27 segundos, voz sintética em português e legendas incorporadas.
- Exemplo: telas reais de Flamengo × Fluminense, Rodada 30, capturadas na produção em 11/10/2026. Os valores exibidos são do momento da captura.
- Sequência: placar e gols → estatísticas → Lista → Campo → eventos do jogador → convite para explorar.
- Material local: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item09/item09-detalhes-dos-jogos.mp4`.
- Responsável pela produção: Codex.
- Revisão: aguardando avaliação humana; arquivo decodificado integralmente, duração e trilha de áudio verificadas.
- Canal e data de divulgação: a definir. Não divulgado.
- Observação: montagem com capturas reais e movimento suave; não é uma gravação contínua da navegação.
### Revisão 02 — Toques e abertura das seções

- Vídeo vertical de 27 segundos com capturas sequenciais das interações reais: expansão do card, estatísticas, escalações, troca para Campo e resumo do jogador.
- Círculos editoriais identificam o ponto do toque; narração e legendas mantidas. Sequência editada, com pausas de leitura.
- Exemplo atualizado: Flamengo × Fluminense após encerramento, capturado em 11/10/2026.
- Material local: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item09/item09-detalhes-dos-jogos-com-toques.mp4`.
- Estado: Em revisão. Não divulgado. Versão anterior preservada.
## Ficha 06 / vídeo 01 — Ligas

- Objetivo: explicar grupos competitivos e demonstrar a troca da liga ativa, sem repetir palpites.
- Formato: MP4 vertical, 720 × 1280, 29 segundos, voz sintética em português, legendas e indicação dos toques.
- Sequência real: Ranking → menu do usuário → Liga ativa → Família_2026 → Estatísticas → Jogos.
- Mensagem: um único conjunto de palpites vale nas ligas do participante; ranking, estatísticas, destaques e duelos acompanham a seleção. Inclusão em outra liga depende da administração.
- Material local: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item06/item06-ligas-com-toques.mp4`.
- Capturas: produção em 11/10/2026. Valores exibidos refletem o momento da captura. Liga original Brasileirão 2026 restaurada após a demonstração.
- Responsável pela produção: Codex.
- Revisão: aguardando avaliação humana.
- Divulgação: não programada; não divulgado.

O usuário aprovou visualmente a versão com toques do item 09; sua divulgação continua não programada.
### Item 06 — Versão com vinhetas

- Acrescenta 0,5 segundo com o logo oficial no início e 0,5 segundo no final, mantendo integralmente os 29 segundos do vídeo anterior, sua narração e legendas.
- Duração total: 30 segundos.
- Material local: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item06/item06-ligas-com-vinhetas.mp4`.
- Estado: Em revisão; não divulgado. Versão anterior preservada.

Em 11/10/2026, por solicitação do usuário, os itens 06 e 09 foram marcados como Criado no controle de produção. A aprovação visual do item 09 permanece registrada. Divulgação não programada para ambos.

## Ficha 12 / vídeo 01 — Notificações

- Objetivo: ensinar o acesso à ativação dos lembretes e explicar seu alcance.
- Formato: MP4 vertical, 720 × 1280, 28 segundos, voz em português, legendas, toques destacados e vinhetas de 0,5 s com o logo oficial.
- Fluxo real capturado: menu do usuário → Meu perfil → Notificações de palpites → Ativar lembretes → solicitação ao navegador.
- O aviso nativo de permissão não foi acessível às capturas. A escolha de Permitir é orientada em legenda e narração, sem simular o aviso ou confirmação de ativação.
- Mensagem: ativação por aparelho; lembretes enviados pela administração; desativação disponível no mesmo local do Perfil.
- E-mail e celular do Perfil ocultados no vídeo.
- Material local: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item12/item12-notificacoes-com-vinhetas.mp4`.
- Capturas: produção em 11/10/2026. Responsável: Codex.
- Estado: Criado, aguardando revisão humana. Não programado e não divulgado.
## Ficha 03 / vídeo 01 — Campanha dos clubes

- Objetivo: apresentar a consulta de campanha por rodada, seleção de clubes e retorno ao favorito.
- Formato: MP4 vertical, 720 × 1280, 29 segundos, narração em português, legendas, toques destacados e vinhetas com o logo oficial.
- Fluxo real: Home → Ver campanha do São Paulo → rolagem horizontal das colunas → seletor de clubes → Flamengo → escudo de retorno ao São Paulo.
- Mensagem: resultados, pontos por jogo e acumulado; posição histórica calculada pelos resultados disponíveis, podendo diferir do histórico oficial; somente até a rodada atual. Consulta não altera o favorito do Perfil.
- Exemplo: dados reais de produção capturados em 11/10/2026. A divergência informada pelo app entre os dados disponíveis e a classificação oficial do Flamengo foi preservada.
- Material local: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item03/item03-campanha-com-vinhetas.mp4`.
- Responsável: Codex. Estado: Criado, aguardando revisão humana. Não programado e não divulgado.
## Ficha 08 / vídeo 01 — Destaques e Ranking da rodada

- Objetivo: apresentar desempenho pessoal, destaques do grupo e classificação específica da rodada.
- Formato: MP4 vertical, 720 × 1280, 29 segundos, narração em português, legendas, toque destacado e vinhetas com o logo oficial.
- Fluxo real: Home → Ver todos os destaques → Seu desempenho → Destaques do grupo → Ranking dinâmico da rodada.
- Exemplos reais: Rodada 30 em andamento e Rodada 29 concluída, capturados na produção em 11/10/2026. O exemplo consolidado foi acessado pelo histórico das Estatísticas.
- Explica que durante jogos os dados são provisórios e podem mudar; depois do encerramento, os resultados são consolidados. Não confunde Ranking da rodada com Ranking geral.
- Material local: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item08/item08-destaques-com-vinhetas.mp4`.
- Responsável: Codex. Estado: Criado, aguardando revisão humana. Não programado e não divulgado.
## Ficha 07 / vídeo 01 — Ranking provisório

- Objetivo: explicar a projeção da classificação geral com os placares disponíveis durante jogos ao vivo.
- Formato: MP4 vertical, 720 × 1280, 29 segundos, narração em português, legendas, toques destacados e vinhetas com o logo oficial.
- Fluxo real: Home → Ver projeção → comparação com a tela de Ranking atual → Ver Ranking provisório.
- Exemplo real capturado em 11/10/2026, durante a Rodada 30: Paulo em 4º com 236 pontos oficiais; projeção em 2º com 246 pontos, incluindo 10 provisórios. Valores do momento da captura, não previsão de resultado final.
- Mensagem: classificação geral projetada, vinculada à liga selecionada; placares e pontos provisórios podem mudar e não substituem o Ranking oficial.
- Material local: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item07/item07-ranking-provisorio-com-vinhetas.mp4`.
- Responsável: Codex. Estado: Criado, aguardando revisão humana. Não programado e não divulgado.
## Ficha 13 / vídeo 01 — Disputas Paralelas

- Objetivo: apresentar os rankings recreativos e seus critérios, sem confundir com a classificação oficial.
- Formato: MP4 vertical, 720 × 1280, 29 segundos, narração em português, legendas, toques destacados e vinhetas com o logo oficial.
- Fluxo real: Ranking → Ver disputas paralelas → Quem joga, resolve → Tá vindo quente → rolagem da lista → aviso recreativo.
- Critérios: média por palpite com mínimo de 20 palpites avaliados; média das 3 rodadas elegíveis mais recentes com pelo menos 7 avaliados em cada uma.
- Capturas reais da produção em 12/10/2026. Os rankings recreativos não alteram pontuação ou classificação oficial, nem prometem premiação.
- Material local: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item13/item13-disputas-paralelas-com-vinhetas.mp4`.
- Voz: Microsoft Daniel em português, disponível no Windows; serviço da voz usada nos vídeos anteriores retornou HTTP 403. Sem alterar configurações de voz do sistema.
- Responsável: Codex. Estado: Criado, aguardando revisão humana. Não programado e não divulgado.
## Ficha 04 / vídeo 01 — Estatísticas

- Objetivo: apresentar os indicadores pessoais e explicar a variação da média de pontos por jogo.
- Formato: MP4 vertical, 720 × 1280, 29 segundos, narração em português, legendas, toque destacado e vinhetas com o logo oficial.
- Fluxo real: Home → Estatísticas → Pontuação por rodada → Tipos de acerto e participação.
- Mensagem: pontos, posição e eficiência; setas comparam a média de pontos por jogo com a rodada anterior disponível; distribuição dos tipos de acerto.
- Capturas reais da produção em 12/10/2026. Sequência editada com as transições reais capturadas. Não simula dados nem um resumo de média que não estava disponível no exemplo.
- Material local: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item04/item04-estatisticas-com-vinhetas.mp4`.
- Voz: Microsoft Daniel em português, seguindo o vídeo das Disputas Paralelas.
- Responsável: Codex. Estado: Criado, aguardando revisão humana. Não programado e não divulgado.

### Revisão da voz do item 04 — 12/10/2026

- Nova versão: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item04/item04-estatisticas-voz-ajustada.mp4`.
- Daniel em velocidade padrão, sem aceleração posterior. Texto encurtado, frases gravadas separadamente e pausas alinhadas às cenas; tratamento leve de áudio.
- Imagens, toques, legendas e vinhetas preservados. Duração: 29 segundos. Versão anterior preservada para comparação.
- Arquivo verificado; naturalidade da voz aguardando avaliação do usuário.

### Decisão sobre a narração do item 04 — 12/10/2026

- Usuário rejeitou a versão com voz ajustada. Manter como principal a versão original `item04-estatisticas-com-vinhetas.mp4`, com Daniel.
- Amostra de voz Maria produzida apenas para comparação: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item04/amostra-maria.mp3`.
- Nenhuma substituição da narração do vídeo por Maria foi realizada.

### Recuperação da voz Antonio — 12/10/2026

- Diagnóstico: síntese no endereço antigo Microsoft retorna 403 para Antonio e Francisca; catálogo continua acessível; desvio do relógio de cerca de 0,5 segundo.
- Problema relatado desde 10/10/2026: https://github.com/rany2/edge-tts/issues/490. Correção proposta: https://github.com/rany2/edge-tts/pull/491.
- Correção isolada no script `divulgacao-item04/voz_antonio_corrigida.py`: síntese via `api.msedgeservices.com/tts/cognitiveservices/websocket/v1`, conforme proposta upstream. Biblioteca instalada e app não alterados.
- Geração de Antonio voltou a funcionar. Narração de 26,26 segundos, sem aceleração posterior. Nova versão do vídeo com as mesmas imagens e edição, 29 segundos: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item04/item04-estatisticas-voz-antonio.mp4`.
- Versão Antonio aguardando revisão do usuário. Versões Daniel preservadas; nenhum outro vídeo foi modificado.

## Ficha 05 / vídeo 01 — Prazo dos palpites

- Objetivo: explicar o prazo individual por partida e a indicação do tempo restante nos cabeçalhos da rodada atual.
- Formato: MP4 vertical, 720 × 1280, 29 segundos, voz Antonio em português, legendas, toques destacados e vinhetas com o logo oficial.
- Fluxo real: Home → Jogos → Abertos → cabeçalhos com Fecha em → Coritiba × Botafogo expandido → exemplo de Vasco × Remo encerrado → confirmação visual de Palpite salvo no jogo aberto.
- Capturas da produção v6.47.0 em 12/10/2026. Rodada 30 com três jogos ainda abertos, cada um com contador próprio.
- Regra: palpites fecham 30 minutos antes do início de cada partida. Depois do prazo, a edição fica bloqueada.
- Limite do exemplo: o estado bloqueado foi demonstrado com jogo já encerrado; não simula a janela entre o fechamento e o início, nem altera o cabeçalho de jogo finalizado.
- Nenhum palpite foi alterado ou salvo. O estado Palpite salvo pertence ao registro já existente.
- Voz Antonio gerada pelo endereço Microsoft atualizado. Versão com capturas editadas, aproximando o cabeçalho para leitura.
- Material local: `C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item05/item05-prazo-palpites-com-vinhetas.mp4`.
- Responsável: Codex. Estado: Aprovado visualmente em 12/10/2026. Publicado na Central em 12/10/2026, commit 538b767. Link: https://bolaorigazzo2026.netlify.app/central/#palpites. Envio aos participantes não programado.

## Ficha 01 / vídeo 01 — Meu time na Home

- Objetivo: mostrar o resumo do clube favorito na Home e distinguir os pontos do clube dos pontos do participante nos palpites com esse clube.
- Formato: vertical 720 × 1280, 29 segundos, narração Antonio, vinhetas do logo e captura de interações reais.
- Roteiro: resumo na Home; posição, pontos e desempenho no Brasileirão; últimos resultados e posição por rodada; toque em Últimos jogos e abertura da classificação com o favorito selecionado; próxima partida e pontos nos palpites com o clube.
- Telas: produção v6.47.0, capturada em 12/10/2026. Exemplo São Paulo; os números e datas representam o momento da gravação.
- Arquivo: C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item01/item01-meu-time-home-com-vinhetas.mp4
- Validação: duração de 29 segundos, trilha de áudio presente, revisão de quadros e decodificação integral aprovadas. A naturalidade da voz depende da revisão humana.
- Estado: Aprovado e publicado na Central em 12/10/2026, commit dec1962. Link: https://bolaorigazzo2026.netlify.app/central/#meu-time. Envio aos participantes não programado.
- Responsável: Codex. Nenhum palpite, preferência de clube ou dado competitivo foi alterado durante a captura.
## Ficha 14 / vídeo 01 — Central do Participante

- Objetivo: divulgar a Central como guia do bolão, mostrando o acesso pelo menu, recursos, vídeos, dúvidas, busca e orientações de onde tocar.
- Formato: vertical 720 × 1280, 29 segundos, voz Antonio, telas reais, indicadores de toque e vinhetas com o logo.
- Roteiro: apresentação; menu do usuário → Central do Participante; explicações das funcionalidades; tutoriais; dúvida sobre fechamento dos palpites; busca por prazo; Mostrar onde tocar; convite para explorar a Central.
- Captura: produção v6.47.0 em 12/10/2026. A navegação entre o menu do app e a Central é apresentada com corte editorial entre as abas reais; não é gravação contínua do sistema operacional.
- Arquivo: C:/Users/user/Documents/Codex/2026-10-07/prior-conversation-with-codex-conversation-role/divulgacao-item14/item14-central-participante-com-vinhetas.mp4
- Verificações: narração de 25,30 s dentro do conteúdo de 28 s; duração final de 29 s; revisão visual dos quadros e decodificação integral aprovadas.
- Estado: Aprovado e publicado na Central em 12/10/2026, commit b6add21. Link: https://bolaorigazzo2026.netlify.app/central/#conheca-central. Versão corrigida para iPhone; divulgação via WhatsApp não programada.
- Responsável: Codex. Sem alterações de dados competitivos ou preferências do usuário.

## Compatibilidade dos vídeos com iPhone — 12/10/2026

Teste do tutorial Prazo dos palpites confirmado pelo usuário em um iPhone. Aplicação da mesma exportação aos oito tutoriais publicados e ao vídeo 14: H.264 Main nível 3.1, 20 fps, yuv420p, faststart e áudio original preservado. Processo de vinhetas corrigido para as próximas produções. Validação em um aparelho não equivale a teste de todos os modelos de iPhone.

## Ficha 15 / vídeo 01 — Conheça o Bolão: apresentação do app

- Solicitação: registrada em 13/10/2026. Preparar futuramente uma apresentação das melhores e mais básicas funcionalidades do app, com acabamento de vídeo de vendas promocional de um produto profissional.
- Objetivo: despertar interesse e mostrar como o participante pode aproveitar o bolão no cotidiano, conectando recursos a benefícios claros.
- Tom: leve, próximo e descontraído, com comentários naturais e humor pontual; evitar narração robótica, exageros e linguagem técnica.
- Candidatos para o roteiro: Home e Visão Geral; preencher e conferir palpites; acompanhar ranking e ligas; consultar o time favorito; explorar estatísticas e detalhes dos jogos; acessar a Central do Participante. Selecionar uma sequência curta e coerente após conferir a versão em produção, sem tentar apresentar todos os recursos.
- Imagens: usar imagens, telas e ativos reais do app. Capturar toques, aberturas, rolagens e animações reais, mantendo a sequência e o movimento das interações. Cortes podem encurtar esperas, mas não devem inventar transições ou funcionalidades.
- Direção visual: preservar a identidade do bolão, com logo, cores e tipografia existentes. Usar telas legíveis, aproximações discretas, ritmo de apresentação de produto, legendas concisas, vinhetas integradas e chamada final clara. Priorizar acabamento profissional e narrativa de benefício.
- Som: voz natural no padrão aprovado; música discreta apenas se adequada e com licença de uso, sem competir com a narração. Não anunciar prêmios ou capacidades que o app não oferece.
- Inspiração: se necessário durante o roteiro, pesquisar vídeos de apps de bolão, futebol e produtos digitais semelhantes. Registrar links e aspectos úteis de ritmo, narrativa e demonstração; não copiar imagens, textos ou músicas. Nenhuma pesquisa foi realizada nesta inclusão na lista.
- Duração e formato: definir no roteiro antes da produção, conforme canal e tempo necessário para legibilidade e fidelidade das animações.
- Compatibilidade: aplicar a exportação corrigida para iPhone e verificar duração, áudio e reprodução. Manter captura e exportação coerentes para preservar o movimento das telas.
- Estado: Selecionado; produção não iniciada, roteiro pendente e divulgação não programada. A inclusão nesta lista não registra um vídeo já criado nem autoriza publicação ou envio aos participantes.
- Material, canal e data: a definir.

### Produção do item 15 — 13/10/2026

- Primeira versão criada: vídeo vertical 720 × 1280, com 56,1 segundos, voz Antonio e trilha instrumental original discreta.
- Narrativa: convite descontraído → palpites e prazo → ligas → ranking provisório → time favorito → estatísticas → Central do Participante → encerramento.
- Usa capturas reais já produzidas em 12/10/2026, com seus tempos originais de interação, cortes editoriais entre cenas e indicadores de toque. Os valores exibidos são do momento da captura, não a situação atual em tempo real.
- Arquivo: .artifacts/video-apresentacao-app/item15-apresentacao-app.mp4. Materiais de produção ignorados pelo Git; o vídeo ainda não foi publicado.
- Compatibilidade: H.264 Main nível 3.1, 20 fps, yuv420p, AAC e faststart. Duração, quadros de revisão e decodificação integral verificados. Não houve novo teste físico em iPhone deste arquivo.
- Estado atual: Em revisão, aguardando avaliação humana do vídeo e do áudio. Este registro atualiza o estado inicial do briefing. Divulgação não programada.


### Revisão 02 do item 15 — Vinheta Entrada em campo

- Proposta aprovada pelo usuário: desenho progressivo das linhas do campo, aproximação suave do logo, brilho dourado e assinatura sonora original.
- Abertura de 2,4 s e encerramento de 2 s, com a chamada Bora pro próximo palpite?. Substituem apenas as vinhetas simples de 0,5 s; o conteúdo de 55,1 s permanece integral.
- Duração final: 59,5 s, dentro do limite de um minuto. Voz, cenas e trilha do conteúdo preservadas; versão anterior mantida.
- Arquivo: .artifacts/video-apresentacao-app/item15-apresentacao-app-vinheta-campo.mp4.
- Codificação para iPhone conferida: H.264 Main nível 3.1, 20 fps e faststart. Decodificação integral aprovada; avaliação humana do som e da nova vinheta pendente.
- Estado: Em revisão, sem publicação ou envio aos participantes.

### Aprovação e publicação do item 15 — 13/10/2026

- Vídeo e vinheta aprovados pelo usuário. Publicação concluída na Central, no commit 085d942, com deploy confirmado.
- Acesso: [Conheça o Bolão em 1 minuto](https://bolaorigazzo2026.netlify.app/central/#conheca-bolao).
- Abertura e encerramento disponíveis separadamente em central/vinhetas/, para reutilização nos próximos vídeos.
- Estado atual: Aprovada e publicada na Central. Envio aos participantes não programado. Este registro substitui os estados de revisão anteriores.
- Registro documental integrado separadamente da publicação da Central. As novas vinhetas também foram aplicadas aos oito tutoriais e à apresentação da Central, com aprovação do usuário, no commit c9415bd. Conteúdo, narração e movimentos preservados; pequeno aumento de duração aprovado. Exportação compatível com iPhone e decodificação integral verificadas, sem novo teste físico de todos os arquivos.

## Conciliação do controle — v6.51.4

A tabela consolidada foi conferida com `central/videos.json`, as apresentações em `central/central.js` e o histórico de publicações. As fichas anteriores permanecem como histórico, inclusive estados de Criado ou Em revisão que já foram superados pela publicação. Publicação na Central e divulgação via WhatsApp são etapas distintas.

### Atualizações aprovadas e publicadas — commit 01bb53f

- Meu Time: demonstra o toque no cabeçalho e a expansão do card; 31,13 s.
- Campanha: inclui a expansão antes do acesso à consulta e preserva a seleção de clubes; 32,43 s.
- Destaques: acesso abaixo dos cards de Destaques do Bolão; 30,87 s.
- Apresentação do app: substitui o Ranking com pódio, atualiza Home e Meu Time, preserva o áudio aprovado; 59,5 s.
- Capas, imagens de recurso e guias de onde tocar de Campanha e Destaques atualizados na mesma publicação.
- Padrão de exportação preservado: H.264 Main 3.1, 20 fps, yuv420p, AAC e faststart. Os quatro arquivos foram decodificados integralmente e conferidos no navegador; sem novo teste físico em iPhone.

### Item 07 — Versão aprovada e publicada

- Objetivo: ensinar o acesso pelo Ranking atual e distinguir classificação oficial de projeção provisória.
- Imagens: navegação real atual da v6.51.4 e exemplo real ao vivo capturado em 11/10/2026. O exemplo anterior é identificado, sem simular jogos ao vivo nem exibir o pódio removido.
- Roteiro: abrir Ranking pela barra inferior; acessar Ver Ranking provisório quando disponível; conferir a classificação projetada e a separação dos pontos confirmados e provisórios; lembrar que a projeção acompanha a liga selecionada e pode mudar.
- Narração Antonio, legendas e toques destacados; abertura e encerramento Entrada em campo.
- Material local: `C:/Users/user/Documents/Codex/ranking-provisorio-atualizado-2026-10-20/ranking-provisorio-atualizado.mp4`.
- Duração medida da nova versão: 32,8 segundos, incluindo vinhetas. H.264 Main 3.1, 20 fps, yuv420p, AAC e faststart; decodificação integral e revisão dos quadros aprovadas. Sem novo teste físico em iPhone.
- Estado: aprovado e publicado na Central, na seção Ranking, commit `8617f17`. Divulgação aos grupos não programada.
- A versão antiga é preservada como material de trabalho. A seção Ranking passou a ter o tutorial narrado, com capa e indicação de 33 segundos no catálogo.

### Tutoriais de instalação — itens 16 e 17

Ambos foram aprovados e publicados no commit `d3d9f42`, com narração Antonio, imagens reais do bolão e menus ilustrados dos navegadores. As opções podem variar por sistema e versão; não prometer telas idênticas em todos os aparelhos. Os arquivos publicados são `central/instalar-android.mp4` e `central/instalar-iphone.mp4`. Envio aos grupos não programado.

### Publicação do item 07 confirmada

Após aprovação humana, o vídeo foi publicado na seção Ranking, no commit `8617f17`, deploy `6ad6d4fb7cf772d73b526d3e` com estado ready. O player aponta para `ranking.mp4?v=provisorio-1`. A publicação substitui o estado de revisão anterior. A tabela consolidada passa a registrar 14 temas publicados e três ainda não produzidos.

### Organização e navegação da Central — commit 7e469cb

Publicada a organização dos guias e dos vídeos na mesma sequência, em cinco grupos: Começar a jogar; Acompanhar a disputa; Seu clube; Explorar as partidas; No celular. A revisão incluiu Pontuação no menu, atalhos iniciais, busca com prioridade por tema e entradas para Google, regras e instalação nos dois sistemas. Foram corrigidos os guias ilustrados de Ranking e Meu Time e os alvos dos recortes. Os vídeos e as regras do app foram preservados. A publicação desta revisão não representa envio de conteúdo aos grupos.

### Resumo atual do controle

- 17 temas registrados.
- 14 temas com vídeos publicados: 12 tutoriais no catálogo e duas apresentações recolhíveis da Central.
- Sete revisões aprovadas e publicadas em 28/10/2026; nenhum vídeo produzido aguardando publicação.
- Dois temas ainda não produzidos: 10 — Seletor de rodadas; 11 — Jogos reagendados. Continuam em A revisar. O tema 02 — Visão Geral foi dispensado como tutorial próprio pelo usuário.
- Divulgação aos grupos não programada: não há confirmação de envio registrada neste controle.

## Atualização publicada — 28/10/2026, app v6.55.0

As sete novas versões abaixo foram aprovadas e publicadas na Central no commit `42b176a`, substituindo as versões anteriores dos mesmos temas. O histórico anterior permanece registrado nas fichas.

| Vídeo | Duração medida | Mudança |
| --- | --- | --- |
| notificacoes | 44,82 s | Lembretes automáticos de 12h e 2h, resumo pessoal, ativação por aparelho e orientação para iPhone. |
| meu-time | 31,13 s | Capturas atuais de expansão, Últimos jogos e desempenho pessoal. |
| campanha | 33,92 s | Entrada atual pela Home, seletor com escudos, troca e retorno ao favorito, rolagem até pontos e acumulado. |
| destaques | 45,82 s | Sua rodada anterior, destinos dos três cards e novo local do botão de Destaques. |
| ranking | 34,82 s | Disponibilidade após o início e até a consolidação, inclusive entre partidas; exemplo real anterior identificado. |
| apresentacao-app | 59,50 s | Cenas atuais da Home, Meu Time e Central; áudio original preservado. |
| apresentacao-central | 32,40 s | Navegação atual, grupos de assuntos, busca e guia visual; áudio original preservado. |

- Voz Antônio e vinhetas Entrada em campo preservadas. Exportação H.264 Main 3.1, 20 fps, yuv420p, AAC e faststart; decodificação integral dos sete arquivos aprovada. Áudio das duas apresentações preservado sem recodificação, conferido por hash da trilha AAC.
- Reprodução iniciada sem erro nos sete arquivos no Chrome, com avanço do tempo e vídeo 720 × 1280. Não houve novo teste físico em iPhone.
- Guias, FAQs, legendas de onde tocar, imagens, capas, durações e referências de cache da Central revisados. Diferença entre setas de posição na Home e da média nas Estatísticas explicada.
- Preservados os tutoriais sem mudança funcional: Palpites, Ligas, Estatísticas, Disputas Paralelas, Escalações e instalação.
- Publicação confirmada na [Central do Participante](https://bolaorigazzo2026.netlify.app/central/) em 28/10/2026, às 14h20 (Brasília): deploy `6ae22ec3216c7a7350dc1944`, contexto production e estado ready, associado ao commit `42b176a68a217f06972500bc4de44f16c3095c10`.
- Os sete MP4 em produção retornaram HTTP 200 e SHA-256 idêntico ao dos arquivos aprovados. HTML, JavaScript, catálogo e guias coincidem com o commit publicado. Reprodução parcial conferida com HTTP 206.
- Divulgação via WhatsApp permanece não programada; a publicação não representa envio aos grupos. O app, banco e disparos não foram alterados.
