(function(){
  // --- Konfiguration ---
  const A = document.getElementById('tickerA');
  const B = document.getElementById('tickerB');
  const cMain = document.getElementById('mainChart');

  // Startwerte (realistisch wirkend)
  const PAIRS = [
    {sym:'EURUSD', p:1.1020, dp:4},
    {sym:'GBPUSD', p:1.2850, dp:4},
    {sym:'USDJPY', p:147.20, dp:2},
    {sym:'AUDUSD', p:0.6720, dp:4},
    {sym:'USDCHF', p:0.8890, dp:4},
    {sym:'NZDUSD', p:0.6150, dp:4},
    {sym:'USDCAD', p:1.3120, dp:4},
    {sym:'EURJPY', p:162.40, dp:2},
  ];
  const prev = {};

  // Vorherige Live-Indikatoren entfernen
  (function cleanup(){
    document.getElementById('freeforex-badge')?.remove();
    document.getElementById('liveStatus')?.remove();
  })();

  // Renderer für Ticker
  function format(v, dp){ return v.toFixed(dp); }
  function renderTicker(){
    const html = PAIRS.map(x=>{
      const old = (prev[x.sym] ?? x.p);
      const chg = ((x.p - old)/old) * 100;
      prev[x.sym] = x.p;
      return `<div class="pair">
        <span class="name">${x.sym.slice(0,3)}/${x.sym.slice(3)}</span>
        <span class="price">${format(x.p, x.dp)}</span>
        <span class="chg ${chg>=0?'up':'down'}">${chg>=0?'+':'−'}${Math.abs(chg).toFixed(2)}%</span>
      </div>`;
    }).join('');
    if (A) A.innerHTML = html;
    if (B) B.innerHTML = html;
  }

  // Zufallsbewegung (sanft, leicht trendend)
  function tickPrices(){
    PAIRS.forEach(x=>{
      const vol = x.p * 0.0008;                 // ~0.08% Schwankung
      const drift = Math.sin(Date.now()/60000) * (x.p*0.00015);
      x.p = Math.max( (x.dp>=3?0.0001:0.01),
                      x.p + (Math.random()-0.5)*vol + drift );
    });
    renderTicker();
  }

  // --- EUR/USD Demo-Chart ---
  const series = [];
  function initChart(){
    if(!cMain) return;
    const dpr = Math.max(1, window.devicePixelRatio||1);
    const w = cMain.clientWidth || 640, h = 280;
    const ctx = cMain.getContext('2d');
    cMain.width = w*dpr; cMain.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    // Erstbefüllung
    if (series.length === 0){
      let v = PAIRS[0].p;
      for(let i=0;i<180;i++){
        v += (Math.random()-0.5)*(v*0.0009) + Math.sin(i/18)*(v*0.0002);
        series.push(v);
      }
    }
    drawChart();
  }
  function drawChart(){
    if(!cMain) return;
    const dpr = Math.max(1, window.devicePixelRatio||1);
    const w = cMain.clientWidth || 640, h = 280;
    const ctx = cMain.getContext('2d');
    cMain.width = w*dpr; cMain.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    const min = Math.min(...series), max = Math.max(...series);
    const X = i => 40 + i*(w-60)/(series.length-1);
    const Y = v => 20 + (1 - ((v-min)/((max-min)||1))) * (h-40);
    // Grid
    ctx.strokeStyle='#15213a'; ctx.lineWidth=1;
    for(let i=0;i<=5;i++){ const yy=20+i*(h-40)/5; ctx.beginPath(); ctx.moveTo(40,yy); ctx.lineTo(w-10,yy); ctx.stroke(); }
    // Area
    ctx.beginPath(); ctx.moveTo(X(0),Y(series[0]));
    for(let i=1;i<series.length;i++) ctx.lineTo(X(i),Y(series[i]));
    const grd=ctx.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,'rgba(0,229,255,.25)'); grd.addColorStop(1,'rgba(124,77,255,.05)');
    ctx.lineTo(X(series.length-1),h-20); ctx.lineTo(X(0),h-20); ctx.closePath(); ctx.fillStyle=grd; ctx.fill();
    // Line
    ctx.beginPath(); ctx.moveTo(X(0),Y(series[0]));
    for(let i=1;i<series.length;i++) ctx.lineTo(X(i),Y(series[i]));
    ctx.lineWidth=2; ctx.strokeStyle='#00e5ff'; ctx.shadowColor='#00e5ff66'; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0;
    ctx.fillStyle='#86a8ff'; ctx.font='600 12px Inter, sans-serif'; ctx.textAlign='left';
    ctx.fillText('EUR/USD Demo', 40, 14);
    ctx.textAlign='right'; ctx.fillText('Demo-Feed (Random Walk)', w-12, h-8);
  }
  function stepChart(){
    const last = series[series.length-1];
    const next = last + (Math.random()-0.5)*(last*0.0009) + Math.sin(Date.now()/1800)*(last*0.0002);
    series.push(next); if(series.length>300) series.shift();
    drawChart();
  }

  // Init
  renderTicker();
  initChart();
  // Intervalle
  setInterval(tickPrices, 1200);
  setInterval(stepChart, 900);
})();
