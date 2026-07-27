(function(){
  var qInput=document.getElementById('q');
  var searchBtn=document.getElementById('search-btn');
  var resultsList=document.getElementById('results-list');
  var resultsCount=document.getElementById('results-count');
  var loadMoreBtn=document.getElementById('load-more-btn');
  var sortSelect=document.getElementById('sort-select');
  var peerCb=document.getElementById('f-peer');
  var preprintCb=document.getElementById('f-preprint');
  var epmcCb=document.getElementById('f-europepmc');
  var crossrefCb=document.getElementById('f-crossref');
  var allPapers=[];
  var lastQuery='';
  var shownCount=4;
  var BATCH=4;

  function getSaved(){try{return JSON.parse(localStorage.getItem('research360_saved')||'{}');}catch(e){return{};}}
  function setSaved(obj){localStorage.setItem('research360_saved',JSON.stringify(obj));}

  function escapeHtml(str){
    return(str||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
  }

  function highlightTerms(text,query){
    if(!text)return'';
    var terms=query.toLowerCase().split(/\s+/).filter(function(t){return t.length>3;});
    var escaped=escapeHtml(text);
    terms.forEach(function(t){
      var safe=t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      var re=new RegExp('('+safe+')','gi');
      escaped=escaped.replace(re,'<span class="hl">$1</span>');
    });
    return escaped;
  }

  function passesDateFilter(pubYear){
    var checked=document.querySelector('input[name="date"]:checked');
    var dateOpt=checked?checked.value:'5y';
    if(dateOpt==='all'||!pubYear)return true;
    var age=new Date().getFullYear()-parseInt(pubYear,10);
    if(dateOpt==='12m')return age<=1;
    if(dateOpt==='5y')return age<=5;
    return true;
  }

  function applyFiltersAndSort(){
    var filtered=allPapers.filter(function(p){
      if(p.isPeerReviewed&&!peerCb.checked)return false;
      if(p.isPreprint&&!preprintCb.checked)return false;
      if(p.sourceApi==='europepmc'&&!epmcCb.checked)return false;
      if(p.sourceApi==='crossref'&&!crossrefCb.checked)return false;
      if(!passesDateFilter(p.pubYear))return false;
      return true;
    });
    var sortBy=sortSelect.value;
    if(sortBy==='recent')filtered.sort(function(a,b){return(parseInt(b.pubYear)||0)-(parseInt(a.pubYear)||0);});
    else if(sortBy==='cited')filtered.sort(function(a,b){return(b.citedByCount||0)-(a.citedByCount||0);});
    else filtered.sort(function(a,b){return(b.relevance||0)-(a.relevance||0);});
    return filtered;
  }

  function paperCardHtml(p){
    var key=p.doi||p.title;
    var saved=!!getSaved()[key];
    var chip=p.isPeerReviewed?'<span class="status-chip chip-peer">PEER-REVIEWED</span>':(p.isPreprint?'<span class="status-chip chip-preprint">PREPRINT</span>':'');
    var abstract=p.abstract?highlightTerms(p.abstract.slice(0,340)+(p.abstract.length>340?'\u2026':''),lastQuery):'';
    return '<div class="paper-row">'+
      '<div class="paper-top"><div class="paper-title">'+escapeHtml(p.title)+'</div>'+chip+'</div>'+
      (p.authors?'<div class="paper-authors">'+escapeHtml(p.authors)+'</div>':'')+
      '<div class="paper-meta-row">'+
        (p.journal?'<span>'+escapeHtml(p.journal)+'</span>':'')+
        (p.pubYear?'<span>'+escapeHtml(p.pubYear)+'</span>':'')+
        (p.doi?'<span>DOI: '+escapeHtml(p.doi)+'</span>':'')+
        (p.citedByCount?'<span>Cited by '+p.citedByCount+'</span>':'')+
        '<span class="relevance-badge">'+Math.round((p.relevance||0)*100)+'% relevance</span>'+
      '</div>'+
      (abstract?'<div class="paper-abstract">'+abstract+'</div>':'')+
      '<div class="paper-actions">'+
        (p.url?'<a class="action-link" href="'+p.url+'" target="_blank" rel="noreferrer">View source</a>':'')+
        '<button class="action-link js-cite" data-key="'+escapeHtml(key)+'">Cite</button>'+
        '<button class="action-primary js-save" data-key="'+escapeHtml(key)+'" '+(saved?'disabled':'')+' style="'+(saved?'background:#2E7D5B;':'')+'">'+( saved?'Saved':'Save')+'</button>'+
      '</div>'+
    '</div>';
  }

  function render(){
    var filtered=applyFiltersAndSort();
    if(filtered.length===0){
      resultsCount.innerHTML=allPapers.length===0
        ?'Search peer-reviewed literature, preprints, and clinical evidence \u2014 free, no account needed.'
        :'No results match your filters.';
      resultsList.innerHTML='';
      loadMoreBtn.style.display='none';
      return;
    }
    resultsCount.innerHTML='<b>'+filtered.length+'</b> results for "'+escapeHtml(lastQuery)+'"';
    resultsList.innerHTML=filtered.slice(0,shownCount).map(paperCardHtml).join('');
    loadMoreBtn.style.display=filtered.length>shownCount?'flex':'none';
    resultsList.querySelectorAll('.js-save').forEach(function(btn){
      btn.addEventListener('click',function(){
        var key=btn.dataset.key;
        var paper=allPapers.find(function(p){return(p.doi||p.title)===key;});
        var saved=getSaved();saved[key]=paper;setSaved(saved);
        btn.disabled=true;btn.style.background='#2E7D5B';btn.textContent='Saved';
      });
    });
    resultsList.querySelectorAll('.js-cite').forEach(function(btn){
      btn.addEventListener('click',function(){
        var key=btn.dataset.key;
        var paper=allPapers.find(function(p){return(p.doi||p.title)===key;});
        var citation=(paper.authors||'')+' ('+(paper.pubYear||'n.d.')+''). '+paper.title+'. '+(paper.journal||'')+'. '+(paper.doi?'https://doi.org/'+paper.doi:paper.url||'');
        navigator.clipboard.writeText(citation.trim()).then(function(){
          btn.textContent='Copied!';setTimeout(function(){btn.textContent='Cite';},1500);
        });
      });
    });
  }

  function runSearch(query){
    if(!query||!query.trim())return;
    lastQuery=query;shownCount=BATCH;
    resultsCount.textContent='Searching\u2026';resultsList.innerHTML='';loadMoreBtn.style.display='none';
    fetch('/api/research360',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:query,mode:'publication'})})
      .then(function(res){return res.json();})
      .then(function(data){
        if(data.error){resultsCount.textContent=data.error;return;}
        allPapers=data.papers||[];render();
      })
      .catch(function(){resultsCount.textContent='Search failed. Please try again.';});
  }

  searchBtn.addEventListener('click',function(){runSearch(qInput.value);});
  qInput.addEventListener('keydown',function(e){if(e.key==='Enter')runSearch(qInput.value);});
  document.querySelectorAll('.quick-tag').forEach(function(tag){
    tag.addEventListener('click',function(){qInput.value=tag.dataset.q;runSearch(tag.dataset.q);});
  });
  [peerCb,preprintCb,epmcCb,crossrefCb,sortSelect].forEach(function(el){el.addEventListener('change',render);});
  document.querySelectorAll('input[name="date"]').forEach(function(el){el.addEventListener('change',render);});
  loadMoreBtn.addEventListener('click',function(){shownCount+=BATCH;render();});
})();