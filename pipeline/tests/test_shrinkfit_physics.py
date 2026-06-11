"""Independent physics cross-check for the compound cylinder (shrink fit):
re-solve both members' Lamé boundary-value problems from the two-parameter
family, certify the interference closure with Poisson's ratio left SYMBOLIC
(the same-material cancellation is proven, not sampled), certify the
superposed service field as the full elastic solution (equilibrium +
compatibility + BCs + interface continuity + the preserved δ-gap), and pin
the THING's punchlines: the balanced-fit closed form, the geometric-mean
optimum r_c = √(r_i·r_o) with capacity σ_y(1 − r_i/r_o) — approaching twice
the monobloc ceiling — the δ → 0 hand-off back to the thick-walled cylinder,
a no-silent-yield sweep over the warn/refusal envelope set, and Timoshenko's
own worked example (Art. 41, Prob. 2: 4,050 psi) as a published golden."""

import math
import random

import sympy as sp

r, r_i, r_c, r_o = sp.symbols("r r_i r_c r_o", positive=True)
E, delta, p, p_c, nu, sigma_y = sp.symbols("E delta p p_c nu sigma_y", positive=True)

# The authored closed forms (exactly as in thing.yaml's analyze configuration)
P_C = E * delta * (r_o**2 - r_c**2) * (r_c**2 - r_i**2) / (2 * r_c**3 * (r_o**2 - r_i**2))
SIGMA_TI_RES = -2 * p_c * r_c**2 / (r_c**2 - r_i**2)
SIGMA_TC_RES = p_c * (r_o**2 + r_c**2) / (r_o**2 - r_c**2)
SIGMA_TI_TOT = p * (r_o**2 + r_i**2) / (r_o**2 - r_i**2) + SIGMA_TI_RES
TAU_BORE = p * r_o**2 / (r_o**2 - r_i**2) - p_c * r_c**2 / (r_c**2 - r_i**2)
TAU_IFACE = p_c * r_o**2 / (r_o**2 - r_c**2) + p * r_i**2 * r_o**2 / (r_c**2 * (r_o**2 - r_i**2))
DELTA_BAL = 2 * p * r_c * r_o**2 * (r_c**2 - r_i**2) / (E * (2 * r_o**2 * r_c**2 - r_c**4 - r_o**2 * r_i**2))


def _lame(p_in, p_out, ra, rb):
    """Solve the Lamé family σ_r = A − B/r², σ_θ = A + B/r² for the two
    pressure boundary conditions — the same independent re-solve the
    thick-walled-cylinder test performs."""
    A, B = sp.symbols("A B")
    ((Av, Bv),) = sp.linsolve(
        [sp.Eq(A - B / ra**2, -p_in), sp.Eq(A - B / rb**2, -p_out)], [A, B]
    )
    return Av - Bv / r**2, Av + Bv / r**2  # σ_r(r), σ_θ(r)


# member fields: liner under EXTERNAL p_c, jacket under INTERNAL p_c,
# and the monobloc working field of the assembled wall under p
SR_L, ST_L = _lame(0, p_c, r_i, r_c)
SR_J, ST_J = _lame(p_c, 0, r_c, r_o)
SR_W, ST_W = _lame(p, 0, r_i, r_o)


def _u(st, sr, at):
    """Plane-stress Hooke radial displacement of a face: u = (r/E)(σ_θ − ν σ_r),
    from ε_θ = u/r — ν stays symbolic everywhere it appears."""
    return (at / E) * (st.subs(r, at) - nu * sr.subs(r, at))


def test_lame_bvps_resolve_to_the_assembly_stresses():
    """The liner alone (external p_c) and jacket alone (internal p_c) re-solved
    from the family: hoop at the liner bore is −2p_c r_c²/(r_c²−r_i²) — the
    relief factor 2r_c²/(r_c²−r_i²) exceeds 2 for every geometry — and hoop at
    the jacket bore is p_c(r_o²+r_c²)/(r_o²−r_c²). Both members' fields also
    satisfy the no-body-force equilibrium ODE d(r·σ_r)/dr = σ_θ."""
    assert sp.simplify(ST_L.subs(r, r_i) - SIGMA_TI_RES) == 0
    assert sp.simplify(ST_J.subs(r, r_c) - SIGMA_TC_RES) == 0
    for sr_, st_ in ((SR_L, ST_L), (SR_J, ST_J), (SR_W, ST_W)):
        assert sp.simplify(sp.diff(r * sr_, r) - st_) == 0
        # plane-stress strain compatibility for each member field individually
        eps_t = (st_ - nu * sr_) / E
        eps_r = (sr_ - nu * st_) / E
        assert sp.simplify(sp.diff(r * eps_t, r) - eps_r) == 0
    # relief factor > 2: the difference is manifestly positive
    relief = -SIGMA_TI_RES / p_c
    assert sp.simplify(relief - 2 - 2 * r_i**2 / (r_c**2 - r_i**2)) == 0


def test_closure_cancels_nu_and_solves_to_eq_181():
    """Interference closure δ = u_jacket(r_c) − u_liner(r_c) with ν fully
    symbolic: the jacket contributes +ν p_c r_c/E, the liner −ν p_c r_c/E, and
    the solved contact pressure is Timoshenko's eq. 181 with NO ν left in it —
    the same-material cancellation as a theorem, not a sample. The Shigley
    §3-16 member-constant form (K_o + K_i) collapses to the same expression."""
    closure = sp.Eq(delta, _u(ST_J, SR_J, r_c) - _u(ST_L, SR_L, r_c))
    (pc_solved,) = sp.solve(closure, p_c)
    assert nu not in pc_solved.free_symbols
    assert sp.simplify(pc_solved - P_C) == 0
    # Shigley tutorial form: delta = p R (K_o + K_i), K_o=(C_o+ν)/E, K_i=(C_i−ν)/E
    C_o = (r_o**2 + r_c**2) / (r_o**2 - r_c**2)
    C_i = (r_c**2 + r_i**2) / (r_c**2 - r_i**2)
    assert sp.simplify(delta - P_C * r_c * ((C_o + nu) / E + (C_i - nu) / E)) == 0


def test_superposed_service_field_is_the_full_elastic_solution():
    """The complete certificate for the pressurized assembly, per shell
    (liner: working + external-p_c field; jacket: working + internal-p_c
    field): (a) equilibrium d(r·σ_r)/dr = σ_θ; (b) plane-stress strain
    compatibility ε_r = d(r·ε_θ)/dr; (c) σ_r = −p at the bore, 0 at the rim;
    (d) σ_r continuous across the interface; (e) the two faces remain exactly
    δ apart in displacement — the fit neither gaps nor double-counts under
    pressure (ν symbolic throughout). Uniqueness does the rest."""
    fields = {
        "liner": (SR_W + SR_L, ST_W + ST_L),
        "jacket": (SR_W + SR_J, ST_W + ST_J),
    }
    for sr_, st_ in fields.values():
        assert sp.simplify(sp.diff(r * sr_, r) - st_) == 0
        eps_t = (st_ - nu * sr_) / E
        eps_r = (sr_ - nu * st_) / E
        assert sp.simplify(sp.diff(r * eps_t, r) - eps_r) == 0
    assert sp.simplify(fields["liner"][0].subs(r, r_i) + p) == 0
    assert sp.simplify(fields["jacket"][0].subs(r, r_o)) == 0
    jump = (fields["jacket"][0] - fields["liner"][0]).subs(r, r_c)
    assert sp.simplify(jump) == 0
    gap = _u(*fields["jacket"][::-1], r_c) - _u(*fields["liner"][::-1], r_c)
    assert sp.simplify(gap.subs(p_c, P_C) - delta) == 0


def test_governing_shears_at_both_candidate_points():
    """2τ_bore = σ_θ,i(total) + p (radial there is the full −p), and τ_iface
    is the jacket-bore spread of the superposed field. At the jacket bore the
    hoop total is manifestly positive and the radial total manifestly negative
    for every legal state, so 2τ_iface is the honest Tresca spread there with
    no sign caveat — the bore needs (and gets) the scoped envelope instead."""
    st_bore_tot = (ST_W + ST_L).subs(r, r_i)
    assert sp.simplify(st_bore_tot - SIGMA_TI_TOT) == 0
    assert sp.simplify((SIGMA_TI_TOT + p) / 2 - TAU_BORE) == 0
    st_iface_tot = (ST_W + ST_J).subs(r, r_c)
    sr_iface_tot = (SR_W + SR_J).subs(r, r_c)
    assert sp.simplify((st_iface_tot - sr_iface_tot) / 2 - TAU_IFACE) == 0
    # hoop > 0 there: working part is p·r_i²(r_c²+r_o²)/(r_c²(r_o²−r_i²)), assembly part C_o·p_c
    work_hoop = ST_W.subs(r, r_c)
    assert sp.simplify(work_hoop - p * r_i**2 * (r_c**2 + r_o**2) / (r_c**2 * (r_o**2 - r_i**2))) == 0
    # radial < 0 there: working part is −p·r_i²(r_o²−r_c²)/(r_c²(r_o²−r_i²)), assembly part −p_c
    work_rad = SR_W.subs(r, r_c)
    assert sp.simplify(work_rad + p * r_i**2 * (r_o**2 - r_c**2) / (r_c**2 * (r_o**2 - r_i**2))) == 0


def test_balanced_interference_closed_form_and_positivity():
    """τ_bore falls and τ_iface rises linearly in p_c, so equality has exactly
    one root; mapping it back through the closure gives the authored
    δ_bal = 2p r_c r_o²(r_c²−r_i²) / (E(2r_o²r_c² − r_c⁴ − r_o²r_i²)). The
    denominator is r_c²(r_o²−r_c²) + r_o²(r_c²−r_i²) — positive for every
    legal geometry, so a balanced fit always exists."""
    (pc_bal,) = sp.solve(sp.Eq(TAU_BORE, TAU_IFACE), p_c)
    (delta_of_pc,) = sp.solve(sp.Eq(p_c, P_C), delta)
    assert sp.simplify(delta_of_pc.subs(p_c, pc_bal) - DELTA_BAL) == 0
    den = 2 * r_o**2 * r_c**2 - r_c**4 - r_o**2 * r_i**2
    assert sp.simplify(den - (r_c**2 * (r_o**2 - r_c**2) + r_o**2 * (r_c**2 - r_i**2))) == 0


def test_geometric_mean_optimum_approaches_twice_the_monobloc_ceiling():
    """THE punchline. At the balanced fit the common shear sets the elastic
    capacity p_cap(r_c); calculus puts its maximum exactly at r_c = √(r_i·r_o),
    where p_cap = σ_y(1 − r_i/r_o). Against the monobloc ceiling
    (σ_y/2)(1 − r_i²/r_o²) the gain is 2/(1 + r_i/r_o): strictly between 1 and
    2, → 2 as r_i/r_o → 0 (two shells, twice the ceiling) and → 1 as
    r_i → r_o (thin walls gain nothing — the fit has nothing to relieve)."""
    (pc_bal,) = sp.solve(sp.Eq(TAU_BORE, TAU_IFACE), p_c)
    tau_balanced = sp.simplify(TAU_BORE.subs(p_c, pc_bal))
    (p_cap,) = sp.solve(sp.Eq(2 * tau_balanced, sigma_y), p)
    crits = sp.solve(sp.Eq(sp.diff(p_cap, r_c), 0), r_c)
    assert len(crits) == 1  # the geometric mean is the ONLY stationary point
    assert sp.simplify(crits[0] - sp.sqrt(r_i * r_o)) == 0
    p_star = sp.simplify(p_cap.subs(r_c, sp.sqrt(r_i * r_o)))
    assert sp.simplify(p_star - sigma_y * (1 - r_i / r_o)) == 0
    mono_cap = sigma_y / 2 * (1 - r_i**2 / r_o**2)
    gain = sp.simplify(p_star / mono_cap)
    assert sp.simplify(gain - 2 / (1 + r_i / r_o)) == 0
    assert sp.limit(gain, r_i, 0, "+") == 2
    assert sp.simplify(gain.subs(r_i, r_o)) == 1
    # the second-order PROOF that the stationary point is a maximum: the second
    # derivative there is exactly −4σ_y/r_o², manifestly negative
    d2 = sp.diff(p_cap, r_c, 2).subs(r_c, sp.sqrt(r_i * r_o))
    assert sp.simplify(d2 + 4 * sigma_y / r_o**2) == 0


def test_zero_interference_hands_off_to_the_monobloc_cylinder():
    """δ → 0: the contact pressure vanishes and every service quantity
    collapses to the thick-walled-cylinder page's monobloc values — the bore
    shear becomes that THING's governing τ_max = p·r_o²/(r_o²−r_i²) and the
    bore hoop its σ_θ,i = p(r_o²+r_i²)/(r_o²−r_i²). The hand-off is exact, in
    both directions of the family."""
    assert sp.limit(P_C, delta, 0, "+") == 0
    tau_mono = p * r_o**2 / (r_o**2 - r_i**2)
    assert sp.simplify(TAU_BORE.subs(p_c, 0) - tau_mono) == 0
    sigma_mono = p * (r_o**2 + r_i**2) / (r_o**2 - r_i**2)
    assert sp.simplify(SIGMA_TI_TOT.subs(p_c, 0) - sigma_mono) == 0


def test_no_silent_bore_yield_across_the_envelope_set():
    """The bore's true triaxial Tresca spread (principals σ_θ,tot, −p, ~0) is
    piecewise — the page's smooth relations cannot encode it. This sweep
    certifies the envelope SET covers it anyway: at every sampled state where
    the true spread reaches σ_y, at least one of (service-yield warn
    2τ_bore ≥ σ_y) / (assembly-compression warn −σ_θ,i^res ≥ σ_y) / (scoped
    refusal σ_θ,i ≤ 0) has fired — no silent yield. 4000 seeded states across
    the knob ranges and a 35 MPa – 1 GPa σ_y spread."""
    f_pc = sp.lambdify((r_i, r_c, r_o, E, delta), P_C, "math")
    f_res = sp.lambdify((r_i, r_c, p_c), SIGMA_TI_RES, "math")
    f_tot = sp.lambdify((r_i, r_o, p, p_c, r_c), SIGMA_TI_TOT, "math")
    f_tau = sp.lambdify((r_i, r_c, r_o, p, p_c), TAU_BORE, "math")
    rng = random.Random(11)
    checked = yielded_states = 0
    while checked < 4000:
        a_, c_, o_ = sorted(rng.uniform(0.005, 0.5) for _ in range(3))
        if c_ - a_ < 1e-4 or o_ - c_ < 1e-4:
            continue
        checked += 1
        d_ = rng.uniform(1e-6, 5e-4)
        p_ = rng.uniform(1e5, 6e8)
        sy_ = rng.choice([35e6, 250e6, 250e6, 1.0e9])
        pc_ = f_pc(a_, c_, o_, 200e9, d_)
        s_tot = f_tot(a_, o_, p_, pc_, c_)
        spread = max(s_tot, 0.0, -p_) - min(s_tot, 0.0, -p_)
        if spread >= sy_:
            yielded_states += 1
            flagged = (
                2 * f_tau(a_, c_, o_, p_, pc_) >= sy_
                or -f_res(a_, c_, pc_) >= sy_
                or s_tot <= 0
            )
            assert flagged, (a_, c_, o_, d_, p_, sy_)
    assert yielded_states > 100  # the sweep actually exercised the yield regime


def test_timoshenko_prob2_published_golden():
    """Timoshenko (1930), Art. 41, Prob. 2: a = 4 in, b = 6 in, c = 8 in,
    E = 30×10⁶ psi, δ = 0.005 in → shrink-fit pressure 4,050 lb/in² in the
    book. The authored relation reproduces 4050.93 psi — agreement to the
    book's own rounding (the relation is dimensionally homogeneous, so the
    inch-psi system passes straight through)."""
    pc_ = float(P_C.subs({r_i: 4, r_c: 6, r_o: 8, E: 30e6, delta: 0.005}))
    assert abs(pc_ - 4050.0) / 4050.0 < 5e-4


def test_numeric_golden():
    """Hand-checkable at the page defaults (r_i = 40 mm, r_c = 60 mm — exactly
    √(40·90) — r_o = 90 mm, δ = 30 µm, p = 100 MPa, steel-a36: E = 200 GPa,
    σ_y = 250 MPa, ρ = 7850): p_c = 19.231 MPa, σ_θ,i^res = −69.231 MPa,
    σ_θ,c^res = 50.0 MPa, σ_θ,i = 80.0 MPa, τ_i = τ_c = 90.0 MPa (the default
    state IS the balanced fit: δ_bal = 30.0 µm), SF_i = SF_c = 1.3889,
    μ = 160.30 kg/m. The same envelope as a monobloc wall at the same pressure
    reads 2τ = 249.2 MPa — SF 1.003, the doorstep of its ceiling — while the
    balanced compound holds 1.389: the 2/(1 + 4/9) = 18/13 gain, on the nose."""
    a_, c_, o_ = 0.04, 0.06, 0.09
    d_, p_, E_, sy, rho_ = 30e-6, 100e6, 200e9, 250e6, 7850.0
    pc_ = E_ * d_ * (o_**2 - c_**2) * (c_**2 - a_**2) / (2 * c_**3 * (o_**2 - a_**2))
    assert abs(pc_ - 19.2308e6) / 19.2308e6 < 1e-4
    s_res = -2 * pc_ * c_**2 / (c_**2 - a_**2)
    assert abs(s_res - -69.2308e6) / 69.2308e6 < 1e-4
    s_jres = pc_ * (o_**2 + c_**2) / (o_**2 - c_**2)
    assert abs(s_jres - 50.0e6) / 50.0e6 < 1e-4
    s_tot = p_ * (o_**2 + a_**2) / (o_**2 - a_**2) + s_res
    assert abs(s_tot - 80.0e6) / 80.0e6 < 1e-4
    tb = p_ * o_**2 / (o_**2 - a_**2) - pc_ * c_**2 / (c_**2 - a_**2)
    tc = pc_ * o_**2 / (o_**2 - c_**2) + p_ * a_**2 * o_**2 / (c_**2 * (o_**2 - a_**2))
    assert abs(tb - 90.0e6) / 90.0e6 < 1e-4
    assert abs(tc - 90.0e6) / 90.0e6 < 1e-4
    assert abs(sy / (2 * tb) - 1.38889) < 1e-4
    assert abs(sy / (2 * tc) - 1.38889) < 1e-4
    dbal = 2 * p_ * c_ * o_**2 * (c_**2 - a_**2) / (E_ * (2 * o_**2 * c_**2 - c_**4 - o_**2 * a_**2))
    assert abs(dbal - 30.0e-6) / 30.0e-6 < 1e-4
    mu = rho_ * math.pi * (o_**2 - a_**2)
    assert abs(mu - 160.30) / 160.30 < 1e-3
    # the monobloc wall of the same envelope, for the overview's comparison
    tau_mono = p_ * o_**2 / (o_**2 - a_**2)
    assert abs(sy / (2 * tau_mono) - 1.00308) < 1e-4
    assert abs((sy / (2 * tb)) / (sy / (2 * tau_mono)) - 18 / 13) < 1e-4
    # interface sits at the geometric mean: the default geometry IS the optimum
    assert abs(c_ - math.sqrt(a_ * o_)) < 1e-12
