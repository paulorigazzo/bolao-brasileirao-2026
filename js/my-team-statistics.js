const SCOPES = { all: "Geral", home: "Em casa", away: "Fora" };
const number = value => (typeof value === "number" || typeof value === "string") && String(value).trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const fmt = value => value == null ? "—" : value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const integer = value => value == null ? "—" : String(Math.round(value));
const sample = count => `${count} ${count === 1 ? "jogo" : "jogos"}`;

function metric(rows, keys, calculate) {
  const valid = rows.filter(row => keys.every(key => row[key] != null));
  return { value: valid.length ? calculate(valid) : null, games: valid.length };
}
const average = key => rows => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
const sum = key => rows => rows.reduce((value, row) => value + row[key], 0);

function recentEvolution(rows, field) {
  const window = rows.slice(-10);
  const valid = row => row[field] != null && Number.isFinite(row.kickoff);
  let consecutive = 0;
  for (let i = window.length - 1; i >= 0 && valid(window[i]); i--) consecutive++;
  const coverage = { available: window.filter(valid).length, window: window.length, consecutive };
  const size = consecutive >= 10 ? 5 : consecutive >= 6 ? 3 : 0;
  if (size) {
    const period = window.slice(-size * 2);
    const before = average(field)(period.slice(0, size)), recent = average(field)(period.slice(size));
    return { mode: "comparison", size, games: size * 2, before, recent, delta: recent - before, ...coverage };
  }
  if (consecutive >= 3) return { mode: "average", games: consecutive, average: average(field)(window.slice(-consecutive)), ...coverage };
  return { mode: "insufficient", games: consecutive, ...coverage };
}

// The application supplies its canonical completed-game and team-name rules.
export function buildMyTeamStatistics({ team, games = [], projections = [], scope = "all", normalizeTeamKey, isScorableGame } = {}) {
  const selectedScope = Object.hasOwn(SCOPES, scope) ? scope : "all";
  const key = normalizeTeamKey(team?.name || "");
  const byGame = new Map(projections.map(item => [Number(item.id_jogo), item]));
  const seen = new Set();
  const rows = games.filter(game => {
    const home = normalizeTeamKey(game.time_casa) === key;
    const away = normalizeTeamKey(game.time_fora) === key;
    if (!key || (!home && !away) || !isScorableGame(game) || seen.has(Number(game.id_jogo))) return false;
    if (selectedScope === "home" && !home || selectedScope === "away" && !away) return false;
    seen.add(Number(game.id_jogo));
    return true;
  }).map(game => {
    const home = normalizeTeamKey(game.time_casa) === key;
    const projection = byGame.get(Number(game.id_jogo));
    const matches = Number.isInteger(Number(game.api_football_id)) && Number(game.api_football_id) > 0 && Number(projection?.id_externo) === Number(game.api_football_id);
    const own = matches ? projection?.estatisticas?.[home ? "home" : "away"] : null;
    const opponent = matches ? projection?.estatisticas?.[home ? "away" : "home"] : null;
    const row = { id: Number(game.id_jogo), kickoff: Date.parse(game.inicio), round: Number(game.rodada), goals: Number(home ? game.gols_casa : game.gols_fora), conceded: Number(home ? game.gols_fora : game.gols_casa) };
    for (const field of ["shots", "shotsOnTarget", "possession", "fouls", "yellowCards", "redCards", "corners"]) row[field] = number(own?.[field]);
    row.against = number(opponent?.shots);
    row.againstTarget = number(opponent?.shotsOnTarget);
    row.againstCorners = number(opponent?.corners);
    if (row.possession > 100) row.possession = null;
    if (row.shots != null && row.shotsOnTarget > row.shots) row.shotsOnTarget = null;
    if (row.against != null && row.againstTarget > row.against) row.againstTarget = null;
    return row;
  }).sort((a, b) => (Number.isFinite(a.kickoff) && Number.isFinite(b.kickoff) ? a.kickoff - b.kickoff : a.round - b.round) || a.id - b.id);

  const metrics = {};
  for (const field of ["shots", "shotsOnTarget", "against", "againstTarget", "fouls", "yellowCards", "possession", "corners", "againstCorners"]) metrics[field] = metric(rows, [field], average(field));
  metrics.redCards = metric(rows, ["redCards"], sum("redCards"));
  metrics.balance = metric(rows, ["shots", "against"], valid => valid.reduce((value, row) => value + row.shots - row.against, 0) / valid.length);
  const ratio = (numerator, denominator) => valid => {
    const bottom = sum(denominator)(valid);
    return bottom ? sum(numerator)(valid) / bottom * 100 : null;
  };
  metrics.accuracy = metric(rows, ["shots", "shotsOnTarget"], ratio("shotsOnTarget", "shots"));
  metrics.conversion = metric(rows, ["shots"], ratio("goals", "shots"));
  metrics.clean = { value: rows.filter(row => row.conceded === 0).length, games: rows.length };

  const window = rows.slice(-10);
  const comparison = field => {
    if (window.length < 10 || window.some(row => row[field] == null || !Number.isFinite(row.kickoff))) return null;
    const before = average(field)(window.slice(0, 5)), recent = average(field)(window.slice(5));
    return { before, recent, delta: recent - before };
  };
  return { scope: selectedScope, games: rows.length, metrics, trends: { attack: recentEvolution(rows, "shotsOnTarget"), defense: recentEvolution(rows, "againstTarget"), discipline: comparison("yellowCards") } };
}

const escapeText = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

export function renderMyTeamNumberCard({ label, title = label, icon = "⚽", value, unit = "", sampleText = "", gold = false, percent = false } = {}) {
  return `<article class="home-mini-card club-stat${gold ? " mini-tone-gold" : ""}" aria-label="${escapeText(label)}"><span class="mini-card-icon" aria-hidden="true">${escapeText(icon)}</span><span>${escapeText(title)}</span><strong>${escapeText(value ?? "—")}${percent && value != null ? '<em>%</em>' : ""}</strong><small><span class="club-stat-unit">${escapeText(unit)}</span>${sampleText ? `<span>${escapeText(sampleText)}</span>` : ""}</small></article>`;
}

function stat(label, item, { percent = false, signed = false, whole = false, showSample = true } = {}) {
  const value = item.value == null ? "—" : `${signed && item.value > 0 ? "+" : ""}${whole ? integer(item.value) : fmt(item.value)}`;
  const headings = {
    "Finalizações / jogo": ["Finalizações", "⚽", "por jogo"],
    "No gol / jogo": ["No gol", "🎯", "por jogo"],
    "Chutes que viram gols": ["Conversão", "🥅", "chutes que viram gols"],
    "Finalizações sofridas / jogo": ["Chutes sofridos", "🛡️", "por jogo", true],
    "No gol sofridas / jogo": ["No gol sofridos", "🧤", "por jogo", true],
    "Saldo de finalizações / jogo": ["Saldo de chutes", "↔️", "por jogo", true],
    "Faltas / jogo": ["Faltas", "🚩", "por jogo", true],
    "Amarelos / jogo": ["Amarelos", "🟨", "por jogo", true],
    "Vermelhos no período": ["Vermelhos", "🟥", "no período", true],
    "Posse média": ["Posse média", "⚽", "média por jogo"],
    "Escanteios a favor / jogo": ["Escanteios a favor", "🚩", "por jogo"],
    "Escanteios contra / jogo": ["Escanteios contra", "🛡️", "por jogo", true],
  };
  const [title, icon, unit, gold] = headings[label];
  return renderMyTeamNumberCard({ label, title, icon, value, unit, gold, percent: percent && item.value != null, sampleText: showSample ? `${sample(item.games)} com dados` : "" });
}

function meter(label, item, percentage, display, showSample = true) {
  return `<div class="club-stat-meter"><div><span>${label}</span><b>${display}</b></div>${percentage == null ? "" : `<div class="club-stat-track" role="img" aria-label="${label}: ${display}"><i style="width:${Math.max(0, Math.min(100, percentage))}%"></i></div>`}${showSample ? `<small>${sample(item.games)} com dados</small>` : ""}</div>`;
}

function groupSample(items) {
  const common = items.every(item => item.games === items[0].games);
  return { showSample: !common, markup: common ? `<p class="club-stat-coverage">${sample(items[0].games)} com dados</p>` : "" };
}

function trend(title, values, id, horizontal = false) {
  if (!values) return `<div class="club-stat-trend club-stat-trend-empty"><h4>${title}</h4><p>Comparação disponível com dados válidos nos 10 jogos mais recentes.</p></div>`;
  if (values.mode === "insufficient") {
    const coverage = values.available === values.consecutive
      ? `${sample(values.available)} com dados recentes. São necessários pelo menos 3 para mostrar a média.`
      : `Dados em ${values.available} de ${values.window} jogos recentes. A sequência mais recente tem ${sample(values.consecutive)} com dados; são necessários pelo menos 3.`;
    return `<div class="club-stat-trend club-stat-trend-empty"><h4>${title}</h4><p>${coverage}</p></div>`;
  }
  if (values.mode === "average") return `<figure class="club-stat-trend club-stat-average" aria-labelledby="${id}"><figcaption id="${id}">${title}</figcaption><strong>${fmt(values.average)}</strong><p>Média nos últimos ${values.games} jogos</p></figure>`;
  const size = values.size || 5;
  const max = Math.max(values.before, values.recent, 1) * 1.2;
  const difference = Math.abs(values.delta) < .05 ? "Sem variação" : `${values.delta > 0 ? "↑" : "↓"} ${fmt(Math.abs(values.delta))} ${values.delta > 0 ? "a mais" : "a menos"} por jogo`;
  const mark = (label, value, recent) => horizontal
    ? `<div class="club-stat-horizontal"><span>${label}</span><div class="club-stat-track"><i class="${recent ? "is-recent" : ""}" style="width:${value / max * 100}%"></i></div><b>${fmt(value)}</b></div>`
    : `<div class="club-stat-column"><div class="club-stat-column-track"><i class="${recent ? "is-recent" : ""}" style="height:${value / max * 100}%"><b>${fmt(value)}</b></i></div><span>${label}</span></div>`;
  return `<figure class="club-stat-trend ${horizontal ? "is-horizontal" : ""}" aria-labelledby="${id}"><figcaption id="${id}">${title}</figcaption><div class="club-stat-bars">${mark(`Anteriores ${size}`, values.before, false)}${mark(`Últimos ${size}`, values.recent, true)}</div><p>${difference}</p>${values.mode === "comparison" ? `<p class="club-stat-period">Últimos ${size} jogos × ${size} imediatamente anteriores</p>` : ""}</figure>`;
}

export function renderMyTeamStatistics(model, { detailsOpen = false, title = "Seu time em números" } = {}) {
  const m = model.metrics;
  const scopeLabel = model.scope === "home" ? "em casa" : model.scope === "away" ? "fora de casa" : "no campeonato";
  const count = `${sample(model.games)} ${model.games === 1 ? "encerrado" : "encerrados"} ${scopeLabel}`;
  const attack = groupSample([m.shots, m.shotsOnTarget, m.conversion, m.accuracy]);
  const defense = groupSample([m.against, m.againstTarget, m.balance, m.clean]);
  const discipline = groupSample([m.fouls, m.yellowCards, m.redCards]);
  const possession = groupSample([m.possession, m.corners, m.againstCorners]);
  return `<section class="my-team-section club-statistics" aria-labelledby="clubStatisticsTitle">
    <div class="my-team-section-heading"><div><span class="eyebrow">DESEMPENHO EM CAMPO</span><h2 id="clubStatisticsTitle">${escapeText(title)}</h2></div></div>
    <div class="club-stat-filters" role="group" aria-label="Filtrar estatísticas por mando">${Object.entries(SCOPES).map(([key, label]) => `<button type="button" data-club-stat-scope="${key}" aria-pressed="${model.scope === key}">${label}</button>`).join("")}</div>
    <p class="club-stat-coverage" role="status">${count}</p>
    <div class="club-stat-panels">
      <section class="club-stat-panel" aria-labelledby="clubAttackTitle"><h3 id="clubAttackTitle"><span aria-hidden="true">🎯</span> Ataque</h3><div class="club-stat-values">${stat("Finalizações / jogo", m.shots, attack)}${stat("No gol / jogo", m.shotsOnTarget, attack)}${stat("Chutes que viram gols", m.conversion, { ...attack, percent: true })}</div>${meter("Pontaria · chutes no gol", m.accuracy, m.accuracy.value, m.accuracy.value == null ? "—" : `${fmt(m.accuracy.value)}%`, attack.showSample)}${attack.markup}</section>
      <section class="club-stat-panel is-defense" aria-labelledby="clubDefenseTitle"><h3 id="clubDefenseTitle"><span aria-hidden="true">🛡️</span> Defesa</h3><div class="club-stat-values">${stat("Finalizações sofridas / jogo", m.against, defense)}${stat("No gol sofridas / jogo", m.againstTarget, defense)}${stat("Saldo de finalizações / jogo", m.balance, { ...defense, signed: true })}</div>${meter("Jogos sem sofrer gols", m.clean, m.clean.games ? m.clean.value / m.clean.games * 100 : null, m.clean.games ? `${m.clean.value} de ${m.clean.games}` : "—", defense.showSample)}${defense.markup}</section>
      <section class="club-stat-panel is-discipline" aria-labelledby="clubDisciplineTitle"><h3 id="clubDisciplineTitle"><span aria-hidden="true">🟨</span> Disciplina</h3><div class="club-stat-values">${stat("Faltas / jogo", m.fouls, discipline)}${stat("Amarelos / jogo", m.yellowCards, discipline)}${stat("Vermelhos no período", m.redCards, { ...discipline, whole: true })}</div>${discipline.markup}${trend("Amarelos por jogo", model.trends.discipline, "clubYellowTrend", true)}</section>
      <section class="card club-stat-panel club-stat-evolution" aria-labelledby="clubEvolutionTitle"><h3 id="clubEvolutionTitle"><span aria-hidden="true">📊</span> Evolução recente</h3><div class="club-stat-trends">${trend("Chutes no gol / jogo", model.trends.attack, "clubAttackTrend")}${trend("No gol sofridos / jogo", model.trends.defense, "clubDefenseTrend")}</div><p class="club-stat-period">${scopeLabel} · períodos indicados em cada indicador</p></section>
    </div>
    <details class="club-stat-details"${detailsOpen ? " open" : ""}><summary>Posse e escanteios</summary><div class="club-stat-values">${stat("Posse média", m.possession, { ...possession, percent: true })}${stat("Escanteios a favor / jogo", m.corners, possession)}${stat("Escanteios contra / jogo", m.againstCorners, possession)}</div>${possession.markup}</details>
    <p class="club-stat-footnote">Estatísticas disponíveis da última coleta de cada partida. Campos ausentes não contam como zero.</p>
  </section>`;
}
