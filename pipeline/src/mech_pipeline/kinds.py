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
    "twist_rate",  # rad/m — angle of twist per unit length (dθ/dz); dims [-1,0,…]
                   # must NOT chain into curvature or wavenumber (both also 1/m): a
                   # torsional twist rate is not a beam curvature nor a spatial frequency

    # mechanics
    "mass",
    "force",
    "torque",  # twisting moment about the axis
    "bending_moment",  # same dims as torque [2,1,-2,…]; a belt's torque must not chain into a bending port
    "line_load",  # N/m distributed load — same dims as stiffness; the kind keeps them apart
    "energy",
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
