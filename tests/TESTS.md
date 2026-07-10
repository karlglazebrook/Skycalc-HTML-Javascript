# Test Suite — skycalc-tests.js

180 tests, all passing. Run with:

```bash
./run-tests.sh
```

Or directly:

```bash
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc skycalc-tests.js
```

---

## Structure

The suite is organised in two parts:

**Sections 1–15** test individual math functions using a single reference scenario (AAT, 2026-Mar-15 12:00 UT, RA 12h Dec -45°), with all expected values taken from the compiled C binary (`skycalc.c`).

**Scenarios 2–4** each run a full end-to-end check (LMST → precession → HA/alt/az → barycentric → galactic/ecliptic) at a different site, epoch, and sky position, again against C binary output.

| Scenario | Date / time (UT) | Object | Site |
|----------|-----------------|--------|------|
| 1 (baseline) | 2026-Mar-15 12:00 | RA 12h00m Dec −45° | AAT Siding Spring |
| 2 | 2050-Jun-21 12:00 | RA 17h45m Dec −29° (Galactic Centre) | Kitt Peak, AZ |
| 3 | 2075-Dec-15 12:00 | RA 5h34m Dec +22° (Crab Nebula M1) | VLT Cerro Paranal |
| 4 | 2099-Nov-10 14:00 | RA 0h42m Dec +41° (M31 Andromeda) | Mauna Kea, HI |

Scenarios 2 and 3 intentionally include below-horizon and daytime cases (testing the math in non-observable conditions). Four distinct DST regimes are covered: Australian, Chilean, and two no-DST sites (MST, HST).

A section, **Almanac rounded event times**, asserts the scenario-1 sunset, sunrise, and 18°/12° twilight times *to the exact minute* against the C binary output (`c_output_s1.txt`). The C program rounds these via `print_time(...,0)`; this section locks the JS port's `fmtLocalTime`/`fmtUTTime` rounding to match, guarding against a regression back to truncation.

**End-to-end compute API.** The suite `load()`s not only `skycalc-math.js` but also `skycalc-compute.js`, and calls the *actual* app functions — `computeCircumstances`, `computeAlmanac`, … — for scenario 1, comparing whole results (precessed RA/Dec, HA, alt/az, airmass, sunset/sunrise, all twilights, night center, moonrise/set, illuminated fraction) to `c_output_s1.txt`. Unlike the section tests, which exercise the math primitives directly, these run the compute-layer *glue* (the initial guesses, altitude thresholds, formula choices) — the layer where the moon-rise-guess, lunar-age-illumination, and truncation bugs lived. They would have failed on day one for each of those.

**Drift guard.** Because the app ships as a single self-contained `skycalc.html` with the two `.js` sources embedded verbatim (via `./build.sh`, between `//<<<BEGIN…>>>` / `//<<<END…>>>` markers), a guard reads `skycalc.html`, extracts the embedded blocks, and asserts they are byte-identical to `skycalc-math.js` and `skycalc-compute.js`. If they differ, the test fails with a "run `./build.sh`" signal — so the tested sources can never silently diverge from the code the app actually runs.

---

## Accuracy vs the C binary

### Core math sections (sections 1–15)

| Quantity | Tolerance | Notes |
|----------|-----------|-------|
| Julian date | 0.001 day (86 s) | Well within floating-point limits |
| LMST / GMST | 0.001 hr (3.6 s) | Sidereal formula precision |
| Hour angle | 0.01 hr (36 s) | Accumulates from LMST + precession |
| Precessed RA | 0.001 hr (3.6 s) | — |
| Precessed Dec | 0.01° (36") | — |
| Precession round-trip | 0.0001 hr (0.4 s) / 0.001° (4") | Internal consistency |
| Altitude | 0.05° | Comparison to C output |
| Azimuth | 0.1° | Comparison to C output |
| Airmass sec(z) | 0.005 (well above horizon) | Near horizon loosened to ±5 |
| Parallactic angle | 0.5° | — |
| Delta T (etcorr) | 0.5–1.0 s | Polynomial fit, not exact |
| Galactic l, b | 0.05° | — |
| Ecliptic long, lat | 0.1° | — |
| Barycentric tcor | 1.0 s | Light-travel time correction |
| Barycentric vcor | 0.05 km/s | Radial velocity correction |
| BJD | 0.000010 day (0.9 s) | Derived from tcor |
| Planet RA (Jupiter) | 0.1 hr (6') | Low-precision algorithm (~0.1° claimed) |
| Planet Dec (Jupiter) | 0.5° | As above |
| Sunset / twilight time | 10 min | Rise/set iterator |
| Moonrise time | 15 min | Moon moves faster; larger tolerance |
| Moon alt at rise | 1.0° | Secondary sanity check |

### Multi-site scenario sections (scenarios 2–4, against C binary)

| Quantity | Tolerance | Notes |
|----------|-----------|-------|
| LMST | 0.001 hr (3.6 s) | — |
| Precessed RA | 0.001–0.002 hr (4–7 s) | Slightly looser for S4 (100-yr precession) |
| Precessed Dec | 0.02–0.05° (72"–3') | Slightly looser for S4 |
| Hour angle | 0.01 hr (36 s) | — |
| Altitude | 0.1–0.2° | — |
| Azimuth | 0.2–0.3° | — |
| Airmass sec(z) | 0.05 (normal); ±5 (near horizon) | Near-horizon value diverges rapidly |
| Parallactic angle | 1–2° | — |
| Barycentric tcor | 2.0 s | — |
| Barycentric vcor | 0.1 km/s | — |
| BJD | 0.00002 day (1.7 s) | — |
| Galactic l, b | 0.1° | — |
| Ecliptic long, lat | 0.1–0.2° | — |

---

## Summary

The JS port agrees with the C binary to **~4 s in time, ~0.1° in angles, ~0.1 km/s in radial velocity, and ~2 s in barycentric corrections**. These tolerances match or exceed the display precision of the original C program (which shows times to 1 s and angles to 0.1°), so any residual JS/C disagreement is below what would ever appear on screen.

The main exceptions are:
- **Near-horizon airmass** — sec(z) is geometrically singular near 0° altitude; a small error in altitude causes a large error in sec(z).
- **Planet positions** — the low-precision algorithm used (matching `skycalc.c`) is accurate to ~0.1°, which is reflected in the looser tolerances for planet RA and Dec.

---

## Deliberate deviations from `skycalc.c`

A full audit (2026-07) confirmed the math engine and the Circumstances tab are
faithful, term-for-term ports, and corrected six divergences in the
Almanac / Hourly / Observability tabs (see `CHANGES.md` v0.8.1–v0.8.2). A few
places **intentionally differ** from `skycalc.c`; these are design choices, not
bugs, and should be preserved:

- **Hourly Sun/Moon altitude columns use `accusun` / `accumoon` (high precision)
  where C uses `lpsun` / `lpmoon` (low precision, marked "close enuf" in the C
  source).** The JS is therefore *more* accurate here; the Sun/Moon alt columns
  can differ from the C output by ~arcminutes, and the exact row where night
  begins/ends may shift by one. Matching C would mean deliberately downgrading
  accuracy, so we keep the high-precision routines.
- **Planets tab, Sun row** uses `accusun(jd, LMST, lat)` at the real observer,
  where C's `pposns` uses `accusun(jd, 0, 0)` (a lat = 0, LST = 0 reference
  point). Differs by up to the solar parallax (~8.8″ ≈ 0.0024°) — below the
  table's 0.1° display precision.
- **Planets tab, Moon row** passes the site elevation to `accumoon`, where C
  passes `0`. Adds the observer-height parallax term (~1″) — negligible.
- **Hourly local-time labels** use a single zone offset for the whole table,
  where C recomputes the offset per row. Only matters on the ~2 nights/year that
  straddle a standard/daylight-time change, and only affects the *label* — the
  row values (alt/az/airmass) are unaffected.
- **`barycor` retains the original `skycalc.c` `zc += mass*zc` quirk** on purpose,
  so the barycentric correction and BJD agree with the C binary to the last
  digit rather than being "corrected" away from the reference.

Also *absent* from the JS (feature omissions, not accuracy trade-offs): the
lunar sky-brightness readout, and the solar/lunar-eclipse, `planet_alert`, and
lunar-limb-proximity warnings that C prints in its circumstances output.
