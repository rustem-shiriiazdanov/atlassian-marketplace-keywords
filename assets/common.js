/* Marketplace Keywords: shared helpers for every page (window.MK).
   Reading the two report workbooks, cleaning queries, month labels and the header query lookup. */
(function(){
  'use strict';
  const XLSX_URLS = [
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
  ];
  const ECHARTS_URLS = [
    'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.0/echarts.min.js',
    'https://unpkg.com/echarts@5.5.0/dist/echarts.min.js'
  ];
  const DATA = {
    popular: ['./data/source_search_keywords_marketplace.xlsx'],
    zero: ['./data/zero_result_keywords_marketplace.xlsx']
  };

  function loadScriptSeq(urls, globalName){
    return new Promise((resolve, reject)=>{
      let i = 0;
      const next = ()=>{
        if(window[globalName]) return resolve(window[globalName]);
        if(i >= urls.length) return reject(new Error(globalName + ' could not load'));
        const s = document.createElement('script'); s.src = urls[i++]; s.async = true;
        s.onload = ()=> window[globalName] ? resolve(window[globalName]) : next();
        s.onerror = next; document.head.appendChild(s);
      };
      next();
    });
  }
  const ensureECharts = ()=> loadScriptSeq(ECHARTS_URLS, 'echarts');
  const ensureXLSX = ()=> loadScriptSeq(XLSX_URLS, 'XLSX');

  // --- Months ---
  function toMonthKey(v){
    if(typeof v === 'string' && /^\d{4}-\d{2}$/.test(v)) return v;
    if(v instanceof Date && !isNaN(v)) return v.getUTCFullYear() + '-' + String(v.getUTCMonth()+1).padStart(2,'0');
    if(typeof v === 'number' && window.XLSX){ const d = XLSX.SSF.parse_date_code(v); return d.y + '-' + String(d.m).padStart(2,'0'); }
    const t = String(v == null ? '' : v).trim(); const m = /^(\d{4})-(\d{2})/.exec(t); if(m) return m[1] + '-' + m[2];
    // Text dates ("Dec 2021", "12/1/2021") are parsed in local time, so the month is read in local time too.
    const d = new Date(t); return isNaN(d) ? '' : d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
  }
  function monthLabel(key, opts={month:'long', year:'numeric'}){
    const m = /^(\d{4})-(\d{2})/.exec(String(key||'')); if(!m) return String(key||'');
    return new Date(Date.UTC(+m[1], +m[2]-1, 1)).toLocaleString('en-US', {...opts, timeZone:'UTC'}).replace(' ', '\u00a0');
  }
  const monthLong = (k)=> monthLabel(k);
  const monthShort = (k)=> monthLabel(k, {month:'short', year:'numeric'});
  const monthName = (k)=> monthLabel(k, {month:'long'});
  const monthAbbr = (k)=> monthLabel(k, {month:'short'});
  function addMonths(key, n){ const y = +key.slice(0,4), m = +key.slice(5,7) - 1 + n; const d = new Date(Date.UTC(y, m, 1)); return d.getUTCFullYear() + '-' + String(d.getUTCMonth()+1).padStart(2,'0'); }
  function monthsBetween(a, b){ return (+b.slice(0,4) - +a.slice(0,4))*12 + (+b.slice(5,7) - +a.slice(5,7)); }

  // --- Text ---
  const escapeHtml = (v)=> String(v).replace(/[&<>"']/g, (ch)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmtInt = (n)=> Math.round(n).toLocaleString('en-US');
  const fmtPct = (n, d=2)=> `${(+n).toFixed(d)}%`;
  // The reports contain visually identical variants (case, zero-width or odd spaces); fold them into one query.
  function cleanKeyword(k){
    return String(k ?? '').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  }
  // Meaningless queries: bot noise and security probes in Atlassian's reports, judged on the raw text before clean-up.
  // Symbols only; long digit strings (1234, 9999…, phone numbers); e-mail addresses; HTML tags; script and SQL injection; pasted links.
  // Jira smart values such as {{issue.key}} are real searches and are kept.
  const PROBE = /script.*\/script|'\s*--|["']\s*>|<\s*["']|><|<>|[\w.+-]+@[\w-]+\.[a-z]{2,}|javascript:|vbscript:|data:text\/html|\b(?:alert|prompt|confirm|eval|atob|fromcharcode)\s*\(|\bon(?:error|load|mouseover|focus|click)\s*=|document\.(?:cookie|domain|location)|\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|&(?:quot|lt|gt|#x?[0-9a-f]+);|href\s*=|https?:\/\/|\bunion\s+(?:all\s+)?select\b|'\s*or\s*'?\d+'?\s*=\s*'?\d+|\bsleep\s*\(\s*\d|\.\.\/|\$\{jndi:/i;
  function isJunkQuery(raw){
    const t = String(raw ?? '').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').trim();
    if(!/[\p{L}\p{N}]/u.test(t)) return true;
    if(/^[\p{N}\s.,:;+\-–—_/()#]+$/u.test(t) && (t.match(/\p{N}/gu) || []).length >= 4) return true;
    if(/<\/?[a-z][a-z0-9]*(?:[\s>\/=]|$)/i.test(t)) return true;
    return PROBE.test(t);
  }
  // Numbers typed as text are read too, the same way as on Month by month: "3.5%", "3,5 %", "1 234", "1.234,5" and
  // "1,234,567". A single comma group ("1,234") is a decimal comma for shares and a thousands separator for counts.
  const num = (v, thousands = false)=>{
    if(v == null) return null; if(typeof v === 'number') return Number.isFinite(v) ? v : null;
    let t = String(v).trim().replace(/[\s\u00a0\u202f]/g, '').replace(/%$/, '');
    if(/^-?\d{1,3}(,\d{3}){2,}(\.\d+)?$/.test(t) || (thousands && /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t))) t = t.replace(/,/g, '');
    else if(/^-?\d{1,3}(\.\d{3})+,\d+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(',', '.');
    const n = t === '' ? NaN : Number(t); return Number.isFinite(n) ? n : null;
  };

  // --- Reading workbooks: in a background worker, so the page never freezes ---
  const WORKER_SRC = `const URLS=${JSON.stringify(XLSX_URLS)};
    for(const u of URLS){ try{ importScripts(u); if(self.XLSX) break; }catch(e){} }
    const key=(v)=>{ if(typeof v==='number'){ const d=XLSX.SSF.parse_date_code(v); return d.y+'-'+String(d.m).padStart(2,'0'); } const t=String(v==null?'':v).trim(); const m=/^(\\d{4})-(\\d{2})/.exec(t); if(m) return m[1]+'-'+m[2]; const d=new Date(t); return isNaN(d)?'':d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); };
    self.onmessage=(e)=>{ try{ if(!self.XLSX) throw new Error('no xlsx'); const wb=XLSX.read(e.data,{type:'array'}); const out={}; for(const name of ['Raw','Monthly_Summary']){ if(wb.Sheets[name]) out[name]=XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:null}).map(r=>({...r, month:key(r.month)})); } self.postMessage(out); }catch(err){ self.postMessage({error:String(err&&err.message||err)}); } };`;
  function readWorkbook(buf){
    // A read left over from an attempt before a retry does not count towards the new attempt's progress.
    const epoch = load.epoch;
    load.reading++; paintLoad();
    const fin = (v)=>{ if(epoch === load.epoch){ load.reading = Math.max(0, load.reading - 1); load.read++; paintLoad(); } return v; };
    return readWorkbookRaw(buf).then(fin, (e)=>{ fin(); throw e; });
  }
  function readWorkbookRaw(buf){
    return new Promise((resolve, reject)=>{
      let w, url = null; try{ url = URL.createObjectURL(new Blob([WORKER_SRC], {type:'text/javascript'})); w = new Worker(url); }catch(e){ w = null; }
      const end = ()=>{ if(w) w.terminate(); if(url){ URL.revokeObjectURL(url); url = null; } };
      const onPage = ()=> ensureXLSX().then(()=>{ const wb = XLSX.read(buf, {type:'array'}); const out = {}; for(const name of ['Raw','Monthly_Summary']) if(wb.Sheets[name]) out[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], {defval:null}).map(r=>({...r, month: toMonthKey(r.month)})); resolve(out); }).catch(reject);
      if(!w){ end(); onPage(); return; }
      const copy = buf.slice(0);
      w.onmessage = (e)=>{ end(); if(e.data && e.data.error) onPage(); else resolve(e.data); };
      w.onerror = ()=>{ end(); onPage(); };
      w.postMessage(copy, [copy]);
    });
  }
  // --- Loading: a progress line at the top of the page, and chart-shaped placeholders that say what is happening ---
  const load = { files: new Map(), reading: 0, read: 0, done: false, failed: false, timer: 0, epoch: 0 };
  const MB = (b)=> (b / 1048576).toFixed(1);
  function loadState(){
    let got = 0, total = 0, known = true;
    for(const f of load.files.values()){ got += f.loaded; if(f.total) total += f.total; else known = false; }
    if(load.failed) return { p: 0, text: 'The reports could not be loaded.' };
    if(load.done) return { p: 1, text: '' };
    const allIn = load.files.size && Array.from(load.files.values()).every(f=> f.complete);
    if(load.reading || allIn) return { p: .9, text: 'Reading the spreadsheets…' };
    if(!load.files.size) return { p: .04, text: 'Connecting…' };
    if(known && total) return { p: .05 + .8 * got / total, text: `Downloading the reports · ${MB(got)} of ${MB(total)} MB` };
    return { p: .3, text: `Downloading the reports · ${MB(got)} MB` };
  }
  function paintLoad(){
    const st = loadState();
    let bar = document.querySelector('.mk-load');
    // Only pages that load the reports get the progress line (About loads nothing).
    if(!bar && document.body && (load.files.size || load.reading || document.querySelector('[data-ghost]'))){ bar = document.createElement('div'); bar.className = 'mk-load'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>'; document.body.prepend(bar); }
    if(bar){ bar.firstChild.style.transform = `scaleX(${st.p})`; bar.classList.toggle('done', load.done || load.failed); }
    // One status for screen readers; the cards on the page are visual only.
    let live = document.getElementById('mkLoadStatus');
    if(!live && document.body && document.querySelector('[data-ghost]')){ live = document.createElement('div'); live.id = 'mkLoadStatus'; live.className = 'sr-only'; live.setAttribute('role', 'status'); document.body.append(live); }
    if(live){ const msg = load.done ? 'Loaded' : st.text; if(live.textContent !== msg) live.textContent = msg; }
    document.querySelectorAll('[data-load-note]').forEach(n=>{ const t = st.text || 'Drawing…'; if(n.textContent !== t) n.textContent = t; });
    const pct = Math.round(st.p * 100) + '%';
    document.querySelectorAll('[data-load-pct]').forEach(n=>{ n.textContent = load.failed ? '' : pct; });
    document.querySelectorAll('[data-load-bar]').forEach(n=>{ n.style.width = pct; });
    document.querySelectorAll('.load-card').forEach(c=> c.classList.toggle('failed', load.failed));
    // Figures that a page leaves empty once the reports are in show a dash instead of spinning on.
    // Once the page is drawn, markers a page left in place become plain text. After a failure they stay in place
    // in a failed state, so a retry can show them loading again.
    if(load.done){ document.querySelectorAll('.file-loading').forEach(m=> m.replaceWith('Loaded')); document.querySelectorAll('.mini-load').forEach(m=> m.replaceWith('—')); }
    else {
      document.querySelectorAll('.mini-load').forEach(m=> m.classList.toggle('failed', load.failed));
      document.querySelectorAll('.file-loading').forEach(m=>{ m.classList.toggle('failed', load.failed); const t = m.querySelector('.fl-text'); if(t) t.textContent = load.failed ? 'Not loaded' : 'Loading from the repository…'; });
    }
  }
  // Pages call this once the first view is drawn; the line fills up and fades out.
  function loadDone(){ if(load.done) return; load.done = true; paintLoad(); }
  function loadFailed(){ load.failed = true; paintLoad(); }
  // Try again hides the button that has focus; focus moves to the start of the content instead of the top of the page.
  function focusMain(){ const m = document.getElementById('main'); if(!m) return; if(!m.hasAttribute('tabindex')) m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); }
  // Fetches the first file that exists, counting bytes as they arrive for the progress line.
  async function fetchFirst(urls){
    const key = urls[0], epoch = load.epoch; load.failed = false; load.done = false; paintLoad();
    for(const u of urls){
      try{
        const res = await fetch(u, {cache:'no-cache'}); if(!res.ok) continue;
        const total = +res.headers.get('content-length') || 0, f = { loaded: 0, total };
        // A download from before a retry keeps going but no longer drives the progress line.
        if(epoch === load.epoch) load.files.set(key, f); paintLoad();
        if(!res.body || !res.body.getReader){ const buf = await res.arrayBuffer(); f.loaded = f.total = buf.byteLength; f.complete = true; paintLoad(); return buf; }
        const reader = res.body.getReader(), parts = [];
        for(;;){ const { done, value } = await reader.read(); if(done) break; parts.push(value); f.loaded += value.length; paintLoad(); }
        // Compressed responses report the compressed size; the bar ends where the bytes end.
        f.total = f.loaded; f.complete = true;
        const out = new Uint8Array(f.loaded); let at = 0; for(const c of parts){ out.set(c, at); at += c.length; }
        paintLoad();
        return out.buffer;
      }catch(e){}
    }
    throw new Error('Report file not found');
  }
  // Every element that shows report data has its own loading state until it is drawn: a placeholder shaped like
  // the element (bars, a line, a grid, list or table rows, cards, text lines) under a card that names the element
  // and shows the shared progress; figures get a small spinner in place of the number.
  const W = [92, 84, 77, 70, 61, 55, 49, 44, 40, 36, 33, 30, 28, 26, 24, 22, 21, 20, 19, 18];
  function loadCardHTML(label){
    return `<div class="load-card" aria-hidden="true"><span class="spin"></span><span class="load-label">${escapeHtml(label || 'Loading')}</span><span class="load-pct" data-load-pct></span>`
      + `<span class="load-sub" data-load-note>Connecting…</span><i class="load-track"><b data-load-bar></b></i></div>`;
  }
  function ghostHTML(kind, n, label, card = true, cols = 1){
    const wrap = (inner, tag = 'div')=> `<${tag} class="skel-wrap">${inner}${card ? loadCardHTML(label) : ''}</${tag}>`;
    const rows = (k, f)=> Array.from({length:k}, (_, i)=> f(i)).join('');
    if(kind === 'num') return `<span class="mini-load"><span class="spin"></span><span class="sr-only">Loading</span></span>`;
    if(kind === 'file') return `<span class="file-loading"><span class="mini-load"><span class="spin"></span></span><span class="fl-text">Loading from the repository…</span></span>`;
    if(kind === 'text'){ n = n || 3; return wrap(`<span class="skel g-text" aria-hidden="true">${rows(n, i=> `<b style="width:${i === n-1 ? 58 : 96 - (i*7)%14}%"></b>`)}</span>`, 'span'); }
    if(kind === 'bars'){ n = n || 10; return wrap(`<div class="skel g-bars" aria-hidden="true">${rows(n, i=> `<span><b style="width:${40 + (i*37)%45}%"></b><i style="width:${W[i] || 18}%"></i></span>`)}</div>`); }
    if(kind === 'line'){ const pts = [62,58,66,55,60,48,52,44,50,41,46,38,42,36,40,33,30,34,28,26].map((y,i)=> `${(i/19*100).toFixed(1)},${y}`).join(' ');
      return wrap(`<div class="skel g-line" aria-hidden="true"><svg viewBox="0 0 100 80" preserveAspectRatio="none"><path d="M0 20H100M0 40H100M0 60H100" class="gl-grid"/><polyline points="${pts}" class="gl-line"/></svg></div>`); }
    if(kind === 'heat'){ n = n || 10; return wrap(`<div class="skel g-heat" aria-hidden="true">${rows(n, r=> `<span><b style="width:${45 + (r*29)%40}%"></b>${rows(12, c=> `<i style="opacity:${(.25 + ((r*7 + c*5) % 9)/12).toFixed(2)}"></i>`)}</span>`)}</div>`); }
    if(kind === 'list'){ n = n || 6; return `<li class="skel-holder">${wrap(`<div class="skel g-list" aria-hidden="true">${rows(n, i=> `<span><b style="width:${30 + (i*23)%40}%"></b><i style="width:${W[i] || 30}%"></i></span>`)}</div>`)}</li>`; }
    if(kind === 'rows'){ n = n || 4; return `<tr class="skel-holder"><td colspan="${cols}">${wrap(`<div class="skel g-list" aria-hidden="true">${rows(n, i=> `<span><b style="width:${40 + (i*19)%35}%"></b><i style="width:${88 - i*9}%"></i></span>`)}</div>`)}</td></tr>`; }
    if(kind === 'cards'){ n = n || 12; return wrap(`<div class="skel g-cards" aria-hidden="true">${rows(n, i=> `<span><b style="width:${35 + (i*17)%30}%"></b><i style="width:${55 + (i*13)%35}%"></i><i style="width:${30 + (i*11)%25}%"></i></span>`)}</div>`); }
    return '';
  }
  // Before a retry: every element that still waits for data (or shows the failure) gets its loading state back.
  function refillGhosts(root){ load.epoch++; load.failed = false; load.done = false; load.files.clear(); load.reading = 0; load.read = 0; (root || document).querySelectorAll('[data-ghost]').forEach(el=>{ delete el.dataset.ghosted; }); fillGhosts(root); }
  function fillGhosts(root){
    (root || document).querySelectorAll('[data-ghost]').forEach(el=>{
      if(el.dataset.ghosted) return; el.dataset.ghosted = '1';
      el.innerHTML = ghostHTML(el.dataset.ghost, +el.dataset.rows || 0, el.dataset.label, el.dataset.card !== '0', +el.dataset.cols || 1);
    });
    paintLoad();
  }
  // Checks an opened report before it replaces the data on screen; the message says what is wrong in plain words.
  const REQUIRED = { popular: ['month', 'keyword', 'percentage'], popularRank: ['month', 'keyword', 'percentage', 'rank'], zero: ['month', 'keyword', 'count'] };
  function checkReport(wb, kind){
    const rows = wb && wb.Raw;
    if(!rows) throw new Error('there is no sheet named “Raw” (every Marketplace report export has one)');
    // A sheet with only a header row (or nothing at all) has no rows to check columns on.
    if(!rows.length) throw new Error('the Raw sheet has no rows with a month and a query');
    const cols = new Set(rows.slice(0, 50).flatMap(r=> Object.keys(r)));
    const missing = REQUIRED[kind].filter(c=> !cols.has(c));
    if(missing.length) throw new Error(`the Raw sheet has no ${missing.map(c=> '“' + c + '”').join(', ').replace(/, (?=[^,]*$)/, ' and ')} column${missing.length > 1 ? 's' : ''}`);
    if(!rows.some(r=> r.month && r.keyword != null && String(r.keyword).trim())) throw new Error('the Raw sheet has no rows with a month and a query');
    // The figures must be numbers; text such as "3.5%" or "1,234" is read as a number.
    const fig = kind === 'zero' ? 'count' : 'percentage';
    if(!rows.some(r=> num(r[fig], kind === 'zero') != null)) throw new Error(`the “${fig}” column has no numbers`);
    return rows;
  }
  // Raw sheet rows → clean rows. Every row is kept; meaningless ones are flagged (junk), judged on the raw text,
  // so the reader can choose to hide them on every page.
  // SheetJS 0.18 reads emoji outside the basic plane 0x10000 too low (🚀 U+1F680 arrives as U+F680). Queries never
  // use U+F000–U+FAFF themselves, so those characters are moved back up to the emoji block they came from.
  const fixText = (v)=> typeof v === 'string' ? v.replace(/[\uF000-\uFAFF]/g, (c)=> String.fromCodePoint(c.charCodeAt(0) + 0x10000)) : v;
  function prepPopular(rows){
    const out = [];
    for(const r0 of rows || []){ const r = { ...r0, keyword: fixText(r0.keyword) };
      const month = toMonthKey(r.month); if(!month) continue;
      const keyword = cleanKeyword(r.keyword) || String(r.keyword ?? '').trim(); if(!keyword) continue;
      out.push({ month, keyword, raw: String(r.keyword ?? ''), junk: isJunkQuery(r.keyword), percentage: num(r.percentage), rank: num(r.rank) });
    }
    return out;
  }
  function prepZero(rows){
    const out = [];
    for(const r0 of rows || []){ const r = { ...r0, keyword: fixText(r0.keyword) };
      const month = toMonthKey(r.month); if(!month) continue;
      const keyword = cleanKeyword(r.keyword) || String(r.keyword ?? '').trim(); if(!keyword) continue;
      out.push({ month, keyword, raw: String(r.keyword ?? ''), junk: isJunkQuery(r.keyword), count: num(r.count, true) || 0 });
    }
    return out;
  }

  // --- Reader setting: hide meaningless queries (off by default: everything as Atlassian reports it) ---
  const JUNK_KEY = 'mk-hide-junk';
  function hideJunk(){ try{ return localStorage.getItem(JUNK_KEY) === '1'; }catch(e){ return false; } }
  // Tick every checkbox to match and tell the page to redraw.
  function announceJunk(on){
    document.querySelectorAll('input[data-junk-toggle]').forEach(i=> i.checked = !!on);
    window.dispatchEvent(new CustomEvent('mk:junk', { detail:{ hide: !!on } }));
  }
  function setHideJunk(on){
    try{ if(on) localStorage.setItem(JUNK_KEY, '1'); else localStorage.removeItem(JUNK_KEY); }catch(e){}
    announceJunk(on);
  }
  // Every checkbox marked data-junk-toggle reflects and changes the setting; pages listen for 'mk:junk'.
  function bindJunkToggles(){
    document.querySelectorAll('input[data-junk-toggle]').forEach(i=>{
      if(i._mkBound) return; i._mkBound = true; i.checked = hideJunk();
      i.addEventListener('change', ()=> setHideJunk(i.checked));
    });
  }
  // Another tab changed the setting.
  window.addEventListener('storage', e=>{ if(e.key === JUNK_KEY) announceJunk(hideJunk()); });
  const zeroTotalsFrom = (summary)=> (summary || []).map(r=>({ month: toMonthKey(r.month), value: num(r.sum_count, true) || 0 })).filter(r=>r.month);

  let dataPromise = null, rawData = null;
  // Both repository reports, read once per page, then indexed with or without meaningless queries.
  function loadData(){
    if(!dataPromise){
      dataPromise = Promise.all([
        fetchFirst(DATA.popular).then(readWorkbook),
        fetchFirst(DATA.zero).then(readWorkbook)
      ]).then(([p, z])=>{ rawData = { popular: prepPopular(p.Raw), zero: prepZero(z.Raw), summary: zeroTotalsFrom(z.Monthly_Summary) }; return rawData; });
      dataPromise.catch(()=>{ dataPromise = null; });
    }
    return dataPromise.then(()=> currentData());
  }
  // The indexes for the current setting (cheap to rebuild when the reader flips it).
  function currentData(){
    const hide = hideJunk();
    const keep = (r)=> !hide || !r.junk;
    const junk = { popular: rawData.popular.filter(r=>r.junk), zero: rawData.zero.filter(r=>r.junk) };
    const D = build(rawData.popular.filter(keep), rawData.zero.filter(keep), rawData.summary);
    D.hideJunk = hide; D.junk = junk;
    // Rows per month as Atlassian published them, whatever the switch says.
    D.reportRows = new Map(); for(const r of rawData.popular) D.reportRows.set(r.month, (D.reportRows.get(r.month) || 0) + 1);
    return D;
  }

  // Indexes every page needs: rows by month, totals of empty searches, partial or unusually small reports.
  function build(popular, zero, zeroTotals){
    // Variants folded into one query are added up; pos is the place in the cleaned month list.
    const byMonth = new Map();
    for(const r of popular){
      let m = byMonth.get(r.month); if(!m){ m = new Map(); byMonth.set(r.month, m); }
      const e = m.get(r.keyword); if(e){ e.percentage = (e.percentage||0) + (r.percentage||0); e.rank = Math.min(e.rank ?? 1e9, r.rank ?? 1e9); } else m.set(r.keyword, { ...r });
    }
    for(const [k, m] of byMonth){ const list = Array.from(m.values()).sort((a,b)=> (b.percentage ?? 0) - (a.percentage ?? 0) || (a.rank ?? 1e9) - (b.rank ?? 1e9)); list.forEach((r,i)=>{ r.pos = i+1; r.rk = Number.isFinite(r.rank) && r.rank < 1e9 ? r.rank : i+1; }); byMonth.set(k, list); }
    const zeroByMonth = new Map();
    for(const r of zero){
      let m = zeroByMonth.get(r.month); if(!m){ m = new Map(); zeroByMonth.set(r.month, m); }
      const e = m.get(r.keyword); if(e) e.count += r.count; else m.set(r.keyword, { ...r });
    }
    for(const [k, m] of zeroByMonth){ const list = Array.from(m.values()).sort((a,b)=> b.count - a.count || (a.keyword < b.keyword ? -1 : 1)); zeroByMonth.set(k, list); }
    // Totals are added up from the rows shown, so they always match the tables (with or without meaningless queries);
    // the summary sheet only fills months that have no rows.
    let totals = Array.from(zeroByMonth.entries()).map(([month, l])=>({ month, value: l.reduce((a,r)=> a + r.count, 0) }));
    for(const t of zeroTotals || []) if(t.month && !zeroByMonth.has(t.month)) totals.push({ ...t });
    totals.sort((a,b)=> a.month < b.month ? -1 : 1);
    const popularPartial = smallReports(byMonth);
    // Zero-result report: a month with almost nothing in it is a partial export (Dec 2021, Nov 2023), shown with a note;
    // a month far below the full reports before it is kept but marked as unusually low (Oct and Dec 2023).
    const vals = totals.map(t=>t.value).filter(v=>v>0).sort((a,b)=>a-b); const med = vals[Math.floor(vals.length/2)] || 0;
    const zeroPartial = new Set(totals.filter(t=> t.value < med*0.15).map(t=>t.month));
    const kept = totals.filter(t=> !zeroPartial.has(t.month));
    // Only the full reports before a month count (up to six from the previous twelve months, at least three), so a
    // month is judged the same way when it is the newest report and later on. A sudden drop is flagged, a steady decline
    // is not: below half the usual level of those months and well below even the lowest of them.
    const zeroLow = new Set();
    kept.forEach((x, i)=>{
      const before = kept.slice(0, i).filter(y=> !zeroLow.has(y.month) && monthsBetween(y.month, x.month) <= 12).slice(-6).map(y=> y.value).sort((p,q)=> p-q);
      if(before.length < 3) return;
      const m = before[Math.floor(before.length/2)];
      if(x.value < m*0.5 && x.value < before[0]*0.6) zeroLow.add(x.month);
    });
    const months = Array.from(byMonth.keys()).sort();
    // Every month is an issue, partial reports included; they are marked, not hidden.
    const issues = months.slice();
    return { popular, zero, zeroTotals: totals, byMonth, zeroByMonth, months, issues, popularPartial, zeroPartial, zeroLow };
  }
  // A report with far fewer rows than usual is a partial export (the popular report for Dec 2021). Shown, with a note.
  function smallReports(map){
    const c = Array.from(map.values()).map(l=>l.length).sort((a,b)=>a-b); if(!c.length) return new Set();
    const median = c[Math.floor(c.length/2)];
    return new Set(Array.from(map.entries()).filter(([,l])=> l.length < median*0.8).map(([m])=>m));
  }

  // Atlassian rolled out its redesigned Marketplace from mid-October to early November 2024; broad one-word queries lost most of their share in November.
  const REPORT_BREAK = '2024-11';
  // The zero-result report lists the 500 queries that most often found no apps; its monthly total adds those up.
  const ZERO_NOTE = 'Each month adds up the 500 queries that most often found no apps, as Atlassian reports them; rarer empty searches are not in the report.';

  // --- Header query lookup with suggestions ---
  // index: [{k, note}] sorted by importance. Picking opens the query in the Keyword Explorer.
  function attachLookup(form, getIndex){
    if(!form) return;
    const input = form.querySelector('input'), box = form.querySelector('.suggest');
    let items = [], active = -1;
    // Announced as a combobox: the highlighted suggestion is the active descendant, so Enter's target is read out.
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list');
    const close = ()=>{ box.hidden = true; active = -1; input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); };
    const go = (q, exact=true)=>{
      if(exact){ location.href = './keyword-explorer.html?q=' + encodeURIComponent(q); return; }
      const words = Array.from(new Set(cleanKeyword(q).split(' ').filter(Boolean)));
      if(!words.length) return;
      location.href = './keyword-explorer.html?' + words.map(w=>'q=' + encodeURIComponent(w)).join('&') + '&mode=contains&logic=all';
    };
    const mark = ()=>{ box.querySelectorAll('button').forEach((b,i)=>{ b.classList.toggle('active', i === active); b.setAttribute('aria-selected', String(i === active)); });
      if(active >= 0) input.setAttribute('aria-activedescendant', box.id + '-o' + active); else input.removeAttribute('aria-activedescendant'); };
    const render = ()=>{
      const q = cleanKeyword(input.value); const index = getIndex();
      if(!q || !index){ close(); return; }
      const starts = [], has = [];
      for(const it of index){ if(it.k.startsWith(q)) starts.push(it); else if(has.length < 8 && it.k.includes(q)) has.push(it); if(starts.length >= 8) break; }
      // The query exactly as typed comes first and meaningless queries last, so Enter opens what was meant.
      const exact = index.find(it=> it.k === q);
      items = (exact ? [exact] : []).concat(starts, has).filter((it,i,a)=> a.indexOf(it) === i)
        .map((it,i)=>({ it, i, j: isJunkQuery(it.k) ? 1 : 0 })).sort((a,b)=> a.j - b.j || a.i - b.i).map(x=> x.it).slice(0, 8);
      box.innerHTML = items.length ? items.map((it,i)=>{ const at = it.k.indexOf(q); const name = escapeHtml(it.k.slice(0,at)) + '<b>' + escapeHtml(it.k.slice(at, at+q.length)) + '</b>' + escapeHtml(it.k.slice(at+q.length)); return `<button type="button" role="option" id="${box.id}-o${i}" data-i="${i}"><span>${name}</span><span>${escapeHtml(it.note||'')}</span></button>`; }).join('')
        : `<div class="none">No query contains “${escapeHtml(input.value.trim())}”. Press Enter to see every query that contains ${q.includes(' ') ? 'all of these words' : 'it'}.</div>`;
      active = items.length ? 0 : -1; mark(); box.hidden = false; input.setAttribute('aria-expanded','true');
    };
    input.addEventListener('input', render);
    input.addEventListener('focus', ()=>{ if(input.value.trim()) render(); });
    input.addEventListener('blur', close);
    input.addEventListener('keydown', e=>{
      if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){ if(!items.length) return; e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; mark(); }
      // Escape closes the list first; only a second Escape clears the text (the search field's own behaviour).
      else if(e.key === 'Escape'){ if(!box.hidden){ e.preventDefault(); close(); } }
    });
    box.addEventListener('mousedown', e=> e.preventDefault());
    box.addEventListener('click', e=>{ const b = e.target.closest('button'); if(b) go(items[+b.dataset.i].k); });
    form.addEventListener('submit', e=>{ e.preventDefault(); const q = input.value.trim(); if(!q){ input.focus(); return; } if(active >= 0 && items[active]) go(items[active].k); else go(q, false); });
    document.addEventListener('click', e=>{ if(!form.contains(e.target)) close(); });
  }
  // Every known query, biggest overall share first, with a note on where it stands now.
  function lookupIndex(D){
    const total = new Map(), last = new Map(), lastZero = new Map();
    for(const r of D.popular){ total.set(r.keyword, (total.get(r.keyword)||0) + (r.percentage||0)); const m = last.get(r.keyword); if(!m || r.month > m) last.set(r.keyword, r.month); }
    for(const r of D.zero){ if(!total.has(r.keyword)) total.set(r.keyword, 0); const m = lastZero.get(r.keyword); if(!m || r.month > m) lastZero.set(r.keyword, r.month); }
    const latest = D.months.at(-1); const now = new Map((D.byMonth.get(latest)||[]).map(r=>[r.keyword, r.percentage]));
    return Array.from(total.entries()).sort((a,b)=> b[1]-a[1]).map(([k])=>({ k,
      note: now.has(k) ? `${fmtPct(now.get(k))} in ${monthShort(latest)}` : last.get(k) ? `top 500 until ${monthShort(last.get(k))}` : lastZero.get(k) ? `no apps found, ${monthShort(lastZero.get(k))}` : '' }));
  }

  // Theme colours for charts, read from the CSS tokens so light and dark stay in one place.
  function tokens(){
    const cs = getComputedStyle(document.documentElement); const v = (n)=> cs.getPropertyValue(n).trim();
    return { paper:v('--paper'), surface:v('--surface'), sunken:v('--sunken'), ink:v('--ink'), ink2:v('--ink2'), muted:v('--muted'), faint:v('--faint'), rule:v('--rule'), rule2:v('--rule2'), accent:v('--accent'), accentSoft:v('--accent-soft'), pos:v('--pos'), neg:v('--neg'), dropped:v('--dropped'),
      heat:[v('--heat0'),v('--heat1'),v('--heat2'),v('--heat3'),v('--heat4'),v('--heat5')], heatInkLight:v('--heat-ink-light'), heatInkDark:v('--heat-ink-dark'),
      series:[v('--s1'),v('--s2'),v('--s3'),v('--s4'),v('--s5'),v('--s6'),v('--s7'),v('--s8')] };
  }
  // A month's #1 at least twice the usual #1 of the previous twelve months is an unusual spike.
  // Only the months before it count, so an old issue never changes when new reports arrive. Partial reports are not compared.
  function isSpike(D, m){
    const lead = (x)=> (D.byMonth.get(x) || [])[0]; const a = lead(m); if(!a || D.popularPartial.has(m)) return false;
    const near = D.issues.filter(x=> x < m && monthsBetween(x, m) <= 12 && !D.popularPartial.has(x)).map(x=> lead(x)?.percentage).filter(Number.isFinite).sort((p,q)=>p-q);
    if(!near.length) return false;
    const med = near[Math.floor(near.length/2)];
    return !!med && a.percentage >= med*2;
  }
  // Text colour with the better contrast on a given background (WCAG relative luminance).
  function inkOn(bg, light, dark){
    const lum = (hex)=>{ const h = String(hex).replace('#',''); if(h.length < 6) return 0.5; const c = [0,2,4].map(i=> parseInt(h.slice(i,i+2),16)/255).map(x=> x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4)); return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]; };
    const ratio = (a,b)=>{ const [x,y] = [lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
    return ratio(bg, light) >= ratio(bg, dark) ? light : dark;
  }
  // Empty-search heat bins: 0 / not listed, 1–4, 5–9, 10–19, 20–49, 50+.
  const HEAT_BINS = [0, 1, 5, 10, 20, 50];
  const heatBin = (n)=>{ let b = 0; for(let i=0;i<HEAT_BINS.length;i++) if(n >= HEAT_BINS[i]) b = i; return n > 0 ? Math.max(1, b) : 0; };

  window.MK = { XLSX_URLS, ECHARTS_URLS, loadScriptSeq, ensureECharts, ensureXLSX, readWorkbook, checkReport, fixText, fetchFirst, loadDone, loadFailed, focusMain, fillGhosts, refillGhosts, ghostHTML, loadCardHTML, prepPopular, prepZero, zeroTotalsFrom, loadData, currentData, build, hideJunk, setHideJunk, bindJunkToggles,
    toMonthKey, monthLabel, monthLong, monthShort, monthName, monthAbbr, addMonths, monthsBetween,
    escapeHtml, fmtInt, fmtPct, cleanKeyword, isJunkQuery, num, REPORT_BREAK, ZERO_NOTE,
    attachLookup, lookupIndex, tokens, HEAT_BINS, heatBin, isSpike, inkOn };

  // On every page: the hide switches and the loading placeholders.
  const ready = ()=>{ bindJunkToggles(); fillGhosts(); };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
