// ProfitSolution v1 progressive enhancements (CLI)
document.documentElement.classList.add('js');

// 100dvh Fix (iOS/Android)
const setDVH = () => document.documentElement.style.setProperty('--dvh', (window.innerHeight*0.01) + 'px');
setDVH(); addEventListener('resize', setDVH); addEventListener('orientationchange', setDVH);

// Scroll-Lock Toggle für beliebige Trigger mit data-scroll-lock-toggle
document.querySelectorAll('[data-scroll-lock-toggle]').forEach(btn=>{
  btn.addEventListener('click',()=>document.documentElement.classList.toggle('no-scroll'));
});

// Fokusfalle fürs #signals Modal (falls vorhanden)
(() => {
  const modal = document.getElementById('signals');
  if (!modal) return;
  const sel = 'a[href],button,textarea,input,select,[tabindex]:not([tabindex="-1"])';
  modal.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const nodes=[...modal.querySelectorAll(sel)].filter(el=>!el.disabled);
    if(!nodes.length)return;
    const first=nodes[0], last=nodes[nodes.length-1];
    if(e.shiftKey && document.activeElement===first){ last.focus(); e.preventDefault(); }
    else if(!e.shiftKey && document.activeElement===last){ first.focus(); e.preventDefault(); }
  });
})();
