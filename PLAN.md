# Skycalc C → JavaScript Web App: Implementation Plan

## Overview

Convert `skycalc.c` (6,629-line astronomical calculator by John Thorstensen) into a single self-contained HTML file web application.

## Target Features

- Default site: **AAT (Anglo-Australian Telescope)**
- Dropdown for all preset sites + Custom site
- Custom site: Google Maps picker + IANA timezone selector
- Top panel: RA, Dec, Epoch, proper motion inputs (shared across all tabs)
- Date/time: "Now" button (real-time, auto-updates every second) + manual entry
- Five tabs:
  1. **Circumstances** — real-time display of the `=` function
  2. **Almanac** — tonight's sunset/twilight/moonrise (`a` function)
  3. **Hourly Airmass** — table through the night (`h` function)
  4. **Observability** — seasonal chart (`o` function)
  5. **Planets** — major planet positions (`m` function)

## Dependencies (external, CDN)

- **Luxon** — IANA timezone handling for custom site modal only
- **Google Maps JavaScript API** — location picker, lazy-loaded on demand

Everything else: vanilla JS + HTML + CSS, inlined in one file.

---

## Observatory Sites (from C source)

Longitudes are **west-positive decimal hours**; latitudes **north-positive degrees**.
`use_dst`: 0=none, 1=USA, 2=EU/Spanish, -1=Chilean, -2=Australian.

| Code | Name | Long (W hrs) | Lat (°N) | ElevSea (m) | ElevHoriz (m) | StdZ (W hrs) | DST |
|------|------|-------------|----------|------------|--------------|-------------|-----|
| **a** | **Anglo-Australian Tel., Siding Spring ← DEFAULT** | **-9.937739** | **-31.277039** | **1149** | **670** | **-10** | **Australian (-2)** |
| k | Kitt Peak [MDM Obs.] | 7.44111 | 31.9533 | 1925 | 700 | 7 | None (0) |
| s | Apache Point Observatory | 7.054667 | 32.78056 | 2800 | 2800 | 7 | None (0) |
| e | ESO, Cerro La Silla | 4.7153 | -29.257 | 2347 | 2347 | 4 | Chilean (-1) |
| v | VLT, ESO Cerro Paranal | 4.6944 | -24.66667 | 2635 | 2635 | 4 | Chilean (-1) |
| p | Palomar Observatory | 7.79089 | 33.35667 | 1706 | 1706 | 8 | USA (1) |
| t | Cerro Tololo | 4.721 | -30.165 | 2215 | 2215 | 4 | Chilean (-1) |
| h | Mount Hopkins, Arizona | 7.39233 | 31.6883 | 2608 | 500 | 7 | None (0) |
| o | McDonald Observatory | 6.93478 | 30.6717 | 2075 | 1000 | 6 | USA (1) |
| b | Baltimore | 5.11111 | 39.18333 | 0 | 0 | 5 | USA (1) |
| d | DAO, Victoria, BC | 8.22778 | 48.52 | 74 | 74 | 8 | USA (1) |
| m | Mauna Kea, Hawaii | 10.36478 | 19.8267 | 4215 | 4215 | 10 | None (0) |
| l | Lick Observatory | 8.10911 | 37.3433 | 1290 | 1290 | 8 | USA (1) |
| r | Roque de los Muchachos | 1.192 | 28.75833 | 2326 | 2326 | 0 | EU/Spanish (2) |

Horizon depression: `horiz = sqrt(2 * elevHoriz / 6378140) * (180/PI)` degrees.

---

## Architecture

### JS Module Sections (in one `<script>` block)

```
SECTION 1:  Constants
SECTION 2:  Math utilities       (atan_circ, circulo, adj_time, subtend)
SECTION 3:  Time & calendar      (date_to_jd, caldat, lst, find_dst_bounds, zone, true_jd, etcorr)
SECTION 4:  Sun                  (lpsun, accusun, ztwilight)
SECTION 5:  Moon                 (lpmoon, accumoon, flmoon, lun_age, print_phase)
SECTION 6:  Rise/set iterators   (jd_sun_alt, jd_moon_alt, ha_alt)
SECTION 7:  Coordinates          (altit, secant_z, parang, precrot, eclipt, galact, geocent, xyz_cel, min_max_alt)
SECTION 8:  Planets              (comp_el, planetxyz, planetvel, eclrot, earthview, pposns, planet_alert)
SECTION 9:  Corrections          (helcor, barycor, lunskybright, solecl, lunecl)
SECTION 10: Site data
SECTION 11: Tab computations     (computeCircumstances, computeAlmanac, computeHourly, computeObservability, computePlanets)
SECTION 12: UI / DOM
SECTION 13: Update loop
```

### State

```javascript
const AppState = {
  ra: 0, dec: 0, epoch: 2000.0,
  pmRA_sec: 0, pmDec: 0,
  site: { ...AAT },
  jdUT: 0,
  isNowMode: false,
  activeTab: 'circumstances',
  nowIntervalId: null,
};
```

### Real-Time Loop

```javascript
function nowToJD() { return Date.now() / 86400000.0 + 2440587.5; }
```
Circumstances tab refreshes every second. Other tabs compute on demand.

---

## C → JS Function Map

### Time & Calendar

| C | JS | Notes |
|---|----|-------|
| `date_to_jd()` | `dateToJD(y,mo,d,h,mn,s)` | Use `Math.trunc()` not `Math.floor()` for integer division |
| `caldat()` | `caldat(jd)` → `{y,mo,d,h,mn,s,dow}` | Numerical Recipes algorithm; all integer steps need `Math.trunc` |
| `lst()` | `lst(jd, longitHrs)` | Returns LMST decimal hours |
| `find_dst_bounds()` | `findDSTBounds(yr, stdz, useDST)` → `{jdb, jde}` | 5 DST convention branches |
| `zone()` | `zoneOffset(useDST, stdz, jd, jdb, jde)` | Southern hemisphere logic reversal for use_dst < 0 |
| `true_jd()` | `trueJD(...)` | Combines zone handling |
| `etcorr()` | `etcorr(jd)` | Table interpolation, 20 data points |

### Sun

| C | JS | Notes |
|---|----|-------|
| `lpsun()` | `lpsun(jd)` → `{ra, dec}` | Low-precision; J2000 epoch base |
| `accusun()` | `accusun(jd, lst, geolat)` → `{ra,dec,dist,topora,topodec,x,y,z}` | Includes topocentric correction |
| `ztwilight()` | `ztwilight(alt)` | Polynomial fit for sky brightness |

### Moon

| C | JS | Notes |
|---|----|-------|
| `lpmoon()` | `lpmoon(jd, lat, sid)` | Low-precision; for hourly table |
| `accumoon()` | `accumoon(jd, geolat, lst, elevsea)` | Most complex: 50+ trig terms; epoch base is **1900** (`T = (jd-2415020)/36525`) |
| `flmoon()` | `flmoon(n, nph)` → `jd` | New/full moon dates |
| `lun_age()` | `lunAge(jd)` → `{age, nlun}` | Iterates flmoon |
| `print_phase()` | `moonPhaseText(jd)` → string | Verbal phase description |
| `jd_moon_alt()` | `jdMoonAlt(alt, jdguess, lat, longit, elevsea)` | Newton iteration |

### Coordinates

| C | JS | Notes |
|---|----|-------|
| `altit()` | `altit(dec, ha, lat)` → `{alt, az}` | |
| `secant_z()` | `secantZ(alt)` | Clamped to ±100 |
| `ha_alt()` | `haAlt(dec, lat, alt)` | Hour angle at given altitude |
| `parang()` | `parang(ha, dec, lat)` | **4-branch logic** for N/S, zenith crossing — test carefully |
| `precrot()` | `precrot(ra, dec, ep0, ep1)` → `{ra, dec}` | IAU 1976 rotation matrix |
| `eclipt()` | `eclipt(ra, dec, epoch, jd)` → `{eclong, eclat}` | |
| `galact()` | `galact(ra, dec, epoch)` → `{glong, glat}` | Hard-coded rotation matrix |
| `geocent()` | `geocent(geolong, geolat, height)` → `{x,y,z}` | Ellipsoidal earth |
| `subtend()` | `subtend(ra1,dec1,ra2,dec2)` | Returns radians |
| `min_max_alt()` | `minMaxAlt(lat, dec)` → `{min, max}` | |
| `xyz_cel()` | `xyzCel(x,y,z)` → `{ra,dec}` | |

### Planets

| C | JS | Notes |
|---|----|-------|
| `comp_el()` | `compEl(jd)` → `el[]` | Global element array; cache by JD |
| `planetxyz()` | `planetXYZ(p, jd, el)` → `{x,y,z}` | Kepler equation solve |
| `planetvel()` | `planetVel(p, jd, el)` → `{vx,vy,vz}` | Numerical differentiation |
| `eclrot()` | `eclrot(jd, x,y,z)` → `{x,y,z}` | Ecliptic → equatorial |
| `earthview()` | `earthView(x,y,z,i,el)` → `{ra,dec}` | |
| `pposns()` | `pposns(jd, lat, sid)` → array | Sun + Moon + 8 planets |
| `planet_alert()` | `planetAlert(jd,ra,dec,tol)` → string[] | |

### Corrections

| C | JS | Notes |
|---|----|-------|
| `helcor()` | `helcor(jd,ra,dec,ha,lat,elevsea)` → `{tcor,vcor}` | Calls accusun 3× for Earth velocity |
| `barycor()` | `barycor(jd, pos, vel)` | Modifies pos/vel arrays |
| `lunskybright()` | `lunskybright(alpha,rho,kzen,altmoon,alt,moondist)` | V mag/sq-arcsec |
| `solecl()` | `solecl(sun_moon, distmoon, distsun)` → string\|null | |
| `lunecl()` | `lunecl(...)` → string\|null | |

### Coordinate Display

```javascript
// Mirrors put_coords() modes:
// 0: "HH MM"       (int hours, int minutes)
// 1: "DD MM"       (int degrees, int minutes)
// 2: "DD MM SS"    (degrees minutes seconds)
// 3: "HH MM SS.S"  (hours, 1 decimal second)
// 4: "HH MM SS.SS" (hours, 2 decimal seconds)
function putCoords(val, mode) { ... }
```
Handle negative values explicitly (C struct carries explicit sign because `-0 != 0` for the hours field).

---

## Known Gotchas

1. **`Math.trunc` vs `Math.floor`**: C integer division truncates toward zero; `Math.floor` rounds toward −∞. Use `Math.trunc` for all intermediate steps in `date_to_jd` and `caldat`.

2. **Longitude sign convention**: C uses west-positive decimal hours throughout. AAT = `−9.938` hrs (negative = east of Greenwich). Google Maps returns east-positive degrees. Conversion: `longitHrs = -longitudeDeg_east / 15.0`.

3. **Australian DST (AAT default)**: `use_dst = -2`. DST is in southern summer (Oct–Apr), so `jdb`/`jde` logic is reversed from northern hemisphere. During DST, `zone()` returns `stdz - 1`. Test: July → AEST (UTC+10); November → AEDT (UTC+11).

4. **`accumoon` epoch**: Uses 1900 base: `T = (jd − 2415020) / 36525`. NOT J2000. `lpsun` uses J2000. Do not mix.

5. **Planet element caching**: `comp_el(jd)` populates global `el[10]`; used by `planetxyz()` via `el[p].daily * (jd − jd_el) + el[p].L_0`. Re-compute when JD changes by more than ~1 day.

6. **`helcor` cost**: Calls `accusun` 3× with `EARTH_DIFF = 0.05` day offsets for numerical differentiation. Cache result by JD.

7. **`parang()` branches**: 4 cases — N/S hemisphere × HA sign. Test objects near zenith from southern hemisphere (AAT default).

8. **`obs_season` start**: Uses `lun_age(jdstart)` to find last new moon, then alternates new/full using `flmoon(n, nph)`. Outer loop while `jd <= jdend`.

9. **`find_dst_bounds` day-of-week**: C uses 0=Mon, 6=Sun convention. Do NOT use `new Date().getDay()` (0=Sun). Port `day_of_week()` from C.

10. **`Date.now()` → JD**: `jdUT = Date.now() / 86400000.0 + 2440587.5`.

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Object: RA [________] Dec [________] Epoch [2000.0]            │
│          PM RA (s/yr) [______] PM Dec ("/yr) [______]           │
├──────────────────────┬──────────────────────────────────────────┤
│ Site: [AAT ▼]        │  [▶ Now]  [2026-03-15T22:00] [UT □]    │
│                      │  JD: 2460920.417   LMST: 09h 41m 22s   │
├──────────────────────┴──────────────────────────────────────────┤
│ [Circumstances] [Almanac] [Hourly Airmass] [Observability] [Planets] │
├─────────────────────────────────────────────────────────────────┤
│  (tab content — monospace font, scrollable)                     │
└─────────────────────────────────────────────────────────────────┘
```

Custom Site modal: Google Maps click-to-set + manual lat/lon + IANA timezone `<select>` (populated from `Intl.supportedValuesOf('timeZone')`) + DST convention override.

---

## Implementation Phases

| Phase | Content | Status |
|-------|---------|--------|
| 1 | **Math core**: port all ~50 C functions; validate against compiled C binary | ⬜ TODO |
| 2 | Site data + AppState; test AAT DST boundary logic | ⬜ TODO |
| 3 | Circumstances tab + Now loop (1-second real-time display) | ⬜ TODO |
| 4 | Almanac + Planets tabs (computed on demand) | ⬜ TODO |
| 5 | Hourly Airmass tab | ⬜ TODO |
| 6 | Observability tab (date range inputs + seasonal table) | ⬜ TODO |
| 7 | Custom site + Google Maps modal + Luxon timezone picker | ⬜ TODO |
| 8 | Polish: responsive CSS, print stylesheet, copy-to-clipboard | ⬜ TODO |

---

## Validation Strategy (Phase 1)

Drive the compiled C binary (`./skycalc`) via stdin/stdout with scripted inputs:
- Fixed site: AAT
- Fixed object: RA 12 00 00, Dec -45 00 00, epoch 2000
- Fixed date: 2026 Mar 15, 22:00 local AEST (= 12:00 UT)
- Capture outputs of `=`, `a`, `h`, `m` commands
- Port each JS function; compare outputs numerically
- Tolerance: ≤ 0.001 for angles in degrees, ≤ 0.01s for times

Key test cases (independent of object/site):
- `dateToJD(2000, 1, 1, 12, 0, 0)` = **2451545.0** (J2000.0)
- `lst(2451545.0, 0)` ≈ **18.6972 hr** (GMST at J2000.0)
- Sun RA/Dec at J2000.0
- Known moon position from Meeus examples
