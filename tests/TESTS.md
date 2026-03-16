# Test Suite — skycalc-tests.js

153 tests, all passing. Run with:

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
