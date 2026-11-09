# Technical Details

## Notation

| Symbol | Meaning |
|---|---|
| $q_1, q_2 > 0$ | Charge magnitudes. $+q_1$ sits at $p_1=(L/2,0,0)$, and $\sigma q_2$ at $p_2=(-L/2,0,0)$ |
| $\sigma$ | Sign of the second charge: $-1$ for an opposite pair (the default), $+1$ for a like pair |
| $O,\ R$ | Center (on the charge axis) and radius of the projection sphere |
| $u=(p-O)/R$ | Physical position in sphere units |
| $X(u)=\dfrac{(2u,\ \lvert u\rvert^2-1)}{1+\lvert u\rvert^2}$ | Inverse stereographic projection onto the unit $S^3\subset\mathbb R^4$ |
| $N=(0,0,0,1)$ | Projection pole, the image of infinity |
| $Q_i=X(u_i)$ | Lifted charges, which become the poles (labelled A and B in the app's Details panel) |
| $c_i=\lvert X-Q_i\rvert,\ c_N=\lvert X-N\rvert$ | Chord (straight-line, 4D) distances |
| $w=1/\sqrt{1+\lvert u\rvert^2}=c_N/2$ | The weight |
| $F,\ G=wF,\ V=C\,G$ | Sphere potential, weighted potential, physical potential |

All potentials use $k=1$. Coulomb's law gives $V(p)=q_1/r_1+\sigma q_2/r_2$, where $r_i=\lvert p-p_i\rvert$.

## 1. Lifting Coulomb's law to the 3-sphere

For any two points of $\mathbb R^3$ in sphere units,

$$\lvert u-v\rvert=\tfrac12\,\lvert X(u)-X(v)\rvert\,\sqrt{(1+\lvert u\rvert^2)(1+\lvert v\rvert^2)},$$

so every Coulomb term lifts to a chord term with two weight factors:

$$\frac{1}{r_i}=\frac{2}{R}\;w(u)\,w(u_i)\;\frac{1}{c_i}.$$

Summing over charges gives a rule that holds for **any** projection sphere and **any** set of point
charges, with any signs or positions:

$$V(p)=w(u)\sum_i\frac{s_i}{c_i},\qquad s_i=\frac{2\,q_i\,w(u_i)}{R}=\frac{q_i\,c_N(Q_i)}{R}.$$

Here $s_i$ is the charge as seen on the sphere. The physical potential is the sphere potential
$\sum_i s_i/c_i$ multiplied by the weight $w$ at the field point.

**Height sets strength.** A lifted charge at height $h$ (its $X_4$ coordinate) has $c_N^2=2(1-h)$, so
$q_i=R\,s_i/\sqrt{2(1-h)}$. For a fixed sphere charge, the physical charge grows with height:

- at the bottom of the sphere (which projects to $O$) it is $R\,s_i/2$;
- it grows without bound as the charge approaches $N$.

Which side of the world plane a lifted charge sits on does not set its sign.

**Dimensions.** All charges here lie on the axis, so everything happens in the plane $z=0$, which lifts
into the slice $X_3=0$ of $S^3$. That slice is an ordinary 2-sphere in the 3D space
(x, y, extra dimension), so the app can draw it faithfully above the world plane. The physics is still 3D:
a $1/r^2$ force law, with the weight $w$.

## 2. The seesaw: making the pair equal and opposite on the sphere

Section 1 works for any sphere. The **fulcrum sphere** is the one choice that makes a pair as simple as
possible on the sphere: the two lifted charges are **antipodal**, $Q_1=-Q_2$, and **equal in size**,
$\lvert s_1\rvert=\lvert s_2\rvert$.

Let $d_1, d_2$ be the distances from $O$ to the charges, with the charges on opposite sides of $O$.

- **Antipodal.** Two axis points lift to antipodal points exactly when $d_1d_2=R^2$.
- **Equal.** $\lvert s_1\rvert=\lvert s_2\rvert$ means $q_1w(u_1)=q_2w(u_2)$. Substituting $R^2=d_1d_2$ turns
  this into $q_1\sqrt{d_2}=q_2\sqrt{d_1}$.

Together these force

$$\frac{d_1}{d_2}=\frac{q_1^2}{q_2^2},\qquad d_1=\frac{Lq_1^2}{S},\quad d_2=\frac{Lq_2^2}{S},\quad
R=\sqrt{d_1d_2}=\frac{Lq_1q_2}{S},\qquad S=q_1^2+q_2^2.$$

The fulcrum is therefore not a free choice. It sits at $O=L/2-d_1$, closer to the **weaker** charge,
which makes this a reversed seesaw. The sphere charges come out as $s_1=C$ and $s_2=\sigma C$ with
$C=2\sqrt S/L$, so

$$V(p)=C\,w\,F,\qquad F=\frac1{c_1}+\frac{\sigma}{c_2}.$$

This is exact, with no unspecified constant.

**The tilt encodes the ratio.** The poles sit at heights $\pm h$, where
$h=\sin\alpha=(q_1^2-q_2^2)/S$ and $\alpha$ is the tilt of the pole axis. Then

$$\frac{q_1}{q_2}=\sqrt{\frac{1+h}{1-h}}=\tan\!\left(45^\circ+\frac{\alpha}{2}\right).$$

The pole nearer $N$ becomes the larger physical charge. Equal charges give a level axis; 2:1 gives
$36.9^\circ$; 16:1 gives $82.9^\circ$.

**Maxwell's sphere.** For an opposite pair, the equator between the poles (where $F=0$) projects onto
Maxwell's zero-potential sphere: Kelvin's, in Maxwell's *Treatise* Art. 156. That sphere divides the
same $q_1^2:q_2^2$ ratio *externally*, so its center is the harmonic conjugate of $O$. See the README's
related-work section.

## 3. Why the weight: the conformal Laplacian

**The sphere potential obeys a different equation.** On the unit $S^3$, $F$ is not harmonic. Away from
the poles it satisfies $\Delta_{S^3}F=\tfrac34F$, which was checked numerically. Equivalently,
$\mathcal L F=0$ there, where $\mathcal L$ is the **conformal Laplacian**

$$\mathcal L=-\Delta+\frac{n-2}{4(n-1)}\,\mathrm{Scal},$$

which is $-\Delta+\tfrac34$ on the unit $S^3$ (where $n=3$ and $\mathrm{Scal}=6$). Each $1/c_i$ is its
point-charge Green's function.

- $\mathcal L$ has no zero mode on the sphere, so unlike the ordinary Laplacian on a compact space, it
  imposes no requirement that the total charge be zero.

**Projection carries solutions across with a factor.** Stereographic projection is conformal: the
sphere metric is $\varphi^{4/(n-2)}$ times the flat metric, with
$\varphi\propto(1+\lvert u\rvert^2)^{-(n-2)/2}$. The conformal Laplacian's transformation law then says
that $\varphi\cdot(\text{sphere solution})$ is a flat-space harmonic function.

- For $n=3$, $\varphi\propto w$, which gives $V=C\,wF$.
- Lee & Parker state this law (*Bull. AMS* 17, 1987; their $\Delta$ has the opposite sign):
  - the transformation law, eq. (2.7);
  - the stereographic factor, eq. (3.1);
  - the "weighted push-forward", p. 49.
- They also note that the conformal factor comes from the Green's function at the projection pole
  (§6, p. 63). In our terms, $1/w\propto 1/c_N$ is the sphere potential of a point charge at $N$.

**The same factor as Kelvin's transform and image charges.** Stereographic projection is the inversion
of $\mathbb R^4$ through $N$ (radius $\sqrt2$) restricted to $S^3$. Going from the sphere to the
plane, it stretches lengths by $\lambda=2/c_N^2$. The rule multiplies by $\lambda^{-(n-2)/2}$, where
$n=3$ is the dimension of the space the potential lives in, not 4. That gives $c_N/\sqrt2\propto w$.

- Kelvin's transform of $\mathbb R^3$, $u^*(x)=(\rho/r)\,u(\rho^2x/r^2)$, is the same rule applied to an
  ordinary inversion.
- That factor is also why an image charge is $-q\,a/d$.

**Two dimensions.** For $n=2$ the factor is $\varphi=1$, so no weight is needed. The logarithmic
potential instead picks up an *additive* term, $Q_\text{net}\ln(\text{stretch})$.

- It vanishes for zero net charge, which is why the unweighted picture is exact for an equal and
  opposite 2D pair.
- Otherwise it is cancelled exactly by a charge $-Q_\text{net}$ at $N$.

**A different surface cannot replace the weight.** This was checked for equal charges, by measuring how
far the projected longitudes are from real field lines (the spread of the flux label $\Psi$ from §6 along each one).

- Stretching the sphere vertically, into the extra dimension, changes nothing, because projection from
  $N$ scales with height.
- The best non-conformal ellipsoid (also stretched in the plane) still leaves 25% of the sphere's error.
  It also cannot fix the line count for unequal charges.

## 4. From the weighted potential to field lines

1. **Fulcrum.** Place $O$ so that $d_1:d_2=q_1^2:q_2^2$ (§2).
2. **Sphere.** Center a sphere of radius $R=\sqrt{d_1d_2}$ on $O$, with $N$ straight above.
3. **Lift.** Rays from $N$ to the charges cross the sphere at the antipodal poles $Q_1, Q_2$.
4. **Weight.**
   - $F$ is constant on rings about the $Q_1Q_2$ axis, so its steepest paths are the flat longitudes.
   - $w$ is constant on rings about the vertical axis.
   - Their product $G=wF$ is constant on neither, so its steepest paths bend. Trace those on the sphere.
5. **Project.** $V=C\,G\circ X$, so level sets of $G$ project onto equipotentials. Projection preserves
   right angles, so the steepest paths of $G$ project onto the real field lines.

The weight acts on the *potential*, not on the lines. The field is the gradient of the whole product:

$$E=-\nabla_pV=-\frac{C}{R}\left(F\,\nabla_u w+w\,J_X^{\mathsf T}\nabla_XF\right),$$

where $J_X$ is the Jacobian of the lift. Dropping the $F\nabla w$ term is wrong; that term is what
bends the lines.

- Since $w>0$ away from $N$, the direction of $\nabla G$ is the direction of $\nabla F+F\,\nabla w/w$.
- The app's "weight applied" slider traces $G_t=w^tF$, whose gradient points along
  $\nabla F+t\,F\,\nabla w/w$.
  - $t=0$ gives the longitudes, which project to circles through both charges.
  - $t=1$ gives the real lines.
  - Intermediate values are an illustrative interpolation with no physical meaning.

**Lines that escape end at $N$.** Real infinity is the single point $N$. Near $N$, $w\approx c_N/2\to0$,
so $G\approx F(N)\,c_N/2$, and $N$ acts as a sink (or source) of strength

$$F(N)=\frac{q_1+\sigma q_2}{C\,R}=\frac{Q_\text{net}}{C\,R}.$$

- For an equal and opposite pair this is zero, and no lines escape.
- Otherwise a fraction of the lines ends at $N$: $1-q_\text{weak}/q_\text{strong}$ for an opposite pair,
  and all of them for a like pair.
- At $t=0$, $N$ is an ordinary point of $F$, and only the single longitude through it reaches it.
  This is the counting problem: plain longitudes cannot make lines escape.

## 5. Like charges

For $+q_1,+q_2$ the fulcrum, sphere, poles, $N$ and weight are all unchanged, since they depend only on
the magnitudes. The lifted charges are again equal ($+C$ each) and antipodal. The only change is
$F=1/c_1+1/c_2$.

- **Same curves, different flow.** $F$ is still constant on the same rings, so the longitudes are the same
  curves. Along each longitude, though, $F$ now falls from $+\infty$ at one pole to a minimum on the
  equator, then rises again.
  - At $t=0$ the steepest paths from both poles stall on that equator, a whole ring of critical points.
  - The app draws the ring dashed and ends each stalled path on it, using bisection to find where the
    flow reverses.
- **The weight resolves it.** With $G=wF$ every line goes to $N$, since all of $q_1+q_2$ must reach
  infinity.
  - The critical ring is replaced by a single saddle of $G$, the lift of the real null point between
    the charges.
  - The projection is a diffeomorphism and $V=C\,G\circ X$, so the critical points of $G$ are exactly
    the null points of $E$.

**Alternative center.** Centering the sphere at Maxwell's *external* point (the same $q_1^2:q_2^2$
ratio, divided externally) also gives equal sphere charges.

- The two charges are then mirror images across $X_4=0$, i.e. inverse points with respect to that
  sphere, rather than antipodal. Section 1 guarantees the identity still holds (checked to $10^{-15}$).
- For an opposite pair, the mirror sphere is Maxwell's zero-potential sphere.
- For equal like charges its radius is infinite: it becomes the midplane, a symmetry plane and a
  "sphere through infinity".
- For unequal like charges the weight breaks the mirror symmetry, and the sphere has no special meaning.

## 6. Verification

**Automated tests** ([physics.test.ts](./src/physics.test.ts), run with `npm test`):

- Potential and field from the weighted construction against direct Coulomb, at 180 points in 3D:
  - 48 opposite-pair configurations: magnitudes from 0.25 to 4, including 16:1 and 1:16, and
    separations from 0.5 to 6;
  - 12 like-pair configurations.
- The analytic field $E$ against finite differences of $V$, so the $\nabla w$ term is checked.
- The general rule of §1, for 40 random spheres with 1–4 charges of either sign.
- Traced lines against the axisymmetric flux label
  $\Psi=q_1\frac{x-L/2}{r_1}+\sigma q_2\frac{x+L/2}{r_2}$, which is constant along every real field line.
- The escaping share against Gauss's law.
- Sphere-traced steepest paths of $G$:
  - at $t=1$ they project onto real lines and escape in the same pattern;
  - at $t=0$ they project onto circles through both charges;
  - for like charges at $t=0$ they end on the equator.

**Live panel.** The app passes the check when:

- the maximum relative errors in potential and field are below $10^{-8}$, with denominator floors of
  $10^{-8}(q_1+q_2)/L$ and $10^{-8}(q_1+q_2)/L^2$ near zeros;
- the antipodal residual is below $10^{-12}$.

**One-off checks, not in the test suite:**

- $\Delta_{S^3}F=\tfrac34F$, checked by finite differences;
- $F(N)=Q_\text{net}/(CR)$;
- the stereographic map as an inversion of $\mathbb R^4$;
- the ellipsoid comparison (§3);
- the Maxwell external center (§5);
- the projected equator as Maxwell's sphere (§2).

[verify_seesaw.py](./verify_seesaw.py) is an earlier standalone check of the §2 identity, using sphere
units ($R=1$, $d_1=q_1/q_2$).

These are numerical checks of the derivation above; they support it but are not a formal proof.
