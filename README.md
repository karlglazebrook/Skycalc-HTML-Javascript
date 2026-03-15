# Skycalc — Browser Astronomical Calculator

A single-file HTML/JavaScript port of **John Thorstensen's** (Dartmouth College) classic `skycalc.c` astronomical calculator. Open `skycalc.html` in any modern browser — no server, no build step, no dependencies.

![Dark observatory theme with five tabs: Circumstances, Almanac, Planets, Hourly Airmass, Observability](https://raw.githubusercontent.com/karlglazebrook/Skycalc-HTML-Javascript/main/screenshot.png)

---

## Features

- **Circumstances** — Live display of pointing data: RA/Dec (input & precessed), hour angle, altitude, azimuth, airmass, parallactic angle, sun/moon status, barycentric corrections, galactic & ecliptic coordinates
- **Almanac** — Tonight's sunset, 18°/12°/6° twilight, moonrise/set, dark hours
- **Planets** — All 9 planets + Sun + Moon: RA, Dec, HA, altitude, azimuth, airmass
- **Hourly Airmass** — Hourly table through the observing night
- **Observability** — Seasonal new/full-moon table over a user-specified date range
- **▶ NOW mode** — Live 1-second update from system clock
- **14 preset sites** — AAT (default), Kitt Peak, ESO, VLT, Palomar, Mauna Kea, Lick, and more
- **Custom site** — Enter any latitude, longitude, elevation, and timezone
- **Airmass colour-coding** — Green (excellent) → blue (good) → amber (marginal) → red (poor/below horizon)

---

## Usage

Download `skycalc.html` and open it in a browser. That's it.

**Object input** accepts any of these formats:
```
12 00 00       (h m s  or  d m s)
12:00:00
12.0           (decimal)
```

**Sites** — select from the dropdown or choose *Custom Site* to enter coordinates manually.

**Time** — click **▶ NOW** for live updating, or enter a date/time manually. The UT checkbox controls whether the entered time is Universal Time or local site time.

---

## Architecture

The code is strictly separated into three layers inside a single HTML file:

| Layer | Lines | Contents |
|-------|-------|----------|
| **Math engine** | ~1460 | Direct JS port of `skycalc.c` — all ~50 astronomical functions. No DOM access. Embedded verbatim from `skycalc-math.js`. |
| **Compute API** | ~480 | Five pure functions (`computeCircumstances`, `computeAlmanac`, `computePlanets`, `computeHourly`, `computeObservability`) that translate AppState into display-ready data objects. No DOM access. |
| **UI layer** | ~570 | AppState, event handlers, render functions. Only this layer touches the DOM. |

This separation means the math can be validated independently, and the UI can be reskinned or ported to a different framework without touching the astronomy code.

---

## Validation

The JS math is validated against the compiled C binary. Run the test suite with:

```bash
./run-tests.sh
```

This runs 99 tests covering all function groups — Julian date, sidereal time, precession, alt/az/airmass, parallactic angle, sun, moon, DST handling, galactic/ecliptic coordinates, barycentric corrections, planets, and rise/set iterators — using the reference output from the C program as the ground truth.

All tests pass with tight tolerances (≤ 0.001 hr for RA, ≤ 0.01° for angles, ≤ 1 s for time corrections).

---

## Observatory Sites

| Code | Observatory | Location |
|------|-------------|----------|
| **a** | **Anglo-Australian Tel., Siding Spring** *(default)* | NSW, Australia |
| k | Kitt Peak / MDM | Arizona, USA |
| s | Apache Point Observatory | New Mexico, USA |
| e | ESO La Silla | Chile |
| v | VLT Cerro Paranal | Chile |
| p | Palomar Observatory | California, USA |
| t | Cerro Tololo | Chile |
| h | Mt. Hopkins / MMT | Arizona, USA |
| o | McDonald Observatory | Texas, USA |
| b | Baltimore, MD | Maryland, USA |
| d | DAO Victoria | BC, Canada |
| m | Mauna Kea | Hawaii, USA |
| l | Lick Observatory | California, USA |
| r | Roque de los Muchachos | La Palma, Canary Islands |

---

## Original C Program

`skycalc.c` was written by **John Thorstensen**, Department of Physics and Astronomy, Dartmouth College. It has been widely used at observatories for decades. The JS port aims for numerical agreement with the C binary to within the display precision of the original program.

---

## Files

| File | Description |
|------|-------------|
| `skycalc.html` | The complete single-file web app |
| `skycalc-math.js` | Math engine (source for the embedded block in the HTML) |
| `skycalc-tests.js` | 99-test validation suite |
| `run-tests.sh` | Test runner (requires macOS JavaScriptCore) |
| `skycalc.c` | Original C source by John Thorstensen |
| `reference_output.txt` | Golden reference output from the C binary |
| `test_input.txt` | Scripted input used to drive the C binary |
| `PLAN.md` | Implementation plan and architecture notes |

---

## License

MIT — see [LICENSE](LICENSE).

The `skycalc.c` included in this repository is Karl Glazebrook's personal modified version of Thorstensen's original, accumulated over many years of observatory use — including, for example, the addition of the Anglo-Australian Telescope site as the default. It was distributed freely by Thorstensen for academic and educational use.

---

## Development

This port was written collaboratively by **Karl Glazebrook** and **Claude Sonnet** (Anthropic's AI assistant). Claude performed the C→JS translation, wrote the test suite, designed the three-layer architecture, and built the HTML/CSS/JS UI. Karl provided domain guidance, validated the results, and directed the overall design.
