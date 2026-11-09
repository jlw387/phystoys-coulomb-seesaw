"""Numerically verify the 3-sphere "seesaw" identity for two unequal 3D point charges.

Claim: put +q1 at distance d1 = q1/q2 and -q2 at distance d2 = q2/q1 on opposite
sides of the origin (so d1/d2 = (q1/q2)^2 and d1*d2 = 1). These two points lift to
antipodal points of the unit 3-sphere, and

    q1/r1 - q2/r2  =  const * w(p) * (1/c1 - 1/c2),   w(p) = 1/sqrt(1 + |p|^2)

where c1, c2 are chord distances on S^3 to the two poles. w(p) is proportional to
the chord distance from the projection point (the one sent to infinity).
"""
import numpy as np

rng = np.random.default_rng(0)


def lift(p):
    """Inverse stereographic projection R^3 -> unit S^3 (projection point (0,0,0,1))."""
    n2 = np.sum(p * p, axis=-1, keepdims=True)
    return np.concatenate([2 * p, n2 - 1], axis=-1) / (n2 + 1)


for q1, q2 in [(1, 1), (2, 1), (5, 1), (1, 3)]:
    p1 = np.array([q1 / q2, 0, 0.0])
    p2 = np.array([-q2 / q1, 0, 0.0])
    assert np.allclose(lift(p1), -lift(p2)), "charges should lift to antipodal points"

    P = rng.normal(size=(2000, 3)) * 2
    v_3d = q1 / np.linalg.norm(P - p1, axis=1) - q2 / np.linalg.norm(P - p2, axis=1)
    X = lift(P)
    c1 = np.linalg.norm(X - lift(p1), axis=1)
    c2 = np.linalg.norm(X - lift(p2), axis=1)
    w = 1 / np.sqrt(1 + np.sum(P * P, axis=1))
    ratio = v_3d / (w * (1 / c1 - 1 / c2))
    print(f"q1={q1}, q2={q2}: ratio min={ratio.min():.12f} max={ratio.max():.12f}")
