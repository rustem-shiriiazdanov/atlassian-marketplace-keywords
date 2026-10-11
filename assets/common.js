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

  // Links used on About and in the footer. Empty values hide the button.
  const LINKS = {
    github: 'https://github.com/rustem-shiriiazdanov/atlassian-marketplace-keywords',
    reportBuilder: 'https://marketplace.atlassian.com/apps/1216997',
    actonic: 'https://actonic.de/en/',
    linkedin: 'https://www.linkedin.com/in/rustem-shiriiazdanov/',
    bookCall: 'https://calendly.com/rustem-shiriiazdanov-actonic'
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
    if(typeof v === 'string' && v.length === 7 && v.charCodeAt(4) === 45) return v;
    if(v instanceof Date && !isNaN(v)) return v.getUTCFullYear() + '-' + String(v.getUTCMonth()+1).padStart(2,'0');
    if(typeof v === 'number' && window.XLSX){ const d = XLSX.SSF.parse_date_code(v); return d.y + '-' + String(d.m).padStart(2,'0'); }
    const t = String(v == null ? '' : v).trim(); const m = /^(\d{4})-(\d{2})/.exec(t); if(m) return m[1] + '-' + m[2];
    const d = new Date(t); return isNaN(d) ? '' : d.getUTCFullYear() + '-' + String(d.getUTCMonth()+1).padStart(2,'0');
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
  const num = (v)=>{ if(typeof v === 'number') return v; const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  // --- Reading workbooks: in a background worker, so the page never freezes ---
  const WORKER_SRC = `const URLS=${JSON.stringify(XLSX_URLS)};
    for(const u of URLS){ try{ importScripts(u); if(self.XLSX) break; }catch(e){} }
    const key=(v)=>{ if(typeof v==='number'){ const d=XLSX.SSF.parse_date_code(v); return d.y+'-'+String(d.m).padStart(2,'0'); } const t=String(v==null?'':v).trim(); const m=/^(\\d{4})-(\\d{2})/.exec(t); if(m) return m[1]+'-'+m[2]; const d=new Date(t); return isNaN(d)?t.slice(0,7):d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0'); };
    self.onmessage=(e)=>{ try{ if(!self.XLSX) throw new Error('no xlsx'); const wb=XLSX.read(e.data,{type:'array'}); const out={}; for(const name of ['Raw','Monthly_Summary']){ if(wb.Sheets[name]) out[name]=XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:null}).map(r=>({...r, month:key(r.month)})); } self.postMessage(out); }catch(err){ self.postMessage({error:String(err&&err.message||err)}); } };`;
  function readWorkbook(buf){
    return new Promise((resolve, reject)=>{
      let w; try{ w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], {type:'text/javascript'}))); }catch(e){ w = null; }
      const onPage = ()=> ensureXLSX().then(()=>{ const wb = XLSX.read(buf, {type:'array'}); const out = {}; for(const name of ['Raw','Monthly_Summary']) if(wb.Sheets[name]) out[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], {defval:null}).map(r=>({...r, month: toMonthKey(r.month)})); resolve(out); }).catch(reject);
      if(!w){ onPage(); return; }
      const copy = buf.slice(0);
      w.onmessage = (e)=>{ w.terminate(); if(e.data && e.data.error) onPage(); else resolve(e.data); };
      w.onerror = ()=>{ w.terminate(); onPage(); };
      w.postMessage(copy, [copy]);
    });
  }
  async function fetchFirst(urls){
    for(const u of urls){ try{ const res = await fetch(u, {cache:'no-cache'}); if(res.ok) return await res.arrayBuffer(); }catch(e){} }
    throw new Error('Report file not found');
  }
  // Raw sheet rows → clean rows, with meaningless queries dropped and counted.
  function prepPopular(rows){
    const out = [], removed = [];
    for(const r of rows || []){
      const month = toMonthKey(r.month); if(!month) continue;
      if(isJunkQuery(r.keyword)){ removed.push(r); continue; }
      const keyword = cleanKeyword(r.keyword); if(!keyword) continue;
      out.push({ month, keyword, percentage: num(r.percentage), rank: num(r.rank) });
    }
    return { rows: out, removed };
  }
  function prepZero(rows){
    const out = [], removed = [];
    for(const r of rows || []){
      const month = toMonthKey(r.month); if(!month) continue;
      if(isJunkQuery(r.keyword)){ removed.push(r); continue; }
      const keyword = cleanKeyword(r.keyword); if(!keyword) continue;
      out.push({ month, keyword, count: num(r.count) || 0 });
    }
    return { rows: out, removed };
  }
  const zeroTotalsFrom = (summary)=> (summary || []).map(r=>({ month: toMonthKey(r.month), value: num(r.sum_count) || 0 })).filter(r=>r.month);

  let dataPromise = null;
  // Both repository reports, read once per page.
  function loadData(){
    if(dataPromise) return dataPromise;
    dataPromise = Promise.all([
      fetchFirst(DATA.popular).then(readWorkbook),
      fetchFirst(DATA.zero).then(readWorkbook)
    ]).then(([p, z])=>{
      const pop = prepPopular(p.Raw), zer = prepZero(z.Raw);
      return build(pop.rows, zer.rows, zeroTotalsFrom(z.Monthly_Summary), { popular: pop.removed.length, zero: zer.removed.length, popularRaw: (p.Raw||[]).length, zeroRaw: (z.Raw||[]).length, popularRows: pop.removed, zeroRows: zer.removed });
    });
    dataPromise.catch(()=>{ dataPromise = null; });
    return dataPromise;
  }

  // Indexes every page needs: rows by month, totals of empty searches, partial or unusually small reports.
  function build(popular, zero, zeroTotals, removed){
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
    // Totals come from the summary sheet; without one they are summed from the rows.
    let totals = zeroTotals && zeroTotals.length ? zeroTotals.slice() : Array.from(zeroByMonth.entries()).map(([month, l])=>({ month, value: l.reduce((a,r)=> a + r.count, 0) }));
    totals.sort((a,b)=> a.month < b.month ? -1 : 1);
    const popularPartial = smallReports(byMonth);
    // Zero-result report: a month with almost nothing in it is a partial export (Dec 2021, Nov 2023);
    // a month far below every neighbour is kept but marked as unusually low (Oct and Dec 2023).
    const vals = totals.map(t=>t.value).filter(v=>v>0).sort((a,b)=>a-b); const med = vals[Math.floor(vals.length/2)] || 0;
    const zeroPartial = new Set(totals.filter(t=> t.value < med*0.15).map(t=>t.month));
    const kept = totals.filter(t=> !zeroPartial.has(t.month));
    const zeroLow = new Set(kept.filter((x,i)=>{ const near = kept.slice(Math.max(0,i-3), i).concat(kept.slice(i+1, i+4)).map(y=>y.value).sort((p,q)=>p-q); const m = near[Math.floor(near.length/2)]; return near.length >= 4 && x.value < m*0.5; }).map(t=>t.month));
    const months = Array.from(byMonth.keys()).sort();
    const issues = months.filter(m=> !popularPartial.has(m));
    return { popular, zero, zeroTotals: totals, byMonth, zeroByMonth, months, issues, popularPartial, zeroPartial, zeroLow, removed };
  }
  // A report with far fewer rows than usual is a partial export (Dec 2021, Nov 2023).
  function smallReports(map){
    const c = Array.from(map.values()).map(l=>l.length).sort((a,b)=>a-b); if(!c.length) return new Set();
    const median = c[Math.floor(c.length/2)];
    return new Set(Array.from(map.entries()).filter(([,l])=> l.length < median*0.8).map(([m])=>m));
  }

  // Atlassian rolled out its redesigned Marketplace from mid-October to early November 2024; broad one-word queries lost most of their share in November.
  const REPORT_BREAK = '2024-11';
  const BREAK_NOTE = 'In November 2024 broad queries such as “automation”, “jira” and “structure” lost most of their share in a single month, while app names held steady. Atlassian rolled out its redesigned Marketplace, with autocomplete and new categories, from mid-October to early November 2024, so shares before and after are not directly comparable.';
  const NOISE_NOTE = 'Meaningless queries are removed: bot noise, test strings such as “1234”, pasted links and e-mail addresses, and HTML or script injection attempts.';
  // The zero-result report lists the 500 queries that most often found no apps; its monthly total adds those up.
  const ZERO_NOTE = 'Each month adds up the 500 queries that most often found no apps, as Atlassian reports them; rarer empty searches are not in the report.';

  // --- Header query lookup with suggestions ---
  // index: [{k, note}] sorted by importance. Picking opens the query in the Keyword Explorer.
  function attachLookup(form, getIndex){
    if(!form) return;
    const input = form.querySelector('input'), box = form.querySelector('.suggest');
    let items = [], active = -1;
    const close = ()=>{ box.hidden = true; active = -1; input.setAttribute('aria-expanded','false'); };
    const go = (q, exact=true)=>{
      if(exact){ location.href = './keyword-explorer.html?q=' + encodeURIComponent(q); return; }
      const words = Array.from(new Set(cleanKeyword(q).split(' ').filter(Boolean)));
      if(!words.length) return;
      location.href = './keyword-explorer.html?' + words.map(w=>'q=' + encodeURIComponent(w)).join('&') + '&mode=contains&logic=all';
    };
    const mark = ()=> box.querySelectorAll('button').forEach((b,i)=> b.classList.toggle('active', i === active));
    const render = ()=>{
      const q = cleanKeyword(input.value); const index = getIndex();
      if(!q || !index){ close(); return; }
      const starts = [], has = [];
      for(const it of index){ if(it.k.startsWith(q)) starts.push(it); else if(has.length < 8 && it.k.includes(q)) has.push(it); if(starts.length >= 8) break; }
      items = starts.concat(has).slice(0, 8);
      box.innerHTML = items.length ? items.map((it,i)=>{ const at = it.k.indexOf(q); const name = escapeHtml(it.k.slice(0,at)) + '<b>' + escapeHtml(it.k.slice(at, at+q.length)) + '</b>' + escapeHtml(it.k.slice(at+q.length)); return `<button type="button" role="option" data-i="${i}"><span>${name}</span><span>${escapeHtml(it.note||'')}</span></button>`; }).join('')
        : `<div class="none">No query contains “${escapeHtml(input.value.trim())}”. Press Enter to see every query that contains ${q.includes(' ') ? 'all of these words' : 'it'}.</div>`;
      active = items.length ? 0 : -1; mark(); box.hidden = false; input.setAttribute('aria-expanded','true');
    };
    input.addEventListener('input', render);
    input.addEventListener('focus', ()=>{ if(input.value.trim()) render(); });
    input.addEventListener('blur', close);
    input.addEventListener('keydown', e=>{
      if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){ if(!items.length) return; e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; mark(); }
      else if(e.key === 'Escape'){ close(); }
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
  // A month's #1 at least twice the usual #1 of the surrounding year (six issues either side) is an unusual spike.
  function isSpike(D, m){
    const lead = (x)=> (D.byMonth.get(x) || [])[0]; const a = lead(m); if(!a) return false;
    const near = D.issues.filter(x=> x !== m && Math.abs(monthsBetween(x, m)) <= 6).map(x=> lead(x)?.percentage).filter(Number.isFinite).sort((p,q)=>p-q);
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

  window.MK = { XLSX_URLS, ECHARTS_URLS, LINKS, loadScriptSeq, ensureECharts, ensureXLSX, readWorkbook, fetchFirst, prepPopular, prepZero, zeroTotalsFrom, loadData, build,
    toMonthKey, monthLabel, monthLong, monthShort, monthName, monthAbbr, addMonths, monthsBetween,
    escapeHtml, fmtInt, fmtPct, cleanKeyword, isJunkQuery, num, REPORT_BREAK, BREAK_NOTE, NOISE_NOTE, ZERO_NOTE,
    attachLookup, lookupIndex, tokens, HEAT_BINS, heatBin, isSpike, inkOn };

  // Fill links that are configured above; hide the ones that are not.
  const fillLinks = ()=> document.querySelectorAll('[data-link]').forEach(a=>{ const u = LINKS[a.dataset.link]; if(u) a.href = u; else a.hidden = true; });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fillLinks); else fillLinks();
})();
