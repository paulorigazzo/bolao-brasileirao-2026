import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

const app=await readFile(new URL("../js/app.js",import.meta.url),"utf8");
const source=app.slice(app.indexOf("let leagueDeletePreview="),app.indexOf("async function refreshAdminLeagues()"));
assert.ok(source.length>1000);
function harness(){
  const elements=new Map();let focused;
  const element=id=>{
    if(!elements.has(id))elements.set(id,{value:"",checked:false,disabled:false,textContent:"",innerHTML:"",hidden:true,isConnected:true,setAttribute(){},focus(){focused=id;},reset(){element("leagueDeleteName").value="";element("leagueDeletePermanent").checked=false;}});
    return elements.get(id);
  };
  const state={leagueManager:true,administeredLeagues:[{liga_id:"11111111-0000-0000-0000-000000000001",liga_nome:"Liga teste",liga_tipo:"privada",liga_status:"arquivada"}],leagues:[],leagueAssignments:[],leagueLifecycleAudit:[],adminTargetLeague:null,activeLeague:{liga_id:"standard"}};
  const calls=[];let reply;let refreshFails=false;
  const context=vm.createContext({$,state,document:{activeElement:null,body:{classList:{add(){},remove(){}}}},show:(id,visible)=>{element(id).hidden=!visible;},sb:{rpc:async(...args)=>{calls.push(args);return typeof reply==="function"?reply(...args):reply;}},renderAdminLeagues(){},renderLeagueContext(){},renderLeagueScopedViews(){},leagueRequestGate:{issue(){}},resetRoundHighlightsContext(){},reloadLeagues:async()=>{if(refreshFails)throw new Error("offline");},loadAdministeredLeagues:async()=>{}});
  function $(id){return element(id);}
  vm.runInContext(source,context);
  const run=expression=>vm.runInContext(expression,context);
  return {state,calls,element,run,reply:value=>{reply=value;},failRefresh:()=>{refreshFails=true;},focused:()=>focused};
}
const id="11111111-0000-0000-0000-000000000001";
const preview={liga_id:id,nome:"Liga teste",revisao:"revision",membros:2,historico_liga:3,historico_membros:4,designacoes_resolvidas:1,pendencias:0};
const open=async h=>{h.reply({data:preview});await h.run(`openLeagueDeletion("${id}")`);};
const confirm=h=>{h.element("leagueDeleteName").value=preview.nome;h.element("leagueDeletePermanent").checked=true;h.run("updateLeagueDeleteConfirmation()");};
const submit=h=>h.run("submitLeagueDeletion({preventDefault(){}})");

{
  const h=harness();
  const archived=h.state.administeredLeagues[0];
  h.state.administeredLeagues=[archived,{...archived,liga_id:"active",liga_status:"ativa"},{...archived,liga_id:"standard",liga_tipo:"standard"},{...archived,liga_id:"inactive",liga_status:"inativa"}];
  const renderer=app.slice(app.indexOf("function renderAdminLeagues()"),app.indexOf("let leagueDeletePreview="));
  const context=vm.createContext({$:h.element,state:h.state,escapeHtml:String});
  vm.runInContext(renderer+"renderAdminLeagues();",context);
  assert.equal((h.element("adminLeaguesList").innerHTML.match(/data-league-delete=/g)||[]).length,1);
  h.state.leagueManager=false;vm.runInContext("renderAdminLeagues();",context);
  assert.equal((h.element("adminLeaguesList").innerHTML.match(/data-league-delete=/g)||[]).length,0);
}
{
  const h=harness();h.state.leagueManager=false;await open(h);assert.equal(h.calls.length,0);
  h.state.leagueManager=true;h.state.administeredLeagues[0].liga_tipo="standard";await open(h);assert.equal(h.calls.length,0);
  h.state.administeredLeagues[0].liga_tipo="privada";h.state.administeredLeagues[0].liga_status="ativa";await open(h);assert.equal(h.calls.length,0);
}
{
  const h=harness();await open(h);assert.equal(h.element("leagueDeleteSubmit").disabled,true);
  h.element("leagueDeleteName").value="liga teste";h.element("leagueDeletePermanent").checked=true;h.run("updateLeagueDeleteConfirmation()");assert.equal(h.element("leagueDeleteSubmit").disabled,true);
  confirm(h);assert.equal(h.element("leagueDeleteSubmit").disabled,false);
  h.run("closeLeagueDeletion()");await submit(h);assert.equal(h.calls.length,1);assert.equal(h.element("leagueDeleteModal").hidden,true);
}
{
  const h=harness();h.reply({data:{...preview,pendencias:1}});await h.run(`openLeagueDeletion("${id}")`);confirm(h);
  assert.equal(h.element("leagueDeleteSubmit").disabled,true);assert.match(h.element("leagueDeleteStatus").textContent,/pendente/);await submit(h);assert.equal(h.calls.length,1);
}
{
  const h=harness();let resolve;h.reply(()=>new Promise(done=>{resolve=done;}));
  const request=h.run(`openLeagueDeletion("${id}")`);h.run("closeLeagueDeletion()");resolve({data:preview});await request;
  assert.equal(h.element("leagueDeleteModal").hidden,true);assert.equal(h.run("leagueDeletePreview"),null);
}
{
  const h=harness();await open(h);confirm(h);let resolve;h.reply(()=>new Promise(done=>{resolve=done;}));
  const request=submit(h);await submit(h);h.run("closeLeagueDeletion()");
  assert.equal(h.calls.length,2);assert.equal(h.element("leagueDeleteModal").hidden,false);assert.equal(h.element("leagueDeleteCancel").disabled,true);
  resolve({data:id});await request;assert.equal(h.state.administeredLeagues.length,0);assert.equal(h.element("leagueDeleteModal").hidden,true);
  assert.match(h.element("adminLeaguesStatus").textContent,/excluída permanentemente/);
}
{
  const h=harness();await open(h);confirm(h);h.reply({error:{message:"A liga foi alterada"}});await submit(h);
  assert.equal(h.state.administeredLeagues.length,1);assert.equal(h.element("leagueDeleteSubmit").disabled,true);assert.match(h.element("leagueDeleteStatus").textContent,/alterada/);
}
{
  const h=harness();await open(h);confirm(h);h.reply({data:id});h.failRefresh();await submit(h);
  assert.equal(h.state.administeredLeagues.length,0);assert.match(h.element("adminLeaguesStatus").textContent,/Liga excluída/);assert.equal(h.element("leagueDeleteModal").hidden,true);
}
{
  const h=harness();await open(h);confirm(h);h.state.activeLeague={liga_id:id};h.state.adminTargetLeague={liga_id:id};h.state.leagues=[{liga_id:id},{liga_id:"standard"}];h.state.leagueAssignments=[{liga_id:id}];h.state.leagueLifecycleAudit=[{liga_id:id}];h.reply({data:id});h.failRefresh();await submit(h);
  assert.equal(h.state.activeLeague,null);assert.equal(h.state.adminTargetLeague,null);assert.equal(h.state.leagues.length,1);assert.equal(h.state.leagueAssignments.length,0);assert.equal(h.state.leagueLifecycleAudit.length,0);assert.equal(h.state.leagueRanking.length,0);
}
console.log("Exclusão de ligas: autorização visual, confirmação, cancelamento, pendências, resposta atrasada, envio duplo, falha e atualização verificados.");
