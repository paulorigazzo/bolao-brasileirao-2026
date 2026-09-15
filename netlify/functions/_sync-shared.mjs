import { syncApiFootballGames } from "./_api-football-official.mjs";

export function syncGames(options = {}) {
  return syncApiFootballGames(options);
}
