# Changelog

## v0.9.0 — 2026-07-10

### UI

- Renamed the top-left logo to **SkyCalc HTML** (and the browser tab title to
  match).
- Added a **Credits** tab crediting the original `skycalc.c` by **John
  Thorstensen** (Dartmouth College), this HTML/JavaScript port, and the MIT
  license, with a link to the source repository.

---

## v0.8.9 — 2026-07-10

### UI

- **Almanac** is now the first tab and the default tab shown on load (previously
  Circumstances), matching the usual night-planning workflow.

---

## v0.8.8 — 2026-07-10

### Circumstances / Hourly — display polish to match skycalc.c

- Relabelled the Circumstances correction rows **"Helio Δt/Δv" → "Bary Δt/Δv"**,
  matching skycalc.c's "Barycentric corrections" (the values were already the
  barycentric ones, and BJD was already labelled as such — only these two labels
  were inconsistent).
- The **Hourly** airmass table now blanks the Sun-altitude column as **"…"** when
  the sun is below −18° (fully dark), matching skycalc.c, instead of printing the
  irrelevant large-negative value.

Render only — no change to any computed number.

---

## v0.8.7 — 2026-07-10

### Observability — faithful port of skycalc.c's `obs_season`

A manual all-tabs comparison against a fresh `skycalc.c` run found the other four
tabs (Circumstances, Almanac, Planets, Hourly) matched exactly, but the
Observability tab diverged. `computeObservability` is now a faithful port of
`obs_season` (+ `hrs_up`):

- Each row is the night whose **local midnight (longitude-based, no DST)** is
  nearest the lunar phase — fixing evening dates that were off by up to a day.
- The **centre column** is now the sun's lower culmination (the natural centre
  of night), not the dark-window midpoint.
- Dark hours (< sec z 3 / 2 / 1.5) are computed by the **analytic `hrs_up`
  crossing**, not a 0.1 h numerical scan.
- Phase sequence, range bounds, and evening-date labelling match `obs_season`.

Every row — dates, phase, eve/centre/morn HA & sec z (including "down"), and all
three hour columns — now matches the C binary exactly for the AAT test scenario.

### Tests

- Added 9 end-to-end Observability assertions vs the C `obs_season` output; suite
  is now 191 tests.

### Note

Corrects an earlier audit slip: `obs_season` *does* exist in `skycalc.c` (a
faulty grep during the code sweep reported it absent), so the Observability tab
does have a C reference — now matched.

---

## v0.8.6 — 2026-07-10

### Almanac — LMST at each event

- Every event in the Almanac's **Sun & twilight** card (and moonrise/set) now
  shows the **Local Mean Sidereal Time** at that moment, beneath the UT time —
  as skycalc.c prints ("LMST at evening/morning twilight"). Rounded to the
  nearest minute, like the other event times, and shown in accent colour to set
  it apart from UT.

### Tests

- Added LMST fidelity assertions vs the C binary (eve/morn 18° twilight = 07:11
  / 16:13); suite is now 182 tests.

---

## v0.8.5 — 2026-07-10

### Docs

- Brought `PLAN.md` (the design brief) up to date with the finished project:
  marked all implementation phases complete; corrected the dependencies section
  (the app is zero-dependency — the planned Luxon / Google Maps custom-site
  integrations were dropped in favour of manual entry); and documented the
  modular `skycalc-math.js` / `skycalc-compute.js` + `./build.sh` structure and
  the 180-test, drift-guarded validation suite.

---

## v0.8.4 — 2026-07-10

### Testable compute layer + end-to-end tests (no behavior change)

- **Extracted the compute API to `skycalc-compute.js`.** The five `compute*`
  functions and their helpers are now a standalone module (previously inline in
  `skycalc.html`). `./build.sh` embeds `skycalc-math.js` and `skycalc-compute.js`
  verbatim into `skycalc.html` (between `//<<<BEGIN…>>>` / `//<<<END…>>>`
  markers), so the app stays a single self-contained file — edit the sources,
  then run `./build.sh`.
- **Added end-to-end tests** that `load()` and call the *actual* compute
  functions (`computeCircumstances`, `computeAlmanac`, …) for scenario 1 and
  compare whole results — precessed coordinates, HA, alt/az, airmass, sunset,
  all twilights, night center, moonrise/set, illuminated fraction — to the C
  binary (`c_output_s1.txt`). This exercises the compute-layer glue where the
  recent moon/twilight/rounding bugs lived; the prior suite only tested the math
  primitives, which is why those bugs slipped through.
- **Added a drift guard** that verifies the math + compute blocks embedded in
  `skycalc.html` are byte-identical to the source `.js` files, so what the tests
  run can never silently diverge from what the app runs.
- Suite grows 162 → **180 tests**. No change to app behavior or numerical output.

---

## v0.8.3 — 2026-07-10

### Circumstances — lunar sky brightness

- Added a **Moon sky bright.** readout to the Circumstances "Sky" card: the lunar
  contribution to sky brightness at the object, in V mag/arcsec² (Krisciunas &
  Schaefer 1991), via the `lunskybright` model already ported in the math engine
  but previously unused. Displayed only when the moon is up, the object is clear
  of the horizon (> 0.5°), and the sun is below −9° — the same gating skycalc.c
  uses in `print_circumstances` (KZEN = 0.172 zenith extinction); otherwise "—".

---

## v0.8.2 — 2026-07-10

### Almanac / Hourly / Observability — closer fidelity to skycalc.c

Following a full audit of the port vs `skycalc.c` (the math engine and the
Circumstances tab were already faithful), six divergences were corrected:

- **Sun & twilight event guesses** now seeded from the sun's hour angle at
  midnight and refined (matching `print_tonight`), instead of fixed clock
  offsets (`jdmid ± 6 h`, `jdSunset ± 1.5 h`) — the same bug class as the
  earlier moon fix; avoids mis-convergence near solstice / high latitude.
  (Almanac and Observability.)
- **Hourly airmass table** now shows every row down to sunset/sunrise (uses the
  sun-below-horizon test; was skipping rows with the sun above −5°) and centers
  the row lattice on the middle of the night (`jdcent`, snapped to the UT hour,
  spanning the sunset→sunrise length) rather than clock midnight ± 13 h —
  matching `hourly_airmass`.
- **Sun rise/set altitude** is now `−0.83°` (matching skycalc.c), not `−0.833°`,
  consistent with the moon path.
- **Polar handling**: the Almanac sets astronomical-dark to 0 h
  ("sun up all night") or 24 h ("dark all day") in the polar cases skycalc.c
  handles, instead of showing "—".
- **Night center** is now shown in the Almanac Sun card (e.g. `00:09`), as
  skycalc.c prints.

All values verified against the C binary (AAT, night of 2026-Jul-09: sunset
17:20, twilights 18:12 / 18:41 / 05:36 / 06:06, night center 00:09, astronomical
dark 10.9 h, moon-free dark 7.5 h).

### Tests

- Added a night-center fidelity assertion vs the C binary; suite is now 162 tests.

---

## v0.8.1 — 2026-07-10

### Almanac / Circumstances — moon fixes

- **Moonrise/moonset now use skycalc.c's algorithm.** The initial guess comes
  from the moon's hour angle at local midnight (previously a fixed ±6 h offset)
  and is refined at the −(0.83°+horizon) rise/set altitude; events are shown
  only when they fall within skycalc's `moon_print` window of midnight. Fixes a
  case where the moonrise was missing entirely and a far-off moonset was shown
  instead (e.g. AAT, night of 2026-Jul-09: now Moonrise 02:11 and no moonset,
  matching the C binary). Also corrects the "moon-free dark hours" figure.
- **Illuminated fraction from sun–moon elongation.** Both the Almanac and the
  Circumstances "Moon illum." now compute the lit fraction as
  `0.5·(1 − cos(elongation))`, matching skycalc.c, instead of a lunar-age cosine
  approximation that read a few percent low (e.g. 30% vs the old 26%).

### Tests

- Added 2 moon-fidelity assertions vs the C binary (moonrise time, illuminated
  fraction); suite is now 161 tests.

---

## v0.8 — 2026-07-10

### Time display & input (Circumstances top row)

- **Default to local site time.** The date/time inputs now default to the
  selected observatory's local time (UT checkbox starts unchecked), so the
  displayed date matches the site's civil date rather than the UT date.
- **Always-visible local readout.** The top row now shows
  `Local: <date> <time> (UTC±N)` alongside the input fields, regardless of
  the UT checkbox.
- **24-hour time field.** The time input is now a 24-hour text field
  (`HH:MM:SS`) instead of a native `<input type="time">`, which rendered as
  12-hour AM/PM on 12-hour-locale systems. Accepts colon- or space-separated
  entry.
- **UT checkbox fixes:**
  - Input fields now honor the checkbox — UT when checked, local when
    unchecked (previously always showed UT, so NOW-mode ignored the box).
  - Toggling now converts the same instant between UT and local instead of
    reinterpreting the visible digits (which shifted the time by the zone offset).
- Header JD/LMST and the local readout now populate immediately on load.

### Almanac

- **Rounded event times.** Sunset, sunrise, twilight and moonrise/set now
  round to the nearest minute, matching skycalc.c's `print_time(...,0)`.
  Previously truncated, showing times up to ~1 min early (e.g. sunset 17:19
  vs the C binary's 17:20).
- **Clearer card title.** The Sun card is retitled from "Sun" to
  "**Sun & twilight — night of \<evening\> → \<morning\>**", removing the
  Sun/Sunday ambiguity and making the observing-night span explicit.

### Tests

- Added 6 almanac rounding-fidelity assertions vs the C binary (scenario 1),
  bringing the suite to **159 tests**.

---

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
