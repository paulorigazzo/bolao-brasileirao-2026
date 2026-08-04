# Homologação H01 do workflow proporcional ao risco

## Finalidade

Avaliar a clareza, a proporcionalidade, a rastreabilidade, o custo e a segurança do modelo definido pela D03 e registrado na DEC-2026-004, antes de aplicá-lo em trabalho sensível.

A H01 é uma reexecução documental de três entregas reais. Nenhum código histórico, migração, interface ou comportamento foi executado ou alterado.

## Metodologia

Foram selecionadas entregas representativas dos três níveis propostos:

| Caso | Entrega | Referência | Nível esperado |
| --- | --- | --- | --- |
| L | D03 — workflow proporcional | PR #86, commit `67f6c72`, merge `cb64db2` | Baixo |
| M | v6.11.1 — refinamentos de layout mobile | PR #74, commits `e128242` e `a0b3f54`, merge `00f3f8b` | Médio |
| H | v6.8.0 — cadastro consolidado | PR #58, commit `205fe2b`, merge `376e76a` | Alto |

Cada caso foi comparado com `AGENTS.md`, `CODEX_WORKFLOW.md`, seus diffs e a documentação da entrega. Evidências não presentes no repositório foram classificadas como indisponíveis, sem presunção de execução.

## Caso L — Risco baixo

### Escopo observado

A D03 alterou somente:

- `AGENTS.md`;
- `docs/ai/CODEX_WORKFLOW.md`;
- `docs/ai/CODEX_PROMPT.md`;
- `docs/ai/DECISION_LOG.md`.

Foram 88 inserções e 11 remoções exclusivamente documentais, sem mudança de código, versão, Supabase, Netlify ou prioridade do produto.

### Critérios reconstruídos e evidências

| Critério | Evidência histórica | Resultado |
| --- | --- | --- |
| Somente quatro documentos aprovados | Diff do merge `cb64db2` | Atendido |
| Links locais válidos | Verificação registrada na entrega | Atendido |
| Decisão com identificador único | DEC-2026-004 e verificação registrada | Atendido |
| Projeto preservado | `npm.cmd run check` registrado e checks do PR aprovados | Atendido |
| Portões Git independentes | Sequência documentada de aprovações e merge | Atendido |

### Avaliação

- Clareza: alta; a classificação não exige interpretação adicional.
- Proporcionalidade: adequada; diff, links, consistência e verificação geral foram suficientes.
- Rastreabilidade: adequada para risco baixo, sem necessidade de tabela obrigatória.
- Custo: aceitável.
- Segurança: nenhuma área sensível foi tocada.

**Resultado do caso:** adequado.

## Caso M — Risco médio visual

### Escopo observado

A v6.11.1 corrigiu:

- barra flutuante em celular na orientação horizontal e em alturas reduzidas;
- espaço para identidade na classificação mobile;
- sobreposição do estado parcial no histórico do duelo.

O comportamento, a pontuação, o Supabase e a experiência desktop foram declarados como preservados. O diff funcional concentrou-se em CSS responsivo; os demais arquivos sincronizaram documentação, cache e identificadores de versão.

### Cenários aplicáveis

| Critério | Evidência esperada pela D03 | Evidência histórica localizada | Resultado |
| --- | --- | --- | --- |
| Manter cinco destinos na horizontal | Celular horizontal e toque | CSS específico para `orientation: landscape`, altura reduzida e ponteiro coarse | Parcial: regra localizada; execução manual não registrada no repositório |
| Preservar acessibilidade da navegação | Teclado, foco e destinos | Nota de release declara preservação | Parcial: evidência de interação indisponível |
| Evitar perda de identidade no Ranking | Celular comum, estreito e conteúdo longo | Regras para 780 e 360 pixels, truncamento e redistribuição de colunas | Parcial: cenários implementados; registro visual indisponível |
| Evitar sobreposição no Duelo | Estado parcial e telas estreitas | Reorganização da grade e limite de texto no CSS | Parcial: estado tratado; execução manual não registrada |
| Preservar desktop | Cenário desktop | Regras limitadas por media queries e nota de release | Atendido por inspeção estrutural |

### Ambiguidade encontrada

O mesmo PR alterou `netlify/functions/_constants.mjs` exclusivamente de:

```text
APP_VERSION = "6.11.0b"
```

para:

```text
APP_VERSION = "6.11.1"
```

A D03 declara genericamente que “Functions” são sempre risco alto. Pela leitura literal, essa sincronização sem mudança de comportamento elevaria toda a entrega visual a risco alto. Pela finalidade e pelo impacto real, a entrega é risco médio.

A classificação não deve depender apenas do diretório do arquivo. Deve considerar se houve mudança funcional, operacional, de dados, permissão, segurança ou produção. Metadados e identificadores sincronizados devem herdar o risco do escopo que representam, salvo quando alterarem efetivamente o comportamento sensível.

### Avaliação

- Clareza: insuficiente diante de arquivos sensíveis alterados apenas como metadado.
- Proporcionalidade: adequada para o CSS, excessiva pela leitura literal do gatilho de Functions.
- Rastreabilidade: o modelo evidencia corretamente quais validações visuais não ficaram registradas.
- Custo: aceitável se os gatilhos forem esclarecidos; excessivo sem o ajuste.
- Segurança: não houve mudança funcional de Function.

**Resultado do caso:** ajuste necessário.

## Caso H — Risco alto

### Escopo observado

A v6.8.0 incluiu:

- formulário inicial com nome, telefone e time favorito;
- persistência temporária durante OAuth;
- leitura e escrita de dados pessoais;
- novas RPCs com `security definer`;
- migração aditiva no Supabase;
- criação de perfil após aprovação;
- rollback de aplicação documentado.

Autenticação, dados, Supabase, migração e autorização tornam a classificação alta inequívoca.

### Critérios reconstruídos e evidências

| Critério | Evidência histórica localizada | Resultado |
| --- | --- | --- |
| Exigir autenticação Google | Validações de `auth.uid()` e e-mail do JWT nas RPCs | Atendido por inspeção |
| Preservar aprovação antes do acesso | Estado `pending`, verificação de `approved` e participante ativo | Atendido por inspeção |
| Normalizar e proteger dados enviados | Validação de nome, telefone e limite do time no frontend e banco | Atendido por inspeção |
| Persistir dados durante OAuth | Rascunho em `sessionStorage` e restauração no retorno | Atendido por inspeção |
| Manter migração aditiva | `add column if not exists`, RPCs versionadas e funções anteriores preservadas | Atendido |
| Oferecer retorno seguro | Rollback de frontend e permanência compatível das estruturas aditivas | Atendido documentalmente |
| Impedir acesso indevido e validar cenários negativos | Exceções de sessão inválida e cadastro não aprovado | Parcial: lógica localizada; execução dos cenários não registrada |
| Confirmar políticas e permissões completas | Grants para `authenticated`; nenhuma evidência histórica específica de revisão RLS localizada | Indisponível |
| Preservar dados históricos | Migração aditiva e nota de preservação | Atendido documentalmente |

O script de verificação passou a exigir o formulário, o uso da RPC v2 e a presença da migração. Isso comprova integração estrutural, mas não substitui testes negativos de autenticação, permissões e privacidade.

### Avaliação

- Clareza: alta; diversos gatilhos independentes apontam para risco alto.
- Proporcionalidade: adequada; rollback, segurança, cenários negativos e preservação são necessários.
- Rastreabilidade: o modelo distingue evidência estrutural de teste efetivamente executado.
- Custo: superior ao de uma tarefa comum, mas proporcional ao impacto.
- Segurança: o workflow atual exporia como pendentes testes e revisões que não podem ser presumidos.

**Resultado do caso:** adequado.

## Avaliação geral

| Dimensão | Resultado | Conclusão |
| --- | --- | --- |
| Clareza | Parcial | Baixo e alto são inequívocos; o caso médio revelou ambiguidade por caminho de arquivo |
| Proporcionalidade | Parcial | Pisos são adequados, mas o gatilho literal pode superdimensionar tarefas |
| Rastreabilidade | Adequada | O modelo separa evidência localizada, parcial e indisponível |
| Custo | Adequado com ajuste | Não exige tabelas no baixo; o médio precisa evitar elevação artificial |
| Segurança | Adequada | O caso alto recebe rollback, cenários negativos, isolamento e permissões |

## Decisão da H01

**Resultado: ajuste necessário.**

A D03 comprovou valor e acertou a separação entre os pisos de validação. Entretanto, a classificação ainda não é suficientemente inequívoca para trabalho sensível porque a lista de gatilhos pode ser interpretada somente pelo caminho do arquivo.

Antes de aplicar o modelo em Temporadas e Bolões ou outro trabalho sensível, uma D03.1 deve esclarecer:

1. gatilhos altos decorrem de mudança funcional ou operacional na área protegida;
2. documentação, referências, metadados e sincronização de versão não elevam o risco por si só;
3. arquivos mistos adotam o maior risco do comportamento efetivamente alterado;
4. em caso de dúvida sobre impacto, o maior nível continua prevalecendo.

A H01 não autoriza nem implementa esse ajuste. O workflow normativo permanece inalterado nesta entrega.

## Limitações

- A reexecução usa evidências preservadas no repositório, não memória de sessões antigas.
- Testes manuais ou visuais sem registro persistente foram classificados como indisponíveis.
- A análise do caso alto não executou migração, autenticação ou acesso ao Supabase.
- A qualidade funcional das entregas históricas não foi reaberta; elas serviram apenas para calibrar o workflow.

## Próximo passo

Planejar uma D03.1 documental, pequena e restrita ao esclarecimento dos gatilhos de classificação. Depois da integração, uma verificação curta deve reaplicar o caso M e confirmar que a classificação se torna inequívoca sem enfraquecer o caso H.
