"""Quantity-kind registry.

The SI dimension 7-vector alone cannot type-check widget chaining: plane angle,
ratios, counts, and Poisson's ratio are all dimensionless (zero vector), and
e.g. torque vs energy share [2,1,-2,...]. A connection between widget ports is
legal iff BOTH the dimension vector AND the quantity kind match (invariant 2).

Add new kinds here; `compile.py` rejects unknown kinds so typos fail the build.
"""

QUANTITY_KINDS: frozenset[str] = frozenset({
    # dimensionless, mutually incompatible on purpose
    "angle",
    "ratio",
    "count",  # count-like quantity; integerness is the variable's `integer` flag, not the
              # kind's (active spring coils are a legitimate 8.5)
    "poisson_ratio",
    "strain",
    "safety_factor",
    "probability",  # a survival probability / reliability R in (0,1]; dimensionless.
                    # Deliberately DISTINCT from ratio and efficiency: a reliability is
                    # NOT a geometric ratio and NOT a power-out/power-in efficiency, so it
                    # must never chain silently into either port (invariant 2). The bearing
                    # page's reliability knob R is the first consumer.
    "friction_coefficient",  # μ/f: not a geometric ratio — keep capstan exponents honest
    "efficiency",  # power-out/power-in ∈ (0,1]; a gear ratio must not chain into it
    # kinematics
    "length",
    "area",
    "second_moment_of_area",
    "time",
    "velocity",
    "acceleration",
    "angular_velocity",
    "angular_acceleration",
    "frequency",  # Hz = 1/s — cycles per second; dims [0,0,-1,…], the SAME vector as
                  # angular_velocity (rad/s, rad being dimensionless). Deliberately a
                  # DISTINCT kind so an f-port can never chain silently into an ω-port:
                  # the conversion ω = 2πf is a factor of 2π, never implicit. This is
                  # exactly the torque/bending_moment move — equal dimensions, different
                  # meaning — for the rotational-dynamics pair (invariant 2).
    "twist_rate",  # rad/m — angle of twist per unit length (dθ/dz); dims [-1,0,…]
                   # must NOT chain into curvature or wavenumber (both also 1/m): a
                   # torsional twist rate is not a beam curvature nor a spatial frequency
    # mechanics
    "mass",
    "force",
    "torque",  # twisting moment about the axis
    "bending_moment",  # same dims as torque [2,1,-2,…]; a belt's torque must not chain into a bending port
    "line_load",  # N/m distributed load — same dims as stiffness; the kind keeps them apart
    "shear_flow",  # N/m — VQ/I, force per unit length a built-up joint carries; the THIRD kind
                   # on the N/m dimension vector. A distributed load (line_load), a spring rate
                   # (stiffness), and a shear flow all share dims [0,1,-2,…] and must NEVER chain
                   # into one another — this trio is why quantity_kind exists (invariant 2).
    "energy",
    "flexural_rigidity",  # plate bending stiffness D = E t^3/(12(1-nu^2)), unit N*m — the
                          # FOURTH kind to share the [2,1,-2,…] dimension vector (with torque,
                          # bending_moment, and energy). A deliberate stress test of the registry:
                          # four physically distinct N*m quantities that must NEVER chain into one
                          # another — a plate's stiffness is not a twisting moment, not a bending
                          # moment, and not an energy (invariant 2 is exactly why this is a kind).
    "power",
    "pressure_stress",
    "elastic_modulus",
    "density",
    "linear_density",
    # rotational dynamics / energy storage
    "moment_of_inertia",  # mass moment, kg*m^2 — dims [2,1,0,…], unlike torque/energy [2,1,-2,…]
    "specific_energy",  # J/kg = m^2/s^2 — same dims as velocity²; the kind keeps them apart
    # machine elements
    "stiffness",  # N/m — spring rate; dims [0,1,-2,…] (so it can't chain into a force)
})
