# Fluxo de desenvolvimento com Codex

## Finalidade

Este documento descreve o procedimento operacional para tarefas executadas com o Codex. As regras obrigatórias estão em `AGENTS.md`; os princípios permanentes estão em `docs/ai/DEVELOPMENT_PRINCIPLES.md`.

## Modos de execução

- **Planejamento:** inspeção, análise e proposta, sem alteração de arquivos.
- **Implementação:** alteração e validação do escopo aprovado.
- **Publicação:** commit, push, Pull Request ou outra entrega autorizada.
- **Recuperação:** diagnóstico e retorno a um estado seguro após falha, regressão ou interrupção.

Uma tarefa pode passar por mais de um modo, mas cada transição depende da autorização aplicável. Implementação não concede permissão automática para Publicação.

## Estados de uma tarefa

Toda tarefa percorre os seguintes estados:

1. análise;
2. plano;
3. aprovação humana;
4. implementação;
5. validação;
6. revisão humana;
7. publicação autorizada, quando aplicável.

Nenhuma aprovação é presumida. Aprovar o plano não autoriza automaticamente commit, push, Pull Request ou merge.

## Checklist visual resumido

```text
[ ] Working tree limpo e branch confirmada
[ ] Fontes da verdade lidas
[ ] Escopo, exclusões e critérios identificados
[ ] Plano apresentado e aprovado
[ ] Branch específica criada
[ ] Implementação restrita à especificação
[ ] Diff e arquivos alterados revisados
[ ] Validações executadas e registradas
[ ] Revisão humana solicitada
[ ] Publicação realizada somente se autorizada
[ ] Merge nunca executado automaticamente
```

## 1. Análise

Antes de qualquer modificação:

1. executar `git status --short` e identificar a branch atual;
2. interromper se houver alterações pendentes;
3. ler `AGENTS.md`;
4. ler este workflow;
5. consultar as fontes da verdade e os arquivos relacionados ao escopo;
6. confirmar o estado atual da funcionalidade ou documentação;
7. identificar arquivos potencialmente afetados, exclusões, riscos e critérios de aceite.

Se a documentação e o repositório divergirem, registrar a inconsistência e não improvisar uma solução.

## 2. Plano

O plano deve declarar:

- objetivo;
- abordagem;
- arquivos potencialmente alterados;
- áreas explicitamente preservadas;
- validações previstas;
- impactos em versão, changelog, release e roadmap;
- ações Git previstas.

O agente deve aguardar aprovação humana explícita antes de editar arquivos.

Se a aprovação alterar branch, escopo ou validações, incorporar os ajustes antes de iniciar.

## 3. Preparação da branch

Após a aprovação:

1. confirmar novamente que o working tree está limpo;
2. partir da `main` atualizada, conforme orientação humana;
3. criar uma branch apropriada:
   - `feature/*` para funcionalidades;
   - `fix/*` para correções;
   - `docs/*` para documentação;
   - `hotfix/*` para correções urgentes.

Não trocar de branch descartando alterações existentes.

## 4. Implementação

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

## 5. Validação

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
- conferir links e referências;
- confirmar que nenhum arquivo fora do escopo mudou;
- executar `npm run check` quando solicitado ou pertinente ao conjunto de verificações do projeto.

Falhas devem ser relatadas com o comando, a causa conhecida e o impacto. Não mascarar resultados.

## 6. Entrega para revisão

Antes de solicitar revisão humana, apresentar:

- branch atual;
- arquivos modificados;
- resumo por arquivo;
- áreas preservadas;
- validações executadas e seus resultados;
- critérios de aceite atendidos;
- limitações, riscos ou pendências;
- diff completo ou uma forma objetiva de revisá-lo.

O agente deve parar nesse ponto quando a tarefa pedir revisão antes da publicação.

## 7. Commit, push e Pull Request

Somente executar cada ação quando houver autorização explícita:

1. revisar o escopo do stage;
2. criar commit com mensagem objetiva;
3. fazer push da branch;
4. abrir Pull Request, preferencialmente como Draft;
5. acompanhar checks e Netlify Deploy Preview quando aplicável.

Arquivos temporários não devem entrar no commit.

## 8. Merge e encerramento

- Nunca fazer merge automaticamente.
- O merge depende de revisão humana.
- Após o merge, confirmar o estado da `main` e do deploy quando solicitado.
- Excluir branches somente com autorização ou conforme processo humano estabelecido.

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
