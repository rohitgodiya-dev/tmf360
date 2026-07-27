export default function Research360Page() {
  return (
    <>
      <style>{`
        :root{--navy:#0F2A4A;--navy-deep:#0A1E38;--orange:#E8703A;--orange-soft:#FBEAE0;--paper:#FAF9F6;--line:#E4E0D8;--ink:#1C2733;--ink-soft:#5B6673;--green:#2E7D5B;--gold:#B08900;}
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
            <input type="text" id="q" placeholder="Search publications, e.g. 'risk-based monitoring oncology trials'" />
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

      <script src="/research360-client.js" defer></script>
    </>
  );
}