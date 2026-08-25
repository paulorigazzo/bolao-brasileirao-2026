import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../css/styles.css", import.meta.url), "utf8");

assert.match(app, /if\(!isAdminUser\(\)\) return;/);
assert.match(app, /adminShadowForm/);
assert.match(app, /id_jogo:gameId,fixture_id:fixtureId/);
assert.match(app, /coletar-sombra-api-football/);
assert.match(app, /Authorization:`Bearer \$\{session\.access_token\}`/);
assert.match(app, /window\.confirm\(/);
assert.match(app, /Number\.isInteger\(gameId\).*gameId<=0/);
assert.match(app, /button\.disabled=true/);
assert.match(app, /result\.executionId/);
assert.doesNotMatch(app, /API_FOOTBALL_KEY/);
assert.match(css, /\.admin-shadow-form/);
assert.match(css, /@media\(max-width:700px\)[\s\S]*\.admin-shadow-form\{grid-template-columns:1fr\}/);

console.log("Acionador administrativo da coleta em sombra verificado: autenticação, confirmação, validação e resposta sanitizada.");
