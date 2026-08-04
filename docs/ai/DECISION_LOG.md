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
