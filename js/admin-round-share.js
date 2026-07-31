function plural(value, singular, pluralForm = `${singular}s`) {
  return Number(value) === 1 ? singular : pluralForm;
}

function factIcon(key = "") {
  if (String(key).startsWith("unique-exact")) return "✨";
  return ({
    "round-winner": "🏆",
    "exact-leader": "🎯",
    "biggest-climb": "📈",
  })[key] || "•";
}

function provisionalTitle(value = "") {
  let title = String(value)
    .replace(" venceu a rodada", " lidera a rodada")
    .replace(" empataram na rodada", " lideram a rodada")
    .replace(" liderou nos placares exatos", " lidera nos placares exatos")
    .replace(" lideraram nos placares exatos", " lideram nos placares exatos")
    .replace(/ na rodada$/, " até agora");
  if (!title.endsWith("até agora")) title = `${title} até agora`;
  return title;
}

function cleanDetail(value = "") {
  return String(value).trim().replace(/[.!?]+$/, "");
}

export function buildAdminRoundSummary({ round, lifecycle = {}, facts = [], ranking = [] } = {}) {
  const selectedRound = Number(round);
  const finished = Math.max(0, Number(lifecycle.finished) || 0);
  const total = Math.max(0, Number(lifecycle.total) || 0);
  const postponed = Math.max(0, Number(lifecycle.postponed) || 0);
  const live = Math.max(0, Number(lifecycle.live) || 0);
  const future = Math.max(0, Number(lifecycle.future) || 0);
  const complete = total > 0 && finished + (Number(lifecycle.cancelled) || 0) === total && postponed === 0;
  const postponedPartial = finished > 0 && postponed > 0 && live === 0 && future === 0;
  if (!Number.isFinite(selectedRound) || (!complete && !postponedPartial)) {
    return { available: false, reason: live > 0 ? "live" : finished === 0 ? "no-results" : "open" };
  }

  const selectedFacts = facts.filter(Boolean).slice(0, 3);
  const topThree = ranking.filter(item => item?.name).slice(0, 3);
  const lines = [`⚽ Resumo da Rodada ${selectedRound}`, ""];
  selectedFacts.forEach(fact => {
    const title = postponedPartial ? provisionalTitle(fact.title) : String(fact.title || "");
    const detail = cleanDetail(fact.detail);
    lines.push(`${factIcon(fact.key)} ${title}${detail ? ` — ${detail}` : ""}.`);
  });
  if (selectedFacts.length) lines.push("");
  lines.push("🏆 Classificação do Bolão");
  if (topThree.length) topThree.forEach((item, index) => lines.push(`${index + 1}º ${item.name} — ${Number(item.total) || 0} ${plural(item.total, "ponto")}`));
  else lines.push("Ranking ainda sem pontuação.");
  lines.push("", `${finished} de ${total} ${plural(total, "jogo")} ${finished === 1 ? "foi concluído" : "foram concluídos"}.`);
  if (postponedPartial) lines.push(`A rodada ainda possui ${postponed} ${plural(postponed, "jogo adiado", "jogos adiados")}.`);
  lines.push("", "Bolão Brasileirão 2026");
  return {
    available: true,
    isProvisional: postponedPartial,
    round: selectedRound,
    consideredGames: finished,
    totalGames: total,
    postponedGames: postponed,
    text: lines.join("\n"),
  };
}
