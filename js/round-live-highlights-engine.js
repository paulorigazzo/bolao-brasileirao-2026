// Only aggregate, league-authorized data enters this model. No individual picks.
export function buildRoundLiveHighlightsModel(payload, selectedUserId) {
  if (!payload || !Array.isArray(payload.ranking) || !payload.lifecycle) throw new TypeError("Resumo da rodada indisponível.");
  const numericFields=["position","confirmed","provisional","total","exact","officialPosition","projectedPosition","gap"];
  if (!Number.isInteger(payload.round) || payload.ranking.some(row=>!row.user_id||typeof row.nome!=="string"||numericFields.some(key=>!Number.isFinite(row[key])||row[key]<0))) throw new TypeError("Resumo agregado inválido.");
  const ranking = payload.ranking;
  const lifecycle = payload.lifecycle;
  const provisional = !lifecycle.complete;
  const projected = lifecycle.liveWithScore + lifecycle.suspendedWithScore > 0;
  const hasResults = lifecycle.finished > 0 || projected;
  const personal = [];
  const group = [];
  const fact = (key, title, detail) => ({key, title, detail, evidence:{source:"league-round-aggregates", round:payload.round}});
  const selected = ranking.find(row => row.user_id === selectedUserId);
  if (selected && hasResults) {
    personal.push(fact("personal-round-performance", `Você ${projected ? "estaria" : "está"} com ${selected.total} pontos na rodada`, `${selected.confirmed} confirmados + ${selected.provisional} provisórios.`));
    personal.push(fact("personal-ranking-context", `Você ${projected ? "estaria" : "está"} em ${selected.projectedPosition}º no ranking geral`, `${selected.gap} pontos até a liderança geral.`));
    const movement = selected.officialPosition - selected.projectedPosition;
    if (movement) personal.push(fact("personal-ranking-movement", `Você ${movement > 0 ? "subiria" : "cairia"} ${Math.abs(movement)} ${Math.abs(movement) === 1 ? "posição" : "posições"}`, "Em relação ao Ranking oficial atual."));
  }
  const leaders = (key, title, detail) => {
    const best = Math.max(0, ...ranking.map(row => row[key]));
    if (!best) return;
    const winners = ranking.filter(row => row[key] === best);
    group.push(fact(key, winners.length === 1 ? `${winners[0].nome} ${title}` : `${winners.length} participantes dividem ${detail}`, `${best} ${key === "total" ? "pontos" : "placares exatos"} considerando os resultados disponíveis.`));
  };
  if(hasResults){
    leaders("total", "lidera a rodada neste momento", "a liderança da rodada");
    leaders("exact", "lidera em placares exatos na rodada", "a liderança em placares exatos");
  }
  const climb = Math.max(0, ...ranking.map(row => row.officialPosition - row.projectedPosition));
  if (climb && projected) {
    const climbers = ranking.filter(row => row.officialPosition - row.projectedPosition === climb);
    group.push(fact("biggest-climb", climbers.length === 1 ? `${climbers[0].nome} teria a maior subida no ranking geral` : `${climbers.length} participantes teriam a maior subida no ranking geral`, `${climb} ${climb === 1 ? "posição" : "posições"} em relação ao Ranking oficial atual.`));
  }
  return {round:payload.round, lifecycle, ranking, hasResults, isProvisional:provisional, projected, updatedAt:payload.updatedAt, facts:{personal,group}};
}

// Cache keys include viewer, league and round; invalidation rejects late responses.
export function createRoundHighlightsLoader(fetchPayload, now = Date.now) {
  let generation = 0;
  const entries = new Map();
  return {
    clear() { generation += 1; entries.clear(); },
    peek(key) { return entries.get(key); },
    async load(key, params, {force = false} = {}) {
      let entry = entries.get(key);
      if (entry?.pending) return entry.pending;
      if (!force && entry && now() - entry.checkedAt < 55000) return entry;
      entry ||= {data:null, error:false, checkedAt:0};
      entries.set(key, entry);
      const issued = generation;
      entry.pending = (async () => {
        try {
          const data = await fetchPayload(params);
          if (issued !== generation) return null;
          entry.data = data;
          entry.error = false;
        } catch (error) {
          if (issued !== generation) return null;
          if (["42501","PGRST301","PGRST302"].includes(error?.code)) entry.data = null;
          entry.error = true;
        } finally {
          entry.pending = null;
          entry.checkedAt = now();
        }
        return entry;
      })();
      return entry.pending;
    }
  };
}
