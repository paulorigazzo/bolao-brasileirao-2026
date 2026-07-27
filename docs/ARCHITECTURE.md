# Arquitetura

## Visão atual

```text
Usuário
  │
  ▼
Aplicação Web
  │
  ├── Netlify — hospedagem e deploy
  │
  ├── Supabase — autenticação e banco de dados
  │
  └── API de futebol — jogos, datas, locais e resultados
```

## Visão futura com IA

```text
Usuário
  │
  ▼
Aplicação Web
  │
  ▼
Netlify Function / Backend seguro
  │
  ├── Supabase
  ├── Motor de estatísticas determinísticas
  ├── API de futebol
  └── Serviço de IA
```

## Responsabilidades

### Front-end

- Interface.
- Navegação.
- Entrada de palpites.
- Apresentação de ranking e estatísticas.
- Contexto visual do Copiloto.

### Supabase

- Autenticação.
- Participantes.
- Palpites.
- Resultados.
- Ligas futuras.
- Políticas de acesso.

### Netlify

- Hospedagem.
- Deploy.
- Variáveis de ambiente.
- Funções serverless futuras.

### Camada de IA futura

- Interpretar métricas calculadas.
- Gerar resumos.
- Responder perguntas.
- Apoiar o administrador.

## Regras de segurança

- Nenhuma chave secreta no JavaScript do navegador.
- Funções administrativas protegidas por autenticação e autorização.
- Políticas de acesso no banco.
- Validação de dados no cliente e no backend.
