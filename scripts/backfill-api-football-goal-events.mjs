import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeApiFootballFixtureEnvelope } from "../src/sports-data/api-football-adapter.mjs";
import { buildGoalEventBackfillArtifact, GOAL_EVENT_BACKFILL, persistGoalEventBackfill } from "../src/sports-data/api-football-event-backfill.mjs";

const required = (name) => { const value = process.env[name]; if (!value) throw new Error(`missing_environment:${name}`); return value; };
const option = (name, fallback = null) => process.argv.find((item) => item.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || fallback;
const apply = process.argv.includes("--apply");
const observedAt = new Date().toISOString();
const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } });
const canonicalResult = await supabase.from("jogos")
  .select("id_jogo,rodada,status,gols_casa,gols_fora,api_football_id,api_football_time_casa_id,api_football_time_fora_id")
  .eq("temporada", 2026).eq("rodada", GOAL_EVENT_BACKFILL.round).order("id_jogo");
if (canonicalResult.error) throw new Error(`round26_canonical_read_failed:${canonicalResult.error.message}`);

if (apply) {
  const artifactOption = option("artifact");
  if (!artifactOption) throw new Error("round26_backfill_artifact_required");
  const artifactPath = path.resolve(artifactOption);
  const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
  const result = await persistGoalEventBackfill({ supabase, artifact, canonicalGames: canonicalResult.data,
    approvedHash: option("approved-hash"), confirmation: option("confirm") });
  console.log(JSON.stringify({ mode: "controlled_apply", artifactPath, ...result }, null, 2));
} else {
  const providerGames = [];
  let latestObservation = null;
  for (const canonical of canonicalResult.data || []) {
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?id=${canonical.api_football_id}`,
      { headers: { "x-apisports-key": required("API_FOOTBALL_KEY"), Accept: "application/json" } });
    const normalized = normalizeApiFootballFixtureEnvelope(await response.json().catch(() => null), {
      requestedFixtureId: Number(canonical.api_football_id), observedAt, httpStatus: response.status, headers: response.headers,
    });
    if (!normalized.observation.responseValid || !normalized.game) {
      throw new Error(`round26_fixture_detail_failed:${canonical.id_jogo}:${normalized.observation.errors.join(",")}`);
    }
    const dailyReserve = Math.ceil((normalized.observation.dailyLimit || 0) * 0.2);
    const minuteReserve = Math.ceil((normalized.observation.minuteLimit || 0) * 0.1);
    if (normalized.observation.dailyRemaining != null && normalized.observation.dailyRemaining <= dailyReserve) {
      throw new Error("round26_backfill_daily_reserve_reached");
    }
    if (normalized.observation.minuteRemaining != null && normalized.observation.minuteRemaining <= minuteReserve) {
      throw new Error("round26_backfill_minute_reserve_reached");
    }
    latestObservation = normalized.observation;
    providerGames.push(normalized.game);
  }
  const artifact = buildGoalEventBackfillArtifact({ canonicalGames: canonicalResult.data, providerGames,
    observation: latestObservation, observedAt });
  const directory = path.resolve(".artifacts", "api-football");
  await mkdir(directory, { recursive: true });
  const artifactPath = path.join(directory, "goal-events-round-26.json");
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify({ mode: "read_only_dry_run", artifactPath, calls: providerGames.length,
    ...artifact.manifest }, null, 2));
}
