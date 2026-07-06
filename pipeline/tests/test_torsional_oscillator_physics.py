"""First-principles cross-check for torsional-oscillator (CLAUDE.md invariant 5).

This RE-DERIVES the disk-on-shaft natural frequency from mechanics — it does NOT
import thing.yaml's residuals. The model (lumped single-degree-of-freedom
torsional oscillator, the archetypal vibration problem):

  A rigid disk of polar mass moment J_d is carried on the end of an elastic shaft
  clamped at its far end. The shaft is a linear torsion spring: twisting the disk
  by an angle phi stores strain energy and produces a restoring torque -k_t*phi,
  with torsional stiffness k_t = G*J_p/L (the inverse of the shaft's twist-per-
  torque, theta = T*L/(G*J_p)). Newton's law for rotation of the disk is then

      J_d * phi'' = -k_t * phi          (equation of motion)

  which is simple harmonic motion at omega_n = sqrt(k_t/J_d). NOTHING here is
  taken from the compiled artifact: J_p and J_d are re-derived from their defining
  integrals, and omega_n is obtained TWO independent ways —
    (1) Rayleigh's energy method: max kinetic energy = max potential energy;
    (2) direct substitution of phi = Theta*sin(omega_n*t) into the EOM.
  The pipeline never integrates this ODE (it verifies the SHM step as a cited
  definition), so this test is a genuinely independent check.

Two headline facts the page is built on, asserted here:
  A. omega_n (hence f and T) contains NO amplitude Theta — isochronism. The
     STRESS quantities (T_dyn, tau_max) DO scale with Theta.
  B. omega_n^2 = (G/rho) * d^4/(16 L R^4 t_d): the material enters ONLY through
     the shear-wave group G/rho, so the frequency is nearly material-blind
     across metals while strength sets only the survivable amplitude.

Hand-checkable numeric golden (arithmetic on the formulas):
  G = 80 GPa, d = 0.04 m, L = 1.0 m, R = 0.15 m, t_d = 0.03 m, rho = 7800,
  Theta = 0.02 rad, sigma_y = 400 MPa:
    J_p   = pi*d^4/32 = pi*2.56e-6/32          = 2.51327e-7 m^4
    k_t   = G*J_p/L   = 80e9*2.51327e-7/1.0    = 20106.2 N*m/rad
    m_d   = rho*pi*R^2*t_d = 7800*pi*0.0225*0.03 = 16.5405 kg
    J_d   = 1/2*m_d*R^2 = 0.5*16.5405*0.0225   = 0.186081 kg*m^2
    omega_n = sqrt(k_t/J_d) = sqrt(108050)     = 328.71 rad/s
    f     = omega_n/(2*pi)                      = 52.316 Hz
    T     = 1/f                                 = 19.115 ms
    tau_max = G*d*Theta/(2*L) = 80e9*0.04*0.02/2 = 32.0 MPa   (exact)
    SF    = (sigma_y/2)/tau_max = 200e6/32e6    = 6.25        (exact)
Source: the torsional pendulum result omega_n = sqrt(k_t/J) is standard
(Timoshenko/Young/Weaver, Vibration Problems in Engineering; Den Hartog,
Mechanical Vibrations). k_t = GJ/L and tau = 16T/(pi d^3) are Gere ch. 3.
"""

import math
from pathlib import Path

import sympy as sp
import yaml

THING = (
    Path(__file__).resolve().parents[1].parent
    / "site" / "src" / "content" / "things" / "torsional-oscillator"
)

# geometry / material / motion symbols (positive where physical)
r, R, t_d, d, L = sp.symbols("r R t_d d L", positive=True)
rho, G, sigma_y = sp.symbols("rho G sigma_y", positive=True)
Theta = sp.symbols("Theta", positive=True)
J_d, k_t = sp.symbols("J_d k_t", positive=True)
t = sp.symbols("t", positive=True)


# ---------------------------------------------------------------------------
# 1. The two moments, re-derived from their defining integrals
# ---------------------------------------------------------------------------

def test_polar_area_moment_from_integral():
    """J_p = integral r^2 dA over the solid circular shaft = pi d^4/32."""
    J_p = sp.integrate(r**2 * (2 * sp.pi * r), (r, 0, d / 2))
    assert sp.simplify(J_p - sp.pi * d**4 / 32) == 0


def test_disk_mass_moment_from_integral():
    """J_d = integral r^2 dm over the uniform disk = 1/2 m_d R^2 (m_d = rho pi R^2 t_d)."""
    dm = rho * t_d * (2 * sp.pi * r)  # ring of radius r, thickness t_d
    Jd_int = sp.integrate(r**2 * dm, (r, 0, R))
    m_d = rho * sp.pi * R**2 * t_d
    assert sp.simplify(Jd_int - sp.Rational(1, 2) * m_d * R**2) == 0


# ---------------------------------------------------------------------------
# 2. omega_n = sqrt(k_t/J_d), derived two INDEPENDENT ways (not from the yaml)
# ---------------------------------------------------------------------------

def test_natural_frequency_by_energy_method():
    """Rayleigh: for phi(t) = Theta sin(w t), max KE = max PE gives w^2 = k_t/J_d.
    Uses only energy conservation and the SHM ansatz — not the answer."""
    w = sp.symbols("w", positive=True)
    phi = Theta * sp.sin(w * t)
    KE = sp.Rational(1, 2) * J_d * sp.diff(phi, t) ** 2
    PE = sp.Rational(1, 2) * k_t * phi**2
    KE_max = sp.simplify(KE.subs(t, 0))                 # phi=0, phi_dot max
    PE_max = sp.simplify(PE.subs(w * t, sp.pi / 2))     # phi=Theta, phi_dot=0
    roots = [s for s in sp.solve(sp.Eq(KE_max, PE_max), w) if s.is_positive]
    assert roots and sp.simplify(roots[0] - sp.sqrt(k_t / J_d)) == 0
    # total mechanical energy is constant in time (conservative oscillator)
    assert sp.simplify(sp.diff(KE + PE, t).subs(w, sp.sqrt(k_t / J_d))) == 0


def test_natural_frequency_satisfies_the_equation_of_motion():
    """phi = Theta sin(omega_n t) with omega_n = sqrt(k_t/J_d) satisfies
    J_d phi'' + k_t phi = 0 identically — the EOM the pipeline never integrates."""
    omega_n = sp.sqrt(k_t / J_d)
    phi = Theta * sp.sin(omega_n * t)
    eom = J_d * sp.diff(phi, t, 2) + k_t * phi
    assert sp.simplify(eom) == 0
    # and sympy's own dsolve returns the same angular frequency
    ph = sp.Function("phi")
    sol = sp.dsolve(J_d * ph(t).diff(t, 2) + k_t * ph(t), ph(t)).rhs
    insides = {a.args[0] for a in sol.atoms(sp.sin, sp.cos)}
    coeffs = {sp.simplify(a.coeff(t)) for a in insides}
    assert sp.sqrt(k_t / J_d) in coeffs


# ---------------------------------------------------------------------------
# 3. Substitute the shaft/disk closed forms; the headline properties
# ---------------------------------------------------------------------------

def _omega_n_geometry():
    """omega_n as a closed form in geometry+material via k_t=GJ_p/L, J_d=1/2 rho pi R^4 t_d."""
    J_p = sp.pi * d**4 / 32
    Jd = sp.Rational(1, 2) * rho * sp.pi * R**4 * t_d
    return sp.sqrt((G * J_p / L) / Jd)


def test_omega_n_closed_form_and_amplitude_independence():
    wn = sp.simplify(_omega_n_geometry())
    # equals sqrt(G d^4/(16 L rho R^4 t_d))
    assert sp.simplify(wn**2 - G * d**4 / (16 * L * rho * R**4 * t_d)) == 0
    # ISOCHRONISM: no amplitude anywhere in the frequency/period
    f = wn / (2 * sp.pi)
    T = 1 / f
    assert Theta not in wn.free_symbols
    assert Theta not in f.free_symbols
    assert Theta not in sp.simplify(T).free_symbols


def test_material_index_is_shear_wave_group():
    """omega_n^2 * rho/G is geometry-only: the material enters ONLY as G/rho."""
    wn2 = sp.simplify(_omega_n_geometry() ** 2)
    idx = sp.simplify(wn2 * rho / G)
    assert not (idx.free_symbols & {G, rho, sigma_y})
    assert sp.simplify(idx - d**4 / (16 * L * R**4 * t_d)) == 0


def test_stress_scales_with_amplitude_and_matches_shaft_form():
    """T_dyn = k_t Theta and tau_max = 16 T_dyn/(pi d^3) collapse to G d Theta/(2L)
    — the shaft-in-torsion surface stress evaluated at twist Theta — and BOTH
    carry the amplitude the frequency dropped."""
    J_p = sp.pi * d**4 / 32
    kt = G * J_p / L
    T_dyn = kt * Theta
    tau_max = 16 * T_dyn / (sp.pi * d**3)
    assert sp.simplify(tau_max - G * d * Theta / (2 * L)) == 0
    assert Theta in sp.simplify(T_dyn).free_symbols
    assert Theta in sp.simplify(tau_max).free_symbols


def test_frequency_and_period_relations():
    """f = omega_n/(2 pi) and T = 1/f = 2 pi sqrt(J_d/k_t)."""
    omega_n = sp.sqrt(k_t / J_d)
    f = omega_n / (2 * sp.pi)
    T = 1 / f
    assert sp.simplify(T - 2 * sp.pi * sp.sqrt(J_d / k_t)) == 0
    assert sp.simplify(f * 2 * sp.pi - omega_n) == 0


# ---------------------------------------------------------------------------
# 4. Hand-checkable numeric golden
# ---------------------------------------------------------------------------

def test_numeric_golden():
    """Round steel-ish inputs; arithmetic on the formulas (see module docstring)."""
    Gv, dv, Lv, Rv, tdv, rhov, Thv, syv = 80e9, 0.04, 1.0, 0.15, 0.03, 7800.0, 0.02, 400e6
    J_p = math.pi * dv**4 / 32
    k_tv = Gv * J_p / Lv
    m_d = rhov * math.pi * Rv**2 * tdv
    Jdv = 0.5 * m_d * Rv**2
    omega_n = math.sqrt(k_tv / Jdv)
    f = omega_n / (2 * math.pi)
    T = 1 / f
    tau_max = 16 * (k_tv * Thv) / (math.pi * dv**3)
    SF = (syv / 2) / tau_max
    assert math.isclose(J_p, 2.513274e-7, rel_tol=1e-5)
    assert math.isclose(k_tv, 20106.19, rel_tol=1e-5)
    assert math.isclose(Jdv, 0.186081, rel_tol=1e-5)
    assert math.isclose(omega_n, 328.711, rel_tol=1e-5)
    assert math.isclose(f, 52.3155, rel_tol=1e-5)
    assert math.isclose(T, 0.0191146, rel_tol=1e-5)      # 19.11 ms
    assert math.isclose(tau_max, 32.0e6, rel_tol=1e-9)   # exactly 32 MPa
    assert math.isclose(SF, 6.25, rel_tol=1e-9)          # exactly 6.25
    # the kinematic shortcut agrees: tau_max = G d Theta/(2L)
    assert math.isclose(tau_max, Gv * dv * Thv / (2 * Lv), rel_tol=1e-12)


# ---------------------------------------------------------------------------
# 5. Drift guard: the authored thing.yaml solves for exactly these forms
# ---------------------------------------------------------------------------

def test_authored_solutions_match_first_principles():
    raw = yaml.safe_load((THING / "thing.yaml").read_text(encoding="utf-8"))
    cfg = next(c for c in raw["configurations"] if c["id"] == "geometry-in")
    syms = sp.symbols(
        "d L R t_d Theta T_app G rho sigma_y", positive=True
    )
    env = dict(zip(["d", "L", "R", "t_d", "Theta", "T_app", "G", "rho", "sigma_y"], syms))
    vals = dict(env)
    for name, expr in cfg["solutions"].items():
        vals[name] = sp.sympify(str(expr), locals=vals)
    dd, LL, RR, td, Th, Tapp, GG, rr, sy = syms
    J_p = sp.pi * dd**4 / 32
    Jd = sp.Rational(1, 2) * rr * sp.pi * RR**4 * td
    assert sp.simplify(vals["J_p"] - J_p) == 0
    assert sp.simplify(vals["J_d"] - Jd) == 0
    assert sp.simplify(vals["J_shaft"] - rr * sp.pi * dd**4 * LL / 32) == 0
    assert sp.simplify(vals["omega_n"] - sp.sqrt(GG * J_p / (LL * Jd))) == 0
    assert sp.simplify(vals["f"] - vals["omega_n"] / (2 * sp.pi)) == 0
    assert sp.simplify(vals["T_per"] - 1 / vals["f"]) == 0
    assert sp.simplify(vals["T_dyn"] - GG * J_p * Th / LL) == 0
    assert sp.simplify(vals["tau_max"] - GG * dd * Th / (2 * LL)) == 0
    assert sp.simplify(vals["SF"] - sy / (2 * vals["tau_max"])) == 0
    assert sp.simplify(vals["theta_st"] - Tapp * LL / (GG * J_p)) == 0
    # amplitude appears in the stress chain but NOT in the frequency chain
    assert Th not in vals["omega_n"].free_symbols
    assert Th not in vals["f"].free_symbols
    assert Th in vals["tau_max"].free_symbols


# ---------------------------------------------------------------------------
# 6. Both warn envelopes are reachable and correctly directional
# ---------------------------------------------------------------------------

def test_warn_boundaries_reachable_and_directional():
    """At the widget's live default MATERIAL (al-2024-t3 aluminium, the first
    seed publishing G+rho+sigma_y) the page is warn-clear; each warn trips when
    a knob is pushed. (The thing.yaml G/rho/sigma_y *defaults* are nominal steel
    for file coherence, per the torsion-shaft/flywheel convention; the live
    widget seeds from the materials DB, so aluminium is what a reader first sees.)
    Both boundaries are checked from first principles."""
    # J_shaft/J_d = L d^4/(16 R^4 t_d) — purely geometric (material cancels)
    ratio = lambda dd, LL, RR, td: LL * dd**4 / (16 * RR**4 * td)
    assert ratio(0.02, 0.5, 0.12, 0.02) < 0.1          # default: shaft inertia negligible
    assert ratio(0.06, 0.5, 0.05, 0.02) > 0.1          # fat shaft, small disk: warn
    # tau_max = G d Theta/(2L); aluminium G≈27.6 GPa, sigma_y≈324 MPa
    G_al, sy_al = 27.58e9, 324.0e6
    tau = lambda dd, LL, Th: G_al * dd * Th / (2 * LL)
    assert tau(0.02, 0.5, 0.05) < sy_al / 2            # default amplitude: clear
    assert tau(0.02, 0.5, 0.5) > sy_al / 2             # ring it hard: shear-yield warn
