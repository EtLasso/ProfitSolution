(function(){
  const PAIRS = ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCHF','NZDUSD','USDCAD','EURJPY'];
  const FFA_URL = 'https://www.freeforexapi.com/api/live?pairs=' + PAIRS.join(',');
  const last = {};
  // neutrale das Demo-Ticker-Interval, falls vorhanden
  if (typeof window.fillTracks === 'function') { window.fillTracks = ()=>{}; }

  async function poll(){
    try{
      const r = await fetch(FFA_URL, { cache:'no-cache' });
      const j = await r.json();
      const rates = j.rates || {};
      updateTicker(rates);
      if (rates.EURUSD && rates.EURUSD.rate) feedChart(rates.EURUSD.rate);
      addBadge();
      setTimeout(poll, 3000);
    }catch(e){
      console.warn('FreeForexAPI fehlgeschlagen, Fallback EUR/USD…', e);
      // Sanfter Fallback (minütlich) für EUR/USD
      try{
        const r2 = await fetch('https://api.exchangerate.host/latest?base=EUR&symbols=USD', { cache:'no-cache' });
        const j2 = await r2.json();
        const rate = j2?.rates?.USD;
        if (rate) feedChart(rate);
      }catch(_e){}
      setTimeout(poll, 10000);
    }
  }

  function updateTicker(rates){
    const A = document.getElementById('tickerA');
    const B = document.getElementById('tickerB');
    const items = [];
    PAIRS.forEach(p=>{
      const rate = rates[p]?.rate;
      if (!rate) return;
      const prev = last[p] ?? rate;
      const chg = ((rate - prev)/prev) * 100;
      last[p] = rate;
      items.push(
        `<div class="pair">
           <span class="name">${p.slice(0,3)}/${p.slice(3)}</span>
           <span class="price">${format(rate)}</span>
           <span class="chg ${chg>=0?'up':'down'}">${chg>=0?'+':'−'}${Math.abs(chg).toFixed(2)}%</span>
         </div>`
      );
    });
    if (A) A.innerHTML = items.join('');
    if (B) B.innerHTML = items.join('');
  }
  function format(v){ return (v>10 ? v.toFixed(2) : v.toFixed(4)); }

  // ——— EUR/USD Live-Chart (zeichnet in #mainChart) ———
  const series=[]; const MAX=300;
  function feedChart(rate){
    series.push(rate); if(series.length>MAX) series.shift();
    drawChart();
  }
  function drawChart(){
    const c = document.getElementById('mainChart'); if(!c) return;
    const dpr = Math.max(1, window.devicePixelRatio||1);
    const w = c.clientWidth, h = 280; const ctx = c.getContext('2d');
    c.width = w*dpr; c.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    if(series.length<2){ ctx.fillStyle='#86a8ff'; ctx.font='600 12px Inter,sans-serif'; ctx.fillText('Warte auf Live-Daten …', 40, 40); return; }
    const min = Math.min(...series), max = Math.max(...series);
    const x = i => 40 + i*(w-60)/(series.length-1);
    const y = v => 20 + (1-((v-min)/(max-min||1)))*(h-40);
    // grid
    ctx.strokeStyle='#15213a'; ctx.lineWidth=1;
    for(let i=0;i<=5;i++){ const yy = 20+i*(h-40)/5; ctx.beginPath(); ctx.moveTo(40,yy); ctx.lineTo(w-10,yy); ctx.stroke(); }
    // area
    ctx.beginPath(); ctx.moveTo(x(0),y(series[0])); for(let i=1;i<series.length;i++) ctx.lineTo(x(i),y(series[i]));
    const grd=ctx.createLinearGradient(0,0,0,h); grd.addColorStop(0,'rgba(0,229,255,.25)'); grd.addColorStop(1,'rgba(124,77,255,.05)');
    ctx.lineTo(x(series.length-1),h-20); ctx.lineTo(x(0),h-20); ctx.closePath(); ctx.fillStyle=grd; ctx.fill();
    // line
    ctx.beginPath(); ctx.moveTo(x(0),y(series[0])); for(let i=1;i<series.length;i++) ctx.lineTo(x(i),y(series[i]));
    ctx.lineWidth=2; ctx.strokeStyle='#00e5ff'; ctx.shadowColor='#00e5ff66'; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0;
    ctx.fillStyle='#86a8ff'; ctx.font='600 12px Inter, sans-serif';
    ctx.fillText('EUR/USD Live', 40, 14);
    ctx.textAlign='right'; ctx.fillText('Quelle: FreeForexAPI', w-12, h-8);
  }

  // Badge gemäß Nutzungsbedingungen einfügen
  function addBadge(){
    const wrap = document.querySelector('.ticker-wrap');
    if(!wrap || document.getElementById('freeforex-badge')) return;
    const a = document.createElement('a'); a.href='https://www.freeforexapi.com'; a.target='_blank'; a.rel='noopener'; a.id='freeforex-badge';
    const img = new Image(); img.src='https://www.freeforexapi.com/Images/link.png'; img.alt='Free Forex API'; img.height=16;
    a.appendChild(img);
    const holder=document.createElement('div'); holder.style.marginTop='6px'; holder.appendChild(a);
    wrap.appendChild(holder);
  }

  poll();
})();
