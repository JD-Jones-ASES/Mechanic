"""Existence gate for CLAUDE.md invariant 5's per-THING first-principles
cross-check: every THING under site/src/content/things/ must map to a physics
test module in this directory. Until 2026-07-04 this requirement was enforced
by convention only (see the invariant → gate map in docs/architecture.md) —
and the gap was real: planetary-gearset shipped without one.

The map is deliberately static and explicit. Shipping a new THING means adding
BOTH the test module and its entry here; the failure message names the THING.
This gate checks EXISTENCE only — the independence and quality of each physics
test (re-derive, don't import residuals; hand-checkable golden) remain the
multi-angle-review's job (docs/sessions/protocol.md §3.2, §4)."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
THINGS_DIR = REPO_ROOT / "site" / "src" / "content" / "things"
TESTS_DIR = Path(__file__).resolve().parent

# slug -> physics test module (repo convention shortens the slug)
PHYSICS_TESTS = {
    "beam-shear-flow": "test_shear_flow_physics.py",
    "belt-drive": "test_belt_physics.py",
    "cantilever-beam": "test_beam_physics.py",
    "combined-shaft": "test_combined_physics.py",
    "compound-cylinder": "test_shrinkfit_physics.py",
    "eccentric-column": "test_eccentric_physics.py",
    "euler-column": "test_column_physics.py",
    "flywheel-disk": "test_flywheel_physics.py",
    "fourbar-linkage": "test_fourbar_physics.py",
    "helical-spring": "test_spring_physics.py",
    "planetary-gearset": "test_planetary_physics.py",
    "power-screw": "test_powerscrew_physics.py",
    "pressure-vessel": "test_vessel_physics.py",
    "rectangular-shaft-torsion": "test_rect_torsion_physics.py",
    "rotating-disk-bore": "test_disk_physics.py",
    "simply-supported-beam": "test_ssbeam_physics.py",
    "spur-gear-pair": "test_gear_physics.py",
    "stepped-shaft-fillet": "test_stepped_shaft_physics.py",
    "thick-walled-cylinder": "test_cylinder_physics.py",
    "thin-tube-torsion": "test_tube_physics.py",
    "torsion-shaft": "test_shaft_physics.py",
}


def _thing_slugs():
    return sorted(p.name for p in THINGS_DIR.iterdir() if (p / "thing.yaml").is_file())


def test_every_thing_has_a_physics_test():
    slugs = _thing_slugs()
    assert slugs, f"no THINGs found under {THINGS_DIR} — path drift?"
    for slug in slugs:
        assert slug in PHYSICS_TESTS, (
            f"THING '{slug}' has no first-principles physics test mapped in "
            f"{Path(__file__).name} (CLAUDE.md invariant 5). Write "
            f"pipeline/tests/test_<short>_physics.py for it and add the "
            f"slug -> module entry to PHYSICS_TESTS."
        )
        module = TESTS_DIR / PHYSICS_TESTS[slug]
        assert module.is_file(), (
            f"THING '{slug}' maps to {PHYSICS_TESTS[slug]}, but that file does "
            f"not exist in pipeline/tests/."
        )


def test_no_stale_map_entries():
    """Renamed or deleted THINGs must not leave dead entries claiming
    coverage that no longer corresponds to anything."""
    slugs = set(_thing_slugs())
    for slug in PHYSICS_TESTS:
        assert slug in slugs, (
            f"PHYSICS_TESTS maps '{slug}', but no such THING exists under "
            f"site/src/content/things/ — remove or update the entry."
        )
