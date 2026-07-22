import{NextRequest,NextResponse}from"next/server";
import{createClient}from"@supabase/supabase-js";

const supabase=createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req:NextRequest){
  try{
    const{org_name,email,created_by,secret}=await req.json();

    // Simple secret key check — change this to your own secret
    if(secret!==process.env.TOKEN_GENERATOR_SECRET){
      return NextResponse.json({error:"Unauthorized"},{ status:401});
    }

    // Generate a random token
    const token=crypto.randomUUID().replace(/-/g,"")+crypto.randomUUID().replace(/-/g,"");

    // Set expiry to 7 days from now
    const expires_at=new Date(Date.now()+7*24*60*60*1000).toISOString();

    const{data,error}=await supabase.from("signup_tokens").insert([{
      token,
      org_name:org_name||"",
      email:email||"",
      expires_at,
      created_by:created_by||"admin",
    }]).select().single();

    if(error)return NextResponse.json({error:error.message},{status:500});

    const signupUrl=`${process.env.NEXT_PUBLIC_APP_URL}/signup?token=${token}`;

    return NextResponse.json({
      token,
      signup_url:signupUrl,
      expires_at,
      org_name,
      email,
    });
  }catch(e:any){
    return NextResponse.json({error:e.message},{status:500});
  }
}