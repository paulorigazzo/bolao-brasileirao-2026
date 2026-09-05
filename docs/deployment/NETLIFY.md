# Deploy no Netlify

## Produção

O site de produção é publicado automaticamente pelo Netlify a partir da branch `main`. Alterações em branches `feature/*` devem ser testadas localmente e revisadas por Pull Request antes do merge.

## Desenvolvimento local

Na raiz do projeto, execute:

```powershell
netlify dev
```

A aplicação ficará disponível em:

```text
http://localhost:8888
```

O ambiente local carrega o site estático e as Netlify Functions. A mensagem `No app server detected. Using simple static server` é esperada neste projeto.

## Verificação antes do deploy

```powershell
npm run check
```

O comando valida a estrutura do projeto, a sintaxe JavaScript, o motor de estatísticas e a política de status das partidas.

## Deploy manual de contingência

O deploy manual deve ser usado somente como contingência. Extraia o pacote e envie a pasta do projeto pela área de deploy do Netlify. Não use o deploy manual como substituto do fluxo GitHub → Pull Request → `main`.

## Banco de dados e variáveis

Uma atualização de interface ou documentação não exige SQL nem alteração de variáveis de ambiente, salvo quando a nota específica da versão disser o contrário.

### Web Push

Os lembretes manuais exigem três variáveis protegidas no Netlify:

- `VAPID_SUBJECT`: contato do responsável, em formato `mailto:` ou URL HTTPS;
- `VAPID_PUBLIC_KEY`: chave pública entregue aos navegadores autorizados;
- `VAPID_PRIVATE_KEY`: chave privada, disponível somente para a Function.

O mesmo par de chaves deve ser preservado entre deploys. A chave privada nunca deve ser colocada em arquivos públicos, logs ou respostas da aplicação.
