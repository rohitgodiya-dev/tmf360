import{NextRequest,NextResponse}from"next/server";

export async function POST(req:NextRequest){
  try{
    const{pdfBase64,fileName,orgId,studyId,vaultDocId}=await req.json();

    const res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY||"","anthropic-version":"2023-06-01"},
      body:JSON.stringify({
        model:"claude-sonnet-4-6",
        max_tokens:2000,
        messages:[{role:"user",content:[
          {type:"document",source:{type:"base64",media_type:"application/pdf",data:pdfBase64}},
          {type:"text",text:`You are extracting the study identity profile from a clinical trial Protocol document. Extract ALL of the following fields with maximum precision. Return ONLY valid JSON:\n{\n"protocol_number":"exact protocol number as written on the document",\n"sponsor_name":"full sponsor organisation name",\n"study_title":"full official study title",\n"short_title":"study acronym or short title if present",\n"phase":"trial phase",\n"imp_name":"investigational medicinal product name",\n"imp_dose":"dose and route of administration",\n"indication":"disease or condition",\n"primary_endpoint":"primary efficacy endpoint",\n"secondary_endpoints":["list of secondary endpoints"],\n"study_duration":"overall study duration",\n"planned_sites":["list of planned investigation site numbers or countries"],\n"countries":["list of countries where trial will be conducted"],\n"planned_subjects":"number of planned subjects",\n"irb_names":["names of IRBs/IECs if mentioned"],\n"key_milestones":["FPFV","LPLV","database lock","CSR","any other milestones mentioned with timeframes"],\n"expected_documents":["any documents explicitly required by the protocol e.g. DSMB reports, safety reviews, interim analyses"],\n"has_dsmb":true,\n"is_blinded":true,\n"is_device_trial":false,\n"is_paediatric":false,\n"regulatory_references":["ICH E6R3","21 CFR Part 11","any regulations explicitly cited"]\n}\nBe precise. Extract exact values as written. Use null for fields not found.`}
        ]}]
      }),
    });

    const data=await res.json();
    const raw=data.content?.[0]?.text||"{}";
    let identity:any={};
    try{identity=JSON.parse(raw.replace(/```json|```/g,"").trim());}catch{identity={};}

    return NextResponse.json({identity,orgId,studyId,vaultDocId});
  }catch(error:any){
    return NextResponse.json({error:error.message},{status:500});
  }
}