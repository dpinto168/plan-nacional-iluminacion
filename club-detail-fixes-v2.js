(function(){
  'use strict';
  if(window.__PNI_CLUB_DETAIL_FIXES_V2__) return;
  window.__PNI_CLUB_DETAIL_FIXES_V2__=true;
  const PANEL='pniClubDetailPanel', BACK='pniClubDetailBackdrop';

  function panel(){return document.getElementById(PANEL)}
  function backdrop(){return document.getElementById(BACK)}

  function hideRegistry(){
    const p=panel(); if(!p) return;
    p.querySelector('[data-pni-tab="registry"]')?.remove();
    p.querySelector('[data-pni-section="registry"]')?.remove();
  }

  function hardClose(e){
    if(e){e.preventDefault?.();e.stopPropagation?.();e.stopImmediatePropagation?.();}
    const p=panel();
    if(p){
      p.dataset.pniClosing='1';
      p.classList.remove('is-open');
      p.setAttribute('aria-hidden','true');
      p.style.setProperty('transform','translateX(105%)','important');
      p.style.setProperty('visibility','hidden','important');
      p.style.setProperty('pointer-events','none','important');
    }
    const b=backdrop();
    if(b){
      b.classList.remove('is-open');
      b.style.setProperty('opacity','0','important');
      b.style.setProperty('visibility','hidden','important');
      b.style.setProperty('pointer-events','none','important');
    }
    document.body.classList.remove('pni-club-panel-open');
  }
  window.__pniCloseClubPanel=hardClose;

  function restoreOpenState(){
    const p=panel(); if(!p||!p.classList.contains('is-open')) return;
    p.dataset.pniClosing='0';
    p.style.removeProperty('transform');
    p.style.removeProperty('visibility');
    p.style.removeProperty('pointer-events');
    const b=backdrop();
    if(b){b.style.removeProperty('opacity');b.style.removeProperty('visibility');b.style.removeProperty('pointer-events');}
    hideRegistry();
    const x=p.querySelector('.pni-close');
    if(x){
      x.setAttribute('title','Cerrar ficha');
      x.setAttribute('aria-label','Cerrar ficha');
      x.style.setProperty('pointer-events','auto','important');
      x.style.setProperty('z-index','50','important');
    }
  }

  function captureClose(e){
    if(e.target?.closest?.('.pni-close')) return hardClose(e);
    const p=panel();
    if(!p?.classList.contains('is-open')) return;
    if(!p.contains(e.target) && !e.target?.closest?.('.pni-club-clickable')) hardClose(e);
  }

  document.addEventListener('pointerdown',captureClose,true);
  document.addEventListener('click',captureClose,true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape') hardClose(e)},true);

  const obs=new MutationObserver(muts=>{
    for(const m of muts){
      if(m.type==='attributes' && m.target?.id===PANEL){restoreOpenState();return;}
    }
    hideRegistry();
    restoreOpenState();
  });

  function init(){
    hideRegistry();restoreOpenState();
    obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
