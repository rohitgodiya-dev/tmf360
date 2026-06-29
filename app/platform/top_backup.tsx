"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";

const TMF = [
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.04",an:"List of SOPs Current During Trial",cl:"Core",iso:""},
  {z:"1",zn:"Trial Management",s:"1.01",sn:"Trial Oversight",a:"01.01.08",an:"Monitoring Plan",cl:"Core",iso:"6.7, 7.3, 9.2.4.1"},
  {z:"1",zn:"Trial Management",s:"1.02",sn:"Central Trial Team",a:"01.02.01",an:"Delegation of Authority Log",cl:"Core",iso:"6.2, 9.2"},
  {z:"1",zn:"Trial Management",s:"1.02",sn:"Central Trial Team",a:"01.02.02",an:"Staff CVs and Training Records",cl:"Core",iso:"6.2"},
  {z:"1",zn:"Trial Management",s:"1.03",sn:"Agreements",a:"01.03.01",an:"CRO Agreement",cl:"Core",iso:"6.1"},
  {z:"1",zn:"Trial Management",s:"1.04",sn:"Monitoring",a:"01.04.01",an:"Monitoring Visit Report",cl:"Core",iso:"9.2.4"},
  {z:"1",zn:"Trial Management",s:"1.05",sn:"Risk Management",a:"01.05.01",an:"Risk Assessment",cl:"Core",iso:"9.1"},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Protocol",a:"02.01.01",an:"Protocol",cl:"Core",iso:"7.2, Annex A"},
  {z:"2",zn:"Central Trial Documents",s:"2.01",sn:"Protocol",a:"02.01.02",an:"Protocol Amendment",cl:"Core",iso:"7.2.10"},
  {z:"2",zn:"Central Trial Documents",s:"2.02",sn:"Informed Consent",a:"02.02.01",an:"Informed Consent Form (Master)",cl:"Core",iso:"7.4, 4.1"},
  {z:"2",zn:"Central Trial Documents",s:"2.03",sn:"Device Description",a:"02.03.01",an:"Investigator Brochure / Device Description",cl:"Core",iso:"7.3"},
  {z:"2",zn:"Central Trial Documents",s:"2.04",sn:"CRFs",a:"02.04.01",an:"Case Report Form (Blank)",cl:"Core",iso:"7.8"},
  {z:"2",zn:"Central Trial Documents",s:"2.05",sn:"SAP",a:"02.05.01",an:"Statistical Analysis Plan",cl:"Core",iso:"7.9"},
  {z:"3",zn:"Regulatory",s:"3.01",sn:"Regulatory Applications",a:"03.01.01",an:"Regulatory Submission",cl:"Core",iso:"9.3"},
  {z:"3",zn:"Regulatory",s:"3.01",sn:"Regulatory Applications",a:"03.01.02",an:"Regulatory Approval / Authorization",cl:"Core",iso:"9.3"},
  {z:"3",zn:"Regulatory",s:"3.02",sn:"Correspondence",a:"03.02.01",an:"Regulatory Correspondence",cl:"Core",iso:"9.3"},
  {z:"3",zn:"Regulatory",s:"3.03",sn:"Progress Reports",a:"03.03.01",an:"Annual / Progress Report to Regulatory Authority",cl:"Core",iso:"9.4"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC",a:"04.01.01",an:"IRB / IEC Submission",cl:"Core",iso:"9.5"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC",a:"04.01.02",an:"IRB / IEC Approval",cl:"Core",iso:"4.1.3, 9.5.1"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC",a:"04.01.03",an:"IRB / IEC Continuing Review",cl:"Core",iso:"9.5.3"},
  {z:"4",zn:"IRB or IEC and other Approvals",s:"4.01",sn:"IRB or IEC",a:"04.01.04",an:"IRB / IEC Correspondence",cl:"Core",iso:"9.5"},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.01",an:"Site Selection and Qualification Report",cl:"Core",iso:"6.5, 9.2.1"},
  {z:"5",zn:"Site Management",s:"5.01",sn:"Site Selection",a:"05.01.02",an:"Investigator / Site Qualification Questionnaire",cl:"Core",iso:"6.5"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Initiation",a:"05.02.01",an:"Site Initiation Visit Report",cl:"Core",iso:"9.2.2"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Initiation",a:"05.02.02",an:"Training Materials",cl:"Core",iso:"9.2.2"},
  {z:"5",zn:"Site Management",s:"5.02",sn:"Site Initiation",a:"05.02.03",an:"Site Training Records",cl:"Core",iso:"9.2.2"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.01",an:"Investigator Agreement / Signed Protocol",cl:"Core",iso:"6.4, 9.2.3.1"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.02",an:"Principal Investigator CV",cl:"Core",iso:"6.4.1"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.03",an:"Sub-Investigator CVs",cl:"Core",iso:"6.4.1"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.04",an:"Investigator / Staff Delegation Log",cl:"Core",iso:"6.4.2"},
  {z:"5",zn:"Site Management",s:"5.03",sn:"Investigator and Staff",a:"05.03.05",an:"Medical Licenses",cl:"Core",iso:"6.4.1"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Facilities",a:"05.04.01",an:"Normal Value Ranges (Lab)",cl:"Core",iso:"7.5.4"},
  {z:"5",zn:"Site Management",s:"5.04",sn:"Site Facilities",a:"05.04.02",an:"Laboratory Certification / Accreditation",cl:"Core",iso:"7.5.4"},
  {z:"5",zn:"Site Management",s:"5.05",sn:"Clinical Trial Agreement",a:"05.05.01",an:"Clinical Trial Agreement (Site)",cl:"Core",iso:"6.4.4"},
  {z:"5",zn:"Site Management",s:"5.06",sn:"Informed Consent",a:"05.06.01",an:"Signed Informed Consent Forms",cl:"Core",iso:"4.1, 7.4"},
  {z:"5",zn:"Site Management",s:"5.07",sn:"Screening",a:"05.07.01",an:"Screening / Enrollment Log",cl:"Core",iso:"8.3"},
  {z:"5",zn:"Site Management",s:"5.07",sn:"Screening",a:"05.07.02",an:"Subject Identification Code List",cl:"Core",iso:"8.3"},
  {z:"5",zn:"Site Management",s:"5.08",sn:"Protocol Deviations",a:"05.08.01",an:"Protocol Deviation Log",cl:"Core",iso:"8.2.4"},
  {z:"5",zn:"Site Management",s:"5.08",sn:"Protocol Deviations",a:"05.08.02",an:"Protocol Deviation Report",cl:"Core",iso:"8.2.4"},
  {z:"5",zn:"Site Management",s:"5.09",sn:"Site Closure",a:"05.09.01",an:"Site Closure Visit Report",cl:"Core",iso:"9.2.5"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"Investigational Device",a:"06.01.01",an:"Device Accountability Log",cl:"Core",iso:"8.6"},
  {z:"6",zn:"IP and Trial Supplies",s:"6.01",sn:"Investigational Device",a:"06.01.02",an:"Device Shipping and Receipt Records",cl:"Core",iso:"8.6"},
  {z:"7",zn:"Safety Reporting",s:"7.01",sn:"Adverse Events",a:"07.01.01",an:"Adverse Event Log",cl:"Core",iso:"8.5"},
  {z:"7",zn:"Safety Reporting",s:"7.01",sn:"Adverse Events",a:"07.01.02",an:"Serious Adverse Event Reports (SAE)",cl:"Core",iso:"8.5.4, 8.5.5"},
  {z:"7",zn:"Safety Reporting",s:"7.01",sn:"Adverse Events",a:"07.01.03",an:"Device Deficiency Reports",cl:"Core",iso:"8.5.6"},
  {z:"7",zn:"Safety Reporting",s:"7.02",sn:"Safety Reports",a:"07.02.01",an:"UADE / Safety Reports to Regulatory Authority",cl:"Core",iso:"8.5.4"},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Lab and Imaging",a:"08.01.01",an:"Central Lab Manual",cl:"Core",iso:"7.5"},
  {z:"8",zn:"Central and Local Testing",s:"8.01",sn:"Lab and Imaging",a:"08.01.02",an:"Imaging Manual",cl:"Recommended",iso:""},
  {z:"9",zn:"Third Parties",s:"9.01",sn:"Third Party Agreements",a:"09.01.01",an:"Third Party Agreement",cl:"Core",iso:"6.1"},
  {z:"10",zn:"Data Management",s:"10.01",sn:"Data Management Plan",a:"10.01.01",an:"Data Management Plan",cl:"Core",iso:"7.8, 7.9"},
  {z:"10",zn:"Data Management",s:"10.02",sn:"Database",a:"10.02.01",an:"Database Validation Documentation",cl:"Core",iso:"7.8.4"},
  {z:"11",zn:"Statistics",s:"11.01",sn:"Statistical Analysis",a:"11.01.01",an:"Statistical Analysis Plan",cl:"Core",iso:"7.9"},
  {z:"11",zn:"Statistics",s:"11.02",sn:"Analysis Outputs",a:"11.02.01",an:"Statistical Analysis Output",cl:"Core",iso:"7.9"},
];

const ZONES = [...new Set(TMF.map(a=>a.z))].map(z=>({z,zn:TMF.find(a=>a.z===z)!.zn}));
const ZONE_WEIGHT:Record<string,number>={"3":3,"4":3,"5":3,"1":2,"2":2,"7":2,"6":1,"8":1,"9":1,"10":1,"11":1};
const ZONE_COLORS:Record<string,string>={"1":"#8B5CF6","2":"#6366F1","3":"#EF4444","4":"#F59E0B","5":"#10B981","6":"#3B82F6","7":"#EC4899","8":"#06B6D4","9":"#6B7280","10":"#8B5CF6","11":"#6366F1"};

const FILE_ICONS:Record<string,string>={"pdf":"📄","doc":"📝","docx":"📝","xls":"📊","xlsx":"📊","ppt":"📋","pptx":"📋","png":"🖼","jpg":"🖼","jpeg":"🖼","tiff":"🖼","tif":"🖼","gif":"🖼","zip":"🗜","csv":"📊","txt":"📄"};
function fileIcon(n:string){return FILE_ICONS[n.split(".").pop()?.toLowerCase()||""]||"📎";}
function canPreview(n:string){return ["pdf","png","jpg","jpeg","gif","webp","tiff","tif"].includes(n.split(".").pop()?.toLowerCase()||"");}
function formatSize(b:number){if(b<1024)return b+" B";if(b<1024*1024)return (b/1024).toFixed(1)+" KB";return (b/(1024*1024)).toFixed(1)+" MB";}
