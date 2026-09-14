import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { FOOTBALL_API_BASE, COMPETITION_CODE, SEASON_YEAR } from "../netlify/functions/_constants.mjs";
import { matchesListUrl } from "../netlify/functions/_sync-shared.mjs";
import { selectNearbyMatchIds } from "../netlify/functions/sincronizar-jogos-agendado.mjs";

assert.deepEqual(selectNearbyMatchIds([
  { id_jogo: 101, status: "agendado" },
  { id_jogo: 102, status: "em_andamento" },
  { id_jogo: 102, status: "em_andamento" },
  { id_jogo: 106, status: "intervalo" },
  { id_jogo: 103, status: "encerrado" },
  { id_jogo: 104, status: "adiado" },
  { id_jogo: 105, status: "cancelado" },
  { id_jogo: "inválido", status: "agendado" },
]), [101, 102, 106]);

assert.equal(
  matchesListUrl([102, 101, 102, "inválido"]),
  `${FOOTBALL_API_BASE}/matches?ids=102,101`,
);
assert.equal(
  matchesListUrl(),
  `${FOOTBALL_API_BASE}/competitions/${COMPETITION_CODE}/matches?season=${SEASON_YEAR}`,
);

const netlifyConfig = readFileSync(new URL("../netlify.toml", import.meta.url), "utf8");
const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
assert.match(netlifyConfig, /schedule\s*=\s*"\* \* \* \* \*"/);
const start=app.indexOf("function startLiveScoreRefresh(){");
const end=app.indexOf("async function initialize",start);
assert.ok(start>=0&&end>start);
const calls=[];
let callback;
runInNewContext(app.slice(start,end)+"\nstartLiveScoreRefresh();startLiveScoreRefresh();",{
  liveScoreRefreshTimer:null,
  setInterval(fn,ms){assert.equal(ms,60000);assert.equal(callback,undefined,"only one timer");callback=fn;return 1;},
  async refreshLiveScoresSilently(){calls.push("scores");},
  async refreshRoundHighlightsViews(options){assert.equal(options.force,true);calls.push("highlights");}
});
await callback();
assert.deepEqual(calls,["scores","highlights"]);

console.log("Janela e frequência da sincronização ao vivo verificadas com sucesso.");
