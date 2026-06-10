"""Build-time math pipeline for the Mechanic portal.

Verifies authored relations, solutions, and derivations with SymPy, then emits
pure TypeScript functions + JSON metadata artifacts for the static site.
Invariants live in /CLAUDE.md; the artifact schema lives in /docs/architecture.md.
"""


class BuildError(Exception):
    """Loud, named build failure. Message must identify thing/configuration/step."""
