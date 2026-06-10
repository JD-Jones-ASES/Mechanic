/**
 * BASE_URL discipline (CLAUDE.md / ADR-0004): with `base: "/Mechanic"`,
 * Astro's import.meta.env.BASE_URL carries NO trailing slash — naive
 * `${base}things/` concatenation produces /Mechanicthings/ (a live 404
 * found by clicking, not by tests; see the nav click-through e2e).
 * Every internal href goes through here so the joining rule lives in
 * exactly one place, robust to either trailing-slash convention.
 */
export function withBase(path = ""): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
}
