# Ligas com palpites compartilhados

## Status

Direção arquitetural aprovada em 4 de setembro de 2026 para evolução incremental
do Bolão Brasileirão 2026. Este documento define o contrato conceitual, mas não
autoriza por si só alterações em código, banco, Supabase, Netlify ou produção.

## Objetivo

Evoluir o aplicativo atual para múltiplas ligas, começando por uma Liga Standard
chamada **Brasileirão 2026**, formada pelos participantes e pelos dados atuais.

Cada participante mantém um único palpite por partida. Esse palpite é
compartilhado por todas as ligas das quais a pessoa participa. Cada liga define
apenas seus membros, seus responsáveis e o recorte do ranking.

## Decisão central

```text
Temporada
├── Partidas e resultados compartilhados
├── Palpites únicos por participante e partida
└── Ligas
    ├── Liga Standard "Brasileirão 2026"
    └── Ligas futuras
        ├── membros próprios
        └── ranking próprio
```

O palpite pertence ao participante e à partida, não à liga. A classificação de
uma liga é uma projeção dos palpites existentes feita sobre seus membros ativos.

Consequentemente:

- participar de duas ligas não cria dois palpites para a mesma partida;
- trocar a liga ativa não altera o conteúdo mostrado ou salvo na Tela de Jogos;
- adicionar uma pessoa a uma liga inclui retroativamente seus palpites válidos
  da temporada no ranking daquela liga;
- remover ou inativar a associação retira a pessoa do ranking corrente da liga,
  sem excluir perfil, autorização, palpites ou histórico competitivo;
- pontos por liga não são uma segunda fonte de verdade persistida.

## Propriedade dos dados

| Dado | Escopo | Diretriz |
| --- | --- | --- |
| Conta e perfil | Global | Uma identidade pode integrar várias ligas |
| Autorização do aplicativo | Global | Não substitui a associação a uma liga |
| Temporada | Competição anual | Delimita partidas, resultados e palpites válidos |
| Partidas e resultados | Temporada | Compartilhados por todas as ligas |
| Palpite | Participante e partida | Único e compartilhado entre ligas |
| Liga | Temporada | Grupo competitivo com identidade e estado próprios |
| Associação de membro | Liga e participante | Define participação e função local |
| Ranking | Liga e temporada | Derivado dos membros, palpites e resultados |

## Fundação aditiva

A primeira fundação funcional deverá adicionar, no mínimo, as entidades
`temporadas`, `ligas` e `liga_membros`, ou nomes equivalentes aprovados no plano
de banco. A representação de partidas por temporada poderá usar uma associação
aditiva enquanto a tabela atual de jogos permanecer preservada.

A fundação inicial deve:

1. cadastrar a temporada de 2026 de forma idempotente;
2. cadastrar a Liga Standard **Brasileirão 2026** de forma idempotente;
3. associar todos os participantes atuais ativos e aprovados à Liga Standard;
4. preservar integralmente `palpites`, `participantes`,
   `participantes_autorizados`, `jogos` e as estruturas privadas de recuperação;
5. manter a aplicação usando as leituras atuais até a equivalência ser
   comprovada e a ativação receber aprovação própria.

Na etapa de fundação não serão permitidos `ALTER TABLE`, triggers, cópias ou
reescritas de dados nas tabelas centrais citadas acima. Uma necessidade futura
de alteração nelas exige novo plano, justificativa e aprovação explícita.

## Liga Standard

A Liga Standard é a representação compatível do grupo único existente antes da
introdução das ligas. Sua carga inicial deve ser reconciliada por `user_id`, que
é a identidade competitiva canônica. Nome e e-mail não devem substituir essa
chave.

O primeiro portão de equivalência exige que a Liga Standard reproduza o estado
atual, por participante e por rodada, incluindo:

- quantidade de participantes;
- quantidade de palpites;
- pontos totais;
- placares exatos;
- palpites avaliados;
- posição e critérios de desempate;
- ranking provisório;
- partidas adiadas, suspensas e canceladas.

Nenhuma divergência indevida permite ativar a leitura por liga.

## Adesão retroativa

O instante de entrada deve ser registrado para auditoria, mas não funciona como
corte de pontuação. Ao entrar em uma liga, o participante passa a integrar o
ranking com todos os seus palpites válidos na temporada, inclusive os feitos
antes da associação.

A adesão cria somente `liga_membros`. Ela não copia palpites, não grava saldo de
pontos e não altera registros competitivos anteriores. Uma eventual modalidade
"pontuar desde a entrada" fica fora deste escopo.

## Segurança e privacidade

- novas tabelas expostas devem usar proteção por linha;
- autenticação sem associação ativa não concede acesso competitivo à liga;
- a autorização deve validar a associação no banco, não confiar apenas no
  identificador de liga enviado pela interface;
- administração da plataforma e administração da liga são papéis distintos;
- administradores de liga só podem atuar nas ligas autorizadas;
- palpites encerrados de outra pessoa só podem ser consultados quando houver
  uma liga compartilhada e as demais regras de revelação forem satisfeitas;
- usuários sem liga comum não podem consultar perfis ou dados competitivos uns
  dos outros por interfaces destinadas à liga;
- views devem respeitar as permissões do chamador;
- funções privilegiadas, quando indispensáveis, devem ter escopo mínimo,
  validação interna e permissões explícitas.

As políticas existentes não serão substituídas durante a fundação paralela. A
mudança de autorização e das consultas será uma entrega posterior, com testes
positivos e negativos próprios.

## Etapas de evolução

### L01 — Contrato arquitetural

Formalizar esta direção, preservar os planos anteriores como histórico e
registrar a decisão. Não há alteração funcional.

### L02 — Fundação paralela

Criar estruturas aditivas, a temporada de 2026, a Liga Standard e suas
associações. Manter todas as leituras oficiais no modelo atual.

### L03 — Segurança e consultas

Implementar políticas e consultas contextualizadas para membros, palpites
encerrados, contagens, ranking oficial e ranking provisório.

### L04 — Equivalência da Liga Standard

Comparar o modelo atual e o novo na menor unidade aplicável. Testar também
isolamento com ligas sintéticas e a entrada retroativa de membros.

### L05 — Contexto de liga na interface

Introduzir liga ativa em Home, Ranking, Estatísticas, destaques, duelos e Área
ADM. A Tela de Jogos continua usando o palpite compartilhado, sem duplicação.

### L06 — Gestão de membros

Permitir gestão auditável de associações e funções locais. Convites públicos e
fluxos comerciais permanecem fora do escopo inicial.

### L07 — Ativação controlada

Tornar a Liga Standard a leitura oficial somente após equivalência, segurança,
retorno e validação funcional comprovados. Preservar temporariamente o caminho
anterior; remover o legado exige decisão própria.

## Retorno e interrupção

Enquanto a nova camada estiver em validação, o retorno consiste em desativar as
leituras por liga e continuar usando o modelo global existente. As novas
estruturas podem permanecer isoladas para diagnóstico; o retorno não depende da
exclusão de dados.

Interromper o avanço diante de:

- alteração inesperada em tabela central;
- diferença indevida entre o ranking atual e a Liga Standard;
- acesso entre ligas sem associação válida;
- duplicação ou perda de palpite;
- mudança nas regras de fechamento ou pontuação;
- ausência de teste de retorno;
- necessidade de ampliar o escopo aprovado.

## Fora do escopo inicial

- palpites diferentes por liga;
- regras de pontuação personalizadas;
- campeonatos diferentes do Brasileirão;
- cobrança, planos comerciais ou ligas públicas;
- cópia ou migração de contas do Supabase Auth;
- novo Supabase ou novo Netlify;
- alteração da fonte esportiva;
- descontinuação imediata do modelo atual;
- retomada do programa de transferência entre o Bolão 2026 e o Rigazzo.

## Relação com o Rigazzo

Esta direção substitui o Rigazzo como destino exclusivo da evolução para ligas.
O repositório e seus documentos permanecem preservados como histórico e possível
laboratório, mas não são dependência da implementação incremental neste produto.
Não haverá sincronização, importação ou escrita cruzada entre os projetos dentro
deste programa.
