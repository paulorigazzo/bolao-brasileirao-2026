/**
 * Bolão Brasileirão 2026 — Motion Design System v6.0.4
 * Fonte única de durações, curvas e preferências de movimento.
 */
export const MOTION = Object.freeze({
  duration: Object.freeze({
    instant: 80,
    fast: 160,
    normal: 240,
    slow: 340
  }),
  easing: Object.freeze({
    standard: "cubic-bezier(.2, 0, 0, 1)",
    enter: "cubic-bezier(0, 0, .2, 1)",
    exit: "cubic-bezier(.4, 0, 1, 1)",
    emphasized: "cubic-bezier(.2, .8, .2, 1)"
  }),
  distance: Object.freeze({
    tab: 8,
    subtle: 4
  })
});

export function prefersReducedMotion(){
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function installMotionTokens(){
  const root=document.documentElement;
  root.style.setProperty("--motion-instant",`${MOTION.duration.instant}ms`);
  root.style.setProperty("--motion-fast",`${MOTION.duration.fast}ms`);
  root.style.setProperty("--motion-normal",`${MOTION.duration.normal}ms`);
  root.style.setProperty("--motion-slow",`${MOTION.duration.slow}ms`);
  root.style.setProperty("--motion-standard",MOTION.easing.standard);
  root.style.setProperty("--motion-enter",MOTION.easing.enter);
  root.style.setProperty("--motion-exit",MOTION.easing.exit);
  root.style.setProperty("--motion-emphasized",MOTION.easing.emphasized);
  root.style.setProperty("--motion-tab-distance",`${MOTION.distance.tab}px`);
  root.classList.toggle("reduce-motion",prefersReducedMotion());

  const media=window.matchMedia?.("(prefers-reduced-motion: reduce)");
  media?.addEventListener?.("change",event=>root.classList.toggle("reduce-motion",event.matches));
}

export function animateTabEntry(element){
  if(!element || prefersReducedMotion() || !element.animate) return;
  element.getAnimations?.().forEach(animation=>{
    if(animation.id==="tab-entry") animation.cancel();
  });
  const animation=element.animate([
    {opacity:0,transform:`translateY(${MOTION.distance.tab}px)`},
    {opacity:1,transform:"translateY(0)"}
  ],{
    duration:MOTION.duration.normal,
    easing:MOTION.easing.enter,
    fill:"both"
  });
  animation.id="tab-entry";
}


/** Instala microinterações padronizadas em componentes atuais e futuros. */
export function installMotionInteractions(){
  const interactiveSelector='button, [role="button"], .chip, .filter-chip, .premium-feature-card, .premium-match-card, .standings-mobile-card';

  document.addEventListener('pointerdown',event=>{
    if(!(event.target instanceof Element)) return;
    const target=event.target.closest(interactiveSelector);
    if(!target || target.matches(':disabled') || target.closest('[aria-disabled="true"]')) return;
    target.classList.add('motion-pressed');
    if(target.matches('button, [role="button"], .chip, .filter-chip')){
      const rect=target.getBoundingClientRect();
      const ripple=document.createElement('span');
      ripple.className='motion-ripple';
      ripple.style.left=`${event.clientX-rect.left}px`;
      ripple.style.top=`${event.clientY-rect.top}px`;
      target.appendChild(ripple);
      ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
    }
  },{passive:true});

  const release=event=>{
    if(!(event.target instanceof Element)) return;
    event.target.closest(interactiveSelector)?.classList.remove('motion-pressed');
  };
  document.addEventListener('pointerup',release,{passive:true});
  document.addEventListener('pointercancel',release,{passive:true});
  document.addEventListener('pointerleave',release,{passive:true,capture:true});

  const markFavoriteEntrances=root=>{
    root.querySelectorAll?.('.is-favorite-team-match:not(.motion-favorite-seen), .is-favorite-standing:not(.motion-favorite-seen), .favorite-home-card:not(.motion-favorite-seen)').forEach(element=>{
      element.classList.add('motion-favorite-seen','motion-favorite-intro');
      element.addEventListener('animationend',()=>element.classList.remove('motion-favorite-intro'),{once:true});
    });
  };
  markFavoriteEntrances(document);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
    if(node.nodeType===1){ markFavoriteEntrances(node); if(node.matches?.('.is-favorite-team-match,.is-favorite-standing,.favorite-home-card')) markFavoriteEntrances(node.parentElement||document); }
  }))).observe(document.body,{childList:true,subtree:true});
}


/** Dicas contextuais exibidas uma única vez por aba. */
export function installFirstVisitTips(){
  const tips={
    home:"Toque no seu time para abrir a classificação.",
    standings:"Toque em um clube para ver estatísticas e desempenho recente.",
    games:"As partidas do seu time aparecem destacadas.",
    ranking:"Acompanhe sua posição e a evolução dos participantes.",
    stats:"Veja um resumo do seu desempenho no bolão."
  };
  let hideTimer=null;
  const showTip=tabName=>{
    const message=tips[tabName];
    if(!message) return;
    const key=`bolao-tip-v604-${tabName}`;
    if(localStorage.getItem(key)==="1") return;
    localStorage.setItem(key,"1");
    let tip=document.getElementById("firstVisitTip");
    if(!tip){
      tip=document.createElement("div");
      tip.id="firstVisitTip";
      tip.className="first-visit-tip";
      tip.setAttribute("role","status");
      tip.setAttribute("aria-live","polite");
      tip.innerHTML='<span class="first-visit-tip-icon" aria-hidden="true">💡</span><span class="first-visit-tip-text"></span><button class="first-visit-tip-close" type="button" aria-label="Fechar dica">×</button>';
      document.body.appendChild(tip);
      tip.querySelector("button").addEventListener("click",()=>tip.classList.remove("is-visible"));
    }
    tip.querySelector(".first-visit-tip-text").textContent=message;
    requestAnimationFrame(()=>tip.classList.add("is-visible"));
    clearTimeout(hideTimer);
    hideTimer=setTimeout(()=>tip.classList.remove("is-visible"),5200);
  };
  window.addEventListener("bolao:tabchange",event=>showTip(event.detail?.tabName));
  setTimeout(()=>showTip("home"),900);
}
