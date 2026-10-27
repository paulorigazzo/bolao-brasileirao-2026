const TYPE_LABELS={'12h':'Lembrete de 12h','2h':'Lembrete de 2h',summary:'Resumo da rodada'};
const STATUS_LABELS={pending:'Aguardando',processing:'Em processamento',sent:'Aceito pelo serviço',skipped:'Não enviado',failed:'Falha',mixed:'Situação parcial'};
const stamp=value=>{
  const time=value?Date.parse(value):NaN;
  return Number.isFinite(time)?new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(time):'—';
};

export function adminNotificationsContent(data,escapeHtml){
  const e=escapeHtml,next=data.nextReminder;
  const rows=data.rows.map(row=>`<details class="admin-notification-row">
    <summary><span class="admin-notification-time">${e(stamp(row.lastUpdate))}<small>Rodada ${Number(row.round)}</small></span><strong>${e(row.participant)}</strong><span>${e(TYPE_LABELS[row.type]||'Aviso')}</span><span class="admin-notification-status status-${Object.hasOwn(STATUS_LABELS,row.status)?row.status:'mixed'}">${e(STATUS_LABELS[row.status]||STATUS_LABELS.mixed)}</span></summary>
    <div class="admin-notification-details"><p>${Number(row.deviceCount)} ${row.deviceCount===1?'aparelho':'aparelhos'} · ${Number(row.attempts)} ${row.attempts===1?'tentativa registrada':'tentativas registradas'}</p>
    <dl>${Object.entries(row.counts).filter(([,count])=>count>0).map(([status,count])=>`<div><dt>${e(STATUS_LABELS[status]||'Outro estado')}</dt><dd>${Number(count)}</dd></div>`).join('')}</dl>
    ${row.nextAttempt?`<small>Agendamento registrado: ${e(stamp(row.nextAttempt))}. Sujeito à validade do aviso.</small>`:''}</div></details>`).join('');
  return `<div class="admin-notification-metrics" aria-label="Resumo da temporada ${Number(data.season)}"><div><strong>${Number(data.summary.accepted)}</strong><span>Aceitos pelo serviço</span></div><div><strong>${Number(data.summary.waiting)}</strong><span title="Aguardando ou em processamento">Em andamento</span></div><div><strong>${Number(data.summary.failed)}</strong><span>Falhas</span></div></div>
    <p class="admin-notification-caption">Contagens da temporada por aparelho e aviso, independentemente dos filtros.</p>
    <div class="admin-notification-next"><strong>${next?(next.inWindow?'Janela atual de lembrete':'Próximo lembrete previsto'):'Sem próximo lembrete previsto'}</strong>${next?`<span>Rodada ${Number(next.round)} · ${e(TYPE_LABELS[next.type])} · ${e(stamp(next.scheduledAt))}</span><small>Somente se houver palpites pendentes e abertos.</small>`:''}</div>
    <p class="admin-notification-caption">Última movimentação registrada: ${e(stamp(data.lastMovement))}. Horários de Brasília.</p>
    <div class="admin-notification-list">${rows||'<p class="muted-note">Nenhum processamento encontrado com estes filtros.</p>'}</div>
    <nav class="admin-notification-pages" aria-label="Páginas do acompanhamento"><button class="secondary" type="button" data-admin-notifications-page="${Number(data.page)-1}" ${data.page<=1?'disabled':''}>Anterior</button><span>Página ${Number(data.page)} de ${Number(data.pages)} · ${Number(data.total)} registros</span><button class="secondary" type="button" data-admin-notifications-page="${Number(data.page)+1}" ${data.page>=data.pages?'disabled':''}>Próxima</button></nav>
    <details class="admin-notification-baseline"><summary>Ativação e baseline</summary><p>${data.activationAt?`Ativação registrada em ${e(stamp(data.activationAt))}.`:'Ainda não há ativação registrada.'} ${Number(data.baselineRounds)} rodadas antigas protegidas contra resumos retroativos.</p><small>Este registro não é uma verificação em tempo real da configuração de ativação.</small></details>`;
}

export function createAdminNotificationsController({document,isAdmin,userId,getToken,escapeHtml,fetchImpl=fetch}){
  const $=id=>document.getElementById(id),modal=$('adminNotificationsModal');
  let requestId=0,controller=null,returnFocus=null,page=1;
  const current=(id,user)=>id===requestId&&!modal.classList.contains('hidden')&&isAdmin()&&userId()===user;
  function close({restoreFocus=true}={}){
    requestId++;controller?.abort();controller=null;
    modal.classList.add('hidden');$('adminNotificationsContent').innerHTML='';$('adminNotificationsStatus').textContent='';
    if(!document.querySelector('.modal-backdrop:not(.hidden)'))document.body.classList.remove('modal-open');
    if(restoreFocus&&returnFocus?.isConnected&&isAdmin())returnFocus.focus();
    returnFocus=null;
  }
  async function refresh(){
    if(!isAdmin()||modal.classList.contains('hidden'))return close({restoreFocus:false});
    controller?.abort();controller=new AbortController();
    const activeController=controller,id=++requestId,user=userId();
    const filters={round:$('adminNotificationsRound').value,type:$('adminNotificationsType').value,status:$('adminNotificationsState').value,page};
    $('adminNotificationsRefresh').disabled=true;$('adminNotificationsContent').innerHTML='';$('adminNotificationsStatus').textContent='Consultando registros…';
    const timer=setTimeout(()=>activeController.abort(),20000);
    try{
      const token=await getToken();if(!current(id,user))return;
      const response=await fetchImpl(`/.netlify/functions/acompanhamento-notificacoes?${new URLSearchParams(filters)}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},cache:'no-store',signal:activeController.signal});
      const data=await response.json();if(!current(id,user))return;
      if(!response.ok||data.ok!==true)throw new Error('Consulta indisponível.');
      page=data.page;
      const rounds=[...new Set([...data.rounds,...(filters.round==='all'?[]:[Number(filters.round)])])].filter(round=>Number.isInteger(round)&&round>=1&&round<=38).sort((a,b)=>b-a);
      $('adminNotificationsRound').innerHTML='<option value="all">Todas</option>'+rounds.map(round=>`<option value="${round}">Rodada ${round}</option>`).join('');
      $('adminNotificationsRound').value=filters.round;
      $('adminNotificationsContent').innerHTML=adminNotificationsContent(data,escapeHtml);
      $('adminNotificationsStatus').textContent=`Consulta atualizada em ${stamp(data.queriedAt)}.`;
    }catch(_){
      if(current(id,user))$('adminNotificationsStatus').textContent='Não foi possível consultar as notificações. Tente atualizar novamente.';
    }finally{
      clearTimeout(timer);
      if(id===requestId){$('adminNotificationsRefresh').disabled=false;if(!isAdmin()||userId()!==user)close({restoreFocus:false});}
    }
  }
  function open(trigger){
    if(!isAdmin())return;
    returnFocus=trigger||document.activeElement;page=1;
    for(const id of ['adminNotificationsRound','adminNotificationsType','adminNotificationsState'])$(id).value='all';
    modal.classList.remove('hidden');document.body.classList.add('modal-open');$('adminNotificationsClose').focus();refresh();
  }
  $('adminNotificationsClose').addEventListener('click',()=>close());
  $('adminNotificationsRefresh').addEventListener('click',()=>refresh());
  for(const id of ['adminNotificationsRound','adminNotificationsType','adminNotificationsState'])$(id).addEventListener('change',()=>{page=1;refresh();});
  modal.addEventListener('click',event=>{if(event.target===modal)close();});
  $('adminNotificationsContent').addEventListener('click',event=>{
    const target=event.target.closest('[data-admin-notifications-page]');
    if(target&&!target.disabled){page=Number(target.dataset.adminNotificationsPage);refresh();}
  });
  document.addEventListener('keydown',event=>{
    if(modal.classList.contains('hidden'))return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}
    if(event.key!=='Tab')return;
    const focusable=[...modal.querySelectorAll('button:not(:disabled),select,summary')].filter(el=>el.getClientRects().length);
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  });
  return {open,close,refresh};
}
