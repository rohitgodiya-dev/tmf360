const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Find the inspection readiness card on dashboard and add auditor score next to it
const oldReadinessCard = `                    <div style={{background:P.bg,border:\`0.5px solid \${P.border}\`,borderRadius:"14px",padding:"16px",display:"flex",flexDirection:"column",gap:"14px"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <h2 style={{fontSize:"13px",fontWeight:"700",color:P.text}}>Inspection readiness</h2>
                        <button onClick={()=>setPanel("readiness")} style={{fontSize:"11px",fontWeight:"600",color:P.blue,background:P.blueLight,border:\`0.5px solid #BFDBFE\`,borderRadius:"7px",padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"}}>View details <i className="ti ti-arrow-right" style={{fontSize:"12px"}}/></button>
                      </div>`;

const newReadinessCard = `                    <div style={{background:P.bg,border:\`0.5px solid \${P.border}\`,borderRadius:"14px",padding:"16px",display:"flex",flexDirection:"column",gap:"14px"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <h2 style={{fontSize:"13px",fontWeight:"700",color:P.text}}>Inspection readiness</h2>
                        <button onClick={()=>setPanel("readiness")} style={{fontSize:"11px",fontWeight:"600",color:P.blue,background:P.blueLight,border:\`0.5px solid #BFDBFE\`,borderRadius:"7px",padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"}}>View details <i className="ti ti-arrow-right" style={{fontSize:"12px"}}/></button>
                      </div>`;

// Now find where we need to add the Auditor Score card
// It should go after the inspection readiness card closes in the grid
// The grid is gridTemplateColumns:"1.15fr 1fr" - we need to change it to accommodate a third card
// Actually let's add it as a separate row below the existing 2-col grid

// Find the closing of the 2-col grid and add auditor score after it
const oldGridEnd = `                  </div>
                </>
              )}
            </div>
          )}

          {/* COMPLETENESS DETAIL */}`;

// Calculate auditor score: approved docs / total docs * 100
// Add it before the 2-col grid as a third element, or change grid to 3 cols
// Let's add the auditor score gauge to the inspection readiness card as a second gauge

const oldInspectionSection = `                      <div style={{display:"flex",gap:"16px"}}>
                        <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",width:"180px"}}>
                          <div style={{position:"relative",width:"180px",height:"140px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {readinessGauge(ri)}
                            <div style={{position:"absolute",top:"52px",display:"flex",flexDirection:"column",alignItems:"center"}}>
                              <span style={{fontSize:"30px",fontWeight:"700",color:P.text}}>{ri}%</span>
                            </div>
                          </div>
                          <div style={{fontSize:"11px",color:P.textTert,marginTop:"-6px",display:"flex",alignItems:"center",gap:"4px"}}>Readiness score <i className="ti ti-info-circle" style={{fontSize:"12px"}}/></div>
                          <span style={{fontSize:"10px",fontWeight:"600",color:P.danger,background:P.dangerLight,borderRadius:"20px",padding:"3px 10px",marginTop:"8px"}}>{ri>=80?"Inspection ready":ri>=50?"Needs attention":"At risk"}</span>
                        </div>`;

const newInspectionSection = `                      <div style={{display:"flex",gap:"16px"}}>
                        <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",width:"180px"}}>
                          <div style={{position:"relative",width:"180px",height:"140px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {readinessGauge(ri)}
                            <div style={{position:"absolute",top:"52px",display:"flex",flexDirection:"column",alignItems:"center"}}>
                              <span style={{fontSize:"30px",fontWeight:"700",color:P.text}}>{ri}%</span>
                            </div>
                          </div>
                          <div style={{fontSize:"11px",color:P.textTert,marginTop:"-6px",display:"flex",alignItems:"center",gap:"4px"}}>Readiness score <i className="ti ti-info-circle" style={{fontSize:"12px"}}/></div>
                          <span style={{fontSize:"10px",fontWeight:"600",color:P.danger,background:P.dangerLight,borderRadius:"20px",padding:"3px 10px",marginTop:"8px"}}>{ri>=80?"Inspection ready":ri>=50?"Needs attention":"At risk"}</span>
                        </div>
                        <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",width:"180px"}}>
                          <div style={{position:"relative",width:"180px",height:"140px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {readinessGauge(auditorScore)}
                            <div style={{position:"absolute",top:"52px",display:"flex",flexDirection:"column",alignItems:"center"}}>
                              <span style={{fontSize:"30px",fontWeight:"700",color:P.text}}>{auditorScore}%</span>
                            </div>
                          </div>
                          <div style={{fontSize:"11px",color:P.textTert,marginTop:"-6px",display:"flex",alignItems:"center",gap:"4px"}}>Auditor score <i className="ti ti-info-circle" style={{fontSize:"12px"}}/></div>
                          <span style={{fontSize:"10px",fontWeight:"600",color:auditorScore>=80?P.success:auditorScore>=50?P.warning:P.danger,background:auditorScore>=80?P.successLight:auditorScore>=50?P.warningLight:P.dangerLight,borderRadius:"20px",padding:"3px 10px",marginTop:"8px"}}>{auditorScore>=80?"Fully reviewed":auditorScore>=50?"Partially reviewed":"Needs review"}</span>
                        </div>`;

if (c.includes(oldInspectionSection)) {
  c = c.replace(oldInspectionSection, newInspectionSection);
  console.log('Auditor gauge added to dashboard - OK');
} else {
  console.log('Pattern not found for inspection section');
}

// Now add auditorScore variable calculation near ri calculation
const oldRiCalc = `  const ri=totalW?Math.round((earnedW/totalW)*100):0;`;
const newRiCalc = `  const ri=totalW?Math.round((earnedW/totalW)*100):0;
  const auditorScore=studyDocs.length?Math.round((studyDocs.filter(d=>d.status==="Approved").length/studyDocs.length)*100):0;`;

if (c.includes(oldRiCalc)) {
  c = c.replace(oldRiCalc, newRiCalc);
  console.log('auditorScore variable added - OK');
} else {
  console.log('ri calc pattern not found');
}

// Also change the grid from 1.15fr 1fr to have more space for both gauges
c = c.replace(
  'display:"grid",gridTemplateColumns:"1.15fr 1fr",gap:"12px",alignItems:"start"',
  'display:"grid",gridTemplateColumns:"1.15fr 1.4fr",gap:"12px",alignItems:"start"'
);

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. Length:', c.length);
