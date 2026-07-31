import { CONFIG } from "./config.js";
import { MOTION, installMotionTokens, installMotionInteractions, installFirstVisitTips, animateTabEntry, prefersReducedMotion } from "./motion.js";
import { analyzeAdvancedStatistics, analyzePredictionProfile, analyzeRankingHistory, analyzeRoundPerformance, buildStatisticsDashboardModel, classifyStatisticsGames } from "./statistics-engine.js";
import { buildRoundHighlightsModel, isPostponedRoundHighlightsEligible, selectLatestRoundHighlightsCandidate } from "./round-highlights-engine.js";

const APP_VERSION = "6.10.0c";
installMotionTokens();
installMotionInteractions();
installFirstVisitTips();

const sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
const state = { user:null, participant:null, participants:[], games:[], ownPicks:[], publicPicks:[], pickCounts:[], ranking:[], standings:null, gameFilter:"all", selectedFavoriteTeam:null, selectedRegistrationTeam:null, registrationTeams:[], rankingMovement:{}, adminSnapshot:null, adminPickProgress:[], authorizedParticipants:[], participantLimit:10, membership:null, openGameId:null, gameAutoOpenContext:null, lastSyncReport:null, pickDrafts:{} };
let matchClockRefreshTimer=null;
let liveScoreRefreshTimer=null;
let rankingPicksParticipant=null;
let rankingPicksReturnFocus=null;
let roundHighlightsReturnFocus=null;
let roundHighlightsModel=null;
const $ = id => document.getElementById(id);
const show = (id, visible=true) => $(id)?.classList.toggle("hidden", !visible);
const REGISTRATION_DRAFT_KEY="bolaoRegistrationDraft";
if ($("appVersion")) $("appVersion").textContent = `v${APP_VERSION}`;
const initials = name => String(name||"?").split(/\s+/).map(x=>x[0]).join("").slice(0,3).toUpperCase();
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const formatDate = value => new Date(value).toLocaleString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
const normalizedStatus = game => String(game?.status || "").trim().toLowerCase();

function gameTimingState(game, now=Date.now()){
  const kickoff=new Date(game?.inicio).getTime();
  if(!Number.isFinite(kickoff)) return {started:false,inLiveWindow:false,elapsed:NaN};
  const elapsed=now-kickoff;
  return {started:elapsed>=0,inLiveWindow:elapsed>=0 && elapsed<=4*60*60*1000,elapsed};
}

function isFinished(game){
  const status=normalizeTeamKey(game?.status || "");
  if(status.includes("cancel") || status.includes("anulad")) return true;
  if(status.includes("encerr") || status.includes("finaliz") || status.includes("awarded")) return true;
  // O placar pode existir durante a partida; ele sozinho não significa jogo encerrado.
  return false;
}

function isCancelled(game){
  const status=normalizeTeamKey(game?.status || "");
  return status.includes("cancel") || status.includes("anulad");
}

function hasScoreValue(value){
  // Number(null), Number("") e Number("   ") resultam em 0 no JavaScript.
  // Portanto, primeiro exigimos que o campo realmente esteja preenchido.
  if(value === null || value === undefined) return false;
  if(typeof value === "string" && value.trim() === "") return false;
  return Number.isFinite(Number(value));
}

function hasValidScore(game){
  return hasScoreValue(game?.gols_casa) && hasScoreValue(game?.gols_fora);
}

function isScorableGame(game){
  return Boolean(game) && isFinished(game) && !isCancelled(game) && hasValidScore(game);
}

function gameStatusDisplay(game){
  const status=normalizeTeamKey(game?.status || "");
  const cancelled=status.includes("cancel") || status.includes("anulad");
  const postponed=status.includes("adiad") || status.includes("postpon") || status.includes("suspens");
  const finished=!cancelled && !postponed && (status.includes("encerr") || status.includes("finaliz") || status.includes("awarded"));
  const explicitlyLive=!cancelled && !postponed && !finished && (
    status.includes("vivo") ||
    status.includes("andamento") ||
    status.includes("intervalo") ||
    status.includes("1-tempo") ||
    status.includes("2-tempo") ||
    status.includes("in-play") ||
    status.includes("paused")
  );

  // O horário previsto não é suficiente para afirmar que uma partida está ao vivo.
  // A API pode manter jogos atrasados, adiados ou ainda não iniciados com horário já
  // ultrapassado. Por isso, todos os contadores e badges usam exclusivamente o
  // status oficial sincronizado.
  if(cancelled) return {key:"cancelled",label:"Cancelada",icon:"❌"};
  if(postponed) return {key:"postponed",label:"Adiada",icon:"🟠"};
  if(finished) return {key:"finished",label:"Finalizada",icon:"🏁"};
  if(explicitlyLive) return {key:"live",label:"Ao vivo",icon:"🟢"};
  return {key:"future",label:"Futura",icon:"📅"};
}

function participantDirectory(){
  if(state.authorizedParticipants?.length){
    return Object.fromEntries(state.authorizedParticipants.filter(item=>item.ativo!==false && (!item.status || item.status==="approved")).map(item=>[String(item.email||"").toLowerCase(),item.nome]));
  }
  return CONFIG.participants || {};
}

const TEAM_THEMES = {
  "athletico-pr": ["#c8102e", "#111111", "#ffffff"],
  "atletico-mg": ["#111111", "#ffffff", "#ffffff"],
  "bahia": ["#0057a8", "#d71920", "#ffffff"],
  "botafogo": ["#111111", "#ffffff", "#ffffff"],
  "bragantino": ["#d71920", "#ffffff", "#ffffff"],
  "ceara": ["#111111", "#ffffff", "#ffffff"],
  "corinthians": ["#111111", "#ffffff", "#ffffff"],
  "cruzeiro": ["#17479e", "#ffffff", "#ffffff"],
  "flamengo": ["#c52613", "#111111", "#ffffff"],
  "fluminense": ["#7a1731", "#006341", "#ffffff"],
  "fortaleza": ["#134b9b", "#e31b23", "#ffffff"],
  "gremio": ["#1e9bd7", "#111111", "#ffffff"],
  "internacional": ["#d71920", "#ffffff", "#ffffff"],
  "juventude": ["#178447", "#ffffff", "#ffffff"],
  "mirassol": ["#f2c500", "#17753c", "#102318"],
  "palmeiras": ["#006437", "#ffffff", "#ffffff"],
  "santos": ["#111111", "#ffffff", "#ffffff"],
  "sao-paulo": ["#e2231a", "#111111", "#ffffff"],
  "sport": ["#d71920", "#111111", "#ffffff"],
  "vasco-da-gama": ["#111111", "#ffffff", "#ffffff"],
  "vasco": ["#111111", "#ffffff", "#ffffff"],
  "vitoria": ["#d71920", "#111111", "#ffffff"]
};

const normalizeTeamKey = name => String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

const CLUB_DIRECTORY = [
  {sigla:"ACG", aliases:["atletico-go", "atletico-goianiense", "atletico-clube-goianiense"]},
  {sigla:"AME", aliases:["america-mg", "america-mineiro", "america-futebol-clube-mg"]},
  {sigla:"CAP", aliases:["athletico-pr", "athletico-paranaense", "atletico-pr", "atletico-paranaense", "club-athletico-paranaense", "paranaense", "cap", "par"]},
  {sigla:"CAM", aliases:["atletico-mg", "atletico-mineiro", "clube-atletico-mineiro", "mineiro", "cam", "min"]},
  {sigla:"BAH", aliases:["bahia", "ec-bahia", "esporte-clube-bahia"]},
  {sigla:"BOT", aliases:["botafogo", "botafogo-rj", "botafogo-de-futebol-e-regatas"]},
  {sigla:"RBB", aliases:["bragantino", "red-bull-bragantino", "rb-bragantino"]},
  {sigla:"CEA", aliases:["ceara", "ceara-sc", "ceara-sporting-club"]},
  {sigla:"CHA", aliases:["chapecoense", "associacao-chapecoense-de-futebol"]},
  {sigla:"COR", aliases:["corinthians", "sc-corinthians", "sport-club-corinthians-paulista"]},
  {sigla:"CFC", aliases:["coritiba", "coritiba-fc", "coritiba-foot-ball-club"]},
  {sigla:"CRI", aliases:["criciuma", "criciuma-ec", "criciuma-esporte-clube"]},
  {sigla:"CRU", aliases:["cruzeiro", "cruzeiro-mg", "cruzeiro-esporte-clube"]},
  {sigla:"CUI", aliases:["cuiaba", "cuiaba-ec", "cuiaba-esporte-clube"]},
  {sigla:"FLA", aliases:["flamengo", "cr-flamengo", "clube-de-regatas-do-flamengo"]},
  {sigla:"FLU", aliases:["fluminense", "fluminense-fc", "fluminense-football-club"]},
  {sigla:"FOR", aliases:["fortaleza", "fortaleza-ec", "fortaleza-esporte-clube"]},
  {sigla:"GOI", aliases:["goias", "goias-ec", "goias-esporte-clube"]},
  {sigla:"GRE", aliases:["gremio", "gremio-fbpa", "gremio-foot-ball-porto-alegrense"]},
  {sigla:"INT", aliases:["internacional", "sc-internacional", "sport-club-internacional"]},
  {sigla:"JUV", aliases:["juventude", "ec-juventude", "esporte-clube-juventude"]},
  {sigla:"MIR", aliases:["mirassol", "mirassol-fc", "mirassol-futebol-clube"]},
  {sigla:"NOV", aliases:["novorizontino", "gremio-novorizontino"]},
  {sigla:"PAL", aliases:["palmeiras", "se-palmeiras", "sociedade-esportiva-palmeiras"]},
  {sigla:"PON", aliases:["ponte-preta", "associacao-atletica-ponte-preta"]},
  {sigla:"REM", aliases:["remo", "clube-do-remo"]},
  {sigla:"SAN", aliases:["santos", "santos-fc", "santos-futebol-clube"]},
  {sigla:"SAO", aliases:["sao-paulo", "sao-paulo-fc", "sao-paulo-futebol-clube"]},
  {sigla:"SPO", aliases:["sport", "sport-recife", "sport-club-do-recife"]},
  {sigla:"VAS", aliases:["vasco", "vasco-da-gama", "cr-vasco-da-gama", "clube-de-regatas-vasco-da-gama"]},
  {sigla:"VIT", aliases:["vitoria", "ec-vitoria", "esporte-clube-vitoria"]}
];

const TEAM_ABBREVIATIONS = Object.fromEntries(
  CLUB_DIRECTORY.flatMap(club=>club.aliases.map(alias=>[alias,club.sigla]))
);

const CLUB_MATCH_RULES = [
  {sigla:"CAM", test:key=>key==="mineiro" || key==="min" || key==="cam" || (/(^|-)(atletico)(-|$)/.test(key) && /(^|-)(mg|mineiro)(-|$)/.test(key))},
  {sigla:"CAP", test:key=>key==="paranaense" || key==="par" || key==="cap" || (/(^|-)(athletico|atletico)(-|$)/.test(key) && /(^|-)(pr|paranaense)(-|$)/.test(key))},
  {sigla:"ACG", test:key=>/(^|-)(atletico)(-|$)/.test(key) && /(^|-)(go|goianiense)(-|$)/.test(key)},
  {sigla:"REM", test:key=>/(^|-)remo(-|$)/.test(key)},
  {sigla:"RBB", test:key=>/(red-bull.*bragantino|rb-bragantino|(^|-)bragantino(-|$))/.test(key)},
  {sigla:"CFC", test:key=>/(^|-)coritiba(-|$)/.test(key)},
  {sigla:"SPO", test:key=>/(^|-)sport(-|$)/.test(key) && !/(sporting)/.test(key)},
  {sigla:"VAS", test:key=>/(^|-)(vasco)(-|$)/.test(key)}
];

function getClubInfo(name){
  const key=normalizeTeamKey(name);
  const exact=TEAM_ABBREVIATIONS[key];
  if(exact) return {sigla:exact,key};

  // As APIs podem acrescentar estado, cidade, SAF ou o nome completo do clube.
  // As regras abaixo identificam o clube por palavras inteiras, sem depender
  // das três primeiras letras do nome recebido.
  const matchedRule=CLUB_MATCH_RULES.find(rule=>rule.test(key));
  if(matchedRule) return {sigla:matchedRule.sigla,key};

  // Tenta localizar um alias oficial dentro de nomes mais longos recebidos da API.
  const aliasMatch=Object.entries(TEAM_ABBREVIATIONS)
    .sort((a,b)=>b[0].length-a[0].length)
    .find(([alias])=>key===alias || key.startsWith(`${alias}-`) || key.endsWith(`-${alias}`) || key.includes(`-${alias}-`));
  if(aliasMatch) return {sigla:aliasMatch[1],key};

  const words=String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().match(/[A-Z0-9]+/g)||[];
  const relevant=words.filter(word=>!["DA","DE","DO","DAS","DOS","FC","EC","SAF"].includes(word));
  let sigla="---";
  if(relevant.length>=3) sigla=relevant.slice(0,3).map(word=>word[0]).join("");
  else if(relevant.length===2) sigla=`${relevant[0].slice(0,2)}${relevant[1][0]}`.slice(0,3);
  else sigla=(relevant[0]||"---").slice(0,3);
  return {sigla,key};
}

function teamAbbreviation(name){
  return getClubInfo(name).sigla;
}

function availableTeams(){
  const teams=new Map();
  state.games.forEach(game=>{
    [[game.time_casa,game.time_casa_logo],[game.time_fora,game.time_fora_logo]].forEach(([name,logo])=>{
      if(!name) return;
      const key=normalizeTeamKey(name);
      const current=teams.get(key);
      if(!current || (!current.logo && logo)) teams.set(key,{key,name,logo:logo||""});
    });
  });
  return [...teams.values()].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
}

function renderTeamOptions(grid,teams,selectedTeam,onSelect){
  if(!grid) return;
  grid.innerHTML=teams.map(team=>{
    const selected=normalizeTeamKey(selectedTeam)===team.key;
    const image=team.logo
      ? `<img src="${escapeHtml(team.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<span class="team-fallback">${initials(team.name).slice(0,3)}</span>`;
    return `<button class="favorite-team-option ${selected?"selected":""}" type="button" role="radio" aria-checked="${selected}" data-team="${escapeHtml(team.name)}">${image}<strong>${escapeHtml(team.name)}</strong></button>`;
  }).join("");
  grid.querySelectorAll(".favorite-team-option").forEach(button=>button.onclick=()=>{
    grid.querySelectorAll(".favorite-team-option").forEach(item=>{
      const selected=item===button;
      item.classList.toggle("selected",selected);
      item.setAttribute("aria-checked",String(selected));
    });
    onSelect(button.dataset.team);
  });
}

function findTeam(name){
  const key=normalizeTeamKey(name);
  return availableTeams().find(team=>team.key===key) || (name ? {key,name,logo:""} : null);
}

function favoriteTeamMatchData(game){
  const favoriteName=state.participant?.time_favorito || "";
  const favoriteKey=normalizeTeamKey(favoriteName);
  if(!favoriteKey) return {isFavoriteMatch:false,favoriteKey:"",homeFavorite:false,awayFavorite:false,colors:["#35dc83","#ffffff","#ffffff"]};
  const homeKey=normalizeTeamKey(game?.time_casa);
  const awayKey=normalizeTeamKey(game?.time_fora);
  const homeFavorite=homeKey===favoriteKey;
  const awayFavorite=awayKey===favoriteKey;
  return {
    isFavoriteMatch:homeFavorite||awayFavorite,
    favoriteKey,
    homeFavorite,
    awayFavorite,
    colors:TEAM_THEMES[favoriteKey] || ["#35dc83","#ffffff","#ffffff"]
  };
}

function favoriteHeartBadge(teamName){
  return `<span class="favorite-heart-badge" title="${escapeHtml(teamName)} é seu time favorito" aria-label="Jogo do seu time favorito: ${escapeHtml(teamName)}"><span aria-hidden="true">♥</span></span>`;
}

function setAvatar(element, team, fallback){
  if(!element) return;
  element.innerHTML=team?.logo
    ? `<img src="${escapeHtml(team.logo)}" alt="" referrerpolicy="no-referrer" onerror="this.remove();this.parentElement.textContent='${escapeHtml(fallback)}'">`
    : escapeHtml(fallback);
}

function applyFavoriteTeamIdentity(){
  const favorite=state.participant?.time_favorito || null;
  const team=findTeam(favorite);
  const fallback=initials(state.participant?.nome).slice(0,2);
  const colors=TEAM_THEMES[team?.key] || ["#173d28","#0d2519","#f5fff8"];
  const themed=Boolean(team && TEAM_THEMES[team.key]);

  setAvatar($("headerAvatar"),team,fallback);
  setAvatar($("avatar"),team,initials(state.participant?.nome).slice(0,1));

  const summary=$("favoriteTeamSummary");
  if(summary){
    summary.textContent=team ? `Time do coração: ${team.name}` : "Time do coração: não escolhido";
    summary.classList.toggle("has-fan-theme",themed);
  }

  const chip=$("userMenuBtn");
  const headerUser=$("headerUser");
  const profileAvatar=$("avatar");
  [chip,headerUser,profileAvatar,summary].forEach(element=>{
    if(!element) return;
    element.style.setProperty("--team-primary",colors[0]);
    element.style.setProperty("--team-secondary",colors[1]);
    element.style.setProperty("--team-text",colors[2]);
  });
  chip?.classList.toggle("has-fan-theme",themed);
  headerUser?.classList.toggle("has-fan-theme",themed);
  profileAvatar?.classList.toggle("has-fan-theme",themed);
  if(chip){
    chip.dataset.teamTheme=team?.key || "default";
    chip.setAttribute("aria-label",team ? `Abrir menu do usuário. Tema do torcedor: ${team.name}` : "Abrir menu do usuário");
    chip.title=team ? `Tema do Torcedor: ${team.name}` : "Menu do usuário";
  }
}

function renderFavoriteTeamSelector(){
  const teams=availableTeams();
  state.selectedFavoriteTeam=state.participant?.time_favorito || null;
  const grid=$("favoriteTeamGrid");
  if(!grid) return;
  renderTeamOptions(grid,teams,state.selectedFavoriteTeam,team=>{
    state.selectedFavoriteTeam=team;
    $("favoriteTeamStatus").textContent=`Selecionado: ${team}. Toque em “Salvar escolha”.`;
  });
}

async function saveFavoriteTeam(){
  const button=$("saveFavoriteTeamBtn");
  button.disabled=true; button.textContent="Salvando…";
  try{
    const value=state.selectedFavoriteTeam || null;
    const {data,error}=await sb.from("participantes").update({time_favorito:value}).eq("user_id",state.user.id).select("*").single();
    if(error) throw error;
    state.participant=data;
    applyFavoriteTeamIdentity();
    renderFavoriteTeamSelector();
    renderHome();
    $("favoriteTeamStatus").textContent=value ? `Time do coração salvo: ${value}.` : "Preferência removida.";
    message("Time do coração atualizado com sucesso.");
  }catch(err){
    $("favoriteTeamStatus").textContent="Não foi possível salvar. Execute primeiro o SQL da versão 3.10 no Supabase.";
    message(err.message||"Não foi possível salvar o time do coração.",true);
  }finally{button.disabled=false;button.textContent="Salvar escolha";}
}

function currentRoundNumber(){
  const rounds=[...new Set(state.games.map(game=>Number(game.rodada)).filter(Number.isFinite))].sort((a,b)=>a-b);
  if(!rounds.length) return 1;

  const now=Date.now();
  const liveGame=state.games
    .filter(game=>gameStatusDisplay(game).key==="live")
    .sort((a,b)=>new Date(a.inicio)-new Date(b.inicio))[0];
  if(liveGame) return Number(liveGame.rodada);

  const nextGame=state.games
    .filter(game=>!isFinished(game) && new Date(game.inicio).getTime()>now)
    .sort((a,b)=>new Date(a.inicio)-new Date(b.inicio))[0];
  if(nextGame) return Number(nextGame.rodada);

  return rounds.at(-1);
}

const message = (text, error=false) => {
  $("message").textContent = text;
  $("message").className = `message${error ? " error" : ""}`;
  show("message", true);
  clearTimeout(message.timer);
  message.timer=setTimeout(()=>show("message",false),4500);
};
const clearMessage = () => show("message", false);

function calculatePredictionPoints(pick, game){
  if(!pick || !hasValidScore(game)) return 0;
  const ph=Number(pick.gols_casa), pa=Number(pick.gols_fora), gh=Number(game.gols_casa), ga=Number(game.gols_fora);
  if(ph===gh && pa===ga) return 10;
  const ps=Math.sign(ph-pa), gs=Math.sign(gh-ga);
  if(ps!==gs) return 0;
  if(ph-pa===gh-ga) return 5;
  if(gs===0) return 1;
  return 3;
}

function points(pick, game){
  if(!pick || !isScorableGame(game)) return 0;
  return calculatePredictionPoints(pick,game);
}

function predictionResultLabel(earned,{live=false}={}){
  if(earned===10) return live?"Placar exato até o momento":"Placar exato";
  if(earned===5) return live?"Diferença exata até o momento":"Diferença exata";
  if(earned===3) return live?"Acertando o vencedor":"Acertou o vencedor";
  if(earned===1) return live?"Acertando o empate":"Acertou o empate";
  return live?"Resultado diferente no momento":"Não pontuou";
}

function resultPanel(pick, earned){
  if(!pick){
    return `<div class="result-strip result-none" role="status">
      <span class="result-icon" aria-hidden="true">—</span>
      <div class="result-copy"><strong>Nenhum palpite registrado</strong><span>Esta partida não gerou pontuação.</span></div>
    </div>`;
  }

  const prediction=`${pick.gols_casa} × ${pick.gols_fora}`;
  const states={
    10:{className:"result-exact",icon:"🎯",title:"Placar exato"},
    5:{className:"result-difference",icon:"🏅",title:"Vencedor e diferença exata"},
    3:{className:"result-winner",icon:"✓",title:"Acertou o vencedor"},
    1:{className:"result-draw",icon:"✓",title:"Acertou o empate"},
    0:{className:"result-miss",icon:"×",title:"Não pontuou"}
  };
  const state=states[earned] || states[0];
  return `<div class="result-strip ${state.className}" role="status">
    <span class="result-icon" aria-hidden="true">${state.icon}</span>
    <div class="result-copy"><strong>${state.title}</strong><span>Seu palpite: ${prediction}</span></div>
    <strong class="earned-points">${earned > 0 ? "+" : ""}${earned} ${earned===1?"ponto":"pontos"}</strong>
  </div>`;
}

function isPostponed(game){
  return gameStatusDisplay(game).key==="postponed";
}

function locked(game){
  const status=gameStatusDisplay(game).key;
  // Partidas adiadas preservam o palpite original e nunca reabrem automaticamente.
  if(["finished","cancelled","postponed"].includes(status)) return true;
  const kickoff=new Date(game.inicio).getTime();
  if(!Number.isFinite(kickoff)) return true;
  return Date.now() >= kickoff - CONFIG.lockMinutesBefore*60000;
}

function deadlineText(game){
  if(isPostponed(game)) return "Palpite preservado • nova data a definir";
  if(locked(game)) return "Palpites encerrados";
  const closeAt = new Date(game.inicio).getTime() - CONFIG.lockMinutesBefore*60000;
  const diff = closeAt - Date.now();
  const hours = Math.floor(diff/3600000), minutes=Math.max(0,Math.floor(diff%3600000/60000));
  if(hours >= 24) return `Fecha em ${Math.ceil(hours/24)} dia${hours>=48?"s":""}`;
  if(hours > 0) return `Fecha em ${hours}h ${minutes}min`;
  return `Fecha em ${minutes} min`;
}

function isRegistrationLink(){
  const params=new URLSearchParams(location.search);
  return params.get("cadastro")==="1" || sessionStorage.getItem("bolaoRegistrationIntent")==="1";
}

function readRegistrationDraft(){
  try{
    const parsed=JSON.parse(sessionStorage.getItem(REGISTRATION_DRAFT_KEY)||"{}");
    return {
      name:String(parsed?.name||"").trim(),
      phone:normalizeBrazilPhone(parsed?.phone||""),
      favoriteTeam:String(parsed?.favoriteTeam||"").trim() || null
    };
  }catch(_){
    return {name:"",phone:"",favoriteTeam:null};
  }
}

function collectRegistrationDraft(){
  return {
    name:String($("registrationNameInput")?.value||"").trim(),
    phone:normalizeBrazilPhone($("registrationPhoneInput")?.value),
    favoriteTeam:state.selectedRegistrationTeam || null
  };
}

function validateRegistrationDraft(draft,{showStatus=true}={}){
  let error="";
  if(!draft.name || draft.name.length<2) error="Informe um nome com pelo menos 2 caracteres.";
  else if(draft.phone && (draft.phone.length<12 || draft.phone.length>13)) error="Confira o DDD e o número do celular.";
  else if(draft.favoriteTeam && state.registrationTeams.length && !state.registrationTeams.some(team=>team.key===normalizeTeamKey(draft.favoriteTeam))) error="Escolha o time favorito na lista oficial.";
  if(showStatus && $("registrationFormStatus")) $("registrationFormStatus").textContent=error;
  return !error;
}

function persistRegistrationDraft(){
  const draft=collectRegistrationDraft();
  sessionStorage.setItem(REGISTRATION_DRAFT_KEY,JSON.stringify(draft));
  return draft;
}

function renderRegistrationTeamSelector(){
  const grid=$("registrationFavoriteTeamGrid");
  if(!grid) return;
  if(!state.registrationTeams.length){
    grid.innerHTML='<p class="muted-note">Não foi possível carregar a lista agora. Você pode continuar sem escolher um time.</p>';
    return;
  }
  renderTeamOptions(grid,state.registrationTeams,state.selectedRegistrationTeam,team=>{
    state.selectedRegistrationTeam=team;
    persistRegistrationDraft();
    if($("registrationFormStatus")) $("registrationFormStatus").textContent=`Time selecionado: ${team}.`;
  });
}

async function loadRegistrationTeams(){
  try{
    const response=await fetch("/.netlify/functions/classificacao-brasileirao",{headers:{Accept:"application/json"},cache:"default"});
    const result=await response.json();
    if(!response.ok || !result.ok || !Array.isArray(result.table)) throw new Error(result.error||"Classificação indisponível.");
    state.registrationTeams=result.table
      .map(row=>({name:String(row.team||"").trim(),key:normalizeTeamKey(row.team),logo:row.crest||""}))
      .filter(team=>team.name && team.key)
      .sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  }catch(error){
    console.warn("Não foi possível carregar os clubes no cadastro.",error);
    state.registrationTeams=[];
  }
  renderRegistrationTeamSelector();
}

function prepareRegistrationForm(){
  if(!isRegistrationLink()) return;
  show("registrationInviteHint",true);
  show("registrationForm",true);
  const draft=readRegistrationDraft();
  state.selectedRegistrationTeam=draft.favoriteTeam;
  if($("registrationNameInput")) $("registrationNameInput").value=draft.name;
  if($("registrationPhoneInput")) $("registrationPhoneInput").value=formatBrazilPhone(draft.phone);
  if($("heroLoginBtn")) $("heroLoginBtn").textContent="Entrar com Google e enviar cadastro";
  loadRegistrationTeams();
}

async function login(){
  clearMessage();
  const registration=isRegistrationLink();
  let draft=null;
  if(registration){
    draft=persistRegistrationDraft();
    if(!validateRegistrationDraft(draft)) return;
    sessionStorage.setItem("bolaoRegistrationIntent","1");
  }
  if(registration && state.user){
    const button=$("heroLoginBtn");
    button.disabled=true;
    button.textContent="Enviando cadastro…";
    try{
      state.membership=await requestMembership(state.user.email,draft);
      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
      sessionStorage.removeItem("bolaoRegistrationIntent");
      renderMembershipStatus();
    }catch(error){
      if($("registrationFormStatus")) $("registrationFormStatus").textContent=error.message||"Não foi possível enviar o cadastro.";
    }finally{
      button.disabled=false;
      button.textContent="Entrar com Google e enviar cadastro";
    }
    return;
  }
  const redirectUrl=new URL(CONFIG.redirectTo || location.origin,location.origin);
  if(registration) redirectUrl.searchParams.set("cadastro","1");
  const { error } = await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:redirectUrl.toString()}});
  if(error) message(error.message, true);
}
async function logout(){ await sb.auth.signOut(); location.reload(); }

async function requestMembership(email,draft=readRegistrationDraft()){
  if(!validateRegistrationDraft(draft,{showStatus:false})) throw new Error("Complete o nome antes de enviar o cadastro.");
  const {data,error}=await sb.rpc("solicitar_participacao_v2",{
    p_nome:draft.name,
    p_celular:draft.phone||null,
    p_time_favorito:draft.favoriteTeam||null
  });
  if(error) throw error;
  return Array.isArray(data)?data[0]:data;
}

async function loadParticipant(){
  const email=String(state.user.email||"").toLowerCase();
  let authorization=null;
  try{
    const {data,error}=await sb.from("participantes_autorizados")
      .select("id,nome,email,celular,time_favorito,ativo,administrador,status,solicitado_em,aprovado_em")
      .eq("email",email).maybeSingle();
    if(error) throw error;
    authorization=data;
  }catch(err){
    console.warn("Consulta dinâmica de autorização indisponível; usando a lista de compatibilidade.",err);
  }

  const fallbackName=CONFIG.participants?.[email];
  if(!authorization && !fallbackName){
    if(!isRegistrationLink()) throw new Error("Esta conta ainda não está autorizada. Use o link de cadastro enviado pelo administrador.");
    authorization=await requestMembership(email);
    sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
  }

  if(authorization){
    const status=authorization.ativo===false && authorization.status==="approved" ? "inactive" : (authorization.status || (authorization.ativo===false?"inactive":"approved"));
    state.membership={...authorization,status};
    if(status!=="approved" || authorization.ativo===false){
      state.participant={nome:authorization.nome || state.user.user_metadata?.full_name || email.split("@")[0],email,user_id:state.user.id,celular:authorization.celular||"",time_favorito:authorization.time_favorito||null};
      return;
    }
  }else{
    state.membership={status:"approved",nome:fallbackName,email,ativo:true};
  }

  const {data,error}=await sb.from("participantes").select("*").eq("user_id",state.user.id).maybeSingle();
  if(error) throw error;
  if(data){ state.participant=data; return; }
  const profileName=authorization?.nome || fallbackName || state.user.user_metadata?.full_name || email.split("@")[0];
  try{
    const profileRpc=authorization?"registrar_meu_perfil_consolidado":"registrar_meu_perfil";
    const profileArgs=authorization?{}:{p_nome:profileName};
    const {data:created,error:createError}=await sb.rpc(profileRpc,profileArgs);
    if(createError) throw createError;
    state.participant=Array.isArray(created)?created[0]:created;
  }catch(err){
    console.warn("Criação automática de perfil indisponível.",err);
    state.participant={nome:profileName,email,user_id:state.user.id,celular:authorization?.celular||""};
  }
}
function normalizeBrazilPhone(value){
  const digits=String(value||"").replace(/\D/g,"");
  if(!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function formatBrazilPhone(value){
  let digits=String(value||"").replace(/\D/g,"");
  if(digits.startsWith("55")) digits=digits.slice(2);
  digits=digits.slice(0,11);
  if(digits.length<=2) return digits;
  if(digits.length<=6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  if(digits.length<=10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}

function renderEditableProfile(){
  const nameInput=$("profileNameInput");
  const phoneInput=$("profilePhoneInput");
  if(nameInput) nameInput.value=state.participant?.nome||"";
  if(phoneInput) phoneInput.value=formatBrazilPhone(state.participant?.celular||state.membership?.celular||"");
  if($("profileName")) $("profileName").textContent=state.participant?.nome||"Participante";
  if($("profileEmail")) $("profileEmail").textContent=state.user?.email||"";
}

async function saveOwnProfile(event){
  event?.preventDefault();
  event?.stopPropagation();
  event?.stopImmediatePropagation?.();
  if(saveOwnProfile.busy) return;

  const name=$("profileNameInput")?.value.trim();
  const phone=normalizeBrazilPhone($("profilePhoneInput")?.value);
  const status=$("profileFormStatus");
  const button=$("saveProfileBtn");
  if(!name || name.length<2){ if(status) status.textContent="Informe um nome com pelo menos 2 caracteres."; return; }
  if(phone && (phone.length<12 || phone.length>13)){ if(status) status.textContent="Confira o DDD e o número do celular."; return; }

  saveOwnProfile.busy=true;
  button.disabled=true;
  button.textContent="Salvando…";
  if(status) status.textContent="Salvando seus dados…";

  try{
    const previousName=state.participant?.nome || "";
    const {data,error}=await sb.rpc("atualizar_meu_perfil_v2",{p_nome:name,p_celular:phone||null});
    if(error) throw error;

    const updated=Array.isArray(data)?data[0]:data;
    if(!updated?.user_id) throw new Error("O servidor não confirmou a gravação do perfil. Execute a migração v6.5.0d no Supabase.");

    const {data:confirmed,error:confirmError}=await sb.from("participantes")
      .select("*")
      .eq("user_id",state.user.id)
      .single();
    if(confirmError) throw confirmError;
    if(String(confirmed?.nome||"").trim()!==name) throw new Error("A alteração não foi persistida no banco. Execute novamente a migração v6.5.0d no Supabase.");

    state.participant={...state.participant,...confirmed,nome:name,celular:phone};
    state.membership={...state.membership,nome:name,celular:phone};
    state.participants=state.participants.map(item=>String(item.user_id)===String(state.user.id)?{...item,...confirmed,nome:name,celular:phone}:item);
    state.ownPicks=state.ownPicks.map(item=>({...item,usuario:name}));
    state.publicPicks=state.publicPicks.map(item=>String(item.user_id)===String(state.user.id)?{...item,usuario:name}:item);
    state.pickCounts=state.pickCounts.map(item=>item.usuario===previousName?{...item,usuario:name}:item);

    renderEditableProfile();
    $("headerUserName").textContent=name.split(/\s+/)[0];
    $("userMenuBtn").setAttribute("aria-label",`Perfil de ${name}. Abrir menu da conta`);
    $("userMenuBtn").setAttribute("title",name);
    applyFavoriteTeamIdentity();
    renderRanking(); renderHome(); renderStats(); renderMyTeam();
    if(isAdminUser()) renderAdminParticipants();
    if(status) status.textContent="Dados atualizados e confirmados no banco.";
    message("Seu perfil foi atualizado com sucesso.");
  }catch(err){
    console.error("Falha ao salvar perfil",err);
    const detail=err?.message||"Não foi possível atualizar seus dados.";
    if(status) status.textContent=detail;
    message(detail,true);
  }finally{
    saveOwnProfile.busy=false;
    button.disabled=false;
    button.textContent="Salvar dados";
  }
}
saveOwnProfile.busy=false;

function renderMembershipStatus(){
  const status=state.membership?.status || "pending";
  const map={
    pending:{icon:"⏳",title:"Cadastro aguardando aprovação",text:"Sua solicitação foi enviada ao administrador. Assim que for aprovada, você poderá acessar o bolão e registrar palpites."},
    rejected:{icon:"🚫",title:"Solicitação não aprovada",text:"Seu pedido de participação foi analisado e não foi aprovado. Fale com o administrador caso precise de mais informações."},
    inactive:{icon:"🔒",title:"Acesso desativado",text:"Seu acesso ao bolão está temporariamente desativado. Seu histórico permanece preservado."}
  };
  const content=map[status]||map.pending;
  $("membershipStatusIcon").textContent=content.icon;
  $("membershipStatusTitle").textContent=content.title;
  $("membershipStatusText").textContent=content.text;
  $("membershipStatusEmail").textContent=state.user?.email||"";
  show("welcome",false); show("app",false); show("loginBtn",false); show("headerUser",true); show("membershipStatus",true);
}


function applyCanonicalParticipantNames(){
  const byUserId=new Map((state.participants||[])
    .filter(item=>item?.user_id && item?.nome)
    .map(item=>[String(item.user_id),String(item.nome).trim()]));

  // Constrói um mapa de apelidos históricos para o nome atual. Isso é
  // necessário porque algumas views antigas expõem apenas `usuario`, sem
  // `user_id`. Ao renomear um participante, seus palpites históricos podem
  // continuar trazendo o nome anterior e criar uma segunda linha no ranking.
  const aliases=new Map();
  const registerAlias=pick=>{
    const oldName=String(pick?.usuario||'').trim();
    const canonical=pick?.user_id ? byUserId.get(String(pick.user_id)) : null;
    if(oldName && canonical && oldName!==canonical) aliases.set(oldName,canonical);
  };
  (state.ownPicks||[]).forEach(registerAlias);
  (state.publicPicks||[]).forEach(registerAlias);

  const canonicalName=name=>{
    let current=String(name||'').trim();
    const visited=new Set();
    while(aliases.has(current) && !visited.has(current)){
      visited.add(current);
      current=aliases.get(current);
    }
    return current;
  };

  const canonicalize=pick=>{
    const byId=pick?.user_id ? byUserId.get(String(pick.user_id)) : null;
    const canonical=byId || canonicalName(pick?.usuario);
    return canonical && canonical!==pick?.usuario ? {...pick,usuario:canonical} : pick;
  };

  state.ownPicks=(state.ownPicks||[]).map(canonicalize);
  state.publicPicks=(state.publicPicks||[]).map(canonicalize);

  // Consolida contagens duplicadas geradas pelo nome antigo, mantendo a maior
  // quantidade reportada para cada participante canônico.
  const countsByName=new Map();
  for(const item of state.pickCounts||[]){
    const name=canonicalName(item?.usuario);
    if(!name) continue;
    const quantity=Number(item?.quantidade)||0;
    countsByName.set(name,Math.max(countsByName.get(name)||0,quantity));
  }
  const validNames=new Set((state.participants||[]).map(item=>String(item?.nome||'').trim()).filter(Boolean));
  state.pickCounts=[...countsByName.entries()]
    .filter(([name])=>validNames.has(name))
    .map(([usuario,quantidade])=>({usuario,quantidade,user_id:(state.participants||[]).find(item=>String(item?.nome||'').trim()===usuario)?.user_id||null}));
}

async function loadData(){
  const [{data:games,error:gErr},{data:picks,error:pErr},{data:pub,error:pubErr},{data:counts,error:countsErr},{data:participants,error:participantsErr},{data:adminProgress,error:adminProgressErr},{data:authorized,error:authorizedErr},{data:participantLimit,error:participantLimitErr}] = await Promise.all([
    sb.from("jogos").select("*").order("rodada").order("inicio"),
    sb.from("palpites").select("*").eq("user_id",state.user.id),
    sb.from("palpites_encerrados_publicos").select("*"),
    sb.from("contagem_palpites_participantes").select("*"),
    sb.from("participantes").select("user_id,nome,email,time_favorito"),
    isAdminUser() ? sb.from("progresso_palpites_adm").select("user_id,usuario,id_jogo,atualizado_em") : Promise.resolve({data:[],error:null}),
    sb.from("participantes_autorizados").select("id,nome,email,celular,ativo,administrador,status,solicitado_em,aprovado_em,criado_em,atualizado_em").order("nome"),
    isAdminUser() ? sb.rpc("obter_limite_participantes_ativos") : Promise.resolve({data:10,error:null})
  ]);
  if(gErr) throw gErr; if(pErr) throw pErr; if(pubErr) console.warn(pubErr);
  if(countsErr) console.warn("Não foi possível carregar a contagem geral de palpites. Execute a atualização SQL da versão 3.8.", countsErr);
  if(participantsErr) console.warn("Os times dos demais participantes não puderam ser carregados.", participantsErr);
  if(adminProgressErr) console.warn("O progresso administrativo não pôde ser carregado. Execute o SQL da versão 4.4.1.", adminProgressErr);
  if(authorizedErr) console.warn("O cadastro dinâmico de participantes ainda não está disponível. Execute o SQL da versão 4.7.0.",authorizedErr);
  if(participantLimitErr) console.warn("O limite configurável de participantes ainda não está disponível. Execute o SQL da versão 6.7.1.",participantLimitErr);
  state.games=games||[]; state.ownPicks=picks||[]; state.publicPicks=pub||[]; state.pickCounts=counts||[]; state.participants=participants||[]; state.adminPickProgress=adminProgress||[]; state.authorizedParticipants=authorized||[]; state.participantLimit=Math.max(1,Number(participantLimit)||10);
  applyCanonicalParticipantNames();
  renderSyncStatus();
}

function renderSyncStatus(){
  const latest = state.games.map(g=>g.sincronizado_em).filter(Boolean).sort().at(-1);
  if(!latest) return;
  $("syncStatus").textContent=`Atualizado ${new Date(latest).toLocaleDateString("pt-BR")}`;
  show("syncStatus",true);
}

function updateCurrentRoundButton(){
  const button=$("currentRoundBtn");
  if(!button) return;
  const current=currentRoundNumber();
  const selected=Number($("roundSelect")?.value);
  button.disabled=selected===current;
  button.setAttribute("aria-label", selected===current ? `Você já está na ${current}ª rodada, a rodada atual` : `Ir para a ${current}ª rodada, a rodada atual`);
  button.title=selected===current ? `Rodada atual: ${current}ª` : `Ir para a rodada atual (${current}ª)`;
}

function renderRoundNumberStrip(){
  const strip=$("roundNumberStrip");
  const select=$("roundSelect");
  if(!strip || !select) return;
  const rounds=[...select.options].map(option=>Number(option.value)).filter(Number.isFinite);
  const selected=Number(select.value);
  const selectedIndex=Math.max(0,rounds.indexOf(selected));
  const visibleCount=5;
  let start=Math.max(0,selectedIndex-Math.floor(visibleCount/2));
  start=Math.min(start,Math.max(0,rounds.length-visibleCount));
  const visible=rounds.slice(start,start+visibleCount);
  strip.innerHTML=visible.map(round=>`<button type="button" class="round-number-button ${round===selected?'is-selected':''}" data-round="${round}" aria-pressed="${round===selected}" aria-label="Selecionar rodada ${round}">${round}</button>`).join("");
  strip.querySelectorAll('[data-round]').forEach(button=>button.addEventListener('click',()=>{
    select.value=button.dataset.round;
    renderGames();
  }));
  const previous=$("prevRound"), next=$("nextRound");
  if(previous) previous.disabled=selectedIndex<=0;
  if(next) next.disabled=selectedIndex>=rounds.length-1;
}

function renderRounds(){
  const rounds=[...new Set(state.games.map(g=>Number(g.rodada)))].sort((a,b)=>a-b);
  $("roundSelect").innerHTML=rounds.map(r=>`<option value="${r}">Rodada ${r}</option>`).join("");
  $("roundSelect").value=currentRoundNumber();
  $("roundSelect").onchange=renderGames;
  $("prevRound").onclick=()=>changeRound(-1); $("nextRound").onclick=()=>changeRound(1);
  if($("saveAllPicks")) $("saveAllPicks").onclick=saveAllPicks;
  $("currentRoundBtn").onclick=goToCurrentRound;
  renderRoundNumberStrip();
  updateCurrentRoundButton();
}
function changeRound(delta){ const s=$("roundSelect"), next=s.selectedIndex+delta; if(next>=0&&next<s.options.length){s.selectedIndex=next;renderGames();} }
function goToCurrentRound(){
  const select=$("roundSelect");
  const round=currentRoundNumber();
  if(!select || Number(select.value)===round) return;
  select.value=String(round);
  renderGames();
  $("gamesTab")?.scrollIntoView({behavior:"smooth",block:"start"});
}
function ownPick(gameId){ return state.ownPicks.find(p=>Number(p.id_jogo)===Number(gameId)); }

const PICK_DRAFTS_STORAGE_KEY = "bolao-pick-drafts";

function loadPickDrafts(){
  try{
    const stored=JSON.parse(sessionStorage.getItem(PICK_DRAFTS_STORAGE_KEY)||"{}");
    state.pickDrafts=stored && typeof stored==="object" ? stored : {};
  }catch{
    state.pickDrafts={};
  }
}

function persistPickDrafts(){
  try{
    sessionStorage.setItem(PICK_DRAFTS_STORAGE_KEY,JSON.stringify(state.pickDrafts));
  }catch(error){
    console.warn(`[Bolão v${APP_VERSION}] Não foi possível preservar os rascunhos de palpites.`,error);
  }
}

function pickDraft(gameId){
  return state.pickDrafts[String(Number(gameId))]||null;
}

function updatePickDraft(gameId,side,value){
  const key=String(Number(gameId));
  const saved=ownPick(gameId);
  const current=state.pickDrafts[key]||{
    gols_casa:saved?.gols_casa!=null?String(saved.gols_casa):"",
    gols_fora:saved?.gols_fora!=null?String(saved.gols_fora):""
  };
  current[side]=value;
  const savedHome=saved?.gols_casa!=null?String(saved.gols_casa):"";
  const savedAway=saved?.gols_fora!=null?String(saved.gols_fora):"";
  if(current.gols_casa===savedHome && current.gols_fora===savedAway){
    delete state.pickDrafts[key];
  }else{
    state.pickDrafts[key]=current;
  }
  persistPickDrafts();
}

function clearPickDrafts(gameIds){
  gameIds.forEach(id=>delete state.pickDrafts[String(Number(id))]);
  persistPickDrafts();
}

function validPickDraft(gameId){
  const draft=pickDraft(gameId);
  return Boolean(draft && draft.gols_casa!=="" && draft.gols_fora!=="");
}

function pendingDraftsForRound(round=Number($("roundSelect")?.value||0)){
  return state.games.filter(game=>
    Number(game.rodada)===Number(round) &&
    !locked(game) &&
    !isFinished(game) &&
    Boolean(pickDraft(game.id_jogo))
  );
}

function updateSaveControls(){
  const round=Number($("roundSelect")?.value||0);
  const roundGames=state.games.filter(game=>Number(game.rodada)===round);
  const pending=pendingDraftsForRound(round).length;
  const completed=roundGames.filter(game=>ownPick(game.id_jogo)).length;
  const button=$("saveAllPicks");
  const dock=$("gamesSaveDock");
  if($("gamesSaveProgress")){
    $("gamesSaveProgress").textContent=pending
      ? `${pending} palpite${pending===1?"":"s"} não salvo${pending===1?"":"s"}`
      : `${completed} de ${roundGames.length} palpites salvos`;
  }
  if(button){
    button.disabled=pending===0;
    button.textContent=pending ? `▣ Salvar todos (${pending})` : "✓ Tudo salvo";
  }
  const editable=roundGames.some(game=>!locked(game)&&!isFinished(game));
  dock?.classList.toggle("hidden",!editable);
  requestAnimationFrame(updateGamesBottomSpacing);
}

function updateCardDraftUi(card){
  if(!card) return;
  const id=Number(card.dataset.id);
  const draft=pickDraft(id);
  const saved=ownPick(id);
  const status=card.querySelector(".premium-pick-inputs small");
  const saveButton=card.querySelector(".premium-save-pick");
  card.classList.toggle("has-unsaved",Boolean(draft));
  card.classList.toggle("has-pick",Boolean(saved));
  card.classList.toggle("needs-pick",!saved);
  if(status) status.textContent=draft?"Alteração não salva":saved?"Seu palpite":"Palpite não feito";
  const expandedStatus=card.querySelector("[data-game-expanded-status]");
  if(expandedStatus && !draft) expandedStatus.textContent=saved?"SALVO":"ABERTO";
  const summary=card.querySelector(".premium-toggle-score");
  if(summary && saved && !draft) summary.textContent=`${saved.gols_casa} × ${saved.gols_fora}`;
  if(saveButton){
    saveButton.disabled=!validPickDraft(id);
    saveButton.textContent=draft?contextualSavePickLabel(card):saved?"✓ Palpite salvo":contextualSavePickLabel(card);
  }
  updateSaveControls();
}

loadPickDrafts();


function roundLifecycleSummary(games){
  const list=Array.isArray(games)?games:[];
  const counts={total:list.length,finished:0,live:0,future:0,postponed:0,cancelled:0};
  list.forEach(game=>{
    const key=gameStatusDisplay(game).key;
    if(Object.prototype.hasOwnProperty.call(counts,key)) counts[key]++;
  });
  const concluded=counts.finished+counts.cancelled;
  const completion=counts.total?Math.round(concluded/counts.total*100):0;
  let status="OPEN";
  if(counts.total && concluded===counts.total) status="FINISHED";
  else if(counts.postponed>0 && counts.live===0 && counts.future===0) status="PARTIAL";
  else if(counts.live>0 || concluded>0) status=counts.postponed>0?"PARTIAL":"IN_PROGRESS";
  return {...counts,concluded,completion,status,isProvisional:counts.postponed>0};
}

function roundLifecyclePresentation(summary){
  const data=summary||roundLifecycleSummary([]);
  if(data.status==="FINISHED") return {label:"Rodada concluída",tone:"finished",icon:"✓",message:"Resultados e pontuações consolidados."};
  if(data.status==="PARTIAL") return {label:"Rodada parcialmente concluída",tone:"partial",icon:"!",message:"Pontuação provisória enquanto houver partidas pendentes."};
  if(data.status==="IN_PROGRESS") return {label:"Rodada em andamento",tone:"live",icon:"●",message:"Resultados e pontuações ainda podem mudar."};
  return {label:"Rodada aberta",tone:"open",icon:"◷",message:"Partidas ainda não iniciadas."};
}

function renderRoundProgress(games){
  const completed=games.filter(g=>ownPick(g.id_jogo)).length;
  const postponed=games.filter(isPostponed).length;
  const pending=games.filter(g=>!isPostponed(g)&&!locked(g)&&!isFinished(g)&&!ownPick(g.id_jogo)).length;
  const closed=games.filter(g=>!isPostponed(g)&&locked(g)&&!isFinished(g)).length;
  const percentage=games.length?Math.round(completed/games.length*100):0;
  const round=Number($("roundSelect")?.value||0);
  const lifecycle=roundLifecycleSummary(games);
  if($("gamesRoundTitle")) $("gamesRoundTitle").textContent=`Rodada ${round}`;
  $("roundProgress").innerHTML=`
    <div class="games-progress-stat is-done"><span class="games-progress-icon">✓</span><div><strong>${completed}</strong><b>PALPITES FEITOS</b><small>de ${games.length} jogos</small></div></div>
    <div class="games-progress-stat is-pending"><span class="games-progress-icon">◷</span><div><strong>${pending}</strong><b>PENDENTES</b><small>para palpitar</small></div></div>
    <div class="games-progress-stat is-postponed"><span class="games-progress-icon">🟠</span><div><strong>${postponed}</strong><b>ADIADOS</b><small>${postponed?"palpites preservados":"nenhum nesta rodada"}</small></div></div>
    <div class="games-progress-stat is-closed"><span class="games-progress-icon">▣</span><div><strong>${closed}</strong><b>FECHADOS</b><small>sem adiamentos</small></div></div>
    ${lifecycle.isProvisional?`<div class="round-provisional-note"><strong>Rodada parcialmente concluída</strong><span>${lifecycle.concluded} de ${lifecycle.total} jogos concluídos • ${lifecycle.postponed} adiado${lifecycle.postponed===1?"":"s"}</span></div>`:""}`;
  const counts={filterAllCount:games.length,filterOpenCount:games.filter(g=>!isPostponed(g)&&!locked(g)).length,filterPickedCount:completed,filterFinishedCount:games.filter(isFinished).length,filterPostponedCount:postponed};
  Object.entries(counts).forEach(([id,value])=>{if($(id))$(id).textContent=value;});
  if($("gamesSaveProgress")) $("gamesSaveProgress").textContent=`${completed} de ${games.length} palpites feitos`;
  if($("gamesSaveBar")) $("gamesSaveBar").style.width=`${percentage}%`;
}
function teamLogo(url,name){
  const safe=escapeHtml(name), fallback=initials(name);
  return url ? `<img src="${escapeHtml(url)}" alt="Escudo do ${safe}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove();this.parentElement.textContent='${fallback}'">` : fallback;
}

function compactTeam(url,name){
  const safeName=escapeHtml(name);
  const abbreviation=teamAbbreviation(name);
  const fallback=escapeHtml(abbreviation.slice(0,2));
  const crest=url
    ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove();this.parentElement.textContent='${fallback}'">`
    : fallback;
  return `<span class="game-summary-team" aria-label="${safeName}"><span class="game-summary-crest" aria-hidden="true">${crest}</span><strong>${escapeHtml(abbreviation)}</strong></span>`;
}

function filterGames(games){
  if(state.gameFilter==="open") return games.filter(g=>!locked(g));
  if(state.gameFilter==="picked") return games.filter(g=>ownPick(g.id_jogo));
  if(state.gameFilter==="finished") return games.filter(isFinished);
  if(state.gameFilter==="postponed") return games.filter(isPostponed);
  return games;
}

function preferredOpenGameId(games){
  const visibleIds=new Set(games.map(game=>Number(game.id_jogo)));
  if(state.openGameId!=null && visibleIds.has(Number(state.openGameId))) return Number(state.openGameId);
  const pending=games.find(game=>!isPostponed(game) && !locked(game) && !isFinished(game) && !ownPick(game.id_jogo));
  return pending ? Number(pending.id_jogo) : null;
}

function setGameCardExpanded(card, expanded, animate=true){
  if(!card) return;
  const body=card.querySelector(".game-collapsible");
  const toggle=card.querySelector(".game-toggle");
  if(!body || !toggle) return;
  card.classList.toggle("is-expanded",expanded);
  toggle.setAttribute("aria-expanded",String(expanded));
  if(!animate){
    body.style.transition="none";
    body.style.maxHeight=expanded ? `${body.scrollHeight}px` : "0px";
    body.style.opacity=expanded ? "1" : "0";
    requestAnimationFrame(()=>body.style.removeProperty("transition"));
    return;
  }
  if(expanded){
    body.style.maxHeight="0px";
    body.style.opacity="0";
    requestAnimationFrame(()=>{
      body.style.maxHeight=`${body.scrollHeight}px`;
      body.style.opacity="1";
    });
  }else{
    body.style.maxHeight=`${body.scrollHeight}px`;
    requestAnimationFrame(()=>{
      body.style.maxHeight="0px";
      body.style.opacity="0";
    });
  }
}

function toggleGameCard(card){
  const willExpand=!card.classList.contains("is-expanded");
  setGameCardExpanded(card,willExpand,true);
  state.openGameId=willExpand ? Number(card.dataset.id) : null;
}

function nextEmptyGameCard(currentCard){
  const cards=[...document.querySelectorAll(".premium-match-card[data-id]")];
  const currentIndex=cards.indexOf(currentCard);
  if(currentIndex<0) return null;
  return cards.slice(currentIndex+1).find(card=>{
    const id=Number(card.dataset.id);
    const game=state.games.find(item=>Number(item.id_jogo)===id);
    return game && !isPostponed(game) && !locked(game) && !isFinished(game) && !ownPick(id) && !pickDraft(id);
  })||null;
}

function contextualSavePickLabel(card){
  return nextEmptyGameCard(card)?"Salvar e próximo →":"Salvar palpite";
}

function refreshContextualSaveButtons(){
  document.querySelectorAll(".premium-save-pick").forEach(button=>{
    const card=button.closest(".premium-match-card");
    if(!card || button.dataset.busy==="true") return;
    const id=Number(card.dataset.id);
    button.textContent=pickDraft(id)?contextualSavePickLabel(card):ownPick(id)?"✓ Palpite salvo":contextualSavePickLabel(card);
  });
}

function openNextEmptyGameCard(currentCard){
  const nextCard=nextEmptyGameCard(currentCard);
  if(!nextCard) return false;
  setGameCardExpanded(currentCard,false,true);
  setGameCardExpanded(nextCard,true,true);
  state.openGameId=Number(nextCard.dataset.id);
  window.setTimeout(()=>{
    nextCard.scrollIntoView({behavior:"smooth",block:"center"});
    window.setTimeout(()=>nextCard.querySelector(".home-score")?.focus({preventScroll:true}),350);
  },220);
  return true;
}

function premiumDayKey(value){
  const d=new Date(value); return Number.isNaN(d.getTime())?"":`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function premiumDayLabel(value){
  const d=new Date(value); if(Number.isNaN(d.getTime())) return "Data a definir";
  const day=d.toLocaleDateString("pt-BR",{weekday:"long"});
  return `${day.charAt(0).toUpperCase()+day.slice(1)}, ${d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}`;
}
function premiumTime(value){
  const d=new Date(value); return Number.isNaN(d.getTime())?"--:--":d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}
function liveMatchMinute(game){
  const officialCandidates=[game?.minuto,game?.minute,game?.elapsed,game?.tempo_jogo,game?.match_minute];
  for(const value of officialCandidates){
    const parsed=Number.parseInt(String(value??"").replace(/[^0-9]/g,""),10);
    if(Number.isFinite(parsed)&&parsed>0) return parsed>=90?"90+":String(Math.min(parsed,90));
  }
  const kickoff=new Date(game?.inicio).getTime();
  if(!Number.isFinite(kickoff)) return "";
  const wallMinutes=Math.floor((Date.now()-kickoff)/60000);
  if(wallMinutes<0) return "";
  const estimated=wallMinutes<=50?Math.min(Math.max(wallMinutes,1),45):Math.min(Math.max(wallMinutes-15,46),90);
  return estimated>=90?"90+":String(estimated);
}
function premiumMatchCard(g){
  const favorite=favoriteTeamMatchData(g);
  const favoriteTeamName=favorite.homeFavorite?g.time_casa:favorite.awayFavorite?g.time_fora:"";
  const favoriteStyle=favorite.isFavoriteMatch?` style="--favorite-primary:${favorite.colors[0]};--favorite-secondary:${favorite.colors[1]};--favorite-text:${favorite.colors[2]}"`:"";
  const pick=ownPick(g.id_jogo), draft=pickDraft(g.id_jogo), isLocked=locked(g), finished=isFinished(g), status=gameStatusDisplay(g);
  const live=status.key==="live", hasScore=g.gols_casa!=null&&g.gols_fora!=null;
  const rawStatus=normalizeTeamKey(g?.status||"");
  const suspended=rawStatus.includes("suspens");
  const interval=live&&(rawStatus.includes("intervalo")||rawStatus.includes("half-time")||rawStatus.includes("paused"));
  const stateClass=status.key==="cancelled"?"is-cancelled":suspended?"is-suspended":status.key==="postponed"?"is-postponed":finished?"is-finished":live?"is-live":isLocked?"is-soon":pick?"is-picked":"is-open";
  const liveMinute=live&&!interval?liveMatchMinute(g):"";
  const headerStatusLabel=status.key==="cancelled"?"CANCELADO":suspended?"SUSPENSO":status.key==="postponed"?"ADIADO":finished?"ENCERRADO":interval?"INTERVALO":live?`AO VIVO${liveMinute?` • ${liveMinute}'`:""}`:"";
  const expandedStatusLabel=headerStatusLabel|| (isLocked?"FECHADO":pick?"SALVO":"ABERTO");
  const summaryScore=finished&&hasScore?`${g.gols_casa} × ${g.gols_fora}`:live&&hasScore?`${g.gols_casa} × ${g.gols_fora}`:pick?`${pick.gols_casa} × ${pick.gols_fora}`:"Palpite pendente";
  const center=finished&&hasScore
    ? `<div class="premium-score-display"><strong>${g.gols_casa}</strong><span>×</span><strong>${g.gols_fora}</strong><small>Resultado final</small></div>`
    : live&&hasScore
      ? `<div class="premium-score-display live"><strong>${g.gols_casa}</strong><span>×</span><strong>${g.gols_fora}</strong><small>Placar ao vivo</small></div>`
      : `<div class="premium-pick-inputs"><input class="home-score" inputmode="numeric" type="number" min="0" max="15" aria-label="Gols do ${escapeHtml(g.time_casa)}" value="${escapeHtml(draft?.gols_casa??pick?.gols_casa??"")}" ${isLocked?"disabled":""}><span>×</span><input class="away-score" inputmode="numeric" type="number" min="0" max="15" aria-label="Gols do ${escapeHtml(g.time_fora)}" value="${escapeHtml(draft?.gols_fora??pick?.gols_fora??"")}" ${isLocked?"disabled":""}><small>${draft?"Alteração não salva":pick?"Seu palpite":"Palpite não feito"}</small></div>`;
  const showComparison=(finished||live)&&hasScore;
  const comparisonPoints=pick?(finished?points(pick,g):calculatePredictionPoints(pick,g)):0;
  const headerPointsLabel=finished&&hasScore?`${comparisonPoints}`:"";
  const resultComparison=showComparison
    ? `<div class="premium-result-comparison ${live?"is-live-comparison":""}">
        <div class="premium-comparison-score"><span>SEU PALPITE</span><strong>${pick?`${pick.gols_casa} × ${pick.gols_fora}`:"—"}</strong><small>${pick?"Palpite registrado":"Nenhum palpite"}</small></div>
        <div class="premium-comparison-divider" aria-hidden="true">vs</div>
        <div class="premium-comparison-score is-result"><span>${live?"PLACAR ATUAL":"RESULTADO REAL"}</span><strong>${g.gols_casa} × ${g.gols_fora}</strong><small>${live?"Jogo em andamento":"Placar final"}</small></div>
        <div class="premium-comparison-points">${pick?`<strong>${comparisonPoints} pts</strong><small>${predictionResultLabel(comparisonPoints,{live})}${live?" • parcial":""}</small>`:`<strong>0 pts</strong><small>${live?"Sem palpite • parcial":"Sem palpite"}</small>`}</div>
      </div>`
    : "";
  return `<article class="premium-match-card game-card-v2 ${stateClass} ${pick?"has-pick":"needs-pick"} ${draft?"has-unsaved":""} ${favorite.isFavoriteMatch?"is-favorite-team-match":""}" data-id="${g.id_jogo}"${favoriteStyle}>
    <button class="game-toggle premium-game-toggle" type="button" aria-expanded="false">
      <span class="premium-toggle-time"><strong>${premiumTime(g.inicio)}</strong><small title="${escapeHtml(g.local_partida||"Local a definir")}">${escapeHtml(g.local_partida||"Local a definir")}</small></span>
      <span class="premium-toggle-match">${compactTeam(g.time_casa_logo,g.time_casa).replace("game-summary-team",`game-summary-team${favorite.homeFavorite?" is-favorite-team":""}`)}<span class="premium-toggle-score">${escapeHtml(summaryScore)}</span>${compactTeam(g.time_fora_logo,g.time_fora).replace("game-summary-team",`game-summary-team${favorite.awayFavorite?" is-favorite-team":""}`)}</span>
      <span class="premium-toggle-side">${favorite.isFavoriteMatch?favoriteHeartBadge(favoriteTeamName):""}${headerStatusLabel?`<span class="premium-toggle-status" data-game-header-status>${headerStatusLabel}</span>`:""}${headerPointsLabel!==""?`<span class="premium-toggle-points" aria-label="${headerPointsLabel} pontos no jogo"><span aria-hidden="true">★</span>${headerPointsLabel}</span>`:""}<span class="game-chevron" aria-hidden="true">⌄</span></span>
    </button>
    <div class="game-collapsible" style="max-height:0;opacity:0">
      <div class="game-collapsible-inner premium-game-body premium-game-body-v2">
        ${status.key==="postponed"?`<div class="postponed-match-notice" role="status"><span aria-hidden="true">🟠</span><div><strong>Partida adiada</strong><p>Nova data ainda não definida. ${pick?"Seu palpite foi preservado e permanece bloqueado.":"O período original de palpites foi encerrado."} A pontuação será calculada quando a partida for realizada.</p></div></div>`:""}
        <div class="premium-expanded-meta">
          <div class="premium-match-time"><strong>${status.key==="postponed"?"A definir":premiumTime(g.inicio)}</strong><span>${escapeHtml(g.local_partida||"Local a definir")}</span><small data-game-deadline>◷ ${deadlineText(g)}</small></div>
          <div class="premium-match-state"><span data-game-expanded-status>${expandedStatusLabel}</span>${!isLocked&&!finished?`<button class="premium-edit-pick" type="button" aria-label="Editar palpite">✎</button>`:""}</div>
        </div>
        <div class="premium-expanded-matchup">
          <div class="premium-team premium-team-home ${favorite.homeFavorite?"is-favorite-team":""}"><span class="team-badge">${teamLogo(g.time_casa_logo,g.time_casa)}</span><b>${escapeHtml(g.time_casa)}${favorite.homeFavorite?`<span class="favorite-team-name-heart" aria-hidden="true">♥</span>`:""}</b></div>
          <div class="premium-expanded-center">${center}</div>
          <div class="premium-team premium-team-away ${favorite.awayFavorite?"is-favorite-team":""}"><span class="team-badge">${teamLogo(g.time_fora_logo,g.time_fora)}</span><b>${escapeHtml(g.time_fora)}${favorite.awayFavorite?`<span class="favorite-team-name-heart" aria-hidden="true">♥</span>`:""}</b></div>
        </div>
        ${!isLocked&&!finished?`<div class="premium-game-actions"><button class="primary premium-save-pick" type="button" ${validPickDraft(g.id_jogo)?"":"disabled"}>${draft?"Salvar palpite":pick?"✓ Palpite salvo":"Salvar palpite"}</button></div>`:""}
        ${resultComparison}
      </div>
    </div>
  </article>`;
}

function updateGamesBottomSpacing(){
  const tab=$("gamesTab");
  const list=$("gamesList");
  if(!tab || !list) return;
  const nav=document.querySelector(".bottom-nav");
  const dock=$("gamesSaveDock");
  const navHeight=nav && !nav.classList.contains("hidden") ? nav.getBoundingClientRect().height : 0;
  const dockHeight=dock && !dock.classList.contains("hidden") ? dock.getBoundingClientRect().height : 0;
  const navBottom=nav ? Math.max(0,window.innerHeight-nav.getBoundingClientRect().bottom) : 0;
  const safeGap=32;
  const occupied=Math.ceil(navHeight+dockHeight+navBottom);
  const tabTail=Math.max(170,occupied+safeGap);
  const listTail=Math.max(120,dockHeight+safeGap);
  tab.style.setProperty("--games-bottom-space",`${tabTail}px`);
  list.style.setProperty("--games-list-tail-space",`${listTail}px`);
}

function gameStructuralSignature(game){
  const status=gameStatusDisplay(game);
  return [
    Number(game.id_jogo),
    status.key,
    locked(game)?1:0,
    isFinished(game)?1:0,
    game.gols_casa??"",
    game.gols_fora??""
  ].join(":");
}

function currentGamesStructuralSignature(){
  const round=Number($("roundSelect")?.value||0);
  return state.games
    .filter(game=>Number(game.rodada)===round)
    .sort((a,b)=>Number(a.id_jogo)-Number(b.id_jogo))
    .map(gameStructuralSignature)
    .join("|");
}

function refreshVisibleGameClocks(){
  document.querySelectorAll(".premium-match-card[data-id]").forEach(card=>{
    const game=state.games.find(item=>Number(item.id_jogo)===Number(card.dataset.id));
    if(!game) return;
    const status=gameStatusDisplay(game);
    const rawStatus=normalizeTeamKey(game?.status||"");
    const suspended=rawStatus.includes("suspens");
    const interval=status.key==="live"&&(rawStatus.includes("intervalo")||rawStatus.includes("half-time")||rawStatus.includes("paused"));
    const liveMinute=status.key==="live"&&!interval?liveMatchMinute(game):"";
    const headerLabel=status.key==="cancelled"?"CANCELADO":suspended?"SUSPENSO":status.key==="postponed"?"ADIADO":isFinished(game)?"ENCERRADO":interval?"INTERVALO":status.key==="live"?`AO VIVO${liveMinute?` • ${liveMinute}'`:""}`:"";
    const expandedLabel=headerLabel||(locked(game)?"FECHADO":ownPick(game.id_jogo)?"SALVO":"ABERTO");
    const deadline=card.querySelector("[data-game-deadline]");
    const header=card.querySelector("[data-game-header-status]");
    const expanded=card.querySelector("[data-game-expanded-status]");
    if(deadline) deadline.textContent=`◷ ${deadlineText(game)}`;
    if(header) header.textContent=headerLabel;
    if(expanded) expanded.textContent=expandedLabel;
  });
}

function renderGames(){
  const round=Number($("roundSelect").value); updateCurrentRoundButton(); renderRoundNumberStrip();
  const roundGames=state.games.filter(g=>Number(g.rodada)===round).sort((a,b)=>new Date(a.inicio)-new Date(b.inicio));
  if(roundGames.length && roundGames.length<10){
    console.warn(`[Bolão v${APP_VERSION}] Rodada ${round} incompleta: ${roundGames.length}/10 jogos carregados. Execute “Sincronizar jogos agora” no painel ADM para recuperar partidas omitidas pela API.`);
  }
  renderRoundProgress(roundGames);
  const games=filterGames(roundGames);
  const groups=new Map(); games.forEach(g=>{const key=premiumDayKey(g.inicio)||"unknown";if(!groups.has(key))groups.set(key,[]);groups.get(key).push(g);});
  $("gamesList").innerHTML=games.length?[...groups.values()].map(dayGames=>{
    const first=dayGames[0], open=dayGames.find(g=>!locked(g)&&!isFinished(g));
    const dayStatus=dayGames.some(g=>gameStatusDisplay(g).key==="live")?"AO VIVO":dayGames.every(isFinished)?"ENCERRADO":open?deadlineText(open):"FECHADO";
    return `<section class="premium-day-group"><header><strong>▣ ${premiumDayLabel(first.inicio)}</strong><span>${dayStatus}</span></header><div>${dayGames.map(premiumMatchCard).join("")}</div></section>`;
  }).join(""):`<div class="card empty-state">Nenhum jogo corresponde a este filtro.</div>`;
  updateSaveControls();
  document.querySelectorAll(".premium-match-card input").forEach(input=>input.addEventListener("input",()=>{
    const card=input.closest(".premium-match-card");
    if(!card) return;
    const side=input.classList.contains("home-score")?"gols_casa":"gols_fora";
    updatePickDraft(Number(card.dataset.id),side,input.value);
    updateCardDraftUi(card);
  }));
  document.querySelectorAll(".premium-save-pick").forEach(btn=>btn.addEventListener("click",savePick));
  refreshContextualSaveButtons();
  document.querySelectorAll(".premium-edit-pick").forEach(btn=>btn.addEventListener("click",()=>btn.closest(".premium-match-card")?.querySelector("input")?.focus()));
  const cards=[...document.querySelectorAll(".premium-match-card")];
  cards.forEach(card=>{
    card.querySelector(".game-toggle")?.addEventListener("click",()=>toggleGameCard(card));
    setGameCardExpanded(card,false,false);
  });

  const renderContext=`${round}:${state.gameFilter}`;
  const contextChanged=state.gameAutoOpenContext!==renderContext;
  let preferred=null;

  if(state.openGameId!=null){
    preferred=cards.find(card=>Number(card.dataset.id)===Number(state.openGameId))||null;
    if(!preferred) state.openGameId=null;
  }

  if(!preferred && contextChanged){
    const firstCard=cards[0];
    if(firstCard && firstCard.classList.contains("needs-pick") && !firstCard.classList.contains("is-finished")){
      preferred=firstCard;
      state.openGameId=Number(firstCard.dataset.id);
    }
  }

  state.gameAutoOpenContext=renderContext;
  state.gameRenderSignature=currentGamesStructuralSignature();
  if(preferred) setGameCardExpanded(preferred,true,false);
}

async function saveAllPicks(){
  const button=$("saveAllPicks");
  const round=Number($("roundSelect")?.value||0);
  const games=pendingDraftsForRound(round);
  if(!games.length) return message("Todos os palpites desta rodada já estão salvos.");
  const incomplete=games.find(game=>!validPickDraft(game.id_jogo));
  if(incomplete) return message("Complete os dois placares dos palpites alterados antes de salvar todos.",true);
  const payloads=games.map(game=>{
    const draft=pickDraft(game.id_jogo);
    return {id_jogo:Number(game.id_jogo),user_id:state.user.id,usuario:state.participant.nome,gols_casa:Number(draft.gols_casa),gols_fora:Number(draft.gols_fora)};
  });
  button.disabled=true;button.textContent="Salvando…";
  const {data,error}=await sb.from("palpites").upsert(payloads,{onConflict:"id_jogo,user_id"}).select();
  if(error){ updateSaveControls(); return message(error.message,true); }
  const ids=new Set(payloads.map(payload=>Number(payload.id_jogo)));
  state.ownPicks=state.ownPicks.filter(pick=>!ids.has(Number(pick.id_jogo))).concat(data||payloads);
  clearPickDrafts([...ids]);
  state.pickCounts=state.pickCounts.filter(item=>item?.user_id ? String(item.user_id)!==String(state.user.id) : item.usuario!==state.participant.nome).concat({user_id:state.user.id,usuario:state.participant.nome,quantidade:state.ownPicks.length});
  message(`${payloads.length} palpite${payloads.length===1?"":"s"} salvo${payloads.length===1?"":"s"} com sucesso.`);
  renderGames();renderRanking();renderStats();renderHome();
}

async function savePick(event){
  const button=event.currentTarget;
  if(!button?.classList?.contains("premium-save-pick")) return;
  const card=button.closest(".premium-match-card");
  if(!card) return;
  const id=Number(card.dataset.id);
  const game=state.games.find(item=>Number(item.id_jogo)===id);
  if(!game || locked(game)) return message("O prazo para este palpite já terminou.",true);
  const home=card.querySelector(".home-score")?.value??"";
  const away=card.querySelector(".away-score")?.value??"";
  if(home===""||away==="") return message("Informe os dois placares.",true);
  button.dataset.busy="true";button.disabled=true;button.textContent="Salvando…";
  const payload={id_jogo:id,user_id:state.user.id,usuario:state.participant.nome,gols_casa:Number(home),gols_fora:Number(away)};
  const {data,error}=await sb.from("palpites").upsert(payload,{onConflict:"id_jogo,user_id"}).select().single();
  if(error){button.dataset.busy="false";button.disabled=false;button.textContent="Tentar novamente";return message(error.message,true);}
  state.ownPicks=state.ownPicks.filter(pick=>Number(pick.id_jogo)!==id).concat(data||payload);
  clearPickDrafts([id]);
  state.pickCounts=state.pickCounts.filter(item=>item?.user_id ? String(item.user_id)!==String(state.user.id) : item.usuario!==state.participant.nome).concat({user_id:state.user.id,usuario:state.participant.nome,quantidade:state.ownPicks.length});
  state.openGameId=id;
  updateCardDraftUi(card);
  button.dataset.busy="false";button.disabled=true;button.textContent="✓ Palpite salvo";
  const advanced=openNextEmptyGameCard(card);
  message(advanced?"Palpite salvo. Próximo jogo aberto para preenchimento.":"Palpite salvo com sucesso.");
  renderRoundProgress(state.games.filter(item=>Number(item.rodada)===Number($("roundSelect")?.value||0)));
  renderRanking();renderStats();renderHome();
}

function calculateRanking(){
  // A identidade canônica do ranking é user_id. O nome permanece somente como
  // informação de exibição e como fallback temporário para registros legados.
  const players=new Map();
  const profilesByEmail=new Map((state.participants||[]).map(item=>[String(item?.email||"").toLowerCase(),item]));
  const profilesByName=new Map((state.participants||[]).map(item=>[String(item?.nome||"").trim().toLowerCase(),item]));
  const identityFor=(userId,name)=>userId ? `id:${String(userId)}` : `legacy:${String(name||"").trim().toLowerCase()}`;
  const ensurePlayer=(userId,name)=>{
    const displayName=String(name||"").trim();
    if(!displayName && !userId) return null;
    const key=identityFor(userId,displayName);
    if(!players.has(key)) players.set(key,{key,userId:userId||null,name:displayName||"Participante",total:0,exact:0,count:0,scored:0});
    else if(displayName) players.get(key).name=displayName;
    return players.get(key);
  };

  for(const [email,name] of Object.entries(participantDirectory())){
    const profile=profilesByEmail.get(String(email).toLowerCase()) || profilesByName.get(String(name||"").trim().toLowerCase());
    ensurePlayer(profile?.user_id||null,profile?.nome||name);
  }
  for(const profile of state.participants||[]) ensurePlayer(profile?.user_id||null,profile?.nome);

  for(const item of state.pickCounts||[]){
    const profile=item?.user_id
      ? (state.participants||[]).find(candidate=>String(candidate?.user_id)===String(item.user_id))
      : profilesByName.get(String(item?.usuario||"").trim().toLowerCase());
    const player=ensurePlayer(profile?.user_id||item?.user_id||null,profile?.nome||item?.usuario);
    if(player) player.count=Math.max(player.count,Number(item?.quantidade)||0);
  }

  if(state.participant?.nome){
    const player=ensurePlayer(state.participant?.user_id||state.user?.id||null,state.participant.nome);
    if(player) player.count=Math.max(player.count,state.ownPicks.length);
  }

  for(const pick of state.publicPicks||[]){
    const profile=pick?.user_id
      ? (state.participants||[]).find(candidate=>String(candidate?.user_id)===String(pick.user_id))
      : profilesByName.get(String(pick?.usuario||"").trim().toLowerCase());
    const player=ensurePlayer(profile?.user_id||pick?.user_id||null,profile?.nome||pick?.usuario);
    if(!player) continue;
    const game=state.games.find(item=>Number(item.id_jogo)===Number(pick.id_jogo));
    const pts=points(pick,game);
    player.total+=pts;
    if(isScorableGame(game)) player.scored++;
    if(pts===10) player.exact++;
  }
  state.ranking=[...players.values()].sort((a,b)=>b.total-a.total||b.exact-a.exact||a.name.localeCompare(b.name));
}

function isCurrentRankingParticipant(item){
  if(item?.userId && state.user?.id) return String(item.userId)===String(state.user.id);
  return String(item?.name||"").trim().toLowerCase()===String(state.participant?.nome||"").trim().toLowerCase();
}

function renderDashboard(){
  const me=state.ranking.find(isCurrentRankingParticipant)||{total:0,exact:0,count:state.ownPicks.length,scored:0};
  const pos=state.ranking.findIndex(isCurrentRankingParticipant), totalGames=state.games.length||380;
  $("myPosition").textContent=pos>=0?`${pos+1}º`:"—"; $("myPoints").textContent=me.total; $("myExact").textContent=me.exact; $("myPickCount").textContent=state.ownPicks.length;
  $("averagePoints").textContent=`${me.scored? (me.total/me.scored).toFixed(1):"0"} por jogo finalizado`;
  $("exactRate").textContent=`${me.scored?Math.round(me.exact/me.scored*100):0}% de precisão`;
  $("pickCoverage").textContent=`${Math.round(state.ownPicks.length/totalGames*100)}% da temporada`;
  $("positionHint").textContent=state.ranking.length?`entre ${state.ranking.length} participantes`:"Ranking geral";
  if($("headerUserPosition")) $("headerUserPosition").textContent=pos>=0?`${pos+1}º lugar · ${me.total} ${me.total===1?"ponto":"pontos"}`:"Ranking geral";
}


function homeRoundGames(){
  const round=currentRoundNumber();
  return state.games.filter(game=>Number(game.rodada)===Number(round));
}

function homeDeadline(game){
  if(!game) return "";
  const closeAt=new Date(game.inicio).getTime()-CONFIG.lockMinutesBefore*60000;
  if(!Number.isFinite(closeAt)) return "";
  return new Date(closeAt).toLocaleString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
}

function roundHighlightsPicks(){
  const combined=[...(state.publicPicks||[])];
  for(const pick of state.ownPicks||[]){
    const duplicate=combined.some(item=>Number(item?.id_jogo)===Number(pick?.id_jogo) && (
      item?.user_id && pick?.user_id
        ? String(item.user_id)===String(pick.user_id)
        : String(item?.usuario||"").trim().toLowerCase()===String(pick?.usuario||state.participant?.nome||"").trim().toLowerCase()
    ));
    if(!duplicate) combined.push(pick);
  }
  return combined;
}

function buildRoundHighlights(round){
  return buildRoundHighlightsModel({
    round,
    games:state.games,
    picks:roundHighlightsPicks(),
    participants:state.participants,
    selectedParticipantId:state.participant?.user_id||state.user?.id||"",
    selectedParticipantName:state.participant?.nome||"",
    isScorableGame,
    gameStatusDisplay,
    pointsForPick:(pick,game)=>points(pick,game)
  });
}

function latestRoundHighlightsCandidate(beforeRound=Infinity){
  const rounds=[...new Set((state.games||[]).map(game=>Number(game?.rodada)).filter(round=>Number.isFinite(round)&&round<beforeRound))];
  return selectLatestRoundHighlightsCandidate(rounds.map(candidateRound=>({
    round:candidateRound,
    lifecycle:roundLifecycleSummary(state.games.filter(game=>Number(game?.rodada)===candidateRound))
  })));
}

function homeRoundHighlightsContext({round,lifecycle,nextGame,now=Date.now()}){
  if(lifecycle.status==="FINISHED") return {round,mode:"finished"};
  if(lifecycle.live>0) return null;
  if(isPostponedRoundHighlightsEligible(lifecycle)) return {round,mode:"partial"};
  if(lifecycle.status==="PARTIAL") return null;
  const previous=latestRoundHighlightsCandidate(round);
  if(!previous) return null;
  const previousRound=Number(previous.round);
  if(isPostponedRoundHighlightsEligible(previous.lifecycle)) return {round:previousRound,mode:"partial"};
  const previousGames=state.games.filter(game=>Number(game?.rodada)===previousRound);
  const lastKickoff=Math.max(...previousGames.map(game=>new Date(game?.inicio).getTime()).filter(Number.isFinite));
  const recentlyFinished=Number.isFinite(lastKickoff) && now-lastKickoff<=72*60*60*1000;
  const nextKickoff=new Date(nextGame?.inicio).getTime();
  const longPause=Number.isFinite(nextKickoff) && nextKickoff-now>7*24*60*60*1000;
  return recentlyFinished||longPause ? {round:previousRound,mode:longPause?"pause":"recent"} : null;
}

function provisionalRoundHighlightFact(fact){
  if(!fact) return fact;
  let title=String(fact.title||"");
  title=title
    .replace(" venceu a rodada"," lidera a rodada")
    .replace(" empataram na rodada"," lideram a rodada")
    .replace(" liderou nos placares exatos"," lidera nos placares exatos")
    .replace(" lideraram nos placares exatos"," lideram nos placares exatos")
    .replace(/ na rodada$/," até agora");
  if(!title.endsWith("até agora")) title=`${title} até agora`;
  return {...fact,title};
}

function roundHighlightIcon(key){
  if(key.startsWith("unique-exact")) return "✨";
  return ({
    "new-personal-best":"🏆",
    "matched-personal-best":"⭐",
    "personal-round-performance":"🎯",
    "personal-ranking-movement":"↕",
    "personal-ranking-context":"📈",
    "round-winner":"🏆",
    "exact-leader":"🎯",
    "biggest-climb":"📈"
  })[key]||"•";
}

function homeRoundHighlightsHtml(context){
  if(!context) return "";
  const model=buildRoundHighlights(context.round);
  const partial=context.mode==="partial" && isPostponedRoundHighlightsEligible(model.lifecycle);
  if(model.isProvisional && !partial) return "";
  const displayFact=fact=>partial?provisionalRoundHighlightFact(fact):fact;
  const personal=displayFact(model.facts.personal[0]||null);
  const group=displayFact(model.facts.group.find(fact=>!personal || fact.key!==personal.key)||model.facts.group[0]||null);
  const facts=[personal,group].filter(Boolean).slice(0,2);
  if(!facts.length) return "";
  const label=context.mode==="pause"?"ENQUANTO A BOLA NÃO VOLTA":"DESTAQUES DA RODADA";
  return `<section class="home-round-highlights" aria-label="Destaques da Rodada ${context.round}">
    <div class="home-round-highlights-heading"><span>${label}</span><strong>Rodada ${context.round}</strong></div>
    ${partial?`<div class="round-highlights-partial-notice" role="status"><strong>⚠ Rodada com jogos adiados</strong><span>Destaques consideram ${model.lifecycle.finished} de ${model.lifecycle.total} jogos concluídos.</span></div>`:""}
    <div class="home-round-highlights-list">${facts.map(fact=>`<div><i aria-hidden="true">${roundHighlightIcon(fact.key)}</i><p><strong>${escapeHtml(fact.title)}</strong><small>${escapeHtml(fact.detail)}</small></p></div>`).join("")}</div>
    <button class="home-round-highlights-action" type="button" data-home-action="round-highlights" data-round-highlights-round="${context.round}">Ver todos os destaques <b aria-hidden="true">›</b></button>
  </section>`;
}

function renderRoundHighlightsModal(model){
  const content=$("roundHighlightsModalContent");
  if(!content) return;
  const partial=isPostponedRoundHighlightsEligible(model.lifecycle);
  const displayFact=fact=>partial?provisionalRoundHighlightFact(fact):fact;
  const factCard=fact=>{const display=displayFact(fact);return `<article class="round-highlight-fact"><i aria-hidden="true">${roundHighlightIcon(display.key)}</i><div><strong>${escapeHtml(display.title)}</strong><p>${escapeHtml(display.detail)}</p></div></article>`;};
  const sections=[];
  const personalKeys=new Set(model.facts.personal.map(fact=>fact.key));
  const groupFacts=model.facts.group.filter(fact=>!personalKeys.has(fact.key));
  if(model.facts.personal.length) sections.push(`<section><div class="round-highlight-section-heading"><span>VOCÊ NA RODADA</span><h3>Seu desempenho</h3></div><div class="round-highlight-facts">${model.facts.personal.slice(0,4).map(factCard).join("")}</div></section>`);
  if(groupFacts.length) sections.push(`<section><div class="round-highlight-section-heading"><span>NO BOLÃO</span><h3>Destaques do grupo</h3></div><div class="round-highlight-facts">${groupFacts.slice(0,4).map(factCard).join("")}</div></section>`);
  content.innerHTML=`${partial?`<div class="round-highlights-partial-notice is-modal" role="status"><strong>⚠ Rodada com jogos adiados</strong><span>Estes destaques são provisórios e consideram ${model.lifecycle.finished} de ${model.lifecycle.total} jogos concluídos.</span></div>`:""}${sections.join("") || '<p class="muted-note">Ainda não há fatos suficientes para destacar nesta rodada.</p>'}`;
  $("roundHighlightsModalTitle").textContent=`Como foi a Rodada ${model.round}`;
  $("roundHighlightsModalSummary").textContent=partial?"Resumo parcial dos jogos já concluídos.":"Resumo consolidado após o encerramento oficial das partidas.";
  $("roundHighlightsModalSource").textContent=`Fonte: resultados oficiais e palpites públicos encerrados • ${model.lifecycle.finished} jogo${model.lifecycle.finished===1?"":"s"} considerado${model.lifecycle.finished===1?"":"s"}.`;
}

function openRoundHighlights(round,trigger){
  const model=buildRoundHighlights(Number(round));
  if(model.isProvisional && !isPostponedRoundHighlightsEligible(model.lifecycle)) return message("Os destaques estarão disponíveis quando houver resultados válidos da rodada.",true);
  roundHighlightsModel=model;
  roundHighlightsReturnFocus=trigger||document.activeElement;
  renderRoundHighlightsModal(model);
  $("roundHighlightsModal")?.classList.remove("hidden");
  document.body.classList.add("modal-open");
  setTimeout(()=>$('roundHighlightsModalClose')?.focus(),40);
}

function closeRoundHighlights(){
  $("roundHighlightsModal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
  roundHighlightsModel=null;
  const target=roundHighlightsReturnFocus;
  roundHighlightsReturnFocus=null;
  target?.focus?.();
}

function favoriteTeamStandingsRow(team){
  if(!team || !Array.isArray(state.standings?.table)) return null;
  const favoriteKey=normalizeTeamKey(team.name);
  return state.standings.table.find(row=>{
    const rowKey=normalizeTeamKey(row.team);
    return rowKey===favoriteKey || rowKey.includes(favoriteKey) || favoriteKey.includes(rowKey);
  }) || null;
}

function favoriteTeamGames(team){
  if(!team) return [];
  const key=normalizeTeamKey(team.name);
  return state.games.filter(game=>normalizeTeamKey(game.time_casa)===key || normalizeTeamKey(game.time_fora)===key);
}

function favoriteTeamResult(game,team){
  if(!isScorableGame(game) || !team) return null;
  const home=normalizeTeamKey(game.time_casa)===normalizeTeamKey(team.name);
  const own=Number(home?game.gols_casa:game.gols_fora);
  const opponent=Number(home?game.gols_fora:game.gols_casa);
  return own>opponent?"V":own<opponent?"D":"E";
}


function championshipTableThroughRound(roundNumber){
  const completed=state.games.filter(game=>isScorableGame(game) && Number(game.rodada)<=Number(roundNumber));
  const table=new Map();
  const ensure=name=>{
    const key=normalizeTeamKey(name);
    if(!table.has(key)) table.set(key,{key,name,points:0,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,gd:0});
    return table.get(key);
  };
  completed.forEach(game=>{
    const home=ensure(game.time_casa), away=ensure(game.time_fora);
    const hg=Number(game.gols_casa), ag=Number(game.gols_fora);
    home.played++; away.played++; home.gf+=hg; home.ga+=ag; away.gf+=ag; away.ga+=hg;
    if(hg>ag){home.points+=3;home.wins++;away.losses++;}
    else if(hg<ag){away.points+=3;away.wins++;home.losses++;}
    else {home.points++;away.points++;home.draws++;away.draws++;}
  });
  const rows=[...table.values()].map(row=>({...row,gd:row.gf-row.ga}));
  rows.sort((a,b)=>b.points-a.points||b.wins-a.wins||b.gd-a.gd||b.gf-a.gf||a.name.localeCompare(b.name,'pt-BR'));
  rows.forEach((row,index)=>row.position=index+1);
  return rows;
}

function favoriteTeamPositionHistory(team,rounds){
  if(!team) return [];
  const key=normalizeTeamKey(team.name);
  return rounds.map(round=>{
    const row=championshipTableThroughRound(round).find(item=>item.key===key);
    return {round,position:row?.position||null};
  });
}

function favoriteTeamPredictionStats(team){
  if(!team) return {games:0,points:0,exact:0,hits:0,rate:0};
  const gameIds=new Set(favoriteTeamGames(team).map(game=>Number(game.id_jogo)));
  const completedPicks=state.ownPicks.filter(pick=>{
    if(!gameIds.has(Number(pick.id_jogo))) return false;
    const game=state.games.find(item=>Number(item.id_jogo)===Number(pick.id_jogo));
    return isScorableGame(game);
  });
  let totalPoints=0, exact=0, hits=0;
  for(const pick of completedPicks){
    const game=state.games.find(item=>Number(item.id_jogo)===Number(pick.id_jogo));
    const earned=points(pick,game);
    totalPoints+=earned;
    if(earned===10) exact++;
    if(earned>0) hits++;
  }
  const games=completedPicks.length;
  return {games,points:totalPoints,exact,hits,rate:games?Math.round(totalPoints/(games*10)*100):0};
}

function renderFavoriteTeamPredictionCard(team){
  if(!team){
    return `<article class="premium-feature-card favorite-predictions-card favorite-predictions-empty">
      <header class="premium-card-header"><div><span class="premium-kicker">MEUS PALPITES</span><h2>🎯 Meu desempenho com meu time</h2></div></header>
      <div class="favorite-predictions-empty-content"><span aria-hidden="true">☆</span><div><strong>Escolha seu time favorito</strong><p>Depois disso, seu desempenho nos jogos do clube aparecerá aqui automaticamente.</p></div></div>
    </article>`;
  }
  const stats=favoriteTeamPredictionStats(team);
  const plural=stats.games===1?'jogo analisado':'jogos analisados';
  const aria=`${stats.rate}% de aproveitamento`;
  return `<article class="premium-feature-card favorite-predictions-card home-navigable-card" data-home-action="myTeam" role="button" tabindex="0" aria-label="Abrir Meu Time 2.0">
    <span class="home-card-chevron" aria-hidden="true">›</span>
    <header class="premium-card-header favorite-predictions-header"><div><span class="premium-kicker">MEUS PALPITES</span><h2>🎯 Meu desempenho com o ${escapeHtml(team.name)}</h2></div></header>
    ${stats.games?`<div class="favorite-predictions-metrics">
      <div><strong>${stats.games}</strong><span>${plural}</span></div>
      <div><strong>${stats.points}</strong><span>pontos</span></div>
      <div><strong>${stats.exact}</strong><span>placares exatos</span></div>
      <div><strong>${stats.hits}</strong><span>resultados certos</span></div>
    </div>
    <div class="favorite-rate-block">
      <div class="favorite-rate-heading"><span>Aproveitamento</span><strong>${stats.rate}%</strong></div>
      <div class="favorite-rate-track" role="progressbar" aria-label="${aria}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.rate}"><i style="width:${stats.rate}%"></i></div>
      <small>Pontos conquistados em relação ao máximo possível nesses jogos.</small>
    </div>`:`<div class="favorite-predictions-no-data"><span aria-hidden="true">⏳</span><div><strong>Ainda não há jogos pontuados</strong><p>O card será preenchido quando uma partida do ${escapeHtml(team.name)} terminar e seu palpite puder ser calculado.</p></div></div>`}
  </article>`;
}


function favoriteTeamContext(team){
  if(!team) return null;
  const row=favoriteTeamStandingsRow(team);
  const games=favoriteTeamGames(team).slice().sort((a,b)=>new Date(a.inicio)-new Date(b.inicio));
  const completed=games.filter(isScorableGame);
  const future=games.filter(game=>!isFinished(game) && new Date(game.inicio).getTime()>Date.now());
  const recent=completed.slice(-5);
  const next=future[0] || null;
  const stats=favoriteTeamPredictionStats(team);
  const key=normalizeTeamKey(team.name);
  const relatedPicks=state.ownPicks.map(pick=>({pick,game:state.games.find(game=>Number(game.id_jogo)===Number(pick.id_jogo))})).filter(item=>item.game && (normalizeTeamKey(item.game.time_casa)===key || normalizeTeamKey(item.game.time_fora)===key) && isScorableGame(item.game));
  let predictedWins=0, objectiveReads=0, exactSequence=0, bestSequence=0, currentSequence=0;
  const timeline=[];
  relatedPicks.sort((a,b)=>Number(a.game.rodada)-Number(b.game.rodada)).forEach(({pick,game})=>{
    const favoriteHome=normalizeTeamKey(game.time_casa)===key;
    const ownPick=Number(favoriteHome?pick.gols_casa:pick.gols_fora);
    const opponentPick=Number(favoriteHome?pick.gols_fora:pick.gols_casa);
    const predicted=ownPick>opponentPick?'V':ownPick<opponentPick?'D':'E';
    const actual=favoriteTeamResult(game,team);
    if(predicted==='V') predictedWins++;
    if(predicted===actual) objectiveReads++;
    const earned=points(pick,game);
    if(earned>0){ currentSequence++; bestSequence=Math.max(bestSequence,currentSequence); } else currentSequence=0;
    if(earned===10){
      exactSequence++;
      timeline.push({round:Number(game.rodada),icon:'🎯',title:'Placar exato',text:`Você cravou ${game.time_casa} ${game.gols_casa} × ${game.gols_fora} ${game.time_fora}.`});
    }
  });
  completed.slice(-4).forEach(game=>{
    const result=favoriteTeamResult(game,team);
    if(result==='V') timeline.push({round:Number(game.rodada),icon:'🏟️',title:'Vitória do seu time',text:`${team.name} venceu ${normalizeTeamKey(game.time_casa)===key?game.time_fora:game.time_casa}.`});
  });
  timeline.sort((a,b)=>b.round-a.round);
  const accuracy=relatedPicks.length?Math.round(objectiveReads/relatedPicks.length*100):0;
  const confidence=relatedPicks.length?Math.round(predictedWins/relatedPicks.length*100):0;
  const exactRate=relatedPicks.length?Math.round(stats.exact/relatedPicks.length*100):0;
  const trendScore=recent.reduce((sum,game)=>sum+({V:3,E:1,D:0}[favoriteTeamResult(game,team)]||0),0);
  const formScore=recent.length?Math.round(trendScore/(recent.length*3)*100):50;
  const synergy=Math.max(0,Math.min(100,Math.round(accuracy*.55+exactRate*.2+formScore*.15+(bestSequence?Math.min(bestSequence*10,100):0)*.1)));
  let profile={icon:'⚖️',name:'O Equilibrado',text:'Você combina emoção e leitura do momento do clube.'};
  if(stats.games>=3 && stats.rate>=70) profile={icon:'🎯',name:'O Especialista',text:`Seus melhores palpites aparecem com frequência nos jogos do ${team.name}.`};
  else if(confidence>=80 && accuracy<60) profile={icon:'❤️',name:'O Apaixonado',text:'Você acredita no seu time até quando o cenário pede cautela.'};
  else if(accuracy>=65 && confidence<80) profile={icon:'🧠',name:'O Estratégico',text:'Você ajusta os palpites de acordo com a fase da equipe.'};
  else if(confidence>=70) profile={icon:'🔥',name:'O Confiante',text:'Você mantém a confiança no seu time ao longo da temporada.'};
  const achievements=[];
  if(stats.games>=5) achievements.push({icon:'🏅',title:'Especialista do Clube',text:`Palpitou em ${stats.games} jogos concluídos do ${team.name}.`});
  if(stats.exact>=2) achievements.push({icon:'🎯',title:'Profeta',text:`Já acertou ${stats.exact} placares exatos envolvendo seu time.`});
  if(bestSequence>=3) achievements.push({icon:'🔥',title:'Leitor de Momento',text:`Alcançou ${bestSequence} acertos seguidos nos jogos do clube.`});
  if(accuracy>=70 && relatedPicks.length>=5) achievements.push({icon:'🧠',title:'Sintonia Fina',text:'Sua leitura de resultado está acima de 70%.'});
  return {team,row,games,completed,recent,next,stats,accuracy,confidence,synergy,profile,timeline:timeline.slice(0,6),achievements,bestSequence};
}

function favoriteFormMarkup(context){
  if(!context?.recent?.length) return '<span class="my-team-empty-inline">Aguardando resultados</span>';
  return `<div class="my-team-form" aria-label="Forma nos últimos jogos">${context.recent.map(game=>{const result=favoriteTeamResult(game,context.team);return `<span class="result-${String(result).toLowerCase()}" title="Rodada ${Number(game.rodada)}">${result}</span>`;}).join('')}</div>`;
}

function favoriteSynergyLabel(value){
  if(value>=85) return 'Sintonia excepcional';
  if(value>=70) return 'Muito conectado';
  if(value>=55) return 'Boa leitura';
  if(value>=40) return 'Em construção';
  return 'Em fase de ajuste';
}

function renderMyTeam(){
  const host=$("myTeamContent");
  if(!host || !state.participant) return;
  const team=findTeam(state.participant.time_favorito);
  if(!team){
    host.innerHTML=`<article class="card my-team-empty-state"><span aria-hidden="true">♡</span><h1>Escolha o seu time</h1><p>Defina seu clube favorito no Perfil para ativar a experiência Meu Time 2.0.</p><button class="primary" type="button" data-my-team-action="profile">Escolher meu time</button></article>`;
    return;
  }
  const context=favoriteTeamContext(team);
  const {row,next,stats,profile,synergy,achievements,timeline}=context;
  const crest=team.logo?`<img src="${escapeHtml(team.logo)}" alt="Escudo do ${escapeHtml(team.name)}">`:`<span>${escapeHtml(initials(team.name).slice(0,3))}</span>`;
  const nextOpponent=next?(normalizeTeamKey(next.time_casa)===team.key?next.time_fora:next.time_casa):null;
  const nextVenue=next?(normalizeTeamKey(next.time_casa)===team.key?'Casa':'Fora'):'';
  const nextDate=next?new Date(next.inicio):null;
  const maxPoints=Math.max(1,stats.games*10);
  const stars=Math.max(1,Math.min(5,Math.round(synergy/20)));
  const formPoints=context.recent.reduce((sum,game)=>sum+({V:3,E:1,D:0}[favoriteTeamResult(game,team)]||0),0);
  host.innerHTML=`
    <article class="my-team-hero card my-team-hero-link" data-my-team-action="standings" role="button" tabindex="0" aria-label="Abrir tabela completa do campeonato">
      <span class="home-card-chevron" aria-hidden="true">›</span>
      <div class="my-team-hero-main"><span class="my-team-crest">${crest}</span><div><span class="eyebrow">MEU TIME 2.0</span><h1 id="myTeamPageTitle">${escapeHtml(team.name)}</h1><p>${row?`${row.position}º colocado · ${row.points} pontos · ${Number(row.goalDifference)>0?'+':''}${row.goalDifference} de saldo`:'Classificação em atualização'}</p></div></div>
      <div class="my-team-hero-form"><span>Momento recente</span>${favoriteFormMarkup(context)}<small>${formPoints} ponto${formPoints===1?'':'s'} nos últimos ${context.recent.length} jogos</small></div>
    </article>

    <section class="my-team-grid my-team-grid-primary">
      <article class="card my-team-next-card"><span class="eyebrow">PRÓXIMO JOGO</span>${next?`<div class="my-team-next-opponent"><span>${crest}</span><b>×</b><span>${teamLogo(normalizeTeamKey(next.time_casa)===team.key?next.time_fora_logo:next.time_casa_logo,nextOpponent)}</span></div><h2>${escapeHtml(team.name)} × ${escapeHtml(nextOpponent)}</h2><p>${escapeHtml(nextDate.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}))} · ${escapeHtml(nextDate.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}</p><span class="my-team-venue">${nextVenue}${next.local?` · ${escapeHtml(next.local)}`:''}</span><button class="secondary" type="button" data-my-team-action="games">Abrir jogos</button>`:'<div class="my-team-no-next"><span>📅</span><strong>Próxima partida a definir</strong><p>Aguardando atualização da tabela.</p></div>'}</article>
      <article class="card my-team-synergy-card"><span class="eyebrow">ÍNDICE DE SINTONIA</span><div class="my-team-synergy-score"><strong>${synergy}%</strong><span>${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</span></div><h2>${favoriteSynergyLabel(synergy)}</h2><p>Mede sua leitura dos resultados, placares exatos, regularidade e o momento recente do clube.</p><div class="my-team-progress"><i style="width:${synergy}%"></i></div></article>
    </section>

    <section class="my-team-section"><div class="my-team-section-heading"><div><span class="eyebrow">VOCÊ E O CLUBE</span><h2>Meu desempenho com o ${escapeHtml(team.name)}</h2></div></div>
      <div class="my-team-metrics">
        <article class="card"><span>Jogos analisados</span><strong>${stats.games}</strong><small>palpites concluídos</small></article>
        <article class="card"><span>Resultados certos</span><strong>${stats.hits}</strong><small>${stats.games?Math.round(stats.hits/stats.games*100):0}% dos jogos</small></article>
        <article class="card"><span>Placares exatos</span><strong>${stats.exact}</strong><small>10 pontos cada</small></article>
        <article class="card"><span>Pontos conquistados</span><strong>${stats.points}</strong><small>de ${maxPoints} possíveis</small></article>
      </div>
    </section>

    <section class="my-team-grid">
      <article class="card my-team-profile-card"><span class="eyebrow">PERFIL DO TORCEDOR</span><div class="my-team-profile-icon">${profile.icon}</div><h2>${profile.name}</h2><p>${escapeHtml(profile.text)}</p><div class="my-team-profile-stats"><span><b>${context.confidence}%</b> confiança</span><span><b>${context.accuracy}%</b> leitura correta</span></div></article>
      <article class="card my-team-club-card"><span class="eyebrow">DESEMPENHO DO CLUBE</span><div class="my-team-club-stats">${row?`<span><b>${row.playedGames}</b> jogos</span><span><b>${row.won}</b> vitórias</span><span><b>${row.draw}</b> empates</span><span><b>${row.lost}</b> derrotas</span><span><b>${row.goalsFor}</b> gols pró</span><span><b>${row.goalsAgainst}</b> gols contra</span>`:'<p>Classificação oficial em atualização.</p>'}</div><button class="secondary" type="button" data-my-team-action="standings">Ver tabela completa</button></article>
    </section>

    <section class="my-team-section"><div class="my-team-section-heading"><div><span class="eyebrow">HISTÓRIA DA TEMPORADA</span><h2>Momentos com o seu time</h2></div></div>${timeline.length?`<div class="my-team-timeline">${timeline.map(item=>`<article class="card"><span class="my-team-timeline-round">R${item.round}</span><i>${item.icon}</i><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div></article>`).join('')}</div>`:'<article class="card my-team-empty-block">Os principais momentos aparecerão aqui conforme a temporada avançar.</article>'}</section>

    <section class="my-team-section"><div class="my-team-section-heading"><div><span class="eyebrow">CONQUISTAS</span><h2>Marcos do Meu Time</h2></div></div>${achievements.length?`<div class="my-team-achievements">${achievements.map(item=>`<article class="card"><span>${item.icon}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div></article>`).join('')}</div>`:`<article class="card my-team-empty-block">Continue palpitando nos jogos do ${escapeHtml(team.name)} para desbloquear conquistas.</article>`}</section>`;
}

function renderHomeFavoriteTeam(){
  const host=$("homeFavoriteTeamSection");
  if(!host || !state.participant) return;
  const team=findTeam(state.participant.time_favorito);

  if(!team){
    host.innerHTML=`<article class="premium-feature-card favorite-home-card favorite-home-empty">
      <header class="premium-card-header"><div><span class="premium-kicker">PERSONALIZAÇÃO</span><h2>⚽ Meu Time</h2></div></header>
      <div class="favorite-home-empty-content"><span class="favorite-home-empty-icon" aria-hidden="true">♡</span><div><strong>Você ainda não escolheu seu time favorito</strong><p>Defina seu time no Perfil para acompanhar a classificação e a próxima partida aqui.</p></div></div>
      <button class="secondary favorite-home-profile-action" type="button" data-home-action="profile">Escolher meu time <b aria-hidden="true">›</b></button>
    </article>${renderFavoriteTeamPredictionCard(null)}`;
    return;
  }

  const row=favoriteTeamStandingsRow(team);
  const games=favoriteTeamGames(team);
  const recent=games.filter(isScorableGame).sort((a,b)=>Number(b.rodada)-Number(a.rodada)||new Date(b.inicio)-new Date(a.inicio)).slice(0,5).sort((a,b)=>Number(a.rodada)-Number(b.rodada)||new Date(a.inicio)-new Date(b.inicio));
  const form=recent.map(game=>({round:Number(game.rodada),result:favoriteTeamResult(game,team)})).filter(item=>item.result);
  const positionHistory=favoriteTeamPositionHistory(team,form.map(item=>item.round));
  const next=games.filter(game=>!isFinished(game) && new Date(game.inicio).getTime()>Date.now()).sort((a,b)=>new Date(a.inicio)-new Date(b.inicio))[0];
  const nextDate=next?new Date(next.inicio):null;
  const isToday=nextDate && nextDate.toDateString()===new Date().toDateString();
  const allFuture=state.games.filter(game=>!isFinished(game) && new Date(game.inicio).getTime()>Date.now()).sort((a,b)=>new Date(a.inicio)-new Date(b.inicio));
  const isNextChampionshipGame=next && Number(allFuture[0]?.id_jogo)===Number(next.id_jogo);
  const opponent=next ? (normalizeTeamKey(next.time_casa)===team.key?next.time_fora:next.time_casa) : null;
  const crest=team.logo?`<img src="${escapeHtml(team.logo)}" alt="Escudo do ${escapeHtml(team.name)}" loading="lazy" referrerpolicy="no-referrer">`:`<span>${escapeHtml(initials(team.name).slice(0,3))}</span>`;
  const historyByRound=new Map(positionHistory.map(item=>[Number(item.round),item]));
  const historyHtml=form.length?`<div class="favorite-history" aria-label="Últimos jogos e posição do time em cada rodada">
    <span class="favorite-history-label">Últimos jogos</span>
    <div class="favorite-history-grid">${form.map((item,index)=>{const positionItem=historyByRound.get(Number(item.round));const previousPosition=index>0?historyByRound.get(Number(form[index-1].round))?.position:null;const position=positionItem?.position;const arrow=index===0||!position||!previousPosition?'':position<previousPosition?'↗':position>previousPosition?'↘':'→';const trendClass=!arrow?'start':position<previousPosition?'up':position>previousPosition?'down':'flat';const trendLabel=trendClass==='up'?'Subiu na classificação':trendClass==='down'?'Caiu na classificação':trendClass==='flat'?'Manteve a posição':'';return `<span class="favorite-history-item ${trendClass}"><small aria-label="Rodada ${item.round}">${item.round}</small><span class="favorite-form-result result-${item.result.toLowerCase()}" title="Rodada ${item.round} · ${item.result==='V'?'Vitória':item.result==='E'?'Empate':'Derrota'}">${item.result}</span><span class="favorite-history-position"><b>${position?`${position}º`:'—'}</b>${arrow?`<i aria-label="${trendLabel}">${arrow}</i>`:''}</span></span>`;}).join('')}</div>
    <span class="favorite-history-caption">Posição na tabela</span>
  </div>`:'<div class="favorite-home-form"><span>Últimos jogos</span><small class="favorite-form-unavailable">Sem resultados concluídos</small></div>';
  const contextBadge=isToday?'<span class="favorite-context-badge is-today">● Joga hoje</span>':isNextChampionshipGame?'<span class="favorite-context-badge">Próximo jogo do campeonato</span>':'';

  host.innerHTML=`<article class="premium-feature-card favorite-home-card">
    <div class="favorite-home-overview home-navigable-card" role="button" tabindex="0" data-home-action="myTeam" aria-label="Abrir Meu Time e ver detalhes do ${escapeHtml(team.name)}">
      <header class="premium-card-header favorite-home-header">
        <div><span class="premium-kicker">MEU TIME</span><h2>${escapeHtml(team.name)}</h2></div>
        <span class="favorite-home-crest">${crest}</span>
      </header>
      ${row?`<div class="favorite-standing-main"><div class="favorite-position-link"><strong>${row.position}º <i class="favorite-standing-chevron" aria-hidden="true">›</i></strong><span>posição</span></div><div><strong>${row.points}</strong><span>pontos</span></div></div>
      <div class="favorite-standing-stats"><span><b>${row.playedGames}</b> J</span><span><b>${row.won}</b> V</span><span><b>${row.draw}</b> E</span><span><b>${row.lost}</b> D</span><span><b>${Number(row.goalDifference)>0?'+':''}${row.goalDifference}</b> SG</span></div>`:`<div class="favorite-standings-loading"><span class="favorite-loading-dot"></span><span>Carregando classificação oficial…</span><i class="favorite-standing-chevron" aria-hidden="true">›</i></div>`}
    </div>
    ${historyHtml}
    <div class="favorite-next-match">
      <div><span class="favorite-next-label">PRÓXIMA PARTIDA</span>${contextBadge}<strong>${next?`${escapeHtml(team.name)} × ${escapeHtml(opponent)}`:'A definir'}</strong><small>${nextDate?`${escapeHtml(nextDate.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'}))} • ${escapeHtml(nextDate.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}${next.local?` • ${escapeHtml(next.local)}`:''}`:'Aguardando a tabela de jogos'}</small></div>
      ${next?`<button class="favorite-next-action" type="button" data-home-action="games" aria-label="Abrir jogos">›</button>`:''}
    </div>
  </article>${renderFavoriteTeamPredictionCard(team)}`;

  if(!state.standings) loadStandings(false);
}

function renderHome(){
  if(!state.participant) return;
  calculateRanking();
  const now=Date.now();
  const round=currentRoundNumber();
  const roundGames=homeRoundGames().sort((a,b)=>new Date(a.inicio)-new Date(b.inicio));
  const meIndex=state.ranking.findIndex(isCurrentRankingParticipant);
  const me=meIndex>=0?state.ranking[meIndex]:{total:0,exact:0,count:state.ownPicks.length,scored:0};
  const leader=state.ranking[0];
  const gapToLeader=leader && meIndex>0 ? Math.max(0,leader.total-me.total) : 0;
  const nextBehind=meIndex>=0?state.ranking[meIndex+1]:null;
  const leadOverNext=nextBehind?Math.max(0,me.total-nextBehind.total):0;
  const firstName=String(state.participant.nome||"Participante").trim().split(/\s+/)[0];

  const openGames=roundGames.filter(game=>!locked(game) && !isFinished(game));
  const pending=openGames.filter(game=>!ownPick(game.id_jogo));
  const lifecycle=roundLifecycleSummary(roundGames);
  const lifecycleView=roundLifecyclePresentation(lifecycle);
  const live=roundGames.filter(game=>gameStatusDisplay(game).key==="live");
  const finished=roundGames.filter(isScorableGame);
  const futureCount=lifecycle.future;
  const nextGame=state.games.filter(game=>!isFinished(game) && !isPostponed(game) && gameStatusDisplay(game).key!=="cancelled" && new Date(game.inicio).getTime()>now).sort((a,b)=>new Date(a.inicio)-new Date(b.inicio))[0];
  const nextPending=[...pending].sort((a,b)=>new Date(a.inicio)-new Date(b.inicio))[0];
  const highlightsContext=homeRoundHighlightsContext({round,lifecycle,nextGame,now});

  let priority;
  if(pending.length){
    priority={tone:"warning",badge:"ATENÇÃO",icon:"📋",title:`Faltam ${pending.length} ${pending.length===1?"palpite":"palpites"}`,subtitle:`para a Rodada ${round}`,meta:nextPending?`Fecha ${homeDeadline(nextPending)}`:"Complete antes do fechamento",action:"games",label:"Fazer palpites"};
  }else if(live.length){
    priority={tone:"live",badge:"AO VIVO",icon:"🔥",title:`${live.length} ${live.length===1?"jogo ao vivo":"jogos ao vivo"}`,subtitle:"A rodada está acontecendo",meta:"Acompanhe os placares em tempo real",action:"games",label:"Acompanhar jogos"};
  }else if(roundGames.length && lifecycle.status==="FINISHED"){
    priority={tone:"gold",badge:"RODADA ENCERRADA",icon:"🏆",title:`Rodada ${round} concluída`,subtitle:`Você fez ${me.total} ${me.total===1?"ponto":"pontos"}`,meta:"Confira sua posição final na rodada",action:"ranking",label:"Ver resultado"};
  }else{
    priority={tone:"success",badge:"TUDO EM DIA",icon:"✓",title:"Palpites completos",subtitle:`Rodada ${round}`,meta:nextGame?`Próximo: ${nextGame.time_casa} × ${nextGame.time_fora}`:"Nenhuma ação necessária agora",action:"games",label:"Ver jogos"};
  }

  const positionText=meIndex===0
    ? "Você lidera o bolão"
    : gapToLeader?`${gapToLeader} ${gapToLeader===1?"ponto":"pontos"} atrás do líder`
    : "Classificação provisória";
  const lowerText=nextBehind
    ? `${leadOverNext} ${leadOverNext===1?"ponto":"pontos"} à frente do próximo`
    : (meIndex===0?"Defenda a liderança":"Última posição atual");

  $("homeHero").className=`home-hero card hero-tone-${priority.tone}`;
  $("homeHero").innerHTML=`
    <div class="premium-hero-main">
      <div class="premium-hero-icon" aria-hidden="true">${priority.icon}</div>
      <div class="premium-hero-copy">
        <span class="premium-badge badge-${priority.tone}">${priority.badge}</span>
        <h2>${escapeHtml(priority.title)}</h2>
        <p class="premium-hero-subtitle">${escapeHtml(priority.subtitle)}</p>
        <p class="premium-hero-meta"><span aria-hidden="true">◷</span> ${escapeHtml(priority.meta)}</p>
        <button class="primary premium-hero-action" type="button" data-home-action="${priority.action}"><span>${priority.label}</span><b aria-hidden="true">›</b></button>
      </div>
    </div>
    <div class="premium-position-panel">
      <div class="premium-position-ring" style="--rank-progress:${state.ranking.length?Math.max(12,Math.round((state.ranking.length-(Math.max(meIndex,0)))/state.ranking.length*100)):0}%">
        <strong>${meIndex>=0?meIndex+1:"—"}</strong><span>de ${state.ranking.length||0}</span>
      </div>
      <span class="premium-position-label">sua posição</span>
      <small>${escapeHtml(positionText)}</small>
      <small class="premium-position-gap">↑ ${escapeHtml(lowerText)}</small>
    </div>`;

  $("homePriority").className="hidden";
  $("homePriority").innerHTML="";

  const completedPicks=roundGames.filter(game=>ownPick(game.id_jogo)).length;
  const roundPoints=state.ownPicks.reduce((sum,pick)=>{
    const game=roundGames.find(item=>Number(item.id_jogo)===Number(pick.id_jogo));
    return sum+points(pick,game);
  },0);

  $("homeOverview").innerHTML=`
    <article class="home-mini-card card mini-tone-green home-navigable-card" role="button" tabindex="0" data-home-action="games" aria-label="Abrir jogos da rodada"><span class="mini-card-icon">📅</span><span>Rodada atual</span><b aria-hidden="true">›</b><strong>${round||"—"}</strong><small>${finished.length}/${roundGames.length} jogos finalizados</small></article>
    <article class="home-mini-card card mini-tone-green home-navigable-card" role="button" tabindex="0" data-home-action="games" aria-label="Abrir seus palpites"><span class="mini-card-icon">🎯</span><span>Seus palpites</span><b aria-hidden="true">›</b><strong>${completedPicks}/${roundGames.length}</strong><small>${pending.length?`${pending.length} pendente${pending.length===1?"":"s"}`:"Tudo preenchido"}</small></article>
    <article class="home-mini-card card mini-tone-gold home-navigable-card" role="button" tabindex="0" data-home-action="stats" aria-label="Abrir estatísticas"><span class="mini-card-icon">⭐</span><span>Pontos na rodada</span><b aria-hidden="true">›</b><strong>${roundPoints}</strong><small>${me.exact} placar${me.exact===1?"":"es"} exato${me.exact===1?"":"s"} no total</small></article>`;

  if(live.length){
    $("homeLiveSection").innerHTML=`<article class="premium-feature-card premium-live-card home-navigable-card" role="button" tabindex="0" data-home-action="games" aria-label="Abrir partidas ao vivo"><header class="premium-card-header"><div><span class="premium-kicker"><i>●</i> AO VIVO</span><h2>Partidas em andamento</h2></div><span class="premium-inline-action">Ver jogos <b>›</b></span></header><div class="home-live-list">${live.slice(0,3).map(game=>`<div class="home-live-card"><span class="live-dot"></span><div><strong>${escapeHtml(teamAbbreviation(game.time_casa))} ${hasValidScore(game)?Number(game.gols_casa):"–"} × ${hasValidScore(game)?Number(game.gols_fora):"–"} ${escapeHtml(teamAbbreviation(game.time_fora))}</strong><small>${escapeHtml(game.time_casa)} × ${escapeHtml(game.time_fora)}</small></div><b>AO VIVO</b><span class="row-chevron">›</span></div>`).join("")}</div></article>`;
  }else{
    $("homeLiveSection").innerHTML="";
  }

  const roundPercent=lifecycle.completion;
  $("homeRoundSection").innerHTML=`<article class="premium-feature-card premium-round-card home-navigable-card integrity-tone-${lifecycleView.tone}" role="button" tabindex="0" data-home-action="games" aria-label="Abrir jogos da rodada">
    <header class="premium-card-header"><div><span class="premium-kicker">📅 RODADA ${round}</span><h2>Integridade da Rodada</h2><p class="round-integrity-state"><b>${lifecycleView.icon}</b> ${lifecycleView.label} · ${roundPercent}% concluída</p></div><span class="premium-inline-action">Abrir rodada <b>›</b></span></header>
    <div class="premium-segment-progress" aria-label="Progresso esportivo da rodada"><span class="segment-finished" style="width:${roundGames.length?lifecycle.finished/roundGames.length*100:0}%"></span><span class="segment-live" style="width:${roundGames.length?lifecycle.live/roundGames.length*100:0}%"></span><span class="segment-postponed" style="width:${roundGames.length?lifecycle.postponed/roundGames.length*100:0}%"></span><span class="segment-cancelled" style="width:${roundGames.length?lifecycle.cancelled/roundGames.length*100:0}%"></span><span class="segment-future" style="width:${roundGames.length?lifecycle.future/roundGames.length*100:0}%"></span></div>
    <div class="premium-round-stats integrity-stats"><div class="is-finished"><i>✓</i><strong>${lifecycle.finished}</strong><span>finalizados</span></div><div class="is-live"><i>◉</i><strong>${lifecycle.live}</strong><span>ao vivo</span></div><div class="is-postponed"><i>!</i><strong>${lifecycle.postponed}</strong><span>adiados</span></div><div class="is-future"><i>◷</i><strong>${lifecycle.future}</strong><span>futuros</span></div></div>
    <p class="round-integrity-note">${lifecycleView.message}${lifecycle.cancelled?` · ${lifecycle.cancelled} cancelado${lifecycle.cancelled===1?"":"s"}.`:""}</p>
    ${homeRoundHighlightsHtml(highlightsContext)}
    ${nextGame?`<div class="premium-next-game"><span class="premium-next-label">PRÓXIMO JOGO</span><div class="premium-matchup"><div><span class="team-badge home-match-crest">${teamLogo(nextGame.time_casa_logo,nextGame.time_casa)}</span><strong>${escapeHtml(nextGame.time_casa)}</strong></div><b>×</b><div><span class="team-badge home-match-crest">${teamLogo(nextGame.time_fora_logo,nextGame.time_fora)}</span><strong>${escapeHtml(nextGame.time_fora)}</strong></div></div><div class="premium-game-meta"><span>📅 ${escapeHtml(new Date(nextGame.inicio).toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"}))}</span><span>◷ ${escapeHtml(new Date(nextGame.inicio).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}))}</span>${nextGame.local?`<span>⌖ ${escapeHtml(nextGame.local)}</span>`:""}</div><button class="premium-next-games-action" type="button" data-home-action="games">Ver todos os jogos <b aria-hidden="true">›</b></button></div>`:""}
  </article>`;

  const medals=["🥇","🥈","🥉"];
  $("homeRankingSection").innerHTML=`<article class="premium-feature-card premium-ranking-card home-navigable-card" role="button" tabindex="0" data-home-action="ranking" aria-label="Abrir ranking completo">
    <header class="premium-card-header"><div><span class="premium-kicker">🏆 CLASSIFICAÇÃO</span><h2>Top 3 do bolão</h2></div><span class="premium-inline-action">Ver ranking completo <b>›</b></span></header>
    <div class="home-ranking-list">${state.ranking.slice(0,3).map((item,index)=>`<div class="home-ranking-row ${isCurrentRankingParticipant(item)?"is-me":""}"><span class="home-medal">${medals[index]}</span>${rankingAvatar(item.name)}<div><strong>${escapeHtml(item.name)}${isCurrentRankingParticipant(item)?' <em class="home-you-badge">VOCÊ</em>':''}</strong><small>${isCurrentRankingParticipant(item)?"Sua posição atual":"Participante"}</small></div><b>${item.total} pts</b><span class="row-chevron" aria-hidden="true">›</span></div>`).join("")||'<p class="muted-note">A classificação aparecerá após os primeiros resultados.</p>'}</div>
  </article>`;

  renderHomeFavoriteTeam();
}

function participantTeam(name){
  const participant=state.participants.find(item=>item.nome===name);
  return findTeam(participant?.time_favorito || (name===state.participant?.nome ? state.participant?.time_favorito : null));
}

function rankingAvatar(name, extraClass=""){
  const team=participantTeam(name);
  const fallback=initials(name).slice(0,2);
  return `<span class="ranking-avatar ${extraClass}">${team?.logo ? `<img src="${escapeHtml(team.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove();this.parentElement.textContent='${escapeHtml(fallback)}'">` : escapeHtml(fallback)}</span>`;
}

function updateRankingMovement(){
  let previous={};
  try{ previous=JSON.parse(localStorage.getItem("bolaoRankingPositions")||"{}"); }catch(_){ previous={}; }
  const movement={};
  state.ranking.forEach((item,index)=>{
    const old=previous[item.name];
    movement[item.name]=Number.isFinite(old) ? old-(index+1) : 0;
  });
  state.rankingMovement=movement;
  localStorage.setItem("bolaoRankingPositions",JSON.stringify(Object.fromEntries(state.ranking.map((item,index)=>[item.name,index+1]))));
}

function movementBadge(name){
  const change=state.rankingMovement[name]||0;
  if(change>0) return `<span class="rank-movement up" title="Subiu ${change} posição${change===1?"":"ões"}">▲ ${change}</span>`;
  if(change<0) return `<span class="rank-movement down" title="Caiu ${Math.abs(change)} posição${Math.abs(change)===1?"":"ões"}">▼ ${Math.abs(change)}</span>`;
  return `<span class="rank-movement stable" title="Posição mantida">•</span>`;
}

function rankingOrdinal(position){
  return Number.isFinite(position) ? `${position}º` : "—";
}

function rankingCompletedRound(){
  const rounds=state.games
    .filter(game=>isScorableGame(game))
    .map(game=>Number(game.rodada))
    .filter(Number.isFinite);
  return rounds.length ? Math.max(...rounds) : null;
}

function rankingGapText(me,meIndex,leader){
  if(!me || !leader) return "A classificação aparecerá após os primeiros resultados.";
  if(meIndex===0){
    const second=state.ranking[1];
    if(!second) return "Você lidera o bolão.";
    const lead=me.total-second.total;
    return lead===0 ? "Liderança empatada." : `${lead} ponto${lead===1?"":"s"} à frente do 2º lugar.`;
  }
  const gap=leader.total-me.total;
  return gap===0 ? "Você está empatado com o líder." : `${gap} ponto${gap===1?"":"s"} atrás do líder.`;
}

function renderRanking(){
  calculateRanking();
  updateRankingMovement();
  const leader=state.ranking[0];
  const meIndex=state.ranking.findIndex(isCurrentRankingParticipant);
  const me=meIndex>=0?state.ranking[meIndex]:null;
  const completedRound=rankingCompletedRound();
  const lifecycle=roundLifecycleSummary(state.games);
  const updatedLabel=lifecycle.isProvisional
    ? `Ranking provisório • ${lifecycle.concluded} de ${lifecycle.total} jogos concluídos`
    : completedRound ? `Atualizado após a rodada ${completedRound}` : "Aguardando os primeiros resultados";
  const nextAbove=meIndex>0?state.ranking[meIndex-1]:null;
  const nextBelow=meIndex>=0&&meIndex<state.ranking.length-1?state.ranking[meIndex+1]:null;
  const leaderGap=me&&leader?Math.max(0,leader.total-me.total):0;
  const aboveGap=me&&nextAbove?Math.max(0,nextAbove.total-me.total):0;
  const belowLead=me&&nextBelow?Math.max(0,me.total-nextBelow.total):0;
  const meRate=me&&me.scored?Math.round(me.total/(me.scored*10)*100):0;

  if($('rankingHero')) $('rankingHero').innerHTML=`
    <div class="ranking-hero-copy">
      <span class="ranking-hero-kicker">🏆 CLASSIFICAÇÃO GERAL ${lifecycle.isProvisional?'<b class="ranking-provisional-badge">PROVISÓRIO</b>':""}</span>
      <span class="ranking-hero-greeting">${me?"Sua posição atual":"Ranking do bolão"}</span>
      <div class="ranking-hero-position"><strong>${me?rankingOrdinal(meIndex+1):"—"}</strong><span>${me?"lugar":"posição"}</span></div>
      <p>${escapeHtml(rankingGapText(me,meIndex,leader))}</p>
      <div class="ranking-hero-meta"><span>${me?`${me.total} pontos`:'Sem pontuação'}</span><span>${updatedLabel}</span></div>
    </div>
    <div class="ranking-hero-orbit" aria-hidden="true"><span>🏆</span><small>BR 2026</small></div>`;

  if($('rankingHighlights')) $('rankingHighlights').innerHTML=`
    <article><span>Líder</span><strong>${leader?escapeHtml(leader.name):"—"}</strong><small>${leader?`${leader.total} pontos`:"Ranking ainda vazio"}</small></article>
    <article><span>Distância do líder</span><strong>${me&&leader?(leaderGap===0?"Na liderança":`-${leaderGap} pts`):"—"}</strong><small>${me&&leader?(leaderGap===0?"Melhor posição possível":"Diferença atual"):"Sem pontuação"}</small></article>
    <article><span>Participantes</span><strong>${state.ranking.length}</strong><small>${state.ranking.length===1?"competidor":"competidores"}</small></article>`;

  if($('rankingRoundLabel')) $('rankingRoundLabel').textContent=lifecycle.isProvisional?`${lifecycle.postponed} jogo${lifecycle.postponed===1?"":"s"} adiado${lifecycle.postponed===1?"":"s"}`:completedRound?`Após a rodada ${completedRound}`:"Classificação geral";
  if($('rankingUpdatedAt')) $('rankingUpdatedAt').innerHTML=`<span>✓ ${escapeHtml(updatedLabel)}</span><small>${lifecycle.isProvisional?"A classificação poderá mudar quando as partidas adiadas forem disputadas.":"Os pontos são recalculados com base nos resultados registrados."}</small>`;

  if($('myRankingCard')) $('myRankingCard').innerHTML=me?`
    <div class="my-ranking-main">
      <span class="my-ranking-label">SUA POSIÇÃO</span>
      <div class="my-ranking-identity">${rankingAvatar(me.name,"my-ranking-avatar")}<div><strong>${escapeHtml(me.name)}</strong><span>Você está em ${rankingOrdinal(meIndex+1)} lugar</span></div></div>
    </div>
    <div class="my-ranking-score"><strong>${me.total}</strong><span>pontos</span></div>
    <div class="my-ranking-comparisons">
      <div><span>Para subir</span><strong>${meIndex===0?"Você lidera":aboveGap===0?"Empatado":`${aboveGap} pts`}</strong><small>${nextAbove?`até ${escapeHtml(nextAbove.name)}`:"melhor posição"}</small></div>
      <div><span>Vantagem</span><strong>${nextBelow?(belowLead===0?"Empatado":`+${belowLead} pts`):"—"}</strong><small>${nextBelow?`sobre ${escapeHtml(nextBelow.name)}`:"sem participante atrás"}</small></div>
      <div><span>Aproveitamento</span><strong>${meRate}%</strong><small>${me.exact} placar${me.exact===1?"":"es"} exato${me.exact===1?"":"s"}</small></div>
    </div>`:'<p class="muted-note">Sua posição aparecerá quando você entrar na classificação.</p>';

  $('rankingBody').innerHTML=state.ranking.map((r,i)=>{
    const isMe=isCurrentRankingParticipant(r), rate=r.scored?Math.round(r.total/(r.scored*10)*100):0;
    const team=participantTeam(r.name);
    const placeClass=i<3?` top-${i+1}`:"";
    const medal=i===0?'gold':i===1?'silver':i===2?'bronze':'';
    return `<tr class="ranking-row ranking-premium-row${placeClass} ${isMe?"me-row":""}">
      <td><div class="rank-position"><span class="rank-medal ${medal}">${i<3?i+1:""}</span><span class="rank-number">${i+1}º</span>${movementBadge(r.name)}</div></td>
      <td><div class="rank-participant">${rankingAvatar(r.name)}<div><strong title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</strong>${isMe?'<span class="you-chip">VOCÊ</span>':""}<small>${team?escapeHtml(team.name):"Participante"}</small></div></div></td>
      <td data-label="Pontos"><strong class="rank-points">${r.total}</strong></td>
      <td data-label="Exatos"><strong>${r.exact}</strong></td>
      <td data-label="Aproveitamento"><div class="rank-rate"><div class="rank-rate-track"><span style="width:${rate}%"></span></div><strong>${rate}%</strong></div></td>
      <td data-label="Palpites"><button class="ranking-picks-action" type="button" data-ranking-picks-key="${escapeHtml(r.key)}" aria-label="Ver ${r.count} palpites de ${escapeHtml(r.name)}, que tem ${r.total} pontos"><span class="ranking-picks-mobile-summary" aria-hidden="true"><span><small>Pontos</small><strong>${r.total}</strong></span><i></i><span><small>Palpites</small><strong>${r.count}</strong><b>👁</b></span></span><span class="ranking-picks-desktop-count">${r.count}</span><span class="ranking-picks-desktop-eye" aria-hidden="true">👁</span><em>Ver palpites</em></button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6"><p class="muted-note">A classificação aparecerá após os primeiros resultados.</p></td></tr>';

  const medals=['🥇','🥈','🥉'];
  $('podium').innerHTML=state.ranking.slice(0,3).map((r,i)=>{
    const rate=r.scored?Math.round(r.total/(r.scored*10)*100):0;
    const team=participantTeam(r.name);
    return `<article class="podium-card card place-${i+1} ${isCurrentRankingParticipant(r)?"is-me":""}">
      <div class="podium-crown">${medals[i]}</div>
      <div class="podium-top"><span class="podium-place">${i+1}º lugar</span>${movementBadge(r.name)}</div>
      ${rankingAvatar(r.name,"podium-avatar")}
      <strong>${escapeHtml(r.name)}</strong>
      ${isCurrentRankingParticipant(r)?'<span class="podium-you">VOCÊ</span>':""}
      <span class="podium-points">${r.total} pontos</span>
      <small>${team?escapeHtml(team.name):`${r.exact} exato${r.exact===1?"":"s"}`}</small>
      <div class="podium-rate"><span style="width:${rate}%"></span></div><em>${rate}% de aproveitamento</em>
    </article>`;
  }).join('') || '<p class="muted-note">O pódio será exibido após os primeiros resultados.</p>';
  renderDashboard();
}

function rankingParticipantPick(picks,participant,gameId){
  return (picks||[]).find(pick=>{
    if(Number(pick?.id_jogo)!==Number(gameId)) return false;
    if(participant?.userId && pick?.user_id) return String(participant.userId)===String(pick.user_id);
    return canonicalName(pick?.usuario).toLowerCase()===String(participant?.name||"").trim().toLowerCase();
  }) || null;
}

function rankingPicksAvailableRounds(){
  return [...new Set((state.games||[]).map(game=>Number(game?.rodada)).filter(Number.isFinite))].sort((a,b)=>a-b);
}

function updateRankingPicksRoundControls(){
  const select=$("rankingPicksRoundSelect");
  const strip=$("rankingPicksRoundNumberStrip");
  if(!select || !strip) return;
  const rounds=[...select.options].map(option=>Number(option.value)).filter(Number.isFinite);
  const selected=Number(select.value);
  const selectedIndex=Math.max(0,rounds.indexOf(selected));
  const visibleCount=5;
  let start=Math.max(0,selectedIndex-Math.floor(visibleCount/2));
  start=Math.min(start,Math.max(0,rounds.length-visibleCount));
  strip.innerHTML=rounds.slice(start,start+visibleCount).map(round=>`<button type="button" class="round-number-button ${round===selected?"is-selected":""}" data-ranking-picks-round="${round}" aria-pressed="${round===selected}" aria-label="Selecionar rodada ${round}">${round}</button>`).join("");
  const previous=$("rankingPicksPrevRound");
  const next=$("rankingPicksNextRound");
  if(previous) previous.disabled=selectedIndex<=0;
  if(next) next.disabled=selectedIndex>=rounds.length-1;
  const currentButton=$("rankingPicksCurrentRoundBtn");
  const current=currentRoundNumber();
  if(currentButton){
    currentButton.disabled=selected===current || !rounds.includes(current);
    currentButton.setAttribute("aria-label", selected===current ? `Você já está na ${current}ª rodada, a rodada atual` : `Ir para a ${current}ª rodada, a rodada atual`);
    currentButton.title=selected===current ? `Rodada atual: ${current}ª` : `Ir para a rodada atual (${current}ª)`;
  }
}

function changeRankingPicksRound(delta){
  const select=$("rankingPicksRoundSelect");
  if(!select) return;
  const next=select.selectedIndex+delta;
  if(next<0 || next>=select.options.length) return;
  select.selectedIndex=next;
  renderRankingParticipantPicks();
}

function goToRankingPicksCurrentRound(){
  const select=$("rankingPicksRoundSelect");
  const round=currentRoundNumber();
  if(!select || Number(select.value)===round || ![...select.options].some(option=>Number(option.value)===round)) return;
  select.value=String(round);
  renderRankingParticipantPicks();
}

function renderRankingParticipantPicks(){
  const participant=rankingPicksParticipant;
  const select=$("rankingPicksRoundSelect");
  const content=$("rankingPicksGames");
  if(!participant || !select || !content) return;
  const round=Number(select.value);
  const games=(state.games||[])
    .filter(game=>Number(game?.rodada)===round)
    .sort((a,b)=>new Date(a.inicio)-new Date(b.inicio));
  const publicPicks=[...(state.publicPicks||[])];
  if(isCurrentRankingParticipant(participant)){
    for(const pick of state.ownPicks||[]){
      if(!publicPicks.some(item=>Number(item.id_jogo)===Number(pick.id_jogo)&&String(item.user_id||"")===String(pick.user_id||""))) publicPicks.push(pick);
    }
  }
  content.innerHTML=games.map(game=>{
    const reveal=isScorableGame(game);
    const pick=reveal?rankingParticipantPick(publicPicks,participant,game.id_jogo):null;
    const result=reveal?`${Number(game.gols_casa)} × ${Number(game.gols_fora)}`:"—";
    const home=`<span class="ranking-pick-team"><span class="ranking-pick-crest">${teamLogo(game.time_casa_logo,game.time_casa)}</span><span>${escapeHtml(game.time_casa)}</span></span>`;
    const away=`<span class="ranking-pick-team is-away"><span class="ranking-pick-crest">${teamLogo(game.time_fora_logo,game.time_fora)}</span><span>${escapeHtml(game.time_fora)}</span></span>`;
    if(!reveal) return `<article class="ranking-pick-game is-locked">
      <div class="ranking-pick-match">${home}<strong>×</strong>${away}</div>
      <div class="ranking-pick-detail"><span aria-hidden="true">🔒</span><div><strong>Palpites protegidos</strong><small>${isPostponed(game)?"Partida adiada":"Disponíveis após o encerramento oficial"}</small></div></div>
    </article>`;
    const earned=pick?points(pick,game):0;
    return `<article class="ranking-pick-game ${pick?"has-pick":"no-pick"}">
      <div class="ranking-pick-match">${home}<strong>${result}</strong>${away}</div>
      <div class="ranking-pick-detail">
        <div class="ranking-pick-prediction"><small>PALPITE</small><strong>${pick?`${Number(pick.gols_casa)} × ${Number(pick.gols_fora)}`:"Não registrado"}</strong></div>
        <div class="ranking-pick-points ${earned>0?"has-points":""} ${earned===10?"is-exact":""}"><small>PONTOS</small><strong>${pick?earned:"—"}</strong>${earned===10?"<em>Placar exato</em>":""}</div>
      </div>
    </article>`;
  }).join("") || '<p class="muted-note">Não há partidas cadastradas nesta rodada.</p>';
  updateRankingPicksRoundControls();
}

function openRankingParticipantPicks(key,trigger){
  const participant=(state.ranking||[]).find(item=>item.key===key);
  if(!participant) return message("Participante não encontrado.",true);
  const rounds=rankingPicksAvailableRounds();
  if(!rounds.length) return message("Ainda não há rodadas disponíveis.",true);
  rankingPicksParticipant=participant;
  rankingPicksReturnFocus=trigger||document.activeElement;
  $("rankingPicksModalTitle").textContent=`Palpites de ${participant.name}`;
  $("rankingPicksModalSummary").textContent="Somente partidas oficialmente encerradas são reveladas.";
  $("rankingPicksRoundSelect").innerHTML=rounds.map(round=>`<option value="${round}">Rodada ${round}</option>`).join("");
  const latestWithFinished=[...rounds].reverse().find(round=>state.games.some(game=>Number(game.rodada)===round&&isScorableGame(game)));
  $("rankingPicksRoundSelect").value=String(latestWithFinished||rounds.at(-1));
  renderRankingParticipantPicks();
  $("rankingPicksModal").classList.remove("hidden");
  document.body.classList.add("modal-open");
  setTimeout(()=>$("rankingPicksModalClose")?.focus(),40);
}

function closeRankingParticipantPicks(){
  $("rankingPicksModal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
  rankingPicksParticipant=null;
  const target=rankingPicksReturnFocus;
  rankingPicksReturnFocus=null;
  target?.focus?.();
}

function ownFinishedEntries(){
  return state.ownPicks.map(p=>({pick:p,game:state.games.find(g=>Number(g.id_jogo)===Number(p.id_jogo))})).filter(x=>isScorableGame(x.game));
}


function renderStatsMoment(model){
  const panel=$("statsParticipantMoment");
  if(!panel) return;
  const moment=model.moment;
  const title=model.dynamicTitle;
  panel.className=`card stats-moment-card tone-${moment.tone}`;
  panel.innerHTML=`<div class="stats-moment-icon" aria-hidden="true">${moment.icon}</div><div class="stats-moment-copy"><span class="eyebrow">${escapeHtml(moment.eyebrow)}</span><h2>${escapeHtml(moment.title)}</h2><p>${escapeHtml(moment.text)}</p></div><div class="stats-dynamic-title"><span>${title.icon}</span><div><small>TÍTULO ATUAL</small><strong>${escapeHtml(title.title)}</strong><p>${escapeHtml(title.description)}</p></div></div>`;
}

function renderStatsRecommendations(model){
  const panel=$("statsRecommendations");
  if(!panel) return;
  panel.innerHTML=model.recommendations.map(item=>`<article class="stats-recommendation-card"><span aria-hidden="true">${item.icon}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div></article>`).join("");
}

function renderStatsInsights(model){
  const panel=$("statsInsights");
  if(!panel) return;
  panel.innerHTML=model.insights.map(item=>`<article class="stats-insight-card ${item.tone||""}"><span class="stats-insight-icon">${item.icon}</span><div><small>${item.eyebrow}</small><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div></article>`).join("");
}

function renderStatsRecords(model,finished){
  const panel=$("statsRecords");
  if(!panel) return;
  const records=model.records;
  const best=records.bestRound;
  panel.innerHTML=finished?`
    <div class="stats-dashboard-head"><div><span class="eyebrow">RECORDES PESSOAIS</span><h2>Suas melhores marcas</h2></div><span class="stats-profile-chip">temporada atual</span></div>
    <div class="stats-records-grid">
      <article><span>Melhor rodada</span><strong>${best?`R${best.round}`:"—"}</strong><small>${best?`${best.points} pontos · ${best.exact} exato${best.exact===1?"":"s"}`:"Sem dados"}</small></article>
      <article><span>Sequência pontuando</span><strong>${records.bestScoringStreak||0}</strong><small>jogos consecutivos</small></article>
      <article><span>Sequência de exatos</span><strong>${records.bestExactStreak||0}</strong><small>placares consecutivos</small></article>
      <article><span>Palpites com pontos</span><strong>${records.hits||0}</strong><small>de ${records.evaluated||0} avaliados</small></article>
    </div>`:'<div class="stats-empty-state"><span aria-hidden="true">🥇</span><strong>Recordes em formação</strong><p>Suas melhores marcas aparecerão após os primeiros resultados.</p></div>';
}

function renderStatsMedals(model){
  const panel=$("statsMedals");
  if(!panel) return;
  const earned=model.medals.filter(item=>item.earned);
  panel.innerHTML=`<div class="stats-dashboard-head"><div><span class="eyebrow">CONQUISTAS</span><h2>Medalhas automáticas</h2></div><span class="stats-profile-chip">${earned.length} conquistada${earned.length===1?"":"s"}</span></div><div class="stats-medals-grid">${model.medals.map(item=>`<article class="stats-medal ${item.earned?'earned':'locked'}"><span aria-hidden="true">${item.earned?item.icon:'🔒'}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p></div></article>`).join('')}</div>`;
}

function renderStatsExecutive(model){
  const panel=$("statsAdvancedComparison");
  if(!panel) return;
  const executive=model.executive;
  if(!executive.available){
    panel.innerHTML='<div class="stats-empty-state"><span aria-hidden="true">👥</span><strong>Visão geral em formação</strong><p>Os indicadores serão liberados quando a classificação possuir dados válidos.</p></div>';
    return;
  }
  const relation=executive.relationToAverage;
  const gap=executive.nearestGap;
  const trend=executive.trend;
  panel.innerHTML=`<div class="stats-dashboard-head"><div><span class="eyebrow">VISÃO GERAL</span><h2>Como você está no bolão</h2><p>Os quatro indicadores mais úteis para entender sua situação atual.</p></div><span class="stats-profile-chip">${executive.position}º de ${executive.participantCount}</span></div>
    <div class="stats-executive-grid">
      <article><span>Posição</span><strong>${executive.position}º</strong><small>${executive.position===1?'Você está na liderança':`entre ${executive.participantCount} participantes`}</small></article>
      <article><span>Pontuação</span><strong>${executive.totalPoints} pts</strong><small>${relation==null?'média do grupo indisponível':`${Math.abs(relation).toFixed(0)} pts ${relation>=0?'acima':'abaixo'} da média`}</small></article>
      <article><span>${gap.label}</span><strong>${gap.value}</strong><small>${escapeHtml(gap.detail)}</small></article>
      <article class="trend-${trend.key}"><span>Regularidade</span><strong>${"★".repeat(executive.consistency.stars)}${"☆".repeat(5-executive.consistency.stars)}</strong><small>${executive.consistency.label}${executive.consistency.value==null?"":` · ${executive.consistency.value}%`}</small></article>
    </div>`;
}

function renderStats(){
  calculateRanking();
  const entries=ownFinishedEntries().sort((a,b)=>new Date(a.game.inicio)-new Date(b.game.inicio));
  const counts={exact:0,difference:0,winner:0,draw:0,miss:0};
  let totalPoints=0;
  entries.forEach(({pick,game})=>{
    const pts=points(pick,game);
    totalPoints+=pts;
    if(pts===10) counts.exact++;
    else if(pts===5) counts.difference++;
    else if(pts===3) counts.winner++;
    else if(pts===1) counts.draw++;
    else counts.miss++;
  });

  const finished=entries.length;
  const scored=finished-counts.miss;
  const hitRate=finished?Math.round(scored/finished*100):0;
  const maxPossible=finished*10;
  const overallRate=maxPossible?Math.round(totalPoints/maxPossible*100):0;
  const averagePerGame=finished?totalPoints/finished:0;
  const exactRate=finished?Math.round(counts.exact/finished*100):0;

  const classification=classifyStatisticsGames({
    games:state.games,
    picks:state.ownPicks,
    isScorableGame,
    isLocked:locked,
    gameStatusDisplay,
  });
  const progress=classification.metrics;
  const quality=classification.dataQuality;
  const currentRoundGames=state.games.filter(game=>Number(game.rodada)===Number(currentRoundNumber()));
  const lifecycle=roundLifecycleSummary(currentRoundGames);
  const lifecycleView=roundLifecyclePresentation(lifecycle);
  const roundAnalysis=analyzeRoundPerformance({entries,pointsForEntry:({pick,game})=>points(pick,game)});
  const predictionProfile=analyzePredictionProfile({entries,pointsForEntry:({pick,game})=>points(pick,game)});
  const rounds=roundAnalysis.rounds;
  const bestRound=roundAnalysis.bestRound;
  const rankingHistory=analyzeRankingHistory({
    games:state.games,
    picks:state.publicPicks,
    participantNames:Object.values(participantDirectory()),
    selectedParticipant:state.participant?.nome,
    isScorableGame,
    pointsForPick:(pick,game)=>points(pick,game),
  });
  const advancedStats=analyzeAdvancedStatistics({
    entries,
    rounds,
    ranking:state.ranking,
    selectedParticipant:state.participant?.nome,
    pointsForEntry:({pick,game})=>points(pick,game),
  });
  const dashboardModel=buildStatisticsDashboardModel({
    advancedStats,
    roundAnalysis,
    predictionProfile,
    totalPoints,
    counts,
    finished,
  });

  const integrityBadge=$("statsIntegrityBadge");
  if(integrityBadge){
    integrityBadge.className=`stats-integrity-badge tone-${lifecycleView.tone}`;
    integrityBadge.textContent=lifecycle.isProvisional?"PROVISÓRIO":lifecycle.status==="FINISHED"?"CONSOLIDADO":lifecycle.status==="IN_PROGRESS"?"EM ANDAMENTO":"PARCIAL";
    integrityBadge.title=`${lifecycleView.label}: ${lifecycle.concluded} de ${lifecycle.total} jogos concluídos`;
  }

  const ring=$("statsOverallRing");
  if(ring){
    ring.style.setProperty("--progress",overallRate);
    ring.innerHTML=finished
      ? `<strong>${overallRate}%</strong><span>eficiência</span>`
      : `<strong>—</strong><span>sem dados</span>`;
    ring.setAttribute("aria-label",finished?`Eficiência de ${overallRate}% nos palpites avaliados`:"Eficiência ainda indisponível");
  }

  if($("statsSummaryText")) $("statsSummaryText").textContent=finished
    ? `${totalPoints} pontos em ${finished} palpites avaliados · participação de ${progress.participationRate}% nos jogos encerrados.${lifecycle.isProvisional?" Dados provisórios até a conclusão dos jogos pendentes.":""}`
    : progress.completedEligible
      ? `Ainda não há palpites avaliados. ${progress.missedCompleted} jogo${progress.missedCompleted===1?" foi encerrado":"s foram encerrados"} sem palpite.`
      : "Suas estatísticas aparecerão assim que houver jogos finalizados.";


  if($("statsHighlights")) $("statsHighlights").innerHTML=`
    <article><span>Acertos</span><strong>${finished?`${hitRate}%`:"—"}</strong><small>${finished?`${scored} de ${finished} palpites renderam pontos`:"Aguardando resultados"}</small></article>
    <article><span>Placares exatos</span><strong>${finished?counts.exact:"—"}</strong><small>${finished?`${exactRate}% dos palpites avaliados`:"Nenhum palpite avaliado"}</small></article>
    <article><span>Participação</span><strong>${progress.completedEligible?`${progress.participationRate}%`:"—"}</strong><small>${progress.completedEligible?`${progress.completedWithPick} de ${progress.completedEligible} jogos encerrados`:"Sem jogos encerrados"}</small></article>
    <article><span>Média por jogo</span><strong>${finished?averagePerGame.toFixed(1):"—"}</strong><small>${finished?`${totalPoints} pontos em ${finished} jogos`:"Aguardando resultados"}</small></article>`;

  if($("hitBreakdown")){
    const max=Math.max(1,...Object.values(counts));
    const labels=[['exact','Placar exato','10 pts'],['difference','Diferença exata','5 pts'],['winner','Vencedor','3 pts'],['draw','Empate','1 pt'],['miss','Sem pontos','0 pt']];
    $("hitBreakdown").innerHTML=finished
      ? labels.map(([key,label,value])=>`<div class="breakdown-row"><div><span>${label}<small>${value} · ${Math.round(counts[key]/finished*100)}%</small></span><strong>${counts[key]}</strong></div><div class="mini-track"><div style="width:${counts[key]/max*100}%"></div></div></div>`).join("")
      : '<div class="stats-empty-state"><span aria-hidden="true">🎯</span><strong>Nenhum palpite avaliado</strong><p>Os tipos de acerto serão detalhados após o encerramento dos primeiros jogos com palpite.</p></div>';
  }

  if($("seasonProgress")) $("seasonProgress").innerHTML=`
    <div class="season-ring" style="--progress:${progress.participationRate}">
      <strong>${progress.completedEligible?`${progress.participationRate}%`:"—"}</strong><span>participação</span>
    </div>
    <div class="season-progress-content">
      <div class="season-progress-head"><div><span>Cobertura da temporada</span><strong>${progress.seasonCoverageRate}%</strong></div><small>${progress.coveredSeasonGames} de ${progress.activeSeasonGames||0} jogos elegíveis têm palpite</small></div>
      <div class="season-coverage-track" role="progressbar" aria-label="Cobertura da temporada" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.seasonCoverageRate}"><i style="width:${progress.seasonCoverageRate}%"></i></div>
      <div class="season-metrics">
        <p><span>Encerrados com palpite</span><strong>${progress.completedWithPick}</strong></p>
        <p><span>Encerrados sem palpite</span><strong>${progress.missedCompleted}</strong></p>
        <p><span>Abertos pendentes</span><strong>${progress.openAvailable}</strong></p>
        <p><span>Palpites registrados</span><strong>${progress.registeredPicks}</strong></p>
      </div>
    </div>`;

  const qualityPanel=$("statsDataQuality");
  if(qualityPanel){
    const reasons=[];
    if(quality.awaitingResult) reasons.push(`<li><strong>${quality.awaitingResult}</strong> aguardando resultado oficial</li>`);
    if(quality.postponed) reasons.push(`<li><strong>${quality.postponed}</strong> adiado${quality.postponed===1?"":"s"} fora dos cálculos</li>`);
    if(quality.cancelled) reasons.push(`<li><strong>${quality.cancelled}</strong> cancelado${quality.cancelled===1?"":"s"} fora dos cálculos</li>`);
    if(quality.invalid) reasons.push(`<li><strong>${quality.invalid}</strong> com dados incompletos para revisão</li>`);
    qualityPanel.classList.toggle("hidden",!quality.hasAttention);
    qualityPanel.classList.toggle("is-warning",quality.level==="warning");
    qualityPanel.innerHTML=quality.hasAttention?`
      <div class="stats-quality-icon" aria-hidden="true">${quality.level==="warning"?"⚠️":"ℹ️"}</div>
      <div><span class="eyebrow">QUALIDADE DAS ESTATÍSTICAS</span><h2>${quality.level==="warning"?"Alguns dados precisam de atenção":"Números calculados com ressalvas"}</h2>
      <p>Os indicadores exibidos consideram somente partidas com situação e resultado válidos.</p><ul>${reasons.join("")}</ul></div>`:"";
  }

  renderStatsMoment(dashboardModel);
  renderStatsRecommendations(dashboardModel);
  renderStatsInsights(dashboardModel);

  const profilePanel=$("statsPredictionProfile");
  if(profilePanel){
    const scenarioIcons={home:"🏠",draw:"⚖️",away:"✈️"};
    const scenarioRows=predictionProfile.scenarios.map(item=>`<div class="stats-scenario-row"><span class="stats-scenario-icon" aria-hidden="true">${scenarioIcons[item.key]}</span><div><span>${item.shortLabel}</span><small>${item.hits} acerto${item.hits===1?"":"s"} em ${item.games} jogo${item.games===1?"":"s"}</small></div><div class="stats-scenario-track"><i style="width:${item.rate}%"></i></div><strong>${item.games?`${item.rate}%`:"—"}</strong></div>`).join("");
    const strongest=predictionProfile.strongestScenario;
    const scenarioSummary=predictionProfile.hasEnoughData&&strongest
      ? `Seu melhor cenário até aqui é <strong>${escapeHtml(strongest.label.toLowerCase())}</strong>, com ${strongest.rate}% de acertos.`
      : "A leitura por resultado ficará mais precisa após pelo menos três palpites avaliados.";
    profilePanel.innerHTML=`<div class="stats-profile-head"><div><span class="eyebrow">CENÁRIOS DE RESULTADO</span><h2>Onde você acerta mais</h2></div><span class="stats-profile-chip">${finished} avaliados</span></div><div class="stats-scenario-list">${scenarioRows}</div><p class="stats-profile-note">${scenarioSummary}</p>`;
  }

  const affinityPanel=$("statsTeamAffinity");
  if(affinityPanel){
    const best=predictionProfile.bestTeam;
    const challenge=predictionProfile.challengeTeam;
    const teamItem=(type,icon,title,item,empty)=>item?`<article class="stats-team-affinity-item ${type}"><span class="stats-team-affinity-icon" aria-hidden="true">${icon}</span><div><small>${title}</small><strong>${escapeHtml(item.name)}</strong><p>${item.points} ponto${item.points===1?"":"s"} em ${item.games} jogo${item.games===1?"":"s"} · ${item.hitRate}% com pontos</p></div></article>`:`<article class="stats-team-affinity-item is-empty"><span class="stats-team-affinity-icon" aria-hidden="true">${icon}</span><div><small>${title}</small><strong>Em formação</strong><p>${empty}</p></div></article>`;
    affinityPanel.innerHTML=`<div class="stats-profile-head"><div><span class="eyebrow">AFINIDADE COM CLUBES</span><h2>Times no seu radar</h2></div><span class="stats-profile-chip">mín. 2 jogos</span></div><div class="stats-team-affinity-list">${teamItem("best","⭐","MAIS PONTOS",best,"Os resultados indicarão os clubes em que você mais pontua.")}${teamItem("challenge","🧩","MAIOR DESAFIO",challenge,"Ainda não há erros suficientes para identificar um desafio recorrente.")}</div><p class="stats-profile-note">A análise considera os dois clubes de cada partida e não interfere na pontuação oficial.</p>`;
  }


  renderStatsRecords(dashboardModel,finished);
  renderStatsMedals(dashboardModel);
  renderStatsExecutive(dashboardModel);

  const rankingHistoryPanel=$("statsRankingHistory");
  if(rankingHistoryPanel){
    const history=rankingHistory.selectedSeries;
    const summary=rankingHistory.summary;
    const participantSeries=rankingHistory.participants
      .filter(item=>item.series.length)
      .sort((a,b)=>(a.series.at(-1)?.position||999)-(b.series.at(-1)?.position||999));
    const maxParticipants=Math.max(1,summary.participantCount);
    const chartRows=history.map((item,index)=>{
      const previous=index?history[index-1]:null;
      const movement=previous?previous.position-item.position:0;
      const movementLabel=!previous?"início":movement>0?`↑ ${movement}`:movement<0?`↓ ${Math.abs(movement)}`:"→";
      const movementClass=!previous||movement===0?"stable":movement>0?"up":"down";
      const positionPercent=maxParticipants===1?50:((maxParticipants-item.position)/(maxParticipants-1))*100;
      return `<div class="ranking-history-point ${movementClass}"><span>R${item.round}</span><div class="ranking-history-axis"><i style="left:${Math.max(0,Math.min(100,positionPercent))}%" aria-hidden="true"></i></div><strong>${item.position}º</strong><small>${item.points} pts</small><em>${movementLabel}</em></div>`;
    }).join("");
    const comparisonRows=participantSeries.slice(0,8).map(item=>{
      const latest=item.series.at(-1);
      const isMe=isCurrentRankingParticipant(item);
      const width=summary.currentPoints||latest.points?Math.max(6,(latest.points/Math.max(1,...participantSeries.map(row=>row.series.at(-1)?.points||0)))*100):0;
      return `<div class="ranking-history-competitor ${isMe?'is-me':''}"><span>${latest.position}º</span><div><strong>${escapeHtml(item.name)}${isMe?' <small>VOCÊ</small>':''}</strong><div><i style="width:${width}%"></i></div></div><b>${latest.points} pts</b></div>`;
    }).join("");
    const movementText=summary.biggestClimb?`R${summary.biggestClimb.round} · +${summary.biggestClimb.places}`:"—";
    const dropText=summary.biggestDrop?`R${summary.biggestDrop.round} · -${summary.biggestDrop.places}`:"—";
    rankingHistoryPanel.innerHTML=history.length?`
      <div class="stats-ranking-history-head"><div><span class="eyebrow">HISTÓRICO DO RANKING</span><h2>Sua trajetória no bolão</h2><p>Posição acumulada após cada rodada encerrada.</p></div><span class="stats-profile-chip">${summary.completedRounds} rodada${summary.completedRounds===1?'':'s'}</span></div>
      <div class="ranking-history-summary">
        <article><span>Melhor posição</span><strong>${summary.bestPosition}º</strong><small>ao longo do campeonato</small></article>
        <article><span>Pior posição</span><strong>${summary.worstPosition}º</strong><small>ao longo do campeonato</small></article>
        <article><span>Maior subida</span><strong>${movementText}</strong><small>${summary.biggestClimb?`${summary.biggestClimb.from}º → ${summary.biggestClimb.to}º`:'sem variação positiva'}</small></article>
        <article><span>Maior queda</span><strong>${dropText}</strong><small>${summary.biggestDrop?`${summary.biggestDrop.from}º → ${summary.biggestDrop.to}º`:'sem variação negativa'}</small></article>
      </div>
      <div class="ranking-history-layout">
        <div class="ranking-history-chart" aria-label="Evolução da posição por rodada">${chartRows}</div>
        <div class="ranking-history-comparison"><span class="eyebrow">CLASSIFICAÇÃO ATUAL</span>${comparisonRows}</div>
      </div>`:'<div class="stats-empty-state"><span aria-hidden="true">🏆</span><strong>Histórico do ranking em formação</strong><p>As posições por rodada aparecerão quando houver resultados oficiais e palpites pontuáveis.</p></div>';
  }

  const top=Math.max(1,...rounds.map(item=>item.points));
  const biggestEvolution=rounds.reduce((best,item,index)=>{
    if(!index) return best;
    const previous=rounds[index-1];
    const gain=Number(item.points||0)-Number(previous.points||0);
    return !best||gain>best.gain?{from:previous.round,to:item.round,gain}:best;
  },null);
  if($("bestRoundBadge")) $("bestRoundBadge").textContent=bestRound?`Melhor rodada: R${bestRound.round} · ${bestRound.points} pts`:"Melhor rodada: —";
  if($("statsEvolutionHighlight")) $("statsEvolutionHighlight").textContent=biggestEvolution&&biggestEvolution.gain>0?`Maior evolução: +${biggestEvolution.gain} pts · R${biggestEvolution.from} → R${biggestEvolution.to}`:"Maior evolução: —";
  if($("roundHistory")) $("roundHistory").innerHTML=rounds.length?rounds.map((data,index)=>{
    const previous=index?rounds[index-1]:null;
    const change=!previous?null:data.average-previous.average;
    const changeLabel=change===null?"início":Math.abs(change)<.05?"estável":change>0?`+${change.toFixed(1)}`:change.toFixed(1);
    const changeClass=change===null||Math.abs(change)<.05?"stable":change>0?"up":"down";
    return `<div class="round-history-item ${bestRound&&data.round===bestRound.round?'best':''}"><span>R${data.round}</span><div class="history-track"><div style="width:${data.points/top*100}%"></div></div><strong>${data.points} pts</strong><small>${data.hits}/${data.games} acertos · ${data.average.toFixed(1)} pts/jogo</small><em class="round-change ${changeClass}">${changeLabel}</em></div>`;
  }).join(""):'<div class="stats-empty-state"><span aria-hidden="true">📈</span><strong>Sem evolução por rodada ainda</strong><p>O gráfico será exibido após os primeiros jogos finalizados com palpite.</p></div>';
}

function standingsZone(position, totalTeams){
  if(position <= 4) return "libertadores";
  if(position <= 6) return "prelibertadores";
  if(position <= 12) return "sulamericana";
  if(position > Math.max(0, totalTeams - 4)) return "relegation";
  return "";
}

function standingsZoneLabel(zone){
  return ({libertadores:"Libertadores",prelibertadores:"Pré-Libertadores",sulamericana:"Sul-Americana",relegation:"Rebaixamento"})[zone] || "Meio da tabela";
}

function standingsFavoriteData(teamName){
  const favoriteKey=normalizeTeamKey(state.participant?.time_favorito || "");
  const rowKey=normalizeTeamKey(teamName);
  const isFavorite=Boolean(favoriteKey) && (rowKey===favoriteKey || rowKey.includes(favoriteKey) || favoriteKey.includes(rowKey));
  return {favoriteKey,rowKey,isFavorite,colors:TEAM_THEMES[favoriteKey] || ["#35dc83","#ffffff","#ffffff"]};
}


function standingsTeamExpandedContent(row){
  const team=findTeam(row.team) || {name:row.team,key:normalizeTeamKey(row.team),logo:row.crest||""};
  const games=favoriteTeamGames(team);
  const recent=games.filter(isScorableGame).sort((a,b)=>Number(b.rodada)-Number(a.rodada)||new Date(b.inicio)-new Date(a.inicio)).slice(0,5).sort((a,b)=>Number(a.rodada)-Number(b.rodada)||new Date(a.inicio)-new Date(b.inicio));
  const form=recent.map(game=>({round:Number(game.rodada),result:favoriteTeamResult(game,team)})).filter(item=>item.result);
  const positions=favoriteTeamPositionHistory(team,form.map(item=>item.round));
  const byRound=new Map(positions.map(item=>[Number(item.round),item.position]));
  const historyContent=form.length?`<div class="standings-expanded-history"><span class="standings-expanded-label">Últimos jogos</span><div class="standings-history-grid">${form.map((item,index)=>{const pos=byRound.get(item.round);const prev=index?byRound.get(form[index-1].round):null;const arrow=!prev||!pos?'':pos<prev?'↗':pos>prev?'↘':'→';const cls=!arrow?'start':pos<prev?'up':pos>prev?'down':'flat';return `<span class="standings-history-item ${cls}"><small>${item.round}</small><b class="result-${item.result.toLowerCase()}">${item.result}</b><span>${pos?`${pos}º`:"—"}${arrow?`<i>${arrow}</i>`:""}</span></span>`;}).join("")}</div><small class="standings-history-caption">Rodada · resultado · posição</small></div>`:`<p class="standings-no-history">Ainda não há resultados concluídos para este clube.</p>`;
  const history=`<div class="standings-history-level">
    <button class="standings-history-toggle" type="button" aria-expanded="false">
      <span><b aria-hidden="true">⌄</b> Desempenho recente</span><small>Últimos 5 jogos</small>
    </button>
    <div class="standings-history-panel" hidden aria-hidden="true">${historyContent}</div>
  </div>`;
  return `<div class="standings-expanded-content">
    <div class="standings-card-stats">
      <span><small>PJ</small><strong>${row.playedGames}</strong></span><span><small>V</small><strong>${row.won}</strong></span><span><small>E</small><strong>${row.draw}</strong></span><span><small>D</small><strong>${row.lost}</strong></span><span><small>SG</small><strong class="${Number(row.goalDifference)>0?'positive':Number(row.goalDifference)<0?'negative':''}">${Number(row.goalDifference)>0?'+':''}${row.goalDifference}</strong></span>
    </div>
    <div class="standings-card-details">
      <span><small>Gols pró</small><strong>${row.goalsFor}</strong></span><span><small>Gols contra</small><strong>${row.goalsAgainst}</strong></span><span><small>Aproveitamento</small><strong>${row.playedGames?Math.round((Number(row.points)/(Number(row.playedGames)*3))*100):0}%</strong></span>
    </div>
    ${history}
    <button class="standings-team-games-action" type="button" data-standings-team-games="${escapeHtml(row.team)}">Ver jogos do ${escapeHtml(row.team)} <b aria-hidden="true">›</b></button>
  </div>`;
}

function renderStandings(){
  const table = state.standings?.table || [];
  const totalTeams = table.length;
  const mobileCards=[];
  $("standingsBody").innerHTML = table.map(row => {
    const zone = standingsZone(Number(row.position), totalTeams);
    const crest = row.crest
      ? `<img src="${escapeHtml(row.crest)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<span>${initials(row.team).slice(0,2)}</span>`;
    const goalDiff = Number(row.goalDifference || 0);
    const favorite=standingsFavoriteData(row.team);
    const favoriteStyle=favorite.isFavorite?` style="--favorite-primary:${favorite.colors[0]};--favorite-secondary:${favorite.colors[1]};--favorite-text:${favorite.colors[2]}"`:"";
    mobileCards.push(`<article class="standings-mobile-card zone-${zone} ${favorite.isFavorite?"is-favorite-standing":""}" data-team-key="${escapeHtml(favorite.rowKey)}"${favoriteStyle}>
      <button class="standings-card-summary" type="button" aria-expanded="false">
        <span class="standings-mobile-position">${row.position}º</span>
        <span class="standings-mobile-team"><span class="standings-crest">${crest}</span><span><strong>${escapeHtml(row.team)}${favorite.isFavorite?'<span class="favorite-mini-heart" aria-label="Time favorito">♥</span>':''}</strong><small>${standingsZoneLabel(zone)}</small></span></span>
        <span class="standings-mobile-points"><strong>${row.points}</strong><small>pts</small></span>
        <span class="standings-card-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="standings-card-expandable" hidden aria-hidden="true">${standingsTeamExpandedContent(row)}</div>
    </article>`);
    return `<tr class="standings-row zone-${zone} ${favorite.isFavorite?"is-favorite-standing":""}" data-team-key="${escapeHtml(favorite.rowKey)}">
      <td><strong>${row.position}º</strong></td>
      <td><div class="standings-team"><span class="standings-crest">${crest}</span><strong>${escapeHtml(row.team)}</strong></div></td>
      <td class="standings-points"><strong>${row.points}</strong></td><td>${row.playedGames}</td><td>${row.won}</td><td>${row.draw}</td><td>${row.lost}</td><td>${row.goalsFor}</td><td>${row.goalsAgainst}</td>
      <td class="${goalDiff > 0 ? "positive" : goalDiff < 0 ? "negative" : ""}">${goalDiff > 0 ? "+" : ""}${goalDiff}</td>
    </tr>`;
  }).join("");
  $("standingsMobileList").innerHTML=mobileCards.join("");

  const matchday = state.standings?.currentMatchday;
  const updated = state.standings?.updatedAt ? new Date(state.standings.updatedAt).toLocaleString("pt-BR", {day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "";
  $("standingsSubtitle").textContent = `${matchday ? `Após a ${matchday}ª rodada` : "Tabela oficial"}${updated ? ` • atualizada em ${updated}` : ""}`;
  show("standingsLoading", false); show("standingsError", false); show("standingsTableWrap", true); show("standingsMobileList",true);
  renderHomeFavoriteTeam();
}


async function loadStandings(force=false){
  if(state.standings && !force){
    renderStandings();
    return;
  }

  const button = $("refreshStandingsBtn");
  if(button){ button.disabled = true; button.textContent = "Atualizando…"; }
  show("standingsLoading", true);
  show("standingsError", false);
  show("standingsTableWrap", false);
  show("standingsMobileList", false);

  try{
    const response = await fetch("/.netlify/functions/classificacao-brasileirao", {
      headers: { Accept: "application/json" },
      cache: force ? "reload" : "default"
    });
    const result = await response.json();
    if(!response.ok || !result.ok) throw new Error(result.error || "Não foi possível carregar a classificação.");
    state.standings = result;
    renderStandings();
  }catch(err){
    $("standingsError").textContent = err.message || "Não foi possível carregar a classificação.";
    show("standingsLoading", false);
    show("standingsError", true);
  }finally{
    if(button){ button.disabled = false; button.textContent = "Atualizar"; }
  }
}


function isAdminUser(){
  const email=String(state.user?.email||"").toLowerCase();
  const dynamic=state.authorizedParticipants?.find(item=>String(item.email||"").toLowerCase()===email);
  return Boolean(email) && (dynamic?.administrador===true || email===(CONFIG.adminEmail||"").toLowerCase());
}

function adminCurrentRound(){
  const round=currentRoundNumber();
  const games=state.games.filter(game=>Number(game.rodada)===Number(round));
  return {round,games};
}

function pickTimestamp(pick){
  const value=pick?.updated_at || pick?.atualizado_em || pick?.created_at || pick?.criado_em;
  const time=value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function formatRemaining(ms){
  if(ms<=0) return "encerrado";
  const totalMinutes=Math.max(1,Math.ceil(ms/60000));
  const days=Math.floor(totalMinutes/1440);
  const hours=Math.floor((totalMinutes%1440)/60);
  const minutes=totalMinutes%60;
  if(days) return `${days}d ${hours}h`;
  if(hours) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function buildAdminSnapshot(){
  const {round,games}=adminCurrentRound();
  const participantEntries=Object.entries(participantDirectory()).map(([email,name])=>({email:email.toLowerCase(),name}));
  const gameIds=new Set(games.map(game=>Number(game.id_jogo)));

  // A view administrativa informa somente a existência do palpite, nunca o placar.
  // A identificação usa user_id como chave principal e o nome apenas como compatibilidade.
  // Se a view ainda não existir, os palpites do próprio administrador continuam disponíveis.
  const ownFallback=state.ownPicks.map(pick=>({
    ...pick,
    user_id:pick.user_id||state.user?.id,
    usuario:pick.usuario||state.participant?.nome||participantDirectory()?.[state.user?.email?.toLowerCase()]
  }));
  const progressSource=state.adminPickProgress.length
    ? [...state.adminPickProgress, ...ownFallback]
    : [...state.publicPicks, ...ownFallback];

  const deduplicated=new Map();
  for(const pick of progressSource){
    const gameId=Number(pick.id_jogo);
    if(!gameIds.has(gameId)) continue;
    const identity=pick.user_id ? `id:${pick.user_id}` : `nome:${String(pick.usuario||"").trim().toLowerCase()}`;
    const key=`${identity}::${gameId}`;
    const current=deduplicated.get(key);
    if(!current || pickTimestamp(pick)>pickTimestamp(current)) deduplicated.set(key,pick);
  }
  const picks=[...deduplicated.values()];
  const expected=games.length;

  const participants=participantEntries.map(entry=>{
    const profile=state.participants.find(item=>
      String(item.email||"").toLowerCase()===entry.email ||
      String(item.nome||"").trim().toLowerCase()===String(entry.name).trim().toLowerCase()
    );
    const participantPicks=picks.filter(pick=>{
      if(profile?.user_id && pick.user_id) return String(pick.user_id)===String(profile.user_id);
      if(entry.email===String(state.user?.email||"").toLowerCase() && pick.user_id) return String(pick.user_id)===String(state.user?.id);
      return String(pick.usuario||"").trim().toLowerCase()===String(entry.name).trim().toLowerCase();
    });
    const uniqueGames=new Set(participantPicks.map(pick=>Number(pick.id_jogo)));
    const lastUpdate=Math.max(0,...participantPicks.map(pickTimestamp));
    return {name:entry.name,email:entry.email,userId:profile?.user_id||null,count:uniqueGames.size,total:expected,lastUpdate,pickedGameIds:[...uniqueGames],status:uniqueGames.size===0?"not-started":uniqueGames.size>=expected&&expected>0?"complete":"in-progress"};
  });
  const completed=participants.filter(item=>item.status==="complete");
  const pending=participants.filter(item=>item.status!=="complete");
  const closeTimes=games.filter(game=>!isFinished(game)).map(game=>new Date(game.inicio).getTime()-CONFIG.lockMinutesBefore*60000).filter(Number.isFinite).sort((a,b)=>a-b);
  const closeAt=closeTimes[0]||null;
  const now=Date.now();
  const roundFinished=games.length>0 && games.every(isFinished);
  const roundClosed=games.length>0 && games.every(game=>locked(game));
  return {round,games,participants,completed,pending,closeAt,remaining:closeAt?closeAt-now:null,roundFinished,roundClosed,updatedAt:now};
}

function adminState(snapshot){
  if(!snapshot.games.length) return {key:"error",label:"Sem jogos",title:"Não há jogos cadastrados para a rodada atual.",description:"Verifique a sincronização dos jogos.",action:"refresh"};
  if(snapshot.roundFinished) return {key:"finished",label:"Ranking atualizado",title:"A rodada foi finalizada.",description:"Os resultados já podem ser consultados no ranking.",action:"ranking"};
  if(snapshot.roundClosed) return {key:"closed",label:"Rodada encerrada",title:"Os palpites desta rodada estão bloqueados.",description:"Aguardando a conclusão e os resultados oficiais dos jogos.",action:"games"};
  if(!snapshot.pending.length) return {key:"ready",label:"Tudo pronto",title:"Todos os participantes concluíram seus palpites.",description:`${snapshot.participants.length} de ${snapshot.participants.length} participantes completos.`,action:"participants"};
  const remaining=snapshot.remaining ?? Infinity;
  if(remaining<=2*3600000) return {key:"urgent",label:"Urgente",title:`${snapshot.pending.length===1?snapshot.pending[0].name:`${snapshot.pending.length} participantes`} ainda ${snapshot.pending.length===1?"não concluiu":"não concluíram"} os palpites.`,description:`Faltam ${formatRemaining(remaining)} para o próximo fechamento.`,action:"reminder"};
  if(remaining<=6*3600000) return {key:"near",label:"Prazo próximo",title:`Ainda ${snapshot.pending.length===1?"falta 1 participante":`faltam ${snapshot.pending.length} participantes`}.`,description:`O próximo jogo fecha em ${formatRemaining(remaining)}.`,action:"reminder"};
  return {key:"attention",label:"Atenção",title:`Ainda ${snapshot.pending.length===1?"falta 1 participante":`faltam ${snapshot.pending.length} participantes`} concluir os palpites.`,description:snapshot.closeAt?`Próximo fechamento em ${formatRemaining(remaining)}.`:"Há palpites pendentes nesta rodada.",action:"reminder"};
}

function renderAdminControlCenter(snapshot=state.adminSnapshot || buildAdminSnapshot()){
  if(!isAdminUser() || !$("adminControlCenter")) return;
  const completed=snapshot.completed.length;
  const totalParticipants=snapshot.participants.length;
  const pending=snapshot.pending.length;
  const finished=snapshot.games.filter(isFinished).length;
  const totalGames=snapshot.games.length;
  const live=snapshot.games.filter(game=>adminGamePhase(game)==="live").length;
  const active=(state.authorizedParticipants||[]).filter(item=>item.ativo!==false).length || totalParticipants;
  $("adminControlPicks").textContent=`${completed}/${totalParticipants || 0} concluíram`;
  $("adminControlPicksHint").textContent=pending?`${pending} pendente${pending===1?"":"s"}`:"Nenhuma pendência";
  $("adminControlGames").textContent=`${finished}/${totalGames || 0} encerrados`;
  $("adminControlGamesHint").textContent=live?`${live} jogo${live===1?"":"s"} ao vivo`:snapshot.roundFinished?"Rodada concluída":`Rodada ${snapshot.round}`;
  $("adminControlParticipants").textContent=`${active} ativo${active===1?"":"s"}`;
  $("adminControlParticipantsHint").textContent=`${(state.authorizedParticipants||[]).filter(item=>item.administrador).length || 1} administrador${((state.authorizedParticipants||[]).filter(item=>item.administrador).length || 1)===1?"":"es"}`;
  const diagnostic=state.adminDiagnosticSummary;
  const health=$("adminControlHealth"), healthHint=$("adminControlHealthHint"), badge=$("adminControlCenterBadge");
  if(diagnostic){
    health.textContent=diagnostic.label;
    healthHint.textContent=`Autoteste ${diagnostic.score}/100`;
    badge.textContent=diagnostic.score>=90?"Tudo operacional":diagnostic.score>=70?"Requer atenção":"Ação necessária";
    badge.className=`admin-control-center-badge ${diagnostic.score>=90?"is-ok":diagnostic.score>=70?"is-warning":"is-error"}`;
  }else{
    health.textContent="Verificando"; healthHint.textContent="API, banco e cache";
    badge.textContent=pending?`${pending} pendência${pending===1?"":"s"}`:"Operação normal";
    badge.className=`admin-control-center-badge ${pending?"is-warning":"is-checking"}`;
  }
  const view=adminState(snapshot);
  $("adminControlCenterSummary").textContent=view.title;
  $("adminControlUpdatedAt").textContent=`Atualizado às ${new Date(snapshot.updatedAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`;
  const action=$("adminControlPrimaryAction");
  action.textContent=pending?`Ver ${pending} pendência${pending===1?"":"s"}`:"Ver situação da rodada";
  action.dataset.adminTarget=pending?"adminAttentionCard":"adminRoundCard";
}

function renderAdminAttention(){
  if(!isAdminUser()) return;
  const snapshot=buildAdminSnapshot();
  state.adminSnapshot=snapshot;
  const view=adminState(snapshot);
  const card=$("adminAttentionCard");
  const wasCollapsed=card.classList.contains("is-collapsed");
  card.className=`card admin-attention-card state-${view.key}${wasCollapsed?" is-collapsed":""}`;
  $("adminAttentionBadge").textContent=view.label;
  $("adminRoundContext").textContent=`Rodada ${snapshot.round} • ${snapshot.games.length} jogo${snapshot.games.length===1?"":"s"}`;
  const completedCount=snapshot.completed.length;
  const participantSummary=`<div class="admin-participant-summary"><span>Participantes</span><strong>${completedCount}/${snapshot.participants.length} concluíram</strong></div>`;
  const participantCard=item=>{
    const pct=item.total?Math.min(100,Math.round(item.count/item.total*100)):0;
    const isComplete=item.status==="complete";
    const status=isComplete?"Completo":item.status==="not-started"?"Nenhum palpite":"Parcial";
    const icon=isComplete?"✅":item.status==="not-started"?"🔴":"🟡";
    const updated=item.lastUpdate?new Date(item.lastUpdate).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"Sem registro";
    return `<button class="admin-pending-person status-${item.status}" type="button" data-admin-participant="${escapeHtml(item.email)}" aria-label="Ver detalhes dos palpites de ${escapeHtml(item.name)}"><div class="admin-person-row"><strong>${icon} ${escapeHtml(item.name)}</strong><span>${item.count}/${item.total}</span></div><div class="admin-progress-track"><i style="width:${pct}%"></i></div><small>${status} • última atualização: ${updated}</small><span class="admin-person-detail-hint">Toque para ver os jogos <span aria-hidden="true">›</span></span></button>`;
  };
  const showComplete=adminPendingFilter==="all" || adminPendingFilter==="complete";
  const showPending=adminPendingFilter==="all" || adminPendingFilter==="pending";
  const completedHtml=showComplete && snapshot.completed.length?`<section class="admin-progress-group admin-completed-group"><div class="admin-progress-group-title"><strong>🟢 Concluíram a rodada</strong><span>${snapshot.completed.length}</span></div><div class="admin-pending-list">${snapshot.completed.map(participantCard).join("")}</div></section>`:"";
  const pendingHtml=showPending && snapshot.pending.length?`<section class="admin-progress-group admin-incomplete-group"><div class="admin-progress-group-title"><strong>🟡 Ainda pendentes</strong><span>${snapshot.pending.length}</span></div><div class="admin-pending-list">${snapshot.pending.map(participantCard).join("")}</div></section>`:"";
  const emptyFilter=!completedHtml&&!pendingHtml?`<div class="admin-filter-empty">Nenhum participante neste filtro.</div>`:"";
  $("adminAttentionContent").innerHTML=`<h3>${escapeHtml(view.title)}</h3><p>${escapeHtml(view.description)}</p>${participantSummary}<div class="admin-participant-groups">${pendingHtml}${completedHtml}${emptyFilter}</div>`;
  setAnimatedText("adminFilterAllCount",snapshot.participants.length);
  setAnimatedText("adminFilterPendingCount",snapshot.pending.length);
  setAnimatedText("adminFilterCompleteCount",snapshot.completed.length);
  document.querySelectorAll("[data-admin-pending-filter]").forEach(filter=>{
    const active=filter.dataset.adminPendingFilter===adminPendingFilter;
    filter.classList.toggle("active",active);
    filter.setAttribute("aria-pressed",String(active));
  });
  const deadline=$("adminPickDeadline");
  if(deadline){
    const label=deadline.querySelector("strong");
    deadline.classList.remove("is-urgent","is-closed","is-ready");
    if(snapshot.roundFinished || snapshot.roundClosed){ label.textContent="Palpites encerrados"; deadline.classList.add("is-closed"); }
    else if(!snapshot.closeAt){ label.textContent="Sem horário disponível"; }
    else{
      label.textContent=`${formatRemaining(snapshot.closeAt-Date.now())} • ${new Date(snapshot.closeAt).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}`;
      if(snapshot.closeAt-Date.now()<=2*3600000) deadline.classList.add("is-urgent");
      else if(!snapshot.pending.length) deadline.classList.add("is-ready");
    }
  }
  $("adminDataFreshness").textContent=`Atualizado agora • ${new Date(snapshot.updatedAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`;
  const button=$("adminAttentionAction");
  const actions={reminder:"📲 Enviar lembrete",ranking:"🏆 Ver Ranking Completo",games:"⚽ Ver jogos",participants:"👥 Ver participantes",refresh:"🔄 Atualizar agora"};
  button.textContent=actions[view.action]||"";
  button.dataset.action=view.action;
  show("adminAttentionAction",Boolean(actions[view.action]) && !(view.action==="participants"));
  renderAdminQuickActions();
  renderAdminParticipants();
  renderAdminExecutiveDashboard();
  updateAdminExperience(snapshot);
  renderAdminControlCenter(snapshot);
}

function renderAdminQuickActions(){}

function membershipStatusLabel(item){
  const status=item.status || (item.ativo===false?"inactive":"approved");
  if(status==="pending") return "⏳ Aguardando aprovação";
  if(status==="rejected") return "🚫 Solicitação recusada";
  if(status==="inactive" || item.ativo===false) return "🔒 Acesso desativado";
  return item.administrador?"👑 Administrador":"✅ Participante ativo";
}

function setAdminParticipantsFeedback(text,type="info"){
  const feedback=$("adminParticipantsFeedback");
  if(!feedback) return;
  feedback.textContent=text||"";
  feedback.classList.toggle("hidden",!text);
  feedback.classList.toggle("is-error",type==="error");
  feedback.classList.toggle("is-success",type==="success");
  feedback.classList.toggle("is-info",type==="info");
}

function participantLimitReached(){
  const active=(state.authorizedParticipants||[]).filter(item=>(!item.status || item.status==="approved") && item.ativo!==false).length;
  return active>=Math.max(1,Number(state.participantLimit)||10);
}

async function saveParticipantLimit(event){
  event.preventDefault();
  const input=$("adminParticipantLimitInput");
  const button=$("saveParticipantLimitBtn");
  const limit=Number.parseInt(input?.value,10);
  if(!Number.isInteger(limit) || limit<1 || limit>100){
    setAdminParticipantsFeedback("Informe um limite entre 1 e 100 participantes.","error");
    input?.focus();
    return;
  }
  button.disabled=true;
  button.textContent="Salvando…";
  setAdminParticipantsFeedback("Salvando o novo limite…","info");
  try{
    const {data,error}=await sb.rpc("definir_limite_participantes_ativos",{p_limite:limit});
    if(error) throw error;
    state.participantLimit=Math.max(1,Number(data)||limit);
    renderAdminParticipants();
    setAdminParticipantsFeedback(`Limite atualizado para ${state.participantLimit} participantes ativos.`,"success");
  }catch(err){
    console.error("Falha ao salvar limite de participantes",err);
    setAdminParticipantsFeedback(err?.message||"Não foi possível salvar o limite de participantes.","error");
  }finally{
    button.disabled=false;
    button.textContent="Salvar limite";
  }
}

function renderAdminParticipants(){
  if(!isAdminUser() || !$("adminParticipantsList")) return;
  const items=[...(state.authorizedParticipants||[])];
  const approved=items.filter(item=>(!item.status || item.status==="approved") && item.ativo!==false).length;
  const pending=items.filter(item=>item.status==="pending").length;
  const limit=Math.max(1,Number(state.participantLimit)||10);
  const atLimit=approved>=limit;
  $("adminParticipantsCount").textContent=pending?`${approved}/${limit} ativos • ${pending} pendente${pending===1?"":"s"}`:`${approved}/${limit} participante${approved===1?"":"s"} ativo${approved===1?"":"s"}`;
  if($("adminParticipantLimitInput")) $("adminParticipantLimitInput").value=String(limit);
  if($("adminParticipantLimitStatus")) $("adminParticipantLimitStatus").textContent=atLimit?`${approved} de ${limit} ativos — limite atingido`:`${approved} de ${limit} ativos — ${limit-approved} vaga${limit-approved===1?"":"s"} disponível${limit-approved===1?"":"is"}`;
  $("adminPendingRequestsBadge").textContent=String(pending);
  show("adminPendingRequestsBadge",pending>0);
  $("adminParticipantsList").innerHTML=items.length?items.map(item=>{
    const status=item.status || (item.ativo===false?"inactive":"approved");
    const phone=item.celular?formatBrazilPhone(item.celular):"Celular não informado";
    const requested=item.solicitado_em?new Date(item.solicitado_em).toLocaleDateString("pt-BR"):"";
    const isCurrentUser=String(item.email||"").toLowerCase()===String(state.user?.email||"").toLowerCase();
    const canDelete=!item.administrador && !isCurrentUser;
    const hasPhone=Boolean(normalizeWhatsAppPhone(item.celular));
    const whatsappButton=`<button type="button" class="whatsapp admin-member-whatsapp" data-participant-whatsapp="${escapeHtml(item.id)}" ${hasPhone?"":"disabled"} title="${hasPhone?"Enviar mensagem individual pelo WhatsApp":"Cadastre o celular do participante para habilitar"}">WhatsApp</button>`;
    const pendingActions=status==="pending"?`<div class="admin-member-actions">${whatsappButton}<button type="button" class="primary" data-membership-decision="approve" data-participant-id="${escapeHtml(item.id)}" ${atLimit?'disabled title="Aumente o limite ou desative um participante ativo para aprovar"':''}>${atLimit?"Limite atingido":"Aprovar"}</button><button type="button" class="secondary" data-membership-decision="reject" data-participant-id="${escapeHtml(item.id)}">Recusar</button><button type="button" class="danger admin-member-delete" data-participant-delete="${escapeHtml(item.id)}" data-participant-name="${escapeHtml(item.nome)}" ${canDelete?"":"disabled"}>Deletar</button></div>`:
      `<div class="admin-member-actions">${whatsappButton}<button type="button" class="secondary admin-member-toggle" data-participant-id="${escapeHtml(item.id)}" data-participant-active="${item.ativo!==false}">${item.ativo===false?"Reativar":"Desativar"}</button><button type="button" class="danger admin-member-delete" data-participant-delete="${escapeHtml(item.id)}" data-participant-name="${escapeHtml(item.nome)}" ${canDelete?"":"disabled"}>Deletar</button></div>`;
    return `<div class="admin-member-row status-${escapeHtml(status)}">
      <div class="admin-member-avatar">${escapeHtml(initials(item.nome).slice(0,2))}</div>
      <div class="admin-member-copy"><strong>${escapeHtml(item.nome)}</strong><span>${escapeHtml(item.email)}</span><small>${escapeHtml(phone)}${requested&&status==="pending"?` • solicitado em ${escapeHtml(requested)}`:""}</small><small>${membershipStatusLabel(item)}</small></div>
      ${pendingActions}
    </div>`;
  }).join(""):`<p class="muted-note">Nenhum participante cadastrado.</p>`;
}


function normalizeWhatsAppPhone(value){
  let digits=String(value||"").replace(/\D/g,"");
  if(!digits) return "";
  if(digits.startsWith("00")) digits=digits.slice(2);
  if(digits.startsWith("55")) return digits.length>=12 && digits.length<=13?digits:"";
  if(digits.length===10 || digits.length===11) return `55${digits}`;
  return "";
}

function whatsappTemplateText(type,participant){
  const snapshot=state.adminSnapshot || buildAdminSnapshot();
  const round=snapshot.round || currentRoundNumber();
  const name=String(participant.nome||"Participante").trim().split(/\s+/)[0];
  const progress=snapshot.participants?.find(item=>item.email===String(participant.email||"").toLowerCase());
  const remaining=progress?Math.max(0,(Number(progress.total)||0)-(Number(progress.count)||0)):null;
  const close=snapshot.closeAt?new Date(snapshot.closeAt).toLocaleString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"em breve";
  const templates={
    picks:`Olá, ${name}! 👋\n\nVocê ainda tem ${remaining==null?"palpites pendentes":`${remaining} palpite${remaining===1?"":"s"} pendente${remaining===1?"":"s"}`} na Rodada ${round} do Bolão Brasileirão 2026. Complete antes do prazo. Boa sorte! ⚽`,
    closes:`Olá, ${name}! ⏰\n\nA Rodada ${round} fecha hoje. O próximo prazo é ${close}. Confira se todos os seus palpites estão preenchidos. ⚽`,
    approved:`Olá, ${name}! ✅\n\nSua inscrição no Bolão Brasileirão 2026 foi aprovada. Você já pode entrar com sua conta Google e preencher os palpites.`,
    welcome:`Olá, ${name}! 🏆\n\nBem-vindo ao Bolão Brasileirão 2026! Faça seus palpites, acompanhe o ranking e boa sorte na disputa.`,
  };
  return templates[type]||"";
}

function selectWhatsAppTemplate(type){
  const participant=state.whatsappParticipant;
  if(!participant) return;
  const text=whatsappTemplateText(type,participant);
  if($("adminWhatsAppMessage")) $("adminWhatsAppMessage").value=text;
  document.querySelectorAll("[data-whatsapp-template]").forEach(button=>button.classList.toggle("active",button.dataset.whatsappTemplate===type));
}

function openParticipantWhatsApp(id){
  const participant=(state.authorizedParticipants||[]).find(item=>String(item.id)===String(id));
  if(!participant) return message("Participante não encontrado.",true);
  if(!normalizeWhatsAppPhone(participant.celular)) return message("Este participante não possui um celular válido cadastrado.",true);
  state.whatsappParticipant=participant;
  $("adminWhatsAppParticipantName").textContent=participant.nome||"Participante";
  $("adminWhatsAppParticipantPhone").textContent=formatBrazilPhone(participant.celular);
  selectWhatsAppTemplate("picks");
  show("adminWhatsAppModal",true);
  document.body.classList.add("modal-open");
  setTimeout(()=>$('adminWhatsAppMessage')?.focus(),60);
}

function closeParticipantWhatsApp(){
  show("adminWhatsAppModal",false);
  document.body.classList.remove("modal-open");
  state.whatsappParticipant=null;
}

function sendParticipantWhatsApp(){
  const participant=state.whatsappParticipant;
  if(!participant) return;
  const phone=normalizeWhatsAppPhone(participant.celular);
  const text=String($("adminWhatsAppMessage")?.value||"").trim();
  if(!phone) return message("Celular inválido para WhatsApp.",true);
  if(!text) return message("Escolha um modelo ou escreva uma mensagem.",true);
  if(!confirm(`Abrir o WhatsApp para enviar esta mensagem individual a ${participant.nome}?`)) return;
  const url=`https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  const opened=window.open(url,"_blank","noopener,noreferrer");
  if(!opened) window.location.href=url;
  closeParticipantWhatsApp();
  message(`Mensagem preparada para ${participant.nome}. Revise e toque em enviar no WhatsApp.`);
}

async function decideMembership(id,decision){
  const action=decision==="approve"?"aprovar":"recusar";
  if(decision==="approve" && participantLimitReached()){
    setAdminParticipantsFeedback(`Não foi possível aprovar. O bolão atingiu o limite configurado de ${state.participantLimit} participantes ativos.`,"error");
    return;
  }
  if(!confirm(`${action[0].toUpperCase()+action.slice(1)} esta solicitação?`)) return;
  const row=document.querySelector(`[data-participant-id="${CSS.escape(String(id))}"]`)?.closest(".admin-member-row");
  const buttons=row?[...row.querySelectorAll("button")]:[];
  const actionButton=row?.querySelector(`[data-membership-decision="${decision}"]`);
  const originalText=actionButton?.textContent;
  buttons.forEach(button=>button.disabled=true);
  if(actionButton) actionButton.textContent=decision==="approve"?"Aprovando…":"Recusando…";
  setAdminParticipantsFeedback(decision==="approve"?"Aprovando a solicitação…":"Recusando a solicitação…","info");
  try{
    const {error}=await sb.rpc("decidir_solicitacao_participacao",{p_id:id,p_decisao:decision});
    if(error) throw error;
    await loadData(); renderAdminParticipants(); renderAdminAttention(); renderAdminExecutiveDashboard();
    const success=decision==="approve"?"Participante aprovado. O acesso será liberado no próximo login.":"Solicitação recusada.";
    setAdminParticipantsFeedback(success,"success");
    message(success);
  }catch(err){
    console.error("Falha ao analisar solicitação de participante",err);
    const detail=err?.message||"Não foi possível analisar a solicitação.";
    setAdminParticipantsFeedback(detail,"error");
    message(detail,true);
    buttons.forEach(button=>button.disabled=false);
    if(actionButton && originalText) actionButton.textContent=originalText;
  }
}

function registrationLink(){
  const url=new URL(location.origin+location.pathname);
  url.searchParams.set("cadastro","1");
  return url.toString();
}
async function copyRegistrationLink(){
  const link=registrationLink();
  await navigator.clipboard.writeText(link);
  message("Link de cadastro copiado.");
}

function openParticipantManager(){
  $(`adminParticipantForm`).reset();
  $(`adminParticipantFormStatus`).textContent="";
  show("adminParticipantManagerModal",true);
  setTimeout(()=>$(`newParticipantName`)?.focus(),50);
}
function closeParticipantManager(){ show("adminParticipantManagerModal",false); }

async function saveAuthorizedParticipant(event){
  event.preventDefault();
  const nome=$(`newParticipantName`).value.trim();
  const email=$(`newParticipantEmail`).value.trim().toLowerCase();
  const administrador=$(`newParticipantAdmin`).checked;
  const status=$(`adminParticipantFormStatus`);
  const button=$(`saveParticipantBtn`);
  if(!nome || !/^\S+@\S+\.\S+$/.test(email)){ status.textContent="Informe um nome e um e-mail válidos."; return; }
  button.disabled=true; button.textContent="Salvando…";
  try{
    const {error}=await sb.rpc("salvar_participante_autorizado",{p_nome:nome,p_email:email,p_administrador:administrador});
    if(error) throw error;
    await loadData(); renderAdminParticipants(); renderAdminAttention(); renderAdminExecutiveDashboard();
    closeParticipantManager();
    message(`${nome} foi autorizado a entrar no bolão.`);
  }catch(err){ status.textContent=err.message||"Não foi possível salvar. Execute o SQL da versão 4.7.0."; }
  finally{ button.disabled=false; button.textContent="Salvar participante"; }
}

async function toggleAuthorizedParticipant(id,isActive){
  if(isActive && !confirm("Desativar este participante? O histórico de palpites será preservado.")) return;
  try{
    const {error}=await sb.rpc("alterar_status_participante_autorizado",{p_id:id,p_ativo:!isActive});
    if(error) throw error;
    await loadData(); renderAdminParticipants(); renderAdminAttention(); renderAdminExecutiveDashboard();
    message(isActive?"Acesso desativado. Histórico preservado.":"Participante reativado.");
  }catch(err){ message(err.message||"Não foi possível alterar o participante.",true); }
}

async function deleteParticipantPermanently(id,name){
  const participantName=name||"este participante";
  const first=confirm(`Deletar permanentemente ${participantName}? Todos os palpites, pontos, perfil e cadastro no bolão serão apagados. Esta ação não pode ser desfeita.`);
  if(!first) return;
  const typed=prompt(`Para confirmar, digite exatamente o nome do participante:
${participantName}`);
  if(typed!==participantName){
    message("Exclusão cancelada: o nome informado não confere.",true);
    return;
  }
  try{
    const {error}=await sb.rpc("deletar_participante_bolao",{p_id:id});
    if(error) throw error;
    await loadData();
    renderAdminParticipants(); renderAdminAttention(); renderAdminExecutiveDashboard(); renderRanking(); renderHome(); renderStatistics(); renderMyTeam();
    message(`${participantName} e todos os dados do bolão foram excluídos.`);
  }catch(err){ message(err.message||"Não foi possível excluir o participante.",true); }
}

function adminGamePhase(game){
  const phase=gameStatusDisplay(game).key;
  if(phase==="finished" || phase==="cancelled") return "finished";
  if(phase==="live") return "live";
  if(phase==="postponed") return "postponed";
  return "upcoming";
}

function renderAdminRoundStatus(){
  if(!isAdminUser()) return;
  const snapshot=state.adminSnapshot || buildAdminSnapshot();
  const games=[...snapshot.games].sort((a,b)=>new Date(a.inicio)-new Date(b.inicio));
  const now=Date.now();
  const groups={finished:[],live:[],upcoming:[],postponed:[]};
  games.forEach(game=>groups[adminGamePhase(game,now)].push(game));
  const total=games.length;
  const finished=groups.finished.length;
  const live=groups.live.length;
  const upcoming=groups.upcoming.length;
  const postponed=groups.postponed.length;
  const progress=total?Math.round(finished/total*100):0;
  const next=groups.upcoming[0]||null;
  const badge=live?`${live} ao vivo`:postponed?`Parcial • ${postponed} adiado${postponed===1?"":"s"}`:finished===total&&total?"Concluída":upcoming?`${upcoming} pendentes`:"Sem jogos";
  $("adminRoundBadge").textContent=badge;
  $("adminRoundBadge").className=`admin-round-badge ${live?"is-live":postponed?"is-postponed":finished===total&&total?"is-finished":"is-scheduled"}`;

  const metrics=`<div class="admin-round-metrics">
    <div><strong>${total}</strong><span>Total</span></div>
    <div><strong>${finished}</strong><span>Finalizados</span></div>
    <div><strong>${live}</strong><span>Em andamento</span></div>
    <div><strong>${upcoming}</strong><span>Próximos</span></div>
    <div><strong>${postponed}</strong><span>Adiados</span></div>
  </div>`;
  const progressHtml=`<div class="admin-round-progress"><div class="admin-round-progress-label"><span>Progresso da rodada</span><strong>${finished}/${total || 0} • ${progress}%</strong></div><div class="admin-round-progress-track"><i style="width:${progress}%"></i></div></div>`;
  const postponedRows=groups.postponed.map(game=>{
    const kickoff=new Date(game.inicio);
    const hasValidKickoff=Number.isFinite(kickoff.getTime());
    const originalDate=hasValidKickoff
      ? kickoff.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"})
      : "Não informada";
    const originalTime=hasValidKickoff
      ? kickoff.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})
      : "Não informado";
    const venue=game.local_partida||game.local||"Local a definir";
    const round=Number.isFinite(Number(game.rodada))?`Rodada ${Number(game.rodada)}`:"Rodada a definir";
    return `<article class="admin-postponed-game">
      <div class="admin-postponed-matchup">
        <span class="admin-postponed-team"><span class="admin-postponed-crest">${teamLogo(game.time_casa_logo,game.time_casa)}</span><strong>${escapeHtml(game.time_casa||"Mandante a definir")}</strong></span>
        <span class="admin-postponed-versus">×</span>
        <span class="admin-postponed-team is-away"><span class="admin-postponed-crest">${teamLogo(game.time_fora_logo,game.time_fora)}</span><strong>${escapeHtml(game.time_fora||"Visitante a definir")}</strong></span>
      </div>
      <div class="admin-postponed-meta">
        <span><b>📅 Nova data:</b> a definir</span>
        <span><b>◷ Novo horário:</b> a definir</span>
        <span><b>⌖ Local:</b> ${escapeHtml(venue)}</span>
        <span><b>🏁 ${escapeHtml(round)}</b></span>
      </div>
      <small class="admin-postponed-original">Programação original: ${escapeHtml(originalDate)} às ${escapeHtml(originalTime)}. Palpite preservado e pontuação pendente.</small>
    </article>`;
  }).join("");
  const postponedHtml=postponed?`<details class="admin-postponed-games">
    <summary>
      <span><span class="admin-next-label">JOGOS ADIADOS</span><strong>${postponed} partida${postponed===1?"":"s"} aguardando nova data</strong><small>Toque para ver partidas, datas, horários e locais.</small></span>
      <span class="admin-postponed-toggle" aria-hidden="true">⌄</span>
    </summary>
    <div class="admin-postponed-list">${postponedRows}</div>
  </details>`:"";
  const nextHtml=next?`<section class="admin-next-game"><span class="admin-next-label">PRÓXIMO JOGO</span><div class="admin-next-match"><strong>${escapeHtml(next.time_casa)} <span>×</span> ${escapeHtml(next.time_fora)}</strong><small>${escapeHtml(formatDate(next.inicio))}${next.local?` • ${escapeHtml(next.local)}`:""}</small></div><span class="admin-next-countdown">${formatRemaining(new Date(next.inicio).getTime()-now)}</span></section>`:`<section class="admin-next-game is-empty"><strong>${total?"Todos os jogos da rodada foram concluídos.":"Nenhum jogo cadastrado para esta rodada."}</strong></section>`;
  const gameRows=games.map(game=>{
    const phase=adminGamePhase(game,now);
    const displayStatus=gameStatusDisplay(game);
    const icon=displayStatus.icon;
    const label=displayStatus.label;
    const score=game.gols_casa!=null&&game.gols_fora!=null?`<strong class="admin-round-score">${game.gols_casa} × ${game.gols_fora}</strong>`:"";
    return `<article class="admin-round-game status-${phase}"><span class="admin-round-game-icon">${icon}</span><div class="admin-round-game-main"><strong>${escapeHtml(game.time_casa)} × ${escapeHtml(game.time_fora)}</strong><small>${escapeHtml(formatDate(game.inicio))} • ${label}</small></div>${score}</article>`;
  }).join("");
  $("adminRoundContent").innerHTML=`${metrics}${progressHtml}${postponedHtml}${nextHtml}<details class="admin-round-details"><summary>Ver todos os jogos <span>${total}</span></summary><div class="admin-round-games">${gameRows||'<p class="muted-note">Nenhum jogo disponível.</p>'}</div></details>`;
}

function auditGameContext(game){
  if(!game) return null;
  const kickoff=new Date(game.inicio);
  return {
    id:String(game.id_jogo??"—"),
    home:String(game.time_casa||"Mandante a definir"),
    away:String(game.time_fora||"Visitante a definir"),
    round:Number.isFinite(Number(game.rodada))?Number(game.rodada):null,
    kickoff:Number.isFinite(kickoff.getTime())?formatDate(game.inicio):"Data inválida",
    venue:String(game.local_partida||game.local||"Local não informado"),
    rawStatus:String(game.status||"Sem status"),
    status:gameStatusDisplay(game).label,
    score:hasValidScore(game)?`${Number(game.gols_casa)} × ${Number(game.gols_fora)}`:"Sem placar válido",
  };
}

function auditFinding(text,{game=null,code="generic"}={}){
  return {text,code,game:auditGameContext(game)};
}

function buildAuditReport(){
  const issues=[];
  const warnings=[];
  const gameIds=new Map();
  const pickKeys=new Map();
  const games=state.games||[];
  const picks=state.publicPicks||[];

  for(const game of games){
    const id=String(game.id_jogo);
    gameIds.set(id,(gameIds.get(id)||0)+1);
    if(!Number.isFinite(new Date(game.inicio).getTime())) issues.push(auditFinding("Data ou horário inválido.",{game,code:"invalid-date"}));
    const displayStatus=gameStatusDisplay(game);
    const validScore=hasValidScore(game);
    if(isFinished(game) && !isCancelled(game) && !validScore) issues.push(auditFinding("Partida finalizada sem placar válido.",{game,code:"finished-without-score"}));
    // Placar parcial é esperado em partidas ao vivo e não constitui inconsistência.
    // Alertamos apenas quando o placar está associado a um estado incompatível.
    if(validScore && displayStatus.key==="future") warnings.push(auditFinding("Possui placar, mas está classificada como Futura.",{game,code:"future-with-score"}));
    if(validScore && displayStatus.key==="postponed") warnings.push(auditFinding("Possui placar, mas está classificada como Adiada.",{game,code:"postponed-with-score"}));
    if(validScore && displayStatus.key==="cancelled") warnings.push(auditFinding("Possui placar, mas está classificada como Cancelada.",{game,code:"cancelled-with-score"}));
  }
  for(const [id,count] of gameIds) if(count>1) issues.push(auditFinding(`Jogo ${id}: registro duplicado (${count} ocorrências).`,{code:"duplicate-game"}));

  for(const pick of picks){
    const key=`${pick.usuario||"?"}:${pick.id_jogo}`;
    pickKeys.set(key,(pickKeys.get(key)||0)+1);
    if(!gameIds.has(String(pick.id_jogo))) issues.push(auditFinding(`Palpite de ${pick.usuario||"participante"}: jogo ${pick.id_jogo} não encontrado.`,{code:"orphan-pick"}));
    if(!hasScoreValue(pick.gols_casa) || !hasScoreValue(pick.gols_fora)) issues.push(auditFinding(`Palpite de ${pick.usuario||"participante"} no jogo ${pick.id_jogo}: placar inválido.`,{code:"invalid-pick"}));
  }
  for(const [key,count] of pickKeys) if(count>1) issues.push(auditFinding(`Palpite duplicado: ${key} (${count} ocorrências).`,{code:"duplicate-pick"}));

  const scoredGames=games.filter(isScorableGame).length;
  const liveGames=games.filter(game=>gameStatusDisplay(game).key==="live").length;
  const liveGamesWithScore=games.filter(game=>gameStatusDisplay(game).key==="live" && hasValidScore(game)).length;
  const futureGames=games.filter(game=>gameStatusDisplay(game).key==="future").length;
  const postponedGames=games.filter(game=>gameStatusDisplay(game).key==="postponed").length;
  const cancelledGames=games.filter(game=>gameStatusDisplay(game).key==="cancelled").length;
  const rankedPoints=(state.ranking||[]).reduce((sum,item)=>sum+(Number(item.total)||0),0);
  const invalidRanking=(state.ranking||[]).filter(item=>item.total<0 || item.exact<0 || item.scored<0);
  if(invalidRanking.length) issues.push(auditFinding('Ranking contém valores negativos.',{code:"negative-ranking"}));

  return {issues,warnings,summary:{games:games.length,scoredGames,liveGames,liveGamesWithScore,futureGames,postponedGames,cancelledGames,picks:picks.length,participants:(state.ranking||[]).length,rankedPoints}};
}

function auditFindingHtml(row){
  if(!row.game) return `<div class="admin-audit-item ${row.type}"><span>${row.icon}</span><p>${escapeHtml(row.text)}</p></div>`;
  const game=row.game;
  const round=game.round?`Rodada ${game.round}`:"Rodada não informada";
  return `<article class="admin-audit-item admin-audit-game ${row.type}" data-audit-code="${escapeHtml(row.code)}">
    <span class="admin-audit-icon">${row.icon}</span>
    <div class="admin-audit-game-content">
      <div class="admin-audit-game-title"><strong>${escapeHtml(game.home)} <b>${escapeHtml(game.score)}</b> ${escapeHtml(game.away)}</strong><span>${escapeHtml(game.status)}</span></div>
      <p>${escapeHtml(row.text)}</p>
      <div class="admin-audit-game-meta">
        <span>🏁 ${escapeHtml(round)}</span><span>📅 ${escapeHtml(game.kickoff)}</span><span>🏟 ${escapeHtml(game.venue)}</span>
      </div>
      <div class="admin-audit-technical"><span>Status gravado: <strong>${escapeHtml(game.rawStatus)}</strong></span><span>ID: <code>${escapeHtml(game.id)}</code></span></div>
      ${row.code==="postponed-with-score"?'<small class="admin-audit-guidance">A próxima sincronização removerá automaticamente o placar incompatível e manterá a partida fora da pontuação.</small>':''}
    </div>
  </article>`;
}

function renderAdminAudit(){
  const target=$("adminAuditContent");
  const badge=$("adminAuditBadge");
  if(!target) return;
  calculateRanking();
  const report=buildAuditReport();
  if(badge){
    badge.textContent=report.issues.length?`${report.issues.length} erro${report.issues.length===1?'':'s'}`:report.warnings.length?`${report.warnings.length} alerta${report.warnings.length===1?'':'s'}`:'Tudo consistente';
    badge.className=`admin-audit-badge ${report.issues.length?'has-errors':report.warnings.length?'has-warnings':'is-ok'}`;
  }
  const s=report.summary;
  const rows=[...report.issues.map(item=>({...item,type:'error',icon:'❌'})),...report.warnings.map(item=>({...item,type:'warning',icon:'⚠️'}))];
  target.innerHTML=`
    <div class="admin-audit-summary">
      <article><span>Jogos</span><strong>${s.games}</strong><small>${s.scoredGames} finalizados válidos</small></article>
      <article><span>Ao vivo</span><strong>${s.liveGames}</strong><small>${s.liveGamesWithScore} com placar parcial • não pontuam</small></article>
      <article><span>Palpites</span><strong>${s.picks}</strong><small>${s.participants} participantes no ranking</small></article>
      <article><span>Pontos</span><strong>${s.rankedPoints}</strong><small>soma geral calculada</small></article>
    </div>
    <div class="admin-audit-rule"><strong>Regra crítica aplicada:</strong> somente partidas oficialmente finalizadas, não canceladas e com placar válido geram pontos e estatísticas. Placar parcial em jogo ao vivo é uma condição normal e não gera alerta.</div>
    ${state.lastSyncReport?.repairedCount?`<div class="admin-audit-ok">🔧 Última sincronização corrigiu automaticamente <strong>${state.lastSyncReport.repairedCount}</strong> registro${state.lastSyncReport.repairedCount===1?'':'s'}. ${escapeHtml((state.lastSyncReport.repairs||[]).slice(0,4).map(item=>`Jogo ${item.id_jogo}: ${item.reason}`).join(' • '))}</div>`:''}
    ${rows.length?`<div class="admin-audit-list">${rows.map(auditFindingHtml).join('')}</div>`:`<div class="admin-audit-ok">✅ Nenhuma inconsistência estrutural encontrada nos dados carregados.</div>`}
    <small class="muted-note">Auditoria executada com os dados atuais do Supabase. Status e placar são atualizados juntos; partidas futuras, adiadas ou canceladas não conservam placares incompatíveis após a sincronização.</small>`;
}

function renderAdminExecutiveDashboard(){
  if(!isAdminUser() || !$('adminExecutiveContent')) return;
  const snapshot=state.adminSnapshot || buildAdminSnapshot();
  const participants=Math.max(snapshot.participants.length,state.ranking.length,Object.keys(participantDirectory()).length);
  const finishedGames=state.games.filter(isFinished).length;
  const totalGames=state.games.length || 380;
  const totalPicks=(state.pickCounts||[]).reduce((sum,item)=>sum+(Number(item.quantidade)||0),0);
  const scoredPlayers=(state.ranking||[]).filter(item=>Number(item.scored)>0);
  const groupAverage=scoredPlayers.length
    ? scoredPlayers.reduce((sum,item)=>sum+(Number(item.total)||0)/(Number(item.scored)||1),0)/scoredPlayers.length
    : 0;
  const leader=state.ranking?.[0] || null;
  const exactLeader=[...(state.ranking||[])].sort((a,b)=>(Number(b.exact)||0)-(Number(a.exact)||0)||(Number(b.total)||0)-(Number(a.total)||0))[0] || null;
  const completion=snapshot.participants.length ? Math.round(snapshot.completed.length/snapshot.participants.length*100) : 0;
  const roundLifecycle=roundLifecycleSummary(snapshot.games);
  const roundLifecycleView=roundLifecyclePresentation(roundLifecycle);
  const seasonProgress=Math.min(100,Math.round((snapshot.round||0)/38*100));
  const leaderText=leader?`${escapeHtml(leader.name)}<small>${Number(leader.total)||0} ponto${Number(leader.total)===1?'':'s'}</small>`:'—<small>Sem pontuação</small>';
  const exactText=exactLeader&&Number(exactLeader.exact)>0?`${escapeHtml(exactLeader.name)}<small>${Number(exactLeader.exact)} placar${Number(exactLeader.exact)===1?'':'es'} exato${Number(exactLeader.exact)===1?'':'s'}</small>`:'—<small>Aguardando resultados</small>';

  $('adminExecutiveContent').innerHTML=`
    <div class="admin-executive-metrics">
      <article><span class="admin-executive-icon">👥</span><div><small>Participantes</small><strong>${participants}</strong><em>${snapshot.completed.length}/${snapshot.participants.length || participants} concluíram a rodada</em></div></article>
      <article><span class="admin-executive-icon">⚽</span><div><small>Rodada atual</small><strong>${snapshot.round || '—'}<b>/38</b></strong><em>${seasonProgress}% da temporada</em></div></article>
      <article><span class="admin-executive-icon">🎯</span><div><small>Palpites registrados</small><strong>${totalPicks}</strong><em>em toda a competição</em></div></article>
      <article><span class="admin-executive-icon">🏟️</span><div><small>Jogos encerrados</small><strong>${finishedGames}<b>/${totalGames}</b></strong><em>com resultado disponível</em></div></article>
      <article><span class="admin-executive-icon">📊</span><div><small>Média do grupo</small><strong>${groupAverage.toFixed(1)}</strong><em>pontos por jogo pontuado</em></div></article>
      <article class="is-leader"><span class="admin-executive-icon">🥇</span><div><small>Líder atual</small><strong>${leaderText}</strong></div></article>
    </div>
    <div class="admin-round-integrity tone-${roundLifecycleView.tone}"><div><small>Integridade da rodada</small><strong>${roundLifecycleView.label}</strong><span>${roundLifecycle.concluded}/${roundLifecycle.total} jogos concluídos · ${roundLifecycle.completion}%</span></div><b>${roundLifecycle.isProvisional?"PONTUAÇÃO PROVISÓRIA":"STATUS CONSOLIDADO"}</b></div>
    <div class="admin-executive-health">
      <div class="admin-executive-health-head"><span>Adesão aos palpites da rodada</span><strong>${completion}%</strong></div>
      <div class="admin-executive-health-track"><i style="width:${completion}%"></i></div>
      <p>${snapshot.pending.length?`${snapshot.pending.length} participante${snapshot.pending.length===1?'':'s'} ainda ${snapshot.pending.length===1?'precisa':'precisam'} concluir os palpites.`:'Todos os participantes concluíram os palpites desta rodada.'}</p>
    </div>
    <div class="admin-executive-highlight"><span>🔥 Destaque de precisão</span><strong>${exactText}</strong></div>`;
}

function openAdminParticipantDetail(email){
  const snapshot=state.adminSnapshot || buildAdminSnapshot();
  const participant=snapshot.participants.find(item=>item.email===String(email||"").toLowerCase());
  if(!participant) return message("Participante não encontrado.",true);
  const pickedIds=new Set((participant.pickedGameIds||[]).map(Number));
  const games=[...snapshot.games].sort((a,b)=>new Date(a.inicio)-new Date(b.inicio));
  const complete=participant.status==="complete";
  $("adminParticipantModalTitle").textContent=participant.name;
  $("adminParticipantModalSummary").textContent=`Rodada ${snapshot.round} • ${participant.count}/${participant.total} palpites preenchidos`;
  $("adminParticipantModalStatus").textContent=complete?"Completo":participant.status==="not-started"?"Nenhum palpite":"Parcial";
  $("adminParticipantModalStatus").className=`admin-detail-status status-${participant.status}`;
  $("adminParticipantGames").innerHTML=games.map((game,index)=>{
    const hasPick=pickedIds.has(Number(game.id_jogo));
    const date=formatDate(game.inicio);
    return `<article class="admin-detail-game ${hasPick?"has-pick":"missing-pick"}"><span class="admin-detail-game-icon" aria-hidden="true">${hasPick?"✅":"❌"}</span><div><strong>Jogo ${index+1}: ${escapeHtml(game.time_casa)} × ${escapeHtml(game.time_fora)}</strong><small>${escapeHtml(date)} • ${hasPick?"Palpite preenchido":"Palpite pendente"}</small></div></article>`;
  }).join("") || `<p class="muted-note">Não há jogos cadastrados nesta rodada.</p>`;
  $("adminParticipantModal").classList.remove("hidden");
  document.body.classList.add("modal-open");
  $("adminParticipantModalClose")?.focus();
}

function closeAdminParticipantDetail(){
  $("adminParticipantModal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

async function sendAdminReminder(){
  const pending=state.adminSnapshot?.pending||[];
  if(!pending.length){ message("Todos os participantes já concluíram os palpites."); return; }
  const names=pending.map(item=>item.name).join(", ");
  const round=state.adminSnapshot.round;
  const close=state.adminSnapshot.closeAt?new Date(state.adminSnapshot.closeAt).toLocaleString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"em breve";
  const text=`Olá! Ainda há palpites pendentes para a Rodada ${round} do Bolão Brasileirão 2026. Pendentes: ${names}. O próximo fechamento será ${close}. Por favor, concluam os palpites antes do prazo. Boa sorte!`;
  try{
    if(navigator.share) await navigator.share({title:`Bolão • Rodada ${round}`,text});
    else { await navigator.clipboard.writeText(text); message("Lembrete copiado. Agora cole no WhatsApp."); }
  }catch(err){ if(err?.name!=="AbortError") message("Não foi possível compartilhar o lembrete.",true); }
}

function adminRankingShareText(){
  const round=state.adminSnapshot?.round || currentRoundNumber();
  const rows=(state.ranking||[]).map((item,index)=>`${index+1}º ${item.name} — ${item.total} ponto${item.total===1?"":"s"}`).join("\n");
  return `🏆 Bolão Brasileirão 2026 — Classificação\nRodada de referência: ${round}\n\n${rows||"Ranking ainda sem pontuação."}`;
}

async function shareAdminRanking(){
  const text=adminRankingShareText();
  try{
    if(navigator.share) await navigator.share({title:"Classificação • Bolão Brasileirão 2026",text});
    else { await navigator.clipboard.writeText(text); message("Classificação copiada. Agora cole no WhatsApp."); }
  }catch(err){ if(err?.name!=="AbortError") message("Não foi possível compartilhar a classificação.",true); }
}

function goToNextAdminRound(){
  const current=state.adminSnapshot?.round || currentRoundNumber();
  const rounds=[...new Set(state.games.map(game=>Number(game.rodada)).filter(Number.isFinite))].sort((a,b)=>a-b);
  const next=rounds.find(round=>round>current);
  navigateTo("games");
  const select=$("roundSelect");
  if(next && select){ select.value=String(next); renderGames(); message(`Rodada ${next} aberta para consulta.`); }
  else message("Ainda não há uma rodada posterior cadastrada.");
}

function configuredPoolUrl(){
  const configured=String(CONFIG.bolaoUrl||"").trim();
  if(configured) return configured.endsWith("/")?configured:`${configured}/`;
  return `${window.location.origin}/`;
}

async function copyTextWithFallback(text){
  if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(text);
    return;
  }
  const area=document.createElement("textarea");
  area.value=text;
  area.setAttribute("readonly","");
  area.style.position="fixed";
  area.style.opacity="0";
  document.body.appendChild(area);
  area.select();
  const copied=document.execCommand("copy");
  area.remove();
  if(!copied) throw new Error("Não foi possível copiar automaticamente.");
}

async function copyPoolLink(){
  await copyTextWithFallback(configuredPoolUrl());
  message("Link do bolão copiado!");
}

function diagnosticStatusLabel(status){
  if(status==="online") return ["🟢","Online"];
  if(status==="degraded") return ["🟠","Atenção"];
  return ["⚪","Indeterminado"];
}
function diagnosticDate(value){ return value ? new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"medium"}).format(new Date(value)) : "—"; }
function diagnosticDuration(value){ return Number.isFinite(Number(value)) ? `${(Number(value)/1000).toFixed(Number(value)>=1000?1:2)} s` : "—"; }
function diagnosticCacheStatus(cache){
  if(!cache?.available) return ["🔴","Ausente"];
  if(cache.status==="fresh") return ["🟢","Válido"];
  if(cache.status==="stale") return ["🟡","Antigo"];
  return ["🟠","Expirado"];
}
function diagnosticCheckDetail(check){
  if(check?.detail==null || check.detail==="") return "";
  return `<small>${escapeHtml(String(check.detail))}</small>`;
}
function diagnosticAge(value){
  if(value==null) return "—";
  const min=Math.max(0,Math.floor(value/60000));
  if(min<1) return "agora"; if(min<60) return `${min} min`;
  const h=Math.floor(min/60); return h<48?`${h} h`:`${Math.floor(h/24)} d`;
}
async function fetchAdminDiagnostic(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token) throw new Error("Sessão administrativa expirada.");
  const response=await fetch("/.netlify/functions/diagnostico-sistema",{cache:"no-store",headers:{Authorization:`Bearer ${session.access_token}`,Accept:"application/json"}});
  const result=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(result.error||"Não foi possível obter o diagnóstico.");
  return result;
}
async function renderAdminDiagnostic(){
  if(!isAdminUser()) return;
  const content=$("adminDiagnosticContent"), badge=$("adminDiagnosticBadge");
  if(!content) return;
  content.innerHTML='<p class="muted-note">Consultando a saúde do sistema…</p>';
  if(badge){ badge.textContent="Verificando…"; badge.className="admin-diagnostic-badge"; }
  try{
    const d=await fetchAdminDiagnostic();
    const services=Object.entries({"Supabase":d.services.supabase,"Netlify Functions":d.services.netlifyFunctions,"Football Data API":d.services.footballData});
    const last=d.sync.last, lastSuccess=d.sync.lastSuccess;
    const [cacheIcon,cacheLabel]=diagnosticCacheStatus(d.cache);
    content.innerHTML=`
      <div class="diagnostic-health-grid">${services.map(([name,item])=>{const [icon,label]=diagnosticStatusLabel(item.status);return `<article><span>${escapeHtml(name)}</span><strong>${icon} ${label}</strong></article>`}).join("")}</div>
      <div class="diagnostic-section"><h3>Sincronização</h3><div class="diagnostic-metrics">
        <div><span>Última execução</span><strong>${diagnosticDate(last?.criado_em)}</strong></div><div><span>Resultado</span><strong>${last?(last.sucesso?"🟢 Sucesso":"🔴 Erro"):"—"}</strong></div>
        <div><span>Duração</span><strong>${diagnosticDuration(last?.duracao_ms)}</strong></div><div><span>Jogos atualizados</span><strong>${last?.jogos_atualizados??"—"}</strong></div>
        <div><span>Chamadas API</span><strong>${last?.chamadas_api??"—"} / 8</strong></div><div><span>Próxima verificação</span><strong>${diagnosticDate(d.sync.nextScheduledCheck)}</strong></div>
      </div><small>${escapeHtml(d.sync.scheduleMode)}</small></div>
      <div class="diagnostic-section"><h3>Banco e cache</h3><div class="diagnostic-metrics">
        <div><span>Jogos</span><strong>${d.database.jogos.count??"—"}</strong></div><div><span>Palpites</span><strong>${d.database.palpites.count??"—"}</strong></div>
        <div><span>Participantes</span><strong>${d.database.participantes.count??"—"}</strong></div><div><span>Cache da tabela</span><strong>${cacheIcon} ${cacheLabel}</strong></div>
        <div><span>Atualização do cache</span><strong>${diagnosticDate(d.cache.updatedAt)}</strong></div><div><span>Idade do cache</span><strong>${diagnosticAge(d.cache.ageMs)}</strong></div>
        <div><span>Clubes no cache</span><strong>${d.cache.clubs??"—"}</strong></div><div><span>Rodada atual</span><strong>${d.cache.currentMatchday??"—"}</strong></div>
        <div><span>Identificador</span><strong>${escapeHtml(d.cache.id||"—")}</strong></div><div><span>Origem</span><strong>${escapeHtml(d.cache.source||"—")}</strong></div>
      </div>${d.cache.lookup==="latest-fallback"?'<small class="diagnostic-cache-warning">⚠ Cache localizado pelo registro mais recente; verifique se o identificador oficial é BSA-2026.</small>':''}</div>
      <div class="diagnostic-section"><div class="diagnostic-autotest-head"><h3>Autoteste detalhado</h3><strong>${d.autotest.score}/100</strong></div><div class="diagnostic-checks">${d.autotest.checks.map(c=>`<div class="${c.ok?"ok":"fail"}"><span>${c.ok?"✔":"✕"}</span><span>${escapeHtml(c.label)}${diagnosticCheckDetail(c)}</span></div>`).join("")}</div></div>
      <div class="diagnostic-section"><h3>Logs recentes</h3><div class="diagnostic-log-list">${d.logs.slice(0,8).map(log=>`<div><span>${diagnosticDate(log.criado_em)}</span><strong>${log.sucesso?"🟢":"🔴"} ${escapeHtml(log.origem||"sincronização")}</strong><small>${log.sucesso?`${log.jogos_atualizados??0} jogos • ${diagnosticDuration(log.duracao_ms)}`:escapeHtml(log.erro||"Falha sem detalhes")}</small></div>`).join("")||'<p class="muted-note">Nenhum log disponível.</p>'}</div></div>
      <div class="diagnostic-actions"><button id="diagnosticRefreshBtn" class="secondary" type="button">🔄 Atualizar diagnóstico</button><button id="diagnosticSyncBtn" class="primary" type="button">⚽ Sincronizar agora</button><button id="diagnosticExportBtn" class="secondary" type="button">📥 Exportar logs</button></div>
      <small class="diagnostic-note">O status da Football Data API é inferido pelos logs para não consumir a cota apenas com testes.</small>`;
    state.adminDiagnosticSummary={score:Number(d.autotest.score)||0,label:d.autotest.score>=90?"Saudável":d.autotest.score>=70?"Atenção":"Problemas"};
    renderAdminControlCenter();
    if(badge){ badge.textContent=d.autotest.score>=90?"Sistema saudável":d.autotest.score>=70?"Atenção":"Problemas"; badge.className=`admin-diagnostic-badge ${d.autotest.score>=90?"is-ok":d.autotest.score>=70?"is-warning":"is-error"}`; }
    $("diagnosticRefreshBtn")?.addEventListener("click",renderAdminDiagnostic);
    $("diagnosticSyncBtn")?.addEventListener("click",async e=>{await syncGames(e.currentTarget); await renderAdminDiagnostic();});
    $("diagnosticExportBtn")?.addEventListener("click",()=>{
      const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),diagnostic:d},null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`bolao-diagnostico-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  }catch(error){
    content.innerHTML=`<div class="diagnostic-error"><strong>🔴 Não foi possível concluir o diagnóstico</strong><p>${escapeHtml(error.message||"Erro desconhecido")}</p><button id="diagnosticRetryBtn" class="secondary" type="button">Tentar novamente</button></div>`;
    state.adminDiagnosticSummary={score:0,label:"Indisponível"};
    renderAdminControlCenter();
    if(badge){badge.textContent="Indisponível";badge.className="admin-diagnostic-badge is-error";}
    $("diagnosticRetryBtn")?.addEventListener("click",renderAdminDiagnostic);
  }
}

async function handleAdminQuickAction(event){
  const button=event.target.closest("[data-admin-quick-action]");
  if(!button || button.disabled) return;
  const action=button.dataset.adminQuickAction;
  const status=$("adminQuickActionStatus");
  try{
    button.classList.add("is-busy");
    button.disabled=true;
    if(status) status.textContent="Executando ação…";
    if(action==="sync") await syncGames(button);
    else if(action==="ranking"){ await refresh(); renderRanking(); message("Ranking atualizado com os dados mais recentes."); }
    else if(action==="share-ranking") await shareAdminRanking();
    else if(action==="next-round") goToNextAdminRound();
    else if(action==="copy-pool-link") await copyPoolLink();
    if(status) status.textContent="Ação concluída. Os dados do painel permanecem sincronizados.";
  }catch(err){
    if(status) status.textContent=err.message||"Não foi possível concluir a ação.";
    message(err.message||"Não foi possível concluir a ação.",true);
  }finally{
    button.classList.remove("is-busy");
    button.disabled=false;
    renderAdminQuickActions();
  }
}

async function handleAdminAction(){
  const action=$("adminAttentionAction")?.dataset.action;
  if(action==="reminder") return sendAdminReminder();
  if(action==="ranking") return navigateTo("ranking");
  if(action==="games") return navigateTo("games");
  if(action==="refresh") return refresh();
}

async function refresh(){
  const button=$("refreshBtn");
  if(button){ button.disabled=true; button.textContent="Atualizando…"; }
  try{
    await loadData();
    renderGames(); renderRanking(); renderStats(); renderHome();
    renderAdminAttention(); renderAdminRoundStatus(); renderAdminQuickActions(); renderAdminParticipants(); renderAdminDiagnostic(); renderAdminExecutiveDashboard(); renderAdminAudit();
    message("Dados atualizados.");
  }catch(err){
    message(err.message||"Não foi possível atualizar.",true);
    throw err;
  }finally{
    if(button){ button.disabled=false; button.textContent="Atualizar"; }
  }
}

async function refreshAllAdminData(){
  const button=$("adminRefreshBtn");
  const label=button?.querySelector(".admin-refresh-label");
  const feedback=$("adminRefreshFeedback");
  if(!button || button.disabled) return;

  button.disabled=true;
  button.classList.add("is-refreshing");
  if(label) label.textContent="Atualizando…";
  if(feedback) feedback.textContent="Consultando jogos, palpites, ranking, estatísticas e participantes…";

  const modules=[];
  try{
    await loadData();
    const renderers=[
      ["jogos",renderGames],
      ["ranking",renderRanking],
      ["estatísticas",renderStats],
      ["Central de Atenção",renderAdminAttention],
      ["Situação da Rodada",renderAdminRoundStatus],
      ["Central de Ações",renderAdminQuickActions],
      ["participantes",renderAdminParticipants],
      ["Dashboard Executivo",renderAdminExecutiveDashboard],
      ["Auditoria",renderAdminAudit]
    ];
    for(const [name,renderer] of renderers){
      try{ renderer(); }
      catch(err){ modules.push(name); console.warn(`Falha ao atualizar ${name}.`,err); }
    }
    updateAdminExperience(state.adminSnapshot || buildAdminSnapshot());
    adminLastBackgroundRefresh=Date.now();
    const time=new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
    const autoStatus=$("adminAutoRefreshStatus");
    if(autoStatus) autoStatus.textContent=`Atualizado manualmente às ${time}`;
    if(modules.length){
      const warning=`Dados carregados, mas houve falha em: ${modules.join(", ")}.`;
      if(feedback) feedback.textContent=`⚠️ ${warning}`;
      message(warning,true);
    }else{
      if(feedback) feedback.textContent=`✅ Todos os dados atualizados às ${time}`;
      message("Todos os dados do bolão foram atualizados.");
    }
  }catch(err){
    if(feedback) feedback.textContent=`⚠️ ${err.message||"Não foi possível atualizar os dados."}`;
    message(err.message||"Não foi possível atualizar os dados.",true);
  }finally{
    button.disabled=false;
    button.classList.remove("is-refreshing");
    if(label) label.textContent="Atualizar tudo";
  }
}

async function syncGames(triggerButton=null){
  const profileBtn=$("syncGamesBtn");
  const btn=triggerButton || profileBtn;
  const originalText=btn?.textContent;
  if(btn){ btn.disabled=true; btn.textContent=triggerButton?"Sincronizando…":"Sincronizando…"; }
  if(profileBtn && profileBtn!==btn) profileBtn.disabled=true;
  if($("adminSyncResult")) $("adminSyncResult").textContent="";
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.access_token) throw new Error("Sua sessão expirou. Entre novamente para sincronizar.");
    const response=await fetch("/.netlify/functions/sincronizar-jogos",{
      method:"POST",
      headers:{"Authorization":`Bearer ${session.access_token}`,"Accept":"application/json"}
    });
    const result=await response.json();
    if(!response.ok||!result.ok) throw new Error(result.error||result.message||"Falha na sincronização");
    state.lastSyncReport=result;
    const repaired=Number(result.repairedCount)||0;
    if($("adminSyncResult")) $("adminSyncResult").textContent=`${result.imported} jogos atualizados${repaired?` • ${repaired} inconsistência${repaired===1?"":"s"} reparada${repaired===1?"":"s"}`:""}.`;
    await refresh();
    message(`${result.imported} jogos sincronizados${repaired?` e ${repaired} inconsistência${repaired===1?"":"s"} reparada${repaired===1?"":"s"}`:""}.`);
  }catch(err){
    if($("adminSyncResult")) $("adminSyncResult").textContent=err.message;
    message(err.message,true);
    throw err;
  }finally{
    if(btn){ btn.disabled=false; btn.textContent=originalText||"Sincronizar jogos agora"; }
    if(profileBtn){ profileBtn.disabled=false; if(profileBtn===btn) profileBtn.textContent="Sincronizar jogos agora"; }
  }
}


// v4.6.0 — refinamento da experiência administrativa
let adminAutoRefreshTimer=null;
let adminLastBackgroundRefresh=0;
let adminPendingFilter="all";

function setAnimatedText(id,value){
  const element=$(id);
  if(!element) return;
  const next=String(value);
  if(element.textContent===next) return;
  element.textContent=next;
  element.classList.remove("admin-value-updated");
  requestAnimationFrame(()=>element.classList.add("admin-value-updated"));
  setTimeout(()=>element.classList.remove("admin-value-updated"),650);
}

function updateAdminExperience(snapshot=state.adminSnapshot || buildAdminSnapshot()){
  if(!isAdminUser() || !snapshot) return;
  const now=Date.now();
  const nextGame=[...snapshot.games]
    .filter(game=>!isFinished(game) && new Date(game.inicio).getTime()>now)
    .sort((a,b)=>new Date(a.inicio)-new Date(b.inicio))[0];
  setAnimatedText("adminSmartRound",snapshot.round || "—");
  setAnimatedText("adminSmartPicks",`${snapshot.completed.length}/${snapshot.participants.length} concluíram`);
  setAnimatedText("adminSmartNext",nextGame?formatRemaining(new Date(nextGame.inicio).getTime()-now):(snapshot.roundFinished?"Rodada encerrada":"Sem jogo agendado"));

  const attentionBadge=$("adminNavAttentionBadge");
  if(attentionBadge){
    attentionBadge.textContent=String(snapshot.pending.length);
    attentionBadge.classList.toggle("hidden",snapshot.pending.length===0);
    attentionBadge.classList.toggle("is-urgent",Boolean(snapshot.remaining!=null && snapshot.remaining<=2*3600000));
  }
  const liveCount=snapshot.games.filter(game=>adminGamePhase(game,now)==="live").length;
  const roundBadge=$("adminNavRoundBadge");
  if(roundBadge){
    roundBadge.textContent=liveCount?String(liveCount):"•";
    roundBadge.classList.toggle("hidden",liveCount===0);
    roundBadge.classList.toggle("is-live",liveCount>0);
  }
}

const ADMIN_CARD_IDS=["adminAttentionCard","adminRoundCard","adminQuickActionsCard","adminParticipantsCard","adminDiagnosticCard","adminAuditCard","adminExecutiveCard"];

function setAdminCardCollapsed(card,collapsed,{animate=true}={}){
  if(!card) return;
  const alreadyCollapsed=card.classList.contains("is-collapsed");
  const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const shouldAnimate=animate && !reduceMotion && alreadyCollapsed!==collapsed && card.isConnected;
  const content=[...card.children].filter(child=>!child.matches("[data-admin-card-header]"));

  card.getAnimations?.().forEach(animation=>animation.cancel());
  content.forEach(child=>child.getAnimations?.().forEach(animation=>animation.cancel()));

  if(!shouldAnimate){
    card.classList.toggle("is-collapsed",collapsed);
  }else{
    const startHeight=card.getBoundingClientRect().height;
    card.style.height=`${startHeight}px`;
    card.style.overflow="hidden";
    card.classList.toggle("is-collapsed",collapsed);
    const endHeight=card.scrollHeight;

    card.animate(
      [{height:`${startHeight}px`},{height:`${endHeight}px`}],
      {duration:collapsed?250:340,easing:"cubic-bezier(.22,.8,.26,1)"}
    ).onfinish=()=>{
      card.style.height="";
      card.style.overflow="";
    };

    if(!collapsed){
      content.forEach((child,index)=>child.animate(
        [{opacity:0,transform:"translateY(-8px)"},{opacity:1,transform:"translateY(0)"}],
        {duration:260,delay:55+Math.min(index*18,90),easing:"cubic-bezier(.22,.8,.26,1)",fill:"both"}
      ));
    }else{
      content.forEach(child=>child.animate(
        [{opacity:1,transform:"translateY(0)"},{opacity:0,transform:"translateY(-5px)"}],
        {duration:150,easing:"ease-out"}
      ));
    }
  }

  const toggle=card.querySelector("[data-admin-collapse]");
  if(toggle){
    toggle.setAttribute("aria-expanded",String(!collapsed));
    toggle.textContent="⌃";
    const title=card.querySelector("h2")?.textContent?.trim() || "card";
    toggle.setAttribute("aria-label",`${collapsed?"Expandir":"Aberto:"} ${title}`);
  }
}

function expandOnlyAdminCard(targetId,{scroll=false,animate=true}={}){
  const target=$(targetId) || $(ADMIN_CARD_IDS[0]);
  if(!target) return;
  ADMIN_CARD_IDS.forEach(id=>setAdminCardCollapsed($(id),id!==target.id,{animate}));
  setAdminQuickNavActive(target.id);
  try{ localStorage.setItem("bolao-admin-active-card",target.id); }catch(_err){}
  if(scroll){
    target.scrollIntoView({behavior:"smooth",block:"start"});
    target.classList.remove("admin-card-nav-highlight");
    requestAnimationFrame(()=>target.classList.add("admin-card-nav-highlight"));
    setTimeout(()=>target.classList.remove("admin-card-nav-highlight"),850);
  }
}

function collapseAdminCard(card,{animate=true}={}){
  if(!card || card.classList.contains("is-collapsed")) return;
  setAdminCardCollapsed(card,true,{animate});
  setAdminQuickNavActive(null);
  try{ localStorage.removeItem("bolao-admin-active-card"); }catch(_err){}
}

function toggleAdminCard(card,{scroll=true}={}){
  if(!card) return;
  if(card.classList.contains("is-collapsed")) expandOnlyAdminCard(card.id,{scroll});
  else collapseAdminCard(card);
}

function setupAdminCollapsibleCards(){
  let initialCard="adminAttentionCard";
  try{
    const saved=localStorage.getItem("bolao-admin-active-card");
    if(ADMIN_CARD_IDS.includes(saved)) initialCard=saved;
  }catch(_err){}
  expandOnlyAdminCard(initialCard,{animate:false});
  document.querySelectorAll("[data-admin-collapse]").forEach(toggle=>{
    const card=$(toggle.dataset.adminCollapse);
    if(!card) return;
    toggle.onclick=event=>{
      event.stopPropagation();
      toggleAdminCard(card,{scroll:true});
    };
    card.querySelector("[data-admin-card-header]")?.addEventListener("click",event=>{
      if(event.target.closest("button,a,input,label,select,textarea")) return;
      toggleAdminCard(card,{scroll:true});
    });
  });
}

async function refreshAdminSilently(reason="automática"){
  if(!isAdminUser() || document.hidden || $("adminTab")?.classList.contains("hidden")) return;
  const status=$("adminAutoRefreshStatus");
  if(status) status.textContent="Atualizando dados…";
  try{
    await loadData();
    renderGames(); renderRanking(); renderStats(); renderHome();
    renderAdminAttention(); renderAdminRoundStatus(); renderAdminQuickActions(); renderAdminParticipants(); renderAdminDiagnostic(); renderAdminExecutiveDashboard(); renderAdminAudit();
    adminLastBackgroundRefresh=Date.now();
    if(status) status.textContent=`Atualizado automaticamente às ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`;
  }catch(err){
    console.warn(`Falha na atualização ${reason} do painel ADM.`,err);
    if(status) status.textContent="Atualização automática indisponível";
  }
}

function startAdminAutoRefresh(){
  if(adminAutoRefreshTimer) return;
  adminLastBackgroundRefresh=Date.now();
  adminAutoRefreshTimer=setInterval(()=>refreshAdminSilently(),60000);
}

function stopAdminAutoRefresh(){
  if(adminAutoRefreshTimer){ clearInterval(adminAutoRefreshTimer); adminAutoRefreshTimer=null; }
}

let adminNavObserver=null;

function setAdminQuickNavActive(targetId){
  document.querySelectorAll("[data-admin-target]").forEach(button=>{
    const active=button.dataset.adminTarget===targetId;
    button.classList.toggle("active",active);
    if(active) button.setAttribute("aria-current","true"); else button.removeAttribute("aria-current");
  });
}

function scrollToAdminSection(targetId){
  const card=$(targetId);
  if(card && !card.classList.contains("is-collapsed")) collapseAdminCard(card);
  else expandOnlyAdminCard(targetId,{scroll:true});
}

function setupAdminQuickNavigation(){
  const nav=$("adminQuickNav");
  if(!nav) return;
  const handleTargetClick=event=>{
    const button=event.target.closest("[data-admin-target]");
    if(button) scrollToAdminSection(button.dataset.adminTarget);
  };
  nav.onclick=handleTargetClick;
  if($("adminControlCenter")) $("adminControlCenter").onclick=handleTargetClick;
  document.querySelectorAll("[data-admin-back-to-nav]").forEach(button=>{
    button.onclick=()=>{
      const topAnchor=$("adminTopAnchor") || $("adminTab") || nav;
      topAnchor.scrollIntoView({behavior:"smooth",block:"start"});
      setTimeout(()=>{
        nav.scrollLeft=0;
        nav.querySelector(".admin-quick-nav-button.active")?.focus({preventScroll:true});
      },450);
    };
  });
  adminNavObserver?.disconnect();
  adminNavObserver=null;
}

function focusFavoriteTeamInStandings(attempt=0){
  const favoriteKey=normalizeTeamKey(state.participant?.time_favorito || "");
  if(!favoriteKey) return;
  const rows=[...document.querySelectorAll("#standingsBody .standings-row, #standingsMobileList .standings-mobile-card")];
  const target=rows.find(row=>{
    const rowKey=String(row.dataset.teamKey||"");
    return rowKey===favoriteKey || rowKey.includes(favoriteKey) || favoriteKey.includes(rowKey);
  });
  if(target){
    target.classList.add("is-favorite-standing-pulse");
    target.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"});
    setTimeout(()=>target.classList.remove("is-favorite-standing-pulse"),1800);
    return;
  }
  if(attempt<12) setTimeout(()=>focusFavoriteTeamInStandings(attempt+1),180);
}

function updateBottomNavigationMotion(tabName){
  const items=[...document.querySelectorAll(".bottom-nav-item")];
  const activeIndex=items.findIndex(item=>item.dataset.tab===tabName);
  const nav=document.querySelector(".bottom-nav");
  if(nav && activeIndex>=0){
    nav.style.setProperty("--active-index",String(activeIndex));
    nav.classList.add("has-active-indicator");
  }else{
    nav?.classList.remove("has-active-indicator");
  }
}

function applyNavigationState(tabName){
  const primaryTabs=["home","games","myTeam","ranking","stats","admin"];
  show("participantDashboardSummary",false);
  document.querySelectorAll(".bottom-nav-item").forEach(item=>{
    const active=item.dataset.tab===tabName;
    item.classList.toggle("active",active);
    if(active) item.setAttribute("aria-current","page"); else item.removeAttribute("aria-current");
  });
  ["home","games","myTeam","ranking","standings","stats","admin","rules","profile"].forEach(name=>show(`${name}Tab`,name===tabName));
  if(tabName==="home") renderHome();
  if(tabName==="myTeam") renderMyTeam();
  if(tabName==="ranking") renderRanking();
  if(tabName==="standings") loadStandings();
  if(tabName==="stats") renderStats();
  if(tabName==="admin"){ renderAdminAttention(); renderAdminRoundStatus(); renderAdminQuickActions(); renderAdminParticipants(); renderAdminDiagnostic(); renderAdminExecutiveDashboard(); renderAdminAudit(); updateAdminExperience(); startAdminAutoRefresh(); }
  else stopAdminAutoRefresh();
  if(!primaryTabs.includes(tabName)) document.querySelectorAll(".bottom-nav-item").forEach(item=>item.classList.remove("active"));
  updateBottomNavigationMotion(tabName);
  window.dispatchEvent(new CustomEvent("bolao:tabchange",{detail:{tabName}}));
}

function navigateTo(tabName){
  const target=$(tabName+"Tab");
  const current=document.querySelector(".tab-content:not(.hidden)");
  if(current===target){
    window.scrollTo({top:0,behavior:prefersReducedMotion()?"auto":"smooth"});
    return;
  }

  const mutate=()=>applyNavigationState(tabName);
  if(document.startViewTransition && !prefersReducedMotion()){
    document.startViewTransition(mutate);
  }else{
    mutate();
    animateTabEntry(target);
  }
  window.scrollTo({top:0,behavior:prefersReducedMotion()?"auto":"smooth"});
}

function setupTabs(){
  document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>navigateTo(btn.dataset.tab));
  document.querySelectorAll(".filter-chip").forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll(".filter-chip").forEach(x=>x.classList.remove("active")); btn.classList.add("active"); state.gameFilter=btn.dataset.filter; renderGames();
  });
}

function startMatchClockRefresh(){
  if(matchClockRefreshTimer) return;
  matchClockRefreshTimer=setInterval(()=>{
    if(document.hidden || !state.user) return;
    const nextSignature=currentGamesStructuralSignature();
    if(nextSignature!==state.gameRenderSignature){
      renderGames();
    }else{
      refreshVisibleGameClocks();
    }
    if(!$('adminTab')?.classList.contains('hidden')) renderAdminRoundStatus();
  },30000);
}

async function refreshLiveScoresSilently(){
  if(document.hidden || !state.user) return;
  const hasLiveGame=state.games.some(game=>gameStatusDisplay(game).key==="live");
  if(!hasLiveGame) return;
  try{
    // A sincronização da fonte é restrita ao administrador. Para os demais
    // participantes, o agendamento do Netlify atualiza o Supabase e o app apenas
    // relê os dados, evitando expor uma rota de escrita pública.
    if(isAdminUser()){
      const {data:{session}}=await sb.auth.getSession();
      if(session?.access_token){
        const response=await fetch("/.netlify/functions/sincronizar-jogos",{
          method:"POST",
          cache:"no-store",
          headers:{"Authorization":`Bearer ${session.access_token}`,"Accept":"application/json"}
        });
        const syncResult=await response.json().catch(()=>({}));
        if(response.ok) state.lastSyncReport=syncResult;
        else console.warn(syncResult.error||syncResult.message||"Falha na sincronização ao vivo");
      }
    }
    const {data,error}=await sb.from("jogos").select("*").order("rodada").order("inicio");
    if(error) throw error;
    if(Array.isArray(data)){
      state.games=data;
      renderSyncStatus();
      renderGames();
      renderRanking();
      renderMyTeam();
      renderStats();
      if(!$("adminTab")?.classList.contains("hidden")) renderAdminRoundStatus();
    }
  }catch(error){
    console.warn("Não foi possível atualizar os placares ao vivo silenciosamente.",error);
  }
}

function startLiveScoreRefresh(){
  if(liveScoreRefreshTimer) return;
  liveScoreRefreshTimer=setInterval(refreshLiveScoresSilently,2*60*1000);
}

async function initialize(session){
  state.user=session.user; await loadParticipant();
  const participantName=(state.participant.nome||"Participante").trim();
  $("headerUserName").textContent=participantName.split(/\s+/)[0];
  $("userMenuBtn").setAttribute("aria-label",`Perfil de ${participantName}. Abrir menu da conta`);
  $("userMenuBtn").setAttribute("title",participantName);
  show("loginBtn",false); show("headerUser",true);
  if(state.membership?.status && state.membership.status!=="approved"){
    renderMembershipStatus();
    return;
  }
  sessionStorage.removeItem("bolaoRegistrationIntent");
  await loadData();
  renderEditableProfile();
  applyFavoriteTeamIdentity();
  renderFavoriteTeamSelector();
  show("welcome",false); show("app",true); show("loginBtn",false); show("headerUser",true);
  const isAdmin=isAdminUser(); show("adminPanel",isAdmin); show("adminMenuShortcut",isAdmin);
  renderRounds(); renderGames(); renderRanking(); renderStats(); renderHome(); renderMyTeam(); startMatchClockRefresh(); startLiveScoreRefresh(); refreshLiveScoresSilently(); if(isAdmin){ renderAdminAttention(); renderAdminRoundStatus(); renderAdminQuickActions(); renderAdminParticipants(); renderAdminDiagnostic(); renderAdminExecutiveDashboard(); renderAdminAudit(); }
}


function animateStandingsPanel(panel, opening, duration=MOTION.duration.normal){
  if(!panel) return Promise.resolve();

  // Cancela animações anteriores e, principalmente, remove o efeito persistente
  // de `fill: forwards`. Esse efeito mantinha a altura antiga do primeiro nível
  // e recortava o painel "Desempenho recente" quando ele era aberto depois.
  panel.getAnimations?.().forEach(animation=>animation.cancel());

  if(prefersReducedMotion()){
    panel.hidden=!opening;
    panel.setAttribute("aria-hidden",String(!opening));
    panel.style.removeProperty("height");
    panel.style.removeProperty("overflow");
    panel.style.removeProperty("opacity");
    panel.style.removeProperty("transform");
    return Promise.resolve();
  }

  if(opening){
    panel.hidden=false;
    panel.setAttribute("aria-hidden","false");
  }

  const startHeight=opening?0:panel.getBoundingClientRect().height;
  const endHeight=opening?panel.scrollHeight:0;
  panel.style.overflow="hidden";

  const animation=panel.animate([
    {height:`${startHeight}px`,opacity:opening?0:1,transform:opening?"translateY(-6px)":"none"},
    {height:`${endHeight}px`,opacity:opening?1:0,transform:opening?"none":"translateY(-4px)"}
  ],{
    duration,
    easing:opening?MOTION.easing.enter:MOTION.easing.exit,
    fill:"forwards"
  });

  return animation.finished.catch(()=>{}).then(()=>{
    // WAAPI continua aplicando os keyframes após `finished` quando fill=forwards.
    // Cancelar aqui libera a altura para `auto`, permitindo expansões aninhadas.
    animation.cancel();
    panel.style.removeProperty("overflow");
    panel.style.removeProperty("height");
    panel.style.removeProperty("opacity");
    panel.style.removeProperty("transform");
    if(!opening){
      panel.hidden=true;
      panel.setAttribute("aria-hidden","true");
    }else{
      panel.hidden=false;
      panel.setAttribute("aria-hidden","false");
    }
  });
}

function resetStandingsHistory(card, animated=false){
  const historyButton=card?.querySelector(".standings-history-toggle");
  const historyPanel=card?.querySelector(".standings-history-panel");
  if(historyButton) historyButton.setAttribute("aria-expanded","false");
  card?.querySelector(".standings-history-level")?.classList.remove("is-history-open");
  if(historyPanel){
    if(animated) return animateStandingsPanel(historyPanel,false,MOTION.duration.fast);
    historyPanel.hidden=true;
    historyPanel.setAttribute("aria-hidden","true");
  }
  return Promise.resolve();
}

$("standingsMobileList")?.addEventListener("click",async event=>{
  const historyToggle=event.target.closest(".standings-history-toggle");
  if(historyToggle){
    const panel=historyToggle.nextElementSibling;
    const open=historyToggle.getAttribute("aria-expanded")!=="true";
    historyToggle.setAttribute("aria-expanded",String(open));
    historyToggle.closest(".standings-history-level")?.classList.toggle("is-history-open",open);
    await animateStandingsPanel(panel,open,MOTION.duration.normal);
    if(open) historyToggle.closest(".standings-mobile-card")?.scrollIntoView({behavior:prefersReducedMotion()?"auto":"smooth",block:"nearest"});
    return;
  }
  const gamesAction=event.target.closest("[data-standings-team-games]");
  if(gamesAction){
    const teamName=gamesAction.dataset.standingsTeamGames;
    const team=findTeam(teamName)||{name:teamName};
    const next=favoriteTeamGames(team).filter(game=>!isFinished(game)).sort((a,b)=>new Date(a.inicio)-new Date(b.inicio))[0];
    navigateTo("games");
    if(next && $("roundSelect")){ $("roundSelect").value=String(next.rodada); renderGames(); }
    return;
  }
  const button=event.target.closest(".standings-card-summary"); if(!button) return;
  const card=button.closest(".standings-mobile-card");
  const expandable=card.querySelector(".standings-card-expandable");
  const open=button.getAttribute("aria-expanded")!=="true";
  const others=[...$("standingsMobileList").querySelectorAll(".standings-mobile-card.is-expanded")].filter(other=>other!==card);
  for(const other of others){
    other.classList.remove("is-expanded");
    other.querySelector(".standings-card-summary")?.setAttribute("aria-expanded","false");
    await resetStandingsHistory(other,false);
    await animateStandingsPanel(other.querySelector(".standings-card-expandable"),false,MOTION.duration.fast);
  }
  button.setAttribute("aria-expanded",String(open));
  card.classList.toggle("is-expanded",open);
  if(open){
    await animateStandingsPanel(expandable,true,MOTION.duration.normal);
    setTimeout(()=>card.scrollIntoView({behavior:prefersReducedMotion()?"auto":"smooth",block:"nearest"}),40);
  }else{
    await resetStandingsHistory(card,true);
    await animateStandingsPanel(expandable,false,MOTION.duration.normal);
  }
});
$("rankingBody")?.addEventListener("click",event=>{
  const action=event.target.closest("[data-ranking-picks-key]");
  if(action) openRankingParticipantPicks(action.dataset.rankingPicksKey,action);
});
$("rankingPicksRoundSelect")?.addEventListener("change",renderRankingParticipantPicks);
$("rankingPicksRoundNumberStrip")?.addEventListener("click",event=>{
  const button=event.target.closest("[data-ranking-picks-round]");
  if(!button) return;
  $("rankingPicksRoundSelect").value=button.dataset.rankingPicksRound;
  renderRankingParticipantPicks();
});
$("rankingPicksPrevRound")?.addEventListener("click",()=>changeRankingPicksRound(-1));
$("rankingPicksNextRound")?.addEventListener("click",()=>changeRankingPicksRound(1));
$("rankingPicksCurrentRoundBtn")?.addEventListener("click",goToRankingPicksCurrentRound);
$("rankingPicksModalClose")?.addEventListener("click",closeRankingParticipantPicks);
$("rankingPicksModal")?.addEventListener("click",event=>{if(event.target===$("rankingPicksModal")) closeRankingParticipantPicks();});
$("roundHighlightsModalClose")?.addEventListener("click",closeRoundHighlights);
$("roundHighlightsModal")?.addEventListener("click",event=>{if(event.target===$("roundHighlightsModal")) closeRoundHighlights();});
$("loginBtn").onclick=login; $("heroLoginBtn").onclick=login; $("logoutBtn").onclick=logout; $("membershipLogoutBtn")?.addEventListener("click",logout); $("refreshBtn").onclick=refresh; $("refreshStandingsBtn").onclick=()=>loadStandings(true); $("syncGamesBtn").onclick=syncGames;
$("saveFavoriteTeamBtn").onclick=saveFavoriteTeam;
$("profileDataForm")?.addEventListener("submit",event=>{ event.preventDefault(); event.stopImmediatePropagation(); saveOwnProfile(event); });
$("saveProfileBtn")?.addEventListener("click",saveOwnProfile);
$("profilePhoneInput")?.addEventListener("input",event=>{ event.target.value=formatBrazilPhone(event.target.value); });
$("registrationForm")?.addEventListener("submit",event=>event.preventDefault());
$("registrationNameInput")?.addEventListener("input",()=>{ persistRegistrationDraft(); validateRegistrationDraft(collectRegistrationDraft()); });
$("registrationPhoneInput")?.addEventListener("input",event=>{
  event.target.value=formatBrazilPhone(event.target.value);
  persistRegistrationDraft();
  validateRegistrationDraft(collectRegistrationDraft());
});
$("clearRegistrationTeamBtn")?.addEventListener("click",()=>{
  state.selectedRegistrationTeam=null;
  $("registrationFavoriteTeamGrid")?.querySelectorAll(".favorite-team-option").forEach(item=>{
    item.classList.remove("selected");
    item.setAttribute("aria-checked","false");
  });
  persistRegistrationDraft();
  if($("registrationFormStatus")) $("registrationFormStatus").textContent="Você poderá escolher um time depois em Meu Perfil.";
});
$("copyRegistrationLinkBtn")?.addEventListener("click",copyRegistrationLink);
$("adminRefreshBtn").onclick=refreshAllAdminData;
$("adminAttentionAction").onclick=handleAdminAction;
$("adminQuickActions")?.addEventListener("click",handleAdminQuickAction);
$("openParticipantManagerBtn")?.addEventListener("click",openParticipantManager);
$("adminParticipantManagerClose")?.addEventListener("click",closeParticipantManager);
$("cancelParticipantBtn")?.addEventListener("click",closeParticipantManager);
$("adminParticipantForm")?.addEventListener("submit",saveAuthorizedParticipant);
$("adminParticipantLimitForm")?.addEventListener("submit",saveParticipantLimit);
$("adminParticipantsList")?.addEventListener("click",event=>{
  const whatsapp=event.target.closest("[data-participant-whatsapp]");
  if(whatsapp){ openParticipantWhatsApp(whatsapp.dataset.participantWhatsapp); return; }
  const decision=event.target.closest("[data-membership-decision]");
  if(decision){ decideMembership(decision.dataset.participantId,decision.dataset.membershipDecision); return; }
  const deleteButton=event.target.closest("[data-participant-delete]");
  if(deleteButton){ deleteParticipantPermanently(deleteButton.dataset.participantDelete,deleteButton.dataset.participantName); return; }
  const button=event.target.closest("[data-participant-active]");
  if(button) toggleAuthorizedParticipant(button.dataset.participantId,button.dataset.participantActive==="true");
});
$("adminParticipantManagerModal")?.addEventListener("click",event=>{if(event.target===$("adminParticipantManagerModal")) closeParticipantManager();});
$("adminWhatsAppModal")?.addEventListener("click",event=>{if(event.target===$("adminWhatsAppModal")) closeParticipantWhatsApp();});
$("adminWhatsAppClose")?.addEventListener("click",closeParticipantWhatsApp);
$("adminWhatsAppCancel")?.addEventListener("click",closeParticipantWhatsApp);
$("adminWhatsAppSend")?.addEventListener("click",sendParticipantWhatsApp);
$("adminWhatsAppTemplates")?.addEventListener("click",event=>{const button=event.target.closest("[data-whatsapp-template]");if(button) selectWhatsAppTemplate(button.dataset.whatsappTemplate);});
$("adminAttentionContent").onclick=event=>{
  const card=event.target.closest("[data-admin-participant]");
  if(card) openAdminParticipantDetail(card.dataset.adminParticipant);
};
$("adminAttentionCard")?.addEventListener("click",event=>{
  const filter=event.target.closest("[data-admin-pending-filter]");
  if(!filter) return;
  adminPendingFilter=filter.dataset.adminPendingFilter || "all";
  renderAdminAttention();
});
$("adminParticipantModalClose").onclick=closeAdminParticipantDetail;
$("adminParticipantModal").onclick=event=>{ if(event.target===$("adminParticipantModal")) closeAdminParticipantDetail(); };
document.addEventListener("keydown",event=>{
  if(event.key!=="Escape") return;
  if(!$("roundHighlightsModal")?.classList.contains("hidden")) closeRoundHighlights();
  else if(!$("rankingPicksModal")?.classList.contains("hidden")) closeRankingParticipantPicks();
  else if(!$("adminParticipantModal")?.classList.contains("hidden")) closeAdminParticipantDetail();
});
$("clearFavoriteTeamBtn").onclick=()=>{
  state.selectedFavoriteTeam=null;
  $("favoriteTeamGrid")?.querySelectorAll(".favorite-team-option").forEach(item=>{item.classList.remove("selected");item.setAttribute("aria-checked","false");});
  $("favoriteTeamStatus").textContent="Nenhum time selecionado. Toque em “Salvar escolha” para confirmar.";
};
$("userMenuBtn").onclick=()=>{ const open=$("userMenu").classList.contains("hidden"); show("userMenu",open); $("userMenuBtn").setAttribute("aria-expanded",String(open)); };
const closeUserMenu=()=>{ show("userMenu",false); $("userMenuBtn").setAttribute("aria-expanded","false"); };
$("profileShortcut").onclick=()=>{ closeUserMenu(); navigateTo("profile"); };
$("standingsShortcut").onclick=()=>{ closeUserMenu(); navigateTo("standings"); };
$("rulesShortcut").onclick=()=>{ closeUserMenu(); navigateTo("rules"); };
$("adminMenuShortcut").onclick=()=>{ closeUserMenu(); navigateTo("admin"); };
document.addEventListener("click",event=>{
  const tab=event.target.closest?.("[data-stats-achievement-tab]");
  if(tab){
    const target=tab.dataset.statsAchievementTab;
    document.querySelectorAll("[data-stats-achievement-tab]").forEach(button=>{
      const active=button.dataset.statsAchievementTab===target;
      button.classList.toggle("active",active);
      button.setAttribute("aria-selected",String(active));
    });
    document.querySelectorAll("[data-stats-achievement-panel]").forEach(panel=>{
      const active=panel.dataset.statsAchievementPanel===target;
      panel.classList.toggle("active",active);
      panel.hidden=!active;
    });
  }
});

document.addEventListener("click",event=>{ if(!$("headerUser")?.contains(event.target)){ show("userMenu",false); $("userMenuBtn")?.setAttribute("aria-expanded","false"); } });
$("homeTab")?.addEventListener("click",async event=>{
  const target=event.target.closest("[data-home-action]");
  if(!target) return;
  const action=target.dataset.homeAction;
  if(action==="round-highlights"){ openRoundHighlights(target.dataset.roundHighlightsRound,target); return; }
  if(action==="refresh"){ target.disabled=true; try{ await refresh(); } finally{ target.disabled=false; } return; }
  if(action==="standings-favorite"){
    navigateTo("standings");
    setTimeout(()=>focusFavoriteTeamInStandings(),140);
    return;
  }
  navigateTo(action);
});
$("homeTab")?.addEventListener("keydown",event=>{
  if(event.key!=="Enter" && event.key!==" ") return;
  const target=event.target.closest('.home-navigable-card[data-home-action]');
  if(!target) return;
  event.preventDefault();
  target.click();
});

$("myTeamTab")?.addEventListener("click",event=>{
  const target=event.target.closest("[data-my-team-action]");
  if(!target) return;
  const action=target.dataset.myTeamAction;
  if(action==="standings"){ navigateTo("standings"); setTimeout(()=>focusFavoriteTeamInStandings(),140); return; }
  navigateTo(action);
});
$("myTeamTab")?.addEventListener("keydown",event=>{
  if(event.key!=="Enter" && event.key!==" ") return;
  const target=event.target.closest('[role="button"][data-my-team-action]');
  if(!target) return;
  event.preventDefault();
  target.click();
});
setupAdminQuickNavigation();
setupAdminCollapsibleCards();
setupTabs();
prepareRegistrationForm();
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden && !$("adminTab")?.classList.contains("hidden") && Date.now()-adminLastBackgroundRefresh>30000) refreshAdminSilently("ao retornar à aba");
});
try{ const {data:{session}}=await sb.auth.getSession(); if(session) await initialize(session); }
catch(err){message(err.message||"Não foi possível iniciar o aplicativo.",true);}
finally{show("loading",false);}
sb.auth.onAuthStateChange(async (_event,session)=>{ if(session&&!state.user){try{await initialize(session);}catch(err){message(err.message||"Falha de autenticação.",true);}} });

let gamesSpacingFrame=0;
function scheduleGamesBottomSpacing(){
  if(gamesSpacingFrame) cancelAnimationFrame(gamesSpacingFrame);
  gamesSpacingFrame=requestAnimationFrame(()=>{
    gamesSpacingFrame=0;
    updateGamesBottomSpacing();
  });
}
window.addEventListener("resize",scheduleGamesBottomSpacing,{passive:true});
window.addEventListener("orientationchange",()=>setTimeout(scheduleGamesBottomSpacing,120),{passive:true});
