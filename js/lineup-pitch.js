function parseGrid(value) {
  const match = /^(\d+):(\d+)$/.exec(String(value || "").trim());
  if (!match) return null;
  const row = Number(match[1]), column = Number(match[2]);
  return row > 0 && column > 0 ? { row, column } : null;
}

function sideModel(side, direction) {
  const starters = Array.isArray(side?.starters) ? side.starters : [];
  if (starters.length !== 11) return null;
  const parsed = starters.map((player) => ({ ...player, pitchGrid: parseGrid(player.grid) }));
  if (parsed.some((player) => !player.pitchGrid)) return null;
  const coordinates = new Set(parsed.map((player) => `${player.pitchGrid.row}:${player.pitchGrid.column}`));
  if (coordinates.size !== parsed.length) return null;
  const rows = [...new Set(parsed.map((player) => player.pitchGrid.row))].sort((a, b) => a - b);
  if (rows.length < 2 || rows.length > 6) return null;
  return {
    formation: side.formation || "",
    coach: side.coach || "",
    players: parsed.map((player) => {
      const rowIndex = rows.indexOf(player.pitchGrid.row);
      const rowPlayers = parsed.filter((item) => item.pitchGrid.row === player.pitchGrid.row).sort((a, b) => a.pitchGrid.column - b.pitchGrid.column);
      const columnIndex = rowPlayers.findIndex((item) => item.pitchGrid.column === player.pitchGrid.column);
      const x = rowPlayers.length === 1 ? 50 : 12 + (columnIndex * 76) / (rowPlayers.length - 1);
      const progress = rowIndex / (rows.length - 1);
      const y = direction === "home" ? 8 + progress * 36 : 92 - progress * 36;
      const edge = x <= 20 ? "left" : x >= 80 ? "right" : "";
      return { id: player.id, name: player.name, number: player.number, position: player.position, x, y, edge };
    }),
  };
}

export function buildLineupPitchModel(lineups) {
  const home = sideModel(lineups?.home, "home"), away = sideModel(lineups?.away, "away");
  return home && away ? { available: true, home, away } : { available: false, home: null, away: null };
}
