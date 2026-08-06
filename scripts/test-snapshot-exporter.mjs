import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildSnapshot } from "../src/snapshot-export/map-origin.mjs";
import { canonicalize, computePayloadHash, validateSnapshot } from "../src/snapshot-export/contract.mjs";
import { writePackage } from "../src/snapshot-export/write-package.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/snapshot-export/origin.synthetic.json", import.meta.url), "utf8"));
const options = { packageId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", exportedAt: "2026-08-06T12:00:00Z" };
const clone = (value) => structuredClone(value);
const rejects = (value, pattern) => assert.throws(() => buildSnapshot(value, options), pattern);

const snapshot = buildSnapshot(fixture, options);
assert.equal(snapshot.contractVersion, "snapshot-2026/v1");
assert.equal(snapshot.dataClassification, "synthetic-only");
assert.equal(snapshot.payload.teams.length, 2);
assert.equal(snapshot.payload.matches[0].predictionDeadlineAt, "2026-04-10T20:30:00.000Z");
assert.equal(snapshot.payload.matches[1].status, "postponed");
assert.equal(snapshot.payload.matches[1].homeScore, null);
assert.deepEqual(validateSnapshot(snapshot), { ok: true, errors: [] });

const reordered = clone(fixture);
reordered.games.reverse(); reordered.participants.reverse(); reordered.predictions.reverse();
const reorderedSnapshot = buildSnapshot(reordered, options);
assert.equal(reorderedSnapshot.integrity.payloadHash, snapshot.integrity.payloadHash);
assert.equal(canonicalize(reorderedSnapshot.payload), canonicalize(snapshot.payload));
assert.equal(computePayloadHash(snapshot.payload), snapshot.integrity.payloadHash);

const personal = clone(fixture); personal.participants[0].email = "alpha@example.test";
rejects(personal, /campo proibido/);
const endpoint = clone(fixture); endpoint.sourceRevision = "https://demo.supabase.co";
rejects(endpoint, /endpoint proibido/);
const classified = clone(fixture); classified.dataClassification = "consented-pseudonymous";
rejects(classified, /somente origem synthetic-only/);
const confidential = clone(fixture); confidential.predictions[0].gameId = "demo-9002";
rejects(confidential, /não encerrada/);
const missingPerson = clone(fixture); missingPerson.predictions[0].participantRef = "participant-missing";
rejects(missingPerson, /participante inexistente/);
const inconsistentTeam = clone(fixture); inconsistentTeam.games[1].awayTeamName = "Nome Divergente";
rejects(inconsistentTeam, /nomes divergentes/);
const missingTeam = clone(fixture); delete missingTeam.games[0].homeTeamExternalRef;
rejects(missingTeam, /time home incompleto/);

const directory = await mkdtemp(path.join(tmpdir(), "r06a-export-"));
try {
  const destination = path.join(directory, "snapshot.json");
  assert.equal(await writePackage(snapshot, destination), destination);
  assert.deepEqual(JSON.parse(await readFile(destination, "utf8")), snapshot);
  await assert.rejects(() => writePackage(snapshot, destination), /já existe/);
} finally {
  await rm(directory, { recursive: true, force: true });
}

console.log("Exportador sintético R06A verificado com sucesso.");
