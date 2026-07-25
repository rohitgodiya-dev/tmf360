import{NextRequest,NextResponse}from"next/server";

export async function POST(req:NextRequest){
  try{
    const{pdfBase64,fileName}=await req.json();
    if(!pdfBase64)return NextResponse.json({error:"No file provided"},{status:400});

    // Use Claude to extract text from the PDF
    const response=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "x-api-key":process.env.ANTHROPIC_API_KEY||"",
        "anthropic-version":"2023-06-01",
      },
      body:JSON.stringify({
        model:"claude-sonnet-4-6",
        max_tokens:4000,
        messages:[{
          role:"user",
          content:[
            {
              type:"document",
              source:{type:"base64",media_type:"application/pdf",data:pdfBase64},
            },
            {
              type:"text",
              text:`Extract all meaningful text from this document. Include: title, version, date, sponsor name, study ID, protocol number, objectives, endpoints, study design, sites, countries, investigational product, dosing, inclusion/exclusion criteria, and any other key clinical trial information. Format as clean readable text. Do not summarise — extract the actual content.`,
            },
          ],
        }],
      }),
    });

    const data=await response.json();
    const text=data.content?.[0]?.text||"";
    return NextResponse.json({text,fileName});
  }catch(error:any){
    return NextResponse.json({error:error.message},{status:500});
  }
}
