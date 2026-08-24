# Fluxo de desenvolvimento com Codex

## Finalidade

Este documento descreve o procedimento operacional para tarefas executadas com o Codex. As regras obrigatórias estão em `AGENTS.md`; os princípios permanentes estão em `docs/ai/DEVELOPMENT_PRINCIPLES.md`.

## Modos de execução

- **Planejamento:** inspeção, análise e proposta, sem alteração de arquivos.
- **Implementação:** alteração e validação do escopo aprovado.
- **Publicação:** commit, push, Pull Request ou outra entrega autorizada.
- **Recuperação:** diagnóstico e retorno a um estado seguro após falha, regressão ou interrupção.
- **Encerramento:** atualização pós-merge e limpeza das branches local e remota integradas.

Uma tarefa pode passar por mais de um modo, mas cada transição depende da autorização aplicável. Implementação não concede permissão automática para Publicação, e Encerramento depende de aprovação explícita após o merge confirmado.

Uma vez aprovado o modo Encerramento, o agente pode executar sem novas autorizações individuais todas as ações já descritas no plano aprovado para esse modo. Mudanças de escopo ou ações não previstas exigem nova aprovação.

### Contrato de saída dos modos

- **Planejamento:** apresentar objetivo, abordagem, arquivos potenciais, preservações, nível de risco, critérios e, em risco médio ou alto, evidências previstas por critério, impactos documentais e ações Git; confirmar que nenhum arquivo foi alterado; aguardar aprovação para Implementação.
- **Implementação:** apresentar branch, arquivos alterados, resumo por arquivo, áreas preservadas, critérios e resultados e, em risco médio ou alto, evidências obtidas por critério, limitações, diff e estado do Git; não publicar; aguardar revisão humana.
- **Publicação:** informar separadamente cada ação autorizada executada e seu resultado, sem realizar merge automático; indicar a autorização ainda necessária.
- **Recuperação:** confirmar o estado seguro restaurado e as evidências, ou descrever o bloqueio, impacto e orientação necessária; não ampliar a recuperação para implementação ou publicação.
- **Encerramento:** confirmar o merge, atualizar a referência local de `main`, remover por padrão as branches local e remota integradas, salvo pedido explícito de preservação, e apresentar o estado final do Git.

## Estados de uma tarefa

Toda tarefa percorre os seguintes estados:

1. análise;
2. plano;
3. aprovação humana;
4. implementação;
5. validação;
6. revisão humana;
7. publicação autorizada, quando aplicável.
8. encerramento autorizado, após merge confirmado, quando aplicável.

Nenhuma aprovação é presumida. Aprovar o plano não autoriza automaticamente commit, push, Pull Request ou merge.

## Checklist visual resumido

```text
[ ] Working tree limpo e branch confirmada
[ ] Fontes da verdade lidas
[ ] Escopo, exclusões e critérios identificados
[ ] Risco classificado e evidências aplicáveis previstas
[ ] Branch proposta no plano
[ ] Plano e branch aprovados
[ ] Branch específica criada
[ ] Implementação restrita à especificação
[ ] Diff, arquivos alterados e arquivos novos revisados
[ ] Validações executadas e registradas
[ ] Revisão humana solicitada
[ ] Publicação realizada somente se autorizada
[ ] Merge nunca executado automaticamente
[ ] Encerramento realizado somente se autorizado
```

## Leitura mínima por tipo de tarefa

Toda tarefa exige como núcleo:

- `AGENTS.md`;
- as partes deste workflow aplicáveis ao modo e à fase atuais;
- a especificação aprovada para a tarefa;
- os arquivos diretamente relacionados ao escopo.

Consultar `docs/ai/CONTEXT_INDEX.md` para localizar fontes adicionais conforme a
necessidade. O índice é somente um roteador: não substitui `AGENTS.md`, este
workflow nem a fonte oficial apontada.

| Gatilho da tarefa | Expansão contextual esperada |
| --- | --- |
| Visão geral, instalação ou operação | Trechos relacionados de `README.md` |
| Prioridade, status ou escopo planejado | Trechos relacionados de `ROADMAP.md` |
| Versão atual ou entrega funcional | `VERSION.md`, regras de versionamento e, quando aplicável, trecho relacionado do `CHANGELOG.md` e nota de release |
| Histórico de uma mudança | Busca temática no `CHANGELOG.md`, em `docs/releases/` e, quando aplicável, no histórico Git |
| Decisão técnica ou de governança anterior | Busca temática em `docs/ai/DECISION_LOG.md` e fonte relacionada |
| Planejamento ou documentação de processo | Partes relacionadas de `docs/ai/DEVELOPMENT_PRINCIPLES.md`, `docs/ai/CODEX_PROMPT.md`, `docs/process/` e demais fontes apontadas pelo escopo |
| Código, interface ou arquitetura | Código do módulo, documentação específica, documento arquitetural e release relacionados ao comportamento afetado |
| Banco, autenticação, RLS ou dados | Código, documentação, políticas e migrações do Supabase relacionadas |
| Netlify, Functions, deploy ou infraestrutura | Código, configuração e documentação de deployment ou Functions relacionadas |
| Publicação | Plano e entrega aprovados, diff final, status Git, histórico da branch e regras de versão ou release aplicáveis |
| Recuperação | Documentos do fluxo afetado, estado Git, evidências da falha e última referência conhecida como segura |
| Encerramento | Resultado do merge, estado de `main`, branches local e remota envolvidas e pedido de preservação, se houver |

Quando uma tarefa combinar gatilhos, aplicar cumulativamente as expansões
correspondentes. Para documentos históricos extensos, usar preferencialmente:

1. buscar o assunto;
2. ler o trecho ou a seção relevante;
3. carregar o documento completo quando o contexto localizado for insuficiente.

Não é necessário ler arquivos sem relação com o escopo apenas por pertencerem a
uma pasta indicada. Registrar qualquer fonte necessária indisponível. Quanto
maior o risco, maior pode e deve ser o contexto consultado; em tarefas de risco
alto, economia de contexto não é prioridade.

Diante de dúvida material sobre a necessidade de uma fonte adicional, conflito
entre fontes ou impacto incerto, expandir o contexto antes de implementar.

## Fase 1 — Análise

Antes de qualquer modificação:

1. executar `git status --short` e identificar a branch atual;
2. interromper se houver alterações pendentes;
3. ler `AGENTS.md`;
4. ler este workflow;
5. consultar as fontes da verdade e os arquivos relacionados ao escopo;
6. confirmar o estado atual da funcionalidade ou documentação;
7. identificar arquivos potencialmente afetados, exclusões, critérios de aceite e classificar o risco.

Se a documentação e o repositório divergirem, registrar a inconsistência e não improvisar uma solução.

## Fase 2 — Plano

O plano deve declarar:

- objetivo;
- abordagem;
- nível de risco e justificativa;
- arquivos potencialmente alterados;
- áreas explicitamente preservadas;
- critérios de aceite e, em risco médio ou alto, evidências previstas associadas;
- impactos em versão, changelog, release e roadmap;
- ações Git previstas;
- tipo e nome proposto para a branch.

O agente deve aguardar aprovação humana explícita antes de editar arquivos.

O nome da branch é uma proposta e não deve ser criado antes da aprovação humana explícita. Se a aprovação alterar branch, escopo ou validações, incorporar os ajustes antes de iniciar.

### Classificação de risco

Toda implementação deve adotar o maior nível aplicável:

| Nível | Aplicação | Piso de validação |
| --- | --- | --- |
| Baixo | Documentação e mudanças comprovadamente não funcionais | Diff, escopo, arquivos novos, consistência e links ou referências aplicáveis |
| Médio | Código, interface ou configuração ordinária sem área protegida | Tudo do risco baixo, `npm run check`, testes específicos e cenários manuais; `netlify dev` quando houver impacto funcional ou visual |
| Alto | Área protegida, dados, segurança, produção ou mudança estrutural | Tudo do risco médio, mais rollback ou mitigação, cenários negativos e evidências específicas de segurança, isolamento, preservação ou equivalência |

São sempre risco alto as mudanças funcionais ou operacionais que envolvam Supabase, banco, migrações, RLS, autenticação, autorização, privacidade, escrita ou exclusão de dados, palpites, fechamento, pontuação, sincronização, Functions, produção, regras de negócio protegidas, mudanças transversais de arquitetura e Temporadas e Bolões, bem como a introdução de dependências novas.

Documentação, referências, metadados, identificadores ou sincronização de versão e a mera localização de um arquivo em uma área protegida não elevam o risco por si só. Esses itens herdam o maior risco do comportamento efetivamente alterado. Por exemplo, atualizar somente `APP_VERSION` em um arquivo de Functions não transforma uma entrega visual de risco médio em risco alto.

Alterações mistas adotam o maior risco funcional ou operacional presente no diff. Se um metadado acompanhar uma mudança sensível, prevalece o risco alto. Em caso de dúvida real sobre o impacto, adotar o maior nível.

Em risco médio ou alto, cada critério de aceite deve indicar antes da implementação qual evidência o comprovará. Na entrega, reutilizar a mesma identificação e registrar evidência obtida e resultado. Tabelas são opcionais; uma lista `CA → evidência` é suficiente.

### Cenários visuais aplicáveis

Quando houver impacto visual, o plano deve selecionar somente os cenários que podem ser afetados: celular, orientação horizontal, desktop, conteúdo longo, estados especiais, toque, teclado, foco visível e redução de movimento. A seleção é proporcional ao componente; capturas não são obrigatórias quando outra evidência comprovar o critério.

## Fase 3 — Preparação da branch

Após a aprovação:

1. confirmar novamente que o working tree está limpo;
2. partir da `main` atualizada, conforme orientação humana;
3. criar a branch aprovada com o prefixo apropriado:
   - `feature/*` para funcionalidades;
   - `fix/*` para correções;
   - `docs/*` para documentação;
   - `hotfix/*` para correções urgentes.

Não trocar de branch descartando alterações existentes.

## Fase 4 — Implementação

- Alterar somente os arquivos e comportamentos aprovados.
- Preservar código e documentação não relacionados.
- Preferir mudanças pequenas e reversíveis.
- Não introduzir dependências, migrações ou mudanças de infraestrutura sem aprovação específica.
- Não corrigir problemas incidentais fora do escopo; registrá-los para decisão humana.
- Reavaliar o plano se surgir risco ou impacto não previsto.

### Tarefas exclusivamente documentais

- Não alterar código, SQL, Supabase, Netlify ou funcionalidades.
- Manter versão, changelog e roadmap inalterados, salvo necessidade prevista no plano ou nova aprovação.
- Evitar duplicação e estabelecer links claros entre documentos.
- Verificar títulos, hierarquia, caminhos, consistência terminológica e codificação UTF-8.

## Fase 5 — Validação

Aplicar validação proporcional:

### Código ou configuração

```powershell
npm run check
```

Executar também testes específicos do escopo.

### Impacto funcional ou visual

```powershell
netlify dev
```

Validar manualmente o fluxo afetado em `http://localhost:8888`.

### Somente documentação

- revisar o diff;
- verificar os arquivos alterados com Git;
- executar `git ls-files --others --exclude-standard` e revisar o conteúdo integral de cada arquivo novo;
- confirmar que arquivos novos esperados aparecem na revisão e que temporários não foram incluídos;
- conferir links e referências;
- confirmar que nenhum arquivo fora do escopo mudou;
- executar `npm run check` quando solicitado ou pertinente ao conjunto de verificações do projeto.

Falhas devem ser relatadas com o comando, a causa conhecida e o impacto. Não mascarar resultados.

Para qualquer tipo de tarefa, a revisão deve considerar separadamente alterações em arquivos rastreados e arquivos novos ainda não rastreados. O conteúdo completo de cada arquivo novo deve ser inspecionado, pois ele pode não aparecer em `git diff` sem opções adicionais.

## Fase 6 — Entrega para revisão

Antes de solicitar revisão humana, apresentar:

- branch atual;
- nível de risco aplicado;
- arquivos modificados;
- resumo por arquivo;
- áreas preservadas;
- critérios de aceite e resultados e, em risco médio ou alto, evidências obtidas associadas;
- limitações, riscos ou pendências;
- diff completo ou uma forma objetiva de revisá-lo;
- saídas de `git status --short`, `git diff --name-only` e `git ls-files --others --exclude-standard`.

O agente deve parar nesse ponto quando a tarefa pedir revisão antes da publicação.

## Fase 7 — Publicação

Somente executar cada ação quando houver autorização explícita:

1. revisar o escopo do stage;
2. criar commit com mensagem objetiva;
3. fazer push da branch;
4. abrir Pull Request, preferencialmente como Draft;
5. acompanhar checks e Netlify Deploy Preview quando aplicável.

Arquivos temporários não devem entrar no commit.

## Fase 8 — Merge

- Nunca fazer merge automaticamente.
- O merge depende de revisão humana.
- Não excluir a branch local ou remota durante o merge.
- Após o merge, confirmar seu resultado e aguardar autorização explícita para iniciar o modo Encerramento.

## Fase 9 — Encerramento

Após autorização explícita para iniciar este modo:

1. confirmar que o merge foi concluído;
2. atualizar a referência local da `main` e confirmar o deploy quando isso fizer parte do plano aprovado;
3. remover por padrão a branch local já integrada;
4. remover por padrão a branch remota já integrada;
5. preservar uma ou ambas somente quando o usuário solicitar explicitamente;
6. apresentar branch atual, status do Git e resultado de cada ação.

A aprovação do Encerramento autoriza as ações previstas no plano aprovado para esse modo, sem exigir uma nova autorização individual para cada remoção. Se o merge não estiver confirmado, a branch contiver trabalho não integrado ou surgir qualquer divergência de alvo, interromper antes da exclusão.

## Responsabilidades

### Humano

- define objetivo e critérios;
- aprova plano e mudanças de escopo;
- revisa a entrega;
- autoriza publicação;
- decide o merge.

### Codex

- inspeciona o repositório;
- identifica riscos e inconsistências;
- propõe o plano;
- implementa o escopo aprovado;
- valida e apresenta evidências;
- interrompe diante de bloqueios ou necessidade de nova decisão.

### ChatGPT ou responsável funcional

- pode apoiar definição funcional, arquitetura, UX e critérios de aceite;
- não substitui a fonte da verdade registrada no repositório nem a aprovação humana exigida.

## Condições de interrupção

Interromper a execução quando:

- o working tree não estiver limpo antes da tarefa;
- houver conflito entre instruções;
- o escopo necessário exceder o aprovado;
- surgir risco a dados, produção, autenticação ou regras protegidas;
- uma dependência essencial estiver ausente;
- os critérios de aceite forem insuficientes para uma decisão segura.

Descrever o bloqueio e aguardar orientação, sem improvisar.
