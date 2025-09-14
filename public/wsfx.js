(function(){
  const TOKEN   = (window.EODHD_TOKEN || 'demo'); // Demo-Key erlaubt EURUSD
  const SYMBOLS = ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCHF','NZDUSD','USDCAD','EURJPY'];
  const WSS     = `wss://ws.eodhistoricaldata.com/ws/forex?api_token=${encodeURIComponent(TOKEN)}`;
  const FFA_URL = 'https://www.freeforexapi.com/api/live?pairs=' + SYMBOLS.join(',');
  const XHOST   = 'https://api.exchangerate.host/latest?base=EUR&symbols=USD';

  const A = document.getElementById('tickerA');
  const B = document.getElementById('tickerB');
  const cMain = document.getElementById('mainChart');

  const last = {};
  const series = [];
  const MAX = 300;

  let ws, opened=false, hadTick=false, fallbackRunning=false;

  function setStatus(txt){
    let el = document.getElementById('liveStatus');
    if(!el){
      const wrap = document.querySelector('.ticker-wrap');
      if(!wrap) return;
      el = document.createElement('div');
      el.id = 'liveStatus';
      el.style.cssText = 'margin:6px 0 0 0;font:600 12px/1.2 Inter,sans-serif;color:#86a8ff;';
      wrap.appendChild(el);
    }
    const t = new Date().toLocaleTimeString();
    el.textContent = `Status: ${txt} · ${t}`;
  }

  function connect(){
    try{
      ws = new WebSocket(WSS);
      ws.onopen = () => {
        opened = true;
        setStatus('Verbunden (WS) – warte auf Ticks …');
        ws.send(JSON.stringify({ action:'subscribe', symbols: SYMBOLS.join(',') }));
        // Watchdog: wenn nach 4 s kein Tick kam → Fallback dazu schalten
        setTimeout(()=>{ if(!hadTick) { console.warn('[WS] kein Tick – HTTP-Fallback an'); startFallback(); } }, 4000);
      };
      ws.onmessage = ev => {
        try{
          const msg = JSON.parse(ev.data);
          if(!msg || !msg.s) return;
          const mid = computeMid(msg);
          if(Number.isFinite(mid)){
            hadTick = true;
            last[msg.s] = mid;
            if(msg.s === 'EURUSD') feedChart(mid);
            renderTicker();
            setStatus('Streaming via EODHD');
          }
        }catch(_){}
      };
      ws.onerror = err => { console.warn('[WS] error', err); };
      ws.onclose = () => {
        opened = false;
        console.warn('[WS] closed – reconnect in 2.5s; HTTP-Fallback läuft');
        setStatus('WS geschlossen; Polling aktiv');
        startFallback();
        setTimeout(connect, 2500);
      };
    }catch(e){
      console.warn('[WS] connect failed', e);
      startFallback();
    }
  }

  function computeMid(msg){
    if(typeof msg.a !== 'undefined' && typeof msg.b !== 'undefined'){
      return (Number(msg.a) + Number(msg.b)) / 2;
    }
    if(typeof msg.p !== 'undefined'){ return Number(msg.p); }
    return NaN;
  }

  function startFallback(){
    if(fallbackRunning) return;
    fallbackRunning = true;
    addFFA_Badge();
    (async function poll(){
      try{
        const r = await fetch(FFA_URL, { cache:'no-cache' });
        const j = await r.json();
        const rates = j.rates || {};
        applyRates(rates);
        setStatus('Polling (FreeForexAPI)');
      }catch(e){
        // 2. Fallback ohne Schlüssel
        try{
          const r2 = await fetch(XHOST, { cache:'no-cache' });
          const j2 = await r2.json();
          const eurusd = j2?.rates?.USD;
          if(Number.isFinite(eurusd)){
            applyRates({ EURUSD:{ rate: eurusd } });
            setStatus('Polling (exchangerate.host)');
          }
        }catch(_){}
      }finally{
        setTimeout(poll, 3000);
      }
    })();
  }

  function applyRates(rates){
    SYMBOLS.forEach(sym=>{
      const v = rates[sym]?.rate;
      if(Number.isFinite(v)) last[sym] = v;
    });
    if(Number.isFinite(rates.EURUSD?.rate)) feedChart(rates.EURUSD.rate);
    renderTicker();
  }

  function renderTicker(){
    const html = SYMBOLS.map(p=>{
      const v = last[p];
      if(!Number.isFinite(v)) return '';
      const key = '_prev_'+p;
      const prev = Number(renderTicker[key] ?? v);
      const chg = ((v - prev)/prev) * 100;
      renderTicker[key] = v;
      return `<div class="pair">
        <span class="name">${p.slice(0,3)}/${p.slice(3)}</span>
        <span class="price">${format(v)}</span>
        <span class="chg ${chg>=0?'up':'down'}">${chg>=0?'+':'−'}${Math.abs(chg).toFixed(2)}%</span>
      </div>`;
    }).join('');
    if (A) A.innerHTML = html;
    if (B) B.innerHTML = html;
  }

  function format(v){ return (v>10 ? v.toFixed(2) : v.toFixed(4)); }

  function feedChart(rate){
    series.push(rate);
    if(series.length>MAX) series.shift();
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
    const min=Math.min(...series), max=Math.max(...series);
    const X=i=>40+i*(w-60)/(series.length-1);
    const Y=v=>20+(1-((v-min)/((max-min)||1)))*(h-40);
    ctx.strokeStyle='#15213a'; ctx.lineWidth=1;
    for(let i=0;i<=5;i++){ const yy=20+i*(h-40)/5; ctx.beginPath(); ctx.moveTo(40,yy); ctx.lineTo(w-10,yy); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(X(0),Y(series[0])); for(let i=1;i<series.length;i++) ctx.lineTo(X(i),Y(series[i]));
    const grd=ctx.createLinearGradient(0,0,0,h); grd.addColorStop(0,'rgba(0,229,255,.25)'); grd.addColorStop(1,'rgba(124,77,255,.05)');
    ctx.lineTo(X(series.length-1),h-20); ctx.lineTo(X(0),h-20); ctx.closePath(); ctx.fillStyle=grd; ctx.fill();
    ctx.beginPath(); ctx.moveTo(X(0),Y(series[0])); for(let i=1;i<series.length;i++) ctx.lineTo(X(i),Y(series[i]));
    ctx.lineWidth=2; ctx.strokeStyle='#00e5ff'; ctx.shadowColor='#00e5ff66'; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0;
    ctx.fillStyle='#86a8ff'; ctx.font='600 12px Inter, sans-serif'; ctx.textAlign='left';
    ctx.fillText('EUR/USD Live', 40, 14);
    ctx.textAlign='right'; ctx.fillText('Quelle: EODHD / FFA / ERH', w-12, h-8);
  }

  function addFFA_Badge(){
    if(document.getElementById('freeforex-badge')) return;
    const wrap=document.querySelector('.ticker-wrap'); if(!wrap) return;
    const a=document.createElement('a'); a.href='https://www.freeforexapi.com'; a.target='_blank'; a.rel='noopener'; a.id='freeforex-badge';
    const img=new Image(); img.src='https://www.freeforexapi.com/Images/link.png'; img.alt='Free Forex API'; img.height=16;
    a.appendChild(img); const holder=document.createElement('div'); holder.style.marginTop='6px'; holder.appendChild(a); wrap.appendChild(holder);
  }

  connect();
})();
