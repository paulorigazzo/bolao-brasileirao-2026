import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
const source=app.slice(app.indexOf("function sortAdminPendingParticipants("),app.indexOf("function renderAdminControlCenter("));
const sort=vm.runInNewContext(`(${source.trim()})`);
const participants=[
  {name:"Zeca",lastUpdate:200},
  {name:"Álvaro",lastUpdate:100},
  {name:"Bruno",lastUpdate:200},
  {name:"Ana",lastUpdate:0},
  {name:"Caio",lastUpdate:NaN},
];
const names=mode=>Array.from(sort(participants,mode),item=>item.name);
assert.deepEqual(names("name"),["Álvaro","Ana","Bruno","Caio","Zeca"]);
assert.deepEqual(names("recent"),["Bruno","Zeca","Álvaro","Ana","Caio"]);
assert.deepEqual(names("oldest"),["Álvaro","Bruno","Zeca","Ana","Caio"]);
assert.equal(participants[0].name,"Zeca","não modifica os dados de origem");
assert.equal(sort([],"recent").length,0);
assert.match(app,/let adminPendingSort="name"/);
assert.match(app,/sortAdminPendingParticipants\(snapshot.actionablePending,adminPendingSort\)/);
assert.match(app,/adminPendingSort\)\;\s*const pendingParticipants/);
assert.match(app,/\$\("adminPendingSort"\)\?\.addEventListener\("change"/);
console.log("Ordenação ADM: nomes, datas, empates, ausência de registro e imutabilidade aprovados.");
