# Changelog

## v0.7 — 2026-03-16

### Repository tidy-up

- Moved all test-related files into a `tests/` subdirectory:
  - `skycalc-tests.js`, `TESTS.md`, `test_input.txt`
  - `c_input_s1.txt` … `c_input_s4.txt` (scripted C binary inputs)
  - `c_output_s1.txt` … `c_output_s4.txt` (captured C binary outputs — ground truth)
- Updated `run-tests.sh` to invoke `tests/skycalc-tests.js`; all 153 tests still pass
- Updated `README.md` files table to reflect new paths

---

## v0.6 — 2026-03-16

### Test suite expanded (99 → 153 tests)

- Added 3 new end-to-end reference scenarios, each using a different observatory site and validated against the C binary:
  - **2050-Jun-21, Galactic Centre (RA 17h45m Dec −29°) — Kitt Peak, AZ** — exercises no-DST (MST), below-horizon object, twilight conditions
  - **2075-Dec-15, Crab Nebula M1 (RA 5h34m Dec +22°) — VLT Cerro Paranal** — exercises Chilean DST, below-horizon object, daytime UT
  - **2099-Nov-10, M31 Andromeda (RA 0h42m Dec +41°) — Mauna Kea, HI** — exercises no-DST (HST), 100-year precession, large hour angle

- Together the 4 scenarios cover AAT (Australian DST), Kitt Peak (no DST), VLT (Chilean DST), and Mauna Kea (no DST)

### Documentation

- Added `TESTS.md` describing test structure and accuracy tolerances vs the C binary

---

## v0.5 — 2026-03-15

Initial release.

### Web application (`skycalc.html`)

- Single-file HTML/JS port of John Thorstensen's `skycalc.c` astronomical calculator — no server, no build step, no dependencies
- **Five tabs:** Circumstances, Almanac, Planets, Hourly Airmass, Observability
- **Circumstances:** RA/Dec (input & precessed), hour angle, altitude, azimuth, airmass, parallactic angle, sun/moon status, barycentric corrections, galactic & ecliptic coordinates
- **Almanac:** Sunset, 18°/12°/6° twilight, moonrise/set, dark hours
- **Planets:** All 9 planets + Sun + Moon with RA, Dec, HA, altitude, azimuth, airmass
- **Hourly Airmass:** Hourly table through the observing night
- **Observability:** Seasonal new/full-moon table over a user-specified date range
- **▶ NOW mode:** Live 1-second update from system clock
- **14 preset sites:** AAT (default), Kitt Peak, ESO La Silla, VLT, Palomar, Mauna Kea, Lick, and more; plus custom site entry
- **Airmass colour-coding:** Green (excellent, sec z < 1.5) → blue (good) → amber (marginal) → red (poor/below horizon)
- Dark observatory theme

### Three-layer architecture

| Layer | Contents |
|-------|----------|
| Math engine | Direct JS port of `skycalc.c` — all ~50 astronomical functions. No DOM access. |
| Compute API | Five pure functions translating AppState into display-ready data objects. No DOM access. |
| UI layer | AppState, event handlers, render functions. Only layer that touches the DOM. |

### Validation (`skycalc-tests.js`)

- 99-test suite using macOS JavaScriptCore (`jsc`) — no Node.js required
- Covers all function groups: Julian date, sidereal time, precession, alt/az/airmass, parallactic angle, sun, moon, DST handling, galactic/ecliptic coordinates, barycentric corrections, planets, and rise/set iterators
- All expected values taken from the compiled C binary as ground truth
- Tolerances match or exceed the display precision of the original C program (~4 s in time, ~0.1° in angles, ~0.1 km/s in radial velocity)
