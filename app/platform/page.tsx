"use client";
import{useState,useEffect,useRef}from"react";
import{supabase}from"../../lib/supabase";



const TMF=[
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.01",an:"Trial Master File Plan",cl:"Recommended",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.02",an:"Trial Management Plan",cl:"Recommended",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.03",an:"Quality Plan",cl:"Recommended",iso:"7.11 9.1 a"},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.04",an:"List of SOPs Current During Trial",cl:"Core",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.05",an:"Operational Procedure Manual",cl:"Recommended",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.06",an:"Recruitment Plan",cl:"Recommended",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.07",an:"Communication Plan",cl:"Recommended",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.08",an:"Monitoring Plan",cl:"Core",iso:"6.7 7.3 9.2.4.1"},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.09",an:"Medical Monitoring Plan",cl:"Core",iso:"6.11"},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.10",an:"Publication Policy",cl:"Recommended",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.11",an:"Debarment Statement",cl:"Recommended",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.12",an:"Trial Status Report",cl:"Recommended",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.13",an:"Investigator Newsletter",cl:"Recommended",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.14",an:"Audit Certificate",cl:"Core",iso:"E3.4 7.11 e 9.1 D13 h"},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.15",an:"Filenote Master List",cl:"Recommended",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.16",an:"Risk Management Plan",cl:"Recommended",iso:"6.2 5.6.2 c 5.6.2 d 7.8.1 9.2.3 h 9.2.6 c 7.5.1 7.10 Annex H"},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.17",an:"Vendor Management Plan",cl:"Recommended",iso:"9.3"},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.18",an:"Roles and Responsibility Matrix",cl:"Core",iso:"6.1 9.2.1a"},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.19",an:"Transfer of Regulatory Obligations",cl:"Core",iso:"9.3"},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.20",an:"Operational Oversight",cl:"Core",iso:""},
  {z:"1",zn:"Trial Management",s:"1.02",sn:"Trial Team",a:"01.02.01",an:"Trial Team Details",cl:"Core",iso:"E.1.28 E.2.26 6.1 9.2.1 a 9.2.1 g D.13e"},
  {z:"1",zn:"Trial Management",s:"1.02",sn:"Trial Team",a:"01.02.02",an:"Trial Team Curriculum Vitae",cl:"Core",iso:"9.2.1g 6.1"},
  {z:"1",zn:"Trial Management",s:"1.03",sn:"Trial Committee",a:"01.03.01",an:"Committee Process",cl:"Core",iso:"6.11"},
  {z:"1",zn:"Trial Management",s:"1.03",sn:"Trial Committee",a:"01.03.02",an:"Committee Member List",cl:"Core",iso:""},
  {z:"1",zn:"Trial Management",s:"1.03",sn:"Trial Committee",a:"01.03.03",an:"Committee Output",cl:"Core",iso:"6.11"},
  {z:"1",zn:"Trial Management",s:"1.03",sn:"Trial Committee",a:"01.03.04",an:"Committee Member Curriculum Vitae",cl:"Core",iso:"6.1 6.11"},
  {z:"1",zn:"Trial Management",s:"1.03",sn:"Trial Committee",a:"01.03.05",an:"Committee Member Financial Disclosure Form",cl:"Core",iso:"E.1.33 E.2.30 5.6.2 d 6.11 9.2.1 e 10.2 c"},
  {z:"1",zn:"Trial Management",s:"1.03",sn:"Trial Committee",a:"01.03.06",an:"Committee Member Contract",cl:"Core",iso:"6.9"},
  {z:"1",zn:"Trial Management",s:"1.03",sn:"Trial Committee",a:"01.03.07",an:"Committee Member Confidentiality Disclosure Agreement",cl:"Core",iso:"E.1.13 E.1.33 6.9 9. 2.1.a 9.2.1 d 10.2.c"},
  {z:"1",zn:"Trial Management",s:"1.04",sn:"Meetings",a:"01.04.01",an:"Kick-off Meeting Material",cl:"Core",iso:""},
  {z:"1",zn:"Trial Management",s:"1.04",sn:"Meetings",a:"01.04.02",an:"Trial Team Training Material",cl:"Core",iso:"9.2.4.2 c 7.3 7.6"},
  {z:"1",zn:"Trial Management",s:"1.04",sn:"Meetings",a:"01.04.03",an:"Investigators Meeting Material",cl:"Core",iso:""},
  {z:"1",zn:"Trial Management",s:"1.04",sn:"Meetings",a:"01.04.04",an:"Trial Team Evidence of Training",cl:"Core",iso:"9.2.1"},
  {z:"1",zn:"Trial Management",s:"1.05",sn:"General",a:"01.05.01",an:"Relevant Communications",cl:"Core",iso:"E.2.11 9.2.3 b 9.2.4.5 o 10.6 h"},
  {z:"1",zn:"Trial Management",s:"1.05",sn:"General",a:"01.05.02",an:"Tracking Information",cl:"Recommended",iso:""},
  {z:"1",zn:"Trial Management",s:"1.05",sn:"General",a:"01.05.03",an:"Other Meeting Material",cl:"Core",iso:""},
  {z:"1",zn:"Trial Management",s:"1.05",sn:"General",a:"01.05.04",an:"Filenote",cl:"Core",iso:""},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Product and Trial Documentation",a:"02.01.01",an:"Investigators Brochure",cl:"Core",iso:"E.1.1 E.2.1 6.5 7.5.1 Annex B 6.3"},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Product and Trial Documentation",a:"02.01.02",an:"Protocol",cl:"Core",iso:"E.1.2 4 5.6.2.a 5.6.4 6.3 6.4 7.1 7.5.1 10.6 b 10.6 f Annex A 7.1 7.8.2 Annex 1"},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Product and Trial Documentation",a:"02.01.03",an:"Protocol Synopsis",cl:"Core",iso:""},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Product and Trial Documentation",a:"02.01.04",an:"Protocol Amendment",cl:"Core",iso:"E2.2 7.51"},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Product and Trial Documentation",a:"02.01.05",an:"Financial Disclosure Summary",cl:"Recommended",iso:""},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Product and Trial Documentation",a:"02.01.06",an:"Insurance",cl:"Core",iso:"E.1.25 5.3 5.6.2 j 9.2.2 e"},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Product and Trial Documentation",a:"02.01.07",an:"Sample Case Report Form",cl:"Core",iso:"E.1.25 E.1.26 E.1.27 6.6 7.4.2 7.4.3 Annex C"},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Product and Trial Documentation",a:"02.01.10",an:"Report of Prior Investigations",cl:"Core",iso:""},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Product and Trial Documentation",a:"02.01.11",an:"Marketed Product Material",cl:"Core",iso:""},
  {z:"2",zn:"Central Trial Documents",s:"2.02",sn:"Subject Documentation",a:"02.02.01",an:"Subject Diary",cl:"Core",iso:"Annex C.2.4.L"},
  {z:"2",zn:"Central Trial Documents",s:"2.02",sn:"Subject Documentation",a:"02.02.02",an:"Subject Questionnaire",cl:"Core",iso:""},
  {z:"2",zn:"Central Trial Documents",s:"2.02",sn:"Subject Documentation",a:"02.02.03",an:"Informed Consent Form",cl:"Core",iso:"E.1.18 E.2.3 E.2.13 5.2 5.3 5.6.2 c 5.6.2.d 5.8.1 5.8.4 7.8.1 7.5.1 8.6 9.2.2.b 9.2.4.5.f 10.5 10.7.a 10.7.c 10.7.d 10.7.e"},
  {z:"2",zn:"Central Trial Documents",s:"2.02",sn:"Subject Documentation",a:"02.02.04",an:"Subject Information Sheet",cl:"Core",iso:"E.1.18 5.6.2.c 5.6.2.d 5.8.4 7.8.1 9.2.2.b"},
  {z:"2",zn:"Central Trial Documents",s:"2.02",sn:"Subject Documentation",a:"02.02.05",an:"Subject Participation Card",cl:"Core",iso:""},
  {z:"2",zn:"Central Trial Documents",s:"2.02",sn:"Subject Documentation",a:"02.02.06",an:"Advertisements for Subject Recruitment",cl:"Core",iso:"E.1.18 5.6.2.c 5.6.2.d 5.8.4 7.8.1 9.2.2.b"},
  {z:"2",zn:"Central Trial Documents",s:"2.02",sn:"Subject Documentation",a:"02.02.07",an:"Other Information Given to Subjects",cl:"Core",iso:"E.1.18 5.6.2.c 5.6.2.d 5.8.4 7.8.1 9.2.2.b"},
  {z:"2",zn:"Central Trial Documents",s:"2.03",sn:"Reports",a:"02.03.01",an:"Clinical Study Report",cl:"Core",iso:"E.3.8 8.4 9.2.6 Annex D"},
  {z:"2",zn:"Central Trial Documents",s:"2.03",sn:"Reports",a:"02.03.02",an:"Bioanalytical Report",cl:"Recommended",iso:"8.6 9.2.2.b"},
  {z:"2",zn:"Central Trial Documents",s:"2.04",sn:"General",a:"02.04.01",an:"Relevant Communications",cl:"Core",iso:"E 2.11 9.2.3.c 9.2.4.5.o 10.6.h"},
  {z:"2",zn:"Central Trial Documents",s:"2.04",sn:"General",a:"02.04.02",an:"Tracking Information",cl:"Recommended",iso:""},
  {z:"2",zn:"Central Trial Documents",s:"2.04",sn:"General",a:"02.04.03",an:"Meeting Material",cl:"Core",iso:""},
  {z:"2",zn:"Central Trial Documents",s:"2.04",sn:"General",a:"02.04.04",an:"Filenote",cl:"Core",iso:""},
  {z:"3",zn:"Regulatory",s:"3.01",sn:"Trial Approval",a:"03.01.01",an:"Regulatory Submission",cl:"Recommended",iso:"E 2.11 8.2.2 9.2.2 g, 9.2.2.I 9.4 a,b"},
  {z:"3",zn:"Regulatory",s:"3.01",sn:"Trial Approval",a:"03.01.02",an:"Regulatory Authority Decision",cl:"Core",iso:"E.1.11 E.2.5 7.1 9.2.2G 9.2.2.H"},
  {z:"3",zn:"Regulatory",s:"3.01",sn:"Trial Approval",a:"03.01.03",an:"Notification of Regulatory Identification Number",cl:"Core",iso:""},
  {z:"3",zn:"Regulatory",s:"3.01",sn:"Trial Approval",a:"03.01.04",an:"Public Registration",cl:"Core",iso:"Annex G 6 h 5.4 9.2.2j Annex J F.2"},
  {z:"3",zn:"Regulatory",s:"3.02",sn:"Investigational Medicinal Product",a:"03.02.01",an:"Import or Export License Application",cl:"Core",iso:""},
  {z:"3",zn:"Regulatory",s:"3.02",sn:"Investigational Medicinal Product",a:"03.02.02",an:"Import or Export Documentation",cl:"Core",iso:""},
  {z:"3",zn:"Regulatory",s:"3.03",sn:"Trial Status Reporting",a:"03.03.01",an:"Notification of Safety or Trial Information",cl:"Core",iso:"E.2.19 7.4 9.2.5.L 9.2.4.5.d 9.4 10.8 7.4.2"},
  {z:"3",zn:"Regulatory",s:"3.03",sn:"Trial Status Reporting",a:"03.03.02",an:"Regulatory Progress Report",cl:"Core",iso:"9.2.3 h 9.2.6 d 9.4 c"},
  {z:"3",zn:"Regulatory",s:"3.03",sn:"Trial Status Reporting",a:"03.03.03",an:"Regulatory Notification of Trial Termination",cl:"Core",iso:"E.3.7 8.3. 9.2.6."},
  {z:"3",zn:"Regulatory",s:"3.04",sn:"General",a:"03.04.01",an:"Relevant Communications",cl:"Core",iso:"E 2.11 9.2.3 b 9.2.4.5.o 9.4 10.6."},
  {z:"3",zn:"Regulatory",s:"3.04",sn:"General",a:"03.04.02",an:"Tracking Information",cl:"Recommended",iso:""},
  {z:"3",zn:"Regulatory",s:"3.04",sn:"General",a:"03.04.03",an:"Meeting Material",cl:"Core",iso:""},
  {z:"3",zn:"Regulatory",s:"3.04",sn:"General",a:"03.04.04",an:"Filenote",cl:"Core",iso:""},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC Trial Approval",a:"04.01.01",an:"IRB or IEC Submission",cl:"Core",iso:"E.1.9 5.6.3 7.1 9.2.2.h 10.4.C"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC Trial Approval",a:"04.01.02",an:"IRB or IEC Decision",cl:"Core",iso:"E.1.9 E 1.11 E.2.4 5.6.3 5.6.4.e 5.6.4.a 7.1 7.5.1. 9.2.2 h 9.2.3 b 9.2.4.5.o 10.4 c 9.2.4.5 o"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC Trial Approval",a:"04.01.03",an:"IRB or IEC Composition",cl:"Core",iso:"E.1.10 5.6.3"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC Trial Approval",a:"04.01.04",an:"IRB or IEC Documentation of Non-Voting Status",cl:"Core",iso:"E.1.10 5.6.3"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC Trial Approval",a:"04.01.05",an:"IRB or IEC Compliance Documentation",cl:"Core",iso:""},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.02",sn:"Other Committees",a:"04.02.01",an:"Other Submissions",cl:"Recommended",iso:""},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.02",sn:"Other Committees",a:"04.02.02",an:"Other Approvals",cl:"Core",iso:"10.4 e"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.03",sn:"Trial Status Reporting",a:"04.03.01",an:"Notification to IRB or IEC of Safety Information",cl:"Core",iso:"E.2.20 5.6.4 9.2.5c 10.4 d 10.8 c 7.4.2"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.03",sn:"Trial Status Reporting",a:"04.03.02",an:"IRB or IEC Progress Report",cl:"Core",iso:"E.2.22 5.6.4 9.2.3 h 9.2.4.5.O 10.4 10.8"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.03",sn:"Trial Status Reporting",a:"04.03.03",an:"IRB or IEC Notification of Trial Termination",cl:"Core",iso:"E.3.6 5.6.4 8.3 b 9.2.6 d 10.4 f"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.04",sn:"General",a:"04.04.01",an:"Relevant Communications",cl:"Core",iso:"E.2.11 9.2.3 b 10.4 a"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.04",sn:"General",a:"04.04.02",an:"Tracking Information",cl:"Recommended",iso:""},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.04",sn:"General",a:"04.04.03",an:"Meeting Material",cl:"Core",iso:""},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.04",sn:"General",a:"04.04.04",an:"Filenote",cl:"Core",iso:""},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.01",an:"Site Contact Details",cl:"Recommended",iso:"E.1.8 A.1.4"},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.02",an:"Confidentiality Agreement",cl:"Core",iso:"6.9"},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.03",an:"Feasibility Documentation",cl:"Recommended",iso:"6.8 9.2.1 9.2.4"},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.04",an:"Pre Trial Monitoring Report",cl:"Core",iso:"E.1.21 6.8 9.2.1 b, 9.2.1 e 9.2.4.3 9.2.4.7 10.3.a 10.6 m 10.6 n"},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.05",an:"Sites Evaluated but not Selected",cl:"Recommended",iso:""},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.01",an:"Acceptance of Investigator Brochure",cl:"Recommended",iso:""},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.02",an:"Protocol Signature Page",cl:"Core",iso:"7.5.1 10.6 a Annex A"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.03",an:"Protocol Amendment Signature Page",cl:"Core",iso:"7.5.1 10.6.a Annex A"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.04",an:"Principal Investigator Curriculum Vitae",cl:"Core",iso:"E.1.4 E.2.6 5.6.2.e 9.2.1 10.2.a 10.2.b D.13.c"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.05",an:"Sub-Investigator Curriculum Vitae",cl:"Core",iso:"E.1.5 E.2.7 6.1 10.2.a"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.06",an:"Other Curriculum Vitae",cl:"Core",iso:"E.1.6 E.2.7 6.1 9.2.1 9.2.4.3 10.2.a"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.07",an:"Site Staff Qualification Supporting Information",cl:"Recommended",iso:"9.2.1 g 6.8"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.08",an:"Form FDA 1572",cl:"Core",iso:"E.1.12 10.3 b"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.09",an:"Investigator Regulatory Agreement",cl:"Core",iso:"E.1.12 6.9 9.2.1.a"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.10",an:"Financial Disclosure Form",cl:"Core",iso:"E.1.14 E.1.33 E.2.30 9.2.1 D 9.2.2 F 10.2 c"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.11",an:"Data Privacy Agreement",cl:"Recommended",iso:""},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.12",an:"Clinical Trial Agreement",cl:"Core",iso:"E.1.12 E.1.14 6.9 9.2.1a 9.2.2.F 10.3 a"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.13",an:"Indemnity",cl:"Core",iso:"E 1.15 5.6.2 j 9.2.2 e"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.14",an:"Other Financial Agreement",cl:"Core",iso:"E.1.34 6.9 10.1"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.17",an:"IP Site Release Documentation",cl:"Recommended",iso:""},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.18",an:"Site Signature Sheet",cl:"Core",iso:"E.1.7 E.2.12 7.2 9.2.1 e 9.2.2.d 9.2.4.4 b 9.2.4.5.b"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.19",an:"Investigators Agreement (Device)",cl:"Core",iso:"E1.12 6.9 9.2.1 a"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Set-up",a:"05.02.20",an:"Coordinating Investigator Documentation",cl:"Recommended",iso:""},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Site Initiation",a:"05.03.01",an:"Trial Initiation Monitoring Report",cl:"Core",iso:"E.1.22 E.1.24 7.2 9.2.4.4 9.2.4.7"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Site Initiation",a:"05.03.02",an:"Site Training Material",cl:"Core",iso:"10.2 b"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Site Initiation",a:"05.03.03",an:"Site Evidence of Training",cl:"Core",iso:"E.1.29 9.2.1 h"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.01",an:"Subject Log",cl:"Core",iso:"E.2.23 7.5.2 7.10"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.02",an:"Source Data Verification",cl:"Recommended",iso:"E.1.23 E.2.15 7.5.3 9.2.4.5.g 10.6 c"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.03",an:"Monitoring Visit Report",cl:"Core",iso:"E.2.10 9.2.3 c 9.2.3 e 9.2.4.7"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.04",an:"Visit Log",cl:"Core",iso:""},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.05",an:"Additional Monitoring Activity",cl:"Core",iso:""},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.06",an:"Protocol Deviations",cl:"Core",iso:"10.4 e 10.6 g 10.6 o"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.07",an:"Financial Documentation",cl:"Recommended",iso:""},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.08",an:"Final Trial Close Out Monitoring Report",cl:"Core",iso:"E.3.5 9.2.4.6 9.2.4.7"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.09",an:"Notification to Investigators of Safety Information",cl:"Core",iso:"E.2.21 9.2.5"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.10",an:"Subject Identification Log",cl:"Core",iso:"E.2.24 E.3.3 7.5.2"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.11",an:"Source Data",cl:"Core",iso:"E 2.13 E.2.14 7.5.3 7.8.2 10.6 c 10.6 q 10.7 f 7.8.1"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.12",an:"Monitoring Visit Follow-up Documentation",cl:"Core",iso:"E.1.24 E 2.10 9.2.3.c 9.2.3.e 9.2.4.7"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Management",a:"05.04.13",an:"Subject Eligibility Verification Forms and Worksheets",cl:"Recommended",iso:""},
  {z:"5",zn:"Site Management",s:"5.05",sn:"General",a:"05.05.01",an:"Relevant Communications",cl:"Core",iso:"E.2.11 9.2.3 b 9.2.3.c 9.2.4.5.D 10.6 e 10.6 h"},
  {z:"5",zn:"Site Management",s:"5.05",sn:"General",a:"05.05.02",an:"Tracking Information",cl:"Recommended",iso:""},
  {z:"5",zn:"Site Management",s:"5.05",sn:"General",a:"05.05.03",an:"Meeting Material",cl:"Core",iso:""},
  {z:"5",zn:"Site Management",s:"5.05",sn:"General",a:"05.05.04",an:"Filenote",cl:"Core",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"IP Documentation",a:"06.01.01",an:"IP Supply Plan",cl:"Recommended",iso:"7.4.3 7.9"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"IP Documentation",a:"06.01.02",an:"IP Instructions for Handling",cl:"Core",iso:"10.2 b Annex B.2.F Annex I.7.C.3"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"IP Documentation",a:"06.01.03",an:"IP Sample Label",cl:"Core",iso:"E.1.3 6.10. Annex I.7 Annex B (B.2.g)"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"IP Documentation",a:"06.01.04",an:"IP Shipment Documentation",cl:"Core",iso:"E. 1.16 E. 2. 8 7.9 9.2.2 C 9.2.3 a 9.2.4.5 n 10.6 K"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"IP Documentation",a:"06.01.05",an:"IP Accountability Documentation",cl:"Core",iso:"E.1.16 E.2.8 E2.25 E.3.1 7.9 8.3 a 9.2.2 C 9.2.3 a 9.2.4.5.n 10.6 k 10.6 q Annex I.7.C.1"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"IP Documentation",a:"06.01.06",an:"IP Transfer Documentation",cl:"Core",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"IP Documentation",a:"06.01.07",an:"IP Re-labeling Documentation",cl:"Core",iso:"6.10 Annex I.7 C 2"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"IP Documentation",a:"06.01.08",an:"IP Recall Documentation",cl:"Core",iso:"9.2.2.D"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"IP Documentation",a:"06.01.09",an:"IP Quality Complaint Form",cl:"Core",iso:"7.4.3 9.1.a"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"IP Documentation",a:"06.01.10",an:"IP Return Documentation",cl:"Core",iso:"E.1.16 E.3.2 7.9 8.3 a 9.2.2.C 9.2.3 a 9.2.45.n 10.6 k 7.4.3"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"IP Documentation",a:"06.01.11",an:"IP Certificate of Destruction",cl:"Core",iso:"A.11, D.7 c, E.1.17 , 10.6.k, 10.6.l"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"IP Documentation",a:"06.01.12",an:"IP Retest and Expiry Documentation",cl:"Core",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.02",sn:"IP Release Process Documentation",a:"06.02.01",an:"QP (Qualified Person) Certification",cl:"Core",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.02",sn:"IP Release Process Documentation",a:"06.02.02",an:"IP Regulatory Release Documentation",cl:"Core",iso:"B.2.D"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.02",sn:"IP Release Process Documentation",a:"06.02.03",an:"IP Verification Statements",cl:"Core",iso:"B.2.D"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.02",sn:"IP Release Process Documentation",a:"06.02.04",an:"Certificate of Analysis",cl:"Core",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.03",sn:"IP Allocation Documentation",a:"06.03.01",an:"IP Treatment Allocation Documentation",cl:"Core",iso:"10.6 k A.6.1.B"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.03",sn:"IP Allocation Documentation",a:"06.03.02",an:"IP Unblinding Plan",cl:"Core",iso:"E.1.20 7.8.1 A 16 b 10.7.e"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.03",sn:"IP Allocation Documentation",a:"06.03.03",an:"IP Treatment Decoding Documentation",cl:"Core",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.04",sn:"Storage",a:"06.04.01",an:"IP Storage Condition Documentation",cl:"Core",iso:"D.6.1.5"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.04",sn:"Storage",a:"06.04.02",an:"IP Storage Condition Excursion Documentation",cl:"Core",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.04",sn:"Storage",a:"06.04.03",an:"Maintenance Logs",cl:"Core",iso:"E.1.31 E.2.28 9.2.4.5.p, 10.6 i"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.05",sn:"Non-IP Documentation",a:"06.05.01",an:"Non-IP Supply Plan",cl:"Recommended",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.05",sn:"Non-IP Documentation",a:"06.05.02",an:"Non-IP Shipment Documentation",cl:"Recommended",iso:"E.1.17 E.2.9 9.2.2.a 9.2.2.d 9.2.4.4.a 9.2.4.4.d"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.05",sn:"Non-IP Documentation",a:"06.05.03",an:"Non-IP Return Documentation",cl:"Recommended",iso:"E.1.17 E.2.9 9.2.2.a 9.2.2.d 9.2.4.4.a 9.2.4.4.d"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.05",sn:"Non-IP Documentation",a:"06.05.04",an:"Non-IP Storage Documentation",cl:"Recommended",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.06",sn:"Interactive Response Technology",a:"06.06.01",an:"IRT User Requirement Specification",cl:"Core",iso:"A.8.B 7.8.3"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.06",sn:"Interactive Response Technology",a:"06.06.02",an:"IRT Validation Certification",cl:"Core",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.06",sn:"Interactive Response Technology",a:"06.06.03",an:"IRT User Acceptance Testing (UAT) Certification",cl:"Core",iso:"B.3.E"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.06",sn:"Interactive Response Technology",a:"06.06.04",an:"IRT User Manual",cl:"Core",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.06",sn:"Interactive Response Technology",a:"06.06.05",an:"IRT User Account Management",cl:"Core",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.07",sn:"General",a:"06.07.01",an:"Relevant Communications",cl:"Core",iso:"E 2.11 9.2.3 c 9.2.4.5 o 10.6 h"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.07",sn:"General",a:"06.07.02",an:"Tracking Information",cl:"Recommended",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.07",sn:"General",a:"06.07.03",an:"Meeting Material",cl:"Core",iso:""},
  {z:"6",zn:"IP and Trial Supplies",s:"6.07",sn:"General",a:"06.07.04",an:"Filenote",cl:"Core",iso:""},
  {z:"7",zn:"Safety Reporting",s:"7.01",sn:"Safety Documentation",a:"07.01.01",an:"Safety Management Plan",cl:"Core",iso:"10.8 a 7.4.1"},
  {z:"7",zn:"Safety Reporting",s:"7.01",sn:"Safety Documentation",a:"07.01.02",an:"Pharmacovigilance Database Line Listing",cl:"Core",iso:"7.4.2"},
  {z:"7",zn:"Safety Reporting",s:"7.02",sn:"Trial Status Reporting",a:"07.02.01",an:"Expedited Safety Report",cl:"Core",iso:"10.8 b 7.4"},
  {z:"7",zn:"Safety Reporting",s:"7.02",sn:"Trial Status Reporting",a:"07.02.02",an:"SAE Report",cl:"Core",iso:"E.2.17 7.4 9.2.4.5.k 9.2.4.5.L 9.2.5 10.8 D 13 g"},
  {z:"7",zn:"Safety Reporting",s:"7.02",sn:"Trial Status Reporting",a:"07.02.03",an:"Pregnancy Report",cl:"Core",iso:""},
  {z:"7",zn:"Safety Reporting",s:"7.02",sn:"Trial Status Reporting",a:"07.02.04",an:"Special Events of Interest",cl:"Core",iso:""},
  {z:"7",zn:"Safety Reporting",s:"7.03",sn:"General",a:"07.03.01",an:"Relevant Communications",cl:"Core",iso:"E 2.11 9.2.3 c 9.2.4.5 O 10.6 h"},
  {z:"7",zn:"Safety Reporting",s:"7.03",sn:"General",a:"07.03.02",an:"Tracking Information",cl:"Recommended",iso:""},
  {z:"7",zn:"Safety Reporting",s:"7.03",sn:"General",a:"07.03.03",an:"Meeting Material",cl:"Core",iso:""},
  {z:"7",zn:"Safety Reporting",s:"7.03",sn:"General",a:"07.03.04",an:"Filenote",cl:"Core",iso:"10.8 e"},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Facility Documentation",a:"08.01.01",an:"Certification or Accreditation",cl:"Core",iso:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t"},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Facility Documentation",a:"08.01.02",an:"Laboratory Validation Documentation",cl:"Core",iso:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t"},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Facility Documentation",a:"08.01.03",an:"Laboratory Results Documentation",cl:"Core",iso:"E.2.29"},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Facility Documentation",a:"08.01.04",an:"Normal Ranges",cl:"Core",iso:"E.1.30 E.2.27 9.2.4.5.q"},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Facility Documentation",a:"08.01.05",an:"Manual",cl:"Recommended",iso:""},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Facility Documentation",a:"08.01.06",an:"Supply Import Documentation",cl:"Core",iso:""},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Facility Documentation",a:"08.01.07",an:"Head of Facility Curriculum Vitae",cl:"Recommended",iso:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t"},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Facility Documentation",a:"08.01.08",an:"Standardization Methods",cl:"Core",iso:""},
  {z:"8",zn:"Central and Local Testing",s:"8.02",sn:"Sample Documentation",a:"08.02.01",an:"Specimen Label",cl:"Recommended",iso:""},
  {z:"8",zn:"Central and Local Testing",s:"8.02",sn:"Sample Documentation",a:"08.02.02",an:"Shipment Records",cl:"Recommended",iso:""},
  {z:"8",zn:"Central and Local Testing",s:"8.02",sn:"Sample Documentation",a:"08.02.03",an:"Sample Storage Condition Log",cl:"Recommended",iso:""},
  {z:"8",zn:"Central and Local Testing",s:"8.02",sn:"Sample Documentation",a:"08.02.04",an:"Sample Import or Export Documentation",cl:"Core",iso:""},
  {z:"8",zn:"Central and Local Testing",s:"8.02",sn:"Sample Documentation",a:"08.02.05",an:"Record of Retained Samples",cl:"Core",iso:""},
  {z:"8",zn:"Central and Local Testing",s:"8.03",sn:"General",a:"08.03.01",an:"Relevant Communications",cl:"Core",iso:"E 2.11 9.2.3 c 9.2.4.5 o 10.6 h"},
  {z:"8",zn:"Central and Local Testing",s:"8.03",sn:"General",a:"08.03.02",an:"Tracking Information",cl:"Recommended",iso:""},
  {z:"8",zn:"Central and Local Testing",s:"8.03",sn:"General",a:"08.03.03",an:"Meeting Material",cl:"Core",iso:""},
  {z:"8",zn:"Central and Local Testing",s:"8.03",sn:"General",a:"08.03.04",an:"Filenote",cl:"Core",iso:""},
  {z:"9",zn:"Third parties",s:"9.01",sn:"Third Party Oversight",a:"09.01.01",an:"Qualification and Compliance",cl:"Core",iso:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t"},
  {z:"9",zn:"Third parties",s:"9.01",sn:"Third Party Oversight",a:"09.01.02",an:"Third Party Curriculum Vitae",cl:"Core",iso:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t"},
  {z:"9",zn:"Third parties",s:"9.01",sn:"Third Party Oversight",a:"09.01.03",an:"Ongoing Third Party Oversight",cl:"Recommended",iso:"J.2.f.15"},
  {z:"9",zn:"Third parties",s:"9.02",sn:"Third Party Set-up",a:"09.02.01",an:"Confidentiality Agreement",cl:"Core",iso:"E.1.13 6.9 9.2.1.a"},
  {z:"9",zn:"Third parties",s:"9.02",sn:"Third Party Set-up",a:"09.02.02",an:"Vendor Selection",cl:"Recommended",iso:""},
  {z:"9",zn:"Third parties",s:"9.02",sn:"Third Party Set-up",a:"09.02.03",an:"Contractual Agreement",cl:"Core",iso:"E.1.13 6.9 9.2.1.a"},
  {z:"9",zn:"Third parties",s:"9.03",sn:"General",a:"09.03.01",an:"Relevant Communications",cl:"Core",iso:"E 2.11 9.2.3 c 9.2.4.5 o 10.6.h"},
  {z:"9",zn:"Third parties",s:"9.03",sn:"General",a:"09.03.02",an:"Tracking Information",cl:"Recommended",iso:""},
  {z:"9",zn:"Third parties",s:"9.03",sn:"General",a:"09.03.03",an:"Meeting Material",cl:"Core",iso:"9.2.4.2.c"},
  {z:"9",zn:"Third parties",s:"9.03",sn:"General",a:"09.03.04",an:"Filenote",cl:"Core",iso:""},
  {z:"10",zn:"Data Management",s:"10.01",sn:"Data Management Oversight",a:"10.01.01",an:"Data Management Plan",cl:"Recommended",iso:"6.6 7.8.3.a"},
  {z:"10",zn:"Data Management",s:"10.02",sn:"Data Capture",a:"10.02.01",an:"CRF Completion Requirements",cl:"Core",iso:"7.8.2"},
  {z:"10",zn:"Data Management",s:"10.02",sn:"Data Capture",a:"10.02.02",an:"Annotated CRF",cl:"Recommended",iso:"7.8.1 7.8.2 10.6 j"},
  {z:"10",zn:"Data Management",s:"10.02",sn:"Data Capture",a:"10.02.04",an:"Documentation of Corrections to Entered Data",cl:"Core",iso:"E.2.18 7.8.2 a 9.2.4.5 j 10.6 j"},
  {z:"10",zn:"Data Management",s:"10.02",sn:"Data Capture",a:"10.02.05",an:"Final Subject Data",cl:"Core",iso:"E.2.16 7.3 7.8.1 7.8.2 9.2.4.5.j) 10.6 j"},
  {z:"10",zn:"Data Management",s:"10.03",sn:"Database",a:"10.03.01",an:"Database Requirements",cl:"Core",iso:"7.8.3"},
  {z:"10",zn:"Data Management",s:"10.03",sn:"Database",a:"10.03.02",an:"Edit Check Plan",cl:"Core",iso:"7.8.3d"},
  {z:"10",zn:"Data Management",s:"10.03",sn:"Database",a:"10.03.03",an:"Edit Check Programming",cl:"Core",iso:"7.8.3 a"},
  {z:"10",zn:"Data Management",s:"10.03",sn:"Database",a:"10.03.04",an:"Edit Check Testing",cl:"Core",iso:"7.8.3 f"},
  {z:"10",zn:"Data Management",s:"10.03",sn:"Database",a:"10.03.05",an:"Approval for Database Activation",cl:"Core",iso:"A.8 B 7.8.3"},
  {z:"10",zn:"Data Management",s:"10.03",sn:"Database",a:"10.03.06",an:"External Data Transfer Specifications",cl:"Core",iso:"A.8 B 3.13"},
  {z:"10",zn:"Data Management",s:"10.03",sn:"Database",a:"10.03.07",an:"Data Entry Guidelines (Paper)",cl:"Core",iso:"7.8.2"},
  {z:"10",zn:"Data Management",s:"10.03",sn:"Database",a:"10.03.08",an:"SAE Reconciliation",cl:"Core",iso:"9.2.5 7.8.3"},
  {z:"10",zn:"Data Management",s:"10.03",sn:"Database",a:"10.03.09",an:"Dictionary Coding",cl:"Core",iso:""},
  {z:"10",zn:"Data Management",s:"10.03",sn:"Database",a:"10.03.10",an:"Data Review Documentation",cl:"Core",iso:"7.8.3.d"},
  {z:"10",zn:"Data Management",s:"10.03",sn:"Database",a:"10.03.11",an:"Database Lock and Unlock Approval",cl:"Core",iso:"7.8.3.a"},
  {z:"10",zn:"Data Management",s:"10.03",sn:"Database",a:"10.03.12",an:"Database Change Control",cl:"Core",iso:"7.8.3.a"},
  {z:"10",zn:"Data Management",s:"10.04",sn:"EDC Management",a:"10.04.01",an:"System Account Management",cl:"Core",iso:"7.8.3. h"},
  {z:"10",zn:"Data Management",s:"10.04",sn:"EDC Management",a:"10.04.02",an:"Technical Design Document",cl:"Core",iso:"7.8.3.b"},
  {z:"10",zn:"Data Management",s:"10.04",sn:"EDC Management",a:"10.04.03",an:"Validation Documentation",cl:"Core",iso:"7.8.3.c"},
  {z:"10",zn:"Data Management",s:"10.05",sn:"General",a:"10.05.01",an:"Relevant Communications",cl:"Core",iso:"E 2.11 9.2.3 c 9.2.4.5 o 10.6.h"},
  {z:"10",zn:"Data Management",s:"10.05",sn:"General",a:"10.05.02",an:"Tracking Information",cl:"Recommended",iso:""},
  {z:"10",zn:"Data Management",s:"10.05",sn:"General",a:"10.05.03",an:"Meeting Material",cl:"Core",iso:""},
  {z:"10",zn:"Data Management",s:"10.05",sn:"General",a:"10.05.04",an:"Filenote",cl:"Core",iso:""},
  {z:"11",zn:"Statistics",s:"11.01",sn:"Statistics Oversight",a:"11.01.01",an:"Statistical Analysis Plan",cl:"Core",iso:"6.6"},
  {z:"11",zn:"Statistics",s:"11.01",sn:"Statistics Oversight",a:"11.01.02",an:"Sample Size Calculation",cl:"Core",iso:"3.25 A7e A7e6 6.2.2 E.2"},
  {z:"11",zn:"Statistics",s:"11.02",sn:"Randomization",a:"11.02.01",an:"Randomization Plan",cl:"Core",iso:""},
  {z:"11",zn:"Statistics",s:"11.02",sn:"Randomization",a:"11.02.02",an:"Randomization Procedure",cl:"Core",iso:""},
  {z:"11",zn:"Statistics",s:"11.02",sn:"Randomization",a:"11.02.03",an:"Master Randomization List",cl:"Core",iso:"E.1.19 7.8.1"},
  {z:"11",zn:"Statistics",s:"11.02",sn:"Randomization",a:"11.02.04",an:"Randomization Programming",cl:"Core",iso:"A.7.E 7.8.3"},
  {z:"11",zn:"Statistics",s:"11.02",sn:"Randomization",a:"11.02.05",an:"Randomization Sign Off",cl:"Core",iso:"A.7.E 7.8.3."},
  {z:"11",zn:"Statistics",s:"11.02",sn:"Randomization",a:"11.02.06",an:"End of Trial or Interim Unblinding",cl:"Core",iso:"7.8.1 10.7.e"},
  {z:"11",zn:"Statistics",s:"11.03",sn:"Analysis",a:"11.03.01",an:"Data Definitions for Analysis Datasets",cl:"Core",iso:""},
  {z:"11",zn:"Statistics",s:"11.03",sn:"Analysis",a:"11.03.02",an:"Analysis QC Documentation",cl:"Core",iso:""},
  {z:"11",zn:"Statistics",s:"11.03",sn:"Analysis",a:"11.03.03",an:"Interim Analysis Raw Datasets",cl:"Core",iso:""},
  {z:"11",zn:"Statistics",s:"11.03",sn:"Analysis",a:"11.03.04",an:"Interim Analysis Programs",cl:"Core",iso:""},
  {z:"11",zn:"Statistics",s:"11.03",sn:"Analysis",a:"11.03.05",an:"Interim Analysis Datasets",cl:"Core",iso:""},
  {z:"11",zn:"Statistics",s:"11.03",sn:"Analysis",a:"11.03.06",an:"Interim Analysis Output",cl:"Core",iso:""},
  {z:"11",zn:"Statistics",s:"11.03",sn:"Analysis",a:"11.03.07",an:"Final Analysis Raw Datasets",cl:"Core",iso:""},
  {z:"11",zn:"Statistics",s:"11.03",sn:"Analysis",a:"11.03.08",an:"Final Analysis Programs",cl:"Core",iso:"D.6.I."},
  {z:"11",zn:"Statistics",s:"11.03",sn:"Analysis",a:"11.03.09",an:"Final Analysis Datasets",cl:"Core",iso:""},
  {z:"11",zn:"Statistics",s:"11.03",sn:"Analysis",a:"11.03.10",an:"Final Analysis Output",cl:"Core",iso:"8.4"},
  {z:"11",zn:"Statistics",s:"11.03",sn:"Analysis",a:"11.03.11",an:"Subject Evaluability Criteria and Subject Classification",cl:"Core",iso:"A.6.3"},
  {z:"11",zn:"Statistics",s:"11.04",sn:"Report",a:"11.04.01",an:"Interim Statistical Report(s)",cl:"Core",iso:"E.3.8 8.3 9.2.6 b Annex D"},
  {z:"11",zn:"Statistics",s:"11.04",sn:"Report",a:"11.04.02",an:"Statistical Report",cl:"Core",iso:"E.3.8 8.3 9.2.6 b Annex D"},
  {z:"11",zn:"Statistics",s:"11.05",sn:"General",a:"11.05.01",an:"Relevant Communications",cl:"Core",iso:"E2.11 9.2.3 c 9.2.4.5 o 10.6.h"},
  {z:"11",zn:"Statistics",s:"11.05",sn:"General",a:"11.05.02",an:"Tracking Information",cl:"Recommended",iso:""},
  {z:"11",zn:"Statistics",s:"11.05",sn:"General",a:"11.05.03",an:"Meeting Material",cl:"Core",iso:""},
  {z:"11",zn:"Statistics",s:"11.05",sn:"General",a:"11.05.04",an:"Filenote",cl:"Core",iso:""},
];

const ZONES=[
  {z:"1",zn:"Trial Management"},
  {z:"2",zn:"Central Trial Documents"},
  {z:"3",zn:"Regulatory"},
  {z:"4",zn:"IRB or IEC and other Approvals"},
  {z:"5",zn:"Site Management"},
  {z:"6",zn:"IP and Trial Supplies"},
  {z:"7",zn:"Safety Reporting"},
  {z:"8",zn:"Central and Local Testing"},
  {z:"9",zn:"Third parties"},
  {z:"10",zn:"Data Management"},
  {z:"11",zn:"Statistics"},
];


const ZONE_COLORS:Record<string,string>={
  "1":"#6366F1","2":"#8B5CF6","3":"#EF4444","4":"#F59E0B","5":"#10B981",
  "6":"#3B82F6","7":"#EC4899","8":"#F97316","9":"#14B8A6","10":"#84CC16","11":"#6B7280",
};

const FILE_ICONS:Record<string,string>={
  pdf:"PDF",doc:"DOC",docx:"DOC",xls:"XLS",xlsx:"XLS",ppt:"PPT",pptx:"PPT",
  png:"IMG",jpg:"IMG",jpeg:"IMG",gif:"IMG",mp4:"VID",zip:"ZIP",csv:"CSV",txt:"TXT",
};

interface Study{study_id:string;protocol:string;phase:string;status:string;sponsor:string;user_id:string;org_id?:string;}
interface Doc{id?:string;study_id:string;user_id:string;org_id?:string;artifact_num:string;artifact_name:string;zone:string;version:string;status:string;owner:string;effective_date:string;expiry_date:string;file_path:string;file_name:string;custom_file_name:string;file_type:string;file_size:number;comments:string;approved_by?:string;approved_at?:string;signature_reason?:string;submission_reason?:string;rejection_reason?:string;rejected_by?:string;rejected_at?:string;appeal_reason?:string;quality_score?:number;quality_flags?:string[];}

function fileIcon(n:string){return FILE_ICONS[n.split(".").pop()?.toLowerCase()||""]||"FILE";}
function canPreview(n:string){return["pdf","png","jpg","jpeg","gif","webp"].includes(n.split(".").pop()?.toLowerCase()||"");}
function formatSize(b:number){if(b<1024)return b+" B";if(b<1024*1024)return(b/1024).toFixed(1)+" KB";return(b/(1024*1024)).toFixed(1)+" MB";}
function scoreColor(s:number){return s>=80?"#10B981":s>=60?"#F59E0B":"#EF4444";}
function padZone(z:string){return z.padStart(2,"0");}
const ZONE_ICONS:Record<string,string>={
  "1":"ti-clipboard-list","2":"ti-users","3":"ti-shield-check","4":"ti-certificate",
  "5":"ti-building","6":"ti-file-check","7":"ti-package","8":"ti-alert-triangle",
  "9":"ti-chart-bar","10":"ti-database","11":"ti-flask",
};
function formatSection(s:string){const parts=(s||"").split(".");if(parts.length<2)return s||"00.00";return `${parts[0].padStart(2,"0")}.${parts[1]}`;}

export default function Platform(){
  const[panel,setPanelRaw]=useState("auth");
  function setPanel(p:string){setPanelRaw(p);if(p!=="auth"){try{localStorage.setItem("tmf_panel",p);}catch{}if(user)loadUserRole(user.id);}}
  const[user,setUser]=useState<any>(null);
  const[currentUserRole,setCurrentUserRole]=useState<string>("");
  const[canUploadDownload,setCanUploadDownload]=useState<boolean>(true);
  const[canDownload,setCanDownload]=useState<boolean>(true);
  const[orgId,setOrgId]=useState<string>("");
  const[authMode,setAuthMode]=useState<"login"|"signup">("login");
  const[showLoginPwd,setShowLoginPwd]=useState(false);
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[authError,setAuthError]=useState("");
  const[studies,setStudies]=useState<Study[]>([]);
  const[docs,setDocs]=useState<Doc[]>([]);
  const[activeStudy,setActiveStudy]=useState<Study|null>(null);
  const[docFilter,setDocFilter]=useState("all");
  const[docSearch,setDocSearch]=useState("");
  const[artSearch,setArtSearch]=useState("");
  const[artZone,setArtZone]=useState("");
  const[artCl,setArtCl]=useState("");
  const[gapZone,setGapZone]=useState("");
  const[expandedArt,setExpandedArt]=useState<string|null>(null);
  const[showStudyModal,setShowStudyModal]=useState(false);
  const[showDocModal,setShowDocModal]=useState(false);
  const[showSubmitModal,setShowSubmitModal]=useState(false);
  const[showApproveModal,setShowApproveModal]=useState(false);
  const[showCommentModal,setShowCommentModal]=useState(false);
  const[selectedDoc,setSelectedDoc]=useState<Doc|null>(null);
  const[fId,setFId]=useState("");
  const[fProtocol,setFProtocol]=useState("");
  const[fPhase,setFPhase]=useState("Phase I");
  const[fStatus,setFStatus]=useState("Startup");
  const[fSponsor,setFSponsor]=useState("");
  const[fZone,setFZone]=useState("1");
  const[fArtifact,setFArtifact]=useState("");
  const[fVersion,setFVersion]=useState("");
  const[fDocStatus,setFDocStatus]=useState("Draft");
  const[fOwner,setFOwner]=useState("");
  const[fEff,setFEff]=useState("");
  const[fExp,setFExp]=useState("");
  const[fComments,setFComments]=useState("");
  const[fCustomName,setFCustomName]=useState("");
  const[uploading,setUploading]=useState(false);
  const[uploadProgress,setUploadProgress]=useState("");
  const[dragOver,setDragOver]=useState(false);
  const[selectedFile,setSelectedFile]=useState<File|null>(null);
  const[pendingFilePath,setPendingFilePath]=useState("");
  const[pendingFileName,setPendingFileName]=useState("");
  const[pendingFileType,setPendingFileType]=useState("");
  const[pendingFileSize,setPendingFileSize]=useState(0);
  const[zoneArts,setZoneArts]=useState<any[]>([]);
  const[submissionReason,setSubmissionReason]=useState("");
  const[approvePassword,setApprovePassword]=useState("");
  const[approveReason,setApproveReason]=useState("");
  const[approveError,setApproveError]=useState("");
  const[commentText,setCommentText]=useState("");
  const[previewUrl,setPreviewUrl]=useState<string|null>(null);
  const[previewName,setPreviewName]=useState("");
  const[chatMessages,setChatMessages]=useState<{role:string;text:string;isHealthCard?:boolean;docId?:string;sourceTags?:string[];classification?:{zoneLine:string;confidence:number;warning?:{detail:string;action:string}}}[]>([{role:"ai",text:"Hi, I'm Trinity - your TMF AI specialist for this study. I can classify uploaded documents against the tracker, and answer questions about this study's trial master file."}]);
  const[chatInput,setChatInput]=useState("");
  const[chatLoading,setChatLoading]=useState(false);
const[chatDocAction,setChatDocAction]=useState<{msgIdx:number,stage:number,disabled:boolean}|null>(null);
const[flagComment,setFlagComment]=useState("");
const[flagStage,setFlagStage]=useState<"idle"|"form"|"done">("idle");
const[flagMsgIdx,setFlagMsgIdx]=useState<number|null>(null);
const[flagDocId,setFlagDocId]=useState<string|null>(null);
const[flagReason,setFlagReason]=useState("");
const[approveStage,setApproveStage]=useState<0|1|2|3>(0);
const[approveDocId,setApproveDocId]=useState<string|null>(null);
  const messagesEnd=useRef<HTMLDivElement>(null);
  const[tmfConfig,setTmfConfig]=useState<any[]>([]);
  const[userFullName,setUserFullName]=useState("");
  const fileInputRef=useRef<HTMLInputElement>(null);
  const chatFileInputRef=useRef<HTMLInputElement>(null);

  const P={
    primary:"#F97316",primaryLight:"#FFEDD5",primaryDark:"#EA580C",
    text:"#111827",textSec:"#374151",textTert:"#6B7280",textMuted:"#9CA3AF",
    bg:"#FFFFFF",bgSec:"#F9FAFB",bgTert:"#F3F4F6",
    border:"#E5E7EB",borderSec:"#D1D5DB",
    success:"#10B981",successLight:"#ECFDF5",
    danger:"#EF4444",dangerLight:"#FEF2F2",
    warning:"#F59E0B",warningLight:"#FFFBEB",
    blue:"#3B82F6",blueLight:"#EFF6FF",
  };

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        setUser(session.user);
        supabase.from("user_roles").select("org_id").eq("user_id",session.user.id).single().then(({data})=>{
          if(!data||!data.org_id){window.location.href="/setup";}
          else{const saved=typeof window!=="undefined"?localStorage.getItem("tmf_panel"):null;setPanel(saved&&saved!=="auth"?saved:"dashboard");loadUserRole(session.user.id);}
        });
      }
    });
    supabase.auth.onAuthStateChange((_,session)=>{
      if(session?.user){
        setUser(session.user);
        supabase.from("user_roles").select("org_id").eq("user_id",session.user.id).single().then(({data})=>{
          if(!data||!data.org_id){window.location.href="/setup";}
          else{const saved=typeof window!=="undefined"?localStorage.getItem("tmf_panel"):null;setPanel(saved&&saved!=="auth"?saved:"dashboard");loadUserRole(session.user.id);}
        });
      }else{
        setUser(null);setPanel("auth");setStudies([]);setDocs([]);setActiveStudy(null);
      }
    });
  },[]);

  useEffect(()=>{messagesEnd.current?.scrollIntoView({behavior:"smooth"});},[chatMessages]);

  async function loadUserRole(uid:string){
    const{data}=await supabase.from("user_roles").select("role,can_upload_download,can_download,org_id,full_name").eq("user_id",uid).single();
    if(data){
      setCurrentUserRole(data.role);
      setCanUploadDownload(data.can_upload_download!==false);
      setCanDownload(data.can_download!==false);
      setUserFullName(data.full_name||"");
      if(data.org_id){setOrgId(data.org_id);loadStudiesWithOrg(data.org_id);}
    }
  }

  async function loadStudiesWithOrg(oid:string){
    const{data}=await supabase.from("studies").select("*").eq("org_id",oid).order("created_at",{ascending:false});
    if(data&&data.length>0){setStudies(data);setActiveStudy(data[0]);loadDocsWithOrg(data[0].study_id,oid);}
    else setStudies([]);
  }

  async function loadDocsWithOrg(studyId:string,oid:string){
    const{data}=await supabase.from("documents").select("*").eq("study_id",studyId).eq("org_id",oid).order("created_at",{ascending:false});
    if(data)setDocs(data);
    loadTmfConfig(studyId,oid);
  }
  async function loadTmfConfig(studyId:string,oid:string){
    const{data}=await supabase.from('tmf_config').select('*').eq('org_id',oid).eq('study_id',studyId).eq('is_enabled',true);
    if(data)setTmfConfig(data);
  }

  function loadDocs(studyId:string,uid:string){
    if(orgId)loadDocsWithOrg(studyId,orgId);
  }

  async function handleAuth(){
    setAuthError("");
    if(authMode==="signup"){
      const{error}=await supabase.auth.signUp({email,password});
      if(error)setAuthError(error.message);
      else setAuthError("Account created! Check your email to confirm, then log in.");
    }else{
      const{error}=await supabase.auth.signInWithPassword({email,password});
      if(error)setAuthError(error.message);
    }
  }

  async function handleSignOut(){
    await supabase.auth.signOut();
    setUser(null);setPanel("auth");setStudies([]);setDocs([]);setActiveStudy(null);
    setOrgId("");setCurrentUserRole("");
  }

  async function logAudit(action:string,docId:string|undefined,studyId:string,field:string,oldVal:string,newVal:string,sigReason:string=""){
    await supabase.from("audit_trail").insert([{
      user_id:user.id,user_email:user.email,action,document_id:docId,
      study_id:studyId,field_changed:field,old_value:oldVal,new_value:newVal,signature_reason:sigReason,
    }]);
  }

  async function createStudy(){
    if(!fId.trim()||!user||!orgId)return;
    const s={study_id:fId,protocol:fProtocol,phase:fPhase,status:fStatus,sponsor:fSponsor,user_id:user.id,org_id:orgId};
    const{data,error}=await supabase.from("studies").insert([s]).select();
    if(!error&&data){const ns=data[0];setStudies(prev=>[ns,...prev]);setActiveStudy(ns);setDocs([]);}
    setShowStudyModal(false);setFId("");setFProtocol("");setFSponsor("");setPanel("dashboard");
  }

  async function handleFileUpload(file:File){
    if(!user||!activeStudy)return;
    setUploading(true);setUploadProgress("Uploading...");
    const path=`${user.id}/${activeStudy.study_id}/${Date.now()}_${file.name}`;
    const{error:upErr}=await supabase.storage.from("Documents").upload(path,file);
    if(upErr){setUploadProgress("Upload failed: "+upErr.message);setUploading(false);return;}
    setPendingFilePath(path);setPendingFileName(file.name);setPendingFileType(file.type);setPendingFileSize(file.size);
    setSelectedFile(file);setUploadProgress("v "+file.name+" ready");setUploading(false);
  }

  async function addDocument(){
    if(!user||!activeStudy||!orgId)return;
    const[artNum,an,zone]=fArtifact.split("|");
    const d:Doc={
      study_id:activeStudy!.study_id,user_id:user.id,org_id:orgId,
      artifact_num:artNum,artifact_name:an,zone,
      version:fVersion,status:fDocStatus,owner:fOwner,
      effective_date:fEff,expiry_date:fExp,comments:fComments,
      file_path:pendingFilePath,file_name:pendingFileName,
      custom_file_name:fCustomName,file_type:pendingFileType,file_size:pendingFileSize,
    };
    const{data,error}=await supabase.from("documents").insert([d]).select();
    if(!error&&data){
      setDocs(prev=>[data[0],...prev]);
      await logAudit("Document uploaded",data[0].id,activeStudy.study_id,"status","",fDocStatus);
      fetch("/api/notify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"document_uploaded",document_name:fCustomName||pendingFileName||an,artifact_name:an,zone,study_id:activeStudy.study_id,uploaded_by:user.email})});
    }
    setShowDocModal(false);setFArtifact("");setFVersion("");setFOwner("");setFEff("");setFExp("");setFComments("");setFCustomName("");setPendingFilePath("");setPendingFileName("");setPendingFileType("");setPendingFileSize(0);setSelectedFile(null);setUploadProgress("");
  }

  async function handleApprove(){
    if(!selectedDoc||!user)return;
    setApproveError("");
    if(!approvePassword){setApproveError("Please enter your password.");return;}
    if(!approveReason){setApproveError("Please select a reason.");return;}
    const{error:signInErr}=await supabase.auth.signInWithPassword({email:user.email,password:approvePassword});
    if(signInErr){setApproveError("Incorrect password.");return;}
    const now=new Date().toISOString();
    const{error}=await supabase.from("documents").update({status:"Approved",approved_by:user.email,approved_at:now,signature_reason:approveReason}).eq("id",selectedDoc.id);
    if(!error){
      await logAudit("Document approved",selectedDoc.id,selectedDoc.study_id,"status","Under Review","Approved",approveReason);
      setDocs(prev=>prev.map(d=>d.id===selectedDoc.id?{...d,status:"Approved",approved_by:user.email,approved_at:now,signature_reason:approveReason}:d));
      setChatMessages(prev=>[...prev,{role:"ai",text:`"${selectedDoc.custom_file_name||selectedDoc.artifact_name}" has been approved and filed. Audit trail entry recorded.`}]);
      setShowApproveModal(false);setApprovePassword("");setApproveReason("");setSelectedDoc(null);
    }
  }

  async function handleAddComment(){
    if(!selectedDoc||!commentText.trim())return;
    const existing=selectedDoc.comments||"";
    const newComment=`${existing}${existing?"\n":""}[${new Date().toLocaleString()} - ${user.email}]: ${commentText.trim()}`;
    const{error}=await supabase.from("documents").update({comments:newComment}).eq("id",selectedDoc.id);
    if(!error){
      await logAudit("Comment added",selectedDoc.id,selectedDoc.study_id,"comments","",commentText.trim());
      setDocs(prev=>prev.map(d=>d.id===selectedDoc.id?{...d,comments:newComment}:d));
      setShowCommentModal(false);setCommentText("");setSelectedDoc(null);
    }
  }

  function openPreview(d:Doc){
    const url=supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl;
    setPreviewUrl(url);setPreviewName(d.custom_file_name||d.file_name||"Document");
  }

  function detectFlagReason(doc:Doc){
    if(!doc.version||doc.version.trim()===""){return "Missing version - no version number is on file for this document.";}
    if(doc.expiry_date&&new Date(doc.expiry_date)<new Date()){return `Document expired - the effective document expired on ${doc.expiry_date}.`;}
    return `Version mismatch - document version ${doc.version} does not match the current tracked version for this artifact.`;
  }

  function presentClassification(){
    if(!activeStudy){setChatMessages(prev=>[...prev,{role:"ai",text:"Select a study first."}]);return;}
    const pendingDoc=studyDocs.find(d=>d.status==="Under Review");
    if(!pendingDoc){
      setChatMessages(prev=>[...prev,{role:"ai",text:`There are no documents currently under review in ${activeStudy.study_id}.`}]);
      return;
    }
    const art=activeTMF.find(a=>a.a===pendingDoc.artifact_num);
    const{score:confidence,flags}=calcQuality(pendingDoc);
    const zoneLine=`Zone ${padZone(pendingDoc.zone)} - Section ${formatSection(art?.s||"")} - ${art?.an||pendingDoc.artifact_name}`;
    const warning=flags.length>0?{detail:detectFlagReason(pendingDoc),action:"Request the current version from the site before filing, or flag this for reviewer follow-up."}:undefined;
    setChatMessages(prev=>{
      const idx=prev.length;
      setChatDocAction({msgIdx:idx,stage:0,disabled:false});
      return[...prev,{role:"ai",text:"I've classified this document and checked it against the version tracker.",docId:pendingDoc.id,classification:{zoneLine,confidence,warning}}];
    });
  }

  async function sendChat(){
    if(!chatInput.trim()||chatLoading)return;
    const userMsg=chatInput.trim();setChatInput("");
    setChatMessages(prev=>[...prev,{role:"user",text:userMsg}]);
    setChatDocAction(null);setFlagStage("idle");setFlagMsgIdx(null);setFlagComment("");setFlagDocId(null);setFlagReason("");
    setApproveStage(0);setApproveDocId(null);
    setChatLoading(true);

    const lower=userMsg.toLowerCase();

    // TMF health / status snapshot
    if(activeStudy&&/(health|status|readiness|overview)/.test(lower)&&/(tmf|study|trial)/.test(lower)){
      const summary=`${donePct}% complete, with ${missing} core document${missing!==1?"s":""} still outstanding and ${pending} awaiting review. Inspection readiness is ${ri}/100 for ${activeStudy.study_id}.`;
      setChatMessages(prev=>[...prev,{role:"ai",text:summary,isHealthCard:true,sourceTags:["Gap analysis","Inspection readiness","Document tracker"]}]);
      setChatLoading(false);
      return;
    }

    // "Why was this flagged / rejected" lookups - scoped to the active study only
    if(activeStudy&&/why/.test(lower)&&/(flag|reject)/.test(lower)){
      const flaggedDoc=studyDocs.find(d=>d.status==="Draft"&&(d as any).rejection_reason);
      if(flaggedDoc){
        setChatMessages(prev=>[...prev,{role:"ai",text:`"${flaggedDoc.custom_file_name||flaggedDoc.artifact_name}" (${flaggedDoc.artifact_num}) was flagged for this reason:\n${(flaggedDoc as any).rejection_reason}`,sourceTags:["Document tracker","Audit trail"]}]);
      }else{
        setChatMessages(prev=>[...prev,{role:"ai",text:`There are no flagged documents in ${activeStudy.study_id} right now.`}]);
      }
      setChatLoading(false);
      return;
    }

    // Document review / approve / flag / upload intent
    if(activeStudy&&/(review|approve|classify|flag|upload)/.test(lower)&&/(doc|document|file|tracker)/.test(lower)){
      presentClassification();
      setChatLoading(false);
      return;
    }

    try{
      const missingList=gaps.crit.concat(gaps.major).concat(gaps.minor).map((g:any)=>`${g.a} - ${g.an} (Zone ${g.z})`).join("\n");const studyContext=activeStudy?`Active study: ${activeStudy.study_id} (${activeStudy.protocol}). Documents filed: ${docs.length}. TMF completeness: ${donePct}%. Inspection readiness score: ${ri}. Missing core documents (${missing} total):\n${missingList}\n\nDocuments pending review: ${pending}.`:"No active study.";
      const recentTurns=chatMessages.slice(-6).map(m=>`${m.role==="user"?"User":"Trinity"}: ${m.text}`).join("\n");
      const scopeNote=activeStudy?`Only answer using data for study ${activeStudy.study_id}. Never reference other studies or organisation-wide data.`:"";
      const context=`${studyContext}\nRecent conversation:\n${recentTurns}\n${scopeNote}`;
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:userMsg,context})});
      const data=await res.json();
      setChatMessages(prev=>[...prev,{role:"ai",text:data.response||"I couldn't process that request."}]);
    }catch{setChatMessages(prev=>[...prev,{role:"ai",text:"Error connecting to AI. Please try again."}]);}
    setChatLoading(false);
  }

  const studyDocs=docs;
  const activeZONES=tmfConfig.filter(c=>c.type==="zone").sort((a,b)=>parseFloat(a.zone_num)-parseFloat(b.zone_num)).map(c=>({z:c.zone_num,zn:c.zone_name}));
  const activeTMF=tmfConfig.filter(c=>c.type==="artifact").map(c=>({z:c.zone_num,zn:c.zone_name||"",s:c.section_num||"",sn:"",a:c.artifact_num,an:c.artifact_name,cl:c.classification||"Core",iso:c.iso_ref||""}));

  const filteredDocs=studyDocs.filter(d=>{
    if(docFilter!=="all"&&d.status!==docFilter)return false;
    if(docSearch&&!d.artifact_name?.toLowerCase().includes(docSearch.toLowerCase())&&!d.custom_file_name?.toLowerCase().includes(docSearch.toLowerCase()))return false;
    return true;
  });
  const filteredArts=activeTMF.slice().sort((a,b)=>a.a.localeCompare(b.a,undefined,{numeric:true,sensitivity:"base"})).filter(a=>{
    if(artZone&&a.z!==artZone)return false;
    if(artCl&&a.cl!==artCl)return false;
    if(artSearch&&!a.an.toLowerCase().includes(artSearch.toLowerCase())&&!a.a.includes(artSearch))return false;
    return true;
  });
  const filedNames=studyDocs.filter(d=>d.status==="Approved").map(d=>d.artifact_num);
  const zoneComp=(z:string)=>{
    const total=activeTMF.filter(a=>a.cl==="Core"&&a.z===z).length;
    const filed=studyDocs.filter(d=>d.status==="Approved"&&activeTMF.some(a=>a.a===d.artifact_num&&a.z===z)).length;
    return total?Math.round((filed/total)*100):0;
  };
  const coreArts=activeTMF.filter(a=>a.cl==="Core");
  const critZones=["3","4","5"];const majZones=["1","2","7"];
  const gaps={
    crit:activeTMF.filter(a=>a.cl==="Core"&&critZones.includes(a.z)&&!filedNames.includes(a.a)).map(a=>({...a,zn:activeZONES.find(z=>z.z===a.z)?.zn||""})),
    major:activeTMF.filter(a=>a.cl==="Core"&&majZones.includes(a.z)&&!filedNames.includes(a.a)).map(a=>({...a,zn:activeZONES.find(z=>z.z===a.z)?.zn||""})),
    minor:activeTMF.filter(a=>a.cl==="Core"&&!critZones.includes(a.z)&&!majZones.includes(a.z)&&!filedNames.includes(a.a)).map(a=>({...a,zn:activeZONES.find(z=>z.z===a.z)?.zn||""})),
  };
  const totalCore=coreArts.length;
  const filedCore=coreArts.filter(a=>filedNames.includes(a.a)).length;
  const donePct=totalCore?Math.round((filedCore/totalCore)*100):0;
  const missing=gaps.crit.length+gaps.major.length+gaps.minor.length;
  const expiring=studyDocs.filter(d=>d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+90*86400000)).length;
  const pending=studyDocs.filter(d=>d.status==="Under Review").length;

  const totalW=activeZONES.reduce((s,{z})=>{const w=critZones.includes(z)?3:majZones.includes(z)?2:1;return s+w;},0);
  const earnedW=activeZONES.reduce((s,{z})=>{const w=critZones.includes(z)?3:majZones.includes(z)?2:1;return s+(zoneComp(z)/100)*w;},0);
  const ri=totalW?Math.round((earnedW/totalW)*100):0;
  const auditorScore=totalCore?Math.round((studyDocs.filter(d=>d.status==="Approved"&&coreArts.some((a:any)=>a.a===d.artifact_num)).length/totalCore)*100):0;

  function statusBadge(s:string){
    const c:Record<string,any>={
      "Draft":{bg:"#F3F4F6",color:"#374151"},
      "Under Review":{bg:"#EFF6FF",color:"#1D4ED8"},
      "Approved":{bg:"#ECFDF5",color:"#065F46"},
      "Archived":{bg:"#F3F4F6",color:"#6B7280"},
    };
    const st=c[s]||c["Draft"];
    return<span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:st.bg,color:st.color,fontWeight:"500"}}>{s}</span>;
  }

  const miniRing=(pct:number,color:string,size=48,stroke=5)=>{
    const r=(size-stroke)/2,c=2*Math.PI*r,off=c-(Math.min(pct,100)/100)*c;
    return(
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)",flexShrink:0}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={P.bgTert} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"/>
      </svg>
    );
  };

  const readinessGauge=(pct:number,size=180,stroke=16)=>{
    const r=(size-stroke)/2,cx=size/2,cy=size/2;
    const sweep=270,startAngle=225;
    const polar=(ang:number)=>{const rad=(ang-90)*Math.PI/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};};
    const arcPath=(a0:number,a1:number)=>{const p0=polar(a0),p1=polar(a1);const large=a1-a0<=180?0:1;return`M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;};
    const endAngle=startAngle+sweep*(Math.min(pct,100)/100);
    const color=pct>=80?P.success:pct>=50?P.primary:P.danger;
    return(
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={arcPath(startAngle,startAngle+sweep)} fill="none" stroke={P.bgTert} strokeWidth={stroke} strokeLinecap="round"/>
        <path d={arcPath(startAngle,endAngle)} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"/>
      </svg>
    );
  };

  const navItem=(id:string,label:string,icon:string)=>(
    <button key={id} onClick={()=>{setPanel(id);if(activeStudy&&user&&orgId)loadDocsWithOrg(activeStudy.study_id,orgId);}}
      style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",borderRadius:"8px",border:"none",cursor:"pointer",width:"100%",textAlign:"left",fontSize:"12px",background:panel===id?P.primaryLight:"transparent",color:panel===id?P.primary:P.textSec,fontWeight:panel===id?"500":"400"}}>
      <i className={`ti ${icon}`} style={{fontSize:"15px"}}/>
      {label}
    </button>
  );

  if(panel==="auth")return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${P.primaryLight} 0%,#fff 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"16px",padding:"2rem",width:"360px",boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:"24px",fontWeight:"500",color:P.text}}>TMF<span style={{color:P.primary}}>360</span></div>
          <div style={{fontSize:"12px",color:P.textTert,marginTop:"4px"}}>Trial Master File Platform</div>
          <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>DIA TMF Reference Model v3.3.1 - ISO 14155 - 21 CFR Part 11</div>
        </div>
        <div style={{display:"flex",gap:"6px",marginBottom:"1.25rem"}}>
          {(["login","signup"] as const).map(m=>(
            <button key={m} onClick={()=>setAuthMode(m)} style={{flex:1,padding:"7px",fontSize:"12px",borderRadius:"8px",border:`0.5px solid ${authMode===m?P.primary:P.border}`,background:authMode===m?P.primaryLight:"transparent",color:authMode===m?P.primary:P.textSec,fontWeight:authMode===m?"500":"400",cursor:"pointer"}}>
              {m==="login"?"Log in":"Sign up"}
            </button>
          ))}
        </div>
        <div style={{marginBottom:"12px"}}>
          <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@organisation.com" style={{width:"100%",fontSize:"12px",padding:"8px 10px",border:`0.5px solid ${P.border}`,borderRadius:"8px"}} onKeyDown={e=>e.key==="Enter"&&handleAuth()}/>
        </div>
        <div style={{marginBottom:"1rem"}}>
          <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Password</label>
          <div style={{position:"relative" as const}}>
            <input value={password} onChange={e=>setPassword(e.target.value)} type={showLoginPwd?"text":"password"} placeholder="--------" style={{width:"100%",fontSize:"12px",padding:"8px 36px 8px 10px",border:`0.5px solid ${P.border}`,borderRadius:"8px"}} onKeyDown={e=>e.key==="Enter"&&handleAuth()}/>
            <button onClick={()=>setShowLoginPwd(!showLoginPwd)} style={{position:"absolute" as const,right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"14px",color:P.textTert}}>{showLoginPwd?"FILE":"FILE"}</button>
          </div>
        </div>
        {authError&&<div style={{fontSize:"11px",marginBottom:"12px",padding:"8px 10px",borderRadius:"8px",background:authError.includes("created")||authError.includes("Check")?P.successLight:P.dangerLight,color:authError.includes("created")||authError.includes("Check")?P.success:P.danger}}>{authError}</div>}
        <button onClick={handleAuth} style={{width:"100%",padding:"9px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:"500",cursor:"pointer"}}>
          {authMode==="login"?"Log in":"Create account"}
        </button>
        <p style={{fontSize:"10px",color:P.textTert,textAlign:"center",marginTop:"1rem"}}>ICH E6(R3) - DIA TMF Reference Model v3.3.1 - 21 CFR Part 11</p>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:P.bgSec,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css"/>

      {/* Header */}
      <header style={{display:"flex",alignItems:"center",gap:"12px",padding:"0 1.25rem",height:"48px",borderBottom:`0.5px solid ${P.border}`,background:P.bg,flexShrink:0}}>
        <span style={{fontSize:"16px",fontWeight:"500"}}>TMF<span style={{color:P.primary}}>360</span></span>
        <span style={{fontSize:"11px",color:P.textTert}}>Trial Master File Platform</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"10px"}}>
          {studies.length>0&&(
            <select value={activeStudy?.study_id||""} onChange={e=>{const s=studies.find(x=>x.study_id===e.target.value);if(s){setActiveStudy(s);if(orgId)loadDocsWithOrg(s.study_id,orgId);}}} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"6px",padding:"3px 8px",background:P.bg}}>
              {studies.map(s=><option key={s.study_id} value={s.study_id}>{s.study_id}</option>)}
            </select>
          )}
          {activeStudy&&<span style={{fontSize:"11px",padding:"3px 10px",borderRadius:"20px",background:P.primaryLight,color:P.primary,fontWeight:"500"}}>{activeStudy.status}</span>}
          <span style={{fontSize:"11px",color:P.textTert}}>{user?.email}</span>
          <button onClick={handleSignOut} style={{fontSize:"11px",color:P.textTert,background:"transparent",border:`0.5px solid ${P.border}`,borderRadius:"6px",padding:"3px 10px",cursor:"pointer"}}>Sign out</button>
        </div>
      </header>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Sidebar */}
        <aside style={{width:"192px",borderRight:`0.5px solid ${P.border}`,background:P.bg,overflowY:"auto",flexShrink:0,padding:"8px"}}>
          <p style={{fontSize:"9px",fontWeight:"500",color:P.textTert,padding:"8px 10px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>Overview</p>
          {navItem("dashboard","Dashboard","ti-layout-dashboard")}
          {navItem("studies","Studies","ti-flask")}
          <p style={{fontSize:"9px",fontWeight:"500",color:P.textTert,padding:"10px 10px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>TMF</p>
          {navItem("documents","Documents","ti-files")}
          {navItem("artifacts","Artifact browser","ti-layout-grid")}
          {navItem("gap","Gap analysis","ti-clipboard-check")}
          <p style={{fontSize:"9px",fontWeight:"500",color:P.textTert,padding:"10px 10px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>Intelligence</p>
          {navItem("readiness","Inspection readiness","ti-shield-check")}
          {navItem("report","Report","ti-file-analytics")}
          {navItem("tracker","Tracker","ti-bell-ringing")}
          {navItem("chat","AI specialist","ti-message-circle")}
          {navItem("audit","Audit trail","ti-lock")}
          {navItem("quality","Quality checks","ti-clipboard-list")}
          {navItem("tmfauditor","TMF Auditor","ti-checkup-list")}
          <p style={{fontSize:"9px",fontWeight:"500",color:P.textTert,padding:"10px 10px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>Team</p>
          {navItem("users","User management","ti-users")}
          {navItem("profile","My profile","ti-user-circle")}
          {navItem("messages","Messages","ti-message-2")}
          <p style={{fontSize:"9px",fontWeight:"500",color:P.textTert,padding:"10px 10px 4px",textTransform:"uppercase",letterSpacing:".06em"}}>Settings</p>
          {navItem("tmfconfig","TMF Configuration","ti-adjustments")}
          {navItem("ticket","Ticket","ti-ticket")}
        </aside>

        <main style={{flex:1,overflowY:"auto",padding:"1.25rem"}}>

          {/* DASHBOARD */}
          {panel==="dashboard"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"1.1rem"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                <div>
                  <h1 style={{fontSize:"20px",fontWeight:"700",color:P.text}}>Dashboard {activeStudy?`- ${activeStudy.study_id}`:""}</h1>
                  <p style={{fontSize:"12px",color:P.textTert,marginTop:"2px"}}>Welcome back! Here's what's happening with your TMF.</p>
                </div>
                {currentUserRole==="System Administrator"&&<button onClick={()=>setShowStudyModal(true)} style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",fontWeight:"500",padding:"9px 16px",background:P.primary,color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",boxShadow:`0 1px 2px rgba(0,0,0,0.06)`}}><i className="ti ti-circle-plus" style={{fontSize:"14px"}}/>New study</button>}
              </div>
              {!activeStudy?(
                <div style={{textAlign:"center",padding:"3rem",color:P.textTert,background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"14px"}}>
                  <div style={{fontSize:"13px",fontWeight:"500",marginBottom:"6px",color:P.text}}>No studies yet</div>
                  <div style={{fontSize:"12px",marginBottom:"1rem"}}>Create your first study to get started.</div>
                  {currentUserRole==="System Administrator"&&<button onClick={()=>setShowStudyModal(true)} style={{fontSize:"11px",padding:"8px 18px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ Create first study</button>}
                </div>
              ):(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"12px"}}>
                    {[
                      {val:donePct,suffix:"%",label:"TMF completeness",sub:"Overall progress",color:P.blue,tint:"#EFF6FF",icon:"ti-chart-donut",link:"View progress",page:"completeness-detail",ring:true},
                      {val:missing,suffix:"",label:"Missing documents",sub:"Require attention",color:P.danger,tint:P.dangerLight,icon:"ti-file-alert",link:"View gaps",page:"missing-detail"},
                      {val:studyDocs.filter(d=>d.status!=="Approved"&&d.status!=="Archived").length,suffix:"",label:"Not approved",sub:"Pending approval",color:P.warning,tint:P.warningLight,icon:"ti-shield-half",link:"Review now",page:"notapproved-detail"},
                      {val:expiring,suffix:"",label:"Expiring (90 days)",sub:"Upcoming expirations",color:P.danger,tint:P.dangerLight,icon:"ti-calendar-exclamation",link:"View expiring",page:"expiring-detail"},
                      {val:pending,suffix:"",label:"Pending review",sub:"Awaiting review",color:P.blue,tint:P.blueLight,icon:"ti-clock",link:"View items",page:"pending-detail"},
                    ].map((m,i)=>(
                      <div key={i} style={{background:m.tint,border:`0.5px solid ${P.border}`,borderRadius:"14px",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                          {m.ring?(
                            <div style={{position:"relative",width:"48px",height:"48px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              {miniRing(m.val,m.color)}
                              <span style={{position:"absolute",fontSize:"10px",fontWeight:"700",color:m.color}}>{m.val}%</span>
                            </div>
                          ):(
                            <div style={{width:"40px",height:"40px",borderRadius:"50%",background:P.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`0.5px solid ${P.border}`}}>
                              <i className={`ti ${m.icon}`} style={{fontSize:"18px",color:m.color}}/>
                            </div>
                          )}
                          <div>
                            <div style={{fontSize:"22px",fontWeight:"700",color:m.color,lineHeight:1}}>{m.val}{m.suffix}</div>
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:"12px",fontWeight:"600",color:P.text}}>{m.label}</div>
                          <div style={{fontSize:"11px",color:P.textTert,marginTop:"1px"}}>{m.sub}</div>
                        </div>
                        <button onClick={()=>setPanel(m.page)} style={{background:"none",border:"none",padding:0,textAlign:"left",fontSize:"11px",fontWeight:"600",color:m.color,cursor:"pointer",display:"flex",alignItems:"center",gap:"3px"}}>{m.link} <i className="ti ti-arrow-right" style={{fontSize:"12px"}}/></button>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1.15fr 1.4fr",gap:"12px",alignItems:"start"}}>
                    <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"14px",padding:"16px"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
                        <h2 style={{fontSize:"13px",fontWeight:"700",color:P.text}}>TMF completeness by zone</h2>
                        <button onClick={()=>setPanel("completeness-detail")} style={{fontSize:"11px",fontWeight:"600",color:P.blue,background:P.blueLight,border:`0.5px solid #BFDBFE`,borderRadius:"7px",padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"}}>View all zones <i className="ti ti-arrow-right" style={{fontSize:"12px"}}/></button>
                      </div>
                      {activeZONES.map(({z,zn})=>{const p=zoneComp(z);const barColor=p>=75?P.success:p>=50?P.blue:p>=25?P.warning:p>0?P.danger:P.bgTert;return(
                        <div key={z} style={{display:"flex",alignItems:"center",gap:"9px",padding:"6px 0"}}>
                          <span style={{fontSize:"11px",color:P.textTert,width:"14px"}}>{z}</span>
                          <i className={`ti ${ZONE_ICONS[z]||"ti-file"}`} style={{fontSize:"14px",color:P.textTert,flexShrink:0}}/>
                          <span style={{fontSize:"12px",fontWeight:"500",color:P.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{zn}</span>
                          <div style={{width:"140px",height:"6px",background:P.bgTert,borderRadius:"6px",overflow:"hidden"}}><div style={{width:`${p}%`,height:"100%",background:barColor,borderRadius:"6px"}}/></div>
                          <span style={{fontSize:"11px",fontWeight:"700",width:"32px",textAlign:"right",color:barColor}}>{p}%</span>
                        </div>
                      );})}
                      <div style={{display:"flex",flexWrap:"wrap" as const,gap:"14px",marginTop:"14px",paddingTop:"12px",borderTop:`0.5px solid ${P.border}`}}>
                        {[{c:P.success,l:"\u2265 75%"},{c:P.blue,l:"50 \u2013 74%"},{c:P.warning,l:"25 \u2013 49%"},{c:P.danger,l:"< 25%"},{c:P.bgTert,l:"0%"}].map((leg,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:"5px"}}>
                            <span style={{width:"8px",height:"8px",borderRadius:"50%",background:leg.c,display:"inline-block"}}/>
                            <span style={{fontSize:"10px",color:P.textTert}}>{leg.l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"14px",padding:"16px",display:"flex",flexDirection:"column",gap:"14px"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <h2 style={{fontSize:"13px",fontWeight:"700",color:P.text}}>Inspection readiness</h2>
                        <button onClick={()=>setPanel("readiness")} style={{fontSize:"11px",fontWeight:"600",color:P.blue,background:P.blueLight,border:`0.5px solid #BFDBFE`,borderRadius:"7px",padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"}}>View details <i className="ti ti-arrow-right" style={{fontSize:"12px"}}/></button>
                      </div>
                      <div style={{display:"flex",gap:"16px"}}>
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
                        </div>
                        <div style={{flex:1,display:"flex",flexDirection:"column",gap:"8px",justifyContent:"center"}}>
                          {[...gaps.crit.slice(0,2).map(g=>({...g,sev:"Missing"})),...gaps.major.slice(0,2).map(g=>({...g,sev:"Partial"}))].slice(0,4).map((g,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",background:g.sev==="Missing"?P.dangerLight:P.warningLight,borderRadius:"9px"}}>
                              <i className="ti ti-alert-triangle" style={{fontSize:"14px",color:g.sev==="Missing"?P.danger:P.warning,flexShrink:0}}/>
                              <span style={{fontSize:"11px",fontWeight:"500",color:P.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{g.an}</span>
                              <span style={{fontSize:"10px",fontWeight:"700",color:g.sev==="Missing"?P.danger:"#B45309",flexShrink:0}}>{g.sev}</span>
                            </div>
                          ))}
                          {gaps.crit.length===0&&gaps.major.length===0&&<div style={{fontSize:"11px",color:P.success,padding:"8px 10px"}}>No critical or major findings</div>}
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"12px",background:P.blueLight,border:`0.5px solid #BFDBFE`,borderRadius:"12px",padding:"12px 14px"}}>
                        <i className="ti ti-bulb" style={{fontSize:"20px",color:P.blue,flexShrink:0}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:"12px",fontWeight:"700",color:P.text}}>Improve your readiness score</div>
                          <div style={{fontSize:"11px",color:P.textTert,marginTop:"1px"}}>Address missing and partial items to be inspection ready.</div>
                        </div>
                        <button onClick={()=>setPanel("gap")} style={{fontSize:"11px",fontWeight:"600",color:"#fff",background:P.primary,border:"none",borderRadius:"8px",padding:"8px 14px",cursor:"pointer",whiteSpace:"nowrap" as const}}>View action plan</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* COMPLETENESS DETAIL */}
          {panel==="completeness-detail"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bg,cursor:"pointer"}}>Back</button>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>TMF completeness - {activeStudy?.study_id}</h1>
              </div>
              <div style={{background:"#EFF6FF",border:"0.5px solid #BFDBFE",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#1E40AF"}}>Showing all Core artifacts. Green = approved document filed. Red = missing.</div>
              {activeZONES.map(({z,zn})=>{
                const zoneArtsAll=activeTMF.filter(a=>a.cl==="Core"&&a.z===z);
                const pct=zoneComp(z);
                return(
                  <div key={z} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderBottom:`0.5px solid ${P.border}`}}>
                      <span style={{fontSize:"12px",fontWeight:"500"}}>Zone {z} - {zn}</span>
                      <div style={{flex:1,height:"4px",background:P.bgTert,borderRadius:"4px",overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:ZONE_COLORS[z]||P.primary}}/></div>
                      <span style={{fontSize:"11px",fontWeight:"500",color:scoreColor(pct)}}>{pct}%</span>
                    </div>
                    {zoneArtsAll.map(a=>{
                      const filed=studyDocs.find(d=>d.artifact_num===a.a&&d.status==="Approved");
                      return(
                        <div key={a.a} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 14px",borderBottom:`0.5px solid ${P.bgTert}`}}>
                          <span style={{fontSize:"14px"}}>{filed?"[OK]":"[X]"}</span>
                          <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert,flexShrink:0}}>{a.a}</span>
                          <span style={{fontSize:"11px",flex:1,color:filed?P.text:P.textSec}}>{a.an}</span>
                          {filed&&filed.file_path&&canDownload&&(
                            <a href={supabase.storage.from("Documents").getPublicUrl(filed.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>View</a>
                          )}
                          {filed&&<span style={{fontSize:"9px",color:"#065F46",flexShrink:0}}>v{filed.version||"1"}</span>}
                          {!filed&&canUploadDownload&&<button onClick={()=>{setFZone(a.z);setFArtifact(a.a+"|"+a.an+"|"+a.z);setShowDocModal(true);}} style={{fontSize:"9px",padding:"2px 8px",background:P.primaryLight,color:P.primary,border:`0.5px solid ${P.primary}`,borderRadius:"4px",cursor:"pointer"}}>+ Upload</button>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* MISSING DETAIL */}
          {panel==="missing-detail"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bg,cursor:"pointer"}}>Back</button>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Missing documents - {activeStudy?.study_id}</h1>
              </div>
              <div style={{background:"#FEF2F2",border:"0.5px solid #FECACA",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#991B1B"}}>These Core artifacts have no document filed. CRITICAL gaps in Zones 3, 4, 5 are inspection risks.</div>
              {["CRITICAL","MAJOR","MINOR"].map(sev=>{
                const sevZones=sev==="CRITICAL"?["3","4","5"]:sev==="MAJOR"?["1","2","7"]:["6","8","9","10","11"];
                const items=activeTMF.filter(a=>a.cl==="Core"&&sevZones.includes(a.z)&&!filedNames.some(f=>f===a.a));
                if(!items.length)return null;
                const colors:Record<string,any>={CRITICAL:{bg:"#FEF2F2",color:"#991B1B",border:"#FECACA"},MAJOR:{bg:"#FFFBEB",color:"#92400E",border:"#FDE68A"},MINOR:{bg:"#F9FAFB",color:"#374151",border:"#E5E7EB"}};
                const c=colors[sev];
                return(
                  <div key={sev} style={{border:`0.5px solid ${c.border}`,borderRadius:"12px",overflow:"hidden"}}>
                    <div style={{background:c.bg,color:c.color,padding:"8px 14px",fontSize:"11px",fontWeight:"500"}}>{sev} - {items.length} gap{items.length!==1?"s":""}</div>
                    {items.map((a,i)=>(
                      <div key={i} style={{borderTop:`0.5px solid ${P.bgTert}`,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",background:P.bg}}>
                        <div><div style={{fontSize:"12px",fontWeight:"500"}}>{a.an}</div><div style={{fontSize:"10px",color:P.textTert,marginTop:"2px"}}>Zone {a.z} - {a.zn}</div></div>
                        <div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:"monospace",fontSize:"10px",color:P.textTert}}>{a.a}</div>{a.iso&&<div style={{fontFamily:"monospace",fontSize:"10px",color:P.blue}}>{a.iso}</div>}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* NOT APPROVED DETAIL */}
          {panel==="notapproved-detail"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bg,cursor:"pointer"}}>Back</button>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Not approved - {activeStudy?.study_id}</h1>
              </div>
              <div style={{background:"#FEF2F2",border:"0.5px solid #FECACA",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#991B1B"}}>These documents were rejected. Review the rejection reason and appeal if needed.</div>
              {studyDocs.filter(d=>d.status==="Draft"&&(d as any).rejection_reason).length===0?(
                <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No rejected documents.</div>
              ):studyDocs.filter(d=>d.status==="Draft"&&(d as any).rejection_reason).map((d,i)=>(
                <div key={i} style={{background:P.bg,border:`0.5px solid #FECACA`,borderRadius:"10px",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                        <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</span>
                        <span style={{fontSize:"12px",fontWeight:"500"}}>{d.artifact_name}</span>
                        {statusBadge(d.status)}
                      </div>
                      <div style={{fontSize:"10px",color:P.textTert}}>Zone {d.zone} - {d.owner||"-"}</div>
                    </div>
                    {d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}
                  </div>
                  <div style={{background:"#FEF2F2",borderRadius:"8px",padding:"10px 12px"}}>
                    <div style={{fontSize:"10px",fontWeight:"500",color:"#991B1B",marginBottom:"3px"}}>Rejection reason:</div>
                    <div style={{fontSize:"11px",color:"#7F1D1D"}}>{(d as any).rejection_reason}</div>
                  </div>
                  {(d as any).appeal_reason?(
                    <div style={{background:P.primaryLight,borderRadius:"8px",padding:"10px 12px"}}>
                      <div style={{fontSize:"10px",fontWeight:"500",color:P.primary,marginBottom:"3px"}}>Appeal submitted:</div>
                      <div style={{fontSize:"11px",color:"#3730A3"}}>{(d as any).appeal_reason}</div>
                    </div>
                  ):(
                    <div style={{display:"flex",gap:"8px",alignItems:"flex-end"}}>
                      <div style={{flex:1}}>
                        <label style={{fontSize:"10px",color:P.textSec,display:"block",marginBottom:"3px"}}>Appeal justification</label>
                        <textarea id={`appeal-${d.id}`} placeholder="Provide justification for appeal..." style={{width:"100%",fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"6px",padding:"6px 8px",resize:"vertical" as const,minHeight:"60px"}}/>
                      </div>
                      <button onClick={async()=>{
                        const ta=document.getElementById(`appeal-${d.id}`) as HTMLTextAreaElement;
                        if(!ta?.value.trim())return;
                        const{error}=await supabase.from("documents").update({status:"Under Review",appeal_reason:ta.value.trim()}).eq("id",d.id);
                        if(!error){await logAudit("Appeal submitted",d.id,d.study_id,"appeal_reason","",ta.value.trim());setDocs(prev=>prev.map(doc=>doc.id===d.id?{...doc,status:"Under Review",appeal_reason:ta.value.trim()} as any:doc));}
                      }} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Submit Appeal</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* EXPIRING DETAIL */}
          {panel==="expiring-detail"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bg,cursor:"pointer"}}>Back</button>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Expiring documents - {activeStudy?.study_id}</h1>
              </div>
              {studyDocs.filter(d=>d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+90*86400000)).length===0?(
                <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No documents expiring within 90 days.</div>
              ):studyDocs.filter(d=>d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+90*86400000)).map((d,i)=>{
                const daysLeft=Math.ceil((new Date(d.expiry_date).getTime()-Date.now())/(86400000));
                const isExpired=daysLeft<0;const isCritical=daysLeft<=30;
                return(
                  <div key={i} style={{background:P.bg,border:`0.5px solid ${isExpired?"#FECACA":isCritical?"#FDE68A":P.border}`,borderRadius:"10px",padding:"14px",display:"flex",gap:"14px",alignItems:"center"}}>
                    <div style={{width:"60px",height:"60px",borderRadius:"10px",background:isExpired?"#FEF2F2":isCritical?"#FFFBEB":"#F0FDF4",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontSize:"18px",fontWeight:"500",color:isExpired?"#EF4444":isCritical?"#F59E0B":"#10B981"}}>{isExpired?"EXP":daysLeft}</span>
                      <span style={{fontSize:"8px",color:isExpired?"#EF4444":isCritical?"#F59E0B":"#10B981"}}>{isExpired?"expired":"days"}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px"}}>
                        <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</span>
                        <span style={{fontSize:"12px",fontWeight:"500"}}>{d.artifact_name}</span>
                        {statusBadge(d.status)}
                      </div>
                      <div style={{fontSize:"10px",color:P.textTert}}>Expires: <span style={{color:isExpired?"#EF4444":"inherit"}}>{d.expiry_date}</span></div>
                    </div>
                    {d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}
                  </div>
                );
              })}
            </div>
          )}

          {/* PENDING DETAIL */}
          {panel==="pending-detail"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={()=>setPanel("dashboard")} style={{fontSize:"11px",padding:"5px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bg,cursor:"pointer"}}>Back</button>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Pending review - {activeStudy?.study_id}</h1>
              </div>
              <div style={{background:P.primaryLight,border:`0.5px solid #C7D2FE`,borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#3730A3"}}>Review submitted documents. Approve with electronic signature or reject with a reason.</div>
              {studyDocs.filter(d=>d.status==="Under Review").length===0?(
                <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No documents pending review.</div>
              ):studyDocs.filter(d=>d.status==="Under Review").map((d,i)=>(
                <div key={i} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                        <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</span>
                        <span style={{fontSize:"13px",fontWeight:"500"}}>{d.artifact_name}</span>
                        {statusBadge(d.status)}
                      </div>
                      <div style={{fontSize:"10px",color:P.textTert}}>Zone {d.zone} - Owner: {d.owner||"-"}</div>
                    </div>
                    <div style={{display:"flex",gap:"6px"}}>
                      {d.file_path&&canPreview(d.file_name||"")&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"3px 8px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}
                      {d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"3px 8px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}
                    </div>
                  </div>
                  {(d as any).submission_reason&&<div style={{background:"#EFF6FF",borderRadius:"8px",padding:"10px 12px"}}><div style={{fontSize:"10px",fontWeight:"500",color:"#1E40AF",marginBottom:"3px"}}>Submission reason:</div><div style={{fontSize:"11px",color:"#1E3A5F"}}>{(d as any).submission_reason}</div></div>}
                  {(d as any).appeal_reason&&<div style={{background:P.primaryLight,borderRadius:"8px",padding:"10px 12px"}}><div style={{fontSize:"10px",fontWeight:"500",color:P.primary,marginBottom:"3px"}}>Appeal reason:</div><div style={{fontSize:"11px",color:"#3730A3"}}>{(d as any).appeal_reason}</div></div>}
                  <div style={{display:"flex",gap:"8px",alignItems:"flex-end",borderTop:`0.5px solid ${P.border}`,paddingTop:"10px"}}>
                    <div style={{flex:1}}>
                      <label style={{fontSize:"10px",color:P.textSec,display:"block",marginBottom:"3px"}}>Review notes</label>
                      <textarea id={`review-comment-${d.id}`} placeholder="Add review notes before approving or rejecting..." style={{width:"100%",fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"6px",padding:"6px 8px",resize:"vertical" as const,minHeight:"50px"}}/>
                    </div>
                    <div style={{display:"flex",flexDirection:"column" as const,gap:"6px",flexShrink:0}}>
                      <button onClick={async()=>{
                        const ta=document.getElementById(`review-comment-${d.id}`) as HTMLTextAreaElement;
                        if(ta?.value.trim()){const existing=d.comments||"";const newComment=`${existing}${existing?"\n":""}[${new Date().toLocaleString()} - ${user.email}]: ${ta.value.trim()}`;await supabase.from("documents").update({comments:newComment}).eq("id",d.id);setDocs(prev=>prev.map(doc=>doc.id===d.id?{...doc,comments:newComment}:doc));ta.value="";}
                        setSelectedDoc(d);setShowApproveModal(true);
                      }} style={{fontSize:"11px",padding:"7px 14px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Approve</button>
                      <button onClick={async()=>{
                        const ta=document.getElementById(`review-comment-${d.id}`) as HTMLTextAreaElement;
                        const reason=ta?.value.trim();
                        if(!reason){alert("Please add a rejection reason before rejecting.");return;}
                        const now=new Date().toISOString();
                        const{error}=await supabase.from("documents").update({status:"Draft",rejection_reason:reason,rejected_by:user.email,rejected_at:now}).eq("id",d.id);
                        if(!error){await logAudit("Document rejected",d.id,d.study_id,"status","Under Review","Draft",reason);setDocs(prev=>prev.map(doc=>doc.id===d.id?{...doc,status:"Draft",rejection_reason:reason,rejected_by:user.email,rejected_at:now} as any:doc));}
                      }} style={{fontSize:"11px",padding:"7px 14px",background:"#FEF2F2",color:"#991B1B",border:"0.5px solid #FECACA",borderRadius:"8px",cursor:"pointer"}}>Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STUDIES */}
          {panel==="studies"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Studies</h1>
                {currentUserRole==="System Administrator"&&<button onClick={()=>setShowStudyModal(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ New study</button>}
              </div>
              {studies.length===0?<div style={{textAlign:"center",padding:"3rem",color:P.textTert,fontSize:"12px"}}>No studies yet. Create your first study.</div>:(
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
                  {studies.map(s=>(
                    <div key={s.study_id} onClick={()=>{setActiveStudy(s);if(orgId)loadDocsWithOrg(s.study_id,orgId);}} style={{background:P.bg,border:`0.5px solid ${activeStudy?.study_id===s.study_id?P.primary:P.border}`,borderRadius:"12px",padding:"16px",cursor:"pointer"}}>
                      <div style={{fontSize:"13px",fontWeight:"500"}}>{s.study_id}</div>
                      <div style={{fontSize:"11px",color:P.textSec,marginTop:"4px"}}>{s.protocol}</div>
                      <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Phase: {s.phase}</div>
                      <span style={{display:"inline-block",marginTop:"8px",fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:P.primaryLight,color:P.primary}}>{s.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS */}
          {panel==="documents"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h1 style={{fontSize:"14px",fontWeight:"500"}}>Documents - {activeStudy?.study_id||"No study selected"}</h1>
                {activeStudy&&canUploadDownload&&<button onClick={()=>{const firstZone=activeZONES[0]?.z||"1";const initialArts=activeTMF.filter(a=>a.z===firstZone).sort((a,b)=>a.a.localeCompare(b.a));setZoneArts(initialArts);setFZone(firstZone);setFArtifact(initialArts[0]?`${initialArts[0].a}|${initialArts[0].an}|${initialArts[0].z}`:"");setFOwner(userFullName||user?.email||"");setShowDocModal(true);}} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ Add document</button>}
              </div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap" as const,alignItems:"center"}}>
                <input value={docSearch} onChange={e=>setDocSearch(e.target.value)} placeholder="Search documents..." style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px",width:"200px"}}/>
                {["all","Approved","Under Review","Draft","Archived"].map(f=>(
                  <button key={f} onClick={()=>setDocFilter(f)} style={{fontSize:"11px",padding:"5px 12px",borderRadius:"20px",border:`0.5px solid ${docFilter===f?P.primary:P.border}`,background:docFilter===f?P.primaryLight:"transparent",color:docFilter===f?P.primary:P.textSec,cursor:"pointer"}}>{f==="all"?"All":f}</button>
                ))}
              </div>
              <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
                <table style={{width:"100%",fontSize:"12px",borderCollapse:"collapse"}}>
                  <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
                    {["Artifact","Zone","File name","Version","Effective","Expiry","Status","Owner","Actions"].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:"11px",fontWeight:"500",color:P.textSec}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredDocs.length===0?(
                      <tr><td colSpan={9} style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No documents yet.</td></tr>
                    ):filteredDocs.map((d,i)=>(
                      <tr key={i} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
                        <td style={{padding:"8px 10px"}}><div style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</div><div style={{fontSize:"11px",fontWeight:"500",maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{d.artifact_name}</div></td>
                        <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>{d.zone}</td>
                        <td style={{padding:"8px 10px"}}>
                          {(d.custom_file_name||d.file_name)?(
                            <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                              <span>{fileIcon(d.file_name||"")}</span>
                              <span style={{fontSize:"11px",color:P.textSec,maxWidth:"100px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{d.custom_file_name||d.file_name}</span>
                            </div>
                          ):<span style={{color:P.textTert}}>-</span>}
                        </td>
                        <td style={{padding:"8px 10px",fontSize:"11px"}}>{d.version||"-"}</td>
                        <td style={{padding:"8px 10px",fontSize:"11px"}}>{d.effective_date||"-"}</td>
                        <td style={{padding:"8px 10px",fontSize:"11px",color:d.expiry_date&&new Date(d.expiry_date)<new Date()?"#EF4444":"inherit"}}>{d.expiry_date||"-"}</td>
                        <td style={{padding:"8px 10px"}}>{statusBadge(d.status)}</td>
                        <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>{d.owner||"-"}</td>
                        <td style={{padding:"8px 10px"}}>
                          <div style={{display:"flex",gap:"4px",flexWrap:"wrap" as const}}>
                            {d.file_path&&canPreview(d.file_name||"")&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}
                            {d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}
                            {d.status==="Draft"&&<button onClick={()=>{setSelectedDoc(d);setShowSubmitModal(true);}} style={{fontSize:"9px",padding:"2px 6px",background:"#EFF6FF",color:"#1D4ED8",border:"0.5px solid #BFDBFE",borderRadius:"4px",cursor:"pointer"}}>Submit</button>}
                            {d.status==="Under Review"&&<button onClick={()=>{setSelectedDoc(d);setShowApproveModal(true);}} style={{fontSize:"9px",padding:"2px 6px",background:"#ECFDF5",color:"#065F46",border:"0.5px solid #A7F3D0",borderRadius:"4px",cursor:"pointer"}}>Review</button>}
                            <button onClick={()=>{setSelectedDoc(d);setCommentText("");setShowCommentModal(true);}} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Comment</button>
                          </div>
                          {d.comments&&<div style={{fontSize:"9px",color:P.textTert,marginTop:"3px"}}>Has comments</div>}
                          {d.approved_by&&<div style={{fontSize:"9px",color:"#065F46",marginTop:"2px"}}>{d.approved_by}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ARTIFACT BROWSER */}
          {panel==="artifacts"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Artifact browser - DIA TMF Reference Model v3.3.1</h1>
              <div style={{display:"flex",gap:"8px"}}>
                <input value={artSearch} onChange={e=>setArtSearch(e.target.value)} placeholder="Search artifacts..." style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px",flex:1}}/>
                <select value={artZone} onChange={e=>setArtZone(e.target.value)} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px"}}>
                  <option value="">All zones</option>
                  {activeZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} - {zn}</option>)}
                </select>
                <select value={artCl} onChange={e=>setArtCl(e.target.value)} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px"}}>
                  <option value="">Core + Recommended</option>
                  <option value="Core">Core only</option>
                  <option value="Recommended">Recommended only</option>
                </select>
              </div>
              <p style={{fontSize:"11px",color:P.textTert}}>{filteredArts.length} artifacts</p>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {filteredArts.map(a=>{
                  const approvedDocs=studyDocs.filter(d=>d.artifact_num===a.a&&d.status==="Approved");
                  return(
                    <div key={a.a} style={{background:P.bg,border:`0.5px solid ${approvedDocs.length>0?P.success:P.border}`,borderRadius:"10px",overflow:"hidden"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 14px",cursor:"pointer"}} onClick={()=>setExpandedArt(expandedArt===a.a?null:a.a)}>
                        <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert,flexShrink:0}}>{a.a}</span>
                        <span style={{fontSize:"12px",fontWeight:"500",flex:1}}>{a.an}</span>
                        {approvedDocs.length>0&&<span style={{fontSize:"9px",padding:"2px 8px",borderRadius:"20px",background:"#ECFDF5",color:"#065F46",fontWeight:"500"}}>Filed</span>}
                        <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"10px",background:a.cl==="Core"?P.dangerLight:"#F3F4F6",color:a.cl==="Core"?"#991B1B":P.textTert}}>{a.cl}</span>
                      </div>
                      {expandedArt===a.a&&(
                        <div style={{borderTop:`0.5px solid ${P.border}`,padding:"10px 14px"}}>
                          {a.iso&&<div style={{fontSize:"11px",color:P.textTert,marginBottom:"8px"}}>ISO 14155: {a.iso}</div>}
                          {approvedDocs.length>0&&(
                            <div style={{marginBottom:"10px"}}>
                              <div style={{fontSize:"10px",fontWeight:"500",color:P.textSec,marginBottom:"6px"}}>Filed documents:</div>
                              {approvedDocs.map((d,i)=>(
                                <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"5px 8px",background:P.bgSec,borderRadius:"6px",marginBottom:"4px"}}>
                                  <span>{fileIcon(d.file_name||"")}</span>
                                  <span style={{fontSize:"11px",flex:1}}>{d.custom_file_name||d.file_name}</span>
                                  <span style={{fontSize:"9px",color:P.textTert}}>v{d.version||"1"}</span>
                                  {d.file_path&&canPreview(d.file_name||"")&&<button onClick={()=>openPreview(d)} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"4px",cursor:"pointer"}}>Preview</button>}
                                  {d.file_path&&canDownload&&<a href={supabase.storage.from("Documents").getPublicUrl(d.file_path).data.publicUrl} download={d.custom_file_name||d.file_name} style={{fontSize:"9px",padding:"2px 6px",background:P.bgTert,color:P.textSec,borderRadius:"4px",textDecoration:"none"}}>Download</a>}
                                </div>
                              ))}
                            </div>
                          )}
                          {canUploadDownload&&<button onClick={()=>{setFZone(a.z);setFArtifact(a.a+"|"+a.an+"|"+a.z);setShowDocModal(true);}} style={{fontSize:"10px",padding:"4px 10px",background:P.primaryLight,color:P.primary,border:`0.5px solid ${P.primary}`,borderRadius:"6px",cursor:"pointer"}}>+ Upload document to this artifact</button>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GAP ANALYSIS */}
          {panel==="gap"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Gap analysis - {activeStudy?.study_id||"No study selected"}</h1>
              {!activeStudy?<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>:(
                <>
                  <p style={{fontSize:"12px",color:P.textSec}}>Comparing filed documents against all Core artifacts in DIA TMF Reference Model v3.3.1</p>
                  <select value={gapZone} onChange={e=>setGapZone(e.target.value)} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"6px 10px",width:"220px"}}>
                    <option value="">All zones</option>
                    {activeZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} - {zn}</option>)}
                  </select>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
                    {[{val:gaps.crit.length,label:"Critical",color:"#EF4444",bg:"#FEF2F2"},{val:gaps.major.length,label:"Major",color:"#F59E0B",bg:"#FFFBEB"},{val:gaps.minor.length,label:"Minor",color:P.textSec,bg:P.bgSec}].map((s,i)=>(
                      <div key={i} style={{background:s.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px"}}>
                        <div style={{fontSize:"28px",fontWeight:"500",color:s.color}}>{s.val}</div>
                        <div style={{fontSize:"11px",color:P.textSec,marginTop:"2px"}}>{s.label} gaps</div>
                      </div>
                    ))}
                  </div>
                  {[{items:gaps.crit.filter((g:any)=>!gapZone||g.z===gapZone),label:"CRITICAL",color:"#991B1B",bg:"#FEF2F2",border:"#FECACA"},
                    {items:gaps.major.filter((g:any)=>!gapZone||g.z===gapZone),label:"MAJOR",color:"#92400E",bg:"#FFFBEB",border:"#FDE68A"},
                    {items:gaps.minor.filter((g:any)=>!gapZone||g.z===gapZone),label:"MINOR",color:"#374151",bg:"#F9FAFB",border:"#E5E7EB"},
                  ].map(({items,label,color,bg,border})=>items.length>0&&(
                    <div key={label} style={{border:`0.5px solid ${border}`,borderRadius:"12px",overflow:"hidden"}}>
                      <div style={{background:bg,color,padding:"8px 12px",fontSize:"11px",fontWeight:"500"}}>{label} - {items.length} gap{items.length!==1?"s":""}</div>
                      {items.map((g:any,i:number)=>(
                        <div key={i} style={{borderTop:`0.5px solid ${P.bgTert}`,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",background:P.bg}}>
                          <div><div style={{fontSize:"12px",fontWeight:"500"}}>{g.an}</div><div style={{fontSize:"10px",color:P.textTert,marginTop:"2px"}}>Zone {g.z} - {g.zn}</div></div>
                          <div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:"monospace",fontSize:"10px",color:P.textTert}}>{g.a}</div>{g.iso&&<div style={{fontFamily:"monospace",fontSize:"10px",color:P.blue}}>{g.iso}</div>}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* INSPECTION READINESS */}
          {panel==="readiness"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Inspection readiness - {activeStudy?.study_id||"No study selected"}</h1>
              {!activeStudy?<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>:(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"160px 1fr",gap:"12px"}}>
                    <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"16px",display:"flex",flexDirection:"column",alignItems:"center"}}>
                      <span style={{fontSize:"52px",fontWeight:"500",color:scoreColor(ri)}}>{ri}</span>
                      <span style={{fontSize:"11px",color:P.textTert,marginTop:"4px"}}>Readiness score</span>
                      <div style={{width:"100%",height:"6px",background:P.bgTert,borderRadius:"6px",marginTop:"12px",overflow:"hidden"}}><div style={{width:`${ri}%`,height:"100%",background:scoreColor(ri),borderRadius:"6px"}}/></div>
                    </div>
                    <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px"}}>
                      <h2 style={{fontSize:"11px",fontWeight:"500",marginBottom:"10px",color:P.textSec}}>Top findings</h2>
                      <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                        {gaps.crit.slice(0,4).map((g:any,i:number)=><div key={i} style={{fontSize:"11px",background:"#FEF2F2",color:"#991B1B",borderRadius:"6px",padding:"6px 10px"}}>CRITICAL - {g.an}</div>)}
                        {gaps.major.slice(0,3).map((g:any,i:number)=><div key={i} style={{fontSize:"11px",background:"#FFFBEB",color:"#92400E",borderRadius:"6px",padding:"6px 10px"}}>MAJOR - {g.an}</div>)}
                        {gaps.crit.length===0&&gaps.major.length===0&&<div style={{fontSize:"11px",color:P.success}}>No critical or major findings</div>}
                      </div>
                    </div>
                  </div>
                  <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px"}}>
                    <h2 style={{fontSize:"11px",fontWeight:"500",marginBottom:"12px",color:P.textSec}}>Zone readiness breakdown</h2>
                    {activeZONES.map(({z,zn})=>{const p=zoneComp(z);return(
                      <div key={z} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
                        <span style={{fontSize:"9px",color:P.textTert,width:"14px"}}>{z}</span>
                        <span style={{fontSize:"11px",color:P.textSec,width:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{zn}</span>
                        <div style={{flex:1,height:"5px",background:P.bgTert,borderRadius:"5px",overflow:"hidden"}}><div style={{width:`${p}%`,height:"100%",background:ZONE_COLORS[z]||P.primary,borderRadius:"5px"}}/></div>
                        <span style={{fontSize:"11px",fontWeight:"500",width:"32px",textAlign:"right",color:scoreColor(p)}}>{p}%</span>
                      </div>
                    );})}
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI CHAT */}
          {panel==="chat"&&(
            <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 64px)",gap:"0px",margin:"-1.25rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px",height:"52px",padding:"0 1.25rem",borderBottom:`0.5px solid ${P.border}`,background:P.bg,flexShrink:0}}>
                <span style={{width:"22px",height:"22px",borderRadius:"50%",background:P.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",color:P.primary,flexShrink:0}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.6 2.2 6 6.5 6.5-4.3.5-6 2.9-6.5 6.5-.5-3.6-2.2-6-6.5-6.5C9.8 8 11.5 5.6 12 2Z"/><path d="M19 15c.25 1.6 1 2.3 2.6 2.5-1.6.25-2.3 1-2.6 2.6-.25-1.6-1-2.3-2.6-2.6 1.6-.2 2.3-.9 2.6-2.5Z"/></svg>
                </span>
                <span style={{fontSize:"13px",fontWeight:"600",color:P.text}}>Trinity</span>
                {activeStudy&&<span style={{fontSize:"12px",color:P.textTert}}>- {activeStudy.study_id}</span>}
                <span style={{marginLeft:"auto",fontSize:"10.5px",padding:"3px 10px",borderRadius:"20px",background:P.bgTert,color:P.textTert}}>Scoped to this study only</span>
              </div>

              <div style={{padding:"10px 1.25rem",display:"flex",gap:"6px",flexWrap:"wrap" as const,borderBottom:`0.5px solid ${P.border}`,background:P.bg}}>
                {["What's my TMF health?","Review a pending document","Where does a CTA go in the TMF?","What normally goes in TMF Zone 8?","Explain ALCOA+","What is 21 CFR Part 11?"].map(q=>(
                  <button key={q} onClick={()=>setChatInput(q)} style={{fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"20px",padding:"4px 10px",color:P.textSec,background:P.bg,cursor:"pointer"}}>{q}</button>
                ))}
              </div>

              <div style={{flex:1,overflowY:"auto",background:"linear-gradient(135deg,#E9ECFB 0%,#F5F6FC 45%,#FFFFFF 100%)",display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 0 8px"}}>
                <div style={{width:"100%",maxWidth:"760px",padding:"0 24px",display:"flex",flexDirection:"column",gap:"16px"}}>
                  {chatMessages.map((m,i)=>(
                    <div key={i} style={{display:"flex",gap:"10px",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                      {m.role==="ai"&&(
                        <span style={{width:"26px",height:"26px",borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${P.primaryLight},#fff)`,border:`0.5px solid ${P.primaryLight}`,display:"flex",alignItems:"center",justifyContent:"center",color:P.primary}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.6 2.2 6 6.5 6.5-4.3.5-6 2.9-6.5 6.5-.5-3.6-2.2-6-6.5-6.5C9.8 8 11.5 5.6 12 2Z"/><path d="M19 15c.25 1.6 1 2.3 2.6 2.5-1.6.25-2.3 1-2.6 2.6-.25-1.6-1-2.3-2.6-2.6 1.6-.2 2.3-.9 2.6-2.5Z"/></svg>
                        </span>
                      )}
                      <div style={{maxWidth:"78%",display:"flex",flexDirection:"column" as const,gap:"6px"}}>
                        {m.role==="ai"&&<div style={{fontSize:"10.5px",color:P.textTert,fontWeight:"600",paddingLeft:"2px"}}>Trinity</div>}
                        <div style={{fontSize:"12.8px",borderRadius:m.role==="ai"?"10px 10px 10px 4px":"10px 10px 4px 10px",padding:"10px 14px",lineHeight:"1.6",whiteSpace:"pre-wrap" as const,background:m.role==="ai"?P.bg:P.bgTert,border:m.role==="ai"?`0.5px solid ${P.border}`:"none",color:P.text}}>{m.text}</div>

                        {m.classification&&(
                          <>
                            <div style={{border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"12px 14px",background:P.bg}}>
                              <div style={{fontSize:"13px",fontWeight:"600",color:P.text,marginBottom:"4px"}}>{m.classification.zoneLine}</div>
                              <span style={{display:"inline-block",fontSize:"10.5px",fontWeight:"600",padding:"2px 9px",borderRadius:"20px",background:m.classification.confidence>=80?P.successLight:P.warningLight,color:m.classification.confidence>=80?P.success:P.warning}}>Confidence {m.classification.confidence}%</span>
                            </div>
                            {m.classification.warning&&(
                              <div style={{border:"0.5px solid #f3d9a6",background:P.warningLight,borderRadius:"10px",padding:"11px 14px",display:"flex",flexDirection:"column" as const,gap:"6px"}}>
                                <div style={{fontSize:"11.5px",fontWeight:"600",color:P.warning,display:"flex",alignItems:"center",gap:"6px"}}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/></svg>
                                  Version mismatch detected
                                </div>
                                <div style={{fontSize:"12px",color:"#7a5205",lineHeight:"1.55"}}>{m.classification.warning.detail}</div>
                                <div style={{fontSize:"11.5px",color:"#7a5205",background:"#fff",border:"0.5px solid #f3d9a6",borderRadius:"7px",padding:"7px 10px"}}>Suggested action: {m.classification.warning.action}</div>
                              </div>
                            )}
                          </>
                        )}

                        {m.isHealthCard&&activeStudy&&(
                          <>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
                              {[
                                {val:`${donePct}%`,label:"TMF completeness",color:scoreColor(donePct)},
                                {val:missing,label:"Missing documents",color:"#EF4444"},
                                {val:`${ri}`,label:"Readiness score",color:scoreColor(ri)},
                              ].map((s,si)=>(
                                <div key={si} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px"}}>
                                  <div style={{fontSize:"16px",fontWeight:"500",color:s.color}}>{s.val}</div>
                                  <div style={{fontSize:"10px",color:P.textSec}}>{s.label}</div>
                                </div>
                              ))}
                            </div>
                            {m.sourceTags&&(
                              <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const}}>
                                {m.sourceTags.map((t,ti)=>(
                                  <span key={ti} style={{fontSize:"9px",padding:"2px 8px",borderRadius:"20px",background:P.bgTert,color:P.textTert}}>{t}</span>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {(m as any).classStage==="zone"&&(m as any).pendingClassification&&(
                          <div style={{display:"flex",gap:"8px",marginTop:"8px"}}>
                            <button onClick={async()=>{
                              const cl=(m as any).pendingClassification;
                              setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_zone"} as any:msg));
                              setChatMessages(prev=>[...prev,{
                                role:"ai",
                                text:`Zone ${cl.zone_num} - ${cl.zone_name} approved.\n\nNow for the artifact:\n📄 ${cl.artifact_num} - ${cl.artifact_name}\n\n${cl.issues?.length>0?"⚠️ Issues detected:\n"+cl.issues.join("\n"):"No issues detected."}\n${cl.missing_fields?.length>0?"Missing fields: "+cl.missing_fields.join(", "):""}\n\nDo you approve this artifact?`,
                                pendingClassification:cl,
                                classStage:"artifact"
                              } as any]);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✓ Approve Zone</button>
                            <button onClick={()=>{
                              setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_zone"} as any:msg));
                              setChatMessages(prev=>[...prev,{role:"ai",text:"Zone rejected. Please tell me which zone this document belongs to and I'll reclassify."}]);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✗ Reject Zone</button>
                          </div>
                        )}
                        {(m as any).classStage==="artifact"&&(m as any).pendingClassification&&(
                          <div style={{display:"flex",gap:"8px",marginTop:"8px"}}>
                            <button onClick={async()=>{
                              const cl=(m as any).pendingClassification;
                              setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_artifact"} as any:msg));
                              setChatLoading(true);
                              try{
                                // Upload file to Supabase storage
                                const byteString=atob(cl.base64);
                                const ab=new ArrayBuffer(byteString.length);
                                const ia=new Uint8Array(ab);
                                for(let j=0;j<byteString.length;j++)ia[j]=byteString.charCodeAt(j);
                                const blob=new Blob([ab],{type:"application/pdf"});
                                const filePath=`${user.id}/${activeStudy!.study_id}/${Date.now()}_${cl.fileName}`;
                                const{error:upErr}=await supabase.storage.from("Documents").upload(filePath,blob);
                                if(upErr)throw new Error(upErr.message);
                                // Create document record
                                const hasIssues=(cl.issues?.length>0||cl.missing_fields?.length>0);
                                const docStatus=hasIssues?"Draft":"Under Review";
                                const rejectionReason=hasIssues?[...(cl.issues||[]),...(cl.missing_fields?.map((f:string)=>"Missing: "+f)||[])].join("; "):undefined;
                                const{data:docData,error:docErr}=await supabase.from("documents").insert([{
                                  study_id:activeStudy!.study_id,user_id:user.id,org_id:orgId,
                                  artifact_num:cl.artifact_num,artifact_name:cl.artifact_name,zone:cl.zone_num,
                                  version:"",status:docStatus,owner:userFullName||user.email,
                                  file_path:filePath,file_name:cl.fileName,custom_file_name:cl.fileName,
                                  file_type:"application/pdf",file_size:0,
                                  comments:"Auto-classified by Trinity AI. Confidence: "+cl.confidence+"%",
                                  rejection_reason:rejectionReason||null,
                                }]).select();
                                if(docErr)throw new Error(docErr.message);
                                setDocs(prev=>[docData[0],...prev]);
                                await logAudit("Document auto-classified by Trinity",docData[0].id,activeStudy!.study_id,"status","",docStatus,"Trinity AI classification");
                                const statusMsg=hasIssues
                                  ? `⚠️ Document filed to **Not Approved** due to issues detected:\n${rejectionReason}\n\nIt has been saved and can be reviewed in the Documents panel.`
                                  : `✅ Document successfully filed to **Zone ${cl.zone_num} - ${cl.zone_name}** under artifact **${cl.artifact_num} - ${cl.artifact_name}**.\n\nStatus: Under Review. A TMF Lead or System Administrator can now approve it.`;
                                setChatMessages(prev=>[...prev,{role:"ai",text:statusMsg}]);
                              }catch(err:any){setChatMessages(prev=>[...prev,{role:"ai",text:"Filing error: "+err.message}]);}
                              setChatLoading(false);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✓ Approve & File</button>
                            <button onClick={()=>{
                              setChatMessages(prev=>prev.map((msg,mi)=>mi===i?{...msg,classStage:"done_artifact"} as any:msg));
                              setChatMessages(prev=>[...prev,{role:"ai",text:"Artifact rejected. Please tell me which artifact this document should be filed under."}]);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>✗ Reject Artifact</button>
                          </div>
                        )}
                        {chatDocAction&&chatDocAction.msgIdx===i&&!chatDocAction.disabled&&(
                          <div style={{display:"flex",gap:"8px"}}>
                            <button onClick={()=>{
                              const doc=studyDocs.find(d=>d.id===m.docId);
                              if(!doc)return;
                              const zoneInfo=activeZONES.find(z=>z.z===doc.zone);
                              setApproveDocId(doc.id||null);setApproveStage(1);
                              setChatMessages(prev=>[...prev,{role:"ai",text:`Zone ${padZone(doc.zone)} - ${zoneInfo?.zn||"Unclassified zone"}\nConfirm this is the correct zone for filing.`}]);
                              setChatDocAction(prev=>prev?{...prev,disabled:true}:null);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>Approve</button>
                            <button onClick={()=>{
                              const doc=studyDocs.find(d=>d.id===m.docId);
                              if(!doc)return;
                              setFlagDocId(doc.id||null);setFlagReason(detectFlagReason(doc));setFlagStage("form");setFlagMsgIdx(i);
                              setChatMessages(prev=>[...prev,{role:"ai",text:"Flag initiated. Review the detected reason below and add context before submitting."}]);
                              setChatDocAction(prev=>prev?{...prev,disabled:true}:null);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer"}}>Flag</button>
                          </div>
                        )}

                        {approveStage===1&&i===chatMessages.length-1&&m.text.startsWith("Zone ")&&(
                          <div style={{display:"flex",flexDirection:"column" as const,gap:"6px"}}>
                            <div style={{border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"10px 14px",background:P.bg}}>
                              <div style={{fontSize:"12.8px",fontWeight:"600"}}>{m.text.split("\n")[0]}</div>
                              <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Confirm this is the correct zone for filing.</div>
                            </div>
                            <button onClick={()=>{
                              const doc=studyDocs.find(d=>d.id===approveDocId);
                              if(!doc)return;
                              const art=activeTMF.find(a=>a.a===doc.artifact_num);
                              setApproveStage(2);
                              setChatMessages(prev=>[...prev,{role:"ai",text:`Artifact - ${art?.an||doc.artifact_name}\nConfirm this is the correct artifact type.`}]);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer",alignSelf:"flex-start" as const}}>Approve</button>
                          </div>
                        )}

                        {approveStage===2&&i===chatMessages.length-1&&m.text.startsWith("Artifact -")&&(
                          <div style={{display:"flex",flexDirection:"column" as const,gap:"6px"}}>
                            <div style={{border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"10px 14px",background:P.bg}}>
                              <div style={{fontSize:"12.8px",fontWeight:"600"}}>{m.text.split("\n")[0]}</div>
                              <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Confirm this is the correct artifact type.</div>
                            </div>
                            <button onClick={async()=>{
                              const doc=studyDocs.find(d=>d.id===approveDocId);
                              if(!doc)return;
                              const art=activeTMF.find(a=>a.a===doc.artifact_num);
                              const now=new Date().toISOString();
                              const{error}=await supabase.from("documents").update({status:"Approved",approved_by:user.email,approved_at:now,signature_reason:"Approved via Trinity AI specialist"}).eq("id",doc.id);
                              if(!error){
                                await logAudit("Document approved via Trinity",doc.id,doc.study_id,"status",doc.status,"Approved","Approved via Trinity AI specialist");
                                setDocs(prev=>prev.map(d=>d.id===doc.id?{...d,status:"Approved",approved_by:user.email,approved_at:now,signature_reason:"Approved via Trinity AI specialist"}:d));
                              }
                              setChatMessages(prev=>[...prev,
                                {role:"ai",text:`__FILED__Filed to Zone ${padZone(doc.zone)} - Section ${formatSection(art?.s||"")}\nAudit trail entry recorded.`},
                                {role:"ai",text:"Your document has been successfully filed."}
                              ]);
                              setApproveStage(0);setApproveDocId(null);
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.success,color:"#fff",border:"none",borderRadius:"7px",cursor:"pointer",alignSelf:"flex-start" as const}}>Approve</button>
                          </div>
                        )}

                        {m.text.startsWith("__FILED__")&&(
                          <div style={{display:"flex",alignItems:"flex-start",gap:"9px",border:"0.5px solid #bfe6d4",background:P.successLight,borderRadius:"10px",padding:"11px 14px"}}>
                            <span style={{color:P.success,flexShrink:0,marginTop:"1px"}}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5 5.5-6"/></svg>
                            </span>
                            <div style={{display:"flex",flexDirection:"column" as const,gap:"2px"}}>
                              <div style={{fontSize:"12.5px",fontWeight:"600",color:"#0a6b4f"}}>{m.text.replace("__FILED__","").split("\n")[0]}</div>
                              <div style={{fontSize:"11.5px",color:"#0a6b4f",opacity:0.85}}>{m.text.replace("__FILED__","").split("\n")[1]}</div>
                            </div>
                          </div>
                        )}

                        {flagStage==="form"&&i===chatMessages.length-1&&m.text.includes("Flag initiated")&&(
                          <div style={{background:P.dangerLight,border:"0.5px solid #f3c9c7",borderRadius:"10px",padding:"12px 14px",display:"flex",flexDirection:"column" as const,gap:"10px"}}>
                            <div>
                              <div style={{fontSize:"11px",fontWeight:"600",color:P.textTert,marginBottom:"4px",textTransform:"uppercase" as const,letterSpacing:".03em"}}>Reason for flag (auto-generated)</div>
                              <div style={{fontSize:"12px",background:"#fff",border:`0.5px solid ${P.border}`,borderRadius:"7px",padding:"8px 10px",color:P.textSec}}>{flagReason}</div>
                            </div>
                            <div>
                              <div style={{fontSize:"11px",fontWeight:"600",color:P.textTert,marginBottom:"4px",textTransform:"uppercase" as const,letterSpacing:".03em"}}>Your comment</div>
                              <textarea value={flagComment} onChange={e=>setFlagComment(e.target.value)} rows={2} placeholder="Add context for the reviewer..." style={{width:"100%",fontSize:"12.5px",border:`0.5px solid ${P.border}`,borderRadius:"7px",padding:"8px 10px",resize:"vertical" as const,background:"#fff"}}/>
                            </div>
                            <button disabled={flagComment.trim().length===0} onClick={async()=>{
                              if(!flagDocId)return;
                              const doc=studyDocs.find(d=>d.id===flagDocId);
                              if(!doc)return;
                              const now=new Date().toISOString();
                              const comment=flagComment.trim();
                              const{error}=await supabase.from("documents").update({status:"Draft",rejection_reason:flagReason,rejected_by:user.email,rejected_at:now}).eq("id",doc.id);
                              if(!error){
                                await logAudit("Document flagged via Trinity",doc.id,doc.study_id,"status",doc.status,"Draft",flagReason);
                                setDocs(prev=>prev.map(d=>d.id===doc.id?{...d,status:"Draft",rejection_reason:flagReason,rejected_by:user.email,rejected_at:now} as any:d));
                              }
                              setChatMessages(prev=>[...prev,{role:"ai",text:`Moved to Flagged on the dashboard.\nReason and your comment are attached for the reviewer.\nComment: ${comment}`}]);
                              setFlagStage("idle");setFlagMsgIdx(null);setFlagComment("");setFlagDocId(null);setFlagReason("");
                            }} style={{fontSize:"12px",fontWeight:"600",padding:"6px 15px",background:P.danger,color:"#fff",border:"none",borderRadius:"7px",cursor:flagComment.trim().length===0?"not-allowed":"pointer",alignSelf:"flex-start" as const,opacity:flagComment.trim().length===0?0.5:1}}>Submit flag</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading&&(
                    <div style={{display:"flex",gap:"10px"}}>
                      <span style={{width:"26px",height:"26px",borderRadius:"50%",background:`linear-gradient(135deg,${P.primaryLight},#fff)`,border:`0.5px solid ${P.primaryLight}`,display:"flex",alignItems:"center",justifyContent:"center",color:P.primary}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 3.6 2.2 6 6.5 6.5-4.3.5-6 2.9-6.5 6.5-.5-3.6-2.2-6-6.5-6.5C9.8 8 11.5 5.6 12 2Z"/></svg>
                      </span>
                      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"10px 14px",display:"flex",gap:"4px",alignItems:"center"}}>
                        {[0,1,2].map(i=><span key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:P.textTert,display:"inline-block",animation:"bounce 0.9s infinite",animationDelay:`${i*0.15}s`}}/>)}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEnd}/>
                </div>
              </div>

              <div style={{display:"flex",justifyContent:"center",padding:"14px 0 18px",background:"linear-gradient(135deg,#E9ECFB 0%,#F5F6FC 45%,#FFFFFF 100%)",flexShrink:0}}>
                <div style={{width:"100%",maxWidth:"760px",margin:"0 24px",display:"flex",alignItems:"center",gap:"8px",background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"26px",padding:"6px 8px 6px 14px"}}>
                  <input ref={chatFileInputRef} type="file" accept=".pdf" style={{display:"none"}} onChange={async(e)=>{
                    const file=e.target.files?.[0];
                    if(!file)return;
                    if(!activeStudy){setChatMessages(prev=>[...prev,{role:"ai",text:"Please select a study first before uploading a document."}]);return;}
                    setChatMessages(prev=>[...prev,{role:"user",text:`Uploaded: ${file.name}`}]);
                    setChatLoading(true);
                    const reader=new FileReader();
                    reader.onload=async(ev)=>{
                      const base64=((ev.target?.result as string)||"").split(",")[1];
                      setChatMessages(prev=>[...prev,{role:"ai",text:"Reading your document... I will analyse the content and suggest the correct TMF zone and artifact."}]);
                      try{
                        const res=await fetch("/api/classify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pdfBase64:base64,fileName:file.name,activeZONES,activeTMF})});
                        const data=await res.json();
                        if(data.error){setChatMessages(prev=>[...prev,{role:"ai",text:"I could not classify this document: "+data.error}]);setChatLoading(false);return;}
                        const classResult={file,base64,fileName:file.name,...data};
                        setChatMessages(prev=>[...prev,{role:"ai",text:`I have analysed your document.\n\n${data.reasoning}\n\nSuggested Zone:\n\uD83D\uDCC1 Zone ${data.zone_num} - ${data.zone_name}\n\nConfidence: ${data.confidence}%\n\nDo you approve this zone?`,pendingClassification:classResult,classStage:"zone"} as any]);
                      }catch(err:any){setChatMessages(prev=>[...prev,{role:"ai",text:"Classification error: "+err.message}]);}
                      setChatLoading(false);
                    };
                    reader.readAsDataURL(file);
                    if(chatFileInputRef.current)chatFileInputRef.current.value="";
                  }}/>
                  <button aria-label="Attach document or version tracker" onClick={()=>chatFileInputRef.current?.click()} style={{width:"32px",height:"32px",borderRadius:"50%",border:"none",background:"transparent",color:P.textTert,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 12.5 12 21a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></svg>
                  </button>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask Trinity or drop a document" aria-label="Message Trinity" style={{flex:1,border:"none",outline:"none",fontSize:"13px",background:"transparent",color:P.text,padding:"8px 2px"}}/>
                  <button aria-label="Send message" onClick={sendChat} disabled={chatLoading} style={{width:"32px",height:"32px",borderRadius:"50%",flexShrink:0,background:chatLoading?P.bgTert:P.primary,border:"none",color:chatLoading?P.textTert:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:chatLoading?"not-allowed":"pointer"}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AUDIT TRAIL */}
          {panel==="audit"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><h1 style={{fontSize:"14px",fontWeight:"500"}}>Audit trail - 21 CFR Part 11 compliant</h1><div style={{display:"flex",gap:"8px"}}><button onClick={async()=>{const{data}=await supabase.from("audit_trail").select("*").eq("study_id",activeStudy?.study_id||"").order("created_at",{ascending:false});if(!data)return;const headers=["Timestamp","User","Action","Document ID","Field","Old Value","New Value","Signature Reason"];const rows=data.map((l:any)=>[new Date(l.created_at).toLocaleString(),l.user_email,l.action,l.document_id||"",l.field_changed||"",l.old_value||"",l.new_value||"",l.signature_reason||""]);const csv=[headers,...rows].map(r=>r.map((v:string)=>JSON.stringify(v)).join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`AuditTrail_${activeStudy?.study_id||"export"}_${Date.now()}.csv`;a.click();URL.revokeObjectURL(url);}} style={{fontSize:"11px",fontWeight:"500",padding:"6px 14px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px"}}><i className="ti ti-download" style={{fontSize:"13px"}}/>Download CSV</button><button onClick={async()=>{const{data}=await supabase.from("audit_trail").select("*").eq("study_id",activeStudy?.study_id||"").order("created_at",{ascending:false});if(!data)return;const rows=data.map((l:any)=>`<tr><td>${new Date(l.created_at).toLocaleString()}</td><td>${l.user_email||""}</td><td>${l.action||""}</td><td>${l.document_id?.slice(0,8)||""}</td><td>${l.field_changed||""}</td><td>${l.old_value||""}</td><td>${l.new_value||""}</td><td>${l.signature_reason||""}</td></tr>`).join("");const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Audit Trail - ${activeStudy?.study_id||""}</title><style>body{font-family:Arial,sans-serif;font-size:10px;margin:20px;}h1{font-size:16px;color:#F97316;}table{width:100%;border-collapse:collapse;margin-top:16px;}th{background:#F97316;color:#fff;padding:6px 8px;text-align:left;font-size:10px;}td{padding:5px 8px;border-bottom:1px solid #E5E7EB;font-size:9px;}tr:nth-child(even){background:#F9FAFB;}.footer{margin-top:20px;font-size:9px;color:#9CA3AF;}@media print{button{display:none;}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;"><div><h1>Audit Trail — ${activeStudy?.study_id||""}</h1><p style="font-size:11px;color:#6B7280;">21 CFR Part 11 Compliant — Generated ${new Date().toLocaleString()}</p></div><button onclick="window.print()" style="padding:6px 14px;background:#F97316;color:#fff;border:none;border-radius:6px;cursor:pointer;">Print / Save PDF</button></div><table><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Document</th><th>Field</th><th>Old Value</th><th>New Value</th><th>Signature Reason</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">TMF360 — ICH E6(R3) — 21 CFR Part 11</div></body></html>`;const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();}}} style={{fontSize:"11px",fontWeight:"500",padding:"6px 14px",background:"#EF4444",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",}}><i className="ti ti-file-type-pdf" style={{fontSize:"13px"}}/>Download PDF</button></div></div>
              <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#92400E"}}>
                This audit trail is read-only and tamper-evident in compliance with 21 CFR Part 11. All document actions, electronic signatures, and approvals are permanently recorded.
              </div>
              <AuditTrail user={user} activeStudy={activeStudy} P={P}/>
            </div>
          )}

          {/* QUALITY CHECKS */}
          {panel==="quality"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <h1 style={{fontSize:"14px",fontWeight:"500"}}>Quality checks - {activeStudy?.study_id||"No study selected"}</h1>
              {!activeStudy?<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>:(<QualityPanel docs={studyDocs} P={P} supabase={supabase} setDocs={setDocs}/>)}
            </div>
          )}

          {/* REPORT */}
          {panel==="report"&&(
            <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                <div>
                  <h1 style={{fontSize:"14px",fontWeight:"500"}}>Inspection Package Export - {activeStudy?.study_id||"No study selected"}</h1>
                  <p style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Export all approved documents as an inspection-ready package</p>
                </div>
              </div>
              {!activeStudy?(
                <div style={{textAlign:"center",padding:"3rem",color:P.textTert,background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"14px"}}>
                  <div style={{fontSize:"13px",fontWeight:"500",marginBottom:"6px",color:P.text}}>No study selected</div>
                  <div style={{fontSize:"12px"}}>Select a study to generate inspection reports.</div>
                </div>
              ):(
                <>
                  {/* Study summary card */}
                  <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"14px",padding:"16px"}}>
                    <h2 style={{fontSize:"12px",fontWeight:"600",color:P.textSec,marginBottom:"12px",textTransform:"uppercase",letterSpacing:".06em"}}>Study Summary</h2>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"16px"}}>
                      {[
                        {val:`${donePct}%`,label:"TMF Completeness",color:P.blue,bg:P.blueLight},
                        {val:`${ri}/100`,label:"Readiness Score",color:ri>=80?P.success:ri>=50?P.primary:P.danger,bg:ri>=80?P.successLight:ri>=50?P.primaryLight:P.dangerLight},
                        {val:missing,label:"Missing Core Docs",color:P.danger,bg:P.dangerLight},
                        {val:studyDocs.filter(d=>d.status==="Approved").length,label:"Approved Documents",color:P.success,bg:P.successLight},
                        {val:pending,label:"Pending Review",color:P.blue,bg:P.blueLight},
                        {val:expiring,label:"Expiring (90 days)",color:P.warning,bg:P.warningLight},
                      ].map((m,i)=>(
                        <div key={i} style={{background:m.bg,borderRadius:"10px",padding:"12px 14px"}}>
                          <div style={{fontSize:"22px",fontWeight:"700",color:m.color}}>{m.val}</div>
                          <div style={{fontSize:"11px",color:P.textSec,marginTop:"2px"}}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"6px",fontSize:"11px",color:P.textSec}}>
                      <div><span style={{fontWeight:"500"}}>Study ID:</span> {activeStudy.study_id}</div>
                      <div><span style={{fontWeight:"500"}}>Protocol:</span> {activeStudy.protocol}</div>
                      <div><span style={{fontWeight:"500"}}>Sponsor:</span> {activeStudy.sponsor}</div>
                      <div><span style={{fontWeight:"500"}}>Phase:</span> {activeStudy.phase}</div>
                      <div><span style={{fontWeight:"500"}}>Status:</span> {activeStudy.status}</div>
                      <div><span style={{fontWeight:"500"}}>Export Date:</span> {new Date().toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Export buttons */}
                  <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"14px",padding:"16px"}}>
                    <h2 style={{fontSize:"12px",fontWeight:"600",color:P.textSec,marginBottom:"12px",textTransform:"uppercase",letterSpacing:".06em"}}>Export Inspection Package</h2>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
                      {/* Excel */}
                      <div style={{border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"16px",display:"flex",flexDirection:"column",gap:"10px"}}>
                        <div style={{width:"40px",height:"40px",borderRadius:"10px",background:"#ECFDF5",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <i className="ti ti-file-spreadsheet" style={{fontSize:"22px",color:"#10B981"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>Excel</div>
                          <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Document tracker with full metadata. All approved documents listed by zone and artifact.</div>
                        </div>
                        <button onClick={async()=>{
                          const approvedDocs=studyDocs.filter(d=>d.status==="Approved");
                          if(!approvedDocs.length){alert("No approved documents to export.");return;}
                          const res=await fetch("/api/export/excel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({docs:approvedDocs,study:activeStudy,donePct,ri,missing,pending})});
                          const blob=await res.blob();
                          const url=URL.createObjectURL(blob);
                          const a=document.createElement("a");a.href=url;a.download=`TMF360_${activeStudy.study_id}_Tracker_${Date.now()}.xls`;a.click();URL.revokeObjectURL(url);
                        }} style={{fontSize:"11px",fontWeight:"500",padding:"8px 14px",background:"#10B981",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                          <i className="ti ti-download" style={{fontSize:"13px"}}/>Download Excel
                        </button>
                      </div>

                      {/* PDF */}
                      <div style={{border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"16px",display:"flex",flexDirection:"column",gap:"10px"}}>
                        <div style={{width:"40px",height:"40px",borderRadius:"10px",background:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <i className="ti ti-file-type-pdf" style={{fontSize:"22px",color:"#EF4444"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>PDF Report</div>
                          <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Formatted inspection report with cover page, study summary, and document index.</div>
                        </div>
                        <button onClick={async()=>{
                          const approvedDocs=studyDocs.filter(d=>d.status==="Approved");
                          if(!approvedDocs.length){alert("No approved documents to export.");return;}
                          const res=await fetch("/api/export/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({docs:approvedDocs,study:activeStudy,donePct,ri,missing,pending})});
                          const html=await res.text();
                          const w=window.open("","_blank");
                          if(w){w.document.write(html);w.document.close();}
                        }} style={{fontSize:"11px",fontWeight:"500",padding:"8px 14px",background:"#EF4444",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                          <i className="ti ti-download" style={{fontSize:"13px"}}/>Open PDF
                        </button>
                      </div>

                      {/* Word */}
                      <div style={{border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"16px",display:"flex",flexDirection:"column",gap:"10px"}}>
                        <div style={{width:"40px",height:"40px",borderRadius:"10px",background:"#EFF6FF",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <i className="ti ti-file-type-doc" style={{fontSize:"22px",color:"#3B82F6"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>Word Document</div>
                          <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Editable Word report with cover page, study summary, and document index.</div>
                        </div>
                        <button onClick={async()=>{
                          const approvedDocs=studyDocs.filter(d=>d.status==="Approved");
                          if(!approvedDocs.length){alert("No approved documents to export.");return;}
                          const res=await fetch("/api/export/word",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({docs:approvedDocs,study:activeStudy,donePct,ri,missing,pending})});
                          const blob=await res.blob();
                          const url=URL.createObjectURL(blob);
                          const a=document.createElement("a");a.href=url;a.download=`TMF360_${activeStudy.study_id}_Report_${Date.now()}.doc`;a.click();URL.revokeObjectURL(url);
                        }} style={{fontSize:"11px",fontWeight:"500",padding:"8px 14px",background:"#3B82F6",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                          <i className="ti ti-download" style={{fontSize:"13px"}}/>Download Word
                        </button>
                      </div>
                    </div>

                    <div style={{marginTop:"12px",padding:"10px 14px",background:P.bgSec,borderRadius:"8px",fontSize:"11px",color:P.textTert}}>
                      <i className="ti ti-info-circle" style={{fontSize:"13px",marginRight:"6px"}}/>
                      Only <strong style={{color:P.text}}>Approved</strong> documents are included in the export. Currently {studyDocs.filter(d=>d.status==="Approved").length} approved document{studyDocs.filter(d=>d.status==="Approved").length!==1?"s":""} available.
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TRACKER */}
          {panel==="tracker"&&(
            <TrackerPanel user={user} P={P} supabase={supabase} orgId={orgId} currentUserRole={currentUserRole}/>
          )}

          {/* TMF AUDITOR */}
          {panel==="tmfauditor"&&(
            <TmfAuditorPanel
              user={user} P={P} supabase={supabase}
              activeStudy={activeStudy} orgId={orgId}
              currentUserRole={currentUserRole}
              activeTMF={activeTMF} activeZONES={activeZONES}
              studyDocs={studyDocs} setDocs={setDocs}
              logAudit={logAudit}
            />
          )}

          {/* MESSAGES */}
          {panel==="messages"&&(
            <MessagesPanel user={user} P={P} supabase={supabase} activeStudy={activeStudy}/>
          )}

          {/* TMF CONFIG */}
          {panel==="tmfconfig"&&(
            <TmfConfigPanel user={user} P={P} supabase={supabase} activeStudy={activeStudy} orgId={orgId} currentUserRole={currentUserRole} logAudit={logAudit}/>
          )}

          {/* TICKET */}
          {panel==="ticket"&&(
            <TicketPanel user={user} P={P} supabase={supabase} orgId={orgId} currentUserRole={currentUserRole}/>
          )}

          {/* USER MANAGEMENT */}
          {panel==="users"&&(
            <UserManagementPanel user={user} P={P} supabase={supabase}/>
          )}

          {/* MY PROFILE */}
          {panel==="profile"&&(
            <ProfilePanel user={user} P={P} supabase={supabase}/>
          )}

        </main>
      </div>

      {/* Study Modal */}
      {showStudyModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"380px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>New study</h2>
            {[{l:"Study ID",v:fId,s:setFId,p:"e.g. OIL-BR-US-10"},{l:"Protocol title",v:fProtocol,s:setFProtocol,p:"e.g. A Phase I Study of..."},{l:"Sponsor",v:fSponsor,s:setFSponsor,p:"e.g. Optiscan Imaging Ltd."}].map(f=>(
              <div key={f.l} style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.p} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            ))}
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Phase</label><select value={fPhase} onChange={e=>setFPhase(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>{["Phase I","Phase II","Phase III","Phase IV","Observational","Feasibility"].map(p=><option key={p}>{p}</option>)}</select></div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Status</label><select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>{["Startup","Active","Closed","On Hold"].map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowStudyModal(false)} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={createStudy} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Create study</button>
            </div>
          </div>
        </div>
      )}

      {/* Doc Modal */}
      {showDocModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"500px",border:`0.5px solid ${P.border}`,maxHeight:"90vh",overflowY:"auto"}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Add document</h2>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Zone</label>
              <select value={fZone} onChange={e=>{setFZone(e.target.value);const allArts=activeTMF.filter(a=>a.z===e.target.value).sort((a,b)=>a.a.localeCompare(b.a));setZoneArts(allArts);setFArtifact(allArts[0]?`${allArts[0].a}|${allArts[0].an}|${allArts[0].z}`:"");}} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>
                {activeZONES.map(({z,zn})=><option key={z} value={z}>Zone {z} - {zn}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Artifact</label>
              <select value={fArtifact} onChange={e=>setFArtifact(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>
                {(zoneArts.length>0?zoneArts:activeTMF.filter(a=>a.z===fZone)).map(a=><option key={a.a} value={`${a.a}|${a.an}|${a.z}`}>{a.a} - {a.an}</option>)}
              </select>
            </div>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>File</label>
              <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)handleFileUpload(f);}} onClick={()=>fileInputRef.current?.click()} style={{border:`1.5px dashed ${dragOver?P.primary:P.border}`,borderRadius:"10px",padding:"1.5rem",textAlign:"center",cursor:"pointer",background:dragOver?P.primaryLight:P.bgSec}}>
                <input ref={fileInputRef} type="file" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFileUpload(f);}}/>
                {uploading?<div style={{fontSize:"12px",color:P.primary}}>{uploadProgress}</div>
                :selectedFile?<div style={{fontSize:"12px"}}><div style={{fontSize:"1.5rem",marginBottom:"4px"}}>{fileIcon(selectedFile.name)}</div><div style={{fontWeight:"500"}}>{selectedFile.name}</div><div style={{color:P.textTert,fontSize:"11px"}}>{formatSize(selectedFile.size)} - {uploadProgress}</div></div>
                :<div style={{fontSize:"12px",color:P.textTert}}><div style={{fontSize:"1.5rem",marginBottom:"4px"}}></div>Drag & drop or click to browse</div>}
              </div>
            </div>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Document name</label>
              <input value={fCustomName} onChange={e=>setFCustomName(e.target.value)} placeholder="Custom name for this document" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/>
            </div>
            {[{l:"Version",v:fVersion,s:setFVersion,p:"e.g. v1.0"},{l:"Owner",v:fOwner,s:setFOwner,p:"e.g. Jane Smith"}].map(f=>(
              <div key={f.l} style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.p} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            ))}
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Status</label><select value={fDocStatus} onChange={e=>setFDocStatus(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>{["Draft","Under Review","Approved","Archived"].map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"10px"}}>
              <div><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Effective date</label><input type="date" value={fEff} onChange={e=>setFEff(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
              <div><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Expiry date</label><input type="date" value={fExp} onChange={e=>setFExp(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            </div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Comments</label><textarea value={fComments} onChange={e=>setFComments(e.target.value)} placeholder="Optional comments..." style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px",resize:"vertical" as const,minHeight:"60px"}}/></div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowDocModal(false);setSelectedFile(null);setPendingFilePath("");setUploadProgress("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={addDocument} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add document</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal&&selectedDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"420px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Submit for review</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>{selectedDoc.artifact_name}</p>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Reason for submission</label>
              <textarea value={submissionReason} onChange={e=>setSubmissionReason(e.target.value)} placeholder="Describe why this document is ready for review..." style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",resize:"vertical" as const,minHeight:"80px"}}/>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowSubmitModal(false);setSubmissionReason("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={async()=>{
                if(!submissionReason.trim()){alert("Please add a reason for submission.");return;}
                const{error}=await supabase.from("documents").update({status:"Under Review",submission_reason:submissionReason}).eq("id",selectedDoc.id);
                if(!error){await logAudit("Document submitted for review",selectedDoc.id,selectedDoc.study_id,"status","Draft","Under Review");setDocs(prev=>prev.map(d=>d.id===selectedDoc.id?{...d,status:"Under Review",submission_reason:submissionReason} as any:d));}
                setShowSubmitModal(false);setSubmissionReason("");setSelectedDoc(null);
              }} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Submit for review</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal&&selectedDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"420px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Electronic signature - 21 CFR Part 11</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>21 CFR Part 11 requires identity verification before approval.</p>
            <div style={{background:"#EFF6FF",border:"0.5px solid #BFDBFE",borderRadius:"8px",padding:"10px 12px",marginBottom:"1rem",fontSize:"11px",color:"#1E40AF"}}>
              <strong>Approver:</strong> {user?.email}<br/>
              <strong>Timestamp:</strong> {new Date().toLocaleString()}<br/>
              <strong>Document:</strong> {selectedDoc.custom_file_name||selectedDoc.file_name||selectedDoc.artifact_name}<br/>
              <strong>Meaning:</strong> I approve this document as accurate and complete
            </div>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Enter your password to sign</label><input type="password" value={approvePassword} onChange={e=>setApprovePassword(e.target.value)} placeholder="--------" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Reason for approval</label>
              <select value={approveReason} onChange={e=>setApproveReason(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>
                <option value="">Select reason...</option>
                <option>Reviewed and approved - document is accurate and complete</option>
                <option>QC review complete - no findings</option>
                <option>Regulatory review complete</option>
                <option>Final approval for TMF filing</option>
              </select>
            </div>
            {approveError&&<div style={{fontSize:"11px",color:"#991B1B",background:"#FEF2F2",padding:"8px 10px",borderRadius:"6px",marginBottom:"10px"}}>{approveError}</div>}
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowApproveModal(false);setApprovePassword("");setApproveReason("");setApproveError("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={handleApprove} style={{fontSize:"11px",padding:"6px 14px",background:P.success,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Sign & Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal&&selectedDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"420px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Add comment</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>{selectedDoc.artifact_name}</p>
            {selectedDoc.comments&&(
              <div style={{background:P.bgSec,borderRadius:"8px",padding:"10px 12px",marginBottom:"1rem",maxHeight:"120px",overflowY:"auto"}}>
                {selectedDoc.comments.split("\n").map((c,i)=><div key={i} style={{fontSize:"11px",color:P.textSec,marginBottom:"4px"}}>{c}</div>)}
              </div>
            )}
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>New comment</label><textarea value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Add your comment..." style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",resize:"vertical" as const,minHeight:"80px"}}/></div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowCommentModal(false)} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={handleAddComment} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add comment</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",overflow:"hidden",maxWidth:"90vw",width:"800px",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:`0.5px solid ${P.border}`}}>
              <span style={{fontSize:"13px",fontWeight:"500"}}>{previewName}</span>
              <div style={{display:"flex",gap:"8px"}}>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"11px",padding:"5px 12px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none"}}>Open</a>
                <a href={previewUrl} download style={{fontSize:"11px",padding:"5px 12px",background:P.bgTert,color:P.textSec,borderRadius:"6px",textDecoration:"none"}}>Download</a>
                <button onClick={()=>setPreviewUrl(null)} style={{fontSize:"11px",padding:"5px 12px",background:"#FEF2F2",color:"#991B1B",border:"none",borderRadius:"6px",cursor:"pointer"}}>Close</button>
              </div>
            </div>
            <div style={{flex:1,overflow:"auto"}}>
              {previewName.match(/\.(png|jpg|jpeg|gif|webp)$/i)?<img src={previewUrl} alt={previewName} style={{maxWidth:"100%",height:"auto"}}/>:<iframe src={previewUrl} style={{width:"100%",height:"70vh",border:"none"}}/>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketPanel({user, P, supabase, orgId, currentUserRole}: {user: any, P: any, supabase: any, orgId: string, currentUserRole: string}) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [replyText, setReplyText] = useState("");
  const [msg, setMsg] = useState("");

  const canManage = ["System Administrator","Sponsor Admin","TMF Lead"].includes(currentUserRole);

  useEffect(() => { if (user) loadTickets(); }, [user]);

  async function loadTickets() {
    setLoading(true);
    const q = supabase.from("support_tickets").select("*").eq("org_id", orgId).order("created_at", {ascending: false});
    const {data} = canManage ? await q : await q.eq("created_by", user.id);
    if (data) setTickets(data);
    setLoading(false);
  }

  async function createTicket() {
    if (!title.trim() || !description.trim()) return;
    const {error} = await supabase.from("support_tickets").insert([{
      org_id: orgId, created_by: user.id, created_by_email: user.email,
      title: title.trim(), description: description.trim(),
      priority, status: "Open",
    }]);
    if (!error) { setShowModal(false); setTitle(""); setDescription(""); setPriority("Medium"); loadTickets(); setMsg("Ticket submitted."); setTimeout(()=>setMsg(""),3000); }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("support_tickets").update({status, resolved_at: status==="Resolved"?new Date().toISOString():null}).eq("id", id);
    setSelectedTicket((prev: any) => prev ? {...prev, status} : null);
    loadTickets();
  }

  async function addReply() {
    if (!replyText.trim() || !selectedTicket) return;
    const existing = selectedTicket.replies || "";
    const newReplies = existing + (existing?"\n":"") + "[" + new Date().toLocaleString() + " - " + user.email + "]: " + replyText.trim();
    await supabase.from("support_tickets").update({replies: newReplies}).eq("id", selectedTicket.id);
    setSelectedTicket((prev: any) => ({...prev, replies: newReplies}));
    setReplyText("");
    loadTickets();
  }

  const filtered = filter==="All" ? tickets : tickets.filter(t=>t.status===filter);
  const counts = {Open: tickets.filter(t=>t.status==="Open").length, "In progress": tickets.filter(t=>t.status==="In progress").length, Resolved: tickets.filter(t=>t.status==="Resolved").length};

  const priorityColor = (p: string) => p==="High"?"#EF4444":p==="Medium"?"#F59E0B":"#10B981";
  const statusBg = (s: string) => s==="Open"?"#EFF6FF":s==="In progress"?"#FFF7ED":"#ECFDF5";
  const statusColor = (s: string) => s==="Open"?"#1D4ED8":s==="In progress"?"#C2410C":"#065F46";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h1 style={{fontSize:"14px",fontWeight:"500"}}>Support Tickets</h1>
        <button onClick={()=>setShowModal(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px"}}>
          <i className="ti ti-plus" style={{fontSize:"13px"}}/>New ticket
        </button>
      </div>

      {msg&&<div style={{padding:"8px 12px",borderRadius:"8px",fontSize:"12px",background:P.successLight,color:P.success}}>{msg}</div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
        {[{label:"Open",color:"#1D4ED8",bg:"#EFF6FF"},{label:"In progress",color:"#C2410C",bg:"#FFF7ED"},{label:"Resolved",color:"#065F46",bg:"#ECFDF5"}].map(s=>(
          <div key={s.label} style={{background:s.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"12px 14px"}}>
            <div style={{fontSize:"22px",fontWeight:"500",color:s.color}}>{counts[s.label as keyof typeof counts]||0}</div>
            <div style={{fontSize:"11px",color:P.textSec,marginTop:"2px"}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:"6px"}}>
        {["All","Open","In progress","Resolved"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{fontSize:"11px",padding:"5px 12px",borderRadius:"20px",border:`0.5px solid ${filter===f?P.primary:P.border}`,background:filter===f?P.primaryLight:"transparent",color:filter===f?P.primary:P.textSec,cursor:"pointer"}}>{f}</button>
        ))}
      </div>

      {loading?<div style={{fontSize:"12px",color:P.textTert}}>Loading...</div>
      :filtered.length===0?<div style={{textAlign:"center",padding:"2rem",fontSize:"12px",color:P.textTert}}>No tickets found.</div>
      :filtered.map(t=>(
        <div key={t.id} onClick={()=>setSelectedTicket(t)} style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"14px",cursor:"pointer",transition:"border-color .15s"}}
          onMouseEnter={e=>(e.currentTarget.style.borderColor=P.primary)} onMouseLeave={e=>(e.currentTarget.style.borderColor=P.border)}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"6px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{fontFamily:"monospace",fontSize:"9px",color:P.textMuted}}>TKT-{String(t.id).slice(-4).toUpperCase()}</span>
              <span style={{fontSize:"13px",fontWeight:"500",color:P.text}}>{t.title}</span>
            </div>
            <span style={{fontSize:"10px",padding:"2px 9px",borderRadius:"20px",fontWeight:"500",background:statusBg(t.status),color:statusColor(t.status),flexShrink:0}}>{t.status}</span>
          </div>
          <div style={{fontSize:"11px",color:P.textSec,marginBottom:"8px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{t.description}</div>
          <div style={{display:"flex",alignItems:"center",gap:"12px",fontSize:"10px",color:P.textMuted}}>
            <span style={{display:"flex",alignItems:"center",gap:"4px"}}><span style={{width:"6px",height:"6px",borderRadius:"50%",background:priorityColor(t.priority),display:"inline-block"}}/>{t.priority}</span>
            <span><i className="ti ti-calendar" style={{fontSize:"11px",verticalAlign:"-1px",marginRight:"3px"}}/>{new Date(t.created_at).toLocaleDateString()}</span>
            <span><i className="ti ti-user" style={{fontSize:"11px",verticalAlign:"-1px",marginRight:"3px"}}/>{t.created_by_email}</span>
          </div>
        </div>
      ))}

      {/* Ticket Detail Modal */}
      {selectedTicket&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",width:"560px",maxHeight:"90vh",display:"flex",flexDirection:"column",border:`0.5px solid ${P.border}`}}>
            <div style={{padding:"14px 18px",borderBottom:`0.5px solid ${P.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <span style={{fontFamily:"monospace",fontSize:"10px",color:P.textMuted}}>TKT-{String(selectedTicket.id).slice(-4).toUpperCase()}</span>
                <div style={{fontSize:"14px",fontWeight:"500",color:P.text,marginTop:"2px"}}>{selectedTicket.title}</div>
              </div>
              <button onClick={()=>setSelectedTicket(null)} style={{background:"none",border:"none",fontSize:"18px",cursor:"pointer",color:P.textMuted}}>×</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:"12px"}}>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap" as const}}>
                <span style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",fontWeight:"500",background:statusBg(selectedTicket.status),color:statusColor(selectedTicket.status)}}>{selectedTicket.status}</span>
                <span style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",fontWeight:"500",background:P.bgTert,color:priorityColor(selectedTicket.priority)}}>{selectedTicket.priority} priority</span>
                <span style={{fontSize:"10px",color:P.textMuted,padding:"3px 0"}}>{new Date(selectedTicket.created_at).toLocaleString()}</span>
              </div>
              <div style={{background:P.bgSec,borderRadius:"8px",padding:"12px 14px"}}>
                <div style={{fontSize:"10px",fontWeight:"500",color:P.textMuted,marginBottom:"4px",textTransform:"uppercase" as const,letterSpacing:".05em"}}>Description</div>
                <div style={{fontSize:"12px",color:P.textSec,lineHeight:"1.6",whiteSpace:"pre-wrap" as const}}>{selectedTicket.description}</div>
              </div>
              {selectedTicket.replies&&(
                <div>
                  <div style={{fontSize:"10px",fontWeight:"500",color:P.textMuted,marginBottom:"8px",textTransform:"uppercase" as const,letterSpacing:".05em"}}>Replies</div>
                  {selectedTicket.replies.split("\n").map((r: string,i: number)=>(
                    <div key={i} style={{background:P.bgSec,borderRadius:"8px",padding:"8px 12px",marginBottom:"6px",fontSize:"11px",color:P.textSec,lineHeight:"1.55"}}>{r}</div>
                  ))}
                </div>
              )}
              <div>
                <label style={{fontSize:"10px",fontWeight:"500",color:P.textMuted,display:"block",marginBottom:"5px",textTransform:"uppercase" as const,letterSpacing:".05em"}}>Add reply</label>
                <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Type your reply..." rows={3} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",resize:"vertical" as const,fontFamily:"inherit"}}/>
                <button onClick={addReply} disabled={!replyText.trim()} style={{marginTop:"6px",fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",opacity:replyText.trim()?1:0.4}}>Send reply</button>
              </div>
              {canManage&&(
                <div style={{borderTop:`0.5px solid ${P.border}`,paddingTop:"12px"}}>
                  <div style={{fontSize:"10px",fontWeight:"500",color:P.textMuted,marginBottom:"8px",textTransform:"uppercase" as const,letterSpacing:".05em"}}>Update status</div>
                  <div style={{display:"flex",gap:"6px"}}>
                    {["Open","In progress","Resolved"].map(s=>(
                      <button key={s} onClick={()=>updateStatus(selectedTicket.id,s)} style={{fontSize:"11px",padding:"5px 12px",borderRadius:"20px",border:`0.5px solid ${selectedTicket.status===s?P.primary:P.border}`,background:selectedTicket.status===s?P.primaryLight:"transparent",color:selectedTicket.status===s?P.primary:P.textSec,cursor:"pointer",fontWeight:selectedTicket.status===s?"500":"400"}}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"460px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>New support ticket</h2>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Title</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Brief summary of the issue" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px"}}/>
            </div>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Description</label>
              <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the issue in detail..." rows={4} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",resize:"vertical" as const,fontFamily:"inherit"}}/>
            </div>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"6px"}}>Priority</label>
              <div style={{display:"flex",gap:"6px"}}>
                {["Low","Medium","High"].map(p=>(
                  <button key={p} onClick={()=>setPriority(p)} style={{flex:1,fontSize:"11px",padding:"6px",borderRadius:"8px",border:`0.5px solid ${priority===p?priorityColor(p):P.border}`,background:priority===p?priorityColor(p)+"22":"transparent",color:priority===p?priorityColor(p):P.textSec,cursor:"pointer",fontWeight:priority===p?"500":"400"}}>
                    <span style={{width:"6px",height:"6px",borderRadius:"50%",background:priorityColor(p),display:"inline-block",marginRight:"5px"}}/>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowModal(false);setTitle("");setDescription("");setPriority("Medium");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={createTicket} disabled={!title.trim()||!description.trim()} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",opacity:title.trim()&&description.trim()?1:0.4}}>Submit ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function calcQuality(d:any):{score:number,flags:string[]}{
  const flags:string[]=[];
  if(!d.file_path||!d.file_name){flags.push("NO_FILE");}
  if(!d.effective_date){flags.push("MISSING_DATE");}
  if(!d.owner||d.owner.trim()===""){flags.push("MISSING_OWNER");}
  if(!d.version||d.version.trim()===""){flags.push("MISSING_VERSION");}
  if(!d.custom_file_name||d.custom_file_name.trim()===""){flags.push("MISSING_CUSTOM_NAME");}
  if(d.expiry_date&&new Date(d.expiry_date)<new Date()){flags.push("EXPIRED");}
  let score=100;
  if(flags.includes("NO_FILE"))score-=20;
  if(flags.includes("MISSING_DATE"))score-=10;
  if(flags.includes("MISSING_OWNER"))score-=10;
  if(flags.includes("MISSING_VERSION"))score-=10;
  if(flags.includes("MISSING_CUSTOM_NAME"))score-=5;
  if(flags.includes("EXPIRED"))score-=15;
  return{score:Math.max(0,score),flags};
}

const FLAG_LABELS:Record<string,{label:string,color:string,bg:string,fix:string}> = {
  "NO_FILE":{label:"No file uploaded",color:"#991B1B",bg:"#FEF2F2",fix:"Upload the document file"},
  "MISSING_DATE":{label:"Missing effective date",color:"#92400E",bg:"#FFFBEB",fix:"Add the effective date"},
  "MISSING_OWNER":{label:"Missing owner",color:"#92400E",bg:"#FFFBEB",fix:"Assign a document owner"},
  "MISSING_VERSION":{label:"Missing version",color:"#92400E",bg:"#FFFBEB",fix:"Add version number (e.g. v1.0)"},
  "MISSING_CUSTOM_NAME":{label:"No custom document name",color:"#1E40AF",bg:"#EFF6FF",fix:"Set a descriptive document name"},
  "EXPIRED":{label:"Document expired",color:"#991B1B",bg:"#FEF2F2",fix:"Renew or replace the expired document"},
  "DUPLICATE":{label:"Duplicate file name",color:"#6B21A8",bg:"#FAF5FF",fix:"Check for duplicate uploads"},
  "VERSION_CONFLICT":{label:"Version conflict",color:"#6B21A8",bg:"#FAF5FF",fix:"Review multiple versions of same artifact"},
};

function QualityPanel({docs,P,supabase,setDocs}:{docs:any[],P:any,supabase:any,setDocs:any}){
  const fileNames=docs.map(d=>d.file_name).filter(Boolean);
  const duplicateNames=fileNames.filter((n,i)=>fileNames.indexOf(n)!==i);
  const artifactNums=docs.map(d=>d.artifact_num);
  const duplicateArtifacts=artifactNums.filter((n,i)=>artifactNums.indexOf(n)!==i);

  const docsWithQuality=docs.map(d=>{
    const{score,flags}=calcQuality(d);
    const allFlags=[...flags];
    if(d.file_name&&duplicateNames.includes(d.file_name))allFlags.push("DUPLICATE");
    if(d.artifact_num&&duplicateArtifacts.includes(d.artifact_num))allFlags.push("VERSION_CONFLICT");
    return{...d,qualityScore:Math.max(0,score-(allFlags.includes("DUPLICATE")?15:0)-(allFlags.includes("VERSION_CONFLICT")?10:0)),qualityFlags:allFlags};
  }).sort((a,b)=>a.qualityScore-b.qualityScore);

  const avgScore=docs.length?Math.round(docsWithQuality.reduce((s,d)=>s+d.qualityScore,0)/docs.length):0;
  const perfect=docsWithQuality.filter(d=>d.qualityScore===100).length;
  const needsWork=docsWithQuality.filter(d=>d.qualityScore<70).length;

  const scoreColor=(s:number)=>s>=90?"#10B981":s>=70?"#F59E0B":"#EF4444";
  const scoreBg=(s:number)=>s>=90?"#ECFDF5":s>=70?"#FFFBEB":"#FEF2F2";

  return(
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>
        {[
          {val:`${avgScore}`,label:"Average quality score",color:scoreColor(avgScore),bg:scoreBg(avgScore)},
          {val:`${docs.length}`,label:"Total documents",color:P.primary,bg:P.primaryLight},
          {val:`${perfect}`,label:"Perfect score (100)",color:"#10B981",bg:"#ECFDF5"},
          {val:`${needsWork}`,label:"Needs attention (<70)",color:"#EF4444",bg:"#FEF2F2"},
        ].map((m,i)=>(
          <div key={i} style={{background:`linear-gradient(135deg,${m.bg},#fff)`,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"14px",borderTop:`3px solid ${m.color}`}}>
            <div style={{fontSize:"26px",fontWeight:"500",color:m.color}}>{m.val}</div>
            <div style={{fontSize:"11px",color:P.textSec,marginTop:"3px"}}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Issue summary */}
      {Object.keys(FLAG_LABELS).map(flag=>{
        const affected=docsWithQuality.filter(d=>d.qualityFlags.includes(flag));
        if(!affected.length)return null;
        const f=FLAG_LABELS[flag];
        return(
          <div key={flag} style={{background:f.bg,border:`0.5px solid ${P.border}`,borderRadius:"10px",padding:"10px 14px",display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{flex:1}}>
              <span style={{fontSize:"12px",fontWeight:"500",color:f.color}}>{f.label}</span>
              <span style={{fontSize:"11px",color:P.textTert,marginLeft:"8px"}}>{affected.length} document{affected.length!==1?"s":""}</span>
              <div style={{fontSize:"10px",color:P.textTert,marginTop:"2px"}}>Fix: {f.fix}</div>
            </div>
            <span style={{fontSize:"11px",fontWeight:"500",color:f.color,flexShrink:0}}>-{flag==="NO_FILE"?20:flag==="EXPIRED"?15:flag==="DUPLICATE"?15:flag==="VERSION_CONFLICT"?10:flag==="MISSING_CUSTOM_NAME"?5:10} pts each</span>
          </div>
        );
      })}

      {/* Document list */}
      <div style={{background:"#fff",border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:`0.5px solid ${P.border}`,fontSize:"11px",fontWeight:"500",color:P.textSec}}>All documents - sorted by quality score</div>
        <table style={{width:"100%",fontSize:"11px",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
            {["Score","Artifact","Zone","File","Issues","Status"].map(h=>(
              <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:"10px",fontWeight:"500",color:P.textTert}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {docsWithQuality.length===0?(
              <tr><td colSpan={6} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No documents yet.</td></tr>
            ):docsWithQuality.map((d,i)=>(
              <tr key={i} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
                <td style={{padding:"8px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <div style={{width:"36px",height:"36px",borderRadius:"50%",background:scoreBg(d.qualityScore),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"500",color:scoreColor(d.qualityScore),border:`1.5px solid ${scoreColor(d.qualityScore)}`}}>{d.qualityScore}</div>
                  </div>
                </td>
                <td style={{padding:"8px 10px"}}>
                  <div style={{fontFamily:"monospace",fontSize:"9px",color:P.textTert}}>{d.artifact_num}</div>
                  <div style={{fontSize:"11px",fontWeight:"500"}}>{d.custom_file_name||d.artifact_name}</div>
                </td>
                <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>Zone {d.zone}</td>
                <td style={{padding:"8px 10px",fontSize:"11px",color:P.textSec}}>{d.file_name?`${fileIcon(d.file_name)} ${d.file_name}`:"-"}</td>
                <td style={{padding:"8px 10px"}}>
                  {d.qualityFlags.length===0?(
                    <span style={{fontSize:"10px",color:"#10B981"}}>No issues</span>
                  ):(
                    <div style={{display:"flex",gap:"3px",flexWrap:"wrap" as const}}>
                      {d.qualityFlags.map((f:string,fi:number)=>(
                        <span key={fi} style={{fontSize:"9px",padding:"1px 5px",borderRadius:"4px",background:FLAG_LABELS[f]?.bg||"#F3F4F6",color:FLAG_LABELS[f]?.color||P.textSec}}>{FLAG_LABELS[f]?.label||f}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{padding:"8px 10px"}}>
                  <span style={{fontSize:"10px",padding:"2px 7px",borderRadius:"8px",background:d.status==="Approved"?"#ECFDF5":d.status==="Under Review"?"#EFF6FF":"#FFFBEB",color:d.status==="Approved"?"#065F46":d.status==="Under Review"?"#1E40AF":"#92400E"}}>{d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditTrail({user,activeStudy,P}:{user:any,activeStudy:any,P:any}){
  const [logs,setLogs]=useState<any[]>([]);
  useEffect(()=>{
    if(!user||!activeStudy)return;
    supabase.from("audit_trail").select("*").eq("user_id",user.id).eq("study_id",activeStudy.study_id).order("created_at",{ascending:false}).limit(50).then(({data})=>{if(data)setLogs(data);});
  },[user,activeStudy]);
  if(!activeStudy)return<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>;
  if(logs.length===0)return<div style={{fontSize:"12px",color:P.textTert}}>No audit events yet. Actions will appear here as documents are uploaded and approved.</div>;
  return(
    <div style={{background:"#fff",border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
      <table style={{width:"100%",fontSize:"11px",borderCollapse:"collapse"}}>
        <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
          {["Timestamp","User","Action","Document","Field","Old value","New value","Signature reason"].map(h=>(
            <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:"10px",fontWeight:"500",color:P.textTert}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {logs.map((l,i)=>(
            <tr key={i} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
              <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:"10px",color:P.textTert,whiteSpace:"nowrap"}}>{new Date(l.created_at).toLocaleString()}</td>
              <td style={{padding:"7px 10px",color:P.textSec}}>{l.user_email}</td>
              <td style={{padding:"7px 10px"}}><span style={{fontSize:"10px",padding:"2px 7px",borderRadius:"8px",background:l.action.includes("approved")?P.successLight:P.primaryLight,color:l.action.includes("approved")?"#065F46":P.primary}}>{l.action}</span></td>
              <td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px"}}>{l.document_id?.slice(0,8)||"-"}</td>
              <td style={{padding:"7px 10px",color:P.textTert}}>{l.field_changed||"-"}</td>
              <td style={{padding:"7px 10px",color:P.textTert}}>{l.old_value||"-"}</td>
              <td style={{padding:"7px 10px",color:P.textSec}}>{l.new_value||"-"}</td>
              <td style={{padding:"7px 10px",color:P.textSec,fontSize:"10px"}}>{l.signature_reason||"-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ROLES=["System Administrator","Sponsor Admin","TMF Lead","CRA","CTA","QA","Trial Manager","Regulatory","Site Team","Auditor"];
const RC:Record<string,string>={"System Administrator":"#7C3AED","Sponsor Admin":"#2563EB","TMF Lead":"#0891B2","CRA":"#059669","CTA":"#D97706","QA":"#DC2626","Trial Manager":"#7C3AED","Regulatory":"#0891B2","Site Team":"#059669","Auditor":"#6B7280"};

function UserManagementPanel({user, P, supabase}: {user: any, P: any, supabase: any}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("CRA");
  const [invitePassword, setInvitePassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdTargetUser, setPwdTargetUser] = useState<any>(null);
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");

  useEffect(() => {
    supabase.from("user_roles").select("role").eq("user_id", user?.id).single().then(({data}:any) => {
      if (["System Administrator","Sponsor Admin","TMF Lead"].includes(data?.role)) setIsAdmin(true);
    });
    loadUsers();
  }, [user]);

  async function loadUsers() {
    const {data} = await supabase.from("user_roles").select("*").order("created_at",{ascending:false});
    if (data) setUsers(data);
    setLoading(false);
  }

  async function addUser() {
    if (!inviteEmail.trim()) return;
    setMessage("Sending invitation...");
    try {
      const res = await fetch("/api/invite", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:inviteEmail.trim(),role:inviteRole,full_name:inviteName.trim(),password:invitePassword,invited_by_email:user?.email})});
      const data = await res.json();
      if (data.error) { setMessage("Error: "+data.error); }
      else { setMessage("Invitation sent to "+inviteEmail); setShowModal(false); setInviteEmail(""); setInviteName(""); loadUsers(); }
    } catch(e: any) { setMessage("Error: "+e.message); }
    setTimeout(()=>setMessage(""),4000);
  }

  async function updateRole(id: string, role: string) {
    await supabase.from("user_roles").update({role}).eq("id",id);
    loadUsers();
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("user_roles").update({is_active:!current}).eq("id",id);
    loadUsers();
  }

  async function toggleDocAccess(id: string, current: boolean) {
    await supabase.from("user_roles").update({can_upload_download:!current}).eq("id",id);
    loadUsers();
  }

  async function toggleDownload(id: string, current: boolean) {
    await supabase.from("user_roles").update({can_download:!current}).eq("id",id);
    loadUsers();
  }

  async function toggleNotifications(id: string, current: boolean) {
    await supabase.from("user_roles").update({notifications_enabled:!current}).eq("id",id);
    loadUsers();
  }

  async function changeUserPassword() {
    if(!newPwd.trim()||newPwd.length<6){setPwdMsg("Password must be at least 6 characters.");return;}
    const res=await fetch("/api/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:pwdTargetUser.user_id,newPassword:newPwd})});
    const data=await res.json();
    if(data.error){setPwdMsg("Error: "+data.error);}else{setPwdMsg("Password changed successfully.");setTimeout(()=>{setShowPwdModal(false);setPwdTargetUser(null);setNewPwd("");setPwdMsg("");},1500);}
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h1 style={{fontSize:"14px",fontWeight:"500"}}>User Management</h1>
        {isAdmin&&<button onClick={()=>setShowModal(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>+ Add User</button>}
      </div>
      {message&&<div style={{padding:"8px 12px",borderRadius:"8px",fontSize:"12px",background:message.includes("Error")?P.dangerLight:P.successLight,color:message.includes("Error")?P.danger:P.success}}>{message}</div>}
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const,padding:"10px 14px",background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px"}}>
        {ROLES.map(r=><span key={r} style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",background:(RC[r]||"#6366F1")+"22",color:RC[r]||"#6366F1",fontWeight:"500"}}>{r}</span>)}
      </div>
      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr style={{borderBottom:`0.5px solid ${P.border}`}}>
            {["Name / Email","Role","Status","Added","Upload","Download","Notifications","Action","Password"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 14px",fontSize:"11px",fontWeight:"500",color:P.textSec}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={9} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>Loading...</td></tr>
            :users.length===0?<tr><td colSpan={9} style={{textAlign:"center",padding:"2rem",color:P.textTert}}>No users yet.</td></tr>
            :users.map((u)=>(
              <tr key={u.id} style={{borderBottom:`0.5px solid ${P.bgTert}`}}>
                <td style={{padding:"10px 14px"}}><div style={{fontWeight:"500"}}>{u.full_name||"-"}</div><div style={{fontSize:"11px",color:P.textSec}}>{u.email}</div></td>
                <td style={{padding:"10px 14px"}}>
                  {isAdmin?<select value={u.role} onChange={e=>updateRole(u.id,e.target.value)} style={{fontSize:"11px",padding:"4px 8px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:(RC[u.role]||"#6366F1")+"22",color:RC[u.role]||"#6366F1",fontWeight:"500"}}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select>:<span style={{fontSize:"11px",padding:"3px 10px",borderRadius:"20px",background:(RC[u.role]||"#6366F1")+"22",color:RC[u.role]||"#6366F1",fontWeight:"500"}}>{u.role}</span>}
                </td>
                <td style={{padding:"10px 14px"}}><span style={{fontSize:"10px",padding:"3px 8px",borderRadius:"20px",background:u.is_active?"#ECFDF5":"#F3F4F6",color:u.is_active?"#10B981":"#6B7280",fontWeight:"500"}}>{u.is_active?"Active":"Inactive"}</span></td>
                <td style={{padding:"10px 14px",fontSize:"11px",color:P.textSec}}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{padding:"10px 14px"}}>{isAdmin?<button onClick={()=>toggleDocAccess(u.id,u.can_upload_download)} style={{fontSize:"10px",padding:"3px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:u.can_upload_download?"#ECFDF5":"#FEF2F2",cursor:"pointer",color:u.can_upload_download?"#10B981":"#EF4444",fontWeight:"500"}}>{u.can_upload_download?"YES":"NO"}</button>:<span style={{fontSize:"10px",color:u.can_upload_download?"#10B981":"#EF4444",fontWeight:"500"}}>{u.can_upload_download?"YES":"NO"}</span>}</td>
                <td style={{padding:"10px 14px"}}>{isAdmin?<button onClick={()=>toggleDownload(u.id,u.can_download)} style={{fontSize:"10px",padding:"3px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:u.can_download?"#ECFDF5":"#FEF2F2",cursor:"pointer",color:u.can_download?"#10B981":"#EF4444",fontWeight:"500"}}>{u.can_download?"YES":"NO"}</button>:<span style={{fontSize:"10px",color:u.can_download?"#10B981":"#EF4444",fontWeight:"500"}}>{u.can_download?"YES":"NO"}</span>}</td>
                <td style={{padding:"10px 14px"}}>{isAdmin?<button onClick={()=>toggleNotifications(u.id,u.notifications_enabled)} style={{fontSize:"10px",padding:"3px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:u.notifications_enabled?"#ECFDF5":"#FEF2F2",cursor:"pointer",color:u.notifications_enabled?"#10B981":"#EF4444",fontWeight:"500"}}>{u.notifications_enabled?"ON":"OFF"}</button>:<span style={{fontSize:"10px",color:u.notifications_enabled?"#10B981":"#EF4444",fontWeight:"500"}}>{u.notifications_enabled?"ON":"OFF"}</span>}</td>
                <td style={{padding:"10px 14px"}}>
                  {isAdmin&&<button onClick={()=>toggleActive(u.id,u.is_active)} style={{fontSize:"10px",padding:"3px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:u.is_active?P.danger:P.success}}>{u.is_active?"Deactivate":"Activate"}</button>}
                </td>
                <td style={{padding:"10px 14px"}}>
                  {isAdmin&&<button onClick={()=>{setPwdTargetUser(u);setNewPwd("");setPwdMsg("");setShowPwdModal(true);}} style={{fontSize:"10px",padding:"3px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:"transparent",cursor:"pointer",color:P.primary}}>Change Pwd</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"400px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Add Team Member</h2>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Full Name</label><input value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="e.g. Jane Smith" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Email</label><input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="jane@organization.com" type="email" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Password</label><input value={invitePassword} onChange={e=>setInvitePassword(e.target.value)} placeholder="Create a password for this user" type="password" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Role</label>
              <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>
                {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowModal(false)} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={addUser} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add User</button>
            </div>
          </div>
        </div>
      )}
      {showPwdModal&&pwdTargetUser&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"400px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Change Password</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>{pwdTargetUser.full_name||pwdTargetUser.email}</p>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>New Password</label>
              <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Min 6 characters" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px"}} onKeyDown={e=>e.key==="Enter"&&changeUserPassword()}/>
            </div>
            {pwdMsg&&<div style={{fontSize:"11px",marginBottom:"10px",padding:"8px 10px",borderRadius:"8px",background:pwdMsg.includes("Error")?P.dangerLight:P.successLight,color:pwdMsg.includes("Error")?P.danger:P.success}}>{pwdMsg}</div>}
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowPwdModal(false);setPwdTargetUser(null);setNewPwd("");setPwdMsg("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={changeUserPassword} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Change Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




function TmfAuditorPanel({user,P,supabase,activeStudy,orgId,currentUserRole,activeTMF,activeZONES,studyDocs,setDocs,logAudit}:{user:any,P:any,supabase:any,activeStudy:any,orgId:string,currentUserRole:string,activeTMF:any[],activeZONES:any[],studyDocs:any[],setDocs:any,logAudit:any}){
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set(["1"]));
  const [expandedArtifacts, setExpandedArtifacts] = useState<Set<string>>(new Set());
  const [actionComment, setActionComment] = useState("");
  const [actionType, setActionType] = useState<"approve"|"review"|null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string|null>(null);

  const canAudit = ["System Administrator","Sponsor Admin","TMF Lead"].includes(currentUserRole);

  function toggleZone(z: string) {
    setExpandedZones(prev => {
      const next = new Set(prev);
      if (next.has(z)) next.delete(z); else next.add(z);
      return next;
    });
  }

  function toggleArtifact(a: string) {
    setExpandedArtifacts(prev => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a); else next.add(a);
      return next;
    });
  }

  function getArtifactDocs(artifactNum: string) {
    return studyDocs.filter(d => d.artifact_num === artifactNum);
  }

  function getZoneStatus(z: string) {
    const coreArts = activeTMF.filter(a => a.cl === "Core" && a.z === z);
    const approvedArts = coreArts.filter(a => studyDocs.some(d => d.artifact_num === a.a && d.status === "Approved"));
    if (coreArts.length === 0) return "empty";
    if (approvedArts.length === coreArts.length) return "complete";
    if (approvedArts.length > 0) return "partial";
    return "missing";
  }

  function getArtifactStatus(artifactNum: string) {
    const docs = getArtifactDocs(artifactNum);
    if (docs.some(d => d.status === "Approved")) return "approved";
    if (docs.some(d => d.status === "Under Review")) return "review";
    if (docs.length > 0) return "draft";
    return "empty";
  }

  async function handleAction() {
    if (!selectedDoc || !actionType || !actionComment.trim()) return;
    setSaving(true);
    const newStatus = actionType === "approve" ? "Approved" : "Under Review";
    const now = new Date().toISOString();
    
    const updateData: any = {
      status: newStatus,
      comments: (selectedDoc.comments||"") + (selectedDoc.comments?"\n":"") + "[" + new Date().toLocaleString() + " - " + user.email + "]: " + actionComment.trim()
    };
    
    if (actionType === "approve") {
      updateData.approved_by = user.email;
      updateData.approved_at = now;
      updateData.signature_reason = actionComment.trim();
    }

    const { error } = await supabase.from("documents").update(updateData).eq("id", selectedDoc.id);
    if (!error) {
      await logAudit(
        actionType === "approve" ? "Document approved via TMF Auditor" : "Document moved to pending review via TMF Auditor",
        selectedDoc.id, selectedDoc.study_id, "status", selectedDoc.status, newStatus, actionComment.trim()
      );
      setDocs((prev: any[]) => prev.map(d => d.id === selectedDoc.id ? {...d, ...updateData} : d));
      setSelectedDoc((prev: any) => prev ? {...prev, ...updateData} : null);
      setMsg(actionType === "approve" ? "Document marked complete. Audit trail updated." : "Document moved to Pending Review.");
      setActionComment("");
      setActionType(null);
      setTimeout(() => setMsg(""), 3000);
    }
    setSaving(false);
  }

  const statusDot = (status: string) => {
    const colors: Record<string,string> = {
      complete:"#10B981", approved:"#10B981", partial:"#F59E0B",
      review:"#3B82F6", draft:"#9CA3AF", missing:"#EF4444", empty:"#E5E7EB"
    };
    return <span style={{width:"8px",height:"8px",borderRadius:"50%",background:colors[status]||"#E5E7EB",display:"inline-block",flexShrink:0}}/>;
  };

  if (!activeStudy) return <div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>;
  if (!canAudit) return <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"12px 14px",fontSize:"11px",color:"#92400E"}}>Only System Administrator, TMF Lead, and Sponsor Admin can access TMF Auditor.</div>;

  return (
    <div style={{display:"flex",height:"calc(100vh - 110px)",gap:"0",border:`0.5px solid ${P.border}`,borderRadius:"14px",overflow:"hidden",background:P.bg}}>
      
      {/* Left tree panel */}
      <div style={{width:"320px",borderRight:`0.5px solid ${P.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${P.border}`,background:P.bgSec}}>
          <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>TMF Auditor</div>
          <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>{activeStudy.study_id} — Document review</div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {activeZONES.map(({z,zn}) => {
            const zoneArts = activeTMF.filter(a => a.z === z).slice().sort((a,b)=>a.a.localeCompare(b.a,undefined,{numeric:true,sensitivity:"base"}));
            const zStatus = getZoneStatus(z);
            const isExpanded = expandedZones.has(z);
            return (
              <div key={z}>
                {/* Zone row */}
                <div onClick={() => toggleZone(z)} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",cursor:"pointer",background:isExpanded?P.primaryLight:"transparent",borderBottom:`0.5px solid ${P.bgTert}`,userSelect:"none"}}>
                  <i className={`ti ${isExpanded?"ti-chevron-down":"ti-chevron-right"}`} style={{fontSize:"12px",color:P.textTert,flexShrink:0}}/>
                  {statusDot(zStatus)}
                  <span style={{fontSize:"11px",fontWeight:"600",color:isExpanded?P.primary:P.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>Zone {z} — {zn}</span>
                  <span style={{fontSize:"9px",color:P.textTert,flexShrink:0}}>{zoneArts.length}</span>
                </div>
                {/* Artifacts */}
                {isExpanded && zoneArts.map(a => {
                  const aStatus = getArtifactStatus(a.a);
                  const aDocs = getArtifactDocs(a.a);
                  const isArtExpanded = expandedArtifacts.has(a.a);
                  return (
                    <div key={a.a}>
                      <div onClick={() => toggleArtifact(a.a)} style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 12px 6px 28px",cursor:"pointer",background:isArtExpanded?"#F0FDF4":"transparent",borderBottom:`0.5px solid ${P.bgTert}`}}>
                        <i className={`ti ${isArtExpanded?"ti-chevron-down":"ti-chevron-right"}`} style={{fontSize:"11px",color:P.textTert,flexShrink:0}}/>
                        {statusDot(aStatus)}
                        <span style={{fontSize:"10px",color:P.textSec,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{a.a} — {a.an}</span>
                        {aDocs.length > 0 && <span style={{fontSize:"9px",background:P.bgTert,color:P.textTert,padding:"1px 5px",borderRadius:"10px",flexShrink:0}}>{aDocs.length}</span>}
                      </div>
                      {/* Documents */}
                      {isArtExpanded && aDocs.length === 0 && (
                        <div style={{padding:"6px 12px 6px 44px",fontSize:"10px",color:P.textMuted,borderBottom:`0.5px solid ${P.bgTert}`}}>No documents uploaded</div>
                      )}
                      {isArtExpanded && aDocs.map(d => (
                        <div key={d.id} onClick={() => {setSelectedDoc(d);setActionComment("");setActionType(null);setPreviewUrl(null);}}
                          style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 12px 6px 44px",cursor:"pointer",background:selectedDoc?.id===d.id?P.primaryLight:"transparent",borderBottom:`0.5px solid ${P.bgTert}`}}>
                          {statusDot(d.status==="Approved"?"approved":d.status==="Under Review"?"review":"draft")}
                          <span style={{fontSize:"10px",color:selectedDoc?.id===d.id?P.primary:P.textSec,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{d.custom_file_name||d.file_name||d.artifact_name}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div style={{padding:"10px 14px",borderTop:`0.5px solid ${P.border}`,display:"flex",gap:"10px",flexWrap:"wrap" as const}}>
          {[{c:"#10B981",l:"Approved"},{c:"#3B82F6",l:"Review"},{c:"#F59E0B",l:"Partial"},{c:"#9CA3AF",l:"Draft"},{c:"#EF4444",l:"Missing"}].map((leg,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:"4px"}}>
              <span style={{width:"7px",height:"7px",borderRadius:"50%",background:leg.c,display:"inline-block"}}/>
              <span style={{fontSize:"9px",color:P.textTert}}>{leg.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right detail panel */}
      {!selectedDoc ? (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"10px",color:P.textTert}}>
          <i className="ti ti-file-search" style={{fontSize:"40px",color:P.border}}/>
          <div style={{fontSize:"13px",fontWeight:"500",color:P.textSec}}>Select a document to review</div>
          <div style={{fontSize:"11px"}}>Click a document in the tree on the left</div>
        </div>
      ) : (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Doc header */}
          <div style={{padding:"12px 20px",borderBottom:`0.5px solid ${P.border}`,background:P.bgSec,display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>{selectedDoc.custom_file_name||selectedDoc.file_name||selectedDoc.artifact_name}</div>
              <div style={{fontSize:"10px",color:P.textTert,marginTop:"2px"}}>{selectedDoc.artifact_num} — Zone {selectedDoc.zone}</div>
            </div>
            <span style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",fontWeight:"500",background:selectedDoc.status==="Approved"?"#ECFDF5":selectedDoc.status==="Under Review"?"#EFF6FF":"#F3F4F6",color:selectedDoc.status==="Approved"?"#065F46":selectedDoc.status==="Under Review"?"#1D4ED8":"#374151"}}>{selectedDoc.status}</span>
          </div>

          <div style={{flex:1,overflow:"auto",display:"flex",gap:"0"}}>
            {/* Metadata sidebar */}
            <div style={{width:"220px",borderRight:`0.5px solid ${P.border}`,padding:"14px",overflowY:"auto",flexShrink:0}}>
              <div style={{fontSize:"10px",fontWeight:"600",color:P.textTert,textTransform:"uppercase" as const,letterSpacing:".06em",marginBottom:"10px"}}>Document Metadata</div>
              {[
                {label:"Artifact",value:selectedDoc.artifact_num},
                {label:"Artifact Name",value:selectedDoc.artifact_name},
                {label:"Zone",value:selectedDoc.zone},
                {label:"Version",value:selectedDoc.version||"—"},
                {label:"Owner",value:selectedDoc.owner||"—"},
                {label:"Status",value:selectedDoc.status},
                {label:"Effective Date",value:selectedDoc.effective_date||"—"},
                {label:"Expiry Date",value:selectedDoc.expiry_date||"—"},
                {label:"File Name",value:selectedDoc.file_name||"—"},
                {label:"File Size",value:selectedDoc.file_size?Math.round(selectedDoc.file_size/1024)+"KB":"—"},
                {label:"Approved By",value:selectedDoc.approved_by||"—"},
                {label:"Approved At",value:selectedDoc.approved_at?new Date(selectedDoc.approved_at).toLocaleDateString():"—"},
              ].map((m,i)=>(
                <div key={i} style={{marginBottom:"8px"}}>
                  <div style={{fontSize:"9px",color:P.textTert,fontWeight:"600",textTransform:"uppercase" as const,letterSpacing:".04em"}}>{m.label}</div>
                  <div style={{fontSize:"11px",color:P.text,marginTop:"2px",wordBreak:"break-word" as const}}>{m.value}</div>
                </div>
              ))}
              {selectedDoc.comments && (
                <div style={{marginTop:"10px",paddingTop:"10px",borderTop:`0.5px solid ${P.border}`}}>
                  <div style={{fontSize:"9px",color:P.textTert,fontWeight:"600",textTransform:"uppercase" as const,letterSpacing:".04em",marginBottom:"4px"}}>Comments</div>
                  <div style={{fontSize:"10px",color:P.textSec,whiteSpace:"pre-wrap" as const}}>{selectedDoc.comments}</div>
                </div>
              )}
              {selectedDoc.file_path && (
                <div style={{marginTop:"12px",display:"flex",flexDirection:"column" as const,gap:"6px"}}>
                  <button onClick={()=>{
                    const url = supabase.storage.from("Documents").getPublicUrl(selectedDoc.file_path).data.publicUrl;
                    setPreviewUrl(previewUrl ? null : url);
                  }} style={{fontSize:"10px",padding:"5px 10px",background:P.primaryLight,color:P.primary,border:`0.5px solid ${P.primary}`,borderRadius:"6px",cursor:"pointer"}}>
                    {previewUrl ? "Hide Preview" : "Preview Document"}
                  </button>
                  <a href={supabase.storage.from("Documents").getPublicUrl(selectedDoc.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:"10px",padding:"5px 10px",background:P.bgTert,color:P.textSec,border:`0.5px solid ${P.border}`,borderRadius:"6px",textDecoration:"none",textAlign:"center" as const}}>
                    Open in New Tab
                  </a>
                </div>
              )}
            </div>

            {/* Preview / main area */}
            <div style={{flex:1,overflow:"auto",background:P.bgSec,display:"flex",alignItems:previewUrl?"flex-start":"center",justifyContent:"center",padding:"16px"}}>
              {previewUrl ? (
                selectedDoc.file_name?.match(/.(png|jpg|jpeg|gif|webp)$/i)
                  ? <img src={previewUrl} alt={selectedDoc.file_name} style={{maxWidth:"100%",height:"auto",borderRadius:"8px",boxShadow:"0 2px 12px rgba(0,0,0,0.1)"}}/>
                  : <iframe src={previewUrl} style={{width:"100%",height:"calc(100vh - 300px)",border:"none",borderRadius:"8px",background:"#fff"}}/>
              ) : (
                <div style={{textAlign:"center",color:P.textTert}}>
                  <i className="ti ti-file-description" style={{fontSize:"48px",color:P.border}}/>
                  <div style={{fontSize:"12px",marginTop:"8px"}}>Click "Preview Document" to view</div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom action bar */}
          <div style={{padding:"14px 20px",borderTop:`0.5px solid ${P.border}`,background:P.bg,display:"flex",flexDirection:"column" as const,gap:"10px"}}>
            {msg && <div style={{fontSize:"11px",padding:"8px 12px",borderRadius:"8px",background:msg.includes("Approved")||msg.includes("complete")?P.successLight:P.primaryLight,color:msg.includes("Approved")||msg.includes("complete")?P.success:P.primary}}>{msg}</div>}
            <div style={{display:"flex",gap:"10px",alignItems:"flex-end"}}>
              <div style={{flex:1}}>
                <label style={{fontSize:"10px",color:P.textSec,display:"block",marginBottom:"4px",fontWeight:"500"}}>
                  {actionType==="approve"?"Approval reason (required)":actionType==="review"?"Reason for returning to review (required)":"Add a comment to take action"}
                </label>
                <textarea value={actionComment} onChange={e=>setActionComment(e.target.value)} placeholder={actionType==="approve"?"e.g. Reviewed and approved — document is accurate and complete":actionType==="review"?"e.g. Version number missing — please update":"Select an action below..."} rows={2} style={{width:"100%",fontSize:"11px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",resize:"vertical" as const,background:P.bg}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column" as const,gap:"6px",flexShrink:0}}>
                <button onClick={()=>setActionType("approve")} disabled={!canAudit} style={{fontSize:"11px",fontWeight:"500",padding:"8px 16px",background:actionType==="approve"?P.success:"transparent",color:actionType==="approve"?"#fff":P.success,border:`1.5px solid ${P.success}`,borderRadius:"8px",cursor:canAudit?"pointer":"not-allowed",minWidth:"140px"}}>
                  ✓ Mark Complete
                </button>
                <button onClick={()=>setActionType("review")} disabled={!canAudit} style={{fontSize:"11px",fontWeight:"500",padding:"8px 16px",background:actionType==="review"?P.blue:"transparent",color:actionType==="review"?"#fff":P.blue,border:`1.5px solid ${P.blue}`,borderRadius:"8px",cursor:canAudit?"pointer":"not-allowed",minWidth:"140px"}}>
                  ↩ Move to Review
                </button>
                {actionType && (
                  <button onClick={handleAction} disabled={!actionComment.trim()||saving} style={{fontSize:"11px",fontWeight:"600",padding:"8px 16px",background:actionType==="approve"?P.success:P.blue,color:"#fff",border:"none",borderRadius:"8px",cursor:actionComment.trim()&&!saving?"pointer":"not-allowed",opacity:actionComment.trim()&&!saving?1:0.5}}>
                    {saving?"Saving...":"Confirm"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackerPanel({user, P, supabase, orgId, currentUserRole}: {user: any, P: any, supabase: any, orgId: string, currentUserRole: string}) {
  const [freq, setFreq] = useState("Off");
  const [expiryWindow, setExpiryWindow] = useState(30);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const canManage = ["System Administrator","Sponsor Admin","TMF Lead"].includes(currentUserRole);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/notification-preferences?user_id=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.report_frequency) setFreq(data.report_frequency);
        if (data.expiry_window) setExpiryWindow(data.expiry_window);
        setLoading(false);
      });
  }, [user]);

  async function savePrefs() {
    setSaving(true);
    const res = await fetch("/api/notification-preferences", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ user_id: user.id, org_id: orgId, report_frequency: freq, expiry_window: expiryWindow })
    });
    const data = await res.json();
    if (data.error) setMsg("Error: " + data.error);
    else setMsg("Preferences saved successfully.");
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  }

  if (loading) return <div style={{fontSize:"12px",color:P.textTert}}>Loading...</div>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"16px",maxWidth:"680px"}}>
      <h1 style={{fontSize:"14px",fontWeight:"500"}}>Notification Tracker</h1>

      {!canManage && (
        <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#92400E"}}>
          Only TMF Lead, Sponsor Admin, and System Administrator can manage notification preferences.
        </div>
      )}

      {msg && <div style={{padding:"10px 14px",borderRadius:"8px",fontSize:"12px",background:msg.includes("Error")?P.dangerLight:P.successLight,color:msg.includes("Error")?P.danger:P.success}}>{msg}</div>}

      {/* TMF Report Email */}
      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"20px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:"12px",marginBottom:"16px"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"10px",background:P.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <i className="ti ti-mail" style={{fontSize:"20px",color:P.primary}}/>
          </div>
          <div>
            <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>TMF Report Email</div>
            <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Automated email summarising TMF gaps, expiring documents, and pending reviews</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"6px",fontWeight:"500"}}>Report Frequency</label>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              {["Off","Weekly","Bi-weekly","Monthly"].map(f=>(
                <button key={f} onClick={()=>canManage&&setFreq(f)} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",borderRadius:"8px",border:`0.5px solid ${freq===f?P.primary:P.border}`,background:freq===f?P.primaryLight:"transparent",cursor:canManage?"pointer":"not-allowed",textAlign:"left"}}>
                  <div style={{width:"14px",height:"14px",borderRadius:"50%",border:`2px solid ${freq===f?P.primary:P.border}`,background:freq===f?P.primary:"transparent",flexShrink:0}}/>
                  <span style={{fontSize:"12px",color:freq===f?P.primary:P.textSec,fontWeight:freq===f?"500":"400"}}>{f}</span>
                  {f==="Off"&&<span style={{fontSize:"10px",color:P.textTert,marginLeft:"auto"}}>No emails</span>}
                  {f==="Weekly"&&<span style={{fontSize:"10px",color:P.textTert,marginLeft:"auto"}}>Every Monday</span>}
                  {f==="Bi-weekly"&&<span style={{fontSize:"10px",color:P.textTert,marginLeft:"auto"}}>Every 2 weeks</span>}
                  {f==="Monthly"&&<span style={{fontSize:"10px",color:P.textTert,marginLeft:"auto"}}>1st of month</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"6px",fontWeight:"500"}}>Expiry Window in Report</label>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              {[30,60,90].map(w=>(
                <button key={w} onClick={()=>canManage&&setExpiryWindow(w)} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",borderRadius:"8px",border:`0.5px solid ${expiryWindow===w?P.warning:P.border}`,background:expiryWindow===w?"#FFFBEB":"transparent",cursor:canManage?"pointer":"not-allowed",textAlign:"left"}}>
                  <div style={{width:"14px",height:"14px",borderRadius:"50%",border:`2px solid ${expiryWindow===w?P.warning:P.border}`,background:expiryWindow===w?P.warning:"transparent",flexShrink:0}}/>
                  <span style={{fontSize:"12px",color:expiryWindow===w?"#92400E":P.textSec,fontWeight:expiryWindow===w?"500":"400"}}>{w} days</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Document Expiry Notifications */}
      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"20px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:"12px",marginBottom:"12px"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"10px",background:"#FFFBEB",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <i className="ti ti-calendar-exclamation" style={{fontSize:"20px",color:P.warning}}/>
          </div>
          <div>
            <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>Document Expiry Notifications</div>
            <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Automatic alerts sent to document owner, TMF Lead, and Sponsor Admin</div>
          </div>
        </div>
        <div style={{display:"flex",gap:"10px"}}>
          {[{days:90,color:"#6366F1",bg:"#EEF2FF",label:"90 days"},{days:30,color:P.warning,bg:"#FFFBEB",label:"30 days"},{days:15,color:P.danger,bg:P.dangerLight,label:"15 days"}].map(t=>(
            <div key={t.days} style={{flex:1,background:t.bg,borderRadius:"10px",padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:"22px",fontWeight:"700",color:t.color}}>{t.label}</div>
              <div style={{fontSize:"10px",color:P.textTert,marginTop:"4px"}}>Alert sent</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:"10px",fontSize:"11px",color:P.textTert}}>Three separate emails are sent per document — at exactly 90, 30, and 15 days before expiry. No duplicate sends.</div>
      </div>

      {/* Upload/Approval/Rejection */}
      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"20px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:"12px",marginBottom:"12px"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"10px",background:P.successLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <i className="ti ti-bell-ringing" style={{fontSize:"20px",color:P.success}}/>
          </div>
          <div>
            <div style={{fontSize:"13px",fontWeight:"600",color:P.text}}>Upload / Approval / Rejection Notifications</div>
            <div style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Instant notifications on document status changes</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
          {[
            {icon:"ti-upload",color:"#6366F1",label:"Document uploaded",desc:"Notifies TMF Lead, Sponsor Admin, System Admin"},
            {icon:"ti-clock",color:P.blue,label:"Submitted for review",desc:"Notifies TMF Lead, Sponsor Admin, System Admin"},
            {icon:"ti-check",color:P.success,label:"Document approved",desc:"Notifies the uploader"},
            {icon:"ti-x",color:P.danger,label:"Document rejected",desc:"Notifies the uploader with rejection reason"},
          ].map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",background:P.bgSec,borderRadius:"8px"}}>
              <i className={`ti ${item.icon}`} style={{fontSize:"16px",color:item.color,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:"12px",fontWeight:"500",color:P.text}}>{item.label}</div>
                <div style={{fontSize:"10px",color:P.textTert}}>{item.desc}</div>
              </div>
              <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:P.successLight,color:P.success,fontWeight:"500"}}>Active</span>
            </div>
          ))}
        </div>
      </div>

      {canManage && (
        <button onClick={savePrefs} disabled={saving} style={{fontSize:"12px",fontWeight:"500",padding:"10px 20px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:saving?"not-allowed":"pointer",opacity:saving?0.6:1,alignSelf:"flex-start"}}>
          {saving?"Saving...":"Save Preferences"}
        </button>
      )}
    </div>
  );
}

function ProfilePanel({user, P, supabase}: {user: any, P: any, supabase: any}) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success"|"error">("success");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("full_name,role").eq("user_id", user.id).single().then(({data}:any) => {
      if (data) { setFullName(data.full_name || ""); setRole(data.role || ""); }
      setLoading(false);
    });
  }, [user]);

  async function saveName() {
    if (!fullName.trim()) return;
    setSaving(true);
    const {error} = await supabase.from("user_roles").update({full_name: fullName.trim()}).eq("user_id", user.id);
    if (!error) { setMessage("Name updated successfully"); setMessageType("success"); }
    else { setMessage("Error: " + error.message); setMessageType("error"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  }

  async function changePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) { setMessage("All password fields are required"); setMessageType("error"); return; }
    if (newPassword !== confirmPassword) { setMessage("New passwords do not match"); setMessageType("error"); return; }
    if (newPassword.length < 6) { setMessage("Password must be at least 6 characters"); setMessageType("error"); return; }
    setSaving(true);
    const {error: signInError} = await supabase.auth.signInWithPassword({email: user.email, password: currentPassword});
    if (signInError) { setMessage("Current password is incorrect"); setMessageType("error"); setSaving(false); return; }
    const {error} = await supabase.auth.updateUser({password: newPassword});
    if (!error) { setMessage("Password changed successfully"); setMessageType("success"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    else { setMessage("Error: " + error.message); setMessageType("error"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 4000);
  }

  if (loading) return <div style={{fontSize:"12px",color:P.textTert}}>Loading...</div>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"16px",maxWidth:"600px"}}>
      <h1 style={{fontSize:"14px",fontWeight:"500"}}>My Profile</h1>

      {message && (
        <div style={{padding:"10px 14px",borderRadius:"8px",fontSize:"12px",background:messageType==="success"?P.successLight:P.dangerLight,color:messageType==="success"?P.success:P.danger}}>
          {message}
        </div>
      )}

      {/* Profile Info */}
      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"20px"}}>
        <h2 style={{fontSize:"12px",fontWeight:"500",color:P.textSec,marginBottom:"16px",textTransform:"uppercase" as const,letterSpacing:".06em"}}>Profile Information</h2>
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Full Name</label>
            <div style={{display:"flex",gap:"8px"}}>
              <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name" style={{flex:1,fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px"}}/>
              <button onClick={saveName} disabled={saving} style={{fontSize:"11px",padding:"8px 16px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",opacity:saving?0.6:1}}>Save</button>
            </div>
          </div>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Email</label>
            <input value={user?.email||""} disabled style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",background:P.bgTert,color:P.textSec,cursor:"not-allowed"}}/>
            <p style={{fontSize:"10px",color:P.textTert,marginTop:"3px"}}>Email cannot be changed. Contact your System Administrator.</p>
          </div>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Role</label>
            <input value={role} disabled style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",background:P.bgTert,color:P.textSec,cursor:"not-allowed"}}/>
            <p style={{fontSize:"10px",color:P.textTert,marginTop:"3px"}}>Role is assigned by your System Administrator.</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div style={{background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",padding:"20px"}}>
        <h2 style={{fontSize:"12px",fontWeight:"500",color:P.textSec,marginBottom:"16px",textTransform:"uppercase" as const,letterSpacing:".06em"}}>Change Password</h2>
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Current Password</label>
            <div style={{position:"relative" as const}}><input type={showCurrentPwd?"text":"password"} value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="--------" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 36px 8px 10px"}}/><button onClick={()=>setShowCurrentPwd(!showCurrentPwd)} style={{position:"absolute" as const,right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:P.textTert,fontSize:"14px"}}>{showCurrentPwd?"FILE":"FILE"}</button></div>
          </div>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>New Password</label>
            <div style={{position:"relative" as const}}><input type={showNewPwd?"text":"password"} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="--------" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 36px 8px 10px"}}/><button onClick={()=>setShowNewPwd(!showNewPwd)} style={{position:"absolute" as const,right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:P.textTert,fontSize:"14px"}}>{showNewPwd?"FILE":"FILE"}</button></div>
          </div>
          <div>
            <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"4px"}}>Confirm New Password</label>
            <div style={{position:"relative" as const}}><input type={showConfirmPwd?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="--------" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 36px 8px 10px"}}/><button onClick={()=>setShowConfirmPwd(!showConfirmPwd)} style={{position:"absolute" as const,right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:P.textTert,fontSize:"14px"}}>{showConfirmPwd?"FILE":"FILE"}</button></div>
          </div>
          <button onClick={changePassword} disabled={saving} style={{fontSize:"12px",padding:"9px 16px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",opacity:saving?0.6:1,alignSelf:"flex-start"}}>
            {saving?"Changing...":"Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessagesPanel({user, P, supabase, activeStudy}: {user: any, P: any, supabase: any, activeStudy: any}) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File|null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<any>(null);

  useEffect(() => {
    loadConversations();
    loadAllUsers();
  }, [activeStudy]);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
      pollRef.current = setInterval(() => loadMessages(activeConv.id), 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior:"smooth"});
  }, [messages]);

  async function loadConversations() {
    if (!user) return;
    const {data} = await supabase
      .from("conversations")
      .select("*, conversation_members!inner(user_id)")
      .eq("conversation_members.user_id", user.id)
      .eq("study_id", activeStudy?.study_id || "")
      .order("updated_at", {ascending: false});
    if (data) setConversations(data);
  }

  async function loadAllUsers() {
    const {data} = await supabase.from("user_roles").select("user_id,email,full_name").eq("is_active", true);
    if (data) setAllUsers(data.filter((u:any) => u.user_id !== user?.id));
  }

  async function loadMessages(convId: string) {
    const {data} = await supabase
      .from("messages")
      .select("*, message_attachments(*)")
      .eq("conversation_id", convId)
      .order("created_at", {ascending: true});
    if (data) setMessages(data);
  }

  async function startDM(targetUser: any) {
    // Check if DM already exists
    const existing = conversations.find(c => !c.is_group && c.name === targetUser.email);
    if (existing) { setActiveConv(existing); setShowNewChat(false); return; }

    const {data: conv} = await supabase.from("conversations").insert([{
      study_id: activeStudy?.study_id || "",
      name: targetUser.email,
      is_group: false,
      created_by: user.id,
    }]).select().single();

    if (conv) {
      await supabase.from("conversation_members").insert([
        {conversation_id: conv.id, user_id: user.id, email: user.email, full_name: ""},
        {conversation_id: conv.id, user_id: targetUser.user_id, email: targetUser.email, full_name: targetUser.full_name},
      ]);
      await loadConversations();
      setActiveConv(conv);
    }
    setShowNewChat(false);
  }

  async function createGroup() {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    const {data: conv} = await supabase.from("conversations").insert([{
      study_id: activeStudy?.study_id || "",
      name: groupName.trim(),
      is_group: true,
      created_by: user.id,
    }]).select().single();

    if (conv) {
      const members = [
        {conversation_id: conv.id, user_id: user.id, email: user.email, full_name: ""},
        ...selectedUsers.map(uid => {
          const u = allUsers.find((au:any) => au.user_id === uid);
          return {conversation_id: conv.id, user_id: uid, email: u?.email || "", full_name: u?.full_name || ""};
        })
      ];
      await supabase.from("conversation_members").insert(members);
      await loadConversations();
      setActiveConv(conv);
    }
    setShowNewGroup(false);
    setGroupName("");
    setSelectedUsers([]);
  }

  async function sendMessage() {
    if ((!newMessage.trim() && !selectedFile) || !activeConv) return;
    const senderName = allUsers.find((u:any) => u.user_id === user?.id)?.full_name || user?.email || "";

    let hasAttachment = false;
    let filePath = "";
    let fileName = "";

    if (selectedFile) {
      setUploading(true);
      const path = `messages/${activeConv.id}/${Date.now()}_${selectedFile.name}`;
      const {error} = await supabase.storage.from("Documents").upload(path, selectedFile);
      if (!error) { filePath = path; fileName = selectedFile.name; hasAttachment = true; }
      setUploading(false);
    }

    const {data: msg} = await supabase.from("messages").insert([{
      conversation_id: activeConv.id,
      sender_id: user.id,
      sender_email: user.email,
      sender_name: senderName,
      content: newMessage.trim(),
      has_attachment: hasAttachment,
    }]).select().single();

    if (msg && hasAttachment && filePath) {
      await supabase.from("message_attachments").insert([{
        message_id: msg.id,
        file_name: fileName,
        file_path: filePath,
        file_type: selectedFile?.type || "",
        file_size: selectedFile?.size || 0,
      }]);
    }

    await supabase.from("conversations").update({updated_at: new Date().toISOString()}).eq("id", activeConv.id);
    setNewMessage("");
    setSelectedFile(null);
    loadMessages(activeConv.id);
    loadConversations();
  }

  const getConvName = (conv: any) => {
    if (conv.is_group) return conv.name;
    const other = conv.name;
    const u = allUsers.find((u:any) => u.email === other);
    return u?.full_name || other;
  };

  const getInitials = (name: string) => name?.split(" ").map((n:string)=>n[0]).join("").toUpperCase().slice(0,2) || "?";

  return (
    <div style={{display:"flex",height:"calc(100vh - 120px)",background:P.bg,border:`0.5px solid ${P.border}`,borderRadius:"12px",overflow:"hidden"}}>
      {/* Sidebar */}
      <div style={{width:"260px",borderRight:`0.5px solid ${P.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"12px",borderBottom:`0.5px solid ${P.border}`,display:"flex",gap:"6px"}}>
          <button onClick={()=>setShowNewChat(true)} style={{flex:1,fontSize:"11px",padding:"6px",background:P.primaryLight,color:P.primary,border:`0.5px solid ${P.primary}`,borderRadius:"6px",cursor:"pointer"}}>+ Direct Message</button>
          <button onClick={()=>setShowNewGroup(true)} style={{flex:1,fontSize:"11px",padding:"6px",background:P.successLight,color:P.success,border:`0.5px solid ${P.success}`,borderRadius:"6px",cursor:"pointer"}}>+ Group</button>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {conversations.length===0?(
            <div style={{padding:"20px",textAlign:"center",color:P.textTert,fontSize:"11px"}}>No conversations yet</div>
          ):conversations.map(conv=>(
            <div key={conv.id} onClick={()=>setActiveConv(conv)}
              style={{padding:"10px 12px",cursor:"pointer",borderBottom:`0.5px solid ${P.bgTert}`,background:activeConv?.id===conv.id?P.primaryLight:"transparent",display:"flex",alignItems:"center",gap:"8px"}}>
              <div style={{width:"32px",height:"32px",borderRadius:"50%",background:conv.is_group?"#8B5CF6":P.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"500",color:"#fff",flexShrink:0}}>
                {conv.is_group?"#":getInitials(getConvName(conv))}
              </div>
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontSize:"12px",fontWeight:"500",color:P.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{getConvName(conv)}</div>
                <div style={{fontSize:"10px",color:P.textTert}}>{conv.is_group?"Group":"Direct message"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {!activeConv?(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"8px",color:P.textTert}}>
          <div style={{fontSize:"2rem"}}></div>
          <div style={{fontSize:"12px"}}>Select a conversation or start a new one</div>
        </div>
      ):(
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          {/* Header */}
          <div style={{padding:"10px 16px",borderBottom:`0.5px solid ${P.border}`,display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"32px",height:"32px",borderRadius:"50%",background:activeConv.is_group?"#8B5CF6":P.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"500",color:"#fff"}}>
              {activeConv.is_group?"#":getInitials(getConvName(activeConv))}
            </div>
            <div>
              <div style={{fontSize:"13px",fontWeight:"500",color:P.text}}>{getConvName(activeConv)}</div>
              <div style={{fontSize:"10px",color:P.textTert}}>{activeConv.is_group?"Group chat":"Direct message"} - {activeStudy?.study_id}</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:"8px"}}>
            {messages.map(msg=>{
              const isMe = msg.sender_id === user?.id;
              return(
                <div key={msg.id} style={{display:"flex",flexDirection:isMe?"row-reverse":"row",gap:"8px",alignItems:"flex-end"}}>
                  <div style={{width:"24px",height:"24px",borderRadius:"50%",background:isMe?P.primary:"#8B5CF6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",color:"#fff",flexShrink:0}}>
                    {getInitials(msg.sender_name||msg.sender_email)}
                  </div>
                  <div style={{maxWidth:"70%"}}>
                    {!isMe&&<div style={{fontSize:"9px",color:P.textTert,marginBottom:"2px"}}>{msg.sender_name||msg.sender_email}</div>}
                    {msg.content&&<div style={{background:isMe?P.primary:P.bgSec,color:isMe?"#fff":P.text,padding:"8px 12px",borderRadius:isMe?"12px 12px 2px 12px":"12px 12px 12px 2px",fontSize:"12px",lineHeight:"1.5"}}>{msg.content}</div>}
                    {msg.message_attachments?.map((att:any)=>(
                      <div key={att.id} style={{marginTop:"4px"}}>
                        <a href={supabase.storage.from("Documents").getPublicUrl(att.file_path).data.publicUrl} target="_blank" rel="noopener noreferrer"
                          style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 10px",background:isMe?"rgba(255,255,255,0.2)":P.bgTert,borderRadius:"8px",textDecoration:"none",color:isMe?"#fff":P.text,fontSize:"11px"}}>
                          Attachment: {att.file_name}
                        </a>
                      </div>
                    ))}
                    <div style={{fontSize:"9px",color:P.textTert,marginTop:"2px",textAlign:isMe?"right":"left"}}>{new Date(msg.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef}/>
          </div>

          {/* Input */}
          <div style={{padding:"10px 12px",borderTop:`0.5px solid ${P.border}`,display:"flex",gap:"8px",alignItems:"flex-end"}}>
            <input ref={fileInputRef} type="file" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)setSelectedFile(f);}}/>
            <button onClick={()=>fileInputRef.current?.click()} style={{padding:"8px",background:P.bgTert,border:`0.5px solid ${P.border}`,borderRadius:"8px",cursor:"pointer",fontSize:"14px"}}></button>
            <div style={{flex:1}}>
              {selectedFile&&<div style={{fontSize:"10px",color:P.primary,marginBottom:"4px",padding:"3px 8px",background:P.primaryLight,borderRadius:"4px",display:"flex",justifyContent:"space-between"}}>
                File: {selectedFile.name} <button onClick={()=>setSelectedFile(null)} style={{background:"none",border:"none",cursor:"pointer",color:P.danger,fontSize:"10px"}}></button>
              </div>}
              <input value={newMessage} onChange={e=>setNewMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()}
                placeholder="Type a message..." style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px"}}/>
            </div>
            <button onClick={sendMessage} disabled={uploading} style={{padding:"8px 16px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",opacity:uploading?0.6:1}}>
              {uploading?"...":"Send"}
            </button>
          </div>
        </div>
      )}

      {/* New DM Modal */}
      {showNewChat&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"380px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>New Direct Message</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"1rem",maxHeight:"300px",overflowY:"auto"}}>
              {allUsers.map((u:any)=>(
                <div key={u.user_id} onClick={()=>startDM(u)} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",borderRadius:"8px",border:`0.5px solid ${P.border}`,cursor:"pointer",background:P.bgSec}}>
                  <div style={{width:"32px",height:"32px",borderRadius:"50%",background:P.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",color:"#fff"}}>{getInitials(u.full_name||u.email)}</div>
                  <div><div style={{fontSize:"12px",fontWeight:"500"}}>{u.full_name||"-"}</div><div style={{fontSize:"10px",color:P.textSec}}>{u.email}</div></div>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowNewChat(false)} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {showNewGroup&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"400px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Create Group Chat</h2>
            <div style={{marginBottom:"10px"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Group Name</label>
              <input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="e.g. Site 002 Team" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/>
            </div>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"6px"}}>Select Members</label>
              <div style={{display:"flex",flexDirection:"column",gap:"4px",maxHeight:"200px",overflowY:"auto"}}>
                {allUsers.map((u:any)=>(
                  <div key={u.user_id} onClick={()=>setSelectedUsers(prev=>prev.includes(u.user_id)?prev.filter(id=>id!==u.user_id):[...prev,u.user_id])}
                    style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",borderRadius:"6px",border:`0.5px solid ${selectedUsers.includes(u.user_id)?P.primary:P.border}`,cursor:"pointer",background:selectedUsers.includes(u.user_id)?P.primaryLight:P.bgSec}}>
                    <div style={{width:"16px",height:"16px",borderRadius:"3px",border:`1.5px solid ${selectedUsers.includes(u.user_id)?P.primary:P.border}`,background:selectedUsers.includes(u.user_id)?P.primary:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:"#fff"}}>
                      {selectedUsers.includes(u.user_id)?"v":""}
                    </div>
                    <div style={{fontSize:"12px"}}>{u.full_name||u.email}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowNewGroup(false);setSelectedUsers([]);setGroupName("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={createGroup} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Create Group</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}








function TmfConfigPanel({user,P,supabase,activeStudy,orgId,currentUserRole,logAudit}:{user:any,P:any,supabase:any,activeStudy:any,orgId:string,currentUserRole:string,logAudit:any}){
  const[tab,setTab]=useState<"zones"|"artifacts"|"subartifacts">("zones");
  const[config,setConfig]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[showAddZone,setShowAddZone]=useState(false);
  const[showAddArtifact,setShowAddArtifact]=useState(false);
  const[showAddSub,setShowAddSub]=useState(false);
  const[showDisableModal,setShowDisableModal]=useState(false);
  const[showEditModal,setShowEditModal]=useState(false);
  const[disableTarget,setDisableTarget]=useState<any>(null);
  const[editTarget,setEditTarget]=useState<any>(null);
  const[editName,setEditName]=useState("");
  const[disableReason,setDisableReason]=useState("");
  const[msg,setMsg]=useState("");
  const[newZoneNum,setNewZoneNum]=useState("");
  const[newZoneName,setNewZoneName]=useState("");
  const[newArtNum,setNewArtNum]=useState("");
  const[newArtName,setNewArtName]=useState("");
  const[newArtZone,setNewArtZone]=useState("");
  const[newArtSection,setNewArtSection]=useState("");
  const[newArtCl,setNewArtCl]=useState("Core");
  const[newArtIso,setNewArtIso]=useState("");
  const[newSubNum,setNewSubNum]=useState("");
  const[newSubName,setNewSubName]=useState("");
  const[newSubParent,setNewSubParent]=useState("");
  const[newSubZone,setNewSubZone]=useState("");

  const isAdmin=currentUserRole==="System Administrator"||currentUserRole==="TMF Lead";

  useEffect(()=>{if(activeStudy&&orgId)loadConfig();},[activeStudy,orgId]);

  async function loadConfig(){
    setLoading(true);
    const{data}=await supabase.from("tmf_config").select("*").eq("org_id",orgId).eq("study_id",activeStudy.study_id).order("zone_num",{ascending:true});
    if(data)setConfig(data);
    setLoading(false);
  }

  async function seedIfEmpty(){
    const{data}=await supabase.from("tmf_config").select("id").eq("org_id",orgId).eq("study_id",activeStudy.study_id).limit(1);
    if(data&&data.length>0)return;

    const TMF_SEED=[
      {zone_num:"1",zone_name:"Trial Management",type:"zone"},
      {zone_num:"2",zone_name:"Central Trial Documents",type:"zone"},
      {zone_num:"3",zone_name:"Regulatory",type:"zone"},
      {zone_num:"4",zone_name:"IRB or IEC and other Approvals",type:"zone"},
      {zone_num:"5",zone_name:"Site Management",type:"zone"},
      {zone_num:"6",zone_name:"IP and Trial Supplies",type:"zone"},
      {zone_num:"7",zone_name:"Safety Reporting",type:"zone"},
      {zone_num:"8",zone_name:"Central and Local Testing",type:"zone"},
      {zone_num:"9",zone_name:"Third parties",type:"zone"},
      {zone_num:"10",zone_name:"Data Management",type:"zone"},
      {zone_num:"11",zone_name:"Statistics",type:"zone"},
      {zone_num:"1",artifact_num:"01.01.01",artifact_name:"Trial Master File Plan",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.02",artifact_name:"Trial Management Plan",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.03",artifact_name:"Quality Plan",section_num:"1.01",classification:"Recommended",iso_ref:"7.11 9.1 a",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.04",artifact_name:"List of SOPs Current During Trial",section_num:"1.01",classification:"Core",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.05",artifact_name:"Operational Procedure Manual",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.06",artifact_name:"Recruitment Plan",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.07",artifact_name:"Communication Plan",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.08",artifact_name:"Monitoring Plan",section_num:"1.01",classification:"Core",iso_ref:"6.7 7.3 9.2.4.1",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.09",artifact_name:"Medical Monitoring Plan",section_num:"1.01",classification:"Core",iso_ref:"6.11",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.10",artifact_name:"Publication Policy",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.11",artifact_name:"Debarment Statement",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.12",artifact_name:"Trial Status Report",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.13",artifact_name:"Investigator Newsletter",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.14",artifact_name:"Audit Certificate",section_num:"1.01",classification:"Core",iso_ref:"E3.4 7.11 e 9.1 D13 h",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.15",artifact_name:"Filenote Master List",section_num:"1.01",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.16",artifact_name:"Risk Management Plan",section_num:"1.01",classification:"Recommended",iso_ref:"6.2 5.6.2 c 5.6.2 d 7.8.1 9.2.3 h 9.2.6 c 7.5.1 7.10 Annex H",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.17",artifact_name:"Vendor Management Plan",section_num:"1.01",classification:"Recommended",iso_ref:"9.3",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.18",artifact_name:"Roles and Responsibility Matrix",section_num:"1.01",classification:"Core",iso_ref:"6.1 9.2.1a",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.19",artifact_name:"Transfer of Regulatory Obligations",section_num:"1.01",classification:"Core",iso_ref:"9.3",type:"artifact"},
      {zone_num:"1",artifact_num:"01.01.20",artifact_name:"Operational Oversight",section_num:"1.01",classification:"Core",type:"artifact"},
      {zone_num:"1",artifact_num:"01.02.01",artifact_name:"Trial Team Details",section_num:"1.02",classification:"Core",iso_ref:"E.1.28 E.2.26 6.1 9.2.1 a 9.2.1 g D.13e",type:"artifact"},
      {zone_num:"1",artifact_num:"01.02.02",artifact_name:"Trial Team Curriculum Vitae",section_num:"1.02",classification:"Core",iso_ref:"9.2.1g 6.1",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.01",artifact_name:"Committee Process",section_num:"1.03",classification:"Core",iso_ref:"6.11",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.02",artifact_name:"Committee Member List",section_num:"1.03",classification:"Core",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.03",artifact_name:"Committee Output",section_num:"1.03",classification:"Core",iso_ref:"6.11",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.04",artifact_name:"Committee Member Curriculum Vitae",section_num:"1.03",classification:"Core",iso_ref:"6.1 6.11",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.05",artifact_name:"Committee Member Financial Disclosure Form",section_num:"1.03",classification:"Core",iso_ref:"E.1.33 E.2.30 5.6.2 d 6.11 9.2.1 e 10.2 c",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.06",artifact_name:"Committee Member Contract",section_num:"1.03",classification:"Core",iso_ref:"6.9",type:"artifact"},
      {zone_num:"1",artifact_num:"01.03.07",artifact_name:"Committee Member Confidentiality Disclosure Agreement",section_num:"1.03",classification:"Core",iso_ref:"E.1.13 E.1.33 6.9 9. 2.1.a 9.2.1 d 10.2.c",type:"artifact"},
      {zone_num:"1",artifact_num:"01.04.01",artifact_name:"Kick-off Meeting Material",section_num:"1.04",classification:"Core",type:"artifact"},
      {zone_num:"1",artifact_num:"01.04.02",artifact_name:"Trial Team Training Material",section_num:"1.04",classification:"Core",iso_ref:"9.2.4.2 c 7.3 7.6",type:"artifact"},
      {zone_num:"1",artifact_num:"01.04.03",artifact_name:"Investigators Meeting Material",section_num:"1.04",classification:"Core",type:"artifact"},
      {zone_num:"1",artifact_num:"01.04.04",artifact_name:"Trial Team Evidence of Training",section_num:"1.04",classification:"Core",iso_ref:"9.2.1",type:"artifact"},
      {zone_num:"1",artifact_num:"01.05.01",artifact_name:"Relevant Communications",section_num:"1.05",classification:"Core",iso_ref:"E.2.11 9.2.3 b 9.2.4.5 o 10.6 h",type:"artifact"},
      {zone_num:"1",artifact_num:"01.05.02",artifact_name:"Tracking Information",section_num:"1.05",classification:"Recommended",type:"artifact"},
      {zone_num:"1",artifact_num:"01.05.03",artifact_name:"Other Meeting Material",section_num:"1.05",classification:"Core",type:"artifact"},
      {zone_num:"1",artifact_num:"01.05.04",artifact_name:"Filenote",section_num:"1.05",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.01",artifact_name:"Investigators Brochure",section_num:"2.01",classification:"Core",iso_ref:"E.1.1 E.2.1 6.5 7.5.1 Annex B 6.3",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.02",artifact_name:"Protocol",section_num:"2.01",classification:"Core",iso_ref:"E.1.2 4 5.6.2.a 5.6.4 6.3 6.4 7.1 7.5.1 10.6 b 10.6 f Annex A 7.1 7.8.2 Annex 1",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.03",artifact_name:"Protocol Synopsis",section_num:"2.01",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.04",artifact_name:"Protocol Amendment",section_num:"2.01",classification:"Core",iso_ref:"E2.2 7.51",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.05",artifact_name:"Financial Disclosure Summary",section_num:"2.01",classification:"Recommended",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.06",artifact_name:"Insurance",section_num:"2.01",classification:"Core",iso_ref:"E.1.25 5.3 5.6.2 j 9.2.2 e",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.07",artifact_name:"Sample Case Report Form",section_num:"2.01",classification:"Core",iso_ref:"E.1.25 E.1.26 E.1.27 6.6 7.4.2 7.4.3 Annex C",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.10",artifact_name:"Report of Prior Investigations",section_num:"2.01",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.01.11",artifact_name:"Marketed Product Material",section_num:"2.01",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.01",artifact_name:"Subject Diary",section_num:"2.02",classification:"Core",iso_ref:"Annex C.2.4.L",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.02",artifact_name:"Subject Questionnaire",section_num:"2.02",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.03",artifact_name:"Informed Consent Form",section_num:"2.02",classification:"Core",iso_ref:"E.1.18 E.2.3 E.2.13 5.2 5.3 5.6.2 c 5.6.2.d 5.8.1 5.8.4 7.8.1 7.5.1 8.6 9.2.2.b 9.2.4.5.f 10.5 10.7.a 10.7.c 10.7.d 10.7.e",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.04",artifact_name:"Subject Information Sheet",section_num:"2.02",classification:"Core",iso_ref:"E.1.18 5.6.2.c 5.6.2.d 5.8.4 7.8.1 9.2.2.b",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.05",artifact_name:"Subject Participation Card",section_num:"2.02",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.06",artifact_name:"Advertisements for Subject Recruitment",section_num:"2.02",classification:"Core",iso_ref:"E.1.18 5.6.2.c 5.6.2.d 5.8.4 7.8.1 9.2.2.b",type:"artifact"},
      {zone_num:"2",artifact_num:"02.02.07",artifact_name:"Other Information Given to Subjects",section_num:"2.02",classification:"Core",iso_ref:"E.1.18 5.6.2.c 5.6.2.d 5.8.4 7.8.1 9.2.2.b",type:"artifact"},
      {zone_num:"2",artifact_num:"02.03.01",artifact_name:"Clinical Study Report",section_num:"2.03",classification:"Core",iso_ref:"E.3.8 8.4 9.2.6 Annex D",type:"artifact"},
      {zone_num:"2",artifact_num:"02.03.02",artifact_name:"Bioanalytical Report",section_num:"2.03",classification:"Recommended",iso_ref:"8.6 9.2.2.b",type:"artifact"},
      {zone_num:"2",artifact_num:"02.04.01",artifact_name:"Relevant Communications",section_num:"2.04",classification:"Core",iso_ref:"E 2.11 9.2.3.c 9.2.4.5.o 10.6.h",type:"artifact"},
      {zone_num:"2",artifact_num:"02.04.02",artifact_name:"Tracking Information",section_num:"2.04",classification:"Recommended",type:"artifact"},
      {zone_num:"2",artifact_num:"02.04.03",artifact_name:"Meeting Material",section_num:"2.04",classification:"Core",type:"artifact"},
      {zone_num:"2",artifact_num:"02.04.04",artifact_name:"Filenote",section_num:"2.04",classification:"Core",type:"artifact"},
      {zone_num:"3",artifact_num:"03.01.01",artifact_name:"Regulatory Submission",section_num:"3.01",classification:"Recommended",iso_ref:"E 2.11 8.2.2 9.2.2 g, 9.2.2.I 9.4 a,b",type:"artifact"},
      {zone_num:"3",artifact_num:"03.01.02",artifact_name:"Regulatory Authority Decision",section_num:"3.01",classification:"Core",iso_ref:"E.1.11 E.2.5 7.1 9.2.2G 9.2.2.H",type:"artifact"},
      {zone_num:"3",artifact_num:"03.01.03",artifact_name:"Notification of Regulatory Identification Number",section_num:"3.01",classification:"Core",type:"artifact"},
      {zone_num:"3",artifact_num:"03.01.04",artifact_name:"Public Registration",section_num:"3.01",classification:"Core",iso_ref:"Annex G 6 h 5.4 9.2.2j Annex J F.2",type:"artifact"},
      {zone_num:"3",artifact_num:"03.02.01",artifact_name:"Import or Export License Application",section_num:"3.02",classification:"Core",type:"artifact"},
      {zone_num:"3",artifact_num:"03.02.02",artifact_name:"Import or Export Documentation",section_num:"3.02",classification:"Core",type:"artifact"},
      {zone_num:"3",artifact_num:"03.03.01",artifact_name:"Notification of Safety or Trial Information",section_num:"3.03",classification:"Core",iso_ref:"E.2.19 7.4 9.2.5.L 9.2.4.5.d 9.4 10.8 7.4.2",type:"artifact"},
      {zone_num:"3",artifact_num:"03.03.02",artifact_name:"Regulatory Progress Report",section_num:"3.03",classification:"Core",iso_ref:"9.2.3 h 9.2.6 d 9.4 c",type:"artifact"},
      {zone_num:"3",artifact_num:"03.03.03",artifact_name:"Regulatory Notification of Trial Termination",section_num:"3.03",classification:"Core",iso_ref:"E.3.7 8.3. 9.2.6.",type:"artifact"},
      {zone_num:"3",artifact_num:"03.04.01",artifact_name:"Relevant Communications",section_num:"3.04",classification:"Core",iso_ref:"E 2.11 9.2.3 b 9.2.4.5.o 9.4 10.6.",type:"artifact"},
      {zone_num:"3",artifact_num:"03.04.02",artifact_name:"Tracking Information",section_num:"3.04",classification:"Recommended",type:"artifact"},
      {zone_num:"3",artifact_num:"03.04.03",artifact_name:"Meeting Material",section_num:"3.04",classification:"Core",type:"artifact"},
      {zone_num:"3",artifact_num:"03.04.04",artifact_name:"Filenote",section_num:"3.04",classification:"Core",type:"artifact"},
      {zone_num:"4",artifact_num:"04.01.01",artifact_name:"IRB or IEC Submission",section_num:"4.01",classification:"Core",iso_ref:"E.1.9 5.6.3 7.1 9.2.2.h 10.4.C",type:"artifact"},
      {zone_num:"4",artifact_num:"04.01.02",artifact_name:"IRB or IEC Decision",section_num:"4.01",classification:"Core",iso_ref:"E.1.9 E 1.11 E.2.4 5.6.3 5.6.4.e 5.6.4.a 7.1 7.5.1. 9.2.2 h 9.2.3 b 9.2.4.5.o 10.4 c 9.2.4.5 o",type:"artifact"},
      {zone_num:"4",artifact_num:"04.01.03",artifact_name:"IRB or IEC Composition",section_num:"4.01",classification:"Core",iso_ref:"E.1.10 5.6.3",type:"artifact"},
      {zone_num:"4",artifact_num:"04.01.04",artifact_name:"IRB or IEC Documentation of Non-Voting Status",section_num:"4.01",classification:"Core",iso_ref:"E.1.10 5.6.3",type:"artifact"},
      {zone_num:"4",artifact_num:"04.01.05",artifact_name:"IRB or IEC Compliance Documentation",section_num:"4.01",classification:"Core",type:"artifact"},
      {zone_num:"4",artifact_num:"04.02.01",artifact_name:"Other Submissions",section_num:"4.02",classification:"Recommended",type:"artifact"},
      {zone_num:"4",artifact_num:"04.02.02",artifact_name:"Other Approvals",section_num:"4.02",classification:"Core",iso_ref:"10.4 e",type:"artifact"},
      {zone_num:"4",artifact_num:"04.03.01",artifact_name:"Notification to IRB or IEC of Safety Information",section_num:"4.03",classification:"Core",iso_ref:"E.2.20 5.6.4 9.2.5c 10.4 d 10.8 c 7.4.2",type:"artifact"},
      {zone_num:"4",artifact_num:"04.03.02",artifact_name:"IRB or IEC Progress Report",section_num:"4.03",classification:"Core",iso_ref:"E.2.22 5.6.4 9.2.3 h 9.2.4.5.O 10.4 10.8",type:"artifact"},
      {zone_num:"4",artifact_num:"04.03.03",artifact_name:"IRB or IEC Notification of Trial Termination",section_num:"4.03",classification:"Core",iso_ref:"E.3.6 5.6.4 8.3 b 9.2.6 d 10.4 f",type:"artifact"},
      {zone_num:"4",artifact_num:"04.04.01",artifact_name:"Relevant Communications",section_num:"4.04",classification:"Core",iso_ref:"E.2.11 9.2.3 b 10.4 a",type:"artifact"},
      {zone_num:"4",artifact_num:"04.04.02",artifact_name:"Tracking Information",section_num:"4.04",classification:"Recommended",type:"artifact"},
      {zone_num:"4",artifact_num:"04.04.03",artifact_name:"Meeting Material",section_num:"4.04",classification:"Core",type:"artifact"},
      {zone_num:"4",artifact_num:"04.04.04",artifact_name:"Filenote",section_num:"4.04",classification:"Core",type:"artifact"},
      {zone_num:"5",artifact_num:"05.01.01",artifact_name:"Site Contact Details",section_num:"5.01",classification:"Recommended",iso_ref:"E.1.8 A.1.4",type:"artifact"},
      {zone_num:"5",artifact_num:"05.01.02",artifact_name:"Confidentiality Agreement",section_num:"5.01",classification:"Core",iso_ref:"6.9",type:"artifact"},
      {zone_num:"5",artifact_num:"05.01.03",artifact_name:"Feasibility Documentation",section_num:"5.01",classification:"Recommended",iso_ref:"6.8 9.2.1 9.2.4",type:"artifact"},
      {zone_num:"5",artifact_num:"05.01.04",artifact_name:"Pre Trial Monitoring Report",section_num:"5.01",classification:"Core",iso_ref:"E.1.21 6.8 9.2.1 b, 9.2.1 e 9.2.4.3 9.2.4.7 10.3.a 10.6 m 10.6 n",type:"artifact"},
      {zone_num:"5",artifact_num:"05.01.05",artifact_name:"Sites Evaluated but not Selected",section_num:"5.01",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.01",artifact_name:"Acceptance of Investigator Brochure",section_num:"5.02",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.02",artifact_name:"Protocol Signature Page",section_num:"5.02",classification:"Core",iso_ref:"7.5.1 10.6 a Annex A",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.03",artifact_name:"Protocol Amendment Signature Page",section_num:"5.02",classification:"Core",iso_ref:"7.5.1 10.6.a Annex A",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.04",artifact_name:"Principal Investigator Curriculum Vitae",section_num:"5.02",classification:"Core",iso_ref:"E.1.4 E.2.6 5.6.2.e 9.2.1 10.2.a 10.2.b D.13.c",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.05",artifact_name:"Sub-Investigator Curriculum Vitae",section_num:"5.02",classification:"Core",iso_ref:"E.1.5 E.2.7 6.1 10.2.a",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.06",artifact_name:"Other Curriculum Vitae",section_num:"5.02",classification:"Core",iso_ref:"E.1.6 E.2.7 6.1 9.2.1 9.2.4.3 10.2.a",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.07",artifact_name:"Site Staff Qualification Supporting Information",section_num:"5.02",classification:"Recommended",iso_ref:"9.2.1 g 6.8",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.08",artifact_name:"Form FDA 1572",section_num:"5.02",classification:"Core",iso_ref:"E.1.12 10.3 b",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.09",artifact_name:"Investigator Regulatory Agreement",section_num:"5.02",classification:"Core",iso_ref:"E.1.12 6.9 9.2.1.a",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.10",artifact_name:"Financial Disclosure Form",section_num:"5.02",classification:"Core",iso_ref:"E.1.14 E.1.33 E.2.30 9.2.1 D 9.2.2 F 10.2 c",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.11",artifact_name:"Data Privacy Agreement",section_num:"5.02",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.12",artifact_name:"Clinical Trial Agreement",section_num:"5.02",classification:"Core",iso_ref:"E.1.12 E.1.14 6.9 9.2.1a 9.2.2.F 10.3 a",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.13",artifact_name:"Indemnity",section_num:"5.02",classification:"Core",iso_ref:"E 1.15 5.6.2 j 9.2.2 e",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.14",artifact_name:"Other Financial Agreement",section_num:"5.02",classification:"Core",iso_ref:"E.1.34 6.9 10.1",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.17",artifact_name:"IP Site Release Documentation",section_num:"5.02",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.18",artifact_name:"Site Signature Sheet",section_num:"5.02",classification:"Core",iso_ref:"E.1.7 E.2.12 7.2 9.2.1 e 9.2.2.d 9.2.4.4 b 9.2.4.5.b",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.19",artifact_name:"Investigators Agreement (Device)",section_num:"5.02",classification:"Core",iso_ref:"E1.12 6.9 9.2.1 a",type:"artifact"},
      {zone_num:"5",artifact_num:"05.02.20",artifact_name:"Coordinating Investigator Documentation",section_num:"5.02",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.03.01",artifact_name:"Trial Initiation Monitoring Report",section_num:"5.03",classification:"Core",iso_ref:"E.1.22 E.1.24 7.2 9.2.4.4 9.2.4.7",type:"artifact"},
      {zone_num:"5",artifact_num:"05.03.02",artifact_name:"Site Training Material",section_num:"5.03",classification:"Core",iso_ref:"10.2 b",type:"artifact"},
      {zone_num:"5",artifact_num:"05.03.03",artifact_name:"Site Evidence of Training",section_num:"5.03",classification:"Core",iso_ref:"E.1.29 9.2.1 h",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.01",artifact_name:"Subject Log",section_num:"5.04",classification:"Core",iso_ref:"E.2.23 7.5.2 7.10",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.02",artifact_name:"Source Data Verification",section_num:"5.04",classification:"Recommended",iso_ref:"E.1.23 E.2.15 7.5.3 9.2.4.5.g 10.6 c",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.03",artifact_name:"Monitoring Visit Report",section_num:"5.04",classification:"Core",iso_ref:"E.2.10 9.2.3 c 9.2.3 e 9.2.4.7",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.04",artifact_name:"Visit Log",section_num:"5.04",classification:"Core",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.05",artifact_name:"Additional Monitoring Activity",section_num:"5.04",classification:"Core",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.06",artifact_name:"Protocol Deviations",section_num:"5.04",classification:"Core",iso_ref:"10.4 e 10.6 g 10.6 o",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.07",artifact_name:"Financial Documentation",section_num:"5.04",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.08",artifact_name:"Final Trial Close Out Monitoring Report",section_num:"5.04",classification:"Core",iso_ref:"E.3.5 9.2.4.6 9.2.4.7",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.09",artifact_name:"Notification to Investigators of Safety Information",section_num:"5.04",classification:"Core",iso_ref:"E.2.21 9.2.5",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.10",artifact_name:"Subject Identification Log",section_num:"5.04",classification:"Core",iso_ref:"E.2.24 E.3.3 7.5.2",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.11",artifact_name:"Source Data",section_num:"5.04",classification:"Core",iso_ref:"E 2.13 E.2.14 7.5.3 7.8.2 10.6 c 10.6 q 10.7 f 7.8.1",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.12",artifact_name:"Monitoring Visit Follow-up Documentation",section_num:"5.04",classification:"Core",iso_ref:"E.1.24 E 2.10 9.2.3.c 9.2.3.e 9.2.4.7",type:"artifact"},
      {zone_num:"5",artifact_num:"05.04.13",artifact_name:"Subject Eligibility Verification Forms and Worksheets",section_num:"5.04",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.05.01",artifact_name:"Relevant Communications",section_num:"5.05",classification:"Core",iso_ref:"E.2.11 9.2.3 b 9.2.3.c 9.2.4.5.D 10.6 e 10.6 h",type:"artifact"},
      {zone_num:"5",artifact_num:"05.05.02",artifact_name:"Tracking Information",section_num:"5.05",classification:"Recommended",type:"artifact"},
      {zone_num:"5",artifact_num:"05.05.03",artifact_name:"Meeting Material",section_num:"5.05",classification:"Core",type:"artifact"},
      {zone_num:"5",artifact_num:"05.05.04",artifact_name:"Filenote",section_num:"5.05",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.01",artifact_name:"IP Supply Plan",section_num:"6.01",classification:"Recommended",iso_ref:"7.4.3 7.9",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.02",artifact_name:"IP Instructions for Handling",section_num:"6.01",classification:"Core",iso_ref:"10.2 b Annex B.2.F Annex I.7.C.3",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.03",artifact_name:"IP Sample Label",section_num:"6.01",classification:"Core",iso_ref:"E.1.3 6.10. Annex I.7 Annex B (B.2.g)",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.04",artifact_name:"IP Shipment Documentation",section_num:"6.01",classification:"Core",iso_ref:"E. 1.16 E. 2. 8 7.9 9.2.2 C 9.2.3 a 9.2.4.5 n 10.6 K",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.05",artifact_name:"IP Accountability Documentation",section_num:"6.01",classification:"Core",iso_ref:"E.1.16 E.2.8 E2.25 E.3.1 7.9 8.3 a 9.2.2 C 9.2.3 a 9.2.4.5.n 10.6 k 10.6 q Annex I.7.C.1",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.06",artifact_name:"IP Transfer Documentation",section_num:"6.01",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.07",artifact_name:"IP Re-labeling Documentation",section_num:"6.01",classification:"Core",iso_ref:"6.10 Annex I.7 C 2",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.08",artifact_name:"IP Recall Documentation",section_num:"6.01",classification:"Core",iso_ref:"9.2.2.D",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.09",artifact_name:"IP Quality Complaint Form",section_num:"6.01",classification:"Core",iso_ref:"7.4.3 9.1.a",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.10",artifact_name:"IP Return Documentation",section_num:"6.01",classification:"Core",iso_ref:"E.1.16 E.3.2 7.9 8.3 a 9.2.2.C 9.2.3 a 9.2.45.n 10.6 k 7.4.3",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.11",artifact_name:"IP Certificate of Destruction",section_num:"6.01",classification:"Core",iso_ref:"A.11, D.7 c, E.1.17 , 10.6.k, 10.6.l",type:"artifact"},
      {zone_num:"6",artifact_num:"06.01.12",artifact_name:"IP Retest and Expiry Documentation",section_num:"6.01",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.02.01",artifact_name:"QP (Qualified Person) Certification",section_num:"6.02",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.02.02",artifact_name:"IP Regulatory Release Documentation",section_num:"6.02",classification:"Core",iso_ref:"B.2.D",type:"artifact"},
      {zone_num:"6",artifact_num:"06.02.03",artifact_name:"IP Verification Statements",section_num:"6.02",classification:"Core",iso_ref:"B.2.D",type:"artifact"},
      {zone_num:"6",artifact_num:"06.02.04",artifact_name:"Certificate of Analysis",section_num:"6.02",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.03.01",artifact_name:"IP Treatment Allocation Documentation",section_num:"6.03",classification:"Core",iso_ref:"10.6 k A.6.1.B",type:"artifact"},
      {zone_num:"6",artifact_num:"06.03.02",artifact_name:"IP Unblinding Plan",section_num:"6.03",classification:"Core",iso_ref:"E.1.20 7.8.1 A 16 b 10.7.e",type:"artifact"},
      {zone_num:"6",artifact_num:"06.03.03",artifact_name:"IP Treatment Decoding Documentation",section_num:"6.03",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.04.01",artifact_name:"IP Storage Condition Documentation",section_num:"6.04",classification:"Core",iso_ref:"D.6.1.5",type:"artifact"},
      {zone_num:"6",artifact_num:"06.04.02",artifact_name:"IP Storage Condition Excursion Documentation",section_num:"6.04",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.04.03",artifact_name:"Maintenance Logs",section_num:"6.04",classification:"Core",iso_ref:"E.1.31 E.2.28 9.2.4.5.p, 10.6 i",type:"artifact"},
      {zone_num:"6",artifact_num:"06.05.01",artifact_name:"Non-IP Supply Plan",section_num:"6.05",classification:"Recommended",type:"artifact"},
      {zone_num:"6",artifact_num:"06.05.02",artifact_name:"Non-IP Shipment Documentation",section_num:"6.05",classification:"Recommended",iso_ref:"E.1.17 E.2.9 9.2.2.a 9.2.2.d 9.2.4.4.a 9.2.4.4.d",type:"artifact"},
      {zone_num:"6",artifact_num:"06.05.03",artifact_name:"Non-IP Return Documentation",section_num:"6.05",classification:"Recommended",iso_ref:"E.1.17 E.2.9 9.2.2.a 9.2.2.d 9.2.4.4.a 9.2.4.4.d",type:"artifact"},
      {zone_num:"6",artifact_num:"06.05.04",artifact_name:"Non-IP Storage Documentation",section_num:"6.05",classification:"Recommended",type:"artifact"},
      {zone_num:"6",artifact_num:"06.06.01",artifact_name:"IRT User Requirement Specification",section_num:"6.06",classification:"Core",iso_ref:"A.8.B 7.8.3",type:"artifact"},
      {zone_num:"6",artifact_num:"06.06.02",artifact_name:"IRT Validation Certification",section_num:"6.06",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.06.03",artifact_name:"IRT User Acceptance Testing (UAT) Certification",section_num:"6.06",classification:"Core",iso_ref:"B.3.E",type:"artifact"},
      {zone_num:"6",artifact_num:"06.06.04",artifact_name:"IRT User Manual",section_num:"6.06",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.06.05",artifact_name:"IRT User Account Management",section_num:"6.06",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.07.01",artifact_name:"Relevant Communications",section_num:"6.07",classification:"Core",iso_ref:"E 2.11 9.2.3 c 9.2.4.5 o 10.6 h",type:"artifact"},
      {zone_num:"6",artifact_num:"06.07.02",artifact_name:"Tracking Information",section_num:"6.07",classification:"Recommended",type:"artifact"},
      {zone_num:"6",artifact_num:"06.07.03",artifact_name:"Meeting Material",section_num:"6.07",classification:"Core",type:"artifact"},
      {zone_num:"6",artifact_num:"06.07.04",artifact_name:"Filenote",section_num:"6.07",classification:"Core",type:"artifact"},
      {zone_num:"7",artifact_num:"07.01.01",artifact_name:"Safety Management Plan",section_num:"7.01",classification:"Core",iso_ref:"10.8 a 7.4.1",type:"artifact"},
      {zone_num:"7",artifact_num:"07.01.02",artifact_name:"Pharmacovigilance Database Line Listing",section_num:"7.01",classification:"Core",iso_ref:"7.4.2",type:"artifact"},
      {zone_num:"7",artifact_num:"07.02.01",artifact_name:"Expedited Safety Report",section_num:"7.02",classification:"Core",iso_ref:"10.8 b 7.4",type:"artifact"},
      {zone_num:"7",artifact_num:"07.02.02",artifact_name:"SAE Report",section_num:"7.02",classification:"Core",iso_ref:"E.2.17 7.4 9.2.4.5.k 9.2.4.5.L 9.2.5 10.8 D 13 g",type:"artifact"},
      {zone_num:"7",artifact_num:"07.02.03",artifact_name:"Pregnancy Report",section_num:"7.02",classification:"Core",type:"artifact"},
      {zone_num:"7",artifact_num:"07.02.04",artifact_name:"Special Events of Interest",section_num:"7.02",classification:"Core",type:"artifact"},
      {zone_num:"7",artifact_num:"07.03.01",artifact_name:"Relevant Communications",section_num:"7.03",classification:"Core",iso_ref:"E 2.11 9.2.3 c 9.2.4.5 O 10.6 h",type:"artifact"},
      {zone_num:"7",artifact_num:"07.03.02",artifact_name:"Tracking Information",section_num:"7.03",classification:"Recommended",type:"artifact"},
      {zone_num:"7",artifact_num:"07.03.03",artifact_name:"Meeting Material",section_num:"7.03",classification:"Core",type:"artifact"},
      {zone_num:"7",artifact_num:"07.03.04",artifact_name:"Filenote",section_num:"7.03",classification:"Core",iso_ref:"10.8 e",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.01",artifact_name:"Certification or Accreditation",section_num:"8.01",classification:"Core",iso_ref:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.02",artifact_name:"Laboratory Validation Documentation",section_num:"8.01",classification:"Core",iso_ref:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.03",artifact_name:"Laboratory Results Documentation",section_num:"8.01",classification:"Core",iso_ref:"E.2.29",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.04",artifact_name:"Normal Ranges",section_num:"8.01",classification:"Core",iso_ref:"E.1.30 E.2.27 9.2.4.5.q",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.05",artifact_name:"Manual",section_num:"8.01",classification:"Recommended",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.06",artifact_name:"Supply Import Documentation",section_num:"8.01",classification:"Core",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.07",artifact_name:"Head of Facility Curriculum Vitae",section_num:"8.01",classification:"Recommended",iso_ref:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t",type:"artifact"},
      {zone_num:"8",artifact_num:"08.01.08",artifact_name:"Standardization Methods",section_num:"8.01",classification:"Core",type:"artifact"},
      {zone_num:"8",artifact_num:"08.02.01",artifact_name:"Specimen Label",section_num:"8.02",classification:"Recommended",type:"artifact"},
      {zone_num:"8",artifact_num:"08.02.02",artifact_name:"Shipment Records",section_num:"8.02",classification:"Recommended",type:"artifact"},
      {zone_num:"8",artifact_num:"08.02.03",artifact_name:"Sample Storage Condition Log",section_num:"8.02",classification:"Recommended",type:"artifact"},
      {zone_num:"8",artifact_num:"08.02.04",artifact_name:"Sample Import or Export Documentation",section_num:"8.02",classification:"Core",type:"artifact"},
      {zone_num:"8",artifact_num:"08.02.05",artifact_name:"Record of Retained Samples",section_num:"8.02",classification:"Core",type:"artifact"},
      {zone_num:"8",artifact_num:"08.03.01",artifact_name:"Relevant Communications",section_num:"8.03",classification:"Core",iso_ref:"E 2.11 9.2.3 c 9.2.4.5 o 10.6 h",type:"artifact"},
      {zone_num:"8",artifact_num:"08.03.02",artifact_name:"Tracking Information",section_num:"8.03",classification:"Recommended",type:"artifact"},
      {zone_num:"8",artifact_num:"08.03.03",artifact_name:"Meeting Material",section_num:"8.03",classification:"Core",type:"artifact"},
      {zone_num:"8",artifact_num:"08.03.04",artifact_name:"Filenote",section_num:"8.03",classification:"Core",type:"artifact"},
      {zone_num:"9",artifact_num:"09.01.01",artifact_name:"Qualification and Compliance",section_num:"9.01",classification:"Core",iso_ref:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t",type:"artifact"},
      {zone_num:"9",artifact_num:"09.01.02",artifact_name:"Third Party Curriculum Vitae",section_num:"9.01",classification:"Core",iso_ref:"E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t",type:"artifact"},
      {zone_num:"9",artifact_num:"09.01.03",artifact_name:"Ongoing Third Party Oversight",section_num:"9.01",classification:"Recommended",iso_ref:"J.2.f.15",type:"artifact"},
      {zone_num:"9",artifact_num:"09.02.01",artifact_name:"Confidentiality Agreement",section_num:"9.02",classification:"Core",iso_ref:"E.1.13 6.9 9.2.1.a",type:"artifact"},
      {zone_num:"9",artifact_num:"09.02.02",artifact_name:"Vendor Selection",section_num:"9.02",classification:"Recommended",type:"artifact"},
      {zone_num:"9",artifact_num:"09.02.03",artifact_name:"Contractual Agreement",section_num:"9.02",classification:"Core",iso_ref:"E.1.13 6.9 9.2.1.a",type:"artifact"},
      {zone_num:"9",artifact_num:"09.03.01",artifact_name:"Relevant Communications",section_num:"9.03",classification:"Core",iso_ref:"E 2.11 9.2.3 c 9.2.4.5 o 10.6.h",type:"artifact"},
      {zone_num:"9",artifact_num:"09.03.02",artifact_name:"Tracking Information",section_num:"9.03",classification:"Recommended",type:"artifact"},
      {zone_num:"9",artifact_num:"09.03.03",artifact_name:"Meeting Material",section_num:"9.03",classification:"Core",iso_ref:"9.2.4.2.c",type:"artifact"},
      {zone_num:"9",artifact_num:"09.03.04",artifact_name:"Filenote",section_num:"9.03",classification:"Core",type:"artifact"},
      {zone_num:"10",artifact_num:"10.01.01",artifact_name:"Data Management Plan",section_num:"10.01",classification:"Recommended",iso_ref:"6.6 7.8.3.a",type:"artifact"},
      {zone_num:"10",artifact_num:"10.02.01",artifact_name:"CRF Completion Requirements",section_num:"10.02",classification:"Core",iso_ref:"7.8.2",type:"artifact"},
      {zone_num:"10",artifact_num:"10.02.02",artifact_name:"Annotated CRF",section_num:"10.02",classification:"Recommended",iso_ref:"7.8.1 7.8.2 10.6 j",type:"artifact"},
      {zone_num:"10",artifact_num:"10.02.04",artifact_name:"Documentation of Corrections to Entered Data",section_num:"10.02",classification:"Core",iso_ref:"E.2.18 7.8.2 a 9.2.4.5 j 10.6 j",type:"artifact"},
      {zone_num:"10",artifact_num:"10.02.05",artifact_name:"Final Subject Data",section_num:"10.02",classification:"Core",iso_ref:"E.2.16 7.3 7.8.1 7.8.2 9.2.4.5.j) 10.6 j",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.01",artifact_name:"Database Requirements",section_num:"10.03",classification:"Core",iso_ref:"7.8.3",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.02",artifact_name:"Edit Check Plan",section_num:"10.03",classification:"Core",iso_ref:"7.8.3d",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.03",artifact_name:"Edit Check Programming",section_num:"10.03",classification:"Core",iso_ref:"7.8.3 a",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.04",artifact_name:"Edit Check Testing",section_num:"10.03",classification:"Core",iso_ref:"7.8.3 f",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.05",artifact_name:"Approval for Database Activation",section_num:"10.03",classification:"Core",iso_ref:"A.8 B 7.8.3",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.06",artifact_name:"External Data Transfer Specifications",section_num:"10.03",classification:"Core",iso_ref:"A.8 B 3.13",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.07",artifact_name:"Data Entry Guidelines (Paper)",section_num:"10.03",classification:"Core",iso_ref:"7.8.2",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.08",artifact_name:"SAE Reconciliation",section_num:"10.03",classification:"Core",iso_ref:"9.2.5 7.8.3",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.09",artifact_name:"Dictionary Coding",section_num:"10.03",classification:"Core",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.10",artifact_name:"Data Review Documentation",section_num:"10.03",classification:"Core",iso_ref:"7.8.3.d",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.11",artifact_name:"Database Lock and Unlock Approval",section_num:"10.03",classification:"Core",iso_ref:"7.8.3.a",type:"artifact"},
      {zone_num:"10",artifact_num:"10.03.12",artifact_name:"Database Change Control",section_num:"10.03",classification:"Core",iso_ref:"7.8.3.a",type:"artifact"},
      {zone_num:"10",artifact_num:"10.04.01",artifact_name:"System Account Management",section_num:"10.04",classification:"Core",iso_ref:"7.8.3. h",type:"artifact"},
      {zone_num:"10",artifact_num:"10.04.02",artifact_name:"Technical Design Document",section_num:"10.04",classification:"Core",iso_ref:"7.8.3.b",type:"artifact"},
      {zone_num:"10",artifact_num:"10.04.03",artifact_name:"Validation Documentation",section_num:"10.04",classification:"Core",iso_ref:"7.8.3.c",type:"artifact"},
      {zone_num:"10",artifact_num:"10.05.01",artifact_name:"Relevant Communications",section_num:"10.05",classification:"Core",iso_ref:"E 2.11 9.2.3 c 9.2.4.5 o 10.6.h",type:"artifact"},
      {zone_num:"10",artifact_num:"10.05.02",artifact_name:"Tracking Information",section_num:"10.05",classification:"Recommended",type:"artifact"},
      {zone_num:"10",artifact_num:"10.05.03",artifact_name:"Meeting Material",section_num:"10.05",classification:"Core",type:"artifact"},
      {zone_num:"10",artifact_num:"10.05.04",artifact_name:"Filenote",section_num:"10.05",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.01.01",artifact_name:"Statistical Analysis Plan",section_num:"11.01",classification:"Core",iso_ref:"6.6",type:"artifact"},
      {zone_num:"11",artifact_num:"11.01.02",artifact_name:"Sample Size Calculation",section_num:"11.01",classification:"Core",iso_ref:"3.25 A7e A7e6 6.2.2 E.2",type:"artifact"},
      {zone_num:"11",artifact_num:"11.02.01",artifact_name:"Randomization Plan",section_num:"11.02",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.02.02",artifact_name:"Randomization Procedure",section_num:"11.02",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.02.03",artifact_name:"Master Randomization List",section_num:"11.02",classification:"Core",iso_ref:"E.1.19 7.8.1",type:"artifact"},
      {zone_num:"11",artifact_num:"11.02.04",artifact_name:"Randomization Programming",section_num:"11.02",classification:"Core",iso_ref:"A.7.E 7.8.3",type:"artifact"},
      {zone_num:"11",artifact_num:"11.02.05",artifact_name:"Randomization Sign Off",section_num:"11.02",classification:"Core",iso_ref:"A.7.E 7.8.3.",type:"artifact"},
      {zone_num:"11",artifact_num:"11.02.06",artifact_name:"End of Trial or Interim Unblinding",section_num:"11.02",classification:"Core",iso_ref:"7.8.1 10.7.e",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.01",artifact_name:"Data Definitions for Analysis Datasets",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.02",artifact_name:"Analysis QC Documentation",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.03",artifact_name:"Interim Analysis Raw Datasets",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.04",artifact_name:"Interim Analysis Programs",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.05",artifact_name:"Interim Analysis Datasets",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.06",artifact_name:"Interim Analysis Output",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.07",artifact_name:"Final Analysis Raw Datasets",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.08",artifact_name:"Final Analysis Programs",section_num:"11.03",classification:"Core",iso_ref:"D.6.I.",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.09",artifact_name:"Final Analysis Datasets",section_num:"11.03",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.10",artifact_name:"Final Analysis Output",section_num:"11.03",classification:"Core",iso_ref:"8.4",type:"artifact"},
      {zone_num:"11",artifact_num:"11.03.11",artifact_name:"Subject Evaluability Criteria and Subject Classification",section_num:"11.03",classification:"Core",iso_ref:"A.6.3",type:"artifact"},
      {zone_num:"11",artifact_num:"11.04.01",artifact_name:"Interim Statistical Report(s)",section_num:"11.04",classification:"Core",iso_ref:"E.3.8 8.3 9.2.6 b Annex D",type:"artifact"},
      {zone_num:"11",artifact_num:"11.04.02",artifact_name:"Statistical Report",section_num:"11.04",classification:"Core",iso_ref:"E.3.8 8.3 9.2.6 b Annex D",type:"artifact"},
      {zone_num:"11",artifact_num:"11.05.01",artifact_name:"Relevant Communications",section_num:"11.05",classification:"Core",iso_ref:"E2.11 9.2.3 c 9.2.4.5 o 10.6.h",type:"artifact"},
      {zone_num:"11",artifact_num:"11.05.02",artifact_name:"Tracking Information",section_num:"11.05",classification:"Recommended",type:"artifact"},
      {zone_num:"11",artifact_num:"11.05.03",artifact_name:"Meeting Material",section_num:"11.05",classification:"Core",type:"artifact"},
      {zone_num:"11",artifact_num:"11.05.04",artifact_name:"Filenote",section_num:"11.05",classification:"Core",type:"artifact"},
    ].map(r=>({...r,org_id:orgId,study_id:activeStudy.study_id,is_enabled:true,is_locked:false,is_custom:false,created_by:user.email}));
    await supabase.from("tmf_config").insert(TMF_SEED);
    await loadConfig();
  }

  useEffect(()=>{if(activeStudy&&orgId&&!loading&&config.length===0)seedIfEmpty();},[loading]);

  async function toggleEnabled(item:any){
    if(!item.is_enabled){
      const{error}=await supabase.from("tmf_config").update({is_enabled:true,disabled_reason:null,disabled_by:null,disabled_at:null}).eq("id",item.id);
      if(!error){if(item.type==="zone"){supabase.from("tmf_config").update({is_enabled:true,disabled_reason:null,disabled_by:null,disabled_at:null}).eq("org_id",orgId).eq("study_id",activeStudy.study_id).eq("zone_num",item.zone_num).eq("type","artifact").then(()=>{});}await logAudit("TMF config enabled",undefined,activeStudy.study_id,"is_enabled","false","true");loadConfig();}
    }else{
      setDisableTarget(item);setDisableReason("");setShowDisableModal(true);
    }
  }

  async function submitDisable(){
    if(!disableReason.trim()){setMsg("Reason is required.");return;}
    const now=new Date().toISOString();
    const{error}=await supabase.from("tmf_config").update({is_enabled:false,disabled_reason:disableReason.trim(),disabled_by:user.email,disabled_at:now}).eq("id",disableTarget.id);
    if(!error){
      await logAudit("TMF config disabled",undefined,activeStudy.study_id,"is_enabled","true","false",disableReason.trim());
      if(disableTarget.type==="zone"){supabase.from("tmf_config").update({is_enabled:false,disabled_reason:"Parent zone disabled",disabled_by:user.email,disabled_at:now}).eq("org_id",orgId).eq("study_id",activeStudy.study_id).eq("zone_num",disableTarget.zone_num).eq("type","artifact").then(()=>{});}
setShowDisableModal(false);setDisableTarget(null);setDisableReason("");loadConfig();
    }
  }

  async function toggleLock(item:any){
    const{error}=await supabase.from("tmf_config").update({is_locked:!item.is_locked}).eq("id",item.id);
    if(!error){await logAudit(item.is_locked?"TMF artifact unlocked":"TMF artifact locked",undefined,activeStudy.study_id,"is_locked",String(item.is_locked),String(!item.is_locked));loadConfig();}
  }

  async function saveEdit(){
    if(!editName.trim()||!editTarget)return;
    const field=editTarget.type==="zone"?"zone_name":"artifact_name";
    const{error}=await supabase.from("tmf_config").update({[field]:editName.trim()}).eq("id",editTarget.id);
    if(!error){
      await logAudit("TMF config name edited",undefined,activeStudy.study_id,field,editTarget[field]||"",editName.trim());
      setShowEditModal(false);setEditTarget(null);setEditName("");loadConfig();setMsg("Name updated.");
    }
  }

  async function addZone(){
    if(!newZoneNum.trim()||!newZoneName.trim())return;
    const{error}=await supabase.from("tmf_config").insert([{org_id:orgId,study_id:activeStudy.study_id,type:"zone",zone_num:newZoneNum.trim(),zone_name:newZoneName.trim(),is_enabled:true,is_locked:false,is_custom:true,created_by:user.email}]);
    if(!error){await logAudit("Custom zone added",undefined,activeStudy.study_id,"zone_num","",newZoneNum.trim());setShowAddZone(false);setNewZoneNum("");setNewZoneName("");loadConfig();setMsg("Zone added.");}
  }

  async function addArtifact(){
    if(!newArtNum.trim()||!newArtName.trim()||!newArtZone.trim())return;
    const{error}=await supabase.from("tmf_config").insert([{org_id:orgId,study_id:activeStudy.study_id,type:"artifact",zone_num:newArtZone.trim(),section_num:newArtSection.trim(),artifact_num:newArtNum.trim(),artifact_name:newArtName.trim(),classification:newArtCl,iso_ref:newArtIso.trim(),is_enabled:true,is_locked:false,is_custom:true,created_by:user.email}]);
    if(!error){await logAudit("Custom artifact added",undefined,activeStudy.study_id,"artifact_num","",newArtNum.trim());setShowAddArtifact(false);setNewArtNum("");setNewArtName("");setNewArtZone("");setNewArtSection("");setNewArtIso("");loadConfig();setMsg("Artifact added.");}
  }

  async function addSubArtifact(){
    if(!newSubNum.trim()||!newSubName.trim()||!newSubParent.trim())return;
    const{error}=await supabase.from("tmf_config").insert([{org_id:orgId,study_id:activeStudy.study_id,type:"sub_artifact",zone_num:newSubZone.trim(),artifact_num:newSubNum.trim(),artifact_name:newSubName.trim(),parent_artifact_num:newSubParent.trim(),classification:"Core",is_enabled:true,is_locked:false,is_custom:true,created_by:user.email}]);
    if(!error){await logAudit("Custom sub-artifact added",undefined,activeStudy.study_id,"artifact_num","",newSubNum.trim());setShowAddSub(false);setNewSubNum("");setNewSubName("");setNewSubParent("");setNewSubZone("");loadConfig();setMsg("Sub-artifact added.");}
  }

  async function resetToDefault(){
    if(!confirm("This will delete all custom config and reset to DIA standard. Continue?"))return;
    await supabase.from("tmf_config").delete().eq("org_id",orgId).eq("study_id",activeStudy.study_id);
    await logAudit("TMF config reset to DIA standard",undefined,activeStudy.study_id,"config","custom","default");
    await seedIfEmpty();
    setMsg("Reset to DIA TMF Reference Model v3.3.1.");
  }

  const zones=config.filter(c=>c.type==="zone").sort((a,b)=>parseFloat(a.zone_num)-parseFloat(b.zone_num));
  const artifacts=config.filter(c=>c.type==="artifact").sort((a,b)=>a.artifact_num?.localeCompare(b.artifact_num));
  const subartifacts=config.filter(c=>c.type==="sub_artifact").sort((a,b)=>a.artifact_num?.localeCompare(b.artifact_num));

  const clBadge=(cl:string)=>{
    const c:Record<string,any>={Core:{bg:"#FEF2F2",color:"#991B1B"},Recommended:{bg:"#FFFBEB",color:"#92400E"},Optional:{bg:"#F0FDF4",color:"#065F46"}};
    const s=c[cl]||c.Core;
    return<span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:s.bg,color:s.color,fontWeight:"500"}}>{cl}</span>;
  };

  if(!activeStudy)return<div style={{fontSize:"12px",color:P.textTert}}>Select a study first.</div>;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h1 style={{fontSize:"14px",fontWeight:"500"}}>TMF Configuration - {activeStudy.study_id}</h1>
          <p style={{fontSize:"11px",color:P.textTert,marginTop:"2px"}}>Manage zones, artifacts, and sub-artifacts for this study. Changes are scoped to this study only.</p>
        </div>
        {isAdmin&&<button onClick={resetToDefault} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:P.bg,cursor:"pointer",color:P.textSec}}>Reset to DIA standard</button>}
      </div>

      {msg&&<div style={{padding:"8px 12px",borderRadius:"8px",fontSize:"12px",background:P.successLight,color:P.success}}>{msg}</div>}

      <div style={{background:"#EFF6FF",border:"0.5px solid #BFDBFE",borderRadius:"10px",padding:"10px 14px",fontSize:"11px",color:"#1E40AF"}}>
        DIA TMF Reference Model v3.3.1 - Disabled zones count as 100% complete. All changes are logged to the audit trail.
      </div>

      <div style={{display:"flex",gap:"6px",borderBottom:`0.5px solid ${P.border}`}}>
        {(["zones","artifacts","subartifacts"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{fontSize:"12px",padding:"8px 16px",border:"none",borderBottom:tab===t?`2px solid ${P.primary}`:"2px solid transparent",background:"transparent",color:tab===t?P.primary:P.textSec,cursor:"pointer",fontWeight:tab===t?"500":"400"}}>
            {t==="zones"?"Zones":t==="artifacts"?"Artifacts":"Sub-artifacts"}
            <span style={{marginLeft:"6px",fontSize:"10px",padding:"1px 6px",borderRadius:"20px",background:P.bgTert,color:P.textTert}}>
              {t==="zones"?zones.length:t==="artifacts"?artifacts.length:subartifacts.length}
            </span>
          </button>
        ))}
      </div>

      {tab==="zones"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {isAdmin&&<button onClick={()=>setShowAddZone(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",alignSelf:"flex-start"}}>+ Add zone</button>}
          {loading?<div style={{fontSize:"12px",color:P.textTert}}>Loading...</div>:zones.map(z=>(
            <div key={z.id} style={{background:P.bg,border:`0.5px solid ${z.is_enabled?P.border:"#FCA5A5"}`,borderRadius:"12px",padding:"14px",display:"flex",alignItems:"flex-start",gap:"12px"}}>
              <div style={{width:"32px",height:"32px",borderRadius:"8px",background:z.is_enabled?P.primaryLight:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:"600",color:z.is_enabled?P.primary:"#EF4444",flexShrink:0}}>{z.zone_num}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                  <span style={{fontSize:"13px",fontWeight:"500",color:P.text}}>{z.zone_name}</span>
                  {z.is_custom&&<span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:"#F0FDF4",color:"#065F46",fontWeight:"500"}}>Custom</span>}
                  <span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:z.is_enabled?"#ECFDF5":"#FEF2F2",color:z.is_enabled?"#065F46":"#991B1B",fontWeight:"500"}}>{z.is_enabled?"Enabled":"Disabled"}</span>
                </div>
                {!z.is_enabled&&z.disabled_reason&&(
                  <div style={{fontSize:"11px",color:"#991B1B",background:"#FEF2F2",borderRadius:"6px",padding:"6px 10px",marginTop:"4px"}}>
                    Disabled: {z.disabled_reason} <span style={{color:P.textTert}}>by {z.disabled_by}</span>
                  </div>
                )}
              </div>
              {isAdmin&&(
                <div style={{display:"flex",gap:"6px",flexShrink:0}}>
                  <button onClick={()=>{setEditTarget(z);setEditName(z.zone_name||"");setShowEditModal(true);}} style={{fontSize:"11px",padding:"5px 12px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bgTert,color:P.textSec,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>toggleEnabled(z)} style={{fontSize:"11px",padding:"5px 12px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:z.is_enabled?"#FEF2F2":"#ECFDF5",color:z.is_enabled?"#991B1B":"#065F46",cursor:"pointer"}}>{z.is_enabled?"Disable":"Enable"}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab==="artifacts"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {isAdmin&&<button onClick={()=>setShowAddArtifact(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",alignSelf:"flex-start"}}>+ Add artifact</button>}
          {loading?<div style={{fontSize:"12px",color:P.textTert}}>Loading...</div>:artifacts.map(a=>(
            <div key={a.id} style={{background:P.bg,border:`0.5px solid ${a.is_enabled?P.border:"#FCA5A5"}`,borderRadius:"10px",padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:"10px"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px",flexWrap:"wrap" as const}}>
                  <span style={{fontFamily:"monospace",fontSize:"10px",color:P.textTert}}>{a.artifact_num}</span>
                  <span style={{fontSize:"12px",fontWeight:"500",color:P.text}}>{a.artifact_name}</span>
                  {clBadge(a.classification||"Core")}
                  {a.is_custom&&<span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:"#F0FDF4",color:"#065F46",fontWeight:"500"}}>Custom</span>}
                  {a.is_locked&&<span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:"#F3F4F6",color:"#374151",fontWeight:"500"}}>Locked</span>}
                  <span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:a.is_enabled?"#ECFDF5":"#FEF2F2",color:a.is_enabled?"#065F46":"#991B1B",fontWeight:"500"}}>{a.is_enabled?"Enabled":"Disabled"}</span>
                </div>
                <div style={{fontSize:"10px",color:P.textTert}}>Zone {a.zone_num}{a.section_num?` - Section ${a.section_num}`:""}{a.iso_ref?` - ISO: ${a.iso_ref}`:""}</div>
                {!a.is_enabled&&a.disabled_reason&&(
                  <div style={{fontSize:"11px",color:"#991B1B",background:"#FEF2F2",borderRadius:"6px",padding:"5px 9px",marginTop:"4px"}}>
                    Disabled: {a.disabled_reason} <span style={{color:P.textTert}}>by {a.disabled_by}</span>
                  </div>
                )}
              </div>
              {isAdmin&&(
                <div style={{display:"flex",gap:"6px",flexShrink:0}}>
                  <button onClick={()=>{setEditTarget(a);setEditName(a.artifact_name||"");setShowEditModal(true);}} style={{fontSize:"10px",padding:"4px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bgTert,color:P.textSec,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>toggleLock(a)} style={{fontSize:"10px",padding:"4px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:a.is_locked?"#FFFBEB":"#F9FAFB",color:a.is_locked?"#92400E":P.textSec,cursor:"pointer"}}>{a.is_locked?"Unlock":"Lock"}</button>
                  <button onClick={()=>toggleEnabled(a)} style={{fontSize:"10px",padding:"4px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:a.is_enabled?"#FEF2F2":"#ECFDF5",color:a.is_enabled?"#991B1B":"#065F46",cursor:"pointer"}}>{a.is_enabled?"Disable":"Enable"}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab==="subartifacts"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {isAdmin&&<button onClick={()=>setShowAddSub(true)} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",alignSelf:"flex-start"}}>+ Add sub-artifact</button>}
          {loading?<div style={{fontSize:"12px",color:P.textTert}}>Loading...</div>:subartifacts.length===0?(
            <div style={{textAlign:"center",padding:"2rem",color:P.textTert,fontSize:"12px"}}>No sub-artifacts yet. Add one to get started.</div>
          ):subartifacts.map(s=>(
            <div key={s.id} style={{background:P.bg,border:`0.5px solid ${s.is_enabled?P.border:"#FCA5A5"}`,borderRadius:"10px",padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:"10px"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px",flexWrap:"wrap" as const}}>
                  <span style={{fontFamily:"monospace",fontSize:"10px",color:P.textTert}}>{s.artifact_num}</span>
                  <span style={{fontSize:"12px",fontWeight:"500",color:P.text}}>{s.artifact_name}</span>
                  <span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"20px",background:s.is_enabled?"#ECFDF5":"#FEF2F2",color:s.is_enabled?"#065F46":"#991B1B",fontWeight:"500"}}>{s.is_enabled?"Enabled":"Disabled"}</span>
                </div>
                <div style={{fontSize:"10px",color:P.textTert}}>Zone {s.zone_num} - Parent: {s.parent_artifact_num}</div>
                {!s.is_enabled&&s.disabled_reason&&(
                  <div style={{fontSize:"11px",color:"#991B1B",background:"#FEF2F2",borderRadius:"6px",padding:"5px 9px",marginTop:"4px"}}>
                    Disabled: {s.disabled_reason} <span style={{color:P.textTert}}>by {s.disabled_by}</span>
                  </div>
                )}
              </div>
              {isAdmin&&(
                <div style={{display:"flex",gap:"6px",flexShrink:0}}>
                  <button onClick={()=>{setEditTarget(s);setEditName(s.artifact_name||"");setShowEditModal(true);}} style={{fontSize:"10px",padding:"4px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:P.bgTert,color:P.textSec,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>toggleEnabled(s)} style={{fontSize:"10px",padding:"4px 10px",border:`0.5px solid ${P.border}`,borderRadius:"6px",background:s.is_enabled?"#FEF2F2":"#ECFDF5",color:s.is_enabled?"#991B1B":"#065F46",cursor:"pointer"}}>{s.is_enabled?"Disable":"Enable"}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showEditModal&&editTarget&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"420px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Edit {editTarget.type==="zone"?"zone":"artifact"} name</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>{editTarget.zone_name||editTarget.artifact_name}</p>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>New name</label>
              <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Enter new name..." style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px"}} onKeyDown={e=>e.key==="Enter"&&saveEdit()}/>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowEditModal(false);setEditTarget(null);setEditName("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={saveEdit} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showDisableModal&&disableTarget&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"420px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"4px"}}>Disable {disableTarget.type==="zone"?"zone":"artifact"}</h2>
            <p style={{fontSize:"11px",color:P.textSec,marginBottom:"1rem"}}>{disableTarget.zone_name||disableTarget.artifact_name}</p>
            <div style={{background:"#FFFBEB",border:"0.5px solid #FDE68A",borderRadius:"8px",padding:"10px 12px",marginBottom:"1rem",fontSize:"11px",color:"#92400E"}}>
              {disableTarget.type==="zone"?"Disabled zones are counted as 100% complete in the TMF dashboard.":"Disabled artifacts are excluded from gap analysis and completeness calculations."}
            </div>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Reason for disabling (required)</label>
              <textarea value={disableReason} onChange={e=>setDisableReason(e.target.value)} placeholder="e.g. Not applicable to this study type - no device involved" rows={3} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"8px 10px",resize:"vertical" as const}}/>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowDisableModal(false);setDisableTarget(null);setDisableReason("");}} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={submitDisable} style={{fontSize:"11px",padding:"6px 14px",background:"#EF4444",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Confirm disable</button>
            </div>
          </div>
        </div>
      )}

      {showAddZone&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"400px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Add custom zone</h2>
            <div style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Zone number</label><input value={newZoneNum} onChange={e=>setNewZoneNum(e.target.value)} placeholder="e.g. 12" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Zone name</label><input value={newZoneName} onChange={e=>setNewZoneName(e.target.value)} placeholder="e.g. Quality Management" style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowAddZone(false)} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={addZone} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add zone</button>
            </div>
          </div>
        </div>
      )}

      {showAddArtifact&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"460px",border:`0.5px solid ${P.border}`,maxHeight:"90vh",overflowY:"auto"}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Add custom artifact</h2>
            {[{l:"Zone number",v:newArtZone,s:setNewArtZone,p:"e.g. 1"},{l:"Section number",v:newArtSection,s:setNewArtSection,p:"e.g. 1.07"},{l:"Artifact number",v:newArtNum,s:setNewArtNum,p:"e.g. 01.07.01"},{l:"Artifact name",v:newArtName,s:setNewArtName,p:"e.g. Training Log"},{l:"ISO 14155 reference",v:newArtIso,s:setNewArtIso,p:"e.g. 6.2 (optional)"}].map(f=>(
              <div key={f.l} style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.p} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            ))}
            <div style={{marginBottom:"1rem"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>Classification</label>
              <select value={newArtCl} onChange={e=>setNewArtCl(e.target.value)} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}>
                <option>Core</option><option>Recommended</option><option>Optional</option>
              </select>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowAddArtifact(false)} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={addArtifact} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add artifact</button>
            </div>
          </div>
        </div>
      )}

      {showAddSub&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:P.bg,borderRadius:"16px",padding:"1.5rem",width:"440px",border:`0.5px solid ${P.border}`}}>
            <h2 style={{fontSize:"14px",fontWeight:"500",marginBottom:"1rem"}}>Add sub-artifact</h2>
            {[{l:"Zone number",v:newSubZone,s:setNewSubZone,p:"e.g. 1"},{l:"Parent artifact number",v:newSubParent,s:setNewSubParent,p:"e.g. 01.04.01"},{l:"Sub-artifact number",v:newSubNum,s:setNewSubNum,p:"e.g. 01.04.01.01"},{l:"Sub-artifact name",v:newSubName,s:setNewSubName,p:"e.g. Remote Monitoring Visit Report"}].map(f=>(
              <div key={f.l} style={{marginBottom:"10px"}}><label style={{fontSize:"11px",color:P.textSec,display:"block",marginBottom:"3px"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.p} style={{width:"100%",fontSize:"12px",border:`0.5px solid ${P.border}`,borderRadius:"8px",padding:"7px 10px"}}/></div>
            ))}
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowAddSub(false)} style={{fontSize:"11px",padding:"6px 14px",border:`0.5px solid ${P.border}`,borderRadius:"8px",background:"transparent",cursor:"pointer"}}>Cancel</button>
              <button onClick={addSubArtifact} style={{fontSize:"11px",padding:"6px 14px",background:P.primary,color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer"}}>Add sub-artifact</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}







































