import { repairMojibake } from "./text-normalization.js";

const METRICS = [
  ["possession", "Posse de bola", "%"], ["shots", "Finalizações", ""], ["shotsOnTarget", "No gol", ""],
  ["corners", "Escanteios", ""], ["offsides", "Impedimentos", ""], ["fouls", "Faltas", ""],
  ["yellowCards", "Cartões amarelos", ""], ["redCards", "Cartões vermelhos", ""],
];

export function buildGameDetailsModel(game, projection) {
  if (!projection || Number(projection.id_externo) !== Number(game?.api_football_id)) return { statistics: null, lineups: null };
  const statistics = projection.estatisticas ? {
    rows: METRICS.map(([key, label, suffix]) => ({ key, label, suffix,
      home: projection.estatisticas?.home?.[key], away: projection.estatisticas?.away?.[key] }))
      .filter((row) => row.home !== undefined || row.away !== undefined),
    observedAt: projection.estatisticas_observadas_em,
    live: ["em_andamento", "intervalo"].includes(String(game?.status || "").toLowerCase()),
  } : null;
  const lineupSide = (side) => side ? {
    ...side,
    coach: repairMojibake(side.coach),
    starters: (side.starters || []).map((player) => ({ ...player, name: repairMojibake(player.name) })),
    substitutes: (side.substitutes || []).map((player) => ({ ...player, name: repairMojibake(player.name) })),
  } : side;
  const lineups = projection.escalacoes ? {
    ...projection.escalacoes,
    home: lineupSide(projection.escalacoes.home),
    away: lineupSide(projection.escalacoes.away),
    observedAt: projection.escalacoes_observadas_em,
  } : null;
  return { statistics: statistics?.rows.length ? statistics : null, lineups };
}
