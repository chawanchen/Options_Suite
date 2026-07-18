
// 全站圖表統一使用微軟正黑體。
if (window.Chart) {
  Chart.defaults.font.family = 'Microsoft JhengHei';
}
(function(){
  const pageKey = document.body.dataset.page || location.pathname.split('/').pop().replace('.html','') || 'page';
  const exportType = document.body.dataset.export || 'csv';
  const HISTORY_LIMIT = 12;
  const key = `options-suite-history:${pageKey}`;
  let restoring=false,historyTrigger=null;

  function fieldsSnapshot(){
    const values={};
    document.querySelectorAll('input,select').forEach(el=>{
      if(!el.name && !el.id) return;
      if((el.type==='radio'||el.type==='checkbox')&&!el.checked) return;
      const k=el.name||el.id;
      if(values[k]!==undefined){
        values[k]=Array.isArray(values[k])?[...values[k],el.value]:[values[k],el.value];
      } else values[k]=el.value;
    });
    document.querySelectorAll('.market-row').forEach((row,i)=>{ const k=row.querySelector('.strike-input'),p=row.querySelector('.price-input'); if(k) values[`smileStrike_${i+1}`]=k.value; if(p) values[`smilePrice_${i+1}`]=p.value; });
    document.querySelectorAll('[data-strategy].active,[data-greek].active,[data-axis].active,[data-asset].active').forEach(el=>{
      const k=Object.keys(el.dataset)[0]; values[`selected_${k}`]=el.dataset[k];
    });
    return values;
  }
  function load(){ try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []} }
  function save(label='計算'){ if(restoring)return;const rows=load(); rows.unshift({time:new Date().toLocaleString('zh-TW'),label,values:fieldsSnapshot()}); localStorage.setItem(key,JSON.stringify(rows.slice(0,HISTORY_LIMIT))); }
  function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function restore(item){
    restoring=true;
    const values=item.values||{};
    Object.entries(values).filter(([k])=>k.startsWith('selected_')).forEach(([k,v])=>{
      const type=k.replace('selected_','');
      document.querySelector(`[data-${CSS.escape(type)}="${CSS.escape(String(v))}"]`)?.click();
    });
    const smileKeys=Object.keys(values).filter(k=>k.startsWith('smileStrike_'));
    const marketRows=document.querySelector('#marketRows');
    if(marketRows&&smileKeys.length){
      marketRows.innerHTML='';
      smileKeys.sort((a,b)=>Number(a.split('_')[1])-Number(b.split('_')[1])).forEach(k=>{
        const i=k.split('_')[1],row=document.createElement('div');row.className='market-row';
        row.innerHTML=`<input type="number" step="any" class="strike-input" value="${escape(values[k])}" placeholder="履約價"><input type="number" step="any" class="price-input" value="${escape(values[`smilePrice_${i}`]??'')}" placeholder="市場價格"><button type="button" class="remove-row-btn">刪除</button>`;
        marketRows.appendChild(row);
      });
    }
    Object.entries(values).forEach(([k,v])=>{
      if(k.startsWith('selected_')||k.startsWith('smileStrike_')||k.startsWith('smilePrice_')) return;
      const els=[...document.querySelectorAll(`[name="${CSS.escape(k)}"],#${CSS.escape(k)}`)];
      els.forEach(el=>{
        const val=Array.isArray(v)?v[0]:v;
        if(el.type==='radio'||el.type==='checkbox') el.checked=Array.isArray(v)?v.includes(el.value):el.value===String(val);
        else el.value=val;
        el.dispatchEvent(new Event('change',{bubbles:true}));
      });
    });
    closeHistory();
    const forms=[...document.querySelectorAll('form')];
    if(forms.length)setTimeout(()=>{forms.forEach(form=>form.requestSubmit());restoring=false},0);else restoring=false;
  }
  function openHistory(){
    let modal=document.getElementById('historyModal');
    if(!modal){
      modal=document.createElement('div'); modal.id='historyModal'; modal.className='history-modal'; modal.setAttribute('aria-hidden','true'); document.body.appendChild(modal);
    }
    const rows=load();
    modal.innerHTML=`<div class="history-backdrop" data-close-history></div><section class="history-dialog" role="dialog" aria-modal="true" aria-labelledby="historyTitle"><div class="history-head"><div><h2 id="historyTitle">使用紀錄</h2><p>最近 ${HISTORY_LIMIT} 筆輸入，點「套用」可帶回表單。</p></div><button type="button" class="history-close" data-close-history aria-label="關閉使用紀錄">×</button></div><div class="history-list">${rows.length?rows.map((r,i)=>`<article class="history-item"><div class="history-item-head"><strong>${escape(r.label)}</strong><span>${escape(r.time)}</span></div><dl>${Object.entries(r.values||{}).slice(0,14).map(([k,v])=>`<div><dt>${escape(k)}</dt><dd>${escape(Array.isArray(v)?v.join('、'):v)}</dd></div>`).join('')}</dl><button type="button" class="outline-btn" data-restore-history="${i}">套用這筆輸入</button></article>`).join(''):'<div class="history-empty">目前還沒有使用紀錄。</div>'}</div><div class="history-footer"><button type="button" class="outline-btn" id="clearHistoryBtn">清除全部紀錄</button></div></section>`;
    historyTrigger=document.activeElement;modal.classList.add('show');modal.setAttribute('aria-hidden','false');
    modal.querySelectorAll('[data-close-history]').forEach(x=>x.onclick=closeHistory);
    modal.querySelectorAll('[data-restore-history]').forEach(x=>x.onclick=()=>restore(rows[+x.dataset.restoreHistory]));
    modal.querySelector('#clearHistoryBtn').onclick=()=>{localStorage.removeItem(key);openHistory()};
    modal.querySelector('.history-close')?.focus();
  }
  function closeHistory(){const modal=document.getElementById('historyModal');modal?.classList.remove('show');modal?.setAttribute('aria-hidden','true');historyTrigger?.focus()}

  function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
  function downloadCSV(){
    const rows=[];
    document.querySelectorAll('.result-table tr').forEach(tr=>rows.push([...tr.children].map(c=>c.textContent.trim())));
    if(!rows.length){ alert('請先完成計算。'); return; }
    rows.push([],['匯出時間',new Date().toLocaleString('zh-TW')]);
    const blob=new Blob(['\ufeff'+rows.map(r=>r.map(csvEscape).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`options_${pageKey}_${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),300);
  }
  function downloadChart(){
    const plot=document.querySelector('.js-plotly-plot');
    if(plot&&window.Plotly){Plotly.downloadImage(plot,{format:'png',filename:`options_${pageKey}_${new Date().toISOString().slice(0,10)}`,height:720,width:1200});return;}
    const canvas=document.querySelector('canvas');
    if(!canvas){alert('請先產生圖表。');return;}
    const a=document.createElement('a');a.download=`options_${pageKey}_${new Date().toISOString().slice(0,10)}.png`;a.href=canvas.toDataURL('image/png',1);a.click();
  }
  function ensureActions(){
    const host=document.querySelector('.result-panel,.advanced-chart-panel,.strategy-chart-panel,.result-card');
    if(!host||host.querySelector('.export-actions')) return;
    const wrap=document.createElement('div');wrap.className='export-actions';wrap.innerHTML=`<button type="button" class="outline-btn" id="downloadResultBtn">${exportType==='chart'?'下載圖表 PNG':'下載結果 CSV'}</button>`;host.appendChild(wrap);
    wrap.querySelector('button').onclick=exportType==='chart'?downloadChart:downloadCSV;
  }
  document.addEventListener('submit',e=>{if(e.target.matches('form'))setTimeout(()=>{const visibleError=[...document.querySelectorAll('.error-box')].some(x=>!x.hidden&&x.textContent.trim());if(!restoring&&!visibleError)save('計算輸入');ensureActions()},120)} ,true);
  document.addEventListener('click',e=>{const b=e.target.closest('.history-btn,#historyBtn');if(b){e.preventDefault();openHistory()}},true);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-asset],[data-strategy],[data-greek],[data-axis]');if(!b)return;const key=Object.keys(b.dataset)[0];document.querySelectorAll(`[data-${key}]`).forEach(x=>x.setAttribute('aria-pressed',x===b))},true);
  document.addEventListener('keydown',e=>{const modal=document.getElementById('historyModal');if(e.key==='Escape')closeHistory();if(e.key==='Tab'&&modal?.classList.contains('show')){const items=[...modal.querySelectorAll('button,[href],input,select,[tabindex]:not([tabindex="-1"])')];if(!items.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
  window.OptionsUI={saveHistory:save,openHistory,ensureActions,downloadCSV,downloadChart};
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('form').forEach(form=>form.setAttribute('autocomplete','off'));
    document.querySelectorAll('input[type="number"]').forEach(input=>{
      input.value='';
      input.setAttribute('autocomplete','off');
    });
    ensureActions();
  });
  document.querySelectorAll('.result-panel,[id="resultBox"]').forEach(el=>el.setAttribute('aria-live','polite'));
  document.querySelectorAll('[data-asset],[data-strategy],[data-greek],[data-axis]').forEach(el=>el.setAttribute('aria-pressed',el.classList.contains('active')));
})();
