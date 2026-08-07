import assert from "node:assert/strict";
import { resolveParticipantFavoriteTeam } from "../js/participant-team.js";

const profiles=[
  {user_id:"1",nome:"José",email:"jose@example.com",time_favorito:"Bahia"},
  {user_id:"2",nome:"Paulo",email:"paulo@example.com",time_favorito:null}
];
const authorizations=[
  {nome:"José",email:"JOSE@example.com",time_favorito:"Ceará"},
  {nome:"Paulo",email:"paulo@example.com",time_favorito:"Palmeiras"},
  {nome:"André David",email:"andre@example.com",time_favorito:"São Paulo"},
  {nome:"Sem Time",email:"sem-time@example.com",time_favorito:null}
];

assert.equal(resolveParticipantFavoriteTeam({userId:"1",email:"jose@example.com",name:"José"},{profiles,authorizations}),"Bahia");
assert.equal(resolveParticipantFavoriteTeam({userId:"2",email:"PAULO@example.com",name:"Paulo"},{profiles,authorizations}),"Palmeiras");
assert.equal(resolveParticipantFavoriteTeam({email:"andre@example.com",name:"André David"},{profiles,authorizations}),"São Paulo");
assert.equal(resolveParticipantFavoriteTeam({name:"André David"},{profiles,authorizations}),"São Paulo");
assert.equal(resolveParticipantFavoriteTeam({email:"sem-time@example.com",name:"Sem Time"},{profiles,authorizations}),null);

console.log("Resolução do time favorito dos participantes verificada com sucesso.");
