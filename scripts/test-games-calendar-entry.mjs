import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
const styles=readFileSync(new URL("../css/styles.css",import.meta.url),"utf8");

const heading=html.match(/<header class="games-page-heading">[\s\S]*?<\/header>/)?.[0]||"";
assert.match(heading,/id="gamesRoundTitle"/);
assert.match(heading,/id="gamesCalendarBtn"/);
assert.match(heading,/class="premium-next-games-action games-calendar-action"/);
assert.match(heading,/aria-label="Abrir calendário de jogos"/);
assert.match(app,/\$\("gamesCalendarBtn"\)\?\.addEventListener\("click",event=>openMatchCalendar\(event\.currentTarget\)\)/);
assert.match(styles,/\.games-calendar-action\{[^}]*width:auto/);

console.log("Acesso ao calendário pelo cabeçalho da Tela de Jogos verificado com sucesso.");
