# Reavaliação de testes por fluxo e narrativa assistida por IA

## Identificação

- Data da decisão: **3 de agosto de 2026**.
- Versão analisada: `v6.13.0`.
- Itens avaliados: testes automatizados por fluxo e narrativa assistida por IA.
- Resultado: ambos adiados, sem cancelamento definitivo.

## Objetivo

Verificar se as duas prioridades propostas entregariam valor proporcional ao esforço e ao risco no estado atual do produto, antes de iniciar alterações em código, interface ou infraestrutura.

## Critérios utilizados

A análise considerou:

- valor percebido pelo participante e pela administração;
- existência de falha grave ou necessidade concreta;
- redundância com funcionalidades já disponíveis;
- risco de regressão em regras de negócio protegidas;
- impacto sobre telas sensíveis ou congeladas;
- necessidade de dependências, backend ou infraestrutura adicional;
- custo de operação e manutenção;
- capacidade de validar o resultado de forma objetiva;
- possibilidade de uma solução menor e determinística.

## 1. Testes automatizados por fluxo

### Estado encontrado

O projeto já possui verificações automatizadas para:

- motor estatístico;
- Destaques da Rodada;
- duelo entre participantes;
- resumo administrativo da rodada;
- calendário de partidas;
- política de status e placar da sincronização;
- sintaxe, versões e integridade geral do projeto.

Essas verificações integram o pipeline das Pull Requests.

Não existe atualmente uma infraestrutura de teste de navegador para simular autenticação, interface e Supabase de ponta a ponta.

### Lacuna relevante

O fluxo mais importante ainda sem cobertura direta é o registro de palpites respeitando o prazo da partida. Entretanto, as decisões de bloqueio, validação e salvamento estão integradas à Tela de Jogos e ao acesso ao Supabase.

Uma cobertura ampla exigiria ao menos uma destas intervenções:

- extrair regras internas da Tela de Jogos para módulos testáveis;
- introduzir ferramenta de automação de navegador;
- criar dados, autenticação e ambiente controlado para testes;
- simular ou integrar o Supabase durante os cenários.

### Riscos considerados

- bloquear palpites antes do horário correto;
- permitir palpites após o fechamento;
- alterar o tratamento de partidas adiadas;
- modificar o comportamento de salvamento individual ou coletivo;
- introduzir divergência entre interface e proteção do banco;
- aumentar a manutenção técnica sem falha grave comprovada.

### Decisão

Adiar a expansão dos testes automatizados por fluxo. A decisão preserva os testes determinísticos e o pipeline atuais.

### Condições para retomada

O item poderá ser reavaliado quando ocorrer ao menos uma destas condições:

- regressão real e reproduzível em fluxo essencial;
- mudança aprovada em regra protegida que exija nova cobertura;
- infraestrutura de teste compatível disponível sem intervenção desproporcional;
- necessidade operacional recorrente que não possa ser validada pelos testes atuais;
- escopo específico aprovado para testes de navegador ou integração.

## 2. Narrativa assistida por IA

### Estado encontrado

O produto já oferece conteúdo determinístico e rastreável em diferentes pontos:

- momento e recomendações nas Estatísticas;
- tendências, especialidades e evolução por rodada;
- Destaques pessoais e coletivos da rodada;
- consulta histórica dos Destaques;
- duelo divertido entre participantes;
- resumo coletivo administrativo revisável.

Uma narrativa generativa ampla tenderia a reapresentar os mesmos fatos com palavras diferentes.

### Possíveis impactos

- **Home:** risco de ruído e duplicidade em uma tela sensível.
- **Estatísticas:** forte sobreposição com momento, recomendações e insights existentes.
- **Destaques da Rodada:** ganho principalmente estilístico, pois os fatos já estão priorizados.
- **Área ADM:** redundância com o resumo coletivo determinístico e revisável.
- **Jogos:** deve permanecer preservada.

### Complexidade e riscos considerados

- função segura no backend e integração por gateway de IA;
- nova dependência e serviço externo;
- autenticação, limitação de chamadas e monitoramento;
- custo e latência por uso;
- indisponibilidade e necessidade de fallback;
- respostas não determinísticas ou não comprovadas pelos dados;
- exposição desnecessária de nomes ou informações de participantes;
- dificuldade de testar qualidade textual de forma objetiva;
- confusão entre fatos oficiais e interpretação gerada.

### Decisão

Adiar funcionalidades associadas à IA enquanto não houver caso de uso com valor adicional demonstrado. A fase de IA permanece no Roadmap como direção futura, sem prioridade imediata.

### Possibilidade futura preservada

A explicação das mudanças no Ranking é a candidata com menor redundância. Caso seja retomada, deverá:

- começar por um cálculo determinístico das causas da movimentação;
- apresentar dados de uma rodada concluída e identificada;
- evitar previsões e recomendações de aposta;
- usar IA apenas se a redação generativa demonstrar ganho real;
- possuir fallback determinístico;
- preservar Home, Jogos e compartilhamento pelos participantes.

É possível que a explicação determinística seja suficiente e torne a IA dispensável.

### Condições para retomada

O item poderá ser reavaliado quando ocorrer ao menos uma destas condições:

- necessidade concreta de compreensão que os textos atuais não atendam;
- caso de uso sem duplicidade com Estatísticas, Destaques ou mensagens administrativas;
- valor validado com participantes ou administração;
- backend seguro, controle de uso e fallback definidos;
- escopo pequeno, mensurável e explicitamente aprovado.

## Áreas preservadas

Esta decisão não altera:

- código, telas ou comportamento do aplicativo;
- Tela de Jogos ou estrutura da Home;
- regras de palpites, pontuação, resultados ou ranking;
- Supabase, RLS, autenticação ou dados históricos;
- Netlify, Functions ou variáveis de ambiente;
- testes determinísticos e pipeline existentes;
- versão funcional do produto.

## Próximo passo

Não promover automaticamente outro item do Backlog. A próxima entrega deverá ser escolhida após análise específica de valor, esforço, redundância e risco.
