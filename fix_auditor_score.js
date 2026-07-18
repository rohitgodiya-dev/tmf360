const fs = require('fs');
let c = fs.readFileSync('app/platform/page.tsx', 'utf8');

// Find the closing tag after the readiness score label and insert auditor gauge after it
const target = '<div style={{fontSize:"11px",color:P.textTert,marginTop:"-6px",display:"flex",alignItems:"center",gap:"4px"}}>Readiness score <i className="ti ti-info-circle" style={{fontSize:"12px"}}/></div>';

const idx = c.indexOf(target);
console.log('Target found at:', idx);

if (idx > -1) {
  // Find the closing span after this and the closing div of the column
  // We need to insert AFTER the entire first gauge column closes
  // The pattern is: ...closing span... </div> (closes the 180px column div)
  // Then we insert our new column
  
  // Find "Inspection ready" or "Needs attention" or "At risk" span end
  const afterTarget = c.indexOf('</span>\r\n                        </div>', idx);
  console.log('Column close found at:', afterTarget);
  
  if (afterTarget > -1) {
    const insertPoint = afterTarget + '</span>\r\n                        </div>'.length;
    const auditGauge = `\r\n                        <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",width:"180px"}}>\r\n                          <div style={{position:"relative",width:"180px",height:"140px",display:"flex",alignItems:"center",justifyContent:"center"}}>\r\n                            {readinessGauge(auditorScore)}\r\n                            <div style={{position:"absolute",top:"52px",display:"flex",flexDirection:"column",alignItems:"center"}}>\r\n                              <span style={{fontSize:"30px",fontWeight:"700",color:P.text}}>{auditorScore}%</span>\r\n                            </div>\r\n                          </div>\r\n                          <div style={{fontSize:"11px",color:P.textTert,marginTop:"-6px",display:"flex",alignItems:"center",gap:"4px"}}>Auditor score <i className="ti ti-info-circle" style={{fontSize:"12px"}}/></div>\r\n                          <span style={{fontSize:"10px",fontWeight:"600",color:auditorScore>=80?P.success:auditorScore>=50?P.warning:P.danger,background:auditorScore>=80?P.successLight:auditorScore>=50?P.warningLight:P.dangerLight,borderRadius:"20px",padding:"3px 10px",marginTop:"8px"}}>{auditorScore>=80?"Fully reviewed":auditorScore>=50?"Partially reviewed":"Needs review"}</span>\r\n                        </div>`;
    
    c = c.slice(0, insertPoint) + auditGauge + c.slice(insertPoint);
    console.log('Auditor gauge inserted - OK');
  }
}

// Also widen the grid column
c = c.replace(
  'gridTemplateColumns:"1.15fr 1fr"',
  'gridTemplateColumns:"1.15fr 1.5fr"'
);

fs.writeFileSync('app/platform/page.tsx', c, 'utf8');
console.log('Done. Length:', c.length);
