import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../css/styles.css", import.meta.url), "utf8");

assert.match(app, /id="adminCutoverForm"/);
assert.match(app, /id="adminCutoverRound"[^>]+min="1"[^>]+max="38"/);
assert.match(app, /REHEARSE_API_FOOTBALL_CUTOVER/);
assert.match(app, /sb\.auth\.getSession\(\)/);
assert.match(app, /Authorization:`Bearer \$\{session\.access_token\}`/);
assert.match(app, /\.netlify\/functions\/ensaiar-corte-api-football/);
assert.match(app, /Number\(result\?\.writes\)===0/);
assert.match(app, /hashes\.gamesBefore===hashes\.gamesAfter/);
assert.match(app, /hashes\.picksBefore===hashes\.picksAfter/);
assert.match(app, /result\?\.rollback\?\.restored===true/);
assert.doesNotMatch(app, /adminCutover[^\n]*(?:localStorage|access_token\}\<|console\.log)/);
assert.match(styles, /\.admin-cutover-report/);

console.log("Acionador ADM 6B verificado: sessão encapsulada, confirmação, hashes, zero escrita e rollback.");
