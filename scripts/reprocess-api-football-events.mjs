import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeApiFootballFixturesEnvelope } from "../src/sports-data/api-football-adapter.mjs";
import { buildEventReprocessingManifest, EVENT_REPROCESSING, persistEventReprocessingPilot } from "../src/sports-data/api-football-event-reprocessing.mjs";

const required = (name) => { const value = process.env[name]; if (!value) throw new Error(`missing_environment:${name}`); return value; };
const option = (name, fallback) => process.argv.find((item) => item.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || fallback;
const apply = process.argv.includes("--apply");
const scope = option("scope", "historical");
const canonicalFile = option("canonical-file", null);
const outputFile = option("output-file", null);
const includeEventDetails = process.argv.includes("--include-event-details");
const observedAt = new Date().toISOString();
const responsePromise = fetch(`https://v3.football.api-sports.io/fixtures?league=${EVENT_REPROCESSING.leagueId}&season=${EVENT_REPROCESSING.season}`,
  { headers: { "x-apisports-key": required("API_FOOTBALL_KEY"), Accept: "application/json" } });
let canonicalGames;
let supabase = null;
if (canonicalFile) {
  canonicalGames = JSON.parse(await readFile(path.resolve(canonicalFile), "utf8"));
} else {
  supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } });
  const canonical = await supabase.from("jogos")
    .select("id_jogo,rodada,inicio,api_football_id,api_football_time_casa_id,api_football_time_fora_id")
    .eq("temporada", 2026).order("id_jogo");
  if (canonical.error) throw new Error(`canonical_read_failed:${canonical.error.message}`);
  canonicalGames = canonical.data || [];
}
const response = await responsePromise;
const normalized = normalizeApiFootballFixturesEnvelope(await response.json().catch(() => null),
  { observedAt, httpStatus: response.status, headers: response.headers });
if (!normalized.observation.responseValid) throw new Error(`provider_normalization_failed:${normalized.observation.errors.join(",")}`);
if (includeEventDetails) {
  const detailCanonical = scope === "round25" ? canonicalGames.filter((game) => Number(game.rodada) === 25) : canonicalGames;
  const mappedIds = new Set(detailCanonical.map((game) => Number(game.api_football_id)).filter(Number.isInteger));
  const detailed = [];
  let latestObservation = normalized.observation;
  for (const fixtureId of mappedIds) {
    const detailResponse = await fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
      { headers: { "x-apisports-key": required("API_FOOTBALL_KEY"), Accept: "application/json" } });
    const detail = normalizeApiFootballFixturesEnvelope(await detailResponse.json().catch(() => null), {
      observedAt, httpStatus: detailResponse.status, headers: detailResponse.headers, expectedCount: 1,
    });
    if (!detail.observation.responseValid) {
      throw new Error(`provider_fixture_detail_failed:${fixtureId}:${detail.observation.errors.join(",")}`);
    }
    latestObservation = detail.observation;
    detailed.push(detail.games[0]);
  }
  normalized.games = normalized.games.map((game) =>
    mappedIds.has(Number(game.providerFixtureId))
      ? detailed.find((item) => item.providerFixtureId === game.providerFixtureId)
      : game);
  normalized.observation = latestObservation;
}
const manifest = buildEventReprocessingManifest({ canonicalGames, providerGames: normalized.games,
  observation: normalized.observation, observedAt, scope });
let persistence = null;
if (apply) {
  if (!includeEventDetails) throw new Error("event_reprocessing_details_required");
  if (!supabase) supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } });
  persistence = await persistEventReprocessingPilot({ supabase, canonicalGames, providerGames: normalized.games,
    observation: normalized.observation, observedAt, manifest, approvedHash: option("approved-hash", null),
    confirmation: option("confirm", null), calls: 1 + (scope === "round25" ? 10 : 255) });
}
const directory = path.resolve(".artifacts", "api-football");
await mkdir(directory, { recursive: true });
const outputPath = outputFile ? path.resolve(outputFile) : path.join(directory, `events-${scope}-dry-run.json`);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, mode: apply ? "controlled_apply" : "read_only_dry_run", scope, outputPath,
  manifestHash: manifest.manifestHash, gameCount: manifest.gameCount, eventCount: manifest.eventCount,
  categoryTotals: manifest.categoryTotals, unknownTypes: manifest.unknownTypes, quota: manifest.quota, persistence }, null, 2));
