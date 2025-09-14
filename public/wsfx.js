(function(){
  // --- Konfiguration ---
  const TOKEN = (window.EODHD_TOKEN || 'demo'); // Demo-Key unterstützt u.a. EURUSD
  const SYMBOLS = ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCHF','NZDUSD','USDCAD','EURJPY'];
  const WSS = `wss://ws.eodhistoricaldata.com/ws/forex?api_token=${encodeURIComponent(TOKEN)}`;
  const FALLBACK = 'https://www.freeforexapi.com/api/live?pairs=' + SYMBOLS.join(',');

  // DOM-Ziele
  const cMain = document.getElementById('mainChart');
  const A = document.getElementById('tickerA');
  const B = document.getElementById('tickerB');

  // Chart-Serien
  const series=[]; const MAX=300;
  let lastMid = null;
  const last = {}; // zuletzt gesehene Kurse je Symbol

  // -------- WebSocket ----------
  let ws, retryTmr, alive=false;

  function connect(){
    try{
      ws = new WebSocket(WSS);
      ws.onopen = () => {
        alive=true;
        ws.send(JSON.stringify({action:'subscribe', symbols: SYMBOLS.join(',')}));
      };
      ws.onmessage = (ev) => {
        try{
          const msg = JSON.parse(ev.data);
          if(!msg || !msg.s) return;
          // FX-Message-Schema: { s: "EURUSD", a: ask, b: bid, dc, dd, t } (lt. Doku)
          const mid = (Number(msg.a)+Number(msg.b))/2;
          if (Number.isFinite(mid)) {
            last[msg.s] = mid;
            if (msg.s === 'EURUSD') { lastMid = mid; feedChart(mid); }
            renderTicker();
          }
        }catch(_){}
      };
      ws.onerror = () => { try{ ws.close(); }catch(_){} };
      ws.onclose = () => { alive=false; retry(); };
      // Falls in 4s nichts kommt → Fallback starten
      setTimeout(()=>{ if(!alive) startFallback(); }, 4000);
    }catch(e){ startFallback(); }
  }
  function retry(){
    clearTimeout(retryTmr);
    retryTmr = setTimeout(connect, 2500);
  }

  // -------- Fallback (HTTP Poll) ----------
  async function startFallback(){
    // Badge-Pflicht einhalten, wenn FreeForexAPI verwendet wird
    addFFA_Badge();
    (async function poll(){
      try{
        const r = await fetch(FALLBACK, {cache:'no-cache'}); const j = await r.json();
        const rates = j.rates || {};
        SYMBOLS.forEach(sym=>{
          const v = rates[sym]?.rate; if(Number.isFinite(v)) last[sym]=v;
        });
        if (Number.isFinite(rates.EURUSD?.rate)) feedChart(rates.EURUSD.rate);
        renderTicker();
        setTimeout(poll, 3000);
      }catch(_e){ setTimeout(poll, 8000); }
    })();
  }

  // -------- Ticker UI ----------
  function renderTicker(){
    const items = SYMBOLS.map(p=>{
      const v = last[p]; if(!Number.isFinite(v)) return '';
      const prev = Number(this?.['_prev_'+p] ?? v);
      const chg = ((v - prev) / prev) * 100;
      this['_prev_'+p] = v;
      return `<div class="pair">
        <span class="name">${p.slice(0,3)}/${p.slice(3)}</span>
        <span class="price">${format(v)}</span>
        <span class="chg ${chg>=0?'up':'down'}">${chg>=0?'+':'−'}${Math.abs(chg).toFixed(2)}%</span>
      </div>`;
    }).join('');
    if (A) A.innerHTML = items;
    if (B) B.innerHTML = items;
  }
  function format(v){ return (v>10 ? v.toFixed(2) : v.toFixed(4)); }

  // -------- EUR/USD Live-Chart in #mainChart ----------
  function feedChart(rate){
    series.push(rate); if(series.length>MAX) series.shift();
    drawChart();
  }
  function drawChart(){
    if(!cMain) return;
    const dpr = Math.max(1, window.devicePixelRatio||1);
    const w = cMain.clientWidth||640, h = 280;
    const ctx = cMain.getContext('2d');
    cMain.width = w*dpr; cMain.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    if(series.length<2){ ctx.fillStyle='#86a8ff'; ctx.font='600 12px Inter,sans-serif'; ctx.fillText('Warte auf Live-Daten …', 40, 40); return; }
    const min = Math.min(...series), max = Math.max(...series);
    const X = i => 40 + i*(w-60)/(series.length-1);
    const Y = v => 20 + (1 - ((v - min)/((max-min)||1))) * (h-40);
    // grid
    ctx.strokeStyle='#15213a'; ctx.lineWidth=1;
    for(let i=0;i<=5;i++){ const yy = 20+i*(h-40)/5; ctx.beginPath(); ctx.moveTo(40,yy); ctx.lineTo(w-10,yy); ctx.stroke(); }
    // area
    ctx.beginPath(); ctx.moveTo(X(0),Y(series[0])); for(let i=1;i<series.length;i++) ctx.lineTo(X(i),Y(series[i]));
    const grd=ctx.createLinearGradient(0,0,0,h); grd.addColorStop(0,'rgba(0,229,255,.25)'); grd.addColorStop(1,'rgba(124,77,255,.05)');
    ctx.lineTo(X(series.length-1),h-20); ctx.lineTo(X(0),h-20); ctx.closePath(); ctx.fillStyle=grd; ctx.fill();
    // line
    ctx.beginPath(); ctx.moveTo(X(0),Y(series[0])); for(let i=1;i<series.length;i++) ctx.lineTo(X(i),Y(series[i]));
    ctx.lineWidth=2; ctx.strokeStyle='#00e5ff'; ctx.shadowColor='#00e5ff66'; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0;
    ctx.fillStyle='#86a8ff'; ctx.font='600 12px Inter, sans-serif'; ctx.textAlign='left';
    ctx.fillText('EUR/USD Live (Mid)', 40, 14);
    ctx.textAlign='right'; ctx.fillText('Quelle: EODHD WS', w-12, h-8);
  }

  // Badge für FreeForexAPI (nur wenn Fallback genutzt wird)
  function addFFA_Badge(){
    if (document.getElementById('freeforex-badge')) return;
    const wrap = document.querySelector('.ticker-wrap'); if(!wrap) return;
    const a = document.createElement('a'); a.href='https://www.freeforexapi.com'; a.target='_blank'; a.rel='noopener'; a.id='freeforex-badge';
    const img = new Image(); img.src='https://www.freeforexapi.com/Images/link.png'; img.alt='Free Forex API'; img.height=16;
    a.appendChild(img); const holder=document.createElement('div'); holder.style.marginTop='6px'; holder.appendChild(a); wrap.appendChild(holder);
  }

  connect();
})();
