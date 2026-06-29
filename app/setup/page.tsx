"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  // Step 1 fields
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("Sponsor");
  const [orgCode, setOrgCode] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");
  const [language, setLanguage] = useState("English (US)");

  // Step 2 fields
  const [productType, setProductType] = useState("Medical Device");
  const [regulatoryRegions, setRegulatoryRegions] = useState<string[]>(["FDA"]);
  const [trialPhases, setTrialPhases] = useState<string[]>(["Phase I"]);
  const [therapeuticAreas, setTherapeuticAreas] = useState<string[]>([]);

  // Step 3 fields
  const [tmfModel, setTmfModel] = useState("DIA TMF Reference Model v3.3.1");
  const [retentionPeriod, setRetentionPeriod] = useState("15 years");
  const [teamSize, setTeamSize] = useState("1-5 people");

  const P = {
    primary: "#2563EB", primaryLight: "#EFF6FF", primaryDark: "#1D4ED8",
    text: "#0F172A", textSec: "#374151", textTert: "#64748B", textMuted: "#94A3B8",
    bg: "#FFFFFF", bgSec: "#F8FAFC", bgTert: "#F1F5F9",
    border: "#E2E8F0", borderSec: "#CBD5E1",
    success: "#16A34A", successLight: "#F0FDF4",
    danger: "#EF4444", dangerLight: "#FEF2F2",
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push("/platform"); return; }
      setUser(session.user);
      // Check if already has org
      supabase.from("user_roles").select("org_id").eq("user_id", session.user.id).single().then(({ data }) => {
        if (data?.org_id) router.push("/platform");
      });
    });
  }, []);

  function toggleItem(arr: string[], item: string, set: (v: string[]) => void) {
    set(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  }

  function pill(label: string, arr: string[], set: (v: string[]) => void) {
    const sel = arr.includes(label);
    return (
      <button key={label} onClick={() => toggleItem(arr, label, set)}
        style={{ fontSize: "11px", padding: "4px 13px", borderRadius: "20px", cursor: "pointer", border: `1px solid ${sel ? P.primary : P.border}`, background: sel ? P.primaryLight : P.bgSec, color: sel ? P.primary : P.textTert, fontWeight: sel ? "600" : "400" }}>
        {label}
      </button>
    );
  }

  async function finish() {
    if (!orgName.trim()) { setMessage("Organisation name is required"); return; }
    if (!orgCode.trim()) { setMessage("Organisation code is required"); return; }
    setSaving(true);

    // Create organisation
    const { data: org, error: orgError } = await supabase.from("organizations").insert([{
      name: orgName.trim(),
      type: orgType,
      code: orgCode.trim().toUpperCase(),
      country,
      timezone,
      language,
      product_type: productType,
      regulatory_regions: regulatoryRegions.join(", "),
      trial_phases: trialPhases.join(", "),
      therapeutic_areas: therapeuticAreas.join(", "),
      tmf_reference_model: tmfModel,
      retention_period: retentionPeriod,
      team_size: teamSize,
      created_by: user.id,
    }]).select().single();

    if (orgError) { setMessage("Error: " + orgError.message); setSaving(false); return; }

    // Update user_roles with org_id and role
    const { error: roleError } = await supabase.from("user_roles").upsert([{
      user_id: user.id,
      email: user.email,
      role: "System Administrator",
      full_name: "",
      is_active: true,
      notifications_enabled: true,
      can_upload_download: true,
      can_download: true,
      org_id: org.id,
    }], { onConflict: "user_id" });

    if (roleError) { setMessage("Error: " + roleError.message); setSaving(false); return; }

    router.push("/platform");
  }

  const steps = [
    { n: 1, label: "Organisation Identity", desc: "Basic information about your organisation" },
    { n: 2, label: "Trial Scope", desc: "Define your trial and regulatory scope" },
    { n: 3, label: "TMF Configuration", desc: "Configure your TMF workspace settings" },
    { n: 4, label: "Finish", desc: "Review and complete setup" },
  ];

  const pcts = ["", "25%", "50%", "75%", "100%"];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F1F5F9", alignItems: "flex-start", justifyContent: "center", padding: "1rem", fontFamily: "system-ui, sans-serif", overflowX: "hidden" as const }}>
      <div style={{ display: "flex", height: "100%", width: "100%", maxWidth: "1200px", background: P.bg, borderRadius: "16px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.12)" }}>

        {/* LEFT SIDEBAR */}
        <div style={{ width: "220px", minWidth: "180px", background: "#0F1E3D", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "1.5rem 1.25rem .75rem" }}>
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff", letterSpacing: "-.5px" }}>TMF<span style={{ color: "#3B82F6" }}>360</span></div>
              <div style={{ fontSize: "10px", color: "#64748B", marginTop: "1px" }}>Trial Master File Management</div>
            </div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff", marginBottom: "6px" }}>Organisation Setup</div>
            <div style={{ fontSize: "11px", color: "#94A3B8", lineHeight: "1.6", marginBottom: "1.5rem" }}>Let's set up your organisation workspace. You can update these details anytime from settings.</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {steps.map((s, i) => (
              <div key={s.n}>
                <div style={{ display: "flex", gap: "10px", padding: ".65rem 1.25rem", background: step === s.n ? "rgba(59,130,246,.12)" : "transparent" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "600", flexShrink: 0, marginTop: "2px", background: step >= s.n ? "#2563EB" : "#1E3A5F", color: step >= s.n ? "#fff" : "#64748B", border: step >= s.n ? "none" : "1.5px solid #263F5E" }}>
                    {step > s.n ? "✓" : s.n}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "500", color: step >= s.n ? "#60A5FA" : "#475569" }}>{s.label}</div>
                    <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px", lineHeight: "1.4" }}>{s.desc}</div>
                  </div>
                </div>
                {i < steps.length - 1 && <div style={{ width: "1.5px", height: "12px", background: "#1E3A5F", marginLeft: "calc(1.25rem + 12px)" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: P.bgSec }}>

          {/* TOP BAR */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".85rem 1.75rem", borderBottom: `1px solid ${P.border}`, background: P.bg, flexShrink: 0 }}>
            <div>
              <span style={{ fontSize: "13px", color: P.primary, fontWeight: "500" }}>Step {step} of 4</span>
              <span style={{ fontSize: "14px", fontWeight: "600", color: P.text, marginLeft: "4px" }}>{steps[step - 1]?.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: P.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "600", color: "#fff" }}>
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: P.text }}>{user?.email}</div>
                <div style={{ fontSize: "11px", color: P.textTert }}>System Administrator</div>
              </div>
            </div>
          </div>

          {/* BODY */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <div style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto" }}>

              {message && <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "1rem", fontSize: "12px", background: message.includes("Error") ? P.dangerLight : P.successLight, color: message.includes("Error") ? P.danger : P.success }}>{message}</div>}

              {/* STEP 1 */}
              {step === 1 && (
                <div>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: P.text, marginBottom: "4px" }}>Tell us about your organisation</div>
                  <div style={{ fontSize: "13px", color: P.textTert, marginBottom: "1.25rem" }}>This information helps us configure your workspace</div>
                  <div style={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "5px" }}>Organisation Name <span style={{ color: P.danger }}>*</span></label>
                        <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Optiscan Imaging Ltd." style={{ width: "100%", height: "38px", border: `1px solid ${P.borderSec}`, borderRadius: "8px", padding: "0 12px", fontSize: "12px", color: P.text }} />
                        <div style={{ fontSize: "10px", color: P.textMuted, marginTop: "4px" }}>Legal name of your organisation</div>
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "5px" }}>Organisation Type <span style={{ color: P.danger }}>*</span></label>
                        <select value={orgType} onChange={e => setOrgType(e.target.value)} style={{ width: "100%", height: "38px", border: `1px solid ${P.borderSec}`, borderRadius: "8px", padding: "0 12px", fontSize: "12px", color: P.text }}>
                          {["Sponsor", "CRO", "Site", "Academic", "Biotech", "Medical Device", "Other"].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "5px" }}>Organisation Code <span style={{ color: P.danger }}>*</span></label>
                        <input value={orgCode} onChange={e => setOrgCode(e.target.value.toUpperCase())} placeholder="e.g. OIL" maxLength={10} style={{ width: "100%", height: "38px", border: `1px solid ${P.borderSec}`, borderRadius: "8px", padding: "0 12px", fontSize: "12px", color: P.text }} />
                        <div style={{ fontSize: "10px", color: P.textMuted, marginTop: "4px" }}>Short code used as prefix in IDs</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "5px" }}>Country <span style={{ color: P.danger }}>*</span></label>
                        <input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. United States" style={{ width: "100%", height: "38px", border: `1px solid ${P.borderSec}`, borderRadius: "8px", padding: "0 12px", fontSize: "12px", color: P.text }} />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "5px" }}>Time Zone</label>
                        <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ width: "100%", height: "38px", border: `1px solid ${P.borderSec}`, borderRadius: "8px", padding: "0 12px", fontSize: "12px", color: P.text }}>
                          {["UTC-08:00 Pacific", "UTC-07:00 Mountain", "UTC-06:00 Central", "UTC-05:00 Eastern", "UTC+00:00 GMT", "UTC+01:00 CET", "UTC+05:30 IST", "UTC+08:00 CST", "UTC+09:00 JST"].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "5px" }}>Language</label>
                        <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: "100%", height: "38px", border: `1px solid ${P.borderSec}`, borderRadius: "8px", padding: "0 12px", fontSize: "12px", color: P.text }}>
                          {["English (US)", "English (UK)", "French", "German", "Spanish", "Japanese", "Chinese"].map(l => <option key={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: P.text, marginBottom: "4px" }}>Define your trial scope</div>
                  <div style={{ fontSize: "13px", color: P.textTert, marginBottom: "1.25rem" }}>This helps us configure regulatory templates and TMF structure</div>
                  <div style={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem" }}>
                    <div style={{ marginBottom: "1.25rem" }}>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "5px" }}>Product Type <span style={{ color: P.danger }}>*</span></label>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
                        {["Medical Device", "Drug / Biologic", "Combination Product", "IVD"].map(t => (
                          <button key={t} onClick={() => setProductType(t)} style={{ fontSize: "11px", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", border: `1px solid ${productType === t ? P.primary : P.border}`, background: productType === t ? P.primaryLight : P.bgSec, color: productType === t ? P.primary : P.textTert, fontWeight: productType === t ? "600" : "400" }}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: "1.25rem" }}>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "8px" }}>Regulatory Regions <span style={{ color: P.danger }}>*</span></label>
                      <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" as const }}>
                        {["FDA", "EMA", "Health Canada", "TGA", "PMDA", "MHRA", "Anvisa"].map(r => pill(r, regulatoryRegions, setRegulatoryRegions))}
                      </div>
                    </div>
                    <div style={{ marginBottom: "1.25rem" }}>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "8px" }}>Trial Phases</label>
                      <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" as const }}>
                        {["Phase I", "Phase II", "Phase III", "Phase IV", "Observational", "Feasibility"].map(p => pill(p, trialPhases, setTrialPhases))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "8px" }}>Therapeutic Areas</label>
                      <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" as const }}>
                        {["Oncology", "Cardiology", "Neurology", "Gastroenterology", "Ophthalmology", "Orthopaedics", "Dermatology", "Immunology"].map(a => pill(a, therapeuticAreas, setTherapeuticAreas))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: P.text, marginBottom: "4px" }}>TMF Configuration</div>
                  <div style={{ fontSize: "13px", color: P.textTert, marginBottom: "1.25rem" }}>Configure your Trial Master File workspace settings</div>
                  <div style={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: "12px", padding: "1.5rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "5px" }}>TMF Reference Model</label>
                        <select value={tmfModel} onChange={e => setTmfModel(e.target.value)} style={{ width: "100%", height: "38px", border: `1px solid ${P.borderSec}`, borderRadius: "8px", padding: "0 12px", fontSize: "12px", color: P.text }}>
                          <option>DIA TMF Reference Model v3.3.1</option>
                          <option>DIA TMF Reference Model v3.0</option>
                          <option>Custom</option>
                          <option>Hybrid</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "5px" }}>Document Retention Period</label>
                        <select value={retentionPeriod} onChange={e => setRetentionPeriod(e.target.value)} style={{ width: "100%", height: "38px", border: `1px solid ${P.borderSec}`, borderRadius: "8px", padding: "0 12px", fontSize: "12px", color: P.text }}>
                          <option>15 years</option>
                          <option>25 years</option>
                          <option>Per regulation</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: P.textSec, display: "block", marginBottom: "5px" }}>Anticipated Team Size</label>
                        <select value={teamSize} onChange={e => setTeamSize(e.target.value)} style={{ width: "100%", height: "38px", border: `1px solid ${P.borderSec}`, borderRadius: "8px", padding: "0 12px", fontSize: "12px", color: P.text }}>
                          {["1-5 people", "6-20 people", "21-50 people", "51-100 people", "100+ people"].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: P.text, marginBottom: "4px" }}>Review and finish</div>
                  <div style={{ fontSize: "13px", color: P.textTert, marginBottom: "1.25rem" }}>Your workspace is ready — review your settings before launching</div>
                  <div style={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                      {[
                        { label: "Identity", rows: [["Organisation", orgName], ["Type", orgType], ["Code", orgCode], ["Country", country], ["Language", language]] },
                        { label: "Trial Scope", rows: [["Product Type", productType], ["Regulatory Regions", regulatoryRegions.join(", ") || "—"], ["Trial Phases", trialPhases.join(", ") || "—"], ["Therapeutic Areas", therapeuticAreas.join(", ") || "—"]] },
                        { label: "TMF Configuration", rows: [["Reference Model", tmfModel], ["Retention Period", retentionPeriod], ["Team Size", teamSize]] },
                      ].map(section => (
                        <div key={section.label}>
                          <div style={{ fontSize: "10px", fontWeight: "700", color: P.textMuted, textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: "9px", paddingBottom: "6px", borderBottom: `1px solid ${P.bgTert}` }}>{section.label}</div>
                          {section.rows.map(([k, v]) => (
                            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" }}>
                              <span style={{ color: P.textTert }}>{k}</span>
                              <span style={{ color: P.text, fontWeight: "600" }}>{v || "—"}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "10px", padding: ".85rem 1rem", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "18px" }}>✅</span>
                    <span style={{ fontSize: "12px", color: "#15803D", fontWeight: "500" }}>All required fields are complete. Your workspace is ready to launch.</span>
                  </div>
                </div>
              )}

            </div>

            {/* PROGRESS PANEL */}
            <div style={{ width: "180px", minWidth: "160px", padding: "1rem", borderLeft: `1px solid ${P.border}`, background: P.bg, flexShrink: 0, overflowY: "auto" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: P.text, marginBottom: "12px" }}>Setup Progress</div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: P.text, marginBottom: "4px" }}>{pcts[step]}</div>
              <div style={{ height: "6px", background: P.bgTert, borderRadius: "3px", marginBottom: "16px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: pcts[step], borderRadius: "3px", background: P.primary, transition: "width .4s ease" }} />
              </div>
              {orgName && <div style={{ marginBottom: "8px" }}><div style={{ fontSize: "10px", color: P.textMuted }}>Organisation</div><div style={{ fontSize: "11px", fontWeight: "600", color: P.text }}>{orgName}</div></div>}
              {orgType && <div style={{ marginBottom: "8px" }}><div style={{ fontSize: "10px", color: P.textMuted }}>Type</div><div style={{ fontSize: "11px", fontWeight: "600", color: P.text }}>{orgType}</div></div>}
              {orgCode && <div style={{ marginBottom: "8px" }}><div style={{ fontSize: "10px", color: P.textMuted }}>Code</div><div style={{ fontSize: "11px", fontWeight: "600", color: P.text }}>{orgCode}</div></div>}
              {country && <div style={{ marginBottom: "8px" }}><div style={{ fontSize: "10px", color: P.textMuted }}>Country</div><div style={{ fontSize: "11px", fontWeight: "600", color: P.text }}>{country}</div></div>}
              <div style={{ background: P.primaryLight, border: `1px solid #BFDBFE`, borderRadius: "10px", padding: ".85rem", marginTop: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#1D4ED8", marginBottom: "5px" }}>ℹ You can update all settings later</div>
                <div style={{ fontSize: "10px", color: "#1E40AF", lineHeight: "1.6" }}>Don't worry if you don't have all the information now. You can update these details anytime from your organisation settings.</div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".85rem 1.75rem", borderTop: `1px solid ${P.border}`, background: P.bg, flexShrink: 0 }}>
            <button onClick={() => router.push("/platform")} style={{ fontSize: "12px", color: P.textSec, border: `1px solid ${P.borderSec}`, borderRadius: "8px", padding: "8px 20px", cursor: "pointer", background: P.bg, fontWeight: "500" }}>Skip for now</button>
            <div style={{ display: "flex", gap: "8px" }}>
              {step > 1 && <button onClick={() => setStep(step - 1)} style={{ fontSize: "12px", color: P.textSec, border: `1px solid ${P.borderSec}`, borderRadius: "8px", padding: "8px 20px", cursor: "pointer", background: P.bg, fontWeight: "500" }}>Back</button>}
              {step < 4 && <button onClick={() => { if (step === 1 && !orgName.trim()) { setMessage("Organisation name is required"); return; } setMessage(""); setStep(step + 1); }} style={{ fontSize: "12px", color: "#fff", background: P.primary, border: "none", borderRadius: "8px", padding: "8px 20px", cursor: "pointer", fontWeight: "600" }}>Next →</button>}
              {step === 4 && <button onClick={finish} disabled={saving} style={{ fontSize: "12px", color: "#fff", background: P.primary, border: "none", borderRadius: "8px", padding: "8px 24px", cursor: "pointer", fontWeight: "600", opacity: saving ? 0.6 : 1 }}>{saving ? "Setting up..." : "Launch Workspace →"}</button>}
            </div>
          </div>

          {/* TRUST BAR */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: ".65rem 1.75rem", borderTop: `1px solid ${P.border}`, background: P.bg, flexShrink: 0 }}>
            {[["🛡️", "Secure & Compliant", "Industry-leading security"], ["✅", "Audit Ready", "Complete audit trail"], ["🤖", "AI Powered", "Smart document insights"], ["📈", "Scalable", "Built to grow with you"]].map(([icon, title, sub]) => (
              <div key={title} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span style={{ fontSize: "16px" }}>{icon}</span>
                <div><div style={{ fontSize: "10px", fontWeight: "700", color: P.textSec }}>{title}</div><div style={{ fontSize: "10px", color: P.textMuted }}>{sub}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}