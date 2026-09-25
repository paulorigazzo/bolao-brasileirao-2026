import assert from "node:assert/strict";
import { competitionRound, legacyPendingRounds } from "../js/round-context.js";

const now=Date.parse("2026-09-25T12:00:00Z");
const game=(round,phase,kickoff)=>({rodada:round,status:phase,inicio:kickoff});
const finished28=game(28,"finished","2026-09-20T20:00:00Z");
const future29=game(29,"scheduled","2026-10-07T20:00:00Z");
const postponed21=game(21,"postponed","2026-07-29T00:00:00Z");
const rescheduled21=game(21,"scheduled","2026-10-02T23:00:00Z");
const games=[postponed21,rescheduled21,finished28,future29];

assert.equal(competitionRound(games,now),29,"jogo antigo futuro não retrocede a rodada principal");
assert.deepEqual(legacyPendingRounds(games,29,now),[21]);
assert.equal(competitionRound([finished28,future29,game(21,"live","2026-10-02T23:00:00Z")],Date.parse("2026-10-02T23:30:00Z")),29,"jogo antigo ao vivo não retrocede a rodada principal");
assert.equal(competitionRound([game(21,"finished","2026-10-02T23:00:00Z"),finished28,future29],Date.parse("2026-10-03T22:00:00Z")),29);
assert.deepEqual(legacyPendingRounds([game(21,"finished","2026-10-02T23:00:00Z"),finished28,future29],29,Date.parse("2026-10-03T22:00:00Z")),[]);
assert.equal(competitionRound([game(1,"scheduled","2026-03-28T20:00:00Z")],Date.parse("2026-03-20T12:00:00Z")),1);
console.log("Contexto de rodadas verificado.");
