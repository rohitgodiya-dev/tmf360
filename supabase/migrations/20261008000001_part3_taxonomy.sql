-- Part 3 — taxonomy engine (TMF Reference Model as versioned data)
--
-- 1. Reference tables for the TMF Reference Model, keyed on the model's permanent
--    unique IDs. Read-only for users; changed only by migrations (change control).
--    Seeded from lib/taxonomy/tmf-rm-3.3.1.json by scripts/generate-taxonomy-migration.js;
--    an integration test checks the database matches the JSON.
-- 2. Milestone types (Part 2c) mapped to the model's 12 TMF milestone events.
-- 3. tmf_config (per-study artifact settings): duplicates removed and prevented,
--    rows linked to taxonomy artifacts, seeding moved to the server, access tightened
--    (it allowed any org member to change or delete it), changes audited.
-- 4. documents linked to taxonomy artifacts by permanent ID.

------------------------------------------------------------------------------
-- 1. Reference tables
------------------------------------------------------------------------------

create table if not exists taxonomy_versions (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  version text not null,
  released_on date,
  status text not null default 'active' check (status in ('active', 'retired')),
  notes text,
  loaded_at timestamptz not null default now(),
  unique (model, version)
);
-- Only one active version of a model at a time.
create unique index if not exists taxonomy_versions_one_active on taxonomy_versions (model) where status = 'active';

create table if not exists tmf_milestone_events (
  code text primary key check (code ~ '^\d\d$'),
  name text not null,
  phase text not null
);

create table if not exists taxonomy_zones (
  version_id uuid not null references taxonomy_versions(id),
  zone_num text not null check (zone_num ~ '^\d\d$'),
  name text not null,
  primary key (version_id, zone_num)
);

create table if not exists taxonomy_sections (
  version_id uuid not null references taxonomy_versions(id),
  section_num text not null check (section_num ~ '^\d\d\.\d\d$'),
  zone_num text not null,
  name text not null,
  primary key (version_id, section_num),
  foreign key (version_id, zone_num) references taxonomy_zones (version_id, zone_num)
);

create table if not exists taxonomy_artifacts (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references taxonomy_versions(id),
  unique_id text not null check (unique_id ~ '^\d{3}$'),
  artifact_num text not null check (artifact_num ~ '^\d\d\.\d\d\.\d\d$'),
  zone_num text not null,
  section_num text not null,
  name text not null,
  classification text not null check (classification in ('Core', 'Recommended')),
  definition text not null,
  sponsor_doc boolean not null,
  investigator_doc boolean not null,
  device_sponsor_doc boolean not null,
  device_investigator_doc boolean not null,
  iis_requirement text not null check (iis_requirement in ('M', 'D', 'R')),
  process_number text,
  dating_convention text,
  site_milestone text references tmf_milestone_events(code),
  -- Not yet loaded (need the CDISC Excel to load reliably): trial/country level flags and milestones, ICH codes.
  trial_level boolean,
  country_level boolean,
  trial_milestone text references tmf_milestone_events(code),
  country_milestone text references tmf_milestone_events(code),
  ich_code text,
  iso_ref text not null default '',
  sort_order integer not null,
  unique (version_id, unique_id),
  unique (version_id, artifact_num),
  foreign key (version_id, section_num) references taxonomy_sections (version_id, section_num)
);

create table if not exists taxonomy_subartifacts (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references taxonomy_artifacts(id),
  name text not null,
  sort_order integer not null,
  unique (artifact_id, name)
);

do $$
declare t text;
begin
  foreach t in array array['taxonomy_versions', 'tmf_milestone_events', 'taxonomy_zones', 'taxonomy_sections', 'taxonomy_artifacts', 'taxonomy_subartifacts'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "%1$s readable" on %1$I', t);
    execute format('create policy "%1$s readable" on %1$I for select to authenticated using (true)', t);
    execute format('revoke insert, update, delete, truncate on %I from anon, authenticated', t);
  end loop;
end $$;

-- The active version's artifact for an artifact number (null if none).
create or replace function taxonomy_artifact_for(p_artifact_num text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.id from taxonomy_artifacts a
  join taxonomy_versions v on v.id = a.version_id and v.status = 'active' and v.model = 'TMF Reference Model'
  where a.artifact_num = p_artifact_num;
$$;

------------------------------------------------------------------------------
-- Seed (generated)
------------------------------------------------------------------------------

insert into taxonomy_versions (model, version, released_on, status, notes) values ('TMF Reference Model', '3.3.1', '2023-08-11', 'active', 'CDISC TMF Reference Model v3.3.1 (public domain), transcribed from the published model. Not yet loaded: trial/country level flags and milestones, ICH codes, process names (need the CDISC Excel to load reliably).') on conflict (model, version) do nothing;

insert into tmf_milestone_events (code, name, phase) values
  ('01', 'First Country RA Approval', 'Start Up'),
  ('02', 'Clinical Infrastructure Ready', 'Start Up'),
  ('03', 'Site Live / Ready / Open for Enrollment', 'Start Up'),
  ('04', 'First Monitoring Visit', 'Study Conduct'),
  ('05', 'Significant Study Event', 'Study Conduct'),
  ('06', 'Annual IRB / IEC Renewal', 'Study Conduct'),
  ('07', 'Last Subject Last Visit', 'Study Conduct'),
  ('08', 'Database Lock', 'Close Out'),
  ('09', 'Close Out Monitoring Visit / Site Closed', 'Close Out'),
  ('10', 'Final Report / Clinical Study Report Approved', 'Close Out'),
  ('11', 'Ongoing', 'Other'),
  ('12', 'TMF Closure / Lock', 'Other')
on conflict (code) do nothing;

insert into taxonomy_zones (version_id, zone_num, name) select (select id from taxonomy_versions where model = 'TMF Reference Model' and version = '3.3.1'), z, n from (values
  ('01', 'Trial Management'),
  ('02', 'Central Trial Documents'),
  ('03', 'Regulatory'),
  ('04', 'IRB or IEC and other Approvals'),
  ('05', 'Site Management'),
  ('06', 'IP and Trial Supplies'),
  ('07', 'Safety Reporting'),
  ('08', 'Central and Local Testing'),
  ('09', 'Third parties'),
  ('10', 'Data Management'),
  ('11', 'Statistics')
) as t(z, n) on conflict do nothing;

insert into taxonomy_sections (version_id, section_num, zone_num, name) select (select id from taxonomy_versions where model = 'TMF Reference Model' and version = '3.3.1'), s, left(s, 2), n from (values
  ('01.01', 'Trial Oversight'),
  ('01.02', 'Trial Team'),
  ('01.03', 'Trial Committee'),
  ('01.04', 'Meetings'),
  ('01.05', 'General'),
  ('02.01', 'Product and Trial Documentation'),
  ('02.02', 'Subject Documentation'),
  ('02.03', 'Reports'),
  ('02.04', 'General'),
  ('03.01', 'Trial Approval'),
  ('03.02', 'Investigational Medicinal Product'),
  ('03.03', 'Trial Status Reporting'),
  ('03.04', 'General'),
  ('04.01', 'IRB or IEC Trial Approval'),
  ('04.02', 'Other Committees'),
  ('04.03', 'Trial Status Reporting'),
  ('04.04', 'General'),
  ('05.01', 'Site Selection'),
  ('05.02', 'Site Set-up'),
  ('05.03', 'Site Initiation'),
  ('05.04', 'Site Management'),
  ('05.05', 'General'),
  ('06.01', 'IP Documentation'),
  ('06.02', 'IP Release Process Documentation'),
  ('06.03', 'IP Allocation Documentation'),
  ('06.04', 'Storage'),
  ('06.05', 'Non-IP Documentation'),
  ('06.06', 'Interactive Response Technology'),
  ('06.07', 'General'),
  ('07.01', 'Safety Documentation'),
  ('07.02', 'Trial Status Reporting'),
  ('07.03', 'General'),
  ('08.01', 'Facility Documentation'),
  ('08.02', 'Sample Documentation'),
  ('08.03', 'General'),
  ('09.01', 'Third Party Oversight'),
  ('09.02', 'Third Party Set-up'),
  ('09.03', 'General'),
  ('10.01', 'Data Management Oversight'),
  ('10.02', 'Data Capture'),
  ('10.03', 'Database'),
  ('10.04', 'EDC Management'),
  ('10.05', 'General'),
  ('11.01', 'Statistics Oversight'),
  ('11.02', 'Randomization'),
  ('11.03', 'Analysis'),
  ('11.04', 'Report'),
  ('11.05', 'General')
) as t(s, n) on conflict do nothing;

insert into taxonomy_artifacts (version_id, unique_id, artifact_num, zone_num, section_num, name, classification, definition,
  sponsor_doc, investigator_doc, device_sponsor_doc, device_investigator_doc, iis_requirement, process_number, dating_convention, site_milestone, iso_ref, sort_order)
select (select id from taxonomy_versions where model = 'TMF Reference Model' and version = '3.3.1'), t.* from (values
  ('001', '01.01.01', '01', '01.01', 'Trial Master File Plan', 'Recommended', 'To describe how records for the trial will be managed and stored during and after the trial, including study-specific processes and documentation for archiving and destruction. To include TMF filing structure to be used. May include TMF content list, filing structure and chain of custody records. Artifact can include any evidence of plan execution including, but not limited to: plan, reports, checklists, etc.', true, false, true, false, 'R', '12', 'Version Date', null, '', 1),
  ('002', '01.01.02', '01', '01.01', 'Trial Management Plan', 'Recommended', 'To describe overall strategy for timelines, management and conduct of the trial and typically makes reference to other artifacts. Artifact can include details on contingency plan covering details for site start up planning.', true, false, true, false, 'R', '12', 'Version Date', null, '', 2),
  ('003', '01.01.03', '01', '01.01', 'Quality Plan', 'Recommended', 'To describe the operational techniques and activities undertaken within the quality management system to verify that the requirements for quality of the trial-related activities have been fulfilled. Relevant parts may include, but not be limited to, a plan written for internal oversight of study quality management, an audit plan, data verification steps, serious breach assessments; also includes escalation in the event of a quality issue being identified and all corrective and preventative actions determined. Artifact can include any evidence of plan execution including, but not limited to: plan, reports, checklists, etc.', true, false, true, false, 'R', '12', 'Version Date', null, '7.11 9.1 a', 3),
  ('004', '01.01.04', '01', '01.01', 'List of SOPs Current During Trial', 'Core', 'To document which standard operating procedures (SOPs) and which versions were in effect for the duration of the trial and trial-specific procedures created for the trial. To include sponsor and third party SOPs. This artifact does not include the SOPs themselves. May include SOP waivers to document and describe study-specific deviation from a named SOP or working procedure and the rationale for the deviation, when applicable.', true, false, true, false, 'M', '12', 'Document Date', null, '', 4),
  ('005', '01.01.05', '01', '01.01', 'Operational Procedure Manual', 'Recommended', 'To describe trial-related processes not covered by formal standard operating procedures. Includes manuals given to sites for ISFs and vendor study-specific manuals as well as any study related tools provided to investigator sites not subject to IRB/IEC approval. Artifact can include any evidence of plan execution including, but not limited to: plan, reports, checklists.', true, true, true, true, 'R', '12', 'Version Date', null, '', 5),
  ('006', '01.01.06', '01', '01.01', 'Recruitment Plan', 'Recommended', 'To describe the planned subject enrolment/recruitment goals during the trial, including contingency plans. Artifact can include any evidence of plan execution including, but not limited to: plan, reports, checklists, etc.', true, false, true, false, 'R', '12', 'Version Date', '03', '', 6),
  ('007', '01.01.07', '01', '01.01', 'Communication Plan', 'Recommended', 'To describe communication strategy and plans between trial stakeholders, including communication escalation procedures/steps. Artifact can include any evidence of plan execution including, but not limited to: plan, reports, checklists, etc.', true, false, true, false, 'R', '12', 'Version Date', null, '', 7),
  ('008', '01.01.08', '01', '01.01', 'Monitoring Plan', 'Core', 'To describe how monitoring will be implemented during the trial, including strategy for source data verification and risk based monitoring (if applicable). Artifact can include any trial level evidence of plan execution including, but not limited to: plan, reports, checklists, etc. Note: Individual Monitoring Visit Reports are filed in zone 5.', true, false, true, false, 'M', '12', 'Version Date', null, '6.7 7.3 9.2.4.1', 8),
  ('009', '01.01.09', '01', '01.01', 'Medical Monitoring Plan', 'Core', 'To describe how medical surveillance of trial subjects will be assured during the trial. Artifact can include any evidence of plan execution including, but not limited to: plan, reports, checklists, etc.', true, false, true, false, 'M', '12', 'Version Date', null, '6.11', 9),
  ('010', '01.01.10', '01', '01.01', 'Publication Policy', 'Recommended', 'To describe the policy for publishing the trial results if publication policy is not captured within the protocol.', true, false, true, false, 'R', '12', 'Document Date', null, '', 10),
  ('011', '01.01.11', '01', '01.01', 'Debarment Statement', 'Recommended', 'To verify whether the applicant or any of its principals is currently debarred, suspended, proposed for debarment, or declared ineligible to receive federal awards; whether within the past three years the applicant, or any of its principals, has been convicted of or had a civil judgment rendered against it for, or been indicted for, commission of fraud or certain criminal offenses; and whether the applicant has had any federal award terminated for cause or default in the past three years. Often part of the site qualification process, however, can account for situations which might arise during the course of the study, especially relevant for long-term trials.', true, false, true, false, 'R', '16', 'Document Date', '03', '', 11),
  ('012', '01.01.12', '01', '01.01', 'Trial Status Report', 'Recommended', 'Routine trial status progress report generated by the sponsor or 3rd Party and distributed to trial stakeholders.', true, false, true, false, 'R', '21', 'Date Generated', null, '', 12),
  ('013', '01.01.13', '01', '01.01', 'Investigator Newsletter', 'Recommended', 'To inform investigative staff of common implementation issues and of the progress of the trial.', true, true, true, true, 'R', '21', 'Document Date', null, '', 13),
  ('014', '01.01.14', '01', '01.01', 'Audit Certificate', 'Core', 'Documentation to confirm that an audit was performed (does not contain the audit report).', true, false, true, false, 'D', '27', 'Issue Date', '05', 'E3.4 7.11 e 9.1 D13 h', 14),
  ('015', '01.01.15', '01', '01.01', 'Filenote Master List', 'Recommended', 'To provide a consolidated list/index of file notes generated during the trial.', true, false, true, false, 'R', '21', 'Version Date', '11', '', 15),
  ('236', '01.01.16', '01', '01.01', 'Risk Management Plan', 'Recommended', 'To describe the potential hazards associated with the trial, including an assessment of the likelihood of those hazards occurring and resulting in harm. The Risk Management Plan is intended to include the risks to participant safety in relation to the IMP and all other risks related to the design and methods of the trial, including risks to participant safety and rights, as well as reliability of results. Artifact can include any evidence of plan execution including, but not limited to: plan, reports, checklists, etc.', true, false, true, false, 'R', '12', 'Version Date', null, '6.2 5.6.2 c 5.6.2 d 7.8.1 9.2.3 h 9.2.6 c 7.5.1 7.10 Annex H', 16),
  ('237', '01.01.17', '01', '01.01', 'Vendor Management Plan', 'Recommended', 'To describe the overall management strategy for third party vendors used to conduct trial-related activities. May include assignment of responsibilities for third party vendor oversight, performance indicators, monitoring activities and schedules, issue escalation and resolution process, technology and documentation transfer and business continuity plan. Artifacts providing evidence of plan execution including, but not limited to: reports, checklists, etc. and other records demonstrating oversight of a specific third party vendor should be filed in the appropriate artifacts in Zone 09.', true, false, true, false, 'R', '8', 'Version Date', null, '9.3', 17),
  ('181', '01.01.18', '01', '01.01', 'Roles and Responsibility Matrix', 'Core', 'To identify range and distribution of tasks and responsibilities; may define internal assignment and all external parties; covers GCP as well as business process; often part of the Contractual Agreement (09.02.03).', true, false, true, false, 'D', '8', 'Version Date', null, '6.1 9.2.1a', 18),
  ('247', '01.01.19', '01', '01.01', 'Transfer of Regulatory Obligations', 'Core', 'To specify the transfer of regulatory obligations from sponsor to each Affiliate/CRO/Vendor and may include other agreements. A sponsor may transfer responsibility for any or all of the obligations set forth in this part to another entity. Any such transfer shall be described in writing. If not all obligations are transferred, the writing is required to describe each of the obligations being assumed by the alternate entity. If all obligations are transferred, a general statement that all obligations have been transferred is acceptable.', true, false, true, false, 'D', '8', 'Signature Date', null, '9.3', 19),
  ('248', '01.01.20', '01', '01.01', 'Operational Oversight', 'Core', 'Documentation to show evidence of sponsor oversight of study, as well as any key decisions taken and the supporting rationale. Records demonstrating oversight of a specific third party should be filed in the appropriate artifacts in Zone 09.', true, false, true, false, 'R', '8', 'Document Date', null, '', 20),
  ('016', '01.02.01', '01', '01.02', 'Trial Team Details', 'Core', 'To define trial roles, contact details and structure of the trial team - both sponsor and third parties; optionally this may include full and initials-only signature of all team members, role-to-role transition documents, organogram and/or team joining/leaving dates.', true, false, true, false, 'M', '7', 'Document Date', null, 'E.1.28 E.2.26 6.1 9.2.1 a 9.2.1 g D.13e', 21),
  ('017', '01.02.02', '01', '01.02', 'Trial Team Curriculum Vitae', 'Core', 'To document qualifications and eligibility of sponsor trial team members. Documentation for third party trial team members should be filed in Zone 09.', true, false, true, false, 'M', '7', 'Signature Date', null, '9.2.1g 6.1', 22),
  ('018', '01.03.01', '01', '01.03', 'Committee Process', 'Core', 'To describe the purpose and mode of operation/manner of working of the Independent Trial Committee, which may be established by the sponsor to assess at intervals the progress of a clinical trial the safety data and the critical efficacy endpoints and to recommend to the sponsor whether to continue, modify or stop a trial. To describe in advance the decision-making process of the Committee that will evaluate key trial events (e.g. endpoints).', true, false, true, false, 'D', '10', 'Version Date', null, '6.11', 23),
  ('019', '01.03.02', '01', '01.03', 'Committee Member List', 'Core', 'To document the current composition of a trial committee. Can be part of the Charter.', true, false, true, false, 'D', '10', 'Version Date', null, '', 24),
  ('020', '01.03.03', '01', '01.03', 'Committee Output', 'Core', 'To document any agreements or significant decisions regarding trial conduct, protocol violations, adverse event reporting, to include minutes, reports, notifications, recommendations from a trial committee. Can be applicable to interim and final analyses.', true, false, true, false, 'D', '31', 'Version Date', null, '6.11', 25),
  ('249', '01.03.04', '01', '01.03', 'Committee Member Curriculum Vitae', 'Core', 'To document qualifications and eligibility of the Committee Member to provide assessments, at set intervals, the progress of a clinical trial, of the safety data and the critical efficacy endpoints and to recommend to the sponsor whether to continue, modify or stop a trial. To include updates.', true, false, true, false, 'D', '10', 'Signature Date', null, '6.1 6.11', 26),
  ('250', '01.03.05', '01', '01.03', 'Committee Member Financial Disclosure Form', 'Core', 'To certify that no financial arrangements with a Committee Member have been made where study outcome could affect compensation; that the Committee Member has no proprietary interest in the tested product; that the Committee Member does not have a significant equity interest in the sponsor of the covered study, that the Committee Member has not received significant payments of other sorts; and/or disclosure of specified financial arrangements and any steps taken to minimize the potential for bias.', true, false, true, false, 'D', '10', 'Signature Date', null, 'E.1.33 E.2.30 5.6.2 d 6.11 9.2.1 e 10.2 c', 27),
  ('251', '01.03.06', '01', '01.03', 'Committee Member Contract', 'Core', 'To document agreement of trial requirements between sponsor or 3rd Party and Committee Member.', true, false, true, false, 'D', '10', 'Signature Date', null, '6.9', 28),
  ('252', '01.03.07', '01', '01.03', 'Committee Member Confidentiality Disclosure Agreement', 'Core', 'A document between the sponsor and the Committee Member that defines the terms and basic criteria to assure that the party (or parties) receiving confidential information will maintain confidentiality and will not use that information for any purpose other than that described in the Agreement.', true, false, true, false, 'D', '10', 'Signature Date', null, 'E.1.13 E.1.33 6.9 9. 2.1.a 9.2.1 d 10.2.c', 29),
  ('024', '01.04.01', '01', '01.04', 'Kick-off Meeting Material', 'Core', 'Agenda, presentation materials and other documentation made available for attendees of the trial kick-off meeting, including attendance sheets. Does not include Investigator Meeting content.', true, false, true, false, 'D', '21', 'Meeting Start Date', null, '', 30),
  ('025', '01.04.02', '01', '01.04', 'Trial Team Training Material', 'Core', 'Trial-relevant training materials, including use of specialized systems.', true, false, true, false, 'M', '26', 'Version Date', null, '9.2.4.2 c 7.3 7.6', 31),
  ('026', '01.04.03', '01', '01.04', 'Investigators Meeting Material', 'Core', 'Agenda, presentation materials and other documentation made available for attendees of the investigator meeting(s). Includes meeting minutes or questions and answers (Q&A), attendance sheets and any pre-meeting material.', true, true, true, true, 'D', '21', 'Meeting Start Date', null, '', 32),
  ('253', '01.04.04', '01', '01.04', 'Trial Team Evidence of Training', 'Core', 'To document completion of study-specific trial team training, including certification or evidence of training (attendance sheets). Includes EDC training. Does not include each individual''s education, training and experience to perform his/her role. This should be documented in the company learning management system.', true, false, true, false, 'M', '10', 'Training Date', null, '9.2.1', 33),
  ('027', '01.05.01', '01', '01.05', 'Relevant Communications', 'Core', 'Zone-specific agreements, significant discussions or relevant information, but not specifically listed in this Reference Model. Types of correspondence may include, but are not limited to: letters, memo, electronic communications and faxes. Correspondence referring to general topics and/or topics across multiple zones may be filed with this zone.', true, false, true, false, 'M', '21 / Per content', 'Correspondence Date', null, 'E.2.11 9.2.3 b 9.2.4.5 o 10.6 h', 34),
  ('028', '01.05.02', '01', '01.05', 'Tracking Information', 'Recommended', 'Zone-specific documents developed for the purpose of tracking activities during the course of the trial.', true, false, true, false, 'R', 'Per content', 'Last Entry Date', '11', '', 35),
  ('029', '01.05.03', '01', '01.05', 'Other Meeting Material', 'Core', 'Agenda, presentation materials and other documentation generated during any other internal or external zone-related meeting which documents any agreements or significant discussions. Includes meeting minutes or Q&A, attendance sheets and any pre-meeting material.', true, false, true, false, 'D', 'Per content', 'Meeting Start Date', null, '', 36),
  ('030', '01.05.04', '01', '01.05', 'Filenote', 'Core', 'To document any decision or to clarify any information relating to this zone. Filenotes referencing general topics and/or topics across multiple zones may be filed within this zone.', true, false, true, false, 'D', 'Per content', 'Filenote Date', '11', '', 37),
  ('031', '02.01.01', '02', '02.01', 'Investigator''s Brochure', 'Core', 'To provide relevant and current clinical and non-clinical data on the investigational product(s) that is related to the study of the product(s) in human subjects. The Investigational Medicinal Product Brochure (IMPD) can additionally be filed here if held in the TMF.', true, true, true, true, 'M', '2', 'Version Date', null, 'E.1.1 E.2.1 6.5 7.5.1 Annex B 6.3', 38),
  ('032', '02.01.02', '02', '02.01', 'Protocol', 'Core', 'To describe the objective(s), design, methodology, statistical considerations and organization of a trial. Usually also gives the background and rationale for the trial, but these could also be provided in other protocol referenced documents. Includes Special Protocols.', true, true, true, true, 'M', '2', 'Version Date', '01', 'E.1.2 4 5.6.2.a 5.6.4 6.3 6.4 7.1 7.5.1 10.6 b 10.6 f Annex A 7.1 7.8.2 Annex 1', 39),
  ('033', '02.01.03', '02', '02.01', 'Protocol Synopsis', 'Core', 'A summary of the pertinent points of the protocol. A local language version may be translated from core (English) or produced in the country if required by local Regulatory Authorities or IRB/IEC.', true, false, true, false, 'M', '4', 'Version Date', null, '', 40),
  ('034', '02.01.04', '02', '02.01', 'Protocol Amendment', 'Core', 'Subsequent versions of the original protocol as well as supporting documentation that may include description of change(s) to or formal clarification of a protocol. Includes justification for a non-substantial amendment, such as administrative changes.', true, true, true, true, 'M', '4', 'Version Date', '05', 'E2.2 7.51', 41),
  ('035', '02.01.05', '02', '02.01', 'Financial Disclosure Summary', 'Recommended', 'Summary documentation of compliance with financial disclosure reporting requirements, per company and/or local government policies. May include summaries, lists, other reports.', true, false, true, false, 'D', '7', 'Version Date', '10', '', 42),
  ('036', '02.01.06', '02', '02.01', 'Insurance', 'Core', 'To document that compensation to subject(s) for trial-related injury will be available. May include policy and certificates, terms and conditions. Certificate is core, policy is recommended.', true, true, true, true, 'M', '16', 'Effective Date', null, 'E.1.25 5.3 5.6.2 j 9.2.2 e', 43),
  ('037', '02.01.07', '02', '02.01', 'Sample Case Report Form', 'Core', 'Blank forms / templates in paper form or e-Format to capture the data points of the protocol.', true, true, true, true, 'M', '4', 'Version Date', null, 'E.1.25 E.1.26 E.1.27 6.6 7.4.2 7.4.3 Annex C', 44),
  ('239', '02.01.10', '02', '02.01', 'Report of Prior Investigations', 'Core', 'To include reports of all prior clinical, animal and laboratory testing of the device and shall be comprehensive and adequate to justify the proposed investigation. Can be in addition or instead of an Investigator Brochure for device trials.', false, false, true, true, 'M', '2', 'Document Date', null, '', 45),
  ('254', '02.01.11', '02', '02.01', 'Marketed Product Material', 'Core', 'Materials available in the legal pharmacologic description of a drug or device, subject to detailed regulatory specifications, including approved chemical and proprietary names, description and classification, clinical pharmacology, approved indications and usage, contraindications, warnings, precautions, adverse reactions, drug abuse and dependence information, over dosage discussion, dosage and administration, formulations and appropriate references.', true, true, true, true, 'M', '2', 'Version Date', null, '', 46),
  ('038', '02.02.01', '02', '02.02', 'Subject Diary', 'Core', 'To document subject data captured by the subject and external to the CRF (blank forms / templates).', true, true, true, true, 'D', '4', 'Version Date', null, 'Annex C.2.4.L', 47),
  ('039', '02.02.02', '02', '02.02', 'Subject Questionnaire', 'Core', 'To capture specific subject related information through a series of questions (blank forms / templates).', true, true, true, true, 'D', '3', 'Version Date', null, '', 48),
  ('040', '02.02.03', '02', '02.02', 'Informed Consent Form', 'Core', 'To document that the appropriate written information (content and wording) has been given to subjects regarding the trial to support their ability to give fully informed consent and to document their consent to trial participation in writing. If applicable, must also include the child assent form (blank model / template). Please note that core template is trial level, the country template is country level and the site template is at the site level.', true, true, true, true, 'M', '17', 'Version Date', '03', 'E.1.18 E.2.3 E.2.13 5.2 5.3 5.6.2 c 5.6.2.d 5.8.1 5.8.4 7.8.1 7.5.1 8.6 9.2.2.b 9.2.4.5.f 10.5 10.7.a 10.7.c 10.7.d 10.7.e', 49),
  ('041', '02.02.04', '02', '02.02', 'Subject Information Sheet', 'Core', 'To document information provided to subjects to support their decision about whether or not to participate in the trial.', true, true, true, true, 'D', '4', 'Version Date', '03', 'E.1.18 5.6.2.c 5.6.2.d 5.8.4 7.8.1 9.2.2.b', 50),
  ('042', '02.02.05', '02', '02.02', 'Subject Participation Card', 'Core', 'To be provided to the subject to carry to document trial participation (blank template).', true, true, true, true, 'D', '4', 'Version Date', null, '', 51),
  ('043', '02.02.06', '02', '02.02', 'Advertisements for Subject Recruitment', 'Core', 'Materials used in clinical trial recruitment campaigns; approved by the IRB/IEC to ensure recruitment measures are appropriate and not coercive.', true, true, true, true, 'D', '4', 'Version Date', '03', 'E.1.18 5.6.2.c 5.6.2.d 5.8.4 7.8.1 9.2.2.b', 52),
  ('044', '02.02.07', '02', '02.02', 'Other Information Given to Subjects', 'Core', 'Materials provided to the subject to further assist with understanding the trial requirements or concepts; may include memory aids or retention materials.', true, true, true, true, 'D', '17', 'Version Date', '03', 'E.1.18 5.6.2.c 5.6.2.d 5.8.4 7.8.1 9.2.2.b', 53),
  ('045', '02.03.01', '02', '02.03', 'Clinical Study Report', 'Core', 'To describe final or interim results and interpretation of trial of any therapeutic, prophylactic, or diagnostic agent conducted in human subjects, in which all Clinical Study Report components are included, such as the clinical and statistical description, analyses, data listings, CRFs and summaries.', true, true, true, true, 'M', '40', 'Report Date', null, 'E.3.8 8.4 9.2.6 Annex D', 54),
  ('047', '02.03.02', '02', '02.03', 'Bioanalytical Report', 'Recommended', 'To present & summarize the relevant top line findings of the bioanalytical aspects of the interim or final analysis and may include PK analysis or reports.', true, false, true, false, 'R', '37', 'Report Date', null, '8.6 9.2.2.b', 55),
  ('048', '02.04.01', '02', '02.04', 'Relevant Communications', 'Core', 'Zone-specific agreements, significant discussions or relevant information, but not specifically listed in this Reference Model. Types of correspondence may include, but not limited to: letters, memo, electronic communications and faxes.', true, false, true, false, 'D', 'Per content', 'Correspondence Date', '11', 'E 2.11 9.2.3.c 9.2.4.5.o 10.6.h', 56),
  ('049', '02.04.02', '02', '02.04', 'Tracking Information', 'Recommended', 'Zone-specific documents developed for the purpose of tracking activities during the course of the trial.', true, false, true, false, 'R', 'Per content', 'Last Entry Date', null, '', 57),
  ('050', '02.04.03', '02', '02.04', 'Meeting Material', 'Core', 'Agenda, presentation materials and other documentation generated during an internal or external zone-related meeting which documents any agreements or significant discussions. Includes meeting minutes or Q&A, attendance sheets and any pre-meeting material.', true, false, true, false, 'D', '21', 'Meeting Start Date', null, '', 58),
  ('051', '02.04.04', '02', '02.04', 'Filenote', 'Core', 'To document any decision or to clarify any information relating to this zone.', true, false, true, false, 'D', 'Per content', 'Filenote Date', '11', '', 59),
  ('052', '03.01.01', '03', '03.01', 'Regulatory Submission', 'Recommended', 'A set of documents, along with required associated regulatory forms and correspondence, submitted to one or more regulatory agencies requesting approval to conduct the trial or for the purpose of notification, or requesting approval of changes to the trial documents or of any trial events that could adversely affect the safety of subjects, impact the conduct of the trial or alter the regulatory authority''s approval/favorable opinion to continue the trial. Example Investigational New Drug Application (IND), Clinical Trial Application (CTA), Investigational Device Exemption (IDE). The submitted documents such as Investigator Brochure, Informed Consent Forms, etc. may or may not be filed as a complete Dossier within this Artifact, this is dependent on SOPs within your Organization.', true, false, true, false, 'R', '13', 'Submission Date', null, 'E 2.11 8.2.2 9.2.2 g, 9.2.2.I 9.4 a,b', 60),
  ('053', '03.01.02', '03', '03.01', 'Regulatory Authority Decision', 'Core', 'A documented notification received from a regulatory authority stating that the Submission has been received and approved.', true, true, true, true, 'M', '14', 'Approval Date', null, 'E.1.11 E.2.5 7.1 9.2.2G 9.2.2.H', 61),
  ('054', '03.01.03', '03', '03.01', 'Notification of Regulatory Identification Number', 'Core', 'Document identifying unique Identification (ID) number used to uniquely identify the trial or the trial level in that region, assigned by a regulatory agency - e.g. EU = EudraCT Number, FDA = IND Number, US Device = IDE Number.', true, false, true, false, 'D', '14', 'Notification Date', null, '', 62),
  ('055', '03.01.04', '03', '03.01', 'Public Registration', 'Core', 'Documentation related to registration of clinical trials in public registries such as ClinicalTrials.gov and to submission of results periodically during the study and at study completion.', true, false, true, false, 'D', '11', 'Registration Date', null, 'Annex G 6 h 5.4 9.2.2j Annex J F.2', 63),
  ('056', '03.02.01', '03', '03.02', 'Import or Export License Application', 'Core', 'An application made to one or more regulatory agencies requesting a license to import or export the investigational product and clinical supplies.', true, false, true, false, 'D', '13', 'Application Date', null, '', 64),
  ('057', '03.02.02', '03', '03.02', 'Import or Export Documentation', 'Core', 'A document issued by a national government authorizing the importation or exportation of certain goods into its territory.', true, true, true, true, 'D', '6', 'Effective Date', null, '', 65),
  ('058', '03.03.01', '03', '03.03', 'Notification of Safety or Trial Information', 'Core', 'Notification to Regulatory Authorities of any trial events that could alter the regulatory authority''s approval/favorable opinion to continue the trial. Notifications may include, but are not limited to: Quarterly line listings, suspected unexpected serious adverse reactions (SUSARs), Unexpected Serious Adverse Device Events (USADE), Council for International Organizations of Medical Sciences (CIOMS), MedWatch, Analysis of Similar Events, Serious Breaches, cover letters and/or country-specific reporting forms.', true, false, true, false, 'M', '28', 'Notification Date', null, 'E.2.19 7.4 9.2.5.L 9.2.4.5.d 9.4 10.8 7.4.2', 66),
  ('059', '03.03.02', '03', '03.03', 'Regulatory Progress Report', 'Core', 'Reports concerning trial conduct, progress and status that are required to be periodically submitted to relevant regulatory authorities. This artifact is not intended to include safety reports required by regulatory authorities (these are covered under artifact 03.03.01).', true, false, true, false, 'M', '39', 'Submission Date', null, '9.2.3 h 9.2.6 d 9.4 c', 67),
  ('060', '03.03.03', '03', '03.03', 'Regulatory Notification of Trial Termination', 'Core', 'Document detailing the termination of a trial - whether upon completion or premature termination.', true, false, true, false, 'M', '32', 'Notification Date', null, 'E.3.7 8.3. 9.2.6.', 68),
  ('061', '03.04.01', '03', '03.04', 'Relevant Communications', 'Core', 'Zone-specific agreements, significant discussions or relevant information, but not specifically listed in this Reference Model. Types of correspondence may include, but not limited to: letters, memo, electronic communications and faxes.', true, false, true, false, 'D', 'Per content', 'Correspondence Date', null, 'E 2.11 9.2.3 b 9.2.4.5.o 9.4 10.6.', 69),
  ('062', '03.04.02', '03', '03.04', 'Tracking Information', 'Recommended', 'Zone-specific documents developed for the purpose of tracking activities during the course of the trial.', true, false, true, false, 'D', 'Per content', 'Last Entry Date', '11', '', 70),
  ('063', '03.04.03', '03', '03.04', 'Meeting Material', 'Core', 'Agenda, presentation materials and other documentation generated during an internal or external zone-related meeting which documents any agreements or significant discussions. Includes meeting minutes or Q&A, attendance sheets and any pre-meeting material.', true, false, true, false, 'D', '14', 'Meeting Start Date', null, '', 71),
  ('064', '03.04.04', '03', '03.04', 'Filenote', 'Core', 'To document any decision or to clarify any information relating to this zone.', true, false, true, false, 'D', '13', 'Filenote Date', null, '', 72),
  ('065', '04.01.01', '04', '04.01', 'IRB or IEC Submission', 'Core', 'Documents describing the trial or changes/updates to the trial submitted to an IRB/IEC for approval, including recruitment and education materials and responses to questions from IRB/IEC to support a submission. Intended to include a list of attachments or table of contents of submission dossier/package. The submitted study documents such as Investigator Brochure, Informed Consent Forms, etc. may or may not be filed as a complete Dossier within this Artifact.', true, true, true, true, 'M', '13', 'Submission Date', '03', 'E.1.9 5.6.3 7.1 9.2.2.h 10.4.C', 73),
  ('066', '04.01.02', '04', '04.01', 'IRB or IEC Decision', 'Core', 'Documentation received from IRB/IEC in response to submission indicating decision of the trial and any specifications or modifications. Records referenced by the approval (such as a Protocol that has been approved) should be filed elsewhere in the TMF, as appropriate, as long as there is identification of the approved record within the IRB/IEC letter.', true, true, true, true, 'M', '13', 'Approval Date', '03', 'E.1.9 E 1.11 E.2.4 5.6.3 5.6.4.e 5.6.4.a 7.1 7.5.1. 9.2.2 h 9.2.3 b 9.2.4.5.o 10.4 c 9.2.4.5 o', 74),
  ('067', '04.01.03', '04', '04.01', 'IRB or IEC Composition', 'Core', 'Documentation that the IRB/IEC consists of a reasonable number of members who collectively have the qualifications and experience to review and evaluate the science, medical aspects and ethics of the proposed trial.', true, true, true, true, 'M', '13', 'Effective Date', '03', 'E.1.10 5.6.3', 75),
  ('068', '04.01.04', '04', '04.01', 'IRB or IEC Documentation of Non-Voting Status', 'Core', 'Documentation verifying non-voting members of the IRB/IEC if the investigator or sub-investigator is on the IRB/IEC.', true, true, true, true, 'M', '13', 'Document Date', '03', 'E.1.10 5.6.3', 76),
  ('069', '04.01.05', '04', '04.01', 'IRB or IEC Compliance Documentation', 'Core', 'Documentation that the IRB/IEC is performing its function according to written operating procedures and is in compliance with GCP and applicable regulatory requirements.', true, true, true, true, 'M', '15', 'Document Date', '03', '', 77),
  ('070', '04.02.01', '04', '04.02', 'Other Submissions', 'Recommended', 'A set of documents describing the trial or changes/updates to the trial submitted to a committee other than the IRB/IEC for approval. To include: Submissions and Correspondence. The submitted study documents such as Investigator Brochure, Informed Consent Forms, etc. may or may not be filed as a complete dossier within this artifact.', true, true, true, true, 'R', '15', 'Submission Date', '03', '', 78),
  ('071', '04.02.02', '04', '04.02', 'Other Approvals', 'Core', 'Approval documentation received from a committee other than the IRB/IEC in response to submission indicating approval/acknowledgement of trial specifications or modifications. To include: Submissions and Correspondence.', true, true, true, true, 'D', '15', 'Approval Date', '03', '10.4 e', 79),
  ('072', '04.03.01', '04', '04.03', 'Notification to IRB or IEC of Safety Information', 'Core', 'To assure the IRB/IEC are promptly notified of all findings (new, important information on serious adverse events and or safety concerns) that could adversely affect the safety of subjects, impact the conduct of the trial or alter the IRB/IEC''s approval/favorable opinion to continue the trial. Notifications/Communication may include but are not limited to - periodic safety line listings, USADEs, SUSARs, CIOMS, MedWatch, Analysis of Similar Events, cover letters and/or IRB/IEC-specific reporting forms. The records referenced in these notifications may be filed as appropriate in Zone 07. May include IRB/IEC Acknowledgement of Receipt.', true, true, true, true, 'M', '28', 'Notification Date', '05', 'E.2.20 5.6.4 9.2.5c 10.4 d 10.8 c 7.4.2', 80),
  ('073', '04.03.02', '04', '04.03', 'IRB or IEC Progress Report', 'Core', 'Regular reports concerning trial conduct, other than safety reports, issued to the IRB/IEC by the sponsor/3rd Party and/or investigator.', true, true, true, true, 'M', '39', 'Submission Date', '06', 'E.2.22 5.6.4 9.2.3 h 9.2.4.5.O 10.4 10.8', 81),
  ('074', '04.03.03', '04', '04.03', 'IRB or IEC Notification of Trial Termination', 'Core', 'Document detailing the termination of a trial - whether upon completion or premature termination.', true, true, true, true, 'M', '32', 'Submission Date', '09', 'E.3.6 5.6.4 8.3 b 9.2.6 d 10.4 f', 82),
  ('075', '04.04.01', '04', '04.04', 'Relevant Communications', 'Core', 'Zone-specific agreements, significant discussions or relevant information, but not specifically listed in this Reference Model. Types of correspondence may include, but not limited to: letters, memo, electronic communications and faxes.', true, true, true, true, 'M', 'Per content', 'Correspondence Date', '11', 'E.2.11 9.2.3 b 10.4 a', 83),
  ('076', '04.04.02', '04', '04.04', 'Tracking Information', 'Recommended', 'Zone-specific documents developed for the purpose of tracking activities during the course of the trial.', true, false, true, false, 'R', '21', 'Last Entry Date', '11', '', 84),
  ('077', '04.04.03', '04', '04.04', 'Meeting Material', 'Core', 'Agenda, presentation materials and other documentation generated during an internal or external zone-related meeting which documents any agreements or significant discussions. Includes meeting minutes or Q&A, attendance sheets and any pre-meeting material.', true, false, true, false, 'D', '13', 'Meeting Start Date', '11', '', 85),
  ('078', '04.04.04', '04', '04.04', 'Filenote', 'Core', 'To document any decision or to clarify any information relating to this zone.', true, false, true, false, 'D', 'Per content', 'Filenote Date', '11', '', 86),
  ('079', '05.01.01', '05', '05.01', 'Site Contact Details', 'Recommended', 'To document contact information for primary points of contact at the site (e.g. Principal Investigator, Institution Name, Trial Coordinator, Contracts Person, etc.).', true, true, true, true, 'R', '7', 'Document Date', '03', 'E.1.8 A.1.4', 87),
  ('080', '05.01.02', '05', '05.01', 'Confidentiality Agreement', 'Core', 'A document between the sponsor and an outside party (Investigator or Institution) that defines the terms and basic criteria to assure that the party (or parties) receiving confidential information will maintain confidentiality and will not use that information for any purpose other than that described in the Agreement. May also be present in the Clinical Trial Agreement.', true, true, true, true, 'D', '7', 'Signature Date', '03', '6.9', 88),
  ('081', '05.01.03', '05', '05.01', 'Feasibility Documentation', 'Recommended', 'To document site feasibility for the given protocol.', true, true, true, true, 'D', '5', 'Document Date', '03', '6.8 9.2.1 9.2.4', 89),
  ('082', '05.01.04', '05', '05.01', 'Pre Trial Monitoring Report', 'Core', 'To document onsite visit to determine qualification of site to participate in the trial. For example may include the following documentation: EDC qualification, Confirmation Letters / Emails, site profile form.', true, false, true, false, 'D', '16', 'Visit Start Date', '03', 'E.1.21 6.8 9.2.1 b, 9.2.1 e 9.2.4.3 9.2.4.7 10.3.a 10.6 m 10.6 n', 90),
  ('083', '05.01.05', '05', '05.01', 'Sites Evaluated but not Selected', 'Recommended', 'Documentation related to sites evaluated but not selected for the trial.', true, false, true, false, 'D', '7', 'Document Date', null, '', 91),
  ('084', '05.02.01', '05', '05.02', 'Acceptance of Investigator Brochure', 'Recommended', 'To document that relevant and current scientific information about the investigational product has been provided to the investigator.', true, true, true, true, 'R', '16', 'Signature Date', '03', '', 92),
  ('085', '05.02.02', '05', '05.02', 'Protocol Signature Page', 'Core', 'To document investigator and sponsor agreement to the protocol.', true, true, true, true, 'M', '16', 'Signature Date', '03', '7.5.1 10.6 a Annex A', 93),
  ('086', '05.02.03', '05', '05.02', 'Protocol Amendment Signature Page', 'Core', 'To document investigator and sponsor agreement to the protocol amendment.', true, true, true, true, 'M', '16', 'Signature Date', '05', '7.5.1 10.6.a Annex A', 94),
  ('087', '05.02.04', '05', '05.02', 'Principal Investigator Curriculum Vitae', 'Core', 'To document qualifications and eligibility of the Principal Investigator to conduct trial and/or provide medical supervision of subjects. To include updates, one-page CVs and biographical sketches.', true, true, true, true, 'M', '16', 'Signature Date', '03', 'E.1.4 E.2.6 5.6.2.e 9.2.1 10.2.a 10.2.b D.13.c', 95),
  ('088', '05.02.05', '05', '05.02', 'Sub-Investigator Curriculum Vitae', 'Core', 'To document qualifications and eligibility of any sub-Investigators to conduct trial and/or provide medical supervision of subjects. Sub-Investigators include any individual member of the clinical trial team designated and supervised by the investigator at a trial site to perform critical study trial-related procedures and/or to make important trial-related decisions (e.g., associates, residents, research fellows). To include updates, one-page CVs and biographical sketches.', true, true, true, true, 'D', '16', 'Signature Date', '03', 'E.1.5 E.2.7 6.1 10.2.a', 96),
  ('089', '05.02.06', '05', '05.02', 'Other Curriculum Vitae', 'Core', 'To document qualifications and eligibility of site personnel other than the Principal Investigator or Sub-Investigators to conduct trial and/or provide medical supervision of subjects.', true, true, true, true, 'D', '16', 'Signature Date', '03', 'E.1.6 E.2.7 6.1 9.2.1 9.2.4.3 10.2.a', 97),
  ('090', '05.02.07', '05', '05.02', 'Site Staff Qualification Supporting Information', 'Recommended', 'To document site staff qualifications not previously outlined on CVs. May include list of studies, publications, training certificates for specific examinations, ICH-GCP training, site GCP or trial licensure, medical licenses, Human Subjects Protection Training, etc.', true, true, true, true, 'R', '16', 'Effective Date', '03', '9.2.1 g 6.8', 98),
  ('091', '05.02.08', '05', '05.02', 'Form FDA 1572', 'Core', 'For IND trial, 1572 must be completed globally for FDA submission.', true, true, true, true, 'M', '16', 'Signature Date', '03', 'E.1.12 10.3 b', 99),
  ('092', '05.02.09', '05', '05.02', 'Investigator Regulatory Agreement', 'Core', 'A regulatory statement from the investigator required by certain health authorities e.g. includes but is not limited to ''Qualified Investigator Undertaking'' form and ''Clinical Trial Site Information'' form required by Health Canada.', true, true, true, true, 'M', '16', 'Signature Date', '03', 'E.1.12 6.9 9.2.1.a', 100),
  ('093', '05.02.10', '05', '05.02', 'Financial Disclosure Form', 'Core', 'To document financial disclosures, certification documentation and conflicts of interest, which include but are not limited to: completed disclosure forms of financial interests and arrangements of clinical investigators.', true, true, true, true, 'M', '16', 'Signature Date', '03', 'E.1.14 E.1.33 E.2.30 9.2.1 D 9.2.2 F 10.2 c', 101),
  ('094', '05.02.11', '05', '05.02', 'Data Privacy Agreement', 'Recommended', 'To document agreement between sponsor and Site Staff (e.g., national or regional data privacy requirements); often contained in Clinical Trial Agreement.', true, true, true, true, 'R', '16', 'Signature Date', '03', '', 102),
  ('095', '05.02.12', '05', '05.02', 'Clinical Trial Agreement', 'Core', 'To document agreement of trial requirements between sponsor or 3rd Party and site/ PI. Includes indemnity unless separate document created.', true, true, true, true, 'D', '16', 'Signature Date', '03', 'E.1.12 E.1.14 6.9 9.2.1a 9.2.2.F 10.3 a', 103),
  ('096', '05.02.13', '05', '05.02', 'Indemnity', 'Core', 'To provide legal protection "as required by country regulations" in the event of an unforeseen adverse circumstance arising during the course of a clinical trial. May be in Clinical Trial Agreement.', true, true, true, true, 'D', '16', 'Effective Date', '03', 'E 1.15 5.6.2 j 9.2.2 e', 104),
  ('097', '05.02.14', '05', '05.02', 'Other Financial Agreement', 'Core', 'To document agreement of trial requirements between other parties involved in the conduct of the trial. Includes indemnity unless separate document created.', true, true, true, true, 'D', '6', 'Signature Date', '03', 'E.1.34 6.9 10.1', 105),
  ('100', '05.02.17', '05', '05.02', 'IP Site Release Documentation', 'Recommended', 'To document approval for sites to receive drug supply / investigational product.', true, false, true, false, 'D', '16', 'Signature Date', '03', '', 106),
  ('101', '05.02.18', '05', '05.02', 'Site Signature Sheet', 'Core', 'To document delegation by the Principal Investigator of trial specific tasks to site personnel conducting the trial.', true, true, true, true, 'M', '16', 'Signature Date', '03', 'E.1.7 E.2.12 7.2 9.2.1 e 9.2.2.d 9.2.4.4 b 9.2.4.5.b', 107),
  ('240', '05.02.19', '05', '05.02', 'Investigators Agreement (Device)', 'Core', 'Non-financial agreement between the sponsor and the investigator documenting the various responsibilities, as outlined in CFR Title 21 part 812 as well as ICH-E6 (if applicable), in which the investigator will comply.', false, false, true, true, 'D', '16', 'Signature Date', '03', 'E1.12 6.9 9.2.1 a', 108),
  ('255', '05.02.20', '05', '05.02', 'Coordinating Investigator Documentation', 'Recommended', 'Documentation to show the approval of a coordinating investigator for a specific region or group of investigators that is not already captured as another artifact for that investigator. Documentation related to a Country''s National Coordinator when they are not participating as an Investigator in the trial.', true, true, true, true, 'R', '10', 'Document Date', null, '', 109),
  ('102', '05.03.01', '05', '05.03', 'Trial Initiation Monitoring Report', 'Core', 'To document that trial procedures were reviewed with the investigator and the trial personnel and confirm the site meets requirements to begin trial participation. Trial initiation can be conducted via an Investigator Meeting, visit at the site and/or other contact. May include confirmation letters/emails.', true, true, true, true, 'D', '19', 'Visit Start Date', '03', 'E.1.22 E.1.24 7.2 9.2.4.4 9.2.4.7', 110),
  ('103', '05.03.02', '05', '05.03', 'Site Training Material', 'Core', 'Training materials used to train the sites. Materials may be related to, but not limited to, Electronic Data Capture (EDC), Interactive Response Technology (IRT), Rater training. (Also includes training done after site initiation.)', true, true, true, true, 'D', '16', 'Version Date', '03', '10.2 b', 111),
  ('104', '05.03.03', '05', '05.03', 'Site Evidence of Training', 'Core', 'To document completion of site training by relevant site personnel. Documentation includes attendance and certification for training delivered which may include Electronic Data Capture (EDC), Interactive Response Technology (IRT), Rater training, etc.', true, true, true, true, 'M', '16', 'Training Date', '03', 'E.1.29 9.2.1 h', 112),
  ('105', '05.04.01', '05', '05.04', 'Subject Log', 'Core', 'To anonymously list all subjects including screened, screen failures and enrolled for the sponsor.', true, true, true, true, 'M', '17', 'Signature Date', '11', 'E.2.23 7.5.2 7.10', 113),
  ('106', '05.04.02', '05', '05.04', 'Source Data Verification', 'Recommended', 'To document source data and associated verification activity.', true, true, true, true, 'D', '20', 'Signature Date', '11', 'E.1.23 E.2.15 7.5.3 9.2.4.5.g 10.6 c', 114),
  ('107', '05.04.03', '05', '05.04', 'Monitoring Visit Report', 'Core', 'To document site visits, monitoring trial conduct and compliance of the site, may include confirmation letters/emails.', true, false, true, false, 'D', '19', 'Visit Start Date', '04', 'E.2.10 9.2.3 c 9.2.3 e 9.2.4.7', 115),
  ('108', '05.04.04', '05', '05.04', 'Visit Log', 'Core', 'To document monitoring visit dates and attendees.', true, true, true, true, 'D', '19', 'Last Visit Date', '09', '', 116),
  ('109', '05.04.05', '05', '05.04', 'Additional Monitoring Activity', 'Core', 'To document additional sponsor and/or study-specific monitoring activities.', true, false, true, false, 'D', '19', 'Document Date', '11', '', 117),
  ('110', '05.04.06', '05', '05.04', 'Protocol Deviations', 'Core', 'To document non-compliance/ deviations to the protocol. This may also be a consolidated list for a country filed at the country level or a consolidated list for the study filed at the study level.', true, true, true, true, 'M', '19', 'Signature Date', '11', '10.4 e 10.6 g 10.6 o', 118),
  ('111', '05.04.07', '05', '05.04', 'Financial Documentation', 'Recommended', 'Includes all invoices, receipts, payment summaries relating to the trial.', true, true, true, true, 'R', '24', 'Document Date', '03', '', 119),
  ('112', '05.04.08', '05', '05.04', 'Final Trial Close Out Monitoring Report', 'Core', 'To document trial activities are completed for site closure prior to trial completion. May include confirmation letters/emails.', true, false, true, false, 'D', '34', 'Visit Start Date', '09', 'E.3.5 9.2.4.6 9.2.4.7', 120),
  ('113', '05.04.09', '05', '05.04', 'Notification to Investigators of Safety Information', 'Core', 'To assure investigators are promptly notified of all findings (new, important information on serious adverse events and or safety concerns) that could adversely affect the safety of subjects, impact the conduct of the trial or alter their IRB/IEC''s approval/favorable opinion to continue the trial. Notifications may include but are not limited to Safety line listings, SUSARs, CIOMS, MedWatch, Analysis of Similar Events, cover letters and/or country-specific reporting forms.', true, true, true, true, 'D', '28', 'Notification Date', '05', 'E.2.21 9.2.5', 121),
  ('234', '05.04.10', '05', '05.04', 'Subject Identification Log', 'Core', 'To fully identify all subjects screened, screen failed and enrolled in the trial, with unique institution identifiers where relevant.', false, true, false, true, 'M', '17', 'Signature Date', '11', 'E.2.24 E.3.3 7.5.2', 122),
  ('235', '05.04.11', '05', '05.04', 'Source Data', 'Core', 'To document and confirm source data information at the Investigator site (i.e. medical records containing history of subjects).', false, true, false, true, 'M', '18', 'Document Date', '11', 'E 2.13 E.2.14 7.5.3 7.8.2 10.6 c 10.6 q 10.7 f 7.8.1', 123),
  ('241', '05.04.12', '05', '05.04', 'Monitoring Visit Follow-up Documentation', 'Core', 'To document site visit follow-up. Could be grouped with monitoring visit reports.', true, true, true, true, 'D', '19', 'Visit Start Date', '11', 'E.1.24 E 2.10 9.2.3.c 9.2.3.e 9.2.4.7', 124),
  ('256', '05.04.13', '05', '05.04', 'Subject Eligibility Verification Forms and Worksheets', 'Recommended', 'Eligibility forms for qualification of trial subjects, may include inclusion/exclusion criteria, lab reports, doctor notes and other qualifying data usually used by (site) staff to ensure subjects are eligible, per protocol, for the study.', true, true, true, true, 'R', '17', 'Document Date', '11', '', 125),
  ('114', '05.05.01', '05', '05.05', 'Relevant Communications', 'Core', 'Zone-specific agreements, significant discussions or relevant information, but not specifically listed in this Reference Model. Types of correspondence may include, but not limited to: letters, memo, electronic communications and faxes. Should not include monitoring visit follow-up letter.', true, true, true, true, 'D', 'Per content', 'Correspondence Date', '11', 'E.2.11 9.2.3 b 9.2.3.c 9.2.4.5.D 10.6 e 10.6 h', 126),
  ('115', '05.05.02', '05', '05.05', 'Tracking Information', 'Recommended', 'Zone-specific documents developed for the purpose of tracking activities during the course of the trial.', true, true, true, true, 'R', 'Per content', 'Last Entry Date', '11', '', 127),
  ('116', '05.05.03', '05', '05.05', 'Meeting Material', 'Core', 'Agenda, presentation materials and other documentation generated during an internal or external zone-related meeting which documents any agreements or significant discussions. Includes meeting minutes or Q&A, attendance sheets and any pre-meeting material.', true, true, true, true, 'D', '25', 'Meeting Start Date', '11', '', 128),
  ('117', '05.05.04', '05', '05.05', 'Filenote', 'Core', 'To document any decision or to clarify any information relating to this zone.', true, true, true, true, 'D', '19', 'Filenote Date', '11', '', 129),
  ('118', '06.01.01', '06', '06.01', 'IP Supply Plan', 'Recommended', 'To describe the following as they pertain to the IP: 1) quantity and packaging of active, placebo and/or if applicable, comparator or rescue supplies needed to fulfill the requirements of the trial protocol over the life of the trial, as well as blinding plan (if applicable) and 2) acceptable storage temperatures and conditions, storage times, reconstitution fluids and procedures and devices for product infusion. Artifact can include any evidence of plan execution including, but not limited to: plan, reports, checklists, etc.', true, false, true, false, 'D', '22', 'Version Date', null, '7.4.3 7.9', 130),
  ('119', '06.01.02', '06', '06.01', 'IP Instructions for Handling', 'Core', 'To instruct on how the IP should be handled during transit and stored upon arrival at the distribution center, depot and/or trial site. Should address expectations for adequate and safe receipt, handling, storage, dispensing, retrieval of unused product from subjects and return of unused IP to the sponsor (or their delegate). If appropriate to the trial, includes preparation of the IP leading to administration and administration instructions.', true, true, true, true, 'D', '22', 'Version Date', null, '10.2 b Annex B.2.F Annex I.7.C.3', 131),
  ('120', '06.01.03', '06', '06.01', 'IP Sample Label', 'Core', 'A sample of each IP label type (for every pack and every language) to be used in the trial; approval status must be clear. All stages of label text development are included within this artifact.', true, true, true, true, 'D', '22', 'Version Date', null, 'E.1.3 6.10. Annex I.7 Annex B (B.2.g)', 132),
  ('121', '06.01.04', '06', '06.01', 'IP Shipment Documentation', 'Core', 'To record details of the shipment process including approval, requests, dispatch, tracking and receipts to/from a distribution center, depot and/or trial site.', true, true, true, true, 'D', '22', 'Shipment Date', '03', 'E. 1.16 E. 2. 8 7.9 9.2.2 C 9.2.3 a 9.2.4.5 n 10.6 K', 133),
  ('122', '06.01.05', '06', '06.01', 'IP Accountability Documentation', 'Core', 'To document records of the allocation of IP to/from a distribution center, depot, trial site and/or site to subject and the reconciliation of IP prior to return to the sponsor.', true, true, true, true, 'D', '22', 'Last Entry Date', '09', 'E.1.16 E.2.8 E2.25 E.3.1 7.9 8.3 a 9.2.2 C 9.2.3 a 9.2.4.5.n 10.6 k 10.6 q Annex I.7.C.1', 134),
  ('123', '06.01.06', '06', '06.01', 'IP Transfer Documentation', 'Core', 'To document the process and approval for the transfer of IP from one depot to another depot and/or from one site to another site (within or across protocols). Examples include sponsor approval for transfer and evidence of consultation with Qualified Person (QP).', true, true, true, true, 'D', '22', 'Transfer Date', '05', '', 135),
  ('124', '06.01.07', '06', '06.01', 'IP Re-labeling Documentation', 'Core', 'To document the plan for the re-labeling process to occur at the distribution center, depot and/or site and confirmation records that the re-labeling occurred.', true, true, true, true, 'D', '22', 'Document Date', '05', '6.10 Annex I.7 C 2', 136),
  ('125', '06.01.08', '06', '06.01', 'IP Recall Documentation', 'Core', 'To document the plan for the recall process for the IP to occur at a distribution center, depot and/or site; will include confirmation records that the recall occurred.', true, true, true, true, 'D', '22', 'Recall Date', '05', '9.2.2.D', 137),
  ('126', '06.01.09', '06', '06.01', 'IP Quality Complaint Form', 'Core', 'To document or record an IP quality complaint.', true, true, true, true, 'D', '22', 'Complaint Date', '05', '7.4.3 9.1.a', 138),
  ('127', '06.01.10', '06', '06.01', 'IP Return Documentation', 'Core', 'To record details of returns to/from a distribution center, depot and/or trial site. Examples include courier documentation and packing/ inventory listing.', true, true, true, true, 'D', '33', 'Return Date', '09', 'E.1.16 E.3.2 7.9 8.3 a 9.2.2.C 9.2.3 a 9.2.45.n 10.6 k 7.4.3', 139),
  ('128', '06.01.11', '06', '06.01', 'IP Certificate of Destruction', 'Core', 'To document the confirmation of destruction of IP at the end of a trial at a distribution center, depot and/or site.', true, true, true, true, 'D', '33', 'Destruction Date', '09', 'A.11, D.7 c, E.1.17 , 10.6.k, 10.6.l', 140),
  ('242', '06.01.12', '06', '06.01', 'IP Retest and Expiry Documentation', 'Core', 'To document the batch retesting/analyses of IP for a variety of reasons such as stability confirmation and expiry extension.', true, true, true, true, 'D', '22', 'Document Date', '11', '', 141),
  ('129', '06.02.01', '06', '06.02', 'QP (Qualified Person) Certification', 'Core', 'To confirm that any IP from another country has been manufactured and checked in accordance with standards of Good Manufacturing Practices (GMP) at least equivalent to those laid down in Directive 91/356/EEC. Documents the technical release documentation including GMP certification and the name / address of the manufacturer.', true, true, true, true, 'D', '22', 'Effective Date', null, '', 142),
  ('130', '06.02.02', '06', '06.02', 'IP Regulatory Release Documentation', 'Core', 'To document the regulatory IP release process.', true, false, true, false, 'D', '22', 'Release Date', null, 'B.2.D', 143),
  ('131', '06.02.03', '06', '06.02', 'IP Verification Statements', 'Core', 'Any certificate, license or other documentation that is required by a specific regulation to verify the quality, source, manufacture, ingredients or other aspect of investigational and/or control product. Examples include TSE certificate, Controlled IP storage, DEA 223 and GMP Manufacturer''s License.', true, true, true, true, 'D', '22', 'Document Date', '10', 'B.2.D', 144),
  ('132', '06.02.04', '06', '06.02', 'Certificate of Analysis', 'Core', 'To document identity, purity and strength of the IP(s) to be used trial, in accordance with the specifications of the IP, including the acceptance limits and the actual results of the tests.', true, false, true, false, 'D', '22', 'Version Date', null, '', 145),
  ('133', '06.03.01', '06', '06.03', 'IP Treatment Allocation Documentation', 'Core', 'To document the treatment allocation or device serial numbers for each subject; used if urgent unblinding or code break is needed or when interim or final unblinding occurs.', true, true, true, true, 'D', '22', 'Document Date', '03', '10.6 k A.6.1.B', 146),
  ('134', '06.03.02', '06', '06.03', 'IP Unblinding Plan', 'Core', 'To describe the plan and procedures to be taken should the action of breaking the blind for an individual subject be urgently needed, or when interim or final unblinding occurs.', true, true, true, true, 'D', '12', 'Version Date', '03', 'E.1.20 7.8.1 A 16 b 10.7.e', 147),
  ('135', '06.03.03', '06', '06.03', 'IP Treatment Decoding Documentation', 'Core', 'To document the action of breaking the blind for an individual subject, urgently if needed, or when interim or final unblinding occurs. Treatment unblinding may be controlled by interactive response technology (IRT) and or manually using code break envelopes.', true, true, true, true, 'D', '30', 'Document Date', '05', '', 148),
  ('136', '06.04.01', '06', '06.04', 'IP Storage Condition Documentation', 'Core', 'To document the unique storage conditions of the IP at the sponsor (if sponsor is distributing), distribution center, depot, trial site and in transit, if required by the available stability requirements of the IP.', true, true, true, true, 'D', '22', 'Document Date', '09', 'D.6.1.5', 149),
  ('137', '06.04.02', '06', '06.04', 'IP Storage Condition Excursion Documentation', 'Core', 'To record excursions for IP, from the acceptable pre-defined condition range either during transit or storage at a distribution center, depot and/or trial site.', true, true, true, true, 'D', '22', 'Document Date', '05', '', 150),
  ('243', '06.04.03', '06', '06.04', 'Maintenance Logs', 'Core', 'To record activities and times when quality of condition of IP, Non-IP, device and other trial supplies is assessed over period of use and any maintenance performed, including software logs and certificates of calibration.', true, true, true, true, 'D', '22', 'Last Entry Date', '09', 'E.1.31 E.2.28 9.2.4.5.p, 10.6 i', 151),
  ('138', '06.05.01', '06', '06.05', 'Non-IP Supply Plan', 'Recommended', 'To describe the details and quantity of non-IP supplies needed to fulfill the trial protocol requirements over the life of the trial. May include but is not limited to, supplementary medication, pre-treatment, other prophylactic therapies, drug delivery supplies (IV tubing, syringes, etc.) and measurement tools such as thermometers, respirometers, etc. Artifact can include any evidence of plan execution including, but not limited to: plan, reports, checklists, etc.', true, false, true, false, 'D', '23', 'Version Date', null, '', 152),
  ('139', '06.05.02', '06', '06.05', 'Non-IP Shipment Documentation', 'Recommended', 'To record details of the shipment of non-IP supplies needed to fulfill the trial protocol requirements to a distribution center, depot and/or site.', true, true, true, true, 'D', '23', 'Shipment Date', '11', 'E.1.17 E.2.9 9.2.2.a 9.2.2.d 9.2.4.4.a 9.2.4.4.d', 153),
  ('140', '06.05.03', '06', '06.05', 'Non-IP Return Documentation', 'Recommended', 'To inventory the returns of certain non-IP supplies needed to fulfill the trial protocol requirements to a distribution center, depot and/or site. Examples include courier documentation and packing/ inventory listing.', true, true, true, true, 'D', '23', 'Return Date', '10', 'E.1.17 E.2.9 9.2.2.a 9.2.2.d 9.2.4.4.a 9.2.4.4.d', 154),
  ('259', '06.05.04', '06', '06.05', 'Non-IP Storage Documentation', 'Recommended', 'To document the unique storage conditions of the Non-IP supplies at the sponsor (if sponsor is distributing), distribution center, depot, trial site and in transit, if required by the available stability requirements of the non-IP supplies. To record excursions for non-IP supplies, from the acceptable pre-defined condition range either during transit or storage at a distribution center, depot and/or trial site.', true, true, true, true, 'D', '23', 'Document Date', '10', '', 155),
  ('141', '06.06.01', '06', '06.06', 'IRT User Requirement Specification', 'Core', 'To document end user requirements from design and capabilities of an interactive response technology (IRT) such as Interactive Voice Response System (IVRS) or Interactive Web Response System (IWRS), included but not limited to screening, randomization or drug allocation. May also include technical aspects of the system development.', true, false, true, false, 'D', '22', 'Version Date', null, 'A.8.B 7.8.3', 156),
  ('142', '06.06.02', '06', '06.06', 'IRT Validation Certification', 'Core', 'To confirm the validation status of the interactive response technology (IRT).', true, false, true, false, 'D', '22', 'Certification Date', null, '', 157),
  ('143', '06.06.03', '06', '06.06', 'IRT User Acceptance Testing (UAT) Certification', 'Core', 'To document the acceptability of the series of assessments of the IRT performed by key users of the system that are designed to show that the IRT has been correctly programmed and meets the requirements of the User Requirements Specification (URS). Minimally, the signature page and may include validation or other documentation.', true, false, true, false, 'D', '22', 'Certification Date', null, 'B.3.E', 158),
  ('144', '06.06.04', '06', '06.06', 'IRT User Manual', 'Core', 'To provide instructions and define the operational instructions for the IRT for the user.', true, true, true, true, 'D', '22', 'Version Date', null, '', 159),
  ('145', '06.06.05', '06', '06.06', 'IRT User Account Management', 'Core', 'To capture account management details for all users who received access to the system; should include security role, data account granted, date account disabled.', true, true, true, true, 'D', '22', 'Document Date', '11', '', 160),
  ('146', '06.07.01', '06', '06.07', 'Relevant Communications', 'Core', 'Zone-specific agreements, significant discussions or relevant information, but not specifically listed in this Reference Model. Types of correspondence may include, but not limited to: letters, memo, electronic communications and faxes.', true, true, true, true, 'D', 'Per content', 'Correspondence Date', '11', 'E 2.11 9.2.3 c 9.2.4.5 o 10.6 h', 161),
  ('147', '06.07.02', '06', '06.07', 'Tracking Information', 'Recommended', 'Zone-specific documents developed for the purpose of tracking activities during the course of the trial.', true, false, true, false, 'D', 'Per content', 'Last Entry Date', '11', '', 162),
  ('148', '06.07.03', '06', '06.07', 'Meeting Material', 'Core', 'Agenda, presentation materials and other documentation generated during an internal or external zone-related meeting which documents any agreements or significant discussions. Includes meeting minutes or Q&A, attendance sheets and any pre-meeting material.', true, false, true, false, 'D', 'Per content', 'Meeting Start Date', null, '', 163),
  ('149', '06.07.04', '06', '06.07', 'Filenote', 'Core', 'To document any decision or to clarify any information relating to this zone.', true, false, true, false, 'D', 'Per content', 'Filenote Date', '11', '', 164),
  ('150', '07.01.01', '07', '07.01', 'Safety Management Plan', 'Core', 'To describe the end-to-end process for the ongoing safety evaluation for the investigational product; includes data to be collected, reporting objectives and processes for a clinical trial. Plan may include but is not limited to: associated documents for quality management, safety database entry specifications and templates and/or coding guidelines. This artifact may not be trial specific, thus may include a reference to appropriate SOP(s) or program/IP level plans. One example of where this artifact would be expected to be trial-specific is when a CRO performs this function for a single trial.', true, false, true, false, 'M', '12', 'Version Date', null, '10.8 a 7.4.1', 165),
  ('151', '07.01.02', '07', '07.01', 'Pharmacovigilance Database Line Listing', 'Core', 'Listing of trial data for a single study trial used for a variety of safety evaluation of the investigational product purposes (e.g. Serious Adverse Events (SAE) case listings, database line listings, etc.). This artifact may not be trial specific, thus may include a reference to program/IP level records. One example of where this artifact would be expected to be trial-specific is when a CRO performs this function for a single trial.', true, true, true, true, 'D', '28', 'Report Date', null, '7.4.2', 166),
  ('152', '07.02.01', '07', '07.02', 'Expedited Safety Report', 'Core', 'To document unexpected serious adverse drug reactions and other safety information; submitted to regulatory authorities and IRBs/IECs. Submission artifact is located in 03.03.01.', true, true, true, true, 'M', '28', 'Report Date', '05', '10.8 b 7.4', 167),
  ('153', '07.02.02', '07', '07.02', 'SAE Report', 'Core', 'To organize critical data around a serious adverse event, adverse event and/or a laboratory abnormality as identified in the protocol. Reports may include, but are not limited to: specific investigator SAE report forms and supporting data, reporter correspondence, associated note-to-files, source documentation, case logs, narratives, case unblinding forms and/or safety database case printouts.', true, true, true, true, 'M', '28', 'Report Date', '05', 'E.2.17 7.4 9.2.4.5.k 9.2.4.5.L 9.2.5 10.8 D 13 g', 168),
  ('154', '07.02.03', '07', '07.02', 'Pregnancy Report', 'Core', 'To organize critical data around a pregnancy that occurred whilst either the male or the female subject was participating in a clinical trial. Reporting forms and supporting data collected for pregnancy cases and their outcome. Reports may include but are not limited to specific regulatory forms and supporting data, reporter correspondence, associated note-to-files, source documentation, case logs, case unblinding form, narratives and/or safety database case printouts.', true, true, true, true, 'M', '28', 'Report Date', '05', '', 169),
  ('155', '07.02.04', '07', '07.02', 'Special Events of Interest', 'Core', 'To organize critical data around a special event of interest, one that is of scientific and medical concern specific to the product or program. Usually requested by or submitted to Regulatory Agencies. Reports may include but are not limited to specific regulatory forms and supporting data, reporter correspondence, associated note-to-files, source documentation, case logs, narratives, case unblinding forms and/or safety database case printouts.', true, true, true, true, 'D', '29', 'Report Date', '05', '', 170),
  ('156', '07.03.01', '07', '07.03', 'Relevant Communications', 'Core', 'Zone-specific, trial specific agreements, significant discussions or relevant information, but not specifically listed in this Reference Model. Types of correspondence may include, but not limited to: letters, memo, electronic communications and faxes. (Does not include program level communications.)', true, true, true, true, 'M', '28', 'Correspondence Date', '11', 'E 2.11 9.2.3 c 9.2.4.5 O 10.6 h', 171),
  ('157', '07.03.02', '07', '07.03', 'Tracking Information', 'Recommended', 'Zone-specific, trial specific documents developed for the purpose of tracking activities during the course of the trial. (Does not include program level tracking information.)', true, false, true, false, 'D', '21', 'Last Entry Date', '11', '', 172),
  ('158', '07.03.03', '07', '07.03', 'Meeting Material', 'Core', 'Agenda, presentation materials and other documentation generated during an internal or external zone-related, trial specific meeting which documents any agreements or significant discussions. Includes meeting minutes or Q&A, attendance sheets and any pre-meeting material. (Does not include program level meeting material.)', true, false, true, false, 'D', '21 / 28', 'Meeting Start Date', null, '', 173),
  ('159', '07.03.04', '07', '07.03', 'Filenote', 'Core', 'To document any decision or to clarify any information relating to this zone.', true, false, true, false, 'D', 'Per content', 'Filenote Date', '11', '10.8 e', 174),
  ('160', '08.01.01', '08', '08.01', 'Certification or Accreditation', 'Core', 'To document recognition and approval by an authorized accrediting body applying known acceptable standards, that the central or local facility is competent to perform required test(s) and support reliability of results; if applicable.', true, true, true, true, 'D', '8', 'Effective Date', '03', 'E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t', 175),
  ('161', '08.01.02', '08', '08.01', 'Laboratory Validation Documentation', 'Core', 'To document through use of control data that a central or local laboratory can consistently and reproducibly report results that are reliable; may include but is not limited to reporting of calibration and control results for a research test parameter, antibody or pharmacokinetic testing that may be performed by an internal or external central or local laboratory; required if certification or accreditation is not available for the study test method.', true, false, true, false, 'D', '8', 'Document Date', '03', 'E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t', 176),
  ('162', '08.01.03', '08', '08.01', 'Laboratory Results Documentation', 'Core', 'Summary listings or individual subject reports provided by the central or local laboratory or other testing facility, e.g. results of biochemical testing, histological examination.', true, true, true, true, 'D', '18', 'Document Date', '11', 'E.2.29', 177),
  ('163', '08.01.04', '08', '08.01', 'Normal Ranges', 'Core', 'To define acceptable limits (where 95% of the population that a central or local facility serves will fall) for comparative interpretation that allow for medical decisions to be made; may be included in User Manual.', true, true, true, true, 'D', '5', 'Effective Date', '03', 'E.1.30 E.2.27 9.2.4.5.q', 178),
  ('164', '08.01.05', '08', '08.01', 'Manual', 'Recommended', 'To outline the procedures to be followed in the collection, handling and shipping of samples; may not be available for local facilities.', true, true, true, true, 'D', '4', 'Version Date', '03', '', 179),
  ('165', '08.01.06', '08', '08.01', 'Supply Import Documentation', 'Core', 'To provide the necessary documentation required per country to allow for importation of supplies (non-drug / IP), may also include biological samples and related test material (kits, etc.).', true, false, true, false, 'D', '22', 'Document Date', '03', '', 180),
  ('166', '08.01.07', '08', '08.01', 'Head of Facility Curriculum Vitae', 'Recommended', 'To verify that the Head of Facility is suitably qualified to lead and oversee the management and reporting of results; may be included with Certification / Accreditation; may be found in the User Manual.', true, true, true, true, 'D', '25', 'Signature Date', '03', 'E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t', 181),
  ('167', '08.01.08', '08', '08.01', 'Standardization Methods', 'Core', 'To confirm that two or more central or local facilities can perform the same test / procedure and obtain consistent results; includes but may not be limited to cross-calibration of test methods between assays or facilities or phantom data or bioanalytical assay.', true, false, true, false, 'D', '8', 'Document Date', '03', '', 182),
  ('168', '08.02.01', '08', '08.02', 'Specimen Label', 'Recommended', 'To capture critical information about the collection of a sample; may include but is not limited to subject ID, date and time of collection, etc.; may be included in User Manual.', true, false, true, false, 'D', '4', 'Version Date', '03', '', 183),
  ('169', '08.02.02', '08', '08.02', 'Shipment Records', 'Recommended', 'To provide relevant details for samples sent in any one shipment.', true, true, true, true, 'D', '22', 'Shipment Date', '11', '', 184),
  ('170', '08.02.03', '08', '08.02', 'Sample Storage Condition Log', 'Recommended', 'To monitor and track sample storage under the appropriate conditions.', true, true, true, true, 'D', '22', 'Document Date', '11', '', 185),
  ('171', '08.02.04', '08', '08.02', 'Sample Import or Export Documentation', 'Core', 'To provide the necessary documentation required per country to allow for importation/exportation of samples.', true, true, true, true, 'D', '6', 'Document Date', '03', '', 186),
  ('172', '08.02.05', '08', '08.02', 'Record of Retained Samples', 'Core', 'To document location and identification of body fluid, tissue samples or genetic samples being held for possible future (re)testing; to include destruction records, when and if this occurs.', true, true, true, true, 'D', '20', 'Document Date', '03', '', 187),
  ('173', '08.03.01', '08', '08.03', 'Relevant Communications', 'Core', 'Zone-specific agreements, significant discussions or relevant information, but not specifically listed in this Reference Model. Types of correspondence may include, but not limited to: letters, memo, electronic communications and faxes.', true, true, true, true, 'D', 'Per content', 'Correspondence Date', '11', 'E 2.11 9.2.3 c 9.2.4.5 o 10.6 h', 188),
  ('174', '08.03.02', '08', '08.03', 'Tracking Information', 'Recommended', 'Zone-specific documents developed for the purpose of tracking activities during the course of the trial.', true, false, true, false, 'D', 'Per content', 'Last Entry Date', '11', '', 189),
  ('175', '08.03.03', '08', '08.03', 'Meeting Material', 'Core', 'Agenda, presentation materials and other documentation generated during an internal or external zone-related meeting which documents any agreements or significant discussions. Includes meeting minutes or Q&A, attendance sheets and any pre-meeting material.', true, false, true, false, 'D', '6', 'Meeting Start Date', '11', '', 190),
  ('176', '08.03.04', '08', '08.03', 'Filenote', 'Core', 'To document any decision or to clarify any information relating to this zone.', true, false, true, false, 'D', '20', 'Filenote Date', '11', '', 191),
  ('177', '09.01.01', '09', '09.01', 'Qualification and Compliance', 'Core', 'To confirm that a third party meets all relevant criteria to fulfill a contractual obligation; may include a quality questionnaire, a visit report to qualify their capabilities, other documents that support capabilities.', true, false, true, false, 'D', '8', 'Document Date', null, 'E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t', 192),
  ('257', '09.01.02', '09', '09.01', 'Third Party Curriculum Vitae', 'Core', 'To document qualifications and eligibility of Individual Third Party Trial Team Members; CVs, Questionnaires etc. including translators, for the project. Not intended to duplicate records filed in Zones 1 and 5 (sponsor & investigator).', true, false, true, false, 'D', '8', 'Signature Date', null, 'E.1.32 E.2.29 6.1 7.11 9.1 9.2.1 9.2.4.5.o 9.2.4.5.t', 193),
  ('258', '09.01.03', '09', '09.01', 'Ongoing Third Party Oversight', 'Recommended', 'To confirm throughout the duration of a study that a third party continues to meet all relevant criteria to fulfill a contractual obligation.', true, false, true, false, 'D', '8', 'Document Date', null, 'J.2.f.15', 194),
  ('178', '09.02.01', '09', '09.02', 'Confidentiality Agreement', 'Core', 'To confirm by written legal agreement that key information between parties will be prevented from being inappropriately disclosed. May be included in another contractual agreement.', true, false, true, false, 'D', '8', 'Signature Date', null, 'E.1.13 6.9 9.2.1.a', 195),
  ('179', '09.02.02', '09', '09.02', 'Vendor Selection', 'Recommended', 'To identify how a third party was selected. May include details of other third parties short-listed, master vendor list and any assessments carried out prior to selection.', true, false, true, false, 'D', '8', 'Document Date', null, '', 196),
  ('180', '09.02.03', '09', '09.02', 'Contractual Agreement', 'Core', 'To document by a written dated signed agreement between two or more parties that defines any arrangements on delegation and distribution of tasks and obligations (including financial obligations); critical components include service description and budget.', true, false, true, false, 'D', '7', 'Signature Date', null, 'E.1.13 6.9 9.2.1.a', 197),
  ('182', '09.03.01', '09', '09.03', 'Relevant Communications', 'Core', 'Zone-specific agreements, significant discussions or relevant information, but not specifically listed in this Reference Model. Types of correspondence may include, but not limited to: letters, memo, electronic communications and faxes.', true, false, true, false, 'D', '25', 'Correspondence Date', null, 'E 2.11 9.2.3 c 9.2.4.5 o 10.6.h', 198),
  ('183', '09.03.02', '09', '09.03', 'Tracking Information', 'Recommended', 'Zone-specific documents developed for the purpose of tracking activities during the course of the trial.', true, false, true, false, 'D', 'Per content', 'Last Entry Date', null, '', 199),
  ('184', '09.03.03', '09', '09.03', 'Meeting Material', 'Core', 'Agenda, presentation materials and other documentation generated during an internal or external zone-related meeting which documents any agreements or significant discussions. Includes meeting minutes or Q&A, attendance sheets and any pre-meeting material.', true, false, true, false, 'D', '25', 'Meeting Start Date', null, '9.2.4.2.c', 200),
  ('185', '09.03.04', '09', '09.03', 'Filenote', 'Core', 'To document any decision or to clarify any information relating to this zone.', true, false, true, false, 'D', 'Per content', 'Filenote Date', null, '', 201),
  ('186', '10.01.01', '10', '10.01', 'Data Management Plan', 'Recommended', 'To identify the overall strategy for data management process for the trial; a compilation of documents that may include amendments/appendices but are not limited to: Completion Guidelines, Data Quality Plan, CRF Design Document, Database (build) Specification, Entry Guidelines, Database Testing.', true, false, true, false, 'D', '20', 'Version Date', null, '6.6 7.8.3.a', 202),
  ('187', '10.02.01', '10', '10.02', 'CRF Completion Requirements', 'Core', 'To provide detailed instructions on how data points on each CRF are to be completed; how to enter on paper and if EDC, how to enter data into the system.', true, true, true, true, 'M', '3', 'Version Date', null, '7.8.2', 203),
  ('188', '10.02.02', '10', '10.02', 'Annotated CRF', 'Recommended', 'To assign variable names and attributes to the fields on the CRF and to link the variables to the tables within the database; may also be used as an aid for database programming on how to structure the database; use for data extraction; may be generated at the time of regulatory submission.', true, false, true, false, 'D', '18', 'Version Date', null, '7.8.1 7.8.2 10.6 j', 204),
  ('190', '10.02.04', '10', '10.02', 'Documentation of Corrections to Entered Data', 'Core', 'Any documentation used to query database discrepancies and to record approved corrections to the clinical trial database; may include self-evident corrections, global queries, SAE queries, laboratory queries and any other database queries generated. Additionally, include any agreements per trial and site that trial personnel are permitted to perform without the need to issue a query to the investigator along with acknowledge acceptance/signing of these changes by Investigator.', true, true, true, true, 'D', '20', 'Signature Date', '11', 'E.2.18 7.8.2 a 9.2.4.5 j 10.6 j', 205),
  ('191', '10.02.05', '10', '10.02', 'Final Subject Data', 'Core', 'Final Subject data (EDC/ePRO/Paper) for the protocol and a copy of each site''s data by-subject. Associated documents may include but are not limited to documentation of subject data corrections, subject diaries, questionnaires, laboratory reports and other third-party specialty data. Does not include the final study datasets.', true, true, true, true, 'D', '20', 'Document Date', '09', 'E.2.16 7.3 7.8.1 7.8.2 9.2.4.5.j) 10.6 j', 206),
  ('192', '10.03.01', '10', '10.03', 'Database Requirements', 'Core', 'To provide a detailed design framework for the system(s) used to manage and store subject/patient data captured via a paper CRF or eCRF for the specified trial. Not to be confused with specifications for the Electronic Data Capture (EDC) system (see 10.04.02).', true, false, true, false, 'D', '3', 'Version Date', null, '7.8.3', 207),
  ('193', '10.03.02', '10', '10.03', 'Edit Check Plan', 'Core', 'Specifications which will detect data that is illogical, unexpected, missing, redundant, or is outside of defined study parameters; usually implemented via programming logic.', true, false, true, false, 'D', '12', 'Version Date', null, '7.8.3d', 208),
  ('194', '10.03.03', '10', '10.03', 'Edit Check Programming', 'Core', 'The computer code which satisfies the edit check plan/specification details; may include a reference to where the code resides.', true, false, true, false, 'D', '3', 'Version Date', null, '7.8.3 a', 209),
  ('195', '10.03.04', '10', '10.03', 'Edit Check Testing', 'Core', 'To provide evidence that the data edit checks have been implemented correctly; can include the data used to test the programming logic.', true, false, true, false, 'D', '12', 'Version Date', null, '7.8.3 f', 210),
  ('196', '10.03.05', '10', '10.03', 'Approval for Database Activation', 'Core', 'Documentation that all database specification requirements have been satisfied and system can go live; will also include confirmation that UAT (user acceptance testing) has been successfully completed. May include a modified version to activate implementation of change control.', true, false, true, false, 'D', '12', 'Approval Date', null, 'A.8 B 7.8.3', 211),
  ('197', '10.03.06', '10', '10.03', 'External Data Transfer Specifications', 'Core', 'To document import and export data specifications; includes but is not limited to diary, lab, IVRS, imaging; integration from external systems to database and may include transfer from one group to another.', true, false, true, false, 'D', '20', 'Version Date', null, 'A.8 B 3.13', 212),
  ('198', '10.03.07', '10', '10.03', 'Data Entry Guidelines (Paper)', 'Core', 'To provide detailed instructions on how CRF data is to be entered into a database; specific to a paper CRF trial (therefore, would not be required with an EDC trial).', true, false, true, false, 'D', '3', 'Version Date', null, '7.8.2', 213),
  ('199', '10.03.08', '10', '10.03', 'SAE Reconciliation', 'Core', 'To document reconciliation and resolution of discrepancies between the SAEs in the safety and the clinical databases has been successfully completed.', true, false, true, false, 'D', '20', 'Version Date', null, '9.2.5 7.8.3', 214),
  ('200', '10.03.09', '10', '10.03', 'Dictionary Coding', 'Core', 'To document the tools used in medical coding and the final coded terms; includes medical sign off of coding; may include resolution discrepancies.', true, false, true, false, 'D', '12', 'Version Date', null, '', 215),
  ('201', '10.03.10', '10', '10.03', 'Data Review Documentation', 'Core', 'To describe the procedures for creating and implementing a Quality Control (QC) Plan or Data Review Plan to ensure that quality data is captured into a clinical database on an ongoing basis. Artifact can include any evidence of the results from the plan.', true, false, true, false, 'D', '20', 'Document Date', null, '7.8.3.d', 216),
  ('202', '10.03.11', '10', '10.03', 'Database Lock and Unlock Approval', 'Core', 'Confirmation that all of the requirements for database release have been met; may include all unlock and re-lock documentation as well as a report on data quality issues and summary of essential activities prior to database lock.', true, false, true, false, 'D', '20', 'Approval Date', null, '7.8.3.a', 217),
  ('244', '10.03.12', '10', '10.03', 'Database Change Control', 'Core', 'Summary of requested change, reason for change, relevant approvals, impact / risk analysis, associated requirements, specifications and other documentation describing the validation and implementation of this change.', true, false, true, false, 'D', '20', 'Change Control Date', null, '7.8.3.a', 218),
  ('204', '10.04.01', '10', '10.04', 'System Account Management', 'Core', 'To capture account management details for all users who received access to the system (e.g.: ePRO, eCRF); intended to include users'' security role, date account granted, date account disabled.', true, true, true, true, 'D', '16', 'Document Date', '09', '7.8.3. h', 219),
  ('245', '10.04.02', '10', '10.04', 'Technical Design Document', 'Core', 'A technical planning and tracking document containing all the elements required to build and test the EDC application including the variables to be collected, their logical arrangement, navigation between the different forms, and the checks for logical consistency. May take the form of a spreadsheet created manually by a programmer and uploaded to the EDC application (e.g. to generate the eCRF or ePRO system), or exported from the application after building as a record of its technical design. May include some code for 10.03.03, Edit Check Programming.', true, true, true, true, 'D', '16', 'Version Date', null, '7.8.3.b', 220),
  ('246', '10.04.03', '10', '10.04', 'Validation Documentation', 'Core', 'Documents establishing the project context and documentation requirements for EDC (e.g.: eCRF or ePRO); can include the plan for and results of, the user acceptance testing (UAT). Includes the validation report to provide wrap up and post go-live summary if required.', true, true, true, true, 'D', '16', 'Version Date', null, '7.8.3.c', 221),
  ('205', '10.05.01', '10', '10.05', 'Relevant Communications', 'Core', 'Zone-specific agreements, significant discussions or relevant information, but not specifically listed in this Reference Model. Types of correspondence may include, but not limited to: letters, memo, electronic communications and faxes.', true, false, true, false, 'D', '20', 'Correspondence Date', '11', 'E 2.11 9.2.3 c 9.2.4.5 o 10.6.h', 222),
  ('206', '10.05.02', '10', '10.05', 'Tracking Information', 'Recommended', 'Zone-specific documents developed for the purpose of tracking activities during the course of the trial.', true, false, true, false, 'D', 'Per content', 'Last Entry Date', '11', '', 223),
  ('207', '10.05.03', '10', '10.05', 'Meeting Material', 'Core', 'Agenda, presentation materials and other documentation generated during an internal or external zone-related meeting which documents any agreements or significant discussions. Includes meeting minutes or Q&A, attendance sheets and any pre-meeting material.', true, false, true, false, 'D', '20', 'Meeting Start Date', null, '', 224),
  ('208', '10.05.04', '10', '10.05', 'Filenote', 'Core', 'To document any decision or to clarify any information relating to this zone.', true, false, true, false, 'D', '20', 'Filenote Date', '11', '', 225),
  ('209', '11.01.01', '11', '11.01', 'Statistical Analysis Plan', 'Core', 'To describe the statistical aspects of the trial design, the process of data selection for all analyses, the data items to be analyzed and all the procedures and methods to be employed in the analysis of those data items as well as the planned presentation of those results (Tables, Listings and Figures (TLFs), all versions of the SAP and approval forms). Includes interim and final.', true, false, true, false, 'M', '12', 'Version Date', null, '6.6', 226),
  ('210', '11.01.02', '11', '11.01', 'Sample Size Calculation', 'Core', 'To document the technique, assumptions and output used to calculate the sample size; can include QC and sign off.', true, false, true, false, 'D', '12', 'Document Date', null, '3.25 A7e A7e6 6.2.2 E.2', 227),
  ('211', '11.02.01', '11', '11.02', 'Randomization Plan', 'Core', 'To describe the randomization scheme (e.g. number and name of treatments, strata, block size) and how the randomization will be carried out; this plan is then used to initiate programming.', true, false, true, false, 'M', '12', 'Version Date', null, '', 228),
  ('212', '11.02.02', '11', '11.02', 'Randomization Procedure', 'Core', 'To define the actual steps for how subjects are randomized in a trial. This could be by interactive response technology (IRT)/IVRS, or a manual process (i.e. work instruction). May be part of the randomization plan.', true, false, true, false, 'M', '4', 'Version Date', null, '', 229),
  ('213', '11.02.03', '11', '11.02', 'Master Randomization List', 'Core', 'The single source on the assignment of subjects to protocol specified groups. In blinded studies, this list remains blinded until its release following the final data lock.', true, false, true, false, 'M', '20', 'Version Date', null, 'E.1.19 7.8.1', 230),
  ('214', '11.02.04', '11', '11.02', 'Randomization Programming', 'Core', 'Computer code to generate randomization number for treatment assignment.', true, false, true, false, 'D', '12', 'Version Date', null, 'A.7.E 7.8.3', 231),
  ('215', '11.02.05', '11', '11.02', 'Randomization Sign Off', 'Core', 'To verify that the randomization program generates the randomization number and treatment assignment correctly according to the randomization schema specified for the trial.', true, false, true, false, 'D', '12', 'Signature Date', null, 'A.7.E 7.8.3.', 232),
  ('216', '11.02.06', '11', '11.02', 'End of Trial or Interim Unblinding', 'Core', 'To document and authorize the release of the randomization code and allow the trial data to be unblinded. Includes evidence of release of end of trial unblinding. May include a request for partial unblinding, or to open the randomization list for maintenance by randomization management personnel.', true, true, true, true, 'D', '30', 'Signature Date', null, '7.8.1 10.7.e', 233),
  ('217', '11.03.01', '11', '11.03', 'Data Definitions for Analysis Datasets', 'Core', 'To define the programming logic required to transform the raw dataset to the analysis dataset; includes populations, etc.; as outlined in the SAP.', true, false, true, false, 'D', '20', 'Version Date', null, '', 234),
  ('218', '11.03.02', '11', '11.03', 'Analysis QC Documentation', 'Core', 'To confirm the QC procedures for analysis programs and validation of analysis QC programs, as well as the actual output of the QC steps.', true, false, true, false, 'D', '12', 'Document Date', null, '', 235),
  ('219', '11.03.03', '11', '11.03', 'Interim Analysis Raw Datasets', 'Core', 'The export of raw data for interim analysis purposes. This may include CDISC datasets such as Operational Data Model (ODM) or SDTM.', true, false, true, false, 'D', '36', 'File Date', null, '', 236),
  ('220', '11.03.04', '11', '11.03', 'Interim Analysis Programs', 'Core', 'The suite of programs designed to generate the interim analysis outputs as referenced in the SAP.', true, false, true, false, 'D', '4', 'File Date', null, '', 237),
  ('221', '11.03.05', '11', '11.03', 'Interim Analysis Datasets', 'Core', 'The datasets used for the interim analyses.', true, false, true, false, 'D', '36', 'File Date', null, '', 238),
  ('222', '11.03.06', '11', '11.03', 'Interim Analysis Output', 'Core', 'The Tables Listings and Figures produced from the interim analysis datasets; includes Statistics approval.', true, false, true, false, 'D', '36', 'Document Date', null, '', 239),
  ('223', '11.03.07', '11', '11.03', 'Final Analysis Raw Datasets', 'Core', 'The export of raw data for final analysis purposes. This may include CDISC datasets such as Operational Data Model (ODM), SDTM or case report tabulation (CRT) package.', true, false, true, false, 'D', '37', 'File Date', null, '', 240),
  ('224', '11.03.08', '11', '11.03', 'Final Analysis Programs', 'Core', 'The suite of programs designed to generate the final analysis outputs as referenced in the SAP.', true, false, true, false, 'D', '4', 'File Date', null, 'D.6.I.', 241),
  ('225', '11.03.09', '11', '11.03', 'Final Analysis Datasets', 'Core', 'The datasets used for the final analysis/case report tabulation (CRT) package. If required, study-level submission datasets can be filed here.', true, false, true, false, 'D', '37', 'File Date', null, '', 242),
  ('226', '11.03.10', '11', '11.03', 'Final Analysis Output', 'Core', 'The Tables, Listings and Figures produced from the final analysis datasets; includes Statistics approval. May be appended to the CSR.', true, false, true, false, 'M', '37', 'Document Date', null, '8.4', 243),
  ('227', '11.03.11', '11', '11.03', 'Subject Evaluability Criteria and Subject Classification', 'Core', 'To document the decisions which define the criteria applied to evaluate each subject in the trial, in order to unambiguously assign the subject to the populations established in the SAP.', true, false, true, false, 'M', '36', 'Version Date', null, 'A.6.3', 244),
  ('228', '11.04.01', '11', '11.04', 'Interim Statistical Report(s)', 'Core', 'To summarize the relevant statistical aspects of the interim analysis. May be appended to the CSR.', true, false, true, false, 'D', '40', 'Report Date', null, 'E.3.8 8.3 9.2.6 b Annex D', 245),
  ('229', '11.04.02', '11', '11.04', 'Statistical Report', 'Core', 'To summarize the relevant statistical aspects of the final analysis. May be appended to the CSR.', true, false, true, false, 'D', '37', 'Report Date', null, 'E.3.8 8.3 9.2.6 b Annex D', 246),
  ('230', '11.05.01', '11', '11.05', 'Relevant Communications', 'Core', 'Zone-specific agreements, significant discussions or relevant information, but not specifically listed in this Reference Model. Types of correspondence may include, but not limited to: letters, memo, electronic communications and faxes.', true, false, true, false, 'D', 'Per content', 'Correspondence Date', null, 'E2.11 9.2.3 c 9.2.4.5 o 10.6.h', 247),
  ('231', '11.05.02', '11', '11.05', 'Tracking Information', 'Recommended', 'Zone-specific documents developed for the purpose of tracking activities during the course of the trial.', true, false, true, false, 'D', '21', 'Last Entry Date', null, '', 248),
  ('232', '11.05.03', '11', '11.05', 'Meeting Material', 'Core', 'Agenda, presentation materials and other documentation generated during an internal or external zone-related meeting which documents any agreements or significant discussions. Includes meeting minutes or Q&A, attendance sheets and any pre-meeting material.', true, false, true, false, 'D', '37', 'Meeting Start Date', null, '', 249),
  ('233', '11.05.04', '11', '11.05', 'Filenote', 'Core', 'To document any decision or to clarify any information relating to this zone.', true, false, true, false, 'D', '20', 'Filenote Date', null, '', 250)
) as t(unique_id, artifact_num, zone_num, section_num, name, classification, definition, sponsor_doc, investigator_doc, device_sponsor_doc, device_investigator_doc, iis_requirement, process_number, dating_convention, site_milestone, iso_ref, sort_order)
on conflict do nothing;

insert into taxonomy_subartifacts (artifact_id, name, sort_order)
select a.id, t.name, t.sort_order from (values
  ('001', 'Document Transfer Documentation', 1),
  ('001', 'Evidence of Quality Review', 2),
  ('001', 'Request to Lock TMF', 3),
  ('001', 'Trial Master File Plan', 4),
  ('001', 'Trial Master File Index', 5),
  ('001', 'Trial Master File Report', 6),
  ('002', 'Clinical Development Plan', 1),
  ('002', 'Project Management Plan', 2),
  ('002', 'Trial Management Plan', 3),
  ('003', 'Quality Documentation', 1),
  ('003', 'Quality Plan', 2),
  ('003', 'Quality Report', 3),
  ('004', 'List of SOPs Current During Trial', 1),
  ('004', 'SOP Waivers', 2),
  ('004', 'SOP Deviations', 3),
  ('005', 'Operational Procedure Manual', 1),
  ('006', 'Recruitment Plan', 1),
  ('006', 'Recruitment Progress', 2),
  ('007', 'Communication Plan', 1),
  ('008', 'Monitoring Plan', 1),
  ('008', 'Risk Based Monitoring Plan', 2),
  ('008', 'Risk Based Monitoring Evidence', 3),
  ('009', 'Medical Monitoring Plan', 1),
  ('009', 'Medical Contact Report', 2),
  ('009', 'Medical Monitoring Decisions', 3),
  ('010', 'Publication Policy', 1),
  ('011', 'Debarment Statement', 1),
  ('011', 'Restricted Party Lists', 2),
  ('012', 'Trial Status Report', 1),
  ('013', 'Investigator Newsletter', 1),
  ('014', 'Audit Certificate', 1),
  ('014', 'List of Audits', 2),
  ('015', 'Filenote Master List', 1),
  ('236', 'Risk Management Plan', 1),
  ('236', 'Risk Assessment', 2),
  ('236', 'Risk Log', 3),
  ('237', 'Vendor Management Plan', 1),
  ('181', 'Roles and Responsibility Matrix', 1),
  ('247', 'Transfer of Regulatory Obligations', 1),
  ('248', 'Operational Oversight Plan', 1),
  ('248', 'Operational Oversight Evidence', 2),
  ('016', 'Trial Team Details', 1),
  ('016', 'Transition Evidence', 2),
  ('017', 'Trial Team Curriculum Vitae', 1),
  ('018', 'Committee Charter', 1),
  ('018', 'Committee Process', 2),
  ('019', 'Committee Member List', 1),
  ('020', 'Committee Correspondence', 1),
  ('020', 'Committee Data Package', 2),
  ('020', 'Committee Minutes', 3),
  ('020', 'Committee Report', 4),
  ('249', 'Committee Member Curriculum Vitae', 1),
  ('249', 'Committee Member Medical License', 2),
  ('249', 'Committee Member Training Evidence', 3),
  ('250', 'Committee Member Financial Disclosure Form', 1),
  ('251', 'Committee Member Contract', 1),
  ('252', 'Committee Member Confidentiality Disclosure Agreement', 1),
  ('024', 'Kick-off Meeting Agenda', 1),
  ('024', 'Kick-off Meeting Attendance Sheet', 2),
  ('024', 'Kick-off Meeting Presentation Materials', 3),
  ('024', 'Kick-off Meeting Minutes', 4),
  ('025', 'Trial Team Training Material', 1),
  ('026', 'Investigators Meeting Agenda', 1),
  ('026', 'Investigators Meeting Attendance Sheet', 2),
  ('026', 'Investigators Meeting Minutes', 3),
  ('026', 'Investigators Meeting Presentation Materials', 4),
  ('253', 'Trial Team Training Attendance Sheet', 1),
  ('253', 'Trial Team Training Certificate', 2),
  ('027', 'Relevant Communications', 1),
  ('028', 'Tracking Information', 1),
  ('029', 'Other Meeting Agenda', 1),
  ('029', 'Other Meeting Attendance Sheet', 2),
  ('029', 'Other Meeting Minutes', 3),
  ('029', 'Other Meeting Presentation Materials', 4),
  ('030', 'Filenote', 1),
  ('031', 'Investigator''s Brochure', 1),
  ('031', 'Investigator''s Brochure Addendum', 2),
  ('031', 'Investigator''s Brochure Extension', 3),
  ('031', 'Investigator''s Brochure Review and Approval', 4),
  ('031', 'Investigator''s Brochure Summary of Changes', 5),
  ('031', 'Investigational Medicinal Product Documentation', 6),
  ('032', 'Protocol', 1),
  ('032', 'Protocol Review and Approval', 2),
  ('032', 'Clinical Investigation Plan (Devices)', 3),
  ('033', 'Protocol Summary', 1),
  ('033', 'Protocol Synopsis', 2),
  ('034', 'Protocol Amendment', 1),
  ('034', 'Protocol Amendment Summary of Changes', 2),
  ('034', 'Protocol Amendment Review and Approval', 3),
  ('034', 'Protocol Amendment Synopsis', 4),
  ('034', 'Protocol Amendment Administrative Changes', 5),
  ('034', 'Justification For a Non-Substantial Amendment', 6),
  ('035', 'Financial Disclosure Summary', 1),
  ('036', 'Insurance Policy', 1),
  ('036', 'Insurance Certificate', 2),
  ('037', 'Sample Case Report Form', 1),
  ('037', 'CRF Summary of Changes', 2),
  ('037', 'CRF Review and Approval', 3),
  ('239', 'Report of Prior Investigations', 1),
  ('239', 'RPI Addendum', 2),
  ('239', 'RPI Summary of Changes', 3),
  ('239', 'RPI Review and Approval', 4),
  ('254', 'Package Insert', 1),
  ('254', 'Summary of Product Characteristics', 2),
  ('038', 'Subject Diary', 1),
  ('038', 'Subject Diary Review and Approval', 2),
  ('038', 'Subject Diary Summary of Changes', 3),
  ('039', 'Subject Questionnaire', 1),
  ('039', 'Subject Questionnaire Review and Approval', 2),
  ('039', 'Subject Questionnaire Summary of Changes', 3),
  ('040', 'Consent to Release Information or HIPAA / Privacy', 1),
  ('040', 'Informed Consent Form', 2),
  ('040', 'ICF Addendum', 3),
  ('040', 'ICF QC Checklist', 4),
  ('040', 'ICF Summary of Changes', 5),
  ('040', 'ICF Review and Approval', 6),
  ('041', 'Subject Information Sheet', 1),
  ('041', 'Subject Information Sheet Addendum', 2),
  ('041', 'Subject Information Sheet Summary of Changes', 3),
  ('041', 'Subject Information Sheet Review and Approval', 4),
  ('042', 'Subject Participation Card', 1),
  ('042', 'Subject Participation Card Summary of Changes', 2),
  ('042', 'Subject Participation Card Review and Approval', 3),
  ('043', 'Advertisements for Subject Recruitment', 1),
  ('043', 'Advertisements for Subject Recruitment Review and Approval', 2),
  ('044', 'Other Information Given to Subjects', 1),
  ('045', 'Clinical Investigation Report', 1),
  ('045', 'Clinical Study Report', 2),
  ('045', 'Clinical Study Report Synopsis', 3),
  ('045', 'Integrated Clinical and Statistical Report', 4),
  ('045', 'Interim Clinical Study Report', 5),
  ('045', 'Interim Clinical Study Report Synopsis', 6),
  ('045', 'Form FDA 3654 (devices)', 7),
  ('047', 'Bioanalytical Report', 1),
  ('047', 'Pharmacokinetic Report', 2),
  ('048', 'Relevant Communications', 1),
  ('049', 'Tracking Information', 1),
  ('050', 'Agenda', 1),
  ('050', 'Attendance Sheet', 2),
  ('050', 'Minutes', 3),
  ('050', 'Presentation Materials', 4),
  ('051', 'Filenote', 1),
  ('052', 'Cover Letter', 1),
  ('052', 'List of Content Submitted', 2),
  ('052', 'Receipt of Acknowledgement', 3),
  ('052', 'Regulatory Submission', 4),
  ('052', 'Review and Approval of Regulatory Submission', 5),
  ('053', 'Condition Approval', 1),
  ('053', 'List of Content Approved', 2),
  ('053', 'Regulatory Authority Decision', 3),
  ('054', 'Notification of Regulatory Identification Number', 1),
  ('055', 'Public Registration', 1),
  ('055', 'Receipt of Acknowledgement', 2),
  ('056', 'Import License Application', 1),
  ('056', 'Export License Application', 2),
  ('057', 'Import License', 1),
  ('057', 'Export License', 2),
  ('057', 'Device Material Transfer Agreement', 3),
  ('057', 'Device Material Transfer Application', 4),
  ('057', 'Device Material Transfer Justification', 5),
  ('058', 'Evidence of Distribution of Safety Information', 1),
  ('058', 'Evidence of Distribution of Trial Information', 2),
  ('058', 'Notification of Safety Information', 3),
  ('058', 'Notification of Trial Information', 4),
  ('059', 'Regulatory Progress Report', 1),
  ('060', 'Regulatory Notification of Trial Termination', 1),
  ('061', 'Relevant Communications', 1),
  ('062', 'Tracking Information', 1),
  ('063', 'Agenda', 1),
  ('063', 'Attendance Sheet', 2),
  ('063', 'Minutes', 3),
  ('063', 'Presentation Materials', 4),
  ('064', 'Filenote', 1),
  ('065', 'Acknowledgement of Submission Receipt', 1),
  ('065', 'IRB or IEC Submission', 2),
  ('065', 'Request for Additional Information', 3),
  ('065', 'Responses', 4),
  ('066', 'IRB or IEC Approval', 1),
  ('066', 'IRB or IEC Conditional Approval', 2),
  ('066', 'IRB or IEC Decision', 3),
  ('066', 'IRB or IEC Rejection', 4),
  ('067', 'IRB or IEC Composition', 1),
  ('068', 'IRB or IEC Documentation of Non-Voting Status', 1),
  ('069', 'IRB or IEC Compliance Documentation', 1),
  ('070', 'Other Approval Committee Submissions', 1),
  ('071', 'Other Approval Committee Decisions', 1),
  ('072', 'Acknowledgement of Receipt of Safety Information', 1),
  ('072', 'Evidence of Distribution of Safety Information', 2),
  ('072', 'Notification to IRB or IEC of Safety Information', 3),
  ('073', 'Evidence of Distribution of Progress Report', 1),
  ('073', 'IRB or IEC Progress Report', 2),
  ('074', 'IRB or IEC Notification of Site Closure', 1),
  ('074', 'IRB or IEC Notification of Trial Termination', 2),
  ('075', 'Relevant Communications', 1),
  ('076', 'Tracking Information', 1),
  ('077', 'Agenda', 1),
  ('077', 'Attendance Sheet', 2),
  ('077', 'Minutes', 3),
  ('077', 'Presentation Materials', 4),
  ('078', 'Filenote', 1),
  ('079', 'Site Contact Details', 1),
  ('080', 'Confidentiality Agreement', 1),
  ('081', 'Feasibility Documentation', 1),
  ('081', 'Feasibility Questionnaire', 2),
  ('081', 'Site Selection Documentation', 3),
  ('081', 'Technical Capabilities Questionnaire', 4),
  ('082', 'Pre Trial Monitoring Report', 1),
  ('082', 'Pre Trial Visit Confirmation Letter', 2),
  ('082', 'Pre Trial Visit Follow Up Letter', 3),
  ('082', 'Pre Trial Visit Waiver', 4),
  ('082', 'Site Selection Letter', 5),
  ('083', 'Sites Evaluated but not Selected', 1),
  ('084', 'Acceptance of Investigator Brochure', 1),
  ('084', 'Evidence of Investigator Brochure Distribution', 2),
  ('084', 'Evidence of Reference Safety Information Distribution', 3),
  ('085', 'Protocol Signature Page', 1),
  ('086', 'Protocol Amendment Signature Page', 1),
  ('087', 'Principal Investigator Affiliation Form', 1),
  ('087', 'Principal Investigator Biographical Sketch', 2),
  ('087', 'Principal Investigator Curriculum Vitae', 3),
  ('088', 'Sub-Investigator Affiliation Form', 1),
  ('088', 'Sub-Investigator Biographical Sketch', 2),
  ('088', 'Sub-Investigator Curriculum Vitae', 3),
  ('089', 'Other Affiliation Form', 1),
  ('089', 'Other Biographical Sketch', 2),
  ('089', 'Other Curriculum Vitae', 3),
  ('090', 'DEA License', 1),
  ('090', 'Evidence of Registration', 2),
  ('090', 'ICH-GCP Evidence of Training', 3),
  ('090', 'IATA Certification', 4),
  ('090', 'Medical License', 5),
  ('090', 'Medical Qualification', 6),
  ('090', 'Professional License', 7),
  ('090', 'Site Staff Qualification Supporting Information', 8),
  ('091', 'Form FDA 1572', 1),
  ('092', 'Clinical Trial Site Information Form', 1),
  ('092', 'Investigator Regulatory Agreement', 2),
  ('092', 'Qualified Investigator Undertaking Form', 3),
  ('093', 'Financial Disclosure Form', 1),
  ('094', 'Data Privacy Agreement', 1),
  ('095', 'Clinical Trial Agreement', 1),
  ('095', 'Clinical Trial Agreement with Investigator', 2),
  ('095', 'Clinical Trial Agreement with Investigator and Site', 3),
  ('095', 'Clinical Trial Agreement with Site', 4),
  ('095', 'Termination Agreement', 5),
  ('096', 'Indemnity', 1),
  ('097', 'Laboratory Agreement', 1),
  ('097', 'Other Financial Agreement', 2),
  ('097', 'Pharmacy Agreement', 3),
  ('100', 'IP Site Release Checklist', 1),
  ('100', 'IP Site Release Documentation', 2),
  ('100', 'IP Site Release Notification', 3),
  ('101', 'Delegation of Authority Log', 1),
  ('101', 'Site Signature Sheet', 2),
  ('240', 'Investigators Agreement (Device)', 1),
  ('255', 'Coordinating Investigator Clinical Trial Agreement', 1),
  ('255', 'Coordinating Investigator Confidentiality Agreement', 2),
  ('255', 'Coordinating Investigator Curriculum Vitae', 3),
  ('255', 'Coordinating Investigator Documentation', 4),
  ('255', 'Coordinating Investigator Financial Disclosure Form', 5),
  ('255', 'Coordinating Investigator GCP Training', 6),
  ('255', 'Coordinating Investigator Indemnity', 7),
  ('255', 'Coordinating Investigator Medical License', 8),
  ('255', 'Coordinating Investigator Personal Data Consent', 9),
  ('102', 'Trial Initiation Monitoring Report', 1),
  ('102', 'Trial Initiation Visit Confirmation Letter', 2),
  ('102', 'Trial Initiation Visit Follow Up Letter', 3),
  ('102', 'Trial Initiation Visit Waiver', 4),
  ('103', 'Site Training Material', 1),
  ('103', 'Quick Reference Guide', 2),
  ('103', 'Device Maintenance Documents', 3),
  ('103', 'Device Training Protocol', 4),
  ('104', 'Site Evidence of Training', 1),
  ('104', 'Site Training Attendance Sheet', 2),
  ('104', 'Site Training Certificate', 3),
  ('105', 'Subject Consenting Tracker', 1),
  ('105', 'Subject Enrollment Log', 2),
  ('105', 'Subject Log', 3),
  ('105', 'Subject Screening Log', 4),
  ('105', 'Subject Visit Log', 5),
  ('106', 'Source Data Specification and Agreement', 1),
  ('106', 'Source Data Verification', 2),
  ('106', 'Device Extracts', 3),
  ('106', 'Source Document Maps', 4),
  ('107', 'Monitoring Visit Confirmation Letter', 1),
  ('107', 'Monitoring Visit Follow Up Letter', 2),
  ('107', 'Monitoring Visit Report', 3),
  ('107', 'Monitoring Visit Waiver', 4),
  ('108', 'Site Visit Log', 1),
  ('109', 'Additional Monitoring Activity', 1),
  ('109', 'Non-Routine Visit Report', 2),
  ('109', 'Non-Routine Visit Report Confirmation Letter', 3),
  ('109', 'Non-Routine Visit Report Follow Up Letter', 4),
  ('109', 'Oversight Monitoring Visit Report', 5),
  ('109', 'Oversight Monitoring Visit Report Confirmation Letter', 6),
  ('109', 'Oversight Monitoring Visit Report Follow Up Letter', 7),
  ('109', 'Site Improvement Plan', 8),
  ('109', 'Co-Monitoring Visit Report', 9),
  ('110', 'Protocol Deviations', 1),
  ('110', 'Protocol Deviation Logs', 2),
  ('110', 'Protocol Deviation Report', 3),
  ('111', 'Financial Documentation', 1),
  ('111', 'Financial Summary Tracker', 2),
  ('111', 'Invoices', 3),
  ('111', 'Payments', 4),
  ('111', 'Receipts', 5),
  ('112', 'Close Out Visit Confirmation Letter', 1),
  ('112', 'Close Out Visit Follow-Up Letter', 2),
  ('112', 'Close Out Visit Waiver', 3),
  ('112', 'Final Trial Close Out Monitoring Report', 4),
  ('113', 'Evidence of Safety Information Distribution', 1),
  ('113', 'Notification to Investigators of Safety Information', 2),
  ('234', 'Subject Identification Log', 1),
  ('235', 'Source Data', 1),
  ('235', 'Site Level Source Data Worksheets', 2),
  ('241', 'Monitoring Visit Follow-up Documentation', 1),
  ('256', 'Subject Eligibility Verification Forms and Worksheets', 1),
  ('114', 'Relevant Communications', 1),
  ('115', 'Tracking Information', 1),
  ('116', 'Agenda', 1),
  ('116', 'Attendance Sheet', 2),
  ('116', 'Minutes', 3),
  ('116', 'Presentation Materials', 4),
  ('117', 'Filenote', 1),
  ('118', 'IP Supply Plan', 1),
  ('118', 'Placebo Justification Statement', 2),
  ('119', 'Device User Manual', 1),
  ('119', 'IP Directions for Use', 2),
  ('119', 'IP Instructions for Handling', 3),
  ('119', 'IP Manual', 4),
  ('119', 'Pharmacy Manual', 5),
  ('119', 'Device Packing Insert', 6),
  ('119', 'Instruction For Use', 7),
  ('120', 'IP Master Label', 1),
  ('120', 'IP Sample Label', 2),
  ('121', 'Acknowledgement of Receipt', 1),
  ('121', 'Approval to Ship', 2),
  ('121', 'Invoice', 3),
  ('121', 'IP Shipment Documentation', 4),
  ('121', 'Packaging Order', 5),
  ('121', 'Shipment Request Form', 6),
  ('121', 'Temperature (TempTale) Monitoring', 7),
  ('122', 'Drug Accountability Log', 1),
  ('122', 'IP Accountability Documentation', 2),
  ('123', 'Evidence of IP Transfer', 1),
  ('123', 'IP Transfer Documentation', 2),
  ('123', 'IP Transfer Plan', 3),
  ('123', 'Notification of IP Transfer', 4),
  ('124', 'Evidence of IP Relabeling', 1),
  ('124', 'IP Relabeling Documentation', 2),
  ('124', 'IP Relabeling Plan', 3),
  ('124', 'Notification of IP Relabeling', 4),
  ('125', 'Evidence of Recall', 1),
  ('125', 'IP Recall Documentation', 2),
  ('125', 'IP Recall Plan', 3),
  ('125', 'Notification of IP Recall', 4),
  ('126', 'IP Quality Complaint Form', 1),
  ('126', 'Device Deficiency Report', 2),
  ('127', 'Acknowledgement of Return', 1),
  ('127', 'IP Return Documentation', 2),
  ('127', 'IP Return Form', 3),
  ('128', 'IP Certificate of Destruction', 1),
  ('128', 'IP Destruction Documentation', 2),
  ('242', 'Expiry Extension', 1),
  ('242', 'IP Retest and Expiry Documentation', 2),
  ('242', 'Stability Confirmation', 3),
  ('242', 'Device Expiration Certificate', 4),
  ('129', 'QP (Qualified Person) Certification', 1),
  ('130', 'IP Regulatory Release Documentation', 1),
  ('131', 'Controlled IP Storage', 1),
  ('131', 'DEA 223', 2),
  ('131', 'GMP Certificate', 3),
  ('131', 'GMP Manufacturer''s License', 4),
  ('131', 'GMP Statement', 5),
  ('131', 'IP Verification Statements', 6),
  ('131', 'Manufacturing Authorization', 7),
  ('131', 'Manufacturer''s Certificate of Compliance', 8),
  ('131', 'TSE Certificate', 9),
  ('132', 'Batch Records', 1),
  ('132', 'Certificate of Analysis', 2),
  ('132', 'Certificate of Conformance', 3),
  ('132', 'Device Quality Certification', 4),
  ('133', 'IP Treatment Allocation Documentation', 1),
  ('133', 'Kit List', 2),
  ('133', 'Randomization Envelopes', 3),
  ('133', 'Randomization List', 4),
  ('134', 'IP Unblinding Plan', 1),
  ('134', 'Unblinding Procedure', 2),
  ('135', 'Emergency Decoding Authorization Document', 1),
  ('135', 'IP Treatment Decoding Documentation', 2),
  ('135', 'Treatment Decoding Form', 3),
  ('136', 'IP Storage Condition Documentation', 1),
  ('136', 'Temperature Logs', 2),
  ('137', 'Approval For Use (following temp excursion)', 1),
  ('137', 'IP Storage Condition Excursion Documentation', 2),
  ('137', 'TempTale Documentation', 3),
  ('137', 'Temperature Excursion Form', 4),
  ('243', 'Calibration Certificate', 1),
  ('243', 'Calibration Log', 2),
  ('243', 'Maintenance Logs', 3),
  ('138', 'Non-IP Supply Plan', 1),
  ('139', 'Acknowledgement of Receipt', 1),
  ('139', 'Approval to Ship', 2),
  ('139', 'Invoice', 3),
  ('139', 'Non-IP Shipment Documentation', 4),
  ('139', 'Packaging Order', 5),
  ('139', 'Shipment Request Form', 6),
  ('140', 'Acknowledgement of Return', 1),
  ('140', 'Non-IP Return Documentation', 2),
  ('140', 'Non-IP Return Form', 3),
  ('259', 'Non-IP Storage Documentation', 1),
  ('259', 'Non-IP Storage Condition Excursion Documentation', 2),
  ('141', 'IRT User Requirement Specification', 1),
  ('142', 'IRT Validation Certification', 1),
  ('143', 'IRT UAT Certification', 1),
  ('143', 'IRT UAT Executed Scripts', 2),
  ('143', 'IRT UAT Sign Off', 3),
  ('143', 'IRT User Acceptance Testing (UAT) Certification', 4),
  ('144', 'IRT Quick Reference Card', 1),
  ('144', 'IRT User Manual', 2),
  ('145', 'IRT User Account Management', 1),
  ('145', 'Summary of IRT Access Report', 2),
  ('146', 'Relevant Communications', 1),
  ('147', 'Tracking Information', 1),
  ('148', 'Agenda', 1),
  ('148', 'Attendance Sheet', 2),
  ('148', 'Minutes', 3),
  ('148', 'Presentation Materials', 4),
  ('149', 'Filenote', 1),
  ('150', 'Reference Safety Information Approval Form', 1),
  ('150', 'Safety Management Plan', 2),
  ('150', 'Safety Reporting Plan', 3),
  ('150', 'Safety Reporting Templates', 4),
  ('151', 'Annual Safety Report (ASR)', 1),
  ('151', 'Development Safety Update Report (DSUR)', 2),
  ('151', 'Pharmacovigilance Database Line Listing', 3),
  ('152', 'Expedited Safety Report', 1),
  ('153', 'SAE Report', 1),
  ('154', 'Pregnancy Report', 1),
  ('155', 'Special Events of Interest', 1),
  ('156', 'Relevant Communications', 1),
  ('157', 'Tracking Information', 1),
  ('158', 'Agenda', 1),
  ('158', 'Attendance Sheet', 2),
  ('158', 'Minutes', 3),
  ('158', 'Presentation Materials', 4),
  ('159', 'Filenote', 1),
  ('160', 'Certification or Accreditation', 1),
  ('160', 'CAP Certificate', 2),
  ('160', 'CLIA Certificate', 3),
  ('160', 'ISO Certification', 4),
  ('160', 'Other Certification or Accreditation', 5),
  ('161', 'Laboratory Validation Documentation', 1),
  ('161', 'Laboratory System Specifications', 2),
  ('161', 'Laboratory Kit Assembly Specifications', 3),
  ('162', 'Biochemical Testing', 1),
  ('162', 'Imaging Uploads', 2),
  ('162', 'Independent Rater Data', 3),
  ('162', 'Laboratory Results Documentation', 4),
  ('163', 'Normal Ranges', 1),
  ('164', 'Imaging Manual', 1),
  ('164', 'Laboratory Manual', 2),
  ('164', 'Manual', 3),
  ('164', 'Other Manual', 4),
  ('165', 'Biologic Supply Import', 1),
  ('165', 'Biosafety Statements', 2),
  ('165', 'Customs Statements', 3),
  ('165', 'Proforma Invoices', 4),
  ('165', 'Secure Handling of Material and Data', 5),
  ('165', 'Supply Import Documentation', 6),
  ('165', 'Supply Import Licenses', 7),
  ('166', 'Head of Facility Curriculum Vitae', 1),
  ('167', 'Analytical Method Report', 1),
  ('167', 'Interlaboratory Comparison Testing', 2),
  ('167', 'Standardization Methods', 3),
  ('168', 'Specimen Label', 1),
  ('169', 'Specimen Shipment Records', 1),
  ('170', 'Sample Storage Condition Log', 1),
  ('171', 'Sample Import or Export Documentation', 1),
  ('171', 'Specimen Export Documentation', 2),
  ('171', 'Specimen Import Documentation', 3),
  ('172', 'Biorepository', 1),
  ('172', 'Destruction Records', 2),
  ('172', 'Dispatch Form', 3),
  ('172', 'Inventory From Lab', 4),
  ('172', 'Record of Retained Samples', 5),
  ('173', 'Relevant Communications', 1),
  ('174', 'Tracking Information', 1),
  ('175', 'Agenda', 1),
  ('175', 'Attendance Sheet', 2),
  ('175', 'Minutes', 3),
  ('175', 'Presentation Materials', 4),
  ('176', 'Filenote', 1),
  ('177', 'Evidence of Third Party Qualification', 1),
  ('177', 'Third Party Audit Certificate', 2),
  ('257', 'Third Party Curriculum Vitae', 1),
  ('258', 'Ongoing Third Party Oversight', 1),
  ('178', 'Third Party Confidentiality Agreement', 1),
  ('179', 'Vendor Evaluation', 1),
  ('179', 'Vendor Decision', 2),
  ('180', 'Authorization To Proceed', 1),
  ('180', 'Budget', 2),
  ('180', 'Contract', 3),
  ('180', 'Change Order', 4),
  ('180', 'Data Privacy Agreements', 5),
  ('180', 'Indemnification', 6),
  ('182', 'Relevant Communications', 1),
  ('183', 'Tracking Information', 1),
  ('184', 'Agenda', 1),
  ('184', 'Attendance Sheet', 2),
  ('184', 'Minutes', 3),
  ('184', 'Presentation Materials', 4),
  ('185', 'Filenote', 1),
  ('186', 'Data Management Plan', 1),
  ('187', 'CRF Completion Requirements', 1),
  ('188', 'Annotated CRF', 1),
  ('188', 'Annotated CRF Electronic Data Capture', 2),
  ('188', 'Annotated CRF Study Data Tabulation Model (SDTM)', 3),
  ('190', 'Data Clarification Forms', 1),
  ('190', 'Data Query Forms', 2),
  ('190', 'Documentation of Corrections to Entered Data', 3),
  ('191', 'Final Subject Data', 1),
  ('191', 'Site Receipt of Final Subject Data', 2),
  ('192', 'Database Requirements', 1),
  ('193', 'Edit Check Plan', 1),
  ('193', 'Edit Check Specifications', 2),
  ('194', 'Edit Check Programming', 1),
  ('195', 'Edit Check Testing', 1),
  ('196', 'Approval for Database Activation', 1),
  ('197', 'External Data Transfer Authorization', 1),
  ('197', 'External Data Transfer Specifications', 2),
  ('197', 'External Data Transfer Testing Documentation', 3),
  ('198', 'Data Entry Guidelines (Paper)', 1),
  ('199', 'SAE Reconciliation', 1),
  ('199', 'SAE Reconciliation Approval', 2),
  ('199', 'SAE Reconciliation Report', 3),
  ('200', 'Dictionary Coding', 1),
  ('200', 'Medical Coding Approval', 2),
  ('200', 'Medical Coding Consistency Report', 3),
  ('200', 'Medical Coding Guidelines', 4),
  ('201', 'Data Review Documentation', 1),
  ('201', 'Data Review Plan', 2),
  ('201', 'Data Validation Plan', 3),
  ('201', 'DB Audit Specification', 4),
  ('201', 'Third Party Vendor Reconciliation Report', 5),
  ('202', 'Database Interim Lock Approval', 1),
  ('202', 'Database Lock and Approval', 2),
  ('202', 'Database Lock and Unlock Approval', 3),
  ('202', 'Database Unlock Approval', 4),
  ('244', 'Database Change Control', 1),
  ('244', 'Data Model Difference Report', 2),
  ('244', 'Database Modification Approval', 3),
  ('204', 'EDC User Authorization Documentation', 1),
  ('204', 'EDC User Report', 2),
  ('204', 'Electronic Signature Authorization Form', 3),
  ('204', 'System Account Management', 4),
  ('245', 'Technical Design Document', 1),
  ('246', 'Validation Certificate', 1),
  ('246', 'Validation Executed Scripts', 2),
  ('246', 'Validation Plan', 3),
  ('246', 'Validation Report', 4),
  ('246', 'Other Validation Documents', 5),
  ('205', 'Relevant Communications', 1),
  ('206', 'Tracking Information', 1),
  ('207', 'Agenda', 1),
  ('207', 'Attendance Sheet', 2),
  ('207', 'Minutes', 3),
  ('207', 'Presentation Materials', 4),
  ('208', 'Filenote', 1),
  ('209', 'Analysis Convention Document', 1),
  ('209', 'Interim Analysis SAP', 2),
  ('209', 'SAP Approval', 3),
  ('209', 'SPP Approval', 4),
  ('209', 'Statistical Analysis Plan (SAP)', 5),
  ('209', 'Statistical Programming Plan (SPP)', 6),
  ('210', 'Sample Size Calculation', 1),
  ('210', 'Sample Size Validation', 2),
  ('211', 'Randomization Plan', 1),
  ('212', 'Randomization Procedure', 1),
  ('212', 'Randomization Specification', 2),
  ('213', 'Master Randomization List', 1),
  ('214', 'Randomization Programming', 1),
  ('215', 'Randomization Sign Off', 1),
  ('216', 'Administrative Interim Unblinding Request Form', 1),
  ('216', 'End of Trial or Interim Unblinding', 2),
  ('216', 'Results Release Authorization Memorandum', 3),
  ('217', 'Data Definitions for Analysis Datasets', 1),
  ('218', 'Analysis QC Documentation', 1),
  ('218', 'Validation Documentation Approval', 2),
  ('218', 'Validation Plan', 3),
  ('218', 'Validation Report', 4),
  ('219', 'Interim Analysis Raw Datasets', 1),
  ('220', 'Interim Analysis Programs', 1),
  ('220', 'Interim Analysis Datasets Programs', 2),
  ('220', 'Interim Analysis Macros', 3),
  ('221', 'Interim Analysis Datasets', 1),
  ('222', 'Interim Analysis Graphs', 1),
  ('222', 'Interim Analysis Figures', 2),
  ('222', 'Interim Analysis Listings', 3),
  ('222', 'Interim Analysis Statistics Approval', 4),
  ('222', 'Interim Analysis Tables', 5),
  ('223', 'Final Analysis Raw Datasets', 1),
  ('224', 'Final Analysis Datasets Programs', 1),
  ('224', 'Final Analysis Macros', 2),
  ('224', 'Final Analysis Programs', 3),
  ('225', 'Final Analysis Datasets', 1),
  ('226', 'Final Analysis Graphs', 1),
  ('226', 'Final Analysis Figures', 2),
  ('226', 'Final Analysis Listings', 3),
  ('226', 'Final Analysis Statistics Approval', 4),
  ('226', 'Final Analysis Tables', 5),
  ('227', 'Final Protocol Deviation Report', 1),
  ('227', 'Population Definition Criteria', 2),
  ('227', 'Protocol Deviation Listing', 3),
  ('227', 'Subject Evaluability Criteria and Subject Classification', 4),
  ('228', 'Interim Statistical Report(s)', 1),
  ('229', 'Statistical Report', 1),
  ('230', 'Relevant Communications', 1),
  ('231', 'Tracking Information', 1),
  ('232', 'Agenda', 1),
  ('232', 'Attendance Sheet', 2),
  ('232', 'Minutes', 3),
  ('232', 'Presentation Materials', 4),
  ('233', 'Filenote', 1)
) as t(unique_id, name, sort_order)
join taxonomy_artifacts a on a.unique_id = t.unique_id and a.version_id = (select id from taxonomy_versions where model = 'TMF Reference Model' and version = '3.3.1')
on conflict do nothing;

------------------------------------------------------------------------------
-- 2. Milestone types ↔ TMF milestone events
------------------------------------------------------------------------------

alter table milestone_types add column if not exists tmf_event_code text references tmf_milestone_events(code);

update milestone_types m set tmf_event_code = e.code
from (values
  ('LAST_PATIENT_LAST_VISIT', '07'), ('DATABASE_LOCK', '08'), ('STUDY_CLOSE_OUT', '09'),
  ('COUNTRY_APPROVAL', '01'), ('COUNTRY_CLOSE_OUT', '09'),
  ('SITE_ACTIVATED', '03'), ('SITE_CLOSED', '09')
) as e(type_code, code)
where m.code = e.type_code and m.tmf_event_code is null;

insert into milestone_types (code, label, applies_to, completed_by_site_status, sort_order, tmf_event_code) values
  ('CSR_APPROVED', 'Clinical study report approved', 'study', null, 45, '10'),
  ('TMF_LOCK', 'TMF closure / lock', 'study', null, 60, '12'),
  ('SITE_FIRST_MONITORING_VISIT', 'First monitoring visit', 'site', null, 35, '04')
on conflict (code) do nothing;

------------------------------------------------------------------------------
-- 3. tmf_config
------------------------------------------------------------------------------

-- Remove exact duplicates created by the old client-side seeding (identical copies; keep the oldest).
with ranked as (
  select id, row_number() over (
    partition by org_id, study_id, type, zone_num, coalesce(artifact_num, '')
    order by created_at, id
  ) as rn
  from tmf_config
), removed as (
  delete from tmf_config c using ranked r where c.id = r.id and r.rn > 1
  returning c.org_id, c.study_id
)
insert into audit_trail (user_id, user_email, org_id, action, study_id, field_changed, new_value, signature_reason)
select null, 'system: Part 3 migration', org_id, 'tmf_config.deduplicate', study_id, 'tmf_config',
       count(*)::text || ' duplicate rows removed', 'Identical duplicate configuration rows from double seeding'
from removed group by org_id, study_id;

create unique index if not exists tmf_config_unique_entry
  on tmf_config (org_id, study_id, type, zone_num, coalesce(artifact_num, ''));

alter table tmf_config add column if not exists taxonomy_artifact_id uuid references taxonomy_artifacts(id);
update tmf_config set taxonomy_artifact_id = taxonomy_artifact_for(artifact_num)
where type = 'artifact' and taxonomy_artifact_id is null and not is_custom;

-- Access: readable with study access; changes need edit_study; never deleted (disable instead).
drop policy if exists "Org members can manage their TMF config" on tmf_config;
drop policy if exists "tmf_config read" on tmf_config;
create policy "tmf_config read" on tmf_config for select to authenticated
  using (org_id = current_org_id() and can_access_study(auth.uid(), study_id, org_id));
drop policy if exists "tmf_config insert" on tmf_config;
create policy "tmf_config insert" on tmf_config for insert to authenticated
  with check (org_id = current_org_id() and can_access_study(auth.uid(), study_id, org_id) and user_has_permission('edit_study'));
drop policy if exists "tmf_config update" on tmf_config;
create policy "tmf_config update" on tmf_config for update to authenticated
  using (org_id = current_org_id() and can_access_study(auth.uid(), study_id, org_id) and user_has_permission('edit_study'))
  with check (org_id = current_org_id());
revoke delete, truncate on tmf_config from anon, authenticated;
revoke all on tmf_config from anon;

-- Identity columns are fixed; changes to what a study expects are audited (REG-01).
create or replace function tmf_config_guard_and_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
  v_key text;
begin
  if (new.org_id, new.study_id, new.type, new.zone_num, coalesce(new.artifact_num, ''))
     is distinct from (old.org_id, old.study_id, old.type, old.zone_num, coalesce(old.artifact_num, '')) then
    raise exception 'A configuration entry cannot be moved to another study, zone or artifact';
  end if;
  new.updated_at := now();
  foreach v_key in array array['is_enabled', 'is_locked', 'classification', 'disabled_reason', 'zone_name', 'section_name', 'artifact_name'] loop
    if (to_jsonb(new) -> v_key) is distinct from (to_jsonb(old) -> v_key) then
      v_before := v_before || jsonb_build_object(v_key, to_jsonb(old) -> v_key);
      v_after := v_after || jsonb_build_object(v_key, to_jsonb(new) -> v_key);
    end if;
  end loop;
  if v_after <> '{}'::jsonb then
    insert into audit_trail (user_id, user_email, org_id, action, study_id, field_changed, old_value, new_value, signature_reason)
    values (auth.uid(), coalesce(auth.jwt() ->> 'email', 'system'), new.org_id, 'tmf_config.update', new.study_id,
            'tmf_config:' || coalesce(new.artifact_num, 'zone ' || new.zone_num), v_before::text, v_after::text, new.disabled_reason);
  end if;
  return new;
end;
$$;

drop trigger if exists tmf_config_guard_and_audit on tmf_config;
create trigger tmf_config_guard_and_audit before update on tmf_config
  for each row execute function tmf_config_guard_and_audit();

-- Seeds a study's configuration from the active taxonomy. Idempotent; any member with
-- access to the study may trigger it (it only adds the standard model). Returns rows added.
create or replace function seed_study_tmf_config(p_study_code text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := current_org_id();
  v_version uuid;
  v_count integer;
  v_zones integer;
begin
  if v_org is null or not can_access_study(auth.uid(), p_study_code, v_org)
     or not exists (select 1 from studies where study_id = p_study_code and org_id = v_org) then
    raise exception 'Study not found' using errcode = '42501';
  end if;
  select id into v_version from taxonomy_versions where model = 'TMF Reference Model' and status = 'active';

  insert into tmf_config (org_id, study_id, type, zone_num, zone_name, is_enabled, is_locked, is_custom, created_by)
  select v_org, p_study_code, 'zone', ltrim(z.zone_num, '0'), z.name, true, false, false, coalesce(auth.jwt() ->> 'email', 'system')
  from taxonomy_zones z where z.version_id = v_version
  on conflict do nothing;
  get diagnostics v_zones = row_count;

  insert into tmf_config (org_id, study_id, type, zone_num, section_num, artifact_num, artifact_name, classification, iso_ref,
                          is_enabled, is_locked, is_custom, created_by, taxonomy_artifact_id)
  select v_org, p_study_code, 'artifact', ltrim(a.zone_num, '0'), ltrim(left(a.section_num, 2), '0') || substr(a.section_num, 3),
         a.artifact_num, a.name, a.classification, nullif(a.iso_ref, ''), true, false, false, coalesce(auth.jwt() ->> 'email', 'system'), a.id
  from taxonomy_artifacts a where a.version_id = v_version
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_zones + v_count;
end;
$$;

revoke execute on function seed_study_tmf_config(text) from anon;

------------------------------------------------------------------------------
-- 4. documents ↔ taxonomy
------------------------------------------------------------------------------

alter table documents add column if not exists taxonomy_artifact_id uuid references taxonomy_artifacts(id);
update documents set taxonomy_artifact_id = taxonomy_artifact_for(artifact_num)
where taxonomy_artifact_id is null and artifact_num is not null;

create or replace function documents_link_taxonomy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.artifact_num is distinct from old.artifact_num then
    new.taxonomy_artifact_id := taxonomy_artifact_for(new.artifact_num);
  end if;
  return new;
end;
$$;

drop trigger if exists documents_link_taxonomy on documents;
create trigger documents_link_taxonomy before insert or update of artifact_num on documents
  for each row execute function documents_link_taxonomy();
