"use client";
import{useState,useEffect,Suspense}from"react";
import{supabase}from"../../lib/supabase";
import{useRouter,useSearchParams}from"next/navigation";

function SignupContent(){
  const router=useRouter();
  const searchParams=useSearchParams();
  const token=searchParams.get("token")||"";

  const[step,setStep]=useState<"validating"|"invalid"|"expired"|"used"|"form"|"success">("validating");
  const[tokenData,setTokenData]=useState<any>(null);
  const[fullName,setFullName]=useState("");
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[confirmPassword,setConfirmPassword]=useState("");
  const[showPwd,setShowPwd]=useState(false);
  const[showConfirm,setShowConfirm]=useState(false);
  const[error,setError]=useState("");
  const[loading,setLoading]=useState(false);

  const P={
    primary:"#F97316",primaryLight:"#FFEDD5",
    text:"#111827",textSec:"#374151",textTert:"#6B7280",
    bg:"#FFFFFF",bgSec:"#F9FAFB",
    border:"#E5E7EB",
    success:"#10B981",successLight:"#ECFDF5",
    danger:"#EF4444",dangerLight:"#FEF2F2",
  };

  useEffect(()=>{
    if(!token){setStep("invalid");return;}
    validateToken();
  },[token]);

  async function validateToken(){
    const{data,error}=await supabase.from("signup_tokens").select("*").eq("token",token).single();
    if(error||!data){setStep("invalid");return;}
    if(data.used_at){setStep("used");return;}
    if(new Date(data.expires_at)<new Date()){setStep("expired");return;}
    setTokenData(data);
    if(data.email)setEmail(data.email);
    setStep("form");
  }

  async function handleSignup(){
    setError("");
    if(!fullName.trim()){setError("Please enter your full name.");return;}
    if(!email.trim()){setError("Please enter your email address.");return;}
    if(!password){setError("Please enter a password.");return;}
    if(password.length<8){setError("Password must be at least 8 characters.");return;}
    if(password!==confirmPassword){setError("Passwords do not match.");return;}
    setLoading(true);
    try{
      // Create auth account
      const{data:authData,error:signUpError}=await supabase.auth.signUp({
        email:email.trim(),
        password,
        options:{data:{full_name:fullName.trim()}}
      });
      if(signUpError){setError(signUpError.message);setLoading(false);return;}
      if(!authData.user){setError("Account creation failed. Please try again.");setLoading(false);return;}

      // Mark token as used
      await supabase.from("signup_tokens").update({used_at:new Date().toISOString()}).eq("token",token);

      setStep("success");
      // Sign in and redirect to setup
      const{error:signInError}=await supabase.auth.signInWithPassword({email:email.trim(),password});
      if(!signInError){
        setTimeout(()=>router.push("/setup"),1500);
      }
    }catch(e:any){
      setError(e.message||"Something went wrong.");
    }
    setLoading(false);
  }

  const inputStyle={
    width:"100%",fontSize:"13px",
    padding:"10px 12px",
    border:`1px solid ${P.border}`,
    borderRadius:"8px",
    outline:"none",
    fontFamily:"inherit",
    color:P.text,
    background:P.bg,
  };

  if(step==="validating")return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${P.primaryLight} 0%,#fff 100%)`}}>
      <div style={{textAlign:"center",color:P.textTert,fontSize:"13px"}}>Validating your invitation...</div>
    </div>
  );

  if(step==="invalid")return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${P.primaryLight} 0%,#fff 100%)`}}>
      <div style={{background:P.bg,border:`1px solid ${P.border}`,borderRadius:"16px",padding:"2rem",width:"380px",textAlign:"center"}}>
        <div style={{fontSize:"24px",fontWeight:"700",color:P.text,marginBottom:"8px"}}>TMF<span style={{color:P.primary}}>360</span></div>
        <div style={{fontSize:"32px",marginBottom:"12px"}}>❌</div>
        <div style={{fontSize:"16px",fontWeight:"600",color:P.text,marginBottom:"8px"}}>Invalid Invitation</div>
        <div style={{fontSize:"13px",color:P.textTert}}>This signup link is invalid or does not exist. Please contact your administrator for a new invitation.</div>
      </div>
    </div>
  );

  if(step==="expired")return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${P.primaryLight} 0%,#fff 100%)`}}>
      <div style={{background:P.bg,border:`1px solid ${P.border}`,borderRadius:"16px",padding:"2rem",width:"380px",textAlign:"center"}}>
        <div style={{fontSize:"24px",fontWeight:"700",color:P.text,marginBottom:"8px"}}>TMF<span style={{color:P.primary}}>360</span></div>
        <div style={{fontSize:"32px",marginBottom:"12px"}}>⏰</div>
        <div style={{fontSize:"16px",fontWeight:"600",color:P.text,marginBottom:"8px"}}>Invitation Expired</div>
        <div style={{fontSize:"13px",color:P.textTert}}>This signup link has expired. Signup links are valid for 7 days. Please contact your administrator for a new invitation.</div>
      </div>
    </div>
  );

  if(step==="used")return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${P.primaryLight} 0%,#fff 100%)`}}>
      <div style={{background:P.bg,border:`1px solid ${P.border}`,borderRadius:"16px",padding:"2rem",width:"380px",textAlign:"center"}}>
        <div style={{fontSize:"24px",fontWeight:"700",color:P.text,marginBottom:"8px"}}>TMF<span style={{color:P.primary}}>360</span></div>
        <div style={{fontSize:"32px",marginBottom:"12px"}}>✅</div>
        <div style={{fontSize:"16px",fontWeight:"600",color:P.text,marginBottom:"8px"}}>Already Used</div>
        <div style={{fontSize:"13px",color:P.textTert,marginBottom:"1rem"}}>This signup link has already been used. Your account may already exist.</div>
        <button onClick={()=>router.push("/platform")} style={{fontSize:"13px",padding:"8px 20px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Go to Login</button>
      </div>
    </div>
  );

  if(step==="success")return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${P.primaryLight} 0%,#fff 100%)`}}>
      <div style={{background:P.bg,border:`1px solid ${P.border}`,borderRadius:"16px",padding:"2rem",width:"380px",textAlign:"center"}}>
        <div style={{fontSize:"24px",fontWeight:"700",color:P.text,marginBottom:"8px"}}>TMF<span style={{color:P.primary}}>360</span></div>
        <div style={{fontSize:"32px",marginBottom:"12px"}}>🎉</div>
        <div style={{fontSize:"16px",fontWeight:"600",color:P.text,marginBottom:"8px"}}>Account Created!</div>
        <div style={{fontSize:"13px",color:P.textTert}}>Redirecting you to set up your organisation...</div>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${P.primaryLight} 0%,#fff 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <div style={{background:P.bg,border:`1px solid ${P.border}`,borderRadius:"16px",padding:"2rem",width:"420px",boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:"26px",fontWeight:"700",color:P.text,marginBottom:"4px"}}>TMF<span style={{color:P.primary}}>360</span></div>
          <div style={{fontSize:"13px",color:P.textTert}}>Trial Master File Platform</div>
          {tokenData?.org_name&&<div style={{fontSize:"12px",color:P.primary,fontWeight:"500",marginTop:"6px",padding:"4px 12px",background:P.primaryLight,borderRadius:"20px",display:"inline-block"}}>Setting up: {tokenData.org_name}</div>}
        </div>

        <div style={{fontSize:"18px",fontWeight:"600",color:P.text,marginBottom:"4px"}}>Create your account</div>
        <div style={{fontSize:"12px",color:P.textTert,marginBottom:"1.5rem"}}>You've been invited to TMF360. Set up your account to get started.</div>

        {error&&<div style={{fontSize:"12px",marginBottom:"12px",padding:"10px 12px",borderRadius:"8px",background:P.dangerLight,color:P.danger}}>{error}</div>}

        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <div>
            <label style={{fontSize:"11px",fontWeight:"600",color:P.textSec,display:"block",marginBottom:"5px"}}>Full Name <span style={{color:P.danger}}>*</span></label>
            <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="e.g. Jane Smith" style={inputStyle}/>
          </div>
          <div>
            <label style={{fontSize:"11px",fontWeight:"600",color:P.textSec,display:"block",marginBottom:"5px"}}>Work Email <span style={{color:P.danger}}>*</span></label>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@organisation.com" style={inputStyle} disabled={!!tokenData?.email}/>
            {tokenData?.email&&<div style={{fontSize:"10px",color:P.textTert,marginTop:"3px"}}>Email pre-filled from your invitation</div>}
          </div>
          <div>
            <label style={{fontSize:"11px",fontWeight:"600",color:P.textSec,display:"block",marginBottom:"5px"}}>Password <span style={{color:P.danger}}>*</span></label>
            <div style={{position:"relative" as const}}>
              <input value={password} onChange={e=>setPassword(e.target.value)} type={showPwd?"text":"password"} placeholder="Min 8 characters" style={{...inputStyle,paddingRight:"40px"}}/>
              <button onClick={()=>setShowPwd(!showPwd)} style={{position:"absolute" as const,right:"10px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"13px",color:P.textTert}}>{showPwd?"🙈":"👁️"}</button>
            </div>
          </div>
          <div>
            <label style={{fontSize:"11px",fontWeight:"600",color:P.textSec,display:"block",marginBottom:"5px"}}>Confirm Password <span style={{color:P.danger}}>*</span></label>
            <div style={{position:"relative" as const}}>
              <input value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} type={showConfirm?"text":"password"} placeholder="Re-enter password" style={{...inputStyle,paddingRight:"40px"}} onKeyDown={e=>e.key==="Enter"&&handleSignup()}/>
              <button onClick={()=>setShowConfirm(!showConfirm)} style={{position:"absolute" as const,right:"10px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"13px",color:P.textTert}}>{showConfirm?"🙈":"👁️"}</button>
            </div>
          </div>
        </div>

        <button onClick={handleSignup} disabled={loading} style={{width:"100%",marginTop:"1.25rem",padding:"11px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:"600",cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1}}>
          {loading?"Creating account...":"Create Account & Set Up Organisation →"}
        </button>

        <div style={{marginTop:"1rem",padding:"10px 12px",background:P.bgSec,borderRadius:"8px",fontSize:"11px",color:P.textTert,textAlign:"center"}}>
          🔒 Secured under 21 CFR Part 11 · ICH E6(R3) · ISO 14155:2020
        </div>

        <div style={{textAlign:"center",marginTop:"12px",fontSize:"11px",color:P.textTert}}>
          Already have an account? <a href="/platform" style={{color:P.primary,textDecoration:"none",fontWeight:"500"}}>Log in</a>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage(){
  return(
    <Suspense fallback={<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>Loading...</div>}>
      <SignupContent/>
    </Suspense>
  );
}