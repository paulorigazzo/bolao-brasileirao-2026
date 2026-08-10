import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  buildParticipantDirectory,
  isAdministrator,
  isApprovedMembership,
  membershipStatus
} from "../js/access-control.js";
import { isApprovedAdministrator } from "../netlify/functions/_api-helpers.mjs";

const approved={email:"ADMIN@EXAMPLE.COM",nome:"Admin",ativo:true,status:"approved",administrador:true};

assert.equal(membershipStatus(approved),"approved");
assert.equal(membershipStatus({...approved,ativo:false}),"inactive");
assert.equal(membershipStatus({...approved,status:"pending"}),"pending");
assert.equal(membershipStatus({...approved,ativo:false,status:"pending"}),"pending");
assert.equal(membershipStatus(null),"missing");

assert.equal(isApprovedMembership(approved),true);
assert.equal(isApprovedMembership({...approved,status:"pending"}),false);
assert.equal(isApprovedMembership({...approved,status:"rejected"}),false);
assert.equal(isApprovedMembership({...approved,ativo:false}),false);
assert.equal(isApprovedMembership(null),false);

assert.equal(isAdministrator(approved),true);
assert.equal(isAdministrator({...approved,administrador:false}),false);
assert.equal(isAdministrator({...approved,status:"inactive"}),false);
assert.equal(isAdministrator({...approved,ativo:false}),false);

assert.equal(isApprovedAdministrator(approved),true);
assert.equal(isApprovedAdministrator({...approved,status:"pending"}),false);
assert.equal(isApprovedAdministrator({...approved,status:"rejected"}),false);
assert.equal(isApprovedAdministrator({...approved,ativo:false}),false);
assert.equal(isApprovedAdministrator({...approved,administrador:false}),false);
assert.equal(isApprovedAdministrator(null),false);

assert.deepEqual(buildParticipantDirectory(
  [
    {email:"ONE@example.com",nome:"Perfil canônico",ativo:true},
    {email:"inactive-profile@example.com",nome:"Perfil inativo",ativo:false}
  ],
  [
    {email:"one@example.com",nome:"Nome da autorização",ativo:true,status:"approved"},
    {email:"two@example.com",nome:"Segundo",ativo:true,status:"approved"},
    {email:"inactive@example.com",nome:"Inativo",ativo:false,status:"approved"}
  ]
),{
  "one@example.com":"Perfil canônico",
  "two@example.com":"Segundo"
});

const root=fileURLToPath(new URL("../",import.meta.url));
const config=readFileSync(`${root}js/config.js`,"utf8");
const app=readFileSync(`${root}js/app.js`,"utf8");
const helpers=readFileSync(`${root}netlify/functions/_api-helpers.mjs`,"utf8");
assert.doesNotMatch(config,/adminEmail|participants\s*:/);
assert.doesNotMatch(app,/CONFIG\.(adminEmail|participants)/);
assert.match(app,/throw new Error\("Não foi possível validar seu acesso ao bolão\./);
assert.match(app,/isAdministrator\(dynamic \|\| state\.membership\)/);
assert.doesNotMatch(helpers,/ADMIN_EMAILS/);

console.log("Autorização dinâmica pelo Supabase verificada com sucesso.");
