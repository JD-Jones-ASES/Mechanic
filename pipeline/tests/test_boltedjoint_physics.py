"""Independent physics cross-check for the bolted-joint-gasket THING. NOTHING is
imported from thing.yaml — the load-sharing result is re-derived from the spring
model of a preloaded joint TWO independent ways, which must agree:

  * (1) the compatibility route — bolt and members stay in contact, so the bolt's
    extra stretch beyond preload equals the members' elastic recovery; write that
    equation together with force equilibrium and solve the 2×2 system;
  * (2) the combined-stiffness route — the external load stretches two PARALLEL
    springs of combined stiffness k_b + k_m by δ = P/(k_b + k_m); the bolt's force
    change is k_b·δ and the members' is k_m·δ, with no simultaneous equations at
    all.

Both must give C = k_b/(k_b + k_m), F_b = F_i + C·P, F_m = F_i − (1 − C)·P. The
separation load P₀ = F_i/(1 − C), the physical limits, and a hand-checkable numeric
golden at the declared defaults are checked on top."""

import sympy as sp

F_i, P, k_b, k_m = sp.symbols("F_i P k_b k_m", positive=True)
F_b, F_m = sp.symbols("F_b F_m", real=True)

C_expr = k_b / (k_b + k_m)
F_b_closed = F_i + C_expr * P
F_m_closed = F_i - (1 - C_expr) * P


def test_load_share_by_compatibility_route():
    """Route 1: free-body + compatibility, solved from scratch.

    Free body of the clamped members: the external tensile load P is carried by
    the difference between the bolt tension F_b and the residual clamping force
    F_m (compression positive) — equilibrium F_b − F_m = P. While the bolt head
    stays seated the two deform together, so the bolt's stretch beyond preload,
    (F_b − F_i)/k_b, equals the members' recovery, (F_i − F_m)/k_m. Solve the two
    together — this is the model the build must certify, derived here from the
    picture, not copied from the residuals."""
    equilibrium = sp.Eq(F_b - F_m, P)
    compatibility = sp.Eq((F_b - F_i) / k_b, (F_i - F_m) / k_m)
    sol = sp.solve([equilibrium, compatibility], [F_b, F_m], dict=True)[0]
    assert sp.simplify(sol[F_b] - F_b_closed) == 0
    assert sp.simplify(sol[F_m] - F_m_closed) == 0
    # and the bolt's share is exactly the parallel-spring constant C
    C_from_solve = sp.simplify((sol[F_b] - F_i) / P)
    assert sp.simplify(C_from_solve - C_expr) == 0


def test_load_share_by_combined_stiffness_route():
    """Route 2: a genuinely different derivation. The bolt and the members are two
    springs in PARALLEL between the same head and nut, so the joint's response to
    the external load P is a stretch δ = P/(k_b + k_m). The bolt gains force k_b·δ,
    the members lose force k_m·δ — no simultaneous equations. Must match route 1."""
    delta = P / (k_b + k_m)
    F_b_route2 = F_i + k_b * delta      # bolt gains its stiffness × the shared stretch
    F_m_route2 = F_i - k_m * delta      # members shed theirs
    assert sp.simplify(F_b_route2 - F_b_closed) == 0
    assert sp.simplify(F_m_route2 - F_m_closed) == 0
    # the two force changes must sum to the whole external load (nothing lost)
    assert sp.simplify((k_b * delta) + (k_m * delta) - P) == 0


def test_determinant_never_singular():
    """The 2×2 system A·[F_b, F_m]ᵀ = b has det(A) = 1/k_b + 1/k_m, which is
    strictly positive for real springs — so unlike the propped cantilever (whose
    determinant cancels), this system is never singular and the emitted guard
    reduces to k_b + k_m ≠ 0."""
    A = sp.Matrix([[1, -1], [1 / k_b, 1 / k_m]])
    det = sp.simplify(A.det())
    assert sp.simplify(det - (1 / k_b + 1 / k_m)) == 0
    assert sp.simplify(det - (k_b + k_m) / (k_b * k_m)) == 0
    # positive for positive stiffnesses -> never zero
    assert det.subs({k_b: 1.0e9, k_m: 1.0e9}) > 0


def test_separation_load_and_bolt_takes_all():
    """Separation is F_m = 0. Solving F_i − (1 − C)·P = 0 for P gives the
    separation load P₀ = F_i/(1 − C); and AT separation the bolt carries the whole
    external load, F_b = P₀ (every newton of P now goes through the bolt)."""
    C = sp.Symbol("C", positive=True)
    P0 = sp.solve(sp.Eq(F_i - (1 - C) * P, 0), P)[0]
    assert sp.simplify(P0 - F_i / (1 - C)) == 0
    # bolt force at P = P₀: F_b = F_i + C·P₀ = F_i/(1 − C) = P₀
    F_b_at_sep = sp.simplify(F_i + C * P0)
    assert sp.simplify(F_b_at_sep - F_i / (1 - C)) == 0
    assert sp.simplify(F_b_at_sep - P0) == 0


def test_physical_limits():
    """The two extremes the model must get right:
      * rigid members (k_m → ∞): C → 0, so the bolt feels NOTHING of P
        (F_b → F_i) and the members shed all of it (F_m → F_i − P); the joint
        separates at P₀ → F_i.
      * soft gasket / rigid bolt (k_m → 0): C → 1, so the bolt takes ALL of P
        (F_b → F_i + P) while the members' clamp is unchanged (F_m → F_i) — the
        joint never separates (P₀ → ∞). This is exactly why a soft gasket is hard
        on the bolt: it drives C toward 1."""
    # rigid members
    assert sp.limit(C_expr, k_m, sp.oo) == 0
    assert sp.simplify(sp.limit(F_b_closed, k_m, sp.oo) - F_i) == 0
    assert sp.simplify(sp.limit(F_m_closed, k_m, sp.oo) - (F_i - P)) == 0
    # soft gasket
    assert sp.limit(C_expr, k_m, 0) == 1
    assert sp.simplify(sp.limit(F_b_closed, k_m, 0) - (F_i + P)) == 0
    assert sp.simplify(sp.limit(F_m_closed, k_m, 0) - F_i) == 0


def test_numeric_golden_at_declared_defaults():
    """Hand-checkable at the declared defaults (F_i = 25 kN, P = 10 kN,
    k_b = k_m = 1.0 GN/m, A_t = 100 mm², S_p = 600 MPa):
      C      = k_b/(k_b+k_m) = 1e9/2e9            = 0.5
      F_b    = F_i + C·P     = 25000 + 0.5·10000  = 30000 N
      F_m    = F_i − (1−C)·P = 25000 − 0.5·10000  = 20000 N
      P₀     = F_i/(1−C)     = 25000/0.5          = 50000 N
      σ_b    = F_b/A_t       = 30000/1e-4         = 300 MPa
      n_p    = S_p·A_t/F_b   = 600e6·1e-4/30000   = 2.0
    (Source: Shigley §8-4/8-5 load-sharing; hand-derived, clean C = 1/2 state.)"""
    Fi, Pext, kb, km = 25000.0, 10000.0, 1.0e9, 1.0e9
    At, Sp = 1.0e-4, 600.0e6
    C = kb / (kb + km)
    assert C == 0.5
    Fb = Fi + C * Pext
    Fm = Fi - (1 - C) * Pext
    assert (Fb, Fm) == (30000.0, 20000.0)
    assert abs((Fb - Fm) - Pext) < 1e-9          # equilibrium holds
    assert abs((Fb - Fi) / kb - (Fi - Fm) / km) < 1e-15  # compatibility holds
    P0 = Fi / (1 - C)
    assert P0 == 50000.0
    sigma_b = Fb / At
    assert abs(sigma_b - 300.0e6) / 300.0e6 < 1e-12
    n_p = Sp * At / Fb
    assert abs(n_p - 2.0) < 1e-12
    # the golden state is a healthy joint: not separated, bolt below proof
    assert Fm > 0 and sigma_b < Sp


def test_proof_warn_reachable_before_separation():
    """A sanity check that the two envelopes are DISTINCT and reachable: with a
    higher preload the bolt can reach proof stress while the joint is still
    clamped (F_m > 0), so the proof warning and the separation refusal are
    genuinely different states, not one masking the other."""
    Fi, Pext, kb, km, At, Sp = 40000.0, 44000.0, 1.0e9, 1.0e9, 1.0e-4, 600.0e6
    C = kb / (kb + km)
    Fb = Fi + C * Pext
    Fm = Fi - (1 - C) * Pext
    sigma_b = Fb / At
    assert Fm > 0                 # still clamped (not separated)
    assert sigma_b >= Sp          # yet past proof — the warn fires here
    # and the separation load for THIS preload is well beyond the warn's P
    P0 = Fi / (1 - C)
    assert P0 > Pext              # separation at 80 kN, warn already at 44 kN
