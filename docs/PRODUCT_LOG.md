# Registro de Decisões do Produto

## 15 de agosto de 2026 — Relógio estimado como Plano B viável de baixo custo

**Decisão:** manter a football-data.org e complementar a ausência recorrente do minuto oficial com uma estimativa informativa baseada nas transições de status e calibrada por eventos de gol. O minuto oficial sempre prevalece; a estimativa é identificada por `~`, pausa no intervalo, não retrocede e deixa de ser exibida após 15 minutos extras em cada tempo.

**Motivo:** preservar a fonte atual, os custos e as regras competitivas enquanto melhora a leitura ao vivo. A estimativa não participa de fechamento de palpites, pontuação, resultados ou Ranking.

## 5 de agosto de 2026 — Bolão Brasileirão Rigazzo como produto independente

**Decisão:** desenvolver Temporadas e Ligas no novo produto Bolão Brasileirão Rigazzo, com repositório, Supabase, autenticação e Netlify próprios. O Bolão 2026 permanece oficial e fornecerá dados somente por snapshots manuais, unidirecionais e aprovados.

**Motivo:** a separação física elimina a fundação experimental do ambiente atual e permite validar importação, identidade, segurança e equivalência antes de qualquer piloto. A [arquitetura vigente](architecture/BOLAO_BRASILEIRAO_RIGAZZO.md) define o handoff entre projetos e substitui a implementação paralela anteriormente planejada.

## 4 de agosto de 2026 — Preparação de Temporadas e Bolões em transição paralela

> **Status:** substituída em 5 de agosto de 2026 pela criação do Bolão Brasileirão Rigazzo como produto independente.

**Decisão:** iniciar o planejamento da fundação de Temporadas e Bolões, preservar o Bolão 2026 como fonte oficial, usar uma cópia controlada de seus dados para auditoria e preparar 2027 como primeira temporada candidata a operar integralmente na nova arquitetura.

**Motivo:** a simples substituição anual de dados eliminaria a separação histórica, enquanto uma migração direta para múltiplos bolões teria risco desproporcional. A [arquitetura aprovada](architecture/TEMPORADAS_E_BOLOES.md) adota evolução aditiva, equivalência comprovada, isolamento de permissões e retorno antes da exposição aos participantes.

## 3 de agosto de 2026 — Testes por fluxo e narrativa assistida por IA adiados

**Decisão:** adiar a expansão dos testes automatizados por fluxo e as funcionalidades associadas à IA, preservando os testes determinísticos atuais e a fase de IA como direção futura sem prioridade imediata.

**Motivo:** a [reavaliação das duas propostas](product/ANALISE_QW2_QW3_2026-08-03.md) concluiu que a automação ampla exigiria intervenção desproporcional em áreas protegidas sem falha grave comprovada, enquanto a narrativa generativa apresentaria alta redundância e valor adicional ainda não demonstrado.

## 3 de agosto de 2026 — Acessibilidade ampla reavaliada

**Decisão:** retirar a auditoria ampliada de acessibilidade da prioridade imediata, preservar acessibilidade como requisito de todas as entregas e retomar uma iniciativa ampla quando houver barreira reproduzível, necessidade formal ou escopo dedicado.

**Motivo:** a [auditoria preliminar](accessibility/AUDIT_2026-08-03.md) encontrou uma base favorável e oportunidades de melhoria, mas não demonstrou falha crítica que justificasse uma alteração transversal e complexa neste momento.

## 31 de julho de 2026 — Destaques da rodada em evolução incremental

**Decisão:** dividir a E04.1 em um motor determinístico independente (E04.1A) e uma experiência controlada na Home (E04.1B).

**Motivo:** validar primeiro a relevância, a rastreabilidade e a segurança dos fatos produzidos, evitando alterações bruscas ou redundantes na primeira tela do aplicativo.

## 27 de julho de 2026 — Documentação viva no GitHub

**Decisão:** adotar uma pasta `docs` como fonte oficial da visão, roadmap, releases, arquitetura e decisões.

**Motivo:** preservar o contexto entre conversas, facilitar rastreabilidade e evitar divergência entre planos e código.

## 27 de julho de 2026 — IA como fase formal do produto

**Decisão:** consolidar a Inteligência Artificial como uma fase do roadmap, dividida em Copiloto, IA Estatística, Administrativa, Narrativa, Preditiva e Personalizada.

**Motivo:** impedir que as melhorias de IA desapareçam das listas futuras e preparar sua implementação por etapas.

## Julho de 2026 — Personalização por time favorito

**Decisão:** personalizar a Home e os jogos com base no time favorito sem retirar a neutralidade das demais telas.

**Motivo:** aumentar relevância pessoal sem transformar o produto em uma aplicação exclusiva de um clube.

## Julho de 2026 — Cards expansíveis

**Decisão:** utilizar cards de jogos compactos que podem ser expandidos.

**Motivo:** melhorar leitura e navegação em telas pequenas.

## Julho de 2026 — Migração para GitHub e Netlify

**Decisão:** substituir gradualmente o fluxo baseado apenas em arquivos ZIP por versionamento no GitHub e publicação integrada ao Netlify.

**Motivo:** melhorar histórico, segurança, colaboração e implantação.
