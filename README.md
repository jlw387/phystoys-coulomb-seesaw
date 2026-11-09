# Hypersphere Charge Projection

Exploring whether electric field lines and equipotentials of two point charges can be understood as
stereographic projections of coordinates on a higher-dimensional sphere — with an eventual 4D "seesaw"
picture of why charges behave the way they do.

This started as a side discussion while working on the Pauli Spin Visualizer, prompted by a quaternion
visualization video that projects the unit 3-sphere into 3D and shows curves that look like field lines.

## Files

| File | Purpose |
|------|---------|
| [src/main.ts](./src/main.ts) | Browser controls, linked probe, and live verification |
| [src/views.ts](./src/views.ts) | Both Three.js scenes and the 2D/3D construction camera |
| [src/physics.ts](./src/physics.ts) | Weighted potential, analytic gradient, Coulomb reference, and RK4 field-line tracing |
| [src/physics.test.ts](./src/physics.test.ts) | Independent identity, gradient, and trajectory tests |
| [compare_fields.py](./compare_fields.py) | Plots projected sphere coordinates vs. real 3D point-charge field lines and equipotentials |
| [compare_fields.png](./compare_fields.png) | Output of the above |
| [verify_seesaw.py](./verify_seesaw.py) | Numerically verifies the unequal-charge "seesaw" identity (below) |

Run with `python compare_fields.py` / `python verify_seesaw.py` (needs `numpy`, `matplotlib`).

## Interactive web app

Use Node.js 22 LTS or newer supported LTS, then:

```powershell
npm install
npm run dev
```

Open the localhost URL printed by Vite. All rendering and calculations run locally in the
browser; no Python backend or external assets are needed.

```powershell
npm test
npm run build
npm run preview
```

- **Inputs:** positive and negative charge magnitudes (0.25 to 4), separation (0.5 to 6),
  slice azimuth, line density, and axial/radial probe position. Coulomb's constant is set to 1.
  Charge/separation inputs apply on **Update field**; the exploration controls update immediately.
- **Construction view:** an interactive 3D sphere section, its antipodal lifted charges, projection
  pole and rays, the physical charge spheres, and reversed seesaw. The **2D** toggle gives an
  orthographic elevation; radial depth is hidden, not mathematically removed.
- **Physical view:** the actual 3D point-charge field with a rotatable axial cross-section,
  potential coloring, field-direction arrows, and optional faint 3D context.
- **Verification:** independently evaluates direct Coulomb and weighted-sphere potential and field
  vectors at 180 deterministic points with all three physical coordinates nonzero. The field-line
  selector switches between these two implementations.
- **Probe:** the same axial/radial point appears in both views. The construction uses a radial
  representative; the physical view rotates that representative with the chosen slice.

The displayed sphere is an $S^2$ section of $S^3$, sufficient for this axisymmetric construction,
not a literal embedding of the entire 3-sphere into 3D. In the construction, vertical height is
the extra coordinate, while the horizontal plane represents a meridional section of physical
space. The wire grid is only a geometry guide, not a field-line or equipotential grid.
Charge **volume** scales with magnitude, but the sources remain ideal point charges, not
conducting balls. Field lines stop at those illustrative surfaces or at a finite plotting
boundary. Their count is for visualization, not a quantitative measure of charge/flux.
Crossing this finite boundary does not imply escape to infinity: even a balanced pair has
large loops that leave the plotted region and return.
Only opposite-sign pairs are supported; a slice rotates about their common axis, without
translation, so its field lines truly stay in the slice.

## Setup from the video

- Take a sphere, put one pole at the origin (the quaternion `1` in the video) and the other at infinity.
- Rotate the sphere so the two poles land at equal distances on either side of the origin.
- Stereographically project the latitude and longitude lines.
  - **Longitudes** (great circles through both poles) → circles through the two pole images.
  - **Latitudes** → circles (2-sphere case) or spheres (3-sphere case) around each pole image.
    These are Apollonian circles/spheres. The 3D coordinate system is called **bispherical coordinates**.

Longitudes look like field lines from $+q$ to $-q$. Latitudes look like equipotentials, and they cross
the longitudes at right angles, because stereographic projection preserves angles.

## Findings so far

### 1. 2-sphere → 2D plane: exact match for a 2D world

For equal and opposite charges in a genuinely 2D world, where the field falls off as $1/r$ and the
potential is $\ln r$:

- Field lines are $\arg\frac{z-a}{z+a} = \text{const}$, which are circles through both charges.
- Equipotentials are $\ln\frac{r_-}{r_+} = \text{const}$, which are Apollonian circles.

These match the projected longitudes and latitudes **exactly**. The same picture describes two
opposite *line* charges in 3D, since an infinite line charge has a $1/r$ field.

### 2. 3-sphere → 3D: does NOT match real 3D point charges directly

- Symmetry is fine. Two charges in 3D give a field that is the same in every plane containing their
  axis, and the straight segment between them is a field line in both 2D and 3D.
- The curve shapes differ, though, because the 3D force law is $1/r^2$, not $1/r$. Rotating the 2D
  picture around the axis would need charge spread through space (Gauss's law).
- **Concrete check:** the field line leaving $+q$ at 90° to the axis crosses the midplane at distance
  $a$ in the projection (or a 2D world), but at $\sqrt{3}\,a \approx 1.73a$ for real 3D charges.
  The 3D field lines satisfy $\cos\theta_- - \cos\theta_+ = \text{const}$.
- **No rotation of the 3-sphere can fix this.** Stereographic projection maps circles to circles, so
  projected longitudes are always circles, and real 3D field lines are not.

See `compare_fields.png`: blue is the projection or 2D world, red dashed is real 3D.

### 3. The exact relationship, and why 2D is special

Let $c_+$ and $c_-$ be chord (straight-line in 4D) distances on the unit 3-sphere from a point to the
two poles. Let $p$ be the point's projected position in 3D, with $|p|$ measured from the projection
origin. The key identity, for the unit sphere, is

$$|p - q| = \tfrac12\, c(P,Q)\,\sqrt{(1+|p|^2)(1+|q|^2)}.$$

For equal charges placed symmetrically:

- **2D:** $\ln\frac{r_-}{r_+} = \ln\frac{c_-}{c_+}$. The distortion factors cancel inside the log, so
  latitudes project *exactly* to equipotentials.
- **3D:** $\frac{1}{r_+} - \frac{1}{r_-} = \frac{\text{const}}{\sqrt{1+|p|^2}}\left(\frac{1}{c_+} - \frac{1}{c_-}\right)$.

For opposite poles, $\frac{1}{c_+} - \frac{1}{c_-}$ depends only on latitude, so it is the "natural"
equipotential function on the sphere. In 3D, though, a **weight factor** $1/\sqrt{1+|p|^2}$ survives,
and it bends the equipotentials away from the projected spheres.

This is the general fact that the Laplace equation is conformally invariant in 2D but not in 3D. On
the sphere you need the *conformal Laplacian* together with a weight factor.

### 4. The 4D "seesaw" idea for unequal charges: works in 3D, with a twist

**Idea:** treat $+q_1$ and $-q_2$ as ends of a seesaw. Build a hypersphere between them and project
from a point determined by the charge ratio. Equal charges give the balanced, symmetric picture;
unequal charges shift the projection point.

**Result (verified numerically to ~12 digits in `verify_seesaw.py`):**

- On the 3-sphere, the two charges are **always an equal and opposite pair at opposite poles**. The
  imbalance is encoded entirely in where the projection point sits.
- Place the charges on a line on opposite sides of the fulcrum $O$, which is the image of the point
  opposite the projection point. Their distances must satisfy

  $$\frac{d_1}{d_2} = \left(\frac{q_1}{q_2}\right)^2, \qquad d_1 d_2 = R^2 \;\text{(sphere radius squared)}.$$

  These placements make the two charges lift to opposite points of the 3-sphere.
- Then, exactly:

  $$\frac{q_1}{r_1} - \frac{q_2}{r_2} \;\propto\; c_\infty \left(\frac{1}{c_1} - \frac{1}{c_2}\right),$$

  where $c_\infty$ is the chord distance to the projection point. That factor equals the weight
  $1/\sqrt{1+|p|^2}$ up to a constant, and it is what supplies the imbalance.

**Caveats:**

1. **The seesaw is reversed.** The fulcrum sits closer to the *weaker* charge, because distance scales
   as charge *squared*. A real seesaw puts the heavier side closer to the pivot.
2. Even with this picture, equipotentials are not simply projected latitudes, and field lines are not
   projected longitudes. You first have to multiply by the weight $c_\infty$.
3. **In a 2D world the seesaw fails.** The weight factor cancels in the log potential, so moving the
   projection point only rearranges an equal-and-opposite pair. Unequal charges have nonzero net
   charge, which would need a compensating charge at infinity.

### 5. Weighted construction: exact normalization and field verification

The web app uses physical positions $x_1=L/2$ and $x_2=-L/2$ for magnitudes $q_1,q_2>0$.
Set $S=q_1^2+q_2^2$ and

$$d_1=\frac{Lq_1^2}{S},\quad d_2=\frac{Lq_2^2}{S},\quad
O=\frac L2-d_1,\quad R=\frac{Lq_1q_2}{S}.$$

For the full physical vector $p$, define $u=(p-(O,0,0))/R$ and the unit-sphere lift

$$X(u)=\frac{(2u_x,2u_y,2u_z,|u|^2-1)}{1+|u|^2}.$$

Let $Q_i$ be the lifts of the two charges and $c_i=|X-Q_i|$. The chord identity gives

$$\frac{q_i}{|p-p_i|}
=\frac{2q_i/R}{\sqrt{1+|u|^2}\sqrt{1+|u_i|^2}}\frac1{c_i}.$$

Since $u_1=(q_1/q_2,0,0)$ and $u_2=(-q_2/q_1,0,0)$, we have
$Q_1=-Q_2$ and

$$\frac{q_1}{\sqrt{1+|u_1|^2}}
=\frac{q_2}{\sqrt{1+|u_2|^2}}
=\frac{q_1q_2}{\sqrt S}.$$

Consequently, with no unspecified proportionality constant,

$$V(p)=\frac{q_1}{|p-p_1|}-\frac{q_2}{|p-p_2|}
= A\,w(p)\,F(X),\qquad
A=\frac{2\sqrt S}{L},\quad
w=\frac1{\sqrt{1+|u|^2}},\quad F=\frac1{c_1}-\frac1{c_2}.$$

The unit-sphere chord to the projection pole $N=(0,0,0,1)$ is $c_\infty=2w$.
This proves the weighted-potential identity for every nonsingular finite point, not just
within a plane or for a few charge ratios.

The electric field also agrees exactly **when the entire weighted potential is differentiated**:

$$E=-\nabla_p V=-\frac A R
\left(F\nabla_u w+w\,J_X^\mathsf{T}\nabla_XF\right).$$

The app implements this derivative analytically using the lift's Jacobian, independently of
the direct Coulomb field. Ignoring the derivative of $w$ is incorrect. Integrating this field
gives the real 3D field lines; it does **not** make projected spherical longitudes into those lines.
Nor does this identify $F$ with the ordinary unweighted Laplace-Beltrami electrostatic potential
on a compact sphere: the conformal weight/operator distinction still matters.

Tests check 48 magnitude/separation configurations spanning the supported range, including
ratios 16:1 and 1:16, and compare the analytic field to finite differences. Trajectories are
also checked against the independent axisymmetric Coulomb flux invariant

$$\Psi=q_1\frac{x-L/2}{r_1}-q_2\frac{x+L/2}{r_2}.$$

The live panel passes when the maximum potential and field-vector relative errors are below
$10^{-8}$ and the antipodal residual is below $10^{-12}$. Near zeros, relative errors use a
denominator floor of $10^{-8}(q_1+q_2)/L$ for potential and
$10^{-8}(q_1+q_2)/L^2$ for field. A separate unweighted-potential error is reported in units
of $(q_1+q_2)/L$. Numerical tests support the analytic derivation; they are not its proof.

## Open questions / next steps

- **Implemented:** unequal-pair visualization, weighted potential/gradient, and the fulcrum $O$.
- Is there a natural geometric meaning for the weight $c_\infty$, for example a conformal factor or
  a quaternion norm?
- Can the field *lines*, not just the potential, be given a clean 3-sphere description?
  - The weighted-gradient construction above now supplies an exact computational description;
    a simpler geometric family of curves is still an open question.
  - For axisymmetric fields, the flux (Stokes stream) function might have its own weighted
    3-sphere form.
- Can this be connected back to quaternions and spin, the original motivation from the video and the
  Pauli Spin Visualizer?
- What about more than two charges? Which configurations can be realized as a balanced sphere
  picture plus a choice of projection point?
