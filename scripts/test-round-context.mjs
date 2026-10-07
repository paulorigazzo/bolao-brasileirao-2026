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


// Regressão da v6.44.2: a rodada 30 não pode substituir a 29 em andamento.
const roundNow=Date.parse("2026-10-07T22:00:00Z");
const future30=game(30,"scheduled","2026-10-14T21:00:00Z");
const live29=game(29,"live","2026-10-07T21:00:00Z");
const upcoming29=game(29,"scheduled","2026-10-08T21:00:00Z");
const finished29=game(29,"finished","2026-10-07T21:00:00Z");
assert.equal(competitionRound([finished28,live29,upcoming29,future30],roundNow),29,"mantém rodada com jogo ao vivo");
assert.equal(competitionRound([finished28,finished29,upcoming29,future30],roundNow),29,"mantém rodada entre partidas");
assert.equal(competitionRound([finished28,game(29,"scheduled","2026-10-07T21:00:00Z"),future30],roundNow),29,"horário ultrapassado sem resultado não encerra a rodada");
assert.equal(competitionRound([finished28,finished29,future30],roundNow),30,"avança após conclusão da rodada");
assert.equal(competitionRound([finished29,game(29,"postponed","2026-10-08T21:00:00Z"),game(29,"cancelled","2026-10-08T21:00:00Z"),future30],roundNow),30,"adiados e cancelados não bloqueiam avanço");
assert.deepEqual(legacyPendingRounds([finished29,game(29,"postponed","2026-10-08T21:00:00Z"),future30],30,roundNow),[29],"adiado permanece no acompanhamento separado");
assert.equal(competitionRound([game(21,"live","2026-10-07T21:00:00Z"),finished28,live29,upcoming29,future30],roundNow),29,"jogo antigo ao vivo não substitui a rodada em andamento");
assert.equal(competitionRound([finished29,game(29,"scheduled","2026-10-15T21:00:00Z"),game(30,"live","2026-10-14T21:00:00Z")],Date.parse("2026-10-14T22:00:00Z")),30,"rodada mais nova iniciada supera jogo antigo reagendado");
assert.equal(competitionRound([game(38,"live","2026-12-06T21:00:00Z")],Date.parse("2026-12-06T22:00:00Z")),38);
assert.equal(competitionRound([game(38,"finished","2026-12-06T21:00:00Z")],Date.parse("2026-12-07T22:00:00Z")),38);
assert.equal(competitionRound([],roundNow),1);
assert.equal(competitionRound([finished28,game(29,"future","2026-10-07T21:00:00Z"),future30],roundNow),29,"compatível com fase normalizada da interface");
console.log("Contexto de rodadas verificado.");
