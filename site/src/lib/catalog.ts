/**
 * The course-spine taxonomy (ADR-0010 §1): the SINGLE owner of category/topic
 * slugs, display names, order, and accent tokens. `CatalogSections.astro`
 * renders from it; `wayfinding.ts` (prev/next along the spine) orders from it.
 * Keeping the constant here — not inline in the catalog component — is what stops
 * the two surfaces from drifting (D2 brief trap: prev/next must walk the SAME
 * order the catalog owns, so it imports this rather than re-declaring it).
 *
 * An unknown category is already rejected by the Zod enum in content.config.ts;
 * topic membership + empty-topic checks live in CatalogSections.astro (they are
 * tied to rendering). This module is pure data + a pure ordering helper — no
 * astro:content import, so it stays trivially unit-checkable.
 */

export interface Topic {
  slug: string;
  name: string;
}

export interface Category {
  slug: string;
  name: string;
  blurb: string;
  accentVar: string; // CSS token for this category's accent (see global.css)
  topics: Topic[]; // empty ⇒ no subgrouping; THINGs render directly (ADR §1)
}

// Spine order. Topic order within a category is pedagogical (this list), NOT
// alphabetical — only the THINGs inside a topic sort alphabetically by title.
export const CATEGORIES: Category[] = [
  {
    slug: "mechanics-of-materials",
    name: "Mechanics of Materials",
    blurb: "How solids stretch, bend, twist, buckle, and fail under load.",
    accentVar: "--cat-mom",
    topics: [
      { slug: "axial-thermal-impact", name: "Axial, Thermal & Impact" },
      { slug: "beams-plates", name: "Beams & Plates" },
      { slug: "torsion-combined", name: "Torsion & Combined Loading" },
      { slug: "columns-stability", name: "Columns & Stability" },
      { slug: "pressure-rotating", name: "Pressure & Rotating Bodies" },
    ],
  },
  {
    slug: "machine-design",
    name: "Machine Design",
    blurb: "Sizing the elements that transmit power and carry service loads.",
    accentVar: "--cat-md",
    topics: [
      { slug: "gears-drives", name: "Gears & Drives" },
      { slug: "shafts-bearings", name: "Shafts & Bearings" },
      { slug: "joints-springs-clutches", name: "Joints, Springs & Clutches" },
    ],
  },
  {
    slug: "mechanisms-dynamics",
    name: "Mechanisms, Dynamics & Vibration",
    blurb: "Motion, stored energy, and the frequencies machines ring at.",
    accentVar: "--cat-mech",
    topics: [],
  },
];

export const categoryBySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));

/** The accent CSS custom-property for a category (falls back to the generic
 * accent for an unknown slug, which the Zod enum already forbids upstream). */
export function accentVarFor(categorySlug: string): string {
  return categoryBySlug.get(categorySlug)?.accentVar ?? "--accent";
}

/** Minimum a THING must carry to be placed in the spine (id + the two taxonomy
 * fields + the title we sort by). Both catalog cards and wayfinding satisfy it. */
export interface SpinePlaceable {
  id: string;
  title: string;
  category: string;
  topic?: string;
}

/** One rendered topic bucket: its (optional) topic head and the THINGs under it. */
export interface SpineGroup<T> {
  topic: Topic | null;
  things: T[];
}
/** One category section: the category and its topic buckets, in spine order. */
export interface SpineSection<T> {
  cat: Category;
  groups: SpineGroup<T>[];
}

/**
 * Group THINGs into the spine's category → topic buckets (category order and
 * topic order pedagogical; THINGs alphabetical by title within a topic; a
 * topicless category yields one null-topic bucket). This is the ONE
 * ordering/grouping algorithm: `CatalogSections.astro` renders these sections and
 * `spineOrdered` flattens them, so the catalog grid and the THING-page prev/next
 * cannot walk different sequences — the drift D2 set out to remove. (A THING with
 * a taxonomy value outside the enum is dropped here, but the build has already
 * failed in CatalogSections on such a value, so that is unreachable in a passing
 * build.)
 */
export function spineGroups<T extends SpinePlaceable>(things: T[]): SpineSection<T>[] {
  const byTitle = (a: T, b: T) => a.title.localeCompare(b.title);
  return CATEGORIES.map((cat) => {
    const inCat = things.filter((t) => t.category === cat.slug);
    const groups: SpineGroup<T>[] =
      cat.topics.length === 0
        ? [{ topic: null, things: [...inCat].sort(byTitle) }]
        : cat.topics.map((topic) => ({
            topic,
            things: inCat.filter((t) => t.topic === topic.slug).sort(byTitle),
          }));
    return { cat, groups };
  });
}

/** The canonical flat spine order — `spineGroups` read left to right. Prev/next
 * walks this; it equals the catalog's card order by construction (one algorithm),
 * which the catalog e2e's `SPINE_ORDER` pins. */
export function spineOrdered<T extends SpinePlaceable>(things: T[]): T[] {
  return spineGroups(things).flatMap((s) => s.groups).flatMap((g) => g.things);
}
