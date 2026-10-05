// Part 11c — retention (RET-01). The study's own policy wins over the organisation default; the
// retention period starts at the trigger (study close-out, marketing authorisation, or a fixed date)
// and runs for the policy's number of years. Nothing is purged when it ends (D34): the period end is
// reported so the records can be reviewed.
import { z } from "zod";
import { isoDate, reason } from "./db";

export type Policy = { id: string; study_id: string | null; start_trigger: "study_closeout" | "marketing_authorisation" | "fixed_date"; years: number; start_date: string | null; notes: string | null; row_version: number };
export type StudyDates = { closed_at: string | null; marketing_authorisation_date: string | null };

export const TRIGGER_LABEL: Record<Policy["start_trigger"], string> = {
  study_closeout: "Study close-out", marketing_authorisation: "Marketing authorisation", fixed_date: "Fixed start date",
};

const policyBase = z.object({
  start_trigger: z.enum(["study_closeout", "marketing_authorisation", "fixed_date"]),
  years: z.number().int().min(1).max(100),
  start_date: isoDate.nullish(),
  notes: z.string().trim().max(2000).nullish(),
}).strict();
const needsDate = (p: { start_trigger: string; start_date?: string | null }) => p.start_trigger !== "fixed_date" || !!p.start_date;
const dateMessage = { message: "A fixed start date is needed", path: ["start_date"] };
/** Policy fields alone (the study route takes one reason for all its changes). */
export const policyFields = policyBase.refine(needsDate, dateMessage);
/** Policy fields with the reason for the change (organisation default). */
export const policySchema = policyBase.extend({ reason }).refine(needsDate, dateMessage);

function addYears(date: string, years: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function effectiveRetention(studyPolicy: Policy | null, orgPolicy: Policy | null, study: StudyDates) {
  const p = studyPolicy ?? orgPolicy;
  if (!p) return { source: "none" as const, policy: null, start: null, end: null, state: "no_policy" as const, waiting_for: null };
  const start = p.start_trigger === "study_closeout" ? study.closed_at?.slice(0, 10) ?? null
    : p.start_trigger === "marketing_authorisation" ? study.marketing_authorisation_date ?? p.start_date ?? null
    : p.start_date;
  const end = start ? addYears(start, p.years) : null;
  const today = new Date().toISOString().slice(0, 10);
  return {
    source: studyPolicy ? "study" as const : "organisation" as const,
    policy: { ...p, trigger_label: TRIGGER_LABEL[p.start_trigger] },
    start, end,
    state: !start ? "not_started" as const : end! <= today ? "ended" as const : "running" as const,
    waiting_for: start ? null : p.start_trigger === "study_closeout" ? "Study close-out" : "Marketing authorisation date",
  };
}
