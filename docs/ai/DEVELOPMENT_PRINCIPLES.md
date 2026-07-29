# Princípios de desenvolvimento

## Finalidade

Estes princípios orientam decisões de engenharia e governança no Bolão Brasileirão 2026. Eles complementam as regras obrigatórias de `AGENTS.md` e o procedimento de `docs/ai/CODEX_WORKFLOW.md`.

## 1. Fonte da verdade no repositório

Código, documentação oficial e histórico Git prevalecem sobre conversas, cópias locais, pacotes antigos e suposições. Divergências devem ser explicitadas antes da implementação.

## 2. Escopo mínimo

Cada entrega deve resolver um objetivo claro com a menor alteração segura. Refatorações, correções incidentais e melhorias paralelas exigem escopo próprio.

## 3. Preservação explícita

Uma mudança não deve afetar silenciosamente áreas relacionadas. Toda entrega declara o que foi alterado e o que foi preservado, especialmente regras de negócio, dados históricos, mobile-first, acessibilidade, Supabase e Netlify.

## 4. Aprovação por etapas

Plano, implementação, commit, push, Pull Request e merge são etapas distintas. A autorização de uma etapa não implica autorização das seguintes.

## 5. Mudanças pequenas e reversíveis

Preferir alterações fáceis de revisar, testar e reverter. Quando uma mudança não puder ser naturalmente reversível, documentar mitigação ou rollback antes da publicação.

## 6. Evidência antes de conclusão

Uma tarefa só é considerada pronta para revisão quando há evidências proporcionais ao risco: diff revisado, verificações executadas, resultados informados e limitações declaradas.

## 7. Regras de negócio centralizadas

Não duplicar pontuação, fechamento de palpites, identidade de participantes ou ciclo de vida de partidas. Reutilizar a fonte canônica existente.

## 8. Segurança por padrão

Proteger segredos, dados pessoais, autenticação, RLS e produção. Mudanças de banco e infraestrutura exigem revisão específica; operações destrutivas não são solução padrão.

## 9. Mobile First

Projetar e validar primeiro para telas pequenas, interações por toque e condições reais de uso móvel. A experiência em telas maiores deve ampliar a solução sem comprometer responsividade, acessibilidade, desempenho ou legibilidade.

## 10. Valor percebido pelo usuário

Priorizar mudanças cujo benefício seja compreensível e observável pelo usuário. Complexidade técnica só se justifica quando melhora clareza, confiança, utilidade, desempenho ou qualidade da experiência sem comprometer as regras do produto.

## 11. Compatibilidade e experiência

Preservar acessibilidade, desempenho, compatibilidade e identidade visual. Mudanças devem respeitar os padrões já usados no módulo afetado.

## 12. Dependências com propósito

Não adicionar dependências por conveniência. Uma nova dependência deve ter necessidade demonstrável, custo avaliado e aprovação explícita.

## 13. Documentação sem duplicação

Cada informação duradoura deve ter uma fonte oficial. Outros documentos devem apontar para ela, em vez de manter cópias que possam divergir.

## 14. Decisões rastreáveis

Decisões técnicas ou de governança que influenciem trabalhos futuros devem registrar contexto, decisão, consequências e estado em `docs/ai/DECISION_LOG.md`.

## 15. Comunicação objetiva

Planos e entregas devem distinguir fatos observados, decisões humanas, hipóteses e itens não verificados. Erros e limitações devem ser comunicados sem ocultação.

## 16. Parar com segurança

Quando faltar autorização, informação essencial ou condição segura de execução, interromper e pedir orientação. Não usar improvisação para contornar governança.

## Checklist de aplicação

Antes de concluir uma mudança, confirmar:

- o objetivo aprovado foi atendido;
- nenhum escopo paralelo foi incluído;
- regras e áreas protegidas foram preservadas;
- as validações são proporcionais ao risco;
- o diff contém apenas arquivos esperados;
- impactos documentais foram avaliados;
- decisões duradouras foram registradas;
- a próxima ação depende da autorização correta.
