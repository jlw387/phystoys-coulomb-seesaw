"""Compare stereographically projected sphere coordinates with 3D Coulomb fields.

Charges +q at x=+a and -q at x=-a. The plot shows any plane containing the axis.
"""
import numpy as np
import matplotlib.pyplot as plt

a = 1.0
x = np.linspace(-3.2, 3.2, 1601)
y = np.linspace(-2.6, 2.6, 1301)
X, Y = np.meshgrid(x, y)
rp = np.hypot(X - a, Y)
rm = np.hypot(X + a, Y)

# Field-line labels: each line is named by its launch angle alpha at +q,
# measured from the +x axis (pointing away from -q).
alphas = np.deg2rad(np.arange(15, 180, 15))

# Projection / 2D world: field lines are theta_+ - theta_- = alpha (circles through +-a).
theta_p = np.arctan2(np.abs(Y), X - a)
theta_m = np.arctan2(np.abs(Y), X + a)
psi_proj = theta_p - theta_m

# 3D Coulomb: Stokes flux function cos(theta_-) - cos(theta_+) = 1 - cos(alpha).
psi_3d = (X + a) / rm - (X - a) / rp

# Equipotentials, matched by where they cross the axis.
phi_proj = np.log(rm / rp)          # Apollonian circles (spheres in 3D)
phi_3d = 1 / rp - 1 / rm            # real 3D potential
x0s = np.array([0.25, 0.55, 0.8, 1.3, 1.8, 2.6]) * a
x0s = np.concatenate([x0s, -x0s])
lev_proj = np.sort(np.log(np.abs(x0s + a) / np.abs(x0s - a)))
lev_3d = np.sort(1 / np.abs(x0s - a) - 1 / np.abs(x0s + a))

BLUE, RED = "#1f6fd1", "#d62728"
fig, axes = plt.subplots(1, 2, figsize=(15, 6.6))

ax = axes[0]
ax.contour(X, Y, psi_proj, levels=alphas, colors=BLUE, linewidths=1.6)
ax.contour(X, Y, psi_3d, levels=1 - np.cos(alphas), colors=RED, linewidths=1.6,
           linestyles="--")
ax.plot([-a, a], [0, 0], color="k", lw=1.2)
ax.set_title("Field lines (same launch angles at +q, every 15°)")
# Highlight the line launched at 90 degrees.
for yy, c in [(a, BLUE), (np.sqrt(3) * a, RED)]:
    ax.plot([0, 0], [yy, -yy], "o", color=c, ms=6)
box = dict(boxstyle="round,pad=0.2", fc="white", ec="none", alpha=0.9)
ax.annotate("90° line: crosses at a", (0, a), (-3.0, 2.3), color=BLUE, fontsize=10,
            bbox=box, arrowprops=dict(arrowstyle="->", color=BLUE))
ax.annotate("90° line: crosses at √3·a ≈ 1.73a", (0, np.sqrt(3) * a), (0.15, 2.3),
            color=RED, fontsize=10, bbox=box,
            arrowprops=dict(arrowstyle="->", color=RED))

ax = axes[1]
ax.contour(X, Y, phi_proj, levels=lev_proj, colors=BLUE, linewidths=1.6,
           linestyles="solid")
ax.contour(X, Y, phi_3d, levels=lev_3d, colors=RED, linewidths=1.6, linestyles="--")
ax.axvline(0, color="0.5", lw=1)
ax.set_title("Equipotentials (matched where they cross the axis)")

for ax in axes:
    ax.plot([a], [0], "o", color="crimson", ms=11, mec="k", zorder=5)
    ax.plot([-a], [0], "o", color="royalblue", ms=11, mec="k", zorder=5)
    ax.text(a, 0.2, "+q", ha="center", fontsize=11, weight="bold", bbox=box)
    ax.text(-a, 0.2, "−q", ha="center", fontsize=11, weight="bold", bbox=box)
    ax.set_aspect("equal")
    ax.set_xlim(x[0], x[-1])
    ax.set_ylim(y[0], y[-1])
    ax.set_xlabel("x / a  (axis through the charges)")
    ax.set_ylabel("ρ / a  (distance from axis)")

handles = [plt.Line2D([], [], color=BLUE, lw=2),
           plt.Line2D([], [], color=RED, lw=2, ls="--")]
fig.legend(handles,
           ["Stereographic projection of sphere coordinates  (= 2D-world field)",
            "Real 3D point charges (1/r² law)"],
           loc="lower center", ncol=2, fontsize=11, frameon=False)
fig.tight_layout(rect=(0, 0.06, 1, 1))
out = __file__.replace(".py", ".png")
fig.savefig(out, dpi=110)

# Numeric sanity check of the 90-degree line's midplane crossing.
rho = np.linspace(0.01, 3, 300001)
F = 2 * a / np.hypot(rho, a)
print("3D crossing:", rho[np.argmin(np.abs(F - 1))], "expected", np.sqrt(3))
print("saved", out)

