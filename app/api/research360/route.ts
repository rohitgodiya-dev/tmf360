import{NextRequest,NextResponse}from"next/server";
const REG_KEYWORDS=["ich","fda","ema","cfr","21 cfr","gcp","iso 14155","guidance","regulation","regulatory","directive","authority"];
function detectMode(query:string,requested?:string):"regulatory"|"publication"{
  if(requested==="regulatory"||requested==="publication")return requested;
  const q=query.toLowerCase();
  const hits=REG_KEYWORDS.filter(k=>q.includes(k)).length;
  return hits>=1?"regulatory":"publication";
}
async function searchEuropePMC(query:string){
  const url=`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=15&resultType=core`;
  const res=await fetch(url);
  if(!res.ok)return[];
  const data=await res.json();
  const results=data?.resultList?.result||[];
  return results.map((r:any)=>({
    title:r.title||"Untitled",
    authors:r.authorString||"",
    journal:r.journalTitle||r.bookOrReportDetails?.publisher||"",
    pubYear:r.pubYear||"",
    doi:r.doi||"",
    pmid:r.pmid||"",
    abstract:r.abstractText||"",
    isPeerReviewed:!!(r.pubType&&!/preprint/i.test(r.pubType))&&r.inEPMC==="Y",
    isPreprint:/preprint/i.test(r.pubType||"")||r.source==="PPR",
    url:r.doi?`https://doi.org/${r.doi}`:(r.pmid?`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`:""),
    sourceApi:"europepmc",
    citedByCount:r.citedByCount||0,
  }));
}
async function searchCrossRef(query:string){
  const url=`https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=10`;
  const res=await fetch(url,{headers:{"User-Agent":"TMF360-Research360/1.0 (mailto:support@tmf360.app)"}});
  if(!res.ok)return[];
  const data=await res.json();
  const items=data?.message?.items||[];
  return items.map((r:any)=>({
    title:(r.title&&r.title[0])||"Untitled",
    authors:(r.author||[]).map((a:any)=>`${a.given||""} ${a.family||""}`.trim()).join(", "),
    journal:(r["container-title"]&&r["container-title"][0])||"",
    pubYear:String(r["published"]?.["date-parts"]?.[0]?.[0]||""),
    doi:r.DOI||"",
    pmid:"",
    abstract:(r.abstract||"").replace(/<[^>]+>/g,""),
    isPeerReviewed:r.type==="journal-article",
    isPreprint:r.type==="posted-content",
    url:r.URL||(r.DOI?`https://doi.org/${r.DOI}`:""),
    sourceApi:"crossref",
    citedByCount:r["is-referenced-by-count"]||0,
  }));
}
async function searchPubMed(query:string){
  const esearchUrl=`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=15&sort=relevance`;
  const esearchRes=await fetch(esearchUrl);
  if(!esearchRes.ok)return[];
  const esearchData=await esearchRes.json();
  const ids:string[]=esearchData?.esearchresult?.idlist||[];
  if(ids.length===0)return[];
  const esummaryUrl=`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`;
  const esummaryRes=await fetch(esummaryUrl);
  const esummaryData=await esummaryRes.json();
  const result=esummaryData?.result||{};
  let abstracts:Record<string,string>={};
  try{
    const efetchUrl=`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&rettype=abstract&retmode=xml`;
    const efetchRes=await fetch(efetchUrl);
    const xml=await efetchRes.text();
    const articles=xml.split("<PubmedArticle>").slice(1);
    for(const art of articles){
      const pmidMatch=art.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const absMatch=art.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);
      if(pmidMatch)abstracts[pmidMatch[1]]=absMatch?absMatch[1].replace(/<[^>]+>/g,""):"";
    }
  }catch{}
  return ids.map((id:string)=>{
    const r=result[id];
    if(!r)return null;
    const doiEntry=(r.articleids||[]).find((a:any)=>a.idtype==="doi");
    return{
      title:r.title||"Untitled",
      authors:(r.authors||[]).map((a:any)=>a.name).join(", "),
      journal:r.fulljournalname||r.source||"",
      pubYear:(r.pubdate||"").slice(0,4),
      doi:doiEntry?doiEntry.value:"",
      pmid:id,
      abstract:abstracts[id]||"",
      isPeerReviewed:true,
      isPreprint:false,
      url:doiEntry?`https://doi.org/${doiEntry.value}`:`https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      sourceApi:"pubmed",
      citedByCount:0,
    };
  }).filter(Boolean);
}
function dedupeByDoi(papers:any[]){
  const seen=new Set<string>();
  const out:any[]=[];
  for(const p of papers){
    const key=(p.doi||p.title).toLowerCase().trim();
    if(seen.has(key))continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
function rankPapers(papers:any[],query:string){
  const terms=query.toLowerCase().split(/\s+/).filter(t=>t.length>2);
  return papers.map(p=>{
    const hay=`${p.title} ${p.abstract}`.toLowerCase();
    let score=terms.reduce((s,t)=>s+(hay.includes(t)?1:0),0)/Math.max(terms.length,1);
    if(p.pubYear){const age=new Date().getFullYear()-parseInt(p.pubYear);if(age<=3)score+=0.15;else if(age<=6)score+=0.05;}
    if(p.citedByCount>50)score+=0.1;
    if(p.isPeerReviewed)score+=0.05;
    return{...p,relevance:Math.max(0,Math.min(1,score))};
  }).sort((a,b)=>b.relevance-a.relevance);
}
async function handlePublicationSearch(query:string){
  const[epmc,crossref,pubmed]=await Promise.all([
    searchEuropePMC(query).catch(()=>[]),
    searchCrossRef(query).catch(()=>[]),
    searchPubMed(query).catch(()=>[]),
  ]);
  const merged=dedupeByDoi([...epmc,...crossref,...pubmed]);
  const ranked=rankPapers(merged,query);
  return ranked.slice(0,25);
}
async function handleRegulatorySearch(query:string,studyContext?:string){
  const response=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY||"","anthropic-version":"2023-06-01"},
    body:JSON.stringify({
      model:"claude-sonnet-4-6",
      max_tokens:2000,
      system:`You are Research360, a regulatory guidance research assistant for clinical research professionals. Answer questions about ICH, FDA, EMA, ISO 14155, and GCP guidance. Always cite the specific document, section, and a source URL when you reference guidance. Be concise and precise — do not pad with generic disclaimers. If you cannot find a verifiable source, say so rather than inventing one.${studyContext?`\n\nStudy context: ${studyContext}`:""}`,
      messages:[{role:"user",content:query}],
      tools:[{type:"web_search_20250305",name:"web_search"}],
    }),
  });
  const data=await response.json();
  const textBlocks=(data.content||[]).filter((b:any)=>b.type==="text").map((b:any)=>b.text);
  const answer=textBlocks.join("\n\n");
  const sources:any[]=[];
  for(const block of data.content||[]){
    if(block.type==="web_search_tool_result"&&Array.isArray(block.content)){
      for(const item of block.content){
        if(item.url)sources.push({title:item.title||item.url,url:item.url});
      }
    }
  }
  return{answer,sources};
}
export async function POST(req:NextRequest){
  try{
    const{query,mode:requestedMode,orgId,studyId,studyContext,userId,userEmail}=await req.json();
    if(!query||typeof query!=="string")return NextResponse.json({error:"Query is required"},{status:400});
    const mode=detectMode(query,requestedMode);
    let result:any;
    if(mode==="publication"){
      const papers=await handlePublicationSearch(query);
      result={mode,papers};
    }else{
      const{answer,sources}=await handleRegulatorySearch(query,studyContext);
      result={mode,answer,sources};
    }
    if(orgId&&userId){
      try{
        const{createClient}=await import("@supabase/supabase-js");
        const supabaseAdmin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
        await supabaseAdmin.from("research360_queries").insert({
          org_id:orgId,
          study_id:studyId||null,
          user_id:userId,
          user_email:userEmail||null,
          query_text:query,
          mode,
          response_summary:mode==="publication"?`${result.papers.length} papers found`:result.answer?.slice(0,300),
          sources:mode==="publication"?result.papers.slice(0,10):result.sources,
        });
      }catch(logErr){
        console.error("Research360 query logging failed:",logErr);
      }
    }
    return NextResponse.json(result);
  }catch(error:any){
    console.error("Research360 error:",error);
    return NextResponse.json({error:error.message},{status:500});
  }
}