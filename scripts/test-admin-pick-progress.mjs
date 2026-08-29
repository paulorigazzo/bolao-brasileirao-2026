import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adminRoundGameIds, loadAdminPickProgress } from "../js/admin-pick-progress.js";

const games=Array.from({length:20},(_,index)=>({
  id_jogo:554970+index,
  rodada:index<10?24:25,
}));
const round25Ids=adminRoundGameIds(games,25);
assert.equal(round25Ids.length,10);
assert.deepEqual(round25Ids,[554980,554981,554982,554983,554984,554985,554986,554987,554988,554989]);

const history=Array.from({length:1051},(_,index)=>({user_id:`user-${index}`,usuario:`Participante ${index}`,id_jogo:index,atualizado_em:null}));
history.push(...round25Ids.map(id_jogo=>({user_id:"ana",usuario:"Ana Flávia",id_jogo,atualizado_em:"2026-08-29T16:38:00Z"})));
let requestedIds=null;
const supabase={
  from(table){
    assert.equal(table,"progresso_palpites_adm");
    return {
      select(columns){
        assert.equal(columns,"user_id,usuario,id_jogo,atualizado_em");
        return {
          async in(column,ids){
            assert.equal(column,"id_jogo");
            requestedIds=ids;
            return {data:history.filter(row=>ids.includes(row.id_jogo)),error:null};
          }
        };
      }
    };
  }
};
const result=await loadAdminPickProgress({supabase,isAdmin:true,gameIds:round25Ids});
assert.deepEqual(requestedIds,round25Ids);
assert.equal(result.data.length,10,"o histórico acima de mil linhas não pode ocultar a rodada atual");
assert.equal(result.data.every(row=>row.user_id==="ana"),true);
assert.deepEqual(await loadAdminPickProgress({supabase,isAdmin:false,gameIds:round25Ids}),{data:[],error:null});
assert.deepEqual(await loadAdminPickProgress({supabase,isAdmin:true,gameIds:[]}),{data:[],error:null});

const app=readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
assert.match(app,/adminRoundGameIds\(games,currentRoundNumber\(games\)\)/);
assert.match(app,/loadAdminPickProgress\(\{supabase:sb,isAdmin:isAdminUser\(\),gameIds:adminGameIds\}\)/);
assert.doesNotMatch(app,/sb\.from\("progresso_palpites_adm"\)\.select/);

console.log("Progresso ADM verificado: rodada atual filtrada antes do limite de mil linhas.");
