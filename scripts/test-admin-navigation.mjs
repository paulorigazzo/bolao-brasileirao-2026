import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=name=>{
  const match=app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match,`Função ${name} ausente`);
  return match[0];
};
const classes=()=>{
  const values=new Set();
  return {contains:key=>values.has(key),toggle(key,on){if(on)values.add(key);else values.delete(key);}};
};
const groups=['round','participants','leagues','system'].map(area=>({dataset:{adminGroup:area},classList:classes(),querySelectorAll:()=>[],scrollIntoView(){this.scrolled=true;}}));
const ids={adminAttentionCard:'round',adminRoundCard:'round',adminParticipantsCard:'participants',adminLeaguesCard:'leagues',adminDiagnosticCard:'system',adminAuditCard:'system',adminRecoveryCard:'system',adminExecutiveCard:'system'};
const elements=Object.fromEntries(Object.entries(ids).map(([id,area])=>[id,{id,classList:classes(),closest:()=>groups.find(g=>g.dataset.adminGroup===area),scrollIntoView(options){this.scrolled=options.behavior;}}]));
const nav=['adminAttentionCard','adminParticipantsCard','adminLeaguesCard','adminDiagnosticCard'].map(id=>({dataset:{adminArea:ids[id]},classList:classes(),setAttribute(){},removeAttribute(){}}));
let leagueLoads=0;
const context={
  $:id=>elements[id],document:{querySelectorAll:selector=>selector==='[data-admin-group]'?groups:nav},
  ADMIN_CARD_IDS:Object.keys(ids),localStorage:{setItem(){}},isAdminUser:()=>true,refreshAdminLeagues:()=>leagueLoads++,prefersReducedMotion:()=>true,
  setAdminCardCollapsed:(card,collapsed)=>card.classList.toggle('is-collapsed',collapsed),
};
const navigation=runInNewContext(`${['adminAreaForCard','setAdminQuickNavActive','showAdminArea','expandOnlyAdminCard','scrollToAdminSection'].map(source).join('\n')}; ({scrollToAdminSection,showAdminArea});`,context);
for(const [id,area] of Object.entries(ids)){
  navigation.scrollToAdminSection(id);
  navigation.scrollToAdminSection(id);
  assert.equal(elements[id].classList.contains('is-collapsed'),false,'Repetir navegação não recolhe');
  assert.equal(groups.find(g=>!g.classList.contains('hidden')).dataset.adminGroup,area);
  assert.equal(nav.filter(b=>b.classList.contains('active')).length,1);
  assert.equal(elements[id].scrolled,'auto','Navegação respeita redução de movimento');
}
assert.equal(leagueLoads,1,'Repetir a área Ligas já visível não repete sua consulta');
for(const [id,area] of Object.entries(ids)){
  navigation.showAdminArea(id);
  for(const [cardId,cardArea] of Object.entries(ids))if(cardArea===area)assert.equal(elements[cardId].classList.contains('is-collapsed'),true,'Menu apresenta todos os cards da área fechados');
  navigation.scrollToAdminSection(id);
  assert.equal(elements[id].classList.contains('is-collapsed'),false,'Atalho específico abre o card');
  navigation.showAdminArea(id);
  assert.equal(elements[id].classList.contains('is-collapsed'),true,'Repetir menu recolhe novamente');
}

assert.equal([...html.matchAll(/data-admin-area="/g)].length,4);
assert.doesNotMatch(html,/id="adminSmartHeader"|id="adminQuickActionsCard"/);
for(const action of ['sync','temporary-ranking','share-round','next-round','copy-pool-link'])assert.equal([...html.matchAll(new RegExp(`data-admin-quick-action="${action}"`,'g'))].length,1);
for(const id of Object.keys(ids))assert.ok(html.includes(`id="${id}"`));
for(const id of ['adminNotificationsOpen','adminHomeV2Button','adminCreateLeagueButton','copyRegistrationLinkBtn'])assert.ok(html.includes(`id="${id}"`));

// A healthy service score must not mask independent data/recovery alerts.
const signalElements={adminSystemSignals:{innerHTML:''},adminNavSystemBadge:{classList:classes(),setAttribute(){}}};
const signalState={adminDiagnosticSummary:{score:100,warning:true,label:'Dados atrasados'},adminAuditSignal:{warning:true,label:'2 erros'},adminRecoverySignal:{warning:true,label:'Proteção indisponível'}};
const signals=runInNewContext(`${source('renderAdminSystemSignals')};renderAdminSystemSignals`,{$:id=>signalElements[id],state:signalState,escapeHtml:s=>s});
signals();
assert.equal(signalElements.adminNavSystemBadge.textContent,'3');
for(const id of ['adminDiagnosticCard','adminAuditCard','adminRecoveryCard'])assert.ok(signalElements.adminSystemSignals.innerHTML.includes(id));
Object.values(signalState).forEach(v=>v.warning=false);signals();
assert.equal(signalElements.adminSystemSignals.innerHTML,'');
assert.equal(signalElements.adminNavSystemBadge.classList.contains('hidden'),true);

// Run the real game renderer across lifecycle states; no real services or data.
const rendered={adminRoundBadge:{},adminRoundContent:{}};
let games=[];
const round=runInNewContext(`${source('renderAdminRoundStatus')};renderAdminRoundStatus`,{
  isAdminUser:()=>true,$:id=>rendered[id],state:{get adminSnapshot(){return {games};},games:[]},Date,
  adminGamePhase:g=>g.phase,gameStatusDisplay:g=>({icon:'⚽',label:g.phase}),isFinished:g=>g.phase==='finished',isCancelled:g=>g.cancelled,
  pendingEarlierRounds:()=>[],teamDisplayName:s=>s,escapeHtml:s=>s,formatDate:()=>'',formatRemaining:()=>'',teamLogo:()=>'',
  setAdminContent:(el,text)=>el.innerHTML=text,
});
for(const [input,expected] of [
  [[],/Nenhum jogo cadastrado/],
  [[{phase:'live'}],/Há jogos em andamento/],
  [[{phase:'postponed'}],/Há jogos adiados/],
  [[{phase:'finished'}],/Todos os jogos da rodada foram concluídos/],
  [[{phase:'upcoming'}],/PRÓXIMO JOGO/],
]){
  games=input.map(g=>({...g,inicio:'2026-10-29T23:30:00Z',time_casa:'Clube A',time_fora:'Clube B'}));
  round();assert.match(rendered.adminRoundContent.innerHTML,expected);
  if(games.some(g=>['live','postponed'].includes(g.phase)))assert.doesNotMatch(rendered.adminRoundContent.innerHTML,/Todos os jogos da rodada foram concluídos/);
}

// A changing count cannot close a previously opened game detail; an error
// without details must not erase the remembered expansion either.
let details=[];
const body={};
const container={dataset:{},contains:()=>false,querySelectorAll:()=>details,set innerHTML(value){
  details=[...value.matchAll(/<details data-admin-detail="([^"]+)"( open)?>/g)].map(m=>({dataset:{adminDetail:m[1]},open:!!m[2],querySelector:()=>null}));
}};
const replace=runInNewContext(`const adminDetailStates=new WeakMap();${source('adminDetailKey')}\n${source('setAdminContent')};setAdminContent`,{document:{activeElement:body,body},WeakMap,Map});
replace(container,'<details data-admin-detail="all-games">');
details[0].open=true;
replace(container,'<details data-admin-detail="all-games">');assert.equal(details[0].open,true);
replace(container,'Erro temporário');
replace(container,'<details data-admin-detail="all-games">');assert.equal(details[0].open,true);
details[0].open=false;
replace(container,'<details data-admin-detail="all-games" open>');assert.equal(details[0].open,false);

// Preserve the actual action routing after moving its buttons to other areas.
const calls=[];
const status={textContent:''};
const actionButton={dataset:{},disabled:false,classList:{add(){},remove(){}},closest:()=>({querySelector:()=>status})};
const runAction=runInNewContext(`${source('handleAdminQuickAction')};handleAdminQuickAction`,{
  $:()=>status,syncGames:async()=>calls.push('sync'),openTemporaryRanking:()=>calls.push('projection'),
  openAdminRoundShare:()=>calls.push('share'),goToNextAdminRound:()=>calls.push('next'),copyPoolLink:async()=>calls.push('copy'),
  renderAdminQuickActions(){},message(){},
});
for(const action of ['sync','temporary-ranking','share-round','next-round','copy-pool-link']){
  actionButton.dataset.adminQuickAction=action;
  await runAction({target:{closest:()=>actionButton}});
  assert.equal(actionButton.disabled,false);
}
assert.deepEqual(calls,['sync','projection','share','next','copy']);

// Never restore a previous reading position over intervening user input.
let anchorTop=100;
const scrolls=[];
const anchor={tagName:'H2',textContent:'Integridade',getBoundingClientRect:()=>({height:30,top:anchorTop}),getClientRects:()=>[{}]};
const readingArea={dataset:{adminGroup:'system'},querySelectorAll:()=>[anchor]};
const reading=runInNewContext(`let adminReadingRevision=0;${source('captureAdminReadingPosition')}\n${source('restoreAdminReadingPosition')};({captureAdminReadingPosition,restoreAdminReadingPosition,interact:()=>adminReadingRevision++});`,{
  $:()=>({classList:{contains:()=>false}}),document:{querySelector:()=>readingArea},
  window:{innerHeight:800,scrollBy:options=>scrolls.push(options.top)},
});
const position=reading.captureAdminReadingPosition();anchorTop=160;
reading.restoreAdminReadingPosition(position);assert.deepEqual(scrolls,[60]);
reading.interact();reading.restoreAdminReadingPosition(position);assert.deepEqual(scrolls,[60]);

console.log('ADM por tarefa: navegação repetida, preservação de ações, alertas independentes, estados de jogos e expansões aprovados.');
