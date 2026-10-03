// Lifecycle vocabularies for study structure (STU-03). Must match the CHECK
// constraints in migration 20261004000001.
export const COUNTRY_STATUSES = ["startup", "ongoing", "closed"] as const;
export const SITE_STATUSES = ["identified", "selected", "qualified", "ongoing", "closed", "deactivated"] as const;
