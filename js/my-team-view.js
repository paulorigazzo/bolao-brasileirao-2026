import { renderMyTeamNumberCard } from "./my-team-statistics.js";

const escapeText = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

export function renderMyTeamStandings(row) {
  const difference = row?.goalDifference;
  const hasDifference = difference != null && String(difference).trim() !== "" && Number.isFinite(Number(difference));
  const balance = hasDifference ? `${Number(difference) > 0 ? "+" : ""}${difference}` : "—";
  return `<div class="my-team-standing-cards my-team-number-cards">
    <div class="club-stat-values">
      ${renderMyTeamNumberCard({label:"Posição do clube no campeonato",title:"Posição",icon:"🏆",value:row?.position == null ? null : `${row.position}º`,unit:"no campeonato"})}
      ${renderMyTeamNumberCard({label:"Pontos do clube no campeonato",title:"Pontos",icon:"⭐",value:row?.points,unit:"no campeonato",gold:true})}
      ${renderMyTeamNumberCard({label:"Saldo de gols do clube no campeonato",title:"Saldo de gols",icon:"⚽",value:balance,unit:"no campeonato"})}
    </div>
    ${row ? "" : '<p class="my-team-context-line">Classificação em atualização.</p>'}
    <button class="secondary my-team-standings-action" type="button" data-my-team-action="standings">Ver classificação <span aria-hidden="true">›</span></button>
  </div>`;
}

export function renderMyTeamParticipant(context, teamName, synergyLabel) {
  const { stats, profile, synergy, confidence, moment } = context;
  const analyzed = `${stats.games} ${stats.games === 1 ? "palpite concluído" : "palpites concluídos"} com o clube`;
  const card = renderMyTeamNumberCard;
  return `<section class="my-team-section my-team-number-cards" aria-labelledby="myTeamPerformanceTitle">
    <div class="my-team-section-heading"><div><span class="eyebrow">VOCÊ E O CLUBE</span><h2 id="myTeamPerformanceTitle">Meu desempenho com o ${escapeText(teamName)}</h2></div></div>
    <p class="my-team-context-line">${analyzed}</p>
    <div class="club-stat-values">
      ${card({ label: "Pontos conquistados nos palpites", title: "Seus pontos", icon: "⭐", value: stats.points, unit: `de ${stats.games * 10} possíveis`, gold: true })}
      ${card({ label: "Resultados certos", icon: "🎯", value: stats.hits, unit: stats.games ? `${Math.round(stats.hits / stats.games * 100)}% dos jogos` : "Aguardando resultados" })}
      ${card({ label: "Placares exatos", icon: "🥅", value: stats.exact, unit: "10 pontos cada" })}
    </div>
    ${moment?.featured ? `<aside class="my-team-moment-card my-team-moment-inline" aria-label="Momento com o seu time"><span class="my-team-moment-icon" aria-hidden="true">${escapeText(moment.icon)}</span><div class="my-team-moment-copy"><strong>${escapeText(moment.title)}</strong><p>${escapeText(moment.text)}</p></div></aside>` : ""}
  </section>
  <section class="my-team-section my-team-number-cards my-team-profile-summary" aria-labelledby="myTeamProfileTitle">
    <div class="my-team-section-heading"><div><span class="eyebrow">PERFIL DO TORCEDOR</span><h2 id="myTeamProfileTitle">Perfil e Sintonia</h2></div></div>
    <p class="my-team-profile-description">${stats.games ? `<b>${escapeText(profile.icon)} ${escapeText(profile.name)}</b> · ${escapeText(profile.text)}` : "Seu perfil aparecerá após o primeiro palpite concluído com o clube."}</p>
    <div class="club-stat-values is-pair">
      ${card({ label: "Índice de sintonia", icon: "🤝", value: stats.games ? synergy : null, percent: true, unit: stats.games ? synergyLabel : "Aguardando resultados" })}
      ${card({ label: "Palpites de vitória", icon: "❤️", value: stats.games ? confidence : null, percent: true, unit: "para o seu time" })}
    </div>
    <p class="my-team-context-line">A sintonia reúne seus acertos, regularidade e o momento recente do clube.</p>
  </section>`;
}

export function renderMyTeamCampaignSummary(row) {
  const fields = [["Jogos", "📅", "playedGames"], ["Vitórias", "🏆", "won"], ["Empates", "🤝", "draw"], ["Derrotas", "⚽", "lost"], ["Gols pró", "🥅", "goalsFor"], ["Gols contra", "🛡️", "goalsAgainst"]];
  return `<section class="my-team-section my-team-number-cards" aria-labelledby="myTeamCampaignTitle">
    <div class="my-team-section-heading"><div><span class="eyebrow">CAMPANHA OFICIAL · TEMPORADA COMPLETA</span><h3 id="myTeamCampaignTitle">Desempenho do clube</h3></div></div>
    ${row ? `<div class="club-stat-values">${fields.map(([label, icon, key]) => renderMyTeamNumberCard({ label, icon, value: row[key], unit: "no campeonato", gold: key === "won" || key === "goalsAgainst" })).join("")}</div>` : '<p class="my-team-context-line">Classificação oficial em atualização.</p>'}
  </section>`;
}

export function renderMyTeamAchievements(achievements, open = false) {
  return `<details class="my-team-achievements-details"${open ? " open" : ""}><summary>Conquistas · Marcos do Meu Time</summary><div class="my-team-achievements">${achievements.map(item => `<article class="card my-team-achievement-card ${item.unlocked ? "is-unlocked" : "is-progress"}"><span aria-hidden="true">${escapeText(item.icon)}</span><div><div class="my-team-achievement-heading"><strong>${escapeText(item.title)}</strong><small>${item.unlocked ? "Conquistado" : escapeText(item.progressLabel)}</small></div><p>${escapeText(item.text)}</p><div class="my-team-achievement-progress" role="progressbar" aria-label="${escapeText(`${item.title}: ${item.unlocked ? "conquistado" : item.progressLabel}`)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.progress}"><i style="width:${item.progress}%"></i></div></div></article>`).join("")}</div></details>`;
}
