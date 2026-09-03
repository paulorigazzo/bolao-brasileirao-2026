import { Resolver } from "node:dns/promises";
import https from "node:https";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  API_FOOTBALL_BRASILEIRAO_TEAM_IDS,
  inspectApiFootballCrest,
} from "../src/sports-data/api-football-local-crests.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "assets", "clubs", "api-football");
const resolver = new Resolver();
resolver.setServers(["1.1.1.1", "8.8.8.8"]);

function download(teamId) {
  const hostname = "media.api-sports.io";
  const pathname = `/football/teams/${teamId}.png`;
  return new Promise((resolve, reject) => {
    const request = https.get({ hostname, path: pathname, headers: { Accept: "image/png" },
      lookup: async (name, options, callback) => {
        try {
          const addresses = await resolver.resolve4(name);
          if (options?.all) callback(null, addresses.map((address) => ({ address, family: 4 })));
          else callback(null, addresses[0], 4);
        } catch (error) { callback(error); }
      } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const bytes = Buffer.concat(chunks);
        if (response.statusCode !== 200) return reject(new Error(`crest_http_${response.statusCode}:${teamId}`));
        const inspected = inspectApiFootballCrest(bytes, response.headers["content-type"]);
        if (!inspected.ok) return reject(new Error(`crest_invalid:${teamId}:${inspected.errors.join(",")}`));
        resolve(bytes);
      });
    });
    request.setTimeout(10_000, () => request.destroy(new Error(`crest_timeout:${teamId}`)));
    request.on("error", reject);
  });
}

await mkdir(outputDir, { recursive: true });
for (const teamId of API_FOOTBALL_BRASILEIRAO_TEAM_IDS) {
  const bytes = await download(teamId);
  await writeFile(path.join(outputDir, `${teamId}.png`), bytes);
}
console.log(`${API_FOOTBALL_BRASILEIRAO_TEAM_IDS.length} escudos locais da API-Football atualizados e validados.`);
