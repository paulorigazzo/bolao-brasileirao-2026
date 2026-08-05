# Bolão Brasileirão Rigazzo

## Finalidade

Este documento é a fonte principal para o planejamento do **Bolão Brasileirão Rigazzo**, novo produto destinado a operar múltiplas temporadas e ligas sem alterar o Bolão Brasileirão 2026.

O Rigazzo será desenvolvido em repositório, Supabase, autenticação e Netlify próprios. O projeto atual permanece como aplicação oficial e fonte histórica de 2026. Esta documentação não cria o novo projeto nem autoriza código, banco, serviço externo, exportação ou importação.

## Decisão estratégica

| Bolão Brasileirão 2026 | Bolão Brasileirão Rigazzo |
| --- | --- |
| Produto oficial em operação | Novo produto em preparação |
| Uma temporada e um bolão | Múltiplas temporadas e ligas |
| Repositório e serviços atuais | Repositório e serviços independentes |
| Fonte oficial dos dados de 2026 | Consumidor de snapshots aprovados |
| Manutenção e correções próprias | Desenvolvimento estrutural isolado |

Não haverá merge automático entre os repositórios. Componentes comprovados poderão ser reutilizados por cópia seletiva e revisão, sem carregar credenciais, configurações, dependências fixas de 2026 ou pressupostos de bolão único.

## Modelo conceitual

```text
Bolão Brasileirão Rigazzo
├── Temporadas
│   ├── Temporada 2026 — histórico importado, se aprovado
│   ├── Temporada 2027 — primeira candidata operacional
│   └── Temporadas futuras
├── Ligas
│   ├── Liga Principal
│   └── Ligas independentes
├── Partidas e resultados por temporada
├── Participantes e administradores por liga
├── Palpites por liga, participante e partida
└── Rankings e experiências por liga
```

- **Produto:** Bolão Brasileirão Rigazzo.
- **Temporada:** edição anual do campeonato.
- **Liga:** grupo competitivo com membros e administração próprios.
- **Participante:** conta global que pode integrar várias ligas.
- **Administrador da plataforma:** responsável pelo produto.
- **Administrador da liga:** responsável somente pelas ligas autorizadas.

## Princípios obrigatórios

1. O Bolão 2026 não receberá estruturas experimentais do Rigazzo.
2. Nenhum componente do Rigazzo terá permissão de escrita no projeto atual.
3. Repositório, Supabase, autenticação, Netlify e credenciais serão separados.
4. A transferência de dados será manual, unidirecional e baseada em arquivos.
5. Não haverá sincronização automática, escrita dupla, trigger, webhook ou conexão SQL entre os projetos.
6. O Rigazzo começará com dados sintéticos.
7. Dados reais só serão transferidos depois da homologação do importador.
8. Participantes identificados dependerão de consentimento registrado.
9. Contas, sessões e tokens do Supabase Auth nunca serão copiados.
10. Qualquer mudança futura no projeto oficial exigirá plano e aprovação próprios de risco alto.

## Ambientes

| Ambiente | Finalidade | Dados | Serviços |
| --- | --- | --- | --- |
| Bolão 2026 | Produção atual | Reais | Serviços atuais |
| Rigazzo local | Desenvolvimento inicial | Sintéticos | Execução local |
| Rigazzo laboratório | Banco, importação e segurança | Sintéticos e snapshots aprovados | Supabase separado |
| Rigazzo staging | Piloto privado | Participantes consentidos | Supabase e Netlify separados |
| Rigazzo produção | Temporada futura | Reais | Criado somente após homologação |

O Netlify do Rigazzo não será criado na fundação inicial. Banco, importação e barreiras de segurança devem ser comprovados antes de qualquer staging remoto.

## Barreiras de isolamento

O novo projeto deve falhar quando detectar:

- endereço ou referência do Supabase oficial de 2026;
- identificação do site Netlify oficial;
- domínio oficial de 2026;
- credenciais ou arquivos de ambiente copiados;
- configuração marcada como produção;
- funções agendadas habilitadas antes de aprovação específica.

O exportador conhecerá somente a origem e gerará arquivos locais. O importador conhecerá somente o destino e consumirá arquivos aprovados. Nenhum executável terá credenciais de escrita nos dois projetos.

## Responsabilidade e handoff entre projetos

| Trabalho | Fonte responsável |
| --- | --- |
| R00, R00.1 e R01A | Bolão Brasileirão 2026 |
| R01B, R02, R04, R05, R07, R08, R09, R10, R10.1 e R11 | Bolão Brasileirão Rigazzo |
| R03 — inventário da origem | Bolão Brasileirão 2026 |
| R06 e R09.1 — exportação | Bolão Brasileirão 2026 |
| Contrato de Snapshot | Fonte canônica no Rigazzo; implementação compatível no Bolão 2026 |
| Equivalência | Exportação evidenciada no Bolão 2026 e importação evidenciada no Rigazzo |
| Consentimento de exportação | Bolão Brasileirão 2026 |
| Participação, novo Auth e associação de histórico | Bolão Brasileirão Rigazzo |
| Revogação | Decisão coordenada e registrada nos dois produtos, sem conexão automática |

A R01A será executada nesta tarefa porque o novo workspace ainda não existe. Ela poderá criar somente o repositório privado, instalar a documentação inicial e comprovar a ausência de segredos ou vínculos externos. Depois disso, o desenvolvimento do Rigazzo continuará em nova tarefa associada ao novo workspace.

Até a conclusão da R01A, este documento é a fonte oficial do planejamento. Durante o handoff, ele será transferido ao novo repositório. A partir da aceitação da R01A:

- o repositório Rigazzo passa a ser a fonte oficial do novo produto;
- este projeto mantém apenas a decisão histórica, o link para a fonte nova e os contratos necessários ao exportador;
- o Contrato de Snapshot usa versão explícita e não pode ser alterado silenciosamente em duas cópias;
- mudanças que afetem os dois lados exigem entregas e aprovações independentes em cada projeto.

## Transferência de dados

### Meio de transporte

SQL será usado somente dentro de cada ambiente:

```text
Supabase 2026
   │ consultas somente leitura
   ▼
Pacote versionado e imutável
   │ transferência manual
   ▼
Rigazzo
   │ validação e transação
   ▼
Supabase Rigazzo
```

Não haverá conexão SQL direta entre os bancos. O pacote não conterá SQL arbitrário, credenciais ou instruções capazes de escolher o banco de destino.

### Formato proposto

```text
temporada-2026-rodada-12-r1.rigazzo-snapshot
├── manifest.json
├── dados/
│   ├── clubes.json
│   ├── partidas.json
│   ├── resultados.json
│   ├── participantes.json
│   ├── palpites.json
│   ├── pontuacao.json
│   └── ranking.json
├── identidades.enc
├── checksums.json
└── assinatura.sig
```

O manifest deve registrar formato, temporada, rodada, revisão, estado, horário de corte, versão da origem, contagens, pacote anterior e algoritmo de integridade.

### Tipos de pacote

- snapshot-base da temporada;
- atualização de identidades consentidas;
- pacote incremental de rodada;
- revisão de rodada;
- revogação ou anonimização;
- snapshot final da temporada.

### Estados de rodada

- `provisorio`: ainda existem partidas normais em andamento ou pendentes;
- `parcial`: partidas realizadas encerradas, com adiamentos ainda abertos;
- `consolidado`: todas as partidas pontuáveis foram oficialmente resolvidas.

Palpites futuros, ao vivo ou ainda sigilosos nunca serão exportados. Uma nova informação gera outra revisão; pacotes anteriores não são sobrescritos.

## Identidade e consentimento

Para participantes consentidos, poderão ser preservados:

- nome de exibição;
- time favorito;
- e-mail normalizado;
- telefone normalizado;
- palpites, pontos, ranking e estatísticas;
- data e versão do consentimento.

E-mail, telefone e consentimento ficarão em `identidades.enc`, separados dos dados competitivos, fora do Git e inacessíveis ao frontend. O e-mail confirmado pelo novo provedor de autenticação poderá sugerir a associação; o participante confirma o histórico e exceções exigem decisão administrativa registrada.

O telefone não será usado como autenticação e poderá ser confirmado, alterado ou removido. Não haverá envio automático de mensagens.

Participantes sem consentimento terão e-mail e telefone excluídos e identidade pseudonimizada. Seus dados competitivos poderão permanecer anonimamente quando necessários para preservar ranking e equivalência.

## Importação e equivalência

O importador deve:

1. validar manifest, versão, sequência, assinatura e checksums;
2. rejeitar referências de produção e pacotes incompatíveis;
3. validar relações e contagens;
4. detectar pacote já importado;
5. simular a operação antes da confirmação;
6. importar em transação e ser idempotente;
7. reverter integralmente diante de falha;
8. recalcular ranking e estatísticas;
9. emitir relatório de equivalência.

A equivalência deve comparar, na menor unidade aplicável:

- partidas e estados;
- palpites por participante e partida;
- pontos por palpite e rodada;
- placares exatos;
- totais, posições e desempates;
- adiamentos, cancelamentos e rodadas parciais;
- ranking histórico e indicadores dependentes da liga.

Divergências serão classificadas como esperadas, erro de exportação, erro de importação, erro do novo cálculo ou inconsistência histórica. Divergência indevida impede a homologação.

## Experiência administrativa futura

### Exportar rodada no Bolão 2026

O botão futuro será considerado somente após a homologação do exportador local. O fluxo deverá:

1. exigir administrador autenticado e autorizado;
2. permitir escolher temporada, rodada e revisão;
3. mostrar estado e contagens antes da confirmação;
4. recusar dados ainda sigilosos;
5. gerar o pacote no servidor, nunca diretamente no navegador;
6. criptografar identidades e assinar o conteúdo;
7. disponibilizar download temporário;
8. registrar a operação e expirar o artefato no servidor.

### Importar pacote no Rigazzo

O botão futuro será considerado somente após a homologação do importador local. O fluxo deverá:

1. receber o pacote em quarentena;
2. verificar integridade, origem, versão e sequência;
3. executar simulação;
4. apresentar contagens, ações e divergências;
5. exigir confirmação administrativa;
6. importar em transação;
7. recalcular resultados;
8. apresentar relatório de equivalência.

Os botões não fazem parte da R00 nem da R00.1 e exigirão entregas próprias de risco alto.

## Programa de entregas

### R00 — Formalização estratégica

Registrar a independência do produto, a arquitetura, o transporte por arquivos, a política de identidade e os portões das fases seguintes, sem criar serviços ou código funcional.

### R01A — Bootstrap do Rigazzo

Criar, a partir da tarefa do Bolão 2026, somente o repositório privado e a documentação inicial do Rigazzo. Não criar Supabase, Netlify, autenticação, código funcional ou dados reais.

### R01B — Fundação local isolada

Abrir uma nova tarefa associada ao workspace Rigazzo e instalar sua governança, execução local, fixtures sintéticas e bloqueios contra referências de produção.

### R02 — Modelo de Temporadas e Ligas

Implementar e testar no Supabase isolado as entidades, índices, permissões, auditoria e RLS, sem dados reais.

### R03 — Inventário somente leitura de 2026

Documentar no projeto de origem esquema, relações, funções, políticas, fontes e campos necessários, mediante autorização própria e sem alterar produção.

### R04 — Contrato de Snapshot 2026 v1

Formalizar no Rigazzo formatos, revisões, integridade, consentimento, compatibilidade e critérios de rejeição, usando o inventário da origem e exemplos sintéticos.

### R05 — Importador sintético

Construir no Rigazzo o importador local, com simulação, idempotência, transação, rollback e equivalência, antes de implementar o exportador real.

### R06 — Exportador somente leitura

Criar ferramenta local e manual que gere pacotes sem conhecer o Rigazzo e sem modificar o projeto atual.

### R07 — Identidades e consentimento

Implementar o cofre de identidades, a pseudonimização e a associação segura ao novo Auth no Rigazzo. A origem controla separadamente o consentimento para exportar nome, e-mail e telefone; exceções e revogações exigem registro nos dois produtos.

### R08 — Snapshot-base real

Importar uma fotografia aprovada de 2026 e comprovar equivalência antes de aceitar atualizações.

### R09 — Pacotes incrementais por rodada

Validar pacotes provisórios, parciais, consolidados e revisões decorrentes de jogos adiados.

### R09.1 — Exportação administrativa

Depois da homologação do exportador, do snapshot-base e dos pacotes incrementais reais, avaliar e implementar o botão **Exportar rodada** na Área ADM do Bolão 2026.

### R10 — Piloto privado

Convidar participantes consentidos, associar identidades e validar autenticação, experiência e isolamento entre ligas.

### R10.1 — Importação administrativa

Depois da homologação do importador e do piloto, avaliar e implementar o botão **Importar pacote** na Área ADM do Rigazzo.

### R11 — Preparação de 2027

Criar a primeira temporada operacional nativa, sujeita a outro plano e aprovação de risco alto antes de ativação pública.

## Portões gerais

Cada fase exige plano próprio. Não avançar quando houver:

- referência ou credencial de produção no Rigazzo;
- escrita ou mudança no Bolão 2026 fora de entrega específica;
- acesso cruzado entre ligas;
- importação parcial;
- quebra de idempotência;
- divergência indevida;
- exposição de identidade sem consentimento;
- palpite sigiloso no pacote;
- ausência de rollback, auditoria ou evidência exigida.

## Fora do escopo inicial

- alteração funcional do Bolão 2026;
- sincronização automática entre produtos;
- conexão SQL direta;
- escrita dupla;
- cópia de Supabase Auth, sessões ou tokens;
- deploy público do Rigazzo;
- migração obrigatória de 2026;
- descontinuação do projeto atual;
- regras de pontuação personalizadas por liga;
- criação dos botões de exportação e importação durante a R00 ou a R00.1.

## Versionamento deste planejamento

Esta direção substitui o plano de evolução estrutural dentro do mesmo projeto descrito anteriormente em [`TEMPORADAS_E_BOLOES.md`](TEMPORADAS_E_BOLOES.md). O documento anterior permanece como registro histórico da alternativa avaliada.

A R00 e a R00.1 não representam entregas funcionais e não alteram a versão do Bolão Brasileirão 2026.
