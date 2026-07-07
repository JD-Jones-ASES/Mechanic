"""Unit coverage for material-binding slot normalization (S17).

`_normalize_material_binds` is the ONE place an authored `materials.binds` — a
flat ``{symbol: property_key}`` map OR named slots ``{slot: {symbol: key}}`` — is
folded into the slot-keyed shape the compiled artifact carries. A flat map must
become a lone ``default`` slot so every previously shipped (single-binding) THING
is byte-for-byte unchanged; named slots pass through; bad shapes fail loudly.

The END-TO-END wiring is additionally gated by `pnpm build`: the compiled Zod
schema requires slot-keyed `material_binding`, so a legacy THING that failed to
normalize would be rejected at build; and composite-bar's two-slot artifact
proves the named-slot path.
"""

import pytest

from mech_pipeline import BuildError
from mech_pipeline.compile import _normalize_material_binds


def test_empty_binds_is_no_binding():
    assert _normalize_material_binds({}, "ctx") == ({}, {})
    assert _normalize_material_binds(None, "ctx") == ({}, {})


def test_flat_map_normalizes_to_a_single_default_slot():
    binding, flat = _normalize_material_binds(
        {"E": "youngs_modulus", "sigma_y": "yield_strength", "rho": "density"}, "ctx"
    )
    assert binding == {
        "default": {"E": "youngs_modulus", "sigma_y": "yield_strength", "rho": "density"}
    }
    # the flat lookup the per-variable checks use is the same map, un-nested
    assert flat == {"E": "youngs_modulus", "sigma_y": "yield_strength", "rho": "density"}


def test_named_slots_pass_through_and_flatten():
    binding, flat = _normalize_material_binds(
        {
            "core": {"E_1": "youngs_modulus", "rho_1": "density"},
            "sleeve": {"E_2": "youngs_modulus", "rho_2": "density"},
        },
        "ctx",
    )
    assert binding == {
        "core": {"E_1": "youngs_modulus", "rho_1": "density"},
        "sleeve": {"E_2": "youngs_modulus", "rho_2": "density"},
    }
    # bound symbols are globally unique across slots, so the flat lookup is a union
    assert flat == {
        "E_1": "youngs_modulus",
        "rho_1": "density",
        "E_2": "youngs_modulus",
        "rho_2": "density",
    }


def test_slot_order_is_preserved():
    binding, _ = _normalize_material_binds(
        {"sleeve": {"E_2": "youngs_modulus"}, "core": {"E_1": "youngs_modulus"}}, "ctx"
    )
    assert list(binding) == ["sleeve", "core"]  # author order, for stable picker order


def test_mixed_flat_and_slot_shapes_fail():
    with pytest.raises(BuildError, match="mixes a flat map"):
        _normalize_material_binds({"E": "youngs_modulus", "core": {"E_1": "youngs_modulus"}}, "ctx")


def test_symbol_bound_in_two_slots_fails():
    with pytest.raises(BuildError, match="bound in more than one material slot"):
        _normalize_material_binds(
            {"core": {"E": "youngs_modulus"}, "sleeve": {"E": "youngs_modulus"}}, "ctx"
        )


def test_invalid_slot_name_fails():
    with pytest.raises(BuildError, match="not a valid identifier"):
        _normalize_material_binds({"1core": {"E_1": "youngs_modulus"}}, "ctx")


def test_empty_slot_fails():
    with pytest.raises(BuildError, match="binds no symbols"):
        _normalize_material_binds({"core": {}}, "ctx")


def test_non_string_property_value_fails():
    with pytest.raises(BuildError, match="property-key string"):
        _normalize_material_binds({"core": {"E_1": ["youngs_modulus"]}}, "ctx")
