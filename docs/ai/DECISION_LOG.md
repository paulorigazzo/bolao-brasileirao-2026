# Registro de decisões de engenharia e governança

## Finalidade

Este documento registra decisões duradouras sobre desenvolvimento assistido por IA, engenharia e governança do repositório.

Decisões de produto continuam em `docs/PRODUCT_LOG.md`. Mudanças de versão continuam em `CHANGELOG.md` e `docs/releases/`.

## Quando registrar

Registrar uma decisão quando ela:

- orientar tarefas futuras;
- definir ou alterar um processo;
- estabelecer uma fonte da verdade;
- aceitar um compromisso técnico relevante;
- proteger uma regra, área sensível ou limite operacional;
- substituir uma decisão anterior.

Não registrar detalhes temporários de implementação, anotações de sessão ou informações já mantidas por outra fonte oficial.

## Formato

```markdown
## DEC-AAAA-NNN — Título

- Data: AAAA-MM-DD
- Status: proposta | aceita | substituída | revogada
- Responsáveis: pessoa ou papel
- Substitui: identificador ou “não se aplica”
- Impacto: baixo | médio | alto (opcional)

### Contexto

Problema, restrições e alternativas relevantes.

### Decisão

Escolha adotada.

### Consequências

Benefícios, custos, riscos e ações decorrentes.
```

Decisões não devem ser reescritas para esconder o histórico. Quando uma escolha mudar, adicionar nova decisão e marcar a anterior como substituída ou revogada.

## Decisões

## DEC-2026-001 — Governança documental v2.0

- Data: 2026-07-29
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: orientações operacionais dispersas anteriores

### Contexto

As regras para agentes estavam distribuídas entre `AGENTS.md`, documentos auxiliares e histórico de conversas. Havia risco de duplicação, prioridades desatualizadas e autorização implícita entre etapas do fluxo Git.

### Decisão

Adotar cinco documentos complementares:

- `AGENTS.md` como conjunto de regras obrigatórias do repositório;
- `docs/ai/CODEX_WORKFLOW.md` como procedimento operacional;
- `docs/ai/DEVELOPMENT_PRINCIPLES.md` como princípios permanentes;
- `docs/ai/CODEX_PROMPT.md` como modelo reutilizável de solicitação;
- `docs/ai/DECISION_LOG.md` como histórico de decisões de engenharia e governança.

Planos, edição, commit, push, Pull Request e merge passam a ser autorizações independentes. O merge permanece sempre sujeito à revisão humana.

### Consequências

- Responsabilidades documentais mais claras.
- Menor dependência de contexto de conversas.
- Maior rastreabilidade de decisões e aprovações.
- Necessidade de manter links entre os documentos e evitar conteúdo duplicado.
- Nenhuma alteração funcional, de banco, infraestrutura ou versão decorre desta decisão.

## DEC-2026-002 — Homologação H00 e consolidação do workflow

- Data: 2026-07-29
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: baixo

### Contexto

A governança documental v2.0 definida pela D01 foi homologada de ponta a ponta pela H00. A homologação confirmou a estrutura adotada e identificou oportunidades pontuais de precisão operacional, sem necessidade de mudanças estruturais ou funcionais.

### Decisão

Considerar a D01 oficialmente homologada pela H00 e consolidar no workflow:

- proposta e aprovação da branch antes de sua criação;
- revisão explícita do conteúdo integral de arquivos novos;
- contrato de saída para Planejamento, Implementação, Publicação, Recuperação e Encerramento;
- separação entre merge e limpeza de branches;
- remoção local e remota das branches integradas como padrão do Encerramento autorizado, salvo pedido explícito de preservação;
- leitura mínima obrigatória conforme o tipo de tarefa;
- cabeçalhos de fases no padrão `## Fase N — Nome da fase`;
- separação entre regras obrigatórias em `AGENTS.md` e detalhes operacionais em `docs/ai/CODEX_WORKFLOW.md`.

### Consequências

- A branch passa a ser proposta no plano e criada somente após aprovação.
- Arquivos novos deixam de depender apenas da visualização convencional do diff.
- Cada modo possui uma condição de saída verificável e não autoriza automaticamente o modo seguinte.
- A branch não é excluída durante o merge; depois do merge confirmado, a limpeza local e remota integra o Encerramento por padrão.
- O Encerramento exige aprovação explícita para começar, mas suas ações previamente aprovadas não exigem autorizações individuais adicionais.
- A leitura documental torna-se proporcional ao tipo e ao risco da tarefa.
- A consolidação não altera funcionalidades, regras de negócio, banco, infraestrutura ou versão do produto.

## DEC-2026-003 — Temporadas e Bolões como entidades distintas

- Data: 2026-08-04
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

O aplicativo opera atualmente como um único bolão associado ao Campeonato Brasileiro de 2026. A preparação de 2027 e a expansão para bolões independentes exigem preservar o histórico atual, evitar substituição destrutiva de dados e impedir que participantes acessem contextos aos quais não pertencem.

### Decisão

Adotar campeonato, temporada e bolão como entidades distintas. Jogos, resultados, clubes e classificação pertencem à temporada; membros, funções, convites e palpites pertencem ao bolão; contas e perfis permanecem globais; regras de fechamento e pontuação continuam centralizadas.

A transição será aditiva, paralela e reversível. O Bolão 2026 permanecerá como fonte oficial enquanto uma representação paralela servir para auditoria de equivalência. A Temporada 2027 será a primeira candidata a nascer integralmente na nova arquitetura. A especificação e os portões de avanço estão em [`../architecture/TEMPORADAS_E_BOLOES.md`](../architecture/TEMPORADAS_E_BOLOES.md).

### Consequências

- A preparação de 2027 não sobrescreverá o histórico de 2026.
- Bolões independentes poderão compartilhar jogos e resultados sem compartilhar membros ou palpites.
- Banco, políticas de acesso, sincronização e interface exigirão entregas próprias e aprovações específicas.
- A administração da plataforma será separada da administração de cada bolão.
- Nenhuma funcionalidade será exposta antes de equivalência, isolamento e retorno serem comprovados.
- Esta decisão documental não altera código, Supabase, Netlify, versão ou experiência atual.

## DEC-2026-004 — Workflow proporcional ao risco

- Data: 2026-08-04
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: médio

### Contexto

O workflow homologado pela H00 exige validação proporcional e evidência antes da conclusão, mas ainda não define níveis objetivos de risco nem relaciona formalmente cada critério de aceite à evidência que o comprova. O histórico de refinamentos visuais também demonstra a necessidade de selecionar cenários relevantes antes da implementação, sem transformar essa seleção em checklist universal.

### Decisão

Adotar três níveis de risco para implementações:

- baixo, restrito a documentação e mudanças comprovadamente não funcionais;
- médio, para código, interface e configuração ordinária;
- alto, obrigatório para áreas protegidas, dados, segurança, produção e mudanças estruturais.

Em risco médio ou alto, cada critério de aceite deve indicar sua evidência prevista e, na entrega, a evidência obtida e o resultado. Mudanças visuais devem selecionar somente os cenários aplicáveis ao componente.

Os portões independentes de plano, implementação, commit, push, Pull Request, merge e encerramento permanecem inalterados. A eficácia e a proporcionalidade deste modelo serão avaliadas pela homologação H01 antes de sua aplicação em trabalho sensível.

### Consequências

- Planos passam a declarar risco e, quando exigido, evidências por critério.
- Tarefas triviais permanecem livres de tabelas e cenários irrelevantes.
- Áreas sensíveis não podem receber validação de risco baixo ou médio.
- A revisão humana passa a comparar os critérios aprovados com evidências identificadas de forma consistente.
- A H01 poderá manter, ajustar ou substituir detalhes desta decisão sem alterar os portões de governança.
- Esta decisão não altera código, funcionalidade, versão, Supabase, Netlify ou prioridade do produto.

## DEC-2026-005 — Resultado da homologação H01

- Data: 2026-08-04
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: médio

### Contexto

A DEC-2026-004 condicionou o uso do workflow proporcional em trabalho sensível à homologação H01. A H01 reexecutou documentalmente três entregas reais: D03 como risco baixo, v6.11.1 como risco médio visual e v6.8.0 como risco alto.

Os casos baixo e alto confirmaram pisos de validação claros e proporcionais. O caso médio revelou que uma sincronização de versão em `netlify/functions/_constants.mjs`, sem mudança de comportamento, pode ser interpretada literalmente como gatilho de risco alto apenas pelo caminho do arquivo.

### Decisão

Classificar a H01 como **ajuste necessário**. A D03 demonstra valor, mas não está homologada para trabalho sensível até que uma D03.1 esclareça que gatilhos altos decorrem de impacto funcional ou operacional na área protegida, e não apenas de documentação, referência, metadado, identificador de versão ou localização do arquivo.

O maior risco continua prevalecendo quando houver mudança funcional sensível ou dúvida real sobre o impacto. A fundamentação completa está em [`WORKFLOW_H01.md`](WORKFLOW_H01.md).

### Consequências

- Temporadas e Bolões e demais trabalhos sensíveis permanecem bloqueados para implementação pelo novo modelo até a D03.1.
- A D03.1 deve ser documental e restrita à semântica dos gatilhos, sem alterar os pisos de validação ou portões Git.
- Depois da D03.1, o caso médio deve ser reaplicado e o caso alto deve permanecer inequivocamente alto.
- Evidências históricas indisponíveis não foram presumidas nem tratadas como falha funcional das entregas analisadas.
- Esta homologação não altera código, funcionalidade, versão, Supabase, Netlify ou prioridade do produto.

## DEC-2026-006 — Clarificação dos gatilhos de risco alto

- Data: 2026-08-04
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: médio

### Contexto

A H01 classificou a D03 como ajuste necessário porque a lista de gatilhos podia elevar uma entrega apenas pela localização do arquivo. Na v6.11.1, uma alteração visual de risco médio também sincronizou `APP_VERSION` em `netlify/functions/_constants.mjs`, sem mudar o comportamento da Function.

### Decisão

Classificar o risco pelo comportamento funcional ou operacional efetivamente alterado. Documentação, referências, metadados, identificadores ou sincronização de versão e a mera localização do arquivo não elevam o risco por si só.

Alterações mistas adotam o maior risco funcional ou operacional presente no diff. Mudanças reais em áreas protegidas continuam obrigatoriamente altas, e a dúvida real sobre o impacto continua sendo resolvida pelo maior nível.

A reaplicação dos casos da H01 confirmou:

- v6.11.1 como risco médio, pois a Function recebeu somente um identificador de versão e o comportamento alterado foi visual;
- v6.8.0 como risco alto, pois modificou autenticação, dados pessoais, RPCs e migração.

Com esse esclarecimento, considerar homologado o workflow proporcional composto pela D03 e pela D03.1.

### Consequências

- Tarefas não são superdimensionadas apenas pelo caminho de um arquivo ou por metadados sincronizados.
- Mudanças funcionais em Supabase, banco, RLS, autenticação, dados, Functions, produção e demais áreas protegidas permanecem risco alto.
- Pisos de validação e portões Git permanecem inalterados.
- A homologação do workflow não autoriza nenhuma implementação sensível específica; cada tarefa ainda exige plano, critérios, evidências e aprovações próprias.
- Esta decisão não altera código, funcionalidade, versão, Supabase, Netlify ou prioridade do produto.

## DEC-2026-007 — Automação mínima dos contratos documentais

- Data: 2026-08-04
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: médio

### Contexto

A D02, a D03 e a homologação H01 consolidaram fontes oficiais, validação proporcional e evidências rastreáveis. Permaneceram manuais duas verificações mecânicas: a consistência da versão operacional atual entre fontes selecionadas e a existência dos destinos de referências Markdown locais.

### Decisão

Integrar ao `npm run check` um verificador local, determinístico, sem rede e somente leitura para:

- comparar a versão canônica de `VERSION.md` com `package.json`, `js/app.js`, `netlify/functions/_constants.mjs`, `README.md`, `ROADMAP.md` e `index.html`;
- verificar a existência de destinos Markdown locais, ignorando URLs, e-mails, âncoras internas e exemplos em blocos de código.

Versões históricas legítimas não são tratadas como fontes da versão atual. O verificador informa arquivo e divergência, mas não altera conteúdo automaticamente.

### Consequências

- Divergências mecânicas passam a falhar localmente e no pipeline já existente.
- Releases, changelog e demais referências históricas preservam suas versões próprias.
- Links externos não dependem de disponibilidade de rede.
- Validações interpretativas permanecem fora do bloqueio automatizado.
- Esta decisão não altera funcionalidade, versão, Supabase, Netlify, regras de negócio ou prioridade do produto.

## DEC-2026-008 — Bolão Brasileirão Rigazzo como produto independente

- Data: 2026-08-05
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: DEC-2026-003 quanto à implementação estrutural dentro do projeto atual
- Impacto: alto

### Contexto

A arquitetura anterior previa criar uma fundação aditiva de temporadas e bolões no mesmo Supabase do Bolão 2026. Embora preservasse as leituras e gravações legadas durante a validação, qualquer migração, política ou função experimental ainda compartilharia o ambiente oficial. A prioridade humana é impedir que a preparação da nova arquitetura afete a operação atual.

Também foi aprovada a utilização controlada dos dados reais de 2026 para equivalência e piloto, incluindo nome, e-mail e telefone de participantes consentidos, sem copiar contas, sessões ou tokens de autenticação.

### Decisão

Criar o **Bolão Brasileirão Rigazzo** como novo produto, com repositório, Supabase, autenticação e Netlify independentes. O Bolão Brasileirão 2026 permanece oficial e não receberá a fundação experimental.

A transferência ocorrerá somente por pacotes manuais, versionados, imutáveis, validados e unidirecionais. SQL será usado internamente para leitura na origem e transação no destino, sem conexão direta entre bancos. Dados competitivos ficarão separados de um cofre criptografado de identidades consentidas.

Exportador e importador serão homologados primeiro como ferramentas locais. Os futuros botões **Exportar rodada** no projeto atual e **Importar pacote** no Rigazzo exigirão entregas próprias de risco alto depois dessa homologação.

A arquitetura e o programa R00–R11 estão definidos em [`../architecture/BOLAO_BRASILEIRAO_RIGAZZO.md`](../architecture/BOLAO_BRASILEIRAO_RIGAZZO.md).

### Consequências

- O projeto atual não recebe tabelas, políticas, funções ou código experimental do Rigazzo.
- Nenhum processo possui permissão de escrita nos dois produtos.
- O Rigazzo começa com dados sintéticos e bloqueios contra referências de produção.
- Snapshots reais dependem de importador homologado, consentimento e autorização específica.
- Participantes não consentidos preservam equivalência somente de forma pseudonimizada.
- Contas e sessões Auth nunca são transferidas; a associação usa nova autenticação e confirmação.
- A Temporada 2027 é a primeira candidata operacional nativa do Rigazzo.
- A eventual importação histórica de 2026 permanece opcional e reversível.
- Esta decisão documental não cria projeto externo, não exporta dados e não altera código, versão, Supabase ou Netlify.

## DEC-2026-009 — Handoff e responsabilidade entre os produtos

- Data: 2026-08-05
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

A R00 definiu o Rigazzo como produto independente, mas deixou implícito quem criaria o novo repositório, qual tarefa executaria cada fase e quando a fonte da verdade seria transferida. A sequência também posicionava o Contrato de Snapshot antes do inventário real da origem e o botão de exportação antes da homologação dos pacotes reais.

### Decisão

Dividir a fundação em R01A, executada a partir da tarefa do Bolão 2026 para criar somente o repositório e a documentação inicial, e R01B, executada em nova tarefa associada ao workspace Rigazzo.

O Bolão 2026 responde por inventário, consentimento de exportação, exportador e futura interface de exportação. O Rigazzo responde por modelo novo, contrato canônico, importador, novo Auth, associação de histórico, piloto e 2027. Equivalência e revogação exigem evidências coordenadas, sem conexão automática.

O inventário da origem antecede o Contrato de Snapshot v1; o importador sintético permanece anterior ao exportador. A interface de exportação passa a R09.1, depois de snapshot-base e pacotes incrementais homologados.

Após a R01A, o novo repositório se torna a fonte oficial do Rigazzo. Este projeto preserva a decisão e somente os contratos necessários ao lado exportador.

### Consequências

- Elimina-se o problema circular entre criar o repositório e abrir a nova tarefa.
- Cada alteração ocorre no projeto que possui seus dados, credenciais e responsabilidades.
- O Contrato de Snapshot tem uma fonte canônica e versões explícitas.
- Consentimento de exportação não é confundido com autenticação ou participação no Rigazzo.
- R00, R00.1 e R01A ficam concluídas; R01B torna-se o próximo passo do Rigazzo em seu próprio workspace.
- A R01A criou somente o repositório privado e sua documentação inicial pelo PR [`paulorigazzo/bolao-brasileirao-rigazzo#1`](https://github.com/paulorigazzo/bolao-brasileirao-rigazzo/pull/1), sem serviço, exportação, importação ou alteração da versão funcional do Bolão 2026.

## DEC-2026-010 — Testes iniciais com dados competitivos pseudonimizados

- Data: 2026-08-06
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: parcialmente DEC-2026-008 e DEC-2026-009 quanto ao requisito de consentimento para os testes iniciais sem identidade direta
- Impacto: alto

### Contexto

O uso inicial dos dados de 2026 no Rigazzo tem finalidade privada, experimental e não comercial. Para evitar alterações no Bolão 2026 e reduzir a exposição de participantes, foi descartada neste momento a implementação de um mecanismo funcional de consentimento para transferência identificada.

### Decisão

Os testes iniciais poderão futuramente usar dados competitivos reais pseudonimizados, sem transportar nome, e-mail, telefone, `user_id`, identificadores Auth ou a correspondência entre referências opacas e pessoas reais. A ausência de identificadores diretos reduz o risco, mas não será descrita como anonimização absoluta.

A R07A e a R07B para identidade direta ficam adiadas. Antes da R06B, o Rigazzo deverá aprovar uma R04.1 com classificação própria para teste pseudonimizado e uma R05.1 compatível. Cada acesso ou transferência real continuará dependendo de plano e autorização específicos.

### Consequências

- o Bolão 2026 não recebe tela, tabela, migração ou fluxo de consentimento nesta etapa;
- dados pessoais diretos e identidades Auth permanecem fora dos snapshots de teste;
- o vínculo competitivo usa apenas referências opacas estáveis;
- a tabela de correspondência, se tecnicamente necessária na origem, não integra pacote, Git, logs ou Rigazzo;
- a decisão não autoriza exportação, acesso remoto, criação de credencial ou importação de dados reais;
- eventual piloto identificado exigirá retomar R07A e R07B em entregas independentes de risco alto.

## DEC-2026-011 — Simplificação estratégica do Rigazzo

- Data: 2026-08-06
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: DEC-2026-008, DEC-2026-009 e DEC-2026-010 quanto à sequência ativa de transferência, equivalência e importação de 2026
- Impacto: alto

### Contexto

O programa R00–R11 evoluiu para uma arquitetura de migração entre produtos independentes com snapshots versionados, pseudonimização, equivalência, cofre de identidades e múltiplos ambientes. Embora tecnicamente defensável, esse nível de engenharia, governança, manutenção e custo não é proporcional à finalidade caseira, familiar e não comercial do aplicativo.

A intenção original é criar, a partir do Bolão 2026 e em produto paralelo, uma evolução simples que preserve sua identidade e experiência visual e acrescente Temporadas e Ligas.

### Decisão

Redefinir o Rigazzo como evolução caseira e incremental do Bolão 2026. O novo produto continua isolado em repositório próprio, mas seu MVP começa localmente, com dados sintéticos, e fica restrito a perfis, temporadas, ligas, participantes, partidas, palpites e ranking.

Reutilizar seletivamente a identidade visual, o design system, os ativos, os componentes e as regras comprovadas do Bolão 2026, sem copiar automaticamente toda a lógica, infraestrutura, governança ou documentação acumulada.

Congelar por tempo indeterminado R04.1, R05.1 e R06B.2–R11. A R06B.1 não será integrada à `main`; o commit preparado permanecerá preservado somente na branch histórica `feature/r06b-read-only-pseudonymous-exporter`, disponível para referência ou reaproveitamento seletivo se uma necessidade futura justificar importação.

Manter o histórico de 2026 no aplicativo original. Supabase e Netlify próprios para o Rigazzo serão considerados apenas depois da validação local e dependerão de aprovação específica de escopo e custo. Serviços pagos não são presumidos.

### Consequências

- o Bolão 2026 permanece estável, independente e recebe somente manutenção necessária;
- R06A e contratos já integrados permanecem como histórico, mas deixam de ser dependências do MVP;
- não haverá acesso real, credencial, exportação, importação, cofre de identidades, equivalência automatizada ou botões de transferência no escopo inicial;
- o Rigazzo nasce visualmente familiar, mas com modelo funcional mínimo e código reaproveitado seletivamente;
- estatísticas, calendário, Meu Time, destaques e duelo serão avaliados individualmente após o primeiro uso;
- a criação de infraestrutura remota depende de validação local, segurança proporcional e teto de custo aprovado;
- eventual retomada do histórico de 2026 exigirá necessidade demonstrada e novo plano, preferindo importação única e simples;
- esta decisão é documental e não altera código, versão, Supabase, Netlify, dados ou funcionalidades.

## DEC-2026-012 — Recuperação competitiva mínima no Bolão 2026

- Data: 2026-08-06
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

Uma regressão da fonte esportiva apagou temporariamente oito resultados encerrados e alterou o Ranking. Os placares puderam ser confirmados online, mas os palpites originais não são recuperáveis externamente. Para um projeto familiar, quarentena, múltiplas fontes automáticas e uma interface ampla de auditoria seriam desproporcionais.

### Decisão

Adicionar ao Bolão 2026 uma camada interna e mínima de recuperação competitiva. Na primeira finalização válida de cada jogo, preservar em schema privado sua identificação, placar final, fonte e os palpites relacionados. Registrar alterações posteriores de status ou placar sem bloquear a sincronização.

Criar um baseline na implantação e checkpoints de pontos, exatos e posições quando uma rodada ficar integralmente encerrada. Pontos e Ranking continuam derivados pelas regras existentes; checkpoints são evidência de conferência, não nova fonte canônica.

Os snapshots são imutáveis para o fluxo normal, não ficam expostos pela aplicação e não incluem e-mail, celular, sessões, tokens ou conteúdo do Auth. A recuperação será sempre manual, transacional e condicionada a precondições explícitas.

### Consequências

- resultados e palpites necessários para reconstrução permanecem disponíveis no próprio projeto;
- consultas esportivas externas tornam-se confirmação independente, não dependência obrigatória;
- a sincronização continua automática e sem quarentena;
- não há tela administrativa, segunda fonte automática ou restauração automática;
- a camada não substitui backups contra perda integral do projeto Supabase;
- snapshots de recuperação do Bolão 2026 não integram nem reativam o programa de transferência para o Rigazzo;
- schema, triggers, dados competitivos e produção tornam a entrega obrigatoriamente de risco alto.

## DEC-2026-013 — Prazo canônico de fechamento dos palpites

- Data: 2026-08-10
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: declarações documentais que indicavam fechamento no horário da partida
- Impacto: alto

### Contexto

O cliente usa `lockMinutesBefore: 30`, a Tela de Regras informa o fechamento 30 minutos antes e o inventário do Supabase confirma que `palpite_no_prazo` e `validar_palpite` aplicam o corte em `inicio - 30 minutos`. Entretanto, fontes oficiais vivas ainda descreviam o fechamento como ocorrendo no horário da partida.

Essa divergência não alterava o comportamento em produção, mas tornava ambígua uma regra competitiva protegida e poderia orientar incorretamente uma manutenção futura.

### Decisão

Formalizar como regra canônica do Bolão Brasileirão 2026 que cada palpite fecha 30 minutos antes do horário de início da respectiva partida.

A v6.18.1 alinha as fontes oficiais a esse comportamento existente. Não modifica `lockMinutesBefore`, funções do Supabase, validações de escrita, palpites armazenados ou qualquer prazo operacional.

### Consequências

- documentação, governança e interface passam a descrever o mesmo prazo;
- mudanças futuras no intervalo de fechamento continuam sendo de risco alto e exigem tarefa específica, critérios de aceite e testes;
- a entrega não altera pontuação, resultados, Ranking, Supabase, RLS, autenticação, sincronização ou produção;
- testes automatizados diretos do fechamento permanecem como entrega posterior independente.

## DEC-2026-014 — Isolamento do Ranking provisório

- Data: 2026-08-11
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

Durante uma rodada em aberto, o Ranking oficial considera somente partidas encerradas. A experiência desejada é mostrar como ficaria a classificação se os jogos terminassem no placar disponível, inclusive entre partidas e diante de jogos adiados, sem transformar pontos temporários em dados oficiais nem revelar palpites ainda protegidos.

### Decisão

Criar uma projeção agregada e transitória, acessível por um modal compartilhado entre Home e Ranking. Jogos encerrados permanecem consolidados; jogos ao vivo e suspensos com placar válido geram pontos provisórios; jogos futuros e adiados sem placar contribuem com zero temporário; cancelados não pontuam.

O cálculo ocorre no Supabase e retorna somente totais por participante. Palpites individuais continuam protegidos. A projeção não é persistida e não substitui nem alimenta o Ranking oficial, Estatísticas, Destaques, histórico de movimentação, resumos compartilháveis, checkpoints ou snapshots competitivos.

### Consequências

- a interface deve distinguir explicitamente projeção e classificação oficial;
- execução anônima da RPC permanece proibida;
- alterações de placar podem mudar posição e pontos a cada atualização;
- partidas adiadas não escondem o acesso, mas aparecem como pendentes sem pontuação quando não possuem placar;
- rollback não exige restauração de dados, pois nenhum ponto provisório é gravado;
- qualquer uso futuro da projeção por módulos oficiais exige nova decisão e tarefa de risco alto.

## DEC-2026-015 — Separação entre disponibilidade e atualidade esportiva

- Data: 2026-08-16
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

A fonte esportiva permaneceu acessível e as sincronizações terminaram com sucesso, mas partidas já iniciadas continuaram como agendadas e sem placar. Assim, disponibilidade técnica isolada não demonstrava que o conteúdo estava atual.

### Decisão

O diagnóstico passa a apresentar separadamente a disponibilidade inferida da API e a atualidade dos jogos armazenados. Uma partida ainda agendada 30 minutos após o início gera alerta administrativo, sem alterar automaticamente dados competitivos.

Uma eventual contingência continua manual: o resultado deve ser confirmado em duas fontes independentes, aplicado somente por IDs e precondições explícitas, em transação revisada, com snapshots, histórico e verificação posterior. Não será integrada uma segunda provedora automática nesta entrega.

### Consequências

- uma resposta bem-sucedida da API não produz mais, sozinha, a mensagem de que todos os dados estão atuais;
- o alerta não presume placar, encerramento ou pontuação;
- banco, RLS, regras 10/5/3/1 e fechamento dos palpites permanecem inalterados;
- qualquer automação de fallback exige decisão e escopo próprios.

## DEC-2026-016 — Migração controlada da fonte de dados esportivos

- Data: 2026-08-24
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

A fonte esportiva atual não entrega toda a minutagem ao vivo desejada. A
API-Football apresentou viabilidade técnica inicial e uma oferta potencialmente
mais completa, mas a troca afeta dados sensíveis da competição e precisa ser
validada sem comprometer jogos, palpites, pontuação ou histórico.

### Decisão

- manter somente uma fonte externa oficial por vez;
- usar a segunda API apenas em sombra, sem escrita no estado competitivo;
- preservar `public.jogos.id_jogo` e adicionar identificadores do novo
  fornecedor, se aprovados, como campos auxiliares;
- não combinar campos de fornecedores diferentes na visão oficial;
- observar uma a duas rodadas antes do corte e uma a duas depois dele;
- manter a API anterior disponível durante a estabilização para rollback;
- tratar a API-Football como candidata, condicionando a adoção definitiva às
  evidências e a uma aprovação humana específica;
- usar
  [`docs/architecture/MIGRACAO_API_ESPORTIVA.md`](../architecture/MIGRACAO_API_ESPORTIVA.md)
  como plano canônico e registro do estado da migração.

### Consequências

- mudanças futuras de banco, integração, configuração ou produção são de alto
  risco e exigem tarefas e aprovações próprias;
- o modelo de transição deve ser aditivo, observável e reversível;
- a manutenção temporária de duas assinaturas é aceitável, sem tornar a solução
  permanentemente híbrida;
- este registro não autoriza contratação, implementação, deploy ou corte.

## DEC-2026-017 — Contrato normalizado antes da fundação no banco

- Data: 2026-08-25
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

A observação integral de uma partida real da API-Football confirmou estado,
minutagem, acréscimos e placar, mas revelou que eventos embutidos podem ficar
temporariamente vazios ou incompletos. Além disso, a integração atual usa o ID
do fornecedor como `id_jogo`, acoplamento que não pode ser repetido na migração.

### Decisão

- adotar o contrato v1 definido em
  [`docs/architecture/CONTRATO_FONTE_ESPORTIVA.md`](../architecture/CONTRATO_FONTE_ESPORTIVA.md);
- tratar estado, relógio e placar como dados competitivos normalizados e eventos
  como informação auxiliar não destrutiva;
- bloquear escrita para envelopes inválidos, estados desconhecidos,
  identificações ambíguas e resultados finais incoerentes;
- implementar primeiro um adaptador puro com fixtures sanitizadas e testes;
- manter Supabase, Functions e fonte oficial inalterados até a validação desse
  adaptador.

### Consequências

- a fundação no banco passa a ocorrer depois do adaptador puro, não antes;
- fornecedores ficam isolados atrás do mesmo contrato interno;
- eventos ausentes não apagam informação previamente observada e nunca
  reconstruem o placar oficial;
- mudanças incompatíveis no contrato exigem nova versão e aprovação;
- esta decisão não autoriza implementação, migração, deploy ou corte.

## DEC-2026-018 — Tabelas de sombra em `public` com exposição controlada

- Data: 2026-08-25
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: proposta ainda não confirmada em DEC-2026-016
- Impacto: alto

### Contexto

A auditoria da fundação confirmou que o backend atual usa a Data API com
`service_role`, enquanto o schema `private` existente não concede `USAGE`
nem a esse papel. Colocar as fotografias de transição em `private` exigiria uma
RPC privilegiada ou mudança arquitetural adicional antes da coleta em sombra.

### Decisão

- manter em `public` as três tabelas de transição;
- habilitar RLS sem políticas para `anon` ou `authenticated`;
- revogar privilégios automáticos de `PUBLIC`, `anon`, `authenticated` e
  `service_role`;
- conceder novamente ao `service_role` somente `SELECT`, `INSERT` e
  `UPDATE`, além do uso estritamente necessário das sequências;
- não criar funções privilegiadas, políticas públicas ou uma tabela separada de
  divergências nesta fase.

### Consequências

- a futura Function de sombra poderá persistir fotografias normalizadas pela
  mesma fronteira server-side já usada pelo projeto;
- navegador e usuários autenticados não terão acesso direto às tabelas;
- exclusão e retenção continuam bloqueadas até uma decisão própria;
- qualquer ampliação de privilégios exige nova revisão de segurança;
- a aplicação da migração foi autorizada e concluída em 2026-08-25;
- a fundação aplicada não autoriza o início da coleta em sombra.

## DEC-2026-019 — Primeiro recorte de sombra manual e unitário

- Data: 2026-08-25
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

A fundação no banco está aplicada, mas iniciar uma rodada automatizada antes de
validar credencial, Function, normalização e persistência aumentaria o risco
operacional. O primeiro ensaio precisa produzir evidência real com consumo de
cota previsível e sem qualquer autoridade competitiva.

### Decisão

- implementar uma Function acionada somente por administrador;
- receber um jogo interno e uma fixture da API-Football por execução;
- limitar o recorte a uma chamada externa e duas fotografias normalizadas;
- usar `public.jogos` apenas como referência de leitura da fonte oficial;
- gravar somente nas tabelas de transição, sem payload bruto;
- manter agenda automática, classificação e mapeamentos auxiliares fora deste
  primeiro recorte.

### Consequências

- a chave da API-Football será necessária apenas no ambiente protegido da
  Function e sua configuração continua sujeita a portão operacional;
- a Fase 4 permanece aberta até uma prova real publicada e revisada;
- a coleta de uma ou duas rodadas só poderá ser planejada depois desse ensaio;
- nenhuma tela, palpite, pontuação, relógio ou fonte oficial é alterada.

## DEC-2026-020 — Fase 5 dividida entre validação operacional e sombra de rodada

- Data: 2026-08-25
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: detalhamento pendente da Fase 5 em DEC-2026-016
- Impacto: alto na futura implementação; documental nesta decisão

### Contexto

As provas unitárias da Fase 4 foram concluídas e uma assinatura Pro da
API-Football foi contratada por três meses. Antes de automatizar uma rodada, era
necessário confirmar que o acesso pago removia as restrições do plano gratuito,
que a temporada completa e a classificação podiam ser consultadas e que a cota
comportava uma observação recorrente sem chamadas por jogo.

### Decisão

- dividir a sombra pré-corte em Fase 5A, de validação do acesso e desenho
  operacional, e Fase 5B, de reconciliação e observação de rodada completa;
- considerar a Fase 5A concluída após confirmar temporada, 38 rodadas, 380
  fixtures, rodada com dez jogos, consulta por data, fixture unitária,
  classificação com vinte posições e os limites do plano Pro;
- na futura Fase 5B, consultar todos os jogos da data em uma única chamada por
  ciclo, com frequência de um minuto apenas durante a janela ativa;
- reservar 20% da cota diária e 10% do limite por minuto, interrompendo a sombra
  com diagnóstico se essas reservas ou as demais condições de segurança forem
  atingidas;
- executar uma rodada obrigatória e exigir a segunda somente se a primeira
  deixar cobertura incompleta, divergência material ou marco relevante sem
  observação;
- manter classificação dentro da sombra e preservar integralmente a autoridade
  exclusiva da football-data.org antes do corte.

### Consequências

- o bloqueio comercial para enumerar a temporada foi removido;
- a próxima tarefa deve reconciliar identidades e implementar a coleta de rodada
  conforme plano técnico próprio;
- assinatura, credencial e evidências desta fase não autorizam agendamento,
  preenchimento de IDs auxiliares, escrita competitiva ou troca de fornecedor;
- uma segunda rodada deixa de ser automática, mas continua obrigatória quando a
  primeira não produzir evidência suficiente para o portão de corte.

## DEC-2026-021 — Reconciliação determinística com tolerância de trinta minutos

- Data: 2026-08-25
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: tolerância pendente em DEC-2026-016
- Impacto: alto na futura gravação; somente leitura nesta execução

### Contexto

A Fase 5B exige relacionar os IDs da API-Football aos 380 jogos canônicos sem
transformar o fornecedor em identidade interna. Diferenças nominais conhecidas
e agendas futuras provisórias não podem provocar aproximação vaga, remapeamento
silencioso ou escrita parcial não revisada.

### Decisão

- exigir temporada, rodada, mandante e visitante na direção correta;
- normalizar acentos e usar somente aliases de clubes explícitos e testados;
- aceitar horário com diferença máxima de trinta minutos;
- exigir exatamente um candidato e bloquear duplicidade, ambiguidade, inversão,
  conflito existente ou horário fora da tolerância;
- executar primeiro uma reconciliação seca, sem `INSERT`, `UPDATE`, `UPSERT`,
  RPC, DDL ou persistência do payload bruto;
- vincular a evidência aceita a um hash determinístico dos mapeamentos.

### Consequências

- a execução real normalizou 380 fixtures e aceitou 255 correspondências, todas
  com horário idêntico ao canônico;
- 125 jogos permaneceram bloqueados somente por divergência de agenda, sem
  alterar seus campos auxiliares;
- a rodada 24 ficou integralmente reconciliada e apta ao próximo portão;
- gravar os 255 mapeamentos ou aguardar convergência dos 125 exige decisão e
  tarefa de dados próprias;
- nenhuma escrita ocorreu em jogos, tabelas de transição ou estado competitivo.

## DEC-2026-022 — Gravação parcial, atômica e auditável dos mapeamentos aceitos

- Data: 2026-08-25
- Status: aceita e aplicada
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

A reconciliação seca da Fase 5B.1 aceitou 255 correspondências inequívocas com
horário idêntico e bloqueou 125 jogos por divergência de agenda. A observação da
rodada reconciliada depende dos identificadores auxiliares, mas aceitar os jogos
bloqueados ou executar atualizações parciais sem precondições comprometeria a
rastreabilidade da transição.

### Decisão

- materializar somente os 255 mapeamentos vinculados ao hash aprovado;
- exigir os quatro campos auxiliares nulos nos 380 jogos antes da gravação;
- executar validação, bloqueio, atualização, pós-condições e auditoria na mesma
  transação;
- preservar nulos os 125 casos bloqueados;
- comparar o estado competitivo completo de `public.jogos`, excluídos somente
  os quatro campos autorizados, antes e depois da atualização;
- preparar rollback operacional separado, condicionado à auditoria original e
  à ausência de divergência posterior;
- manter a aplicação remota sujeita a autorização humana específica.

### Consequências

- `id_jogo`, horários, resultados, estados e demais dados competitivos não são
  alterados pela migração preparada;
- a auditoria usa `public.transicao_api_execucoes` com tipo explícito em
  `detalhes`, sem criar nova tabela ou ampliar exposição;
- qualquer campo auxiliar previamente preenchido, hash diferente, ID ausente,
  duplicidade ou contagem divergente aborta a transação inteira;
- os artefatos locais não autorizam `db push`, escrita remota, coleta de rodada,
  corte, deploy ou publicação Git.

### Evidência de aplicação

Em 2026-08-25, após autorização humana específica, a migração foi aplicada no
Supabase e registrada como `20260825050228`. A verificação posterior confirmou
255 jogos completamente mapeados, 125 completamente nulos, zero linhas
parciais, hash idêntico ao aprovado e igualdade entre os hashes competitivos
anterior e posterior. A aplicação não autorizou coleta, corte, deploy ou
publicação Git.

## DEC-2026-023 — Núcleo de rodada inativo antes da ativação operacional

- Data: 2026-08-25
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

A Fase 5B.2 deixou uma base integralmente mapeada para observar uma rodada, mas
adicionar imediatamente um cron ao deploy poderia iniciar chamadas e escritas de
transição sem que a rodada e sua janela fossem confirmadas em preflight.

### Decisão

- separar a Fase 5B.3 em núcleo técnico 5B.3A e ativação operacional 5B.3B;
- implementar e testar na 5B.3A janela, cadência, orçamento, normalização em
  lote, reconciliação exata, classificação e persistência isolada;
- usar `America/Sao_Paulo` como fuso explícito da consulta por data;
- não criar Function pública, cron ou configuração capaz de iniciar a coleta;
- manter qualquer seleção de rodada, deploy e chamada real sujeitos a preflight
  e autorização próprios.

### Consequências

- o código pode ser revisado sem consumo de cota ou mutação remota;
- as tabelas competitivas e o cache oficial permanecem somente leitura;
- a 5B.3B deverá escolher uma rodada futura integralmente mapeada e acrescentar
  o acionamento protegido sem alterar o núcleo aprovado;
- a fonte oficial continua sendo exclusivamente a football-data.org.

## DEC-2026-024 — Ativação fail-closed da sombra da rodada 25

- Data: 2026-08-25
- Status: aceita e aplicada
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

O preflight somente leitura identificou a rodada 25, entre 29 e 31 de agosto,
como a próxima rodada futura com dez jogos e dez mapeamentos completos. Publicar
um cron sem bloqueio operacional poderia iniciar consumo e persistência no mesmo
deploy do código.

### Decisão

- preparar o cron de um minuto com bloqueio por ativação, campanha, rodada e
  lista explícita de datas;
- manter a configuração ausente ou diferente de `true` como estado inerte;
- criar chave opcional e única de idempotência por campanha, data e minuto;
- revalidar identidade, competição, temporada, rodada e agenda antes de gravar;
- exigir classificação oficial de vinte clubes atualizada há no máximo uma hora;
- manter aplicação da migração, deploy, variáveis e início da coleta sujeitos a
  autorizações próprias.

### Consequências

- Deploy Preview não inicia coleta automaticamente;
- ciclos duplicados são bloqueados antes de chamar a API-Football;
- nenhuma permissão é concedida a `anon` ou `authenticated`;
- os 125 mapeamentos bloqueados e todo o estado competitivo permanecem intactos;
- a 5B.3B.2 só começa depois de preflight final e ativação humana explícita.

### Evidência de aplicação

Em 2026-08-25, após autorização humana específica, a migração de idempotência
foi aplicada no Supabase e registrada como `20260825060519`. A validação
posterior confirmou coluna opcional, restrição de formato, índice único parcial
válido, RLS preservada, ausência de privilégios públicos e manutenção dos
privilégios mínimos do `service_role`. As três execuções anteriores permaneceram
com chave nula; as contagens de sombra continuaram em três execuções, quatro
fotografias de jogos e nenhuma classificação. Os 255 mapeamentos completos e os
125 integralmente nulos foram preservados. A aplicação não configurou a Netlify
nem iniciou coleta.

## DEC-2026-025 — Metadados opcionais na fotografia de jogos em sombra

- Data: 2026-08-25
- Status: aceita e aplicada
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

As fotografias de transição já cobriam identidade, agenda, estado, relógio e
placares, mas não preservavam local, cidade, escudos ou códigos de três letras
disponíveis na resposta de fixtures. Ativar a rodada sem esses campos perderia
a oportunidade de avaliar metadados usados na apresentação, embora eles não
tenham autoridade competitiva.

### Decisão

- acrescentar seis colunas opcionais somente a `transicao_api_jogos`;
- observar nome e cidade do local, escudos e códigos dos dois times sem chamadas
  adicionais;
- incluir esses valores no hash auditável de cada fotografia;
- não invalidar a fotografia competitiva quando estiverem ausentes ou
  divergentes;
- não promover valores para `public.jogos` nem inferir cidade ou código ausente;
- manter apelidos, nomes de exibição e siglas canônicas sob autoridade do Bolão;
- avaliar um catálogo canônico de clubes apenas em tarefa futura, antes do
  corte, se sua necessidade for confirmada.

### Consequências

- a rodada 25 poderá produzir evidência de identidade visual e local sem elevar
  o consumo da API-Football;
- linhas antigas permanecem válidas com as novas colunas nulas;
- `id_jogo`, horários, resultados, palpites, pontuação, classificação oficial e
  demais dados competitivos permanecem inalterados;
- RLS e privilégios existentes não são ampliados;
- aplicação remota, publicação, simulação e ativação continuam sujeitas a
  autorizações independentes.

### Evidência de aplicação

Em 2026-08-25, a migração foi aplicada pelo conector oficial do Supabase e
registrada remotamente como `20260825151356`. A validação confirmou seis colunas
anuláveis e comentadas, RLS ativa, nenhum privilégio para `PUBLIC`, `anon` ou
`authenticated` e somente `SELECT`, `INSERT` e `UPDATE` para `service_role`.

O hash integral de `public.jogos` permaneceu
`f781125f96ae8c79bc5adf6e4621d88b`; os 380 jogos, 255 mapeamentos completos,
125 jogos integralmente nulos e as contagens de três execuções, quatro
fotografias e nenhuma classificação foram preservados. Nenhum dos novos campos
foi preenchido e nenhuma coleta foi iniciada.

Esta foi a segunda ocorrência em que o conector gerou uma versão remota distinta
do timestamp do arquivo já publicado. O workflow foi reforçado para impedir
novo encerramento com histórico divergente.

## DEC-2026-026 — Agenda canônica distingue horário confirmado de data provisória

- Data: 2026-08-25
- Status: aceita; implementação local em revisão
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

A consulta autenticada à football-data.org confirmou que os 125 horários
divergentes da reconciliação eram idênticos aos armazenados no Supabase. A
comparação com API-Football, CBF e ge separou um erro histórico de horário,
quatro adiamentos sem nova data e 120 datas-base futuras sem detalhamento
oficial. Portanto, a ingestão não apresentou conversão incorreta de fuso; o
modelo tratava instantes provisórios como se fossem horários confirmados.

### Decisão

- preservar `id_jogo`, resultados, palpites, pontuação e demais dados competitivos;
- corrigir somente o início de Remo x Palmeiras (`554887`) para 10/05 às 16h de Brasília;
- classificar os quatro jogos adiados da rodada 21 como `adiado_sem_data`;
- classificar os 120 jogos das rodadas 27 a 38 como `provisorio`;
- manter uma trilha append-only e sem payload bruto das evidências de agenda;
- impedir que a football-data.org sobrescreva um horário confirmado pela CBF;
- manter os 125 mapeamentos da API-Football fora desta gravação, sujeitos a
  reconciliação e aprovação próprias.

### Consequências

- `inicio` continua existindo para compatibilidade, mas passa a ter qualificação semântica;
- a migration valida o hash competitivo registrado na Fase 5B.2, usa bloqueio
  transacional, pós-condições e rollback condicionado;
- após o primeiro ensaio seguro bloquear uma fotografia competitiva histórica
  que havia evoluído por sincronizações normais, a pré-condição foi corrigida
  para validar o hash imutável dos 255 mapeamentos e comparar o estado
  competitivo vigente imediatamente antes e depois da própria transação;
- uma nova data de provedor para jogo adiado volta como provisória até confirmação;
- aplicação remota, deploy e preenchimento dos 125 IDs continuam não autorizados.
- a aplicação remota foi registrada como `20260825202000`; o arquivo local deve
  usar a mesma versão, e o índice recomendado para a chave estrangeira das
  observações permanece em migration própria e reversível.

## DEC-2026-027 — Escudos novos exigem auditoria antes da promoção visual

- Data: 2026-08-29
- Status: aceita; implementação local em revisão
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: médio

### Contexto

A API-Football fornece URLs de escudos com possíveis diferenças de arquivo,
dimensão, proporção, transparência e margem interna. A coleta da rodada 25 já
preserva essas URLs em `transicao_api_jogos`, enquanto o aplicativo mantém os
escudos atuais e usa contêineres proporcionais com fallback.

### Decisão

- reutilizar as fotografias existentes, sem criar outra tabela sombra;
- consolidar a evidência por ID do clube na API-Football;
- rejeitar URLs inseguras, ausentes, inconsistentes ou tecnicamente inválidas;
- aprovar automaticamente somente conteúdo binariamente idêntico ao canônico;
- exigir revisão visual humana para qualquer arquivo diferente;
- impedir promoção automática para `public.jogos` ou para a interface.

### Consequências

- a campanha corrente não muda de comportamento e não faz chamadas extras;
- a auditoria pode ser repetida sobre exportações controladas e gera relatório
  JSON e Markdown;
- catálogo canônico, armazenamento próprio e troca da origem visual permanecem
  sujeitos a tarefas e aprovações separadas;
- dados competitivos, nomes, apelidos e siglas continuam preservados.

## DEC-2026-028 — Progresso administrativo limitado à rodada atual

- Data: 2026-08-29
- Status: aceita; implementação local em revisão
- Responsáveis: manutenção do projeto
- Substitui: consulta histórica irrestrita de `progresso_palpites_adm`
- Impacto: alto

### Contexto

O painel administrativo exibiu Ana Flávia como `0/10` na rodada 25 apesar de
os dez palpites estarem gravados e visíveis na view administrativa. A view
alcançou 1.051 linhas, ultrapassando o limite de 1.000 registros de uma resposta
da Data API. Como o navegador carregava todo o histórico sem filtro, os
registros mais recentes podiam ficar fora do recorte recebido.

### Decisão

- consultar primeiro os jogos e determinar a rodada corrente;
- enviar à view administrativa somente os dez `id_jogo` dessa rodada;
- não aumentar o limite global nem paginar histórico desnecessário;
- preservar a view, RLS, palpites, placares e regras de fechamento;
- cobrir por teste um histórico superior a mil linhas.

### Consequências

- o indicador administrativo deixa de depender do tamanho do histórico;
- a consulta transfere apenas os registros necessários à tela atual;
- nenhuma escrita, migration ou correção de dados é necessária;
- publicação e deploy permanecem sujeitos a autorizações próprias.

## DEC-2026-029 — Meu Time combina comentário editorial e progresso explícito

- Data: 2026-08-29
- Status: aceita; implementação local em revisão
- Responsáveis: manutenção do projeto
- Substitui: timeline restrita a vitórias e placares exatos
- Impacto: médio

### Contexto

Os cards **Momentos com o seu time** e **Marcos do Meu Time** podiam permanecer
vazios mesmo quando o participante acompanhava e palpitava nos jogos do clube.
A timeline também repetia resultados já disponíveis na Tela de Jogos.

### Decisão

- preservar o título **Momentos com o seu time**;
- apresentar um único comentário curto, positivo e bem-humorado, escolhido por
  regras determinísticas e sem IA ou chamada externa;
- alternar frases equivalentes pela rodada para reduzir repetição;
- mostrar todos os marcos desde o início, com estado e progresso explícitos;
- acrescentar o marco de participação **Primeiro capítulo**;
- recalcular a experiência pelo time favorito atual e pelos dados históricos já
  carregados, sem persistir novos eventos.

### Consequências

- participantes sem acertos passam a receber conteúdo útil e não depreciativo;
- conquistas mantêm seus critérios, mas deixam de parecer inativas;
- nenhuma tabela, API, pontuação, palpite ou resultado é alterado;
- a mudança permanece inteiramente reversível no código da interface.

## DEC-2026-030 — Fechamento da sombra usa marcos permanentes e recuperação terminal

- Data: 2026-08-30
- Status: aceita e aplicada
- Responsáveis: manutenção do projeto
- Substitui: limite terminal rígido e inferência de marcos pelas vinte execuções mais recentes
- Impacto: alto

### Contexto

Na primeira data real da rodada 25, a coleta terminou com Vasco x Cruzeiro ainda
ao vivo. A última fotografia registrou API-Football 3 x 0 em 90+2 e fonte
oficial 2 x 0; o resultado posterior foi 3 x 1. O limite de 120 minutos após o
último início impediu o ciclo terminal. A janela de vinte execuções usada para
falhas também esquecia o marco `inicio`, provocando novas coletas de
classificação aproximadamente a cada 21 minutos.

### Decisão

- consultar a existência de `inicio` e `fim` diretamente no histórico da
  campanha e da data;
- manter as vinte execuções recentes somente para contar falhas consecutivas;
- permitir um ciclo terminal sem prazo rígido quando todos os jogos canônicos
  da data estiverem encerrados e o marco `fim` ainda não existir;
- recuperar a data autorizada anterior que esteja terminal e sem marco `fim`;
- retomar a data corrente no ciclo seguinte;
- preservar idempotência por campanha, data e minuto e todas as barreiras de
  cota, identidade, agenda e persistência isolada.

### Consequências e evidência

- o PR #170 implementou e testou os cenários de prazo excedido, memória do
  marco e recuperação posterior;
- a execução 289 recuperou 29 de agosto com três resultados finais concordantes
  e registrou exatamente um marco `fim`;
- a execução seguinte voltou aos seis jogos de 30 de agosto;
- nenhuma tabela competitiva, variável ou estrutura do Supabase foi alterada.

## DEC-2026-031 — Eventos da API-Football terão sombra abrangente e extensível

- Data: 2026-08-30
- Status: aceita para planejamento; implementação pendente
- Responsáveis: manutenção do projeto
- Substitui: não se aplica
- Impacto: alto

### Contexto

A coleta atual registra o minuto observado da partida, mas não persiste o minuto
do gol nem os demais eventos normalizados pelo adaptador. Restringir a futura
tabela apenas a gols exigiria novas migrações para cartões, substituições, VAR
ou tipos acrescentados pelo fornecedor.

### Decisão

- planejar `transicao_api_eventos` para todos os tipos de evento retornados;
- vincular cada linha à execução, ao jogo canônico e aos identificadores do
  fornecedor;
- preservar minuto, acréscimos, equipe, jogador, participante relacionado,
  tipo, detalhe, comentário e payload original sanitizado e limitado;
- manter campos originais mesmo para tipos desconhecidos e normalização
  opcional para categorias conhecidas;
- usar chave estável, hash e estado observacional para idempotência, correções e
  desaparecimentos sem apagar histórico;
- validar retenção e condições de uso antes de persistir payload original;
- reprocessar controladamente a rodada 25 somente após o relatório consolidado.

### Consequências

- a campanha atual não muda durante a rodada 25;
- nenhuma interface ou tabela competitiva passa a consumir eventos nesta fase;
- migração, código, aplicação remota e reprocessamento exigem plano e
  autorizações separados;
- tipos futuros podem ser preservados sem bloquear a coleta.

## DEC-2026-032 — Rodada 25 conclui a sombra pré-corte sem autorizar o corte

- Data: 2026-08-31
- Status: aceita
- Responsáveis: manutenção do projeto
- Substitui: veredicto pendente da Fase 5B.3B.2
- Impacto: alto na decisão futura; somente documental nesta aplicação

### Contexto

A campanha `5b3-round-25` observou os dez jogos entre 29 e 31 de agosto. Dois
defeitos operacionais foram encontrados antes do corte e corrigidos pelos PRs
#169 e #170. A recuperação terminal recompôs a fotografia final de 29 de agosto
e os dias seguintes exercitaram os marcos permanentes até Remo 2 x 3 Coritiba.

### Decisão

- considerar a Fase 5B concluída com uma rodada completa de evidência;
- não exigir segunda rodada com o mesmo contrato, pois os dez jogos terminaram
  válidos e concordantes e as lacunas encontradas foram corrigidas;
- preservar 255 mapeamentos completos, 125 jogos integralmente nulos e nenhum
  mapeamento parcial;
- preservar toda a auditoria e desativar a campanha somente em portão
  operacional autorizado;
- manter o corte, a configuração da fonte e o deploy bloqueados até plano da
  Fase 6 com rollback testado;
- tratar eventos e auditoria visual dos escudos em tarefas separadas.

### Evidência

- 846 execuções, sem falhas, execuções abertas ou chaves duplicadas;
- 8.258 fotografias de jogos, dez jogos, dois fornecedores, zero linha inválida
  e zero erro de normalização;
- dez estados finais e dez placares finais concordantes;
- diferença de agenda máxima igual a zero minuto;
- marco `fim` único para cada data depois da correção;
- cota final em 7.486 de 7.500 chamadas;
- escudos e locais presentes nas dez observações finais; códigos de três
  letras ausentes, mas opcionais e sem autoridade sobre a sigla canônica.

### Consequências

- há evidência suficiente para planejar o próximo portão;
- nenhuma fonte foi trocada e a football-data.org permanece oficial;
- nenhuma variável do Netlify, tabela, dado competitivo ou versão foi alterado
  por esta decisão documental;
- uma nova sombra somente será necessária se o contrato mudar ou a extensão de
  eventos exigir evidência operacional própria.
