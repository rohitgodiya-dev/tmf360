export default function Research360Page() {
  return (
    <>
      <style>{`
        :root{
          --navy:#0F2A4A;--navy-deep:#0A1E38;--orange:#E8703A;--orange-soft:#FBEAE0;
          --paper:#FAF9F6;--line:#E4E0D8;--ink:#1C2733;--ink-soft:#5B6673;--green:#2E7D5B;--gold:#B08900;
        }
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--paper);color:var(--ink);}
        .topnav{background:#fff;border-bottom:1px solid var(--line);padding:10px 32px;display:flex;align-items:center;justify-content:space-between;}
        .topnav-links{display:flex;gap:26px;font-size:13px;}
        .topnav-links a{color:var(--ink-soft);text-decoration:none;}
        .topnav-links a:hover{color:var(--orange);}
        .topnav-links .active{color:var(--orange);font-weight:600;}
        .topnav-brand{font-family:"Inter",sans-serif;font-weight:700;font-size:18px;color:#0F2A4A;text-decoration:none;}
        .topnav-brand span{color:#E8703A;}
        .hero{background:linear-gradient(180deg,var(--navy) 0%,var(--navy-deep) 100%);padding:38px 32px 46px;color:#fff;}
        .hero-inner{max-width:920px;margin:0 auto;}
        .hero-eyebrow{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--orange);font-weight:700;margin-bottom:8px;}
        .hero h1{font-size:26px;font-weight:600;margin-bottom:6px;}
        .hero p{font-size:13.5px;color:#B9C4D3;margin-bottom:20px;max-width:560px;}
        .search-bar{background:#fff;border-radius:12px;display:flex;align-items:center;padding:6px 6px 6px 16px;box-shadow:0 8px 24px rgba(0,0,0,0.25);}
        .search-bar input{flex:1;border:none;outline:none;font-size:15px;padding:10px 0;color:var(--ink);font-family:inherit;}
        .search-bar input::placeholder{color:#9AA5B1;}
        .search-btn{background:var(--orange);color:#fff;border:none;border-radius:8px;padding:11px 22px;font-size:13.5px;font-weight:700;cursor:pointer;}
        .quick-tags{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;}
        .quick-tag{font-size:11.5px;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,0.08);color:#DCE4EE;cursor:pointer;border:1px solid rgba(255,255,255,0.15);}
        .quick-tag:hover{background:rgba(255,255,255,0.15);}
        .body-wrap{max-width:1180px;margin:0 auto;display:flex;gap:28px;padding:26px 32px 60px;align-items:flex-start;}
        .filters{width:240px;flex-shrink:0;background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;}
        .filters h3{font-size:12.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-soft);margin-bottom:14px;}
        .filter-group{margin-bottom:20px;}
        .filter-group-label{font-size:12.5px;font-weight:700;color:var(--navy);margin-bottom:8px;}
        .filter-opt{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#3B4552;margin-bottom:7px;cursor:pointer;}
        .filter-opt input{accent-color:var(--orange);}
        .results{flex:1;min-width:0;}
        .results-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
        .results-count{font-size:13px;color:var(--ink-soft);}
        .results-count b{color:var(--ink);}
        .sort-select{font-size:12.5px;color:var(--ink-soft);display:flex;align-items:center;gap:6px;}
        .sort-select select{border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:12.5px;font-family:inherit;color:var(--ink);}
        .paper-row{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin-bottom:12px;transition:box-shadow .15s,border-color .15s;}
        .paper-row:hover{box-shadow:0 4px 16px rgba(15,42,74,0.08);border-color:#D8D3C8;}
        .paper-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:6px;}
        .paper-title{font-size:15.5px;font-weight:600;color:var(--navy);line-height:1.35;}
        .paper-title:hover{text-decoration:underline;cursor:pointer;}
        .status-chip{font-size:10.5px;font-weight:700;letter-spacing:.02em;padding:4px 9px;border-radius:6px;white-space:nowrap;flex-shrink:0;}
        .chip-peer{background:#E7F3EC;color:var(--green);}
        .chip-preprint{background:#FBF2DC;color:var(--gold);}
        .paper-authors{font-size:12.5px;color:var(--ink-soft);margin-bottom:6px;}
        .paper-meta-row{display:flex;gap:14px;font-size:11.5px;color:#8B96A3;margin-bottom:10px;flex-wrap:wrap;}
        .paper-meta-row span{display:flex;align-items:center;gap:4px;}
        .relevance-badge{color:var(--orange);font-weight:700;}
        .paper-abstract{font-size:13px;color:#3B4552;line-height:1.6;margin-bottom:12px;}
        .paper-abstract .hl{background:#FDF0E7;color:#B4501E;padding:0 2px;border-radius:2px;font-weight:600;}
        .paper-actions{display:flex;align-items:center;gap:10px;}
        .action-link{font-size:12px;color:var(--navy);text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);padding:6px 12px;border-radius:7px;background:transparent;cursor:pointer;}
        .action-link:hover{background:var(--paper);}
        .action-primary{background:var(--orange);color:#fff;border:none;font-size:12px;font-weight:700;padding:7px 14px;border-radius:7px;cursor:pointer;margin-left:auto;display:inline-flex;align-items:center;gap:5px;}
        .action-primary:hover{background:#D65F2C;}
        .load-more{text-align:center;padding:18px;font-size:13px;color:var(--navy);font-weight:600;cursor:pointer;border:1px dashed var(--line);border-radius:10px;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:6px;}
        .load-more:hover{background:#fff;}
        .icon{width:14px;height:14px;flex-shrink:0;}
        .search-icon{width:18px;height:18px;color:#9AA5B1;margin-right:8px;flex-shrink:0;}
        .filters-title-icon{width:14px;height:14px;margin-right:6px;vertical-align:-2px;}
      `}</style>

      <div className="topnav">
        <a href="/" className="topnav-brand">Trial360 <span>OS</span></a>
        <div className="topnav-links">
          <a href="/">Home</a>
          <a href="/platform">Platform</a>
          <a href="/trialfinder360">Find a Clinical Trial</a>
          <a href="/research360" className="active">Find a Publication</a>
        </div>
      </div>

      <div className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">Research360 — Publication Finder</div>
          <h1>Find the research behind the protocol</h1>
          <p>Search peer-reviewed literature, preprints, and clinical evidence across Europe PMC and CrossRef — free, no account needed.</p>
          <div className="search-bar">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" id="q" placeholder="Search publications, e.g. 'risk-based monitoring oncology trials'…" />
            <button className="search-btn" id="search-btn">Search</button>
          </div>
          <div className="quick-tags">
            <div className="quick-tag" data-q="risk-based monitoring reduced source data verification">Reduced SDV evidence</div>
            <div className="quick-tag" data-q="remote monitoring clinical trial outcomes">Remote monitoring outcomes</div>
            <div className="quick-tag" data-q="phase III oncology trial retention">Phase III oncology retention</div>
            <div className="quick-tag" data-q="decentralized clinical trial design">Decentralized trial design</div>
          </div>
        </div>
      </div>

      <div className="body-wrap">
        <div className="filters">
          <h3>
            <svg className="filters-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Refine results
          </h3>
          <div className="filter-group">
            <div className="filter-group-label">Publication type</div>
            <label className="filter-opt"><input type="checkbox" id="f-peer" defaultChecked /> Peer-reviewed</label>
            <label className="filter-opt"><input type="checkbox" id="f-preprint" defaultChecked /> Preprint</label>
          </div>
          <div className="filter-group">
            <div className="filter-group-label">Date published</div>
            <label className="filter-opt"><input type="radio" name="date" value="12m" /> Last 12 months</label>
            <label className="filter-opt"><input type="radio" name="date" value="5y" defaultChecked /> Last 5 years</label>
            <label className="filter-opt"><input type="radio" name="date" value="all" /> All time</label>
          </div>
          <div className="filter-group">
            <div className="filter-group-label">Source</div>
            <label className="filter-opt"><input type="checkbox" id="f-europepmc" defaultChecked /> Europe PMC</label>
            <label className="filter-opt"><input type="checkbox" id="f-crossref" defaultChecked /> CrossRef</label>
          </div>
        </div>

        <div className="results">
          <div className="results-head">
            <div className="results-count" id="results-count">Search peer-reviewed literature, preprints, and clinical evidence — free, no account needed.</div>
            <div className="sort-select">Sort by
              <select id="sort-select">
                <option value="relevance">Relevance</option>
                <option value="recent">Most recent</option>
                <option value="cited">Most cited</option>
              </select>
            </div>
          </div>
          <div id="results-list"></div>
          <div className="load-more" id="load-more-btn" style={{display:"none"}}>
            Load more results
            <svg style={{width:"14px",height:"14px"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{__html:`
        const qInput = document.getElementById('q');
        const searchBtn = document.getElementById('search-btn');
        const resultsList = document.getElementById('results-list');
        const resultsCount = document.getElementById('results-count');
        const loadMoreBtn = document.getElementById('load-more-btn');
        const sortSelect = document.getElementById('sort-select');
        const peerCb = document.getElementById('f-peer');
        const preprintCb = document.getElementById('f-preprint');
        const epmcCb = document.getElementById('f-europepmc');
        const crossrefCb = document.getElementById('f-crossref');
        let allPapers = [];
        let lastQuery = '';
        let shownCount = 4;
        const BATCH = 4;
        function getSaved(){try{return JSON.parse(localStorage.getItem('research360_saved')||'{}');}catch(e){return{};}}
        function setSaved(obj){localStorage.setItem('research360_saved',JSON.stringify(obj));}
        function escapeHtml(str){return(str||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
        function highlightTerms(text,query){
          if(!text)return'';
          const terms=query.toLowerCase().split(/\\s+/).filter(t=>t.length>3);
          let escaped=escapeHtml(text);
          terms.forEach(t=>{const re=new RegExp('('+t.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')+')','gi');escaped=escaped.replace(re,'<span class="hl">$1</span>');});
          return escaped;
        }
        function passesDateFilter(pubYear){
          const dateOpt=document.querySelector('input[name="date"]:checked').value;
          if(dateOpt==='all'||!pubYear)return true;
          const age=new Date().getFullYear()-parseInt(pubYear,10);
          if(dateOpt==='12m')return age<=1;
          if(dateOpt==='5y')return age<=5;
          return true;
        }
        function applyFiltersAndSort(){
          let filtered=allPapers.filter(p=>{
            if(p.isPeerReviewed&&!peerCb.checked)return false;
            if(p.isPreprint&&!preprintCb.checked)return false;
            if(p.sourceApi==='europepmc'&&!epmcCb.checked)return false;
            if(p.sourceApi==='crossref'&&!crossrefCb.checked)return false;
            if(!passesDateFilter(p.pubYear))return false;
            return true;
          });
          const sortBy=sortSelect.value;
          if(sortBy==='recent')filtered.sort((a,b)=>(parseInt(b.pubYear)||0)-(parseInt(a.pubYear)||0));
          else if(sortBy==='cited')filtered.sort((a,b)=>(b.citedByCount||0)-(a.citedByCount||0));
          else filtered.sort((a,b)=>(b.relevance||0)-(a.relevance||0));
          return filtered;
        }
        function paperCardHtml(p){
          const key=p.doi||p.title;
          const saved=!!getSaved()[key];
          const chip=p.isPeerReviewed?'<span class="status-chip chip-peer">PEER-REVIEWED</span>':(p.isPreprint?'<span class="status-chip chip-preprint">PREPRINT</span>':'');
          const abstract=p.abstract?highlightTerms(p.abstract.slice(0,340)+(p.abstract.length>340?'\\u2026':''),lastQuery):'';
          return '<div class="paper-row"><div class="paper-top"><div class="paper-title">'+escapeHtml(p.title)+'</div>'+chip+'</div>'+(p.authors?'<div class="paper-authors">'+escapeHtml(p.authors)+'</div>':'')+'<div class="paper-meta-row">'+(p.journal?'<span>'+escapeHtml(p.journal)+'</span>':'')+(p.pubYear?'<span>'+escapeHtml(p.pubYear)+'</span>':'')+(p.doi?'<span>DOI: '+escapeHtml(p.doi)+'</span>':'')+(p.citedByCount?'<span>Cited by '+p.citedByCount+'</span>':'')+'<span class="relevance-badge">'+Math.round((p.relevance||0)*100)+'% relevance</span></div>'+(abstract?'<div class="paper-abstract">'+abstract+'</div>':'')+'<div class="paper-actions">'+(p.url?'<a class="action-link" href="'+p.url+'" target="_blank" rel="noreferrer">View source</a>':'')+'<button class="action-link js-cite" data-key="'+escapeHtml(key)+'">Cite</button><button class="action-primary js-save" data-key="'+escapeHtml(key)+'" '+(saved?'disabled':'')+' style="'+(saved?'background:#2E7D5B;':'')+'">'+( saved?'Saved':'Save')+'</button></div></div>';
        }
        function render(){
          const filtered=applyFiltersAndSort();
          if(filtered.length===0){resultsCount.innerHTML=allPapers.length===0?'Search peer-reviewed literature, preprints, and clinical evidence — free, no account needed.':'No results match your filters.';resultsList.innerHTML='';loadMoreBtn.style.display='none';return;}
          resultsCount.innerHTML='<b>'+filtered.length+'</b> results for "'+escapeHtml(lastQuery)+'"';
          resultsList.innerHTML=filtered.slice(0,shownCount).map(paperCardHtml).join('');
          loadMoreBtn.style.display=filtered.length>shownCount?'flex':'none';
          resultsList.querySelectorAll('.js-save').forEach(btn=>{btn.addEventListener('click',()=>{const key=btn.dataset.key;const paper=allPapers.find(p=>(p.doi||p.title)===key);const saved=getSaved();saved[key]=paper;setSaved(saved);btn.disabled=true;btn.style.background='#2E7D5B';btn.textContent='Saved';});});
          resultsList.querySelectorAll('.js-cite').forEach(btn=>{btn.addEventListener('click',()=>{const key=btn.dataset.key;const paper=allPapers.find(p=>(p.doi||p.title)===key);const citation=(paper.authors||'')+' ('+(paper.pubYear||'n.d.')+''). '+paper.title+'. '+(paper.journal||'')+'. '+(paper.doi?'https://doi.org/'+paper.doi:paper.url||'');navigator.clipboard.writeText(citation.trim()).then(()=>{btn.textContent='Copied!';setTimeout(()=>{btn.textContent='Cite';},1500);});});});
        }
        async function runSearch(query){
          if(!query||!query.trim())return;
          lastQuery=query;shownCount=BATCH;
          resultsCount.textContent='Searching\\u2026';resultsList.innerHTML='';loadMoreBtn.style.display='none';
          try{
            const res=await fetch('/api/research360',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,mode:'publication'})});
            const data=await res.json();
            if(data.error){resultsCount.textContent=data.error;return;}
            allPapers=data.papers||[];render();
          }catch(e){resultsCount.textContent='Search failed. Please try again.';}
        }
        searchBtn.addEventListener('click',()=>runSearch(qInput.value));
        qInput.addEventListener('keydown',e=>{if(e.key==='Enter')runSearch(qInput.value);});
        document.querySelectorAll('.quick-tag').forEach(tag=>{tag.addEventListener('click',()=>{qInput.value=tag.dataset.q;runSearch(tag.dataset.q);});});
        [peerCb,preprintCb,epmcCb,crossrefCb,sortSelect].forEach(el=>el.addEventListener('change',render));
        document.querySelectorAll('input[name="date"]').forEach(el=>el.addEventListener('change',render));
        loadMoreBtn.addEventListener('click',()=>{shownCount+=BATCH;render();});
      `}} />
    </>
  );
}