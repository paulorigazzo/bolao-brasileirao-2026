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
