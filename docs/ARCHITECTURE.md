# Arquitetura

## Visão atual

```text
Usuário
  |
  v
Aplicação web
  |
  +-- Supabase: autenticação, participantes e dados do bolão
  +-- Netlify: hospedagem e Functions
  +-- API de futebol: jogos, datas, locais, resultados e classificação
  +-- Motor estatístico local: métricas determinísticas
```

As Netlify Functions atuais sincronizam jogos, consultam classificação e produzem diagnóstico. Não existe integração com serviço de IA.

## Responsabilidades atuais

### Front-end

- interface e navegação;
- entrada e bloqueio de palpites;
- ranking, estatísticas e Meu Time;
- administração e comunicação manual via WhatsApp;
- apresentação das métricas calculadas.

### Supabase

- autenticação e autorização;
- participantes e perfis;
- palpites e dados públicos permitidos;
- políticas de acesso;
- funções seguras de gestão e limite de participantes.

### Netlify

- hospedagem e deploy;
- variáveis de ambiente;
- sincronização, classificação e diagnóstico por Functions.

### Motor estatístico

- classificação dos jogos;
- evolução por rodada;
- perfil, recordes, regularidade, comparações e medalhas;
- modelos determinísticos de momento e recomendação.

## Evolução prevista com IA

```text
Aplicação web
  |
  v
Netlify Function autenticada
  |
  +-- Supabase
  +-- Motor de métricas verificadas
  +-- Serviço de IA
```

A camada futura de IA deve interpretar métricas prontas, sem recalcular pontuação ou alterar dados oficiais.

## Segurança

- nenhuma chave secreta no navegador;
- funções administrativas protegidas por autenticação e autorização;
- políticas de acesso no banco;
- contexto mínimo necessário enviado a serviços externos;
- nenhuma alteração automática de resultados, palpites ou histórico por IA.
