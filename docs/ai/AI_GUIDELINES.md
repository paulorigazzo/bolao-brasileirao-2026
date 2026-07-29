# Diretrizes para agentes de IA

## Finalidade

Este documento complementa o `AGENTS.md` com orientações para Codex, ChatGPT, GitHub Copilot e outros agentes que trabalhem no repositório.

## Princípios

1. **Ler antes de alterar**  
   Consulte a documentação e os arquivos diretamente relacionados antes de propor mudanças.

2. **Escopo mínimo**  
   Altere somente o necessário para atender à tarefa. Não aproveite a entrega para fazer refatorações paralelas.

3. **Fonte da verdade**  
   O código em `main` e a documentação oficial do repositório prevalecem sobre contexto externo, pacotes antigos ou versões locais.

4. **Preservação explícita**  
   Toda entrega deve declarar quais telas, fluxos e regras foram preservados.

5. **Evidência de validação**  
   Informe comandos executados, testes realizados, limitações encontradas e itens não testados.

## Formato esperado de uma entrega

Toda proposta ou Pull Request deve incluir:

- objetivo;
- escopo;
- arquivos alterados;
- comportamento anterior;
- comportamento novo;
- áreas preservadas;
- testes executados;
- critérios de aceite;
- riscos e limitações;
- plano de rollback, quando necessário.

## Restrições

- Não alterar `main` diretamente.
- Não fazer merge automático.
- Não alterar regras de pontuação sem Sprint específica.
- Não modificar banco, autenticação ou RLS sem revisão dedicada.
- Não apagar dados históricos.
- Não criar dependências externas desnecessárias.
- Não substituir arquivos não citados no escopo.
- Não editar telas congeladas sem autorização explícita.

## Qualidade de código

- Manter JavaScript modular.
- Reutilizar funções e componentes existentes.
- Evitar lógica duplicada.
- Usar nomes claros em português ou inglês conforme o padrão já adotado no módulo.
- Manter compatibilidade com o ambiente Netlify e Supabase.
- Preservar o funcionamento mobile-first.

## Validação mínima

Quando aplicável:

```powershell
npm install
netlify dev
npm run check
```

Além disso, validar manualmente o fluxo afetado em `http://localhost:8888`.

## Uso de contexto externo

Contexto de conversas pode ajudar a interpretar a intenção, mas não deve substituir a leitura do repositório. Em caso de divergência, sinalize a inconsistência e use a versão registrada no GitHub como referência.
