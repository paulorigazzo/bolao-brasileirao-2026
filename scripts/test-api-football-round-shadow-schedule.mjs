import assert from "node:assert/strict";
import {
  allowTerminalFinalCycle, parseRoundShadowConfig, runScheduledRoundShadow,
} from "../netlify/functions/coletar-sombra-rodada-api-football-agendado.mjs";

const values = new Map([
  ["API_FOOTBALL_SHADOW_ENABLED", "true"],
  ["API_FOOTBALL_SHADOW_CAMPAIGN", "5b3-round-25"],
  ["API_FOOTBALL_SHADOW_ROUND", "25"],
  ["API_FOOTBALL_SHADOW_DATES", "2026-08-29,2026-08-30,2026-08-31"],
]);
const config = parseRoundShadowConfig((name) => values.get(name));
assert.deepEqual(config, {
  enabled: true, valid: true, campaign: "5b3-round-25", round: 25,
  dates: ["2026-08-29", "2026-08-30", "2026-08-31"],
});
assert.equal(parseRoundShadowConfig(() => undefined).enabled, false);
values.set("API_FOOTBALL_SHADOW_CAMPAIGN", "invalid");
assert.equal(parseRoundShadowConfig((name) => values.get(name)).valid, false);

let databaseReads = 0;
const noDatabase = { from() { databaseReads += 1; throw new Error("database_must_not_be_read"); } };
assert.deepEqual(await runScheduledRoundShadow({
  supabase: noDatabase, apiKey: null,
  config: { enabled: false, valid: false, campaign: "", round: 0, dates: [] },
}), { ok: true, skipped: "shadow_disabled" });
assert.equal(databaseReads, 0);

assert.deepEqual(await runScheduledRoundShadow({
  supabase: noDatabase, apiKey: null, config,
  now: () => new Date("2026-08-29T21:20:00Z"),
}), { ok: false, skipped: "api_key_missing" });
assert.equal(databaseReads, 0);

assert.deepEqual(await runScheduledRoundShadow({
  supabase: noDatabase, apiKey: null,
  config: { enabled: true, valid: false, campaign: "", round: 0, dates: [] },
}), { ok: false, skipped: "shadow_config_invalid" });
assert.equal(databaseReads, 0);

assert.deepEqual(await runScheduledRoundShadow({
  supabase: noDatabase, apiKey: null, config,
  now: () => new Date("2026-08-28T12:00:00Z"),
}), { ok: true, skipped: "date_not_authorized" });
assert.equal(databaseReads, 0);

function gamesOnly(games) {
  return {
    from(table) {
      assert.equal(table, "jogos");
      return { select: () => ({ eq: async () => ({ data: games, error: null }) }) };
    },
  };
}

function gamesAndHistory(games, expectedDetails) {
  return {
    from(table) {
      if (table === "jogos") {
        return { select: () => ({ eq: async () => ({ data: games, error: null }) }) };
      }
      assert.equal(table, "transicao_api_execucoes");
      return {
        select: () => ({
          eq: (column, value) => {
            assert.equal(column, "fase");
            assert.equal(value, "sombra_pre_corte");
            return {
              contains: (detailsColumn, details) => {
                assert.equal(detailsColumn, "detalhes");
                assert.deepEqual(details, expectedDetails);
                return {
                  order: () => ({ limit: async () => ({ data: [], error: null }) }),
                };
              },
            };
          },
        }),
      };
    },
  };
}
const game = { id_jogo: 1, inicio: "2026-08-29T21:30:00Z", status: "agendado" };
assert.equal(allowTerminalFinalCycle(
  [{ ...game, status: "encerrado" }], new Date("2026-08-29T23:20:00Z"), { reason: "round_terminal" },
), true);
assert.equal(allowTerminalFinalCycle(
  [{ ...game, status: "encerrado" }], new Date("2026-08-29T23:31:00Z"), { reason: "round_terminal" },
), false);
assert.deepEqual(await runScheduledRoundShadow({
  supabase: gamesOnly([game]), apiKey: "test-only", config,
  now: () => new Date("2026-08-29T21:00:00Z"),
}), { ok: true, skipped: "before_active_window" });

assert.deepEqual(await runScheduledRoundShadow({
  supabase: gamesAndHistory([game], { campanha: "5b3-round-25", data: "2026-08-29" }),
  apiKey: "test-only", config,
  now: () => new Date("2026-08-29T21:20:00Z"),
  collectRoundCycle: async () => ({ ok: true }),
}), { ok: true });

console.log("Agendamento 5B.3B verificado: bloqueio padrão, configuração, datas e janela.");
