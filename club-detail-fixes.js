(function(){
  'use strict';
  if (window.__PNI_CLUB_DETAIL_FIXES_LOADED__) return;
  window.__PNI_CLUB_DETAIL_FIXES_LOADED__ = true;

  const PANEL_ID='pniClubDetailPanel';
  const BACKDROP_ID='pniClubDetailBackdrop';

  function closePanel(){
    const panel=document.getElementById(PANEL_ID);
    if(panel){
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden','true');
    }
    const backdrop=document.getElementById(BACKDROP_ID);
    if(backdrop) backdrop.classList.remove('is-open');
    document.body.classList.remove('pni-club-panel-open');
  }

  function cleanPanel(){
    const panel=document.getElementById(PANEL_ID);
    if(!panel) return;

    // "Registro" no forma parte de la ficha territorial/comunitaria.
    panel.querySelector('[data-pni-tab="registry"]')?.remove();
    panel.querySelector('[data-pni-section="registry"]')?.remove();

    // Refuerzo visual y funcional de la X de cierre.
    const close=panel.querySelector('.pni-close');
    if(close){
      close.style.position='relative';
      close.style.zIndex='20';
      close.style.pointerEvents='auto';
      close.setAttribute('title','Cerrar ficha');
    }
  }

  // Cierre robusto desde la X, aun si otros listeners del tablero interfieren.
  document.addEventListener('click',function(e){
    const close=e.target.closest?.('.pni-close');
    if(close){
      e.preventDefault();
      e.stopPropagation();
      closePanel();
      return;
    }

    const panel=document.getElementById(PANEL_ID);
    if(!panel?.classList.contains('is-open')) return;

    // En escritorio también permite cerrar haciendo clic fuera de la ficha.
    if(!panel.contains(e.target) && !e.target.closest?.('.pni-club-clickable')){
      closePanel();
    }
  },true);

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape') closePanel();
  },true);

  const init=()=>{
    cleanPanel();
    const observer=new MutationObserver(cleanPanel);
    observer.observe(document.body,{subtree:true,childList:true});
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
