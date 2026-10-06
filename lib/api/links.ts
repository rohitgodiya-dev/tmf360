// Part 14b — document link types (LNK-02): each type and how it reads from the other document.
export const LINK_TYPES = {
  amends: ["amends", "amended by"], approves: ["approves", "approved by"], supersedes: ["supersedes", "superseded by"],
  translates: ["translates", "translated by"], relates_to: ["relates to", "relates to"],
} as const;
export type LinkType = keyof typeof LINK_TYPES;
