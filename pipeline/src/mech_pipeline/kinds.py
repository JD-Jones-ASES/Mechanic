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
    "count",
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
    # mechanics
    "mass",
    "force",
    "torque",
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
