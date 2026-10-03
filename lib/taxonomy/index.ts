// TMF Reference Model — the single source of truth for the taxonomy in code.
// The same data is loaded into the database (taxonomy_* tables) by migration;
// an integration test fails if the two ever differ.
import model from "./tmf-rm-3.3.1.json";

export type Classification = "Core" | "Recommended";

export type TaxonomyArtifact = {
  /** Artifact number, e.g. "05.02.18". Can change between model versions. */
  n: string;
  /** Permanent unique ID from the model, e.g. "101". Stable across versions: key on this. */
  u: string;
  name: string;
  cl: Classification;
  /** Applicability: sponsor TMF / investigator site file, for drug and device trials. */
  sponsor: boolean;
  investigator: boolean;
  device_sponsor: boolean;
  device_investigator: boolean;
  /** Investigator-initiated studies: Mandatory, Dependent on study type, Recommended. */
  iis: "M" | "D" | "R";
  process: string;
  dating: string;
  /** Milestone event code (see MILESTONE_EVENTS) by which the site-level document is expected. */
  site_milestone: string | null;
  iso: string;
  /** Definition / purpose. */
  d: string;
  /** Recommended sub-artifacts (document types filed under this artifact). */
  s: string[];
};

export const TAXONOMY_MODEL = model.model;
export const TAXONOMY_VERSION = model.version;
export const TAXONOMY_RELEASED_ON = model.released_on;
export const ZONES_V = model.zones as [string, string][];
export const SECTIONS_V = model.sections as [string, string][];
export const MILESTONE_EVENTS = model.milestone_events as [string, string, string][];
export const ARTIFACTS = model.artifacts as TaxonomyArtifact[];

const zoneName = new Map(ZONES_V);
const sectionName = new Map(SECTIONS_V);

/** Legacy shape used throughout the platform UI: zone "1", section "1.01" (no leading zero). */
export type LegacyArtifact = { z: string; zn: string; s: string; sn: string; a: string; an: string; cl: string; iso: string; uid: string };

export const LEGACY_TMF: LegacyArtifact[] = ARTIFACTS.map((a) => {
  const zone = a.n.slice(0, 2);
  const section = a.n.slice(0, 5);
  return {
    z: String(Number(zone)),
    zn: zoneName.get(zone) ?? "",
    s: String(Number(zone)) + section.slice(2),
    sn: sectionName.get(section) ?? "",
    a: a.n,
    an: a.name,
    cl: a.cl,
    iso: a.iso,
    uid: a.u,
  };
});

export const LEGACY_ZONES = ZONES_V.map(([z, zn]) => ({ z: String(Number(z)), zn }));

export const artifactByNumber = new Map(ARTIFACTS.map((a) => [a.n, a]));
export const artifactByUid = new Map(ARTIFACTS.map((a) => [a.u, a]));
