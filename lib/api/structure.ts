// Lifecycle vocabularies for study structure (STU-03). Must match the CHECK
// constraints in migration 20261004000001.
export const COUNTRY_STATUSES = ["startup", "ongoing", "closed"] as const;
export const SITE_STATUSES = ["identified", "selected", "qualified", "ongoing", "closed", "deactivated"] as const;
// Site institution type on parties (migration 20261106000001).
export const INSTITUTION_TYPES = ["academic_hospital", "hospital", "private_practice", "research_centre", "other"] as const;
export const INSTITUTION_LABELS: Record<(typeof INSTITUTION_TYPES)[number], string> = {
  academic_hospital: "Academic hospital", hospital: "Hospital", private_practice: "Private practice",
  research_centre: "Research centre", other: "Other",
};
