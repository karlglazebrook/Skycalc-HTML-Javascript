// skycalc-tests.js
// Standalone test suite for skycalc-math.js
// Run with:  /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc skycalc-tests.js
// Or:        ./run-tests.sh

load('skycalc-math.js');

// ============================================================
// Test harness
// ============================================================

let passed = 0, failed = 0;

function check(label, got, expected, tol) {
    const diff = Math.abs(got - expected);
    const ok = diff <= tol;
    if (ok) {
        passed++;
        print('PASS  ' + label);
    } else {
        failed++;
        print('FAIL  ' + label +
              '\n      got=' + got + '  exp=' + expected +
              '  diff=' + diff.toFixed(6) + '  tol=' + tol);
    }
    return ok;
}

function checkEq(label, got, expected) {
    const ok = (got === expected);
    if (ok) {
        passed++;
        print('PASS  ' + label);
    } else {
        failed++;
        print('FAIL  ' + label + '\n      got=' + got + '  exp=' + expected);
    }
    return ok;
}

function section(name) {
    print('\n--- ' + name + ' ---');
}

// ============================================================
// Reference scenario (from reference_output.txt)
//   Site:   AAT Siding Spring
//   Date:   2026 Mar 15, 12:00:00 UT
//   Object: RA 12h 00m 00s, Dec -45° 00' 00", epoch 2000.0
// ============================================================

const AAT = {
    lat:     -31.277039,   // degrees N  (south = negative)
    longit:  -9.937739,    // decimal hours west  (east = negative)
    elevsea: 1149.0,       // metres
    stdz:    -10.0,        // hours west  (east = negative)
    useDST:  -2            // Australian convention
};

const OBJ = { ra: 12.0, dec: -45.0, epoch: 2000.0 };

const JD_REF = 2461115.0;   // 2026-Mar-15 12:00 UT

// Pre-computed derived values used across tests
const lmst_ref    = lst(JD_REF, AAT.longit);
const curep_ref   = 2000.0 + (JD_REF - J2000) / 365.25;
const prec_ref    = precrot(OBJ.ra, OBJ.dec, OBJ.epoch, curep_ref);
const ha_ref      = adjTime(lmst_ref - prec_ref.ra);
const altaz_ref   = altit(prec_ref.dec, ha_ref, AAT.lat);
const hc_ref      = helcor(JD_REF, prec_ref.ra, prec_ref.dec, ha_ref, AAT.lat, AAT.elevsea);

// ============================================================
// 1. Basic math utilities
// ============================================================
section('Basic math utilities');

check('atanCirc(1,0) = 0',        atanCirc(1,0),  0.0,       1e-10);
check('atanCirc(0,1) = pi/2',     atanCirc(0,1),  PI/2,      1e-10);
check('atanCirc(-1,0) = pi',      atanCirc(-1,0), PI,        1e-10);
check('atanCirc(0,-1) = 3pi/2',   atanCirc(0,-1), 3*PI/2,    1e-10);

check('circulo(0)',      circulo(0),      0.0,   1e-10);
check('circulo(360)',    circulo(360),    0.0,   1e-10);
check('circulo(720)',    circulo(720),    0.0,   1e-10);
check('circulo(-10)',    circulo(-10),   -10.0,  1e-10);
check('circulo(370)',    circulo(370),    10.0,  1e-10);

check('adjTime(0)',      adjTime(0),      0.0,   1e-10);
check('adjTime(13)',     adjTime(13),    -11.0,  1e-10);
check('adjTime(-13)',    adjTime(-13),    11.0,  1e-10);
check('adjTime(24)',     adjTime(24),     0.0,   1e-10);

// subtend: two identical points -> 0
check('subtend same point',   subtend(6,0, 6,0),   0.0,  1e-10);
// subtend: 90° apart on equator
check('subtend 6hr apart eq', subtend(0,0, 6,0),   PI/2, 1e-3);

// minMaxAlt: at AAT (lat=-31.3), objects with dec > ~58.7° never rise.
// dec=+70 should have max altitude < 0.
const mm70 = minMaxAlt(AAT.lat, 70);
check('minMaxAlt dec=+70 never rises at AAT', mm70.max < 0 ? 0 : 1, 0, 0.5);

// ============================================================
// 2. Julian date & calendar
// ============================================================
section('Julian date & calendar');

check('J2000.0 JD',           dateToJD(2000,1,1,12,0,0),   2451545.0,   0.001);
check('2026-Mar-15 12:00 UT', dateToJD(2026,3,15,12,0,0),  2461115.0,   0.001);
check('1901 Jan 1 noon',      dateToJD(1901,1,1,12,0,0),   2415386.0,   0.001);
check('2000 Feb 29 (leapyr)', dateToJD(2000,2,29,0,0,0),   2451603.5,   0.001);

// dayOfWeek: J2000 = Sat 1 Jan 2000 = day 5 (0=Mon)
checkEq('dayOfWeek J2000 = Sat(5)', dayOfWeek(2451545.0), 5);

// caldat round-trip
const cal = caldat(JD_REF);
checkEq('caldat year',  cal.y,  2026);
checkEq('caldat month', cal.mo, 3);
checkEq('caldat day',   cal.d,  15);
checkEq('caldat hour',  cal.h,  12);
checkEq('caldat min',   cal.mn, 0);
check('caldat sec',     cal.s,  0.0, 0.01);

// ============================================================
// 3. Sidereal time
// ============================================================
section('Sidereal time');

// LMST at AAT on 2026-Mar-15 12:00 UT = 9h 28m 41.3s
check('LMST at AAT (hrs)', lmst_ref, 9.478139, 0.001);

// LST at Greenwich (longit=0) at J2000 = ~18.697 hrs (GMST at J2000)
check('GMST at J2000 (hrs)', lst(J2000, 0.0), 18.6972, 0.001);

// ============================================================
// 4. Delta T (etcorr)
// ============================================================
section('Delta T (etcorr)');

check('etcorr 2026',       etcorr(JD_REF),              85.5,   0.5);
check('etcorr ~1970',      etcorr(2440587.5),            40.18,  0.5);   // ~1970.0
check('etcorr ~1990',      etcorr(2447892.5),            56.86,  1.0);   // ~1990.0

// ============================================================
// 5. Precession
// ============================================================
section('Precession');

// Object RA 12h Dec -45 epoch 2000.0 precessed to 2026.20
check('precessed RA (hrs)',  prec_ref.ra,  12.022417, 0.001);
check('precessed Dec (deg)', prec_ref.dec, -45.145833, 0.01);

// Round-trip precession 2000->2026->2000
const back = precrot(prec_ref.ra, prec_ref.dec, curep_ref, 2000.0);
check('precrot roundtrip RA',  back.ra,  OBJ.ra,  0.0001);
check('precrot roundtrip Dec', back.dec, OBJ.dec, 0.001);

// ============================================================
// 6. Altitude, azimuth, airmass, hour angle
// ============================================================
section('Altitude / azimuth / airmass');

check('hour angle (hrs)',  ha_ref,         -2.544167, 0.01);
check('altitude (deg)',    altaz_ref.alt,  57.35,     0.05);
check('azimuth (deg)',     altaz_ref.az,   126.11,    0.1);
check('sec(z)',            secantZ(altaz_ref.alt), 1.188, 0.005);

// secantZ clamps
check('secantZ(90deg)',    secantZ(90.0),   1.0,   0.001);
// secantZ(-5deg): -100 clamping only triggers near 0°; at -5° it returns 1/sin(-5°) ≈ -11.474
check('secantZ(-5deg)',   secantZ(-5.0), 1.0/Math.sin(-5.0/DEG_IN_RADIAN), 0.001);
check('secantZ(0)',       secantZ(0.0),   100.0,   0.001);

// haAlt: object never rises (returns 1000 = always above)
// At AAT lat=-31.3, dec=-31.3 circumpolar: haAlt(dec=-85, lat=-31, alt=-90) = 1000 (always above)
check('haAlt always above', haAlt(-89, AAT.lat, -90.0), 1000.0, 0.001);
// Object always below: dec=+70 at lat=-31, alt=0
check('haAlt always below', haAlt(70, AAT.lat, 0.0), -1000.0, 0.001);

// ============================================================
// 7. Parallactic angle
// ============================================================
section('Parallactic angle');

check('parang (deg)', parang(ha_ref, prec_ref.dec, AAT.lat), -78.2, 0.5);
// At transit (ha=0), parallactic angle should be 0 for northern hemisphere,
// and +/-pi for southern hemisphere object south of zenith
const pa_transit_south = parang(0, -10, AAT.lat);  // dec=-10 > lat=-31.3, so north of zenith
check('parang at transit, north of zenith (S hemi)', Math.abs(pa_transit_south), PI*DEG_IN_RADIAN, 20.0);

// ============================================================
// 8. Geocentric coordinates
// ============================================================
section('Geocentric coordinates');

// At lat=0, longit=0, height=0: x=1, y=0, z~0
const g0 = geocent(0, 0, 0);
check('geocent lat=0 lon=0 x~1', g0.x, 1.0,  0.001);
check('geocent lat=0 lon=0 y=0', g0.y, 0.0,  0.001);
check('geocent lat=0 lon=0 z~0', g0.z, 0.0,  0.001);

// xyzCel round-trip: convert RA/Dec to unit vector and back
const testRA = 6.0, testDec = 30.0;
const rrad = testRA / HRS_IN_RADIAN, drad = testDec / DEG_IN_RADIAN;
const tx = Math.cos(drad)*Math.cos(rrad), ty = Math.cos(drad)*Math.sin(rrad), tz = Math.sin(drad);
const cel = xyzCel(tx, ty, tz);
check('xyzCel RA roundtrip',  cel.ra,  testRA,  0.0001);
check('xyzCel Dec roundtrip', cel.dec, testDec, 0.0001);

// ============================================================
// 9. Sun
// ============================================================
section('Sun (lpsun, accusun)');

// Sun RA at reference date (low-precision): ~23h 41.3m
const sun_lp = lpsun(JD_REF);
check('lpsun RA (hrs)',  sun_lp.ra,   23.6883, 0.05);
check('lpsun Dec < 0 (Mar)', sun_lp.dec < 0 ? 0 : 1, 0, 0.5);  // sun south of equator in March

// accusun should give similar result
const sun_acc = accusun(JD_REF, lmst_ref, AAT.lat);
check('accusun RA within 0.1hr of lpsun', Math.abs(sun_acc.topora - sun_lp.ra), 0, 0.1);

// Sun dist ~1 AU in March
check('accusun dist ~1 AU', sun_acc.dist, 1.0, 0.05);

// ============================================================
// 10. Moon
// ============================================================
section('Moon (flmoon, lunAge, accumoon)');

// flmoon: new moon near 2026-Mar-19 (reference: 3.5 days after our date)
// k = trunc() gives the most recent past lunation; k+1 gives the next new moon.
const newmoon_jd = flmoon(Math.trunc((JD_REF - 2415020.5) / 29.5307) + 1, 0);
check('new moon ~3.5 days after ref', newmoon_jd - JD_REF, 3.5, 1.0);

// lunAge
const la = lunAge(JD_REF);
check('moon age (days)', la.age, 29.5307 - 3.6, 0.5);

// accumoon: topocentric and geocentric should be close (within ~1 degree)
const moon_acc = accumoon(JD_REF, AAT.lat, lmst_ref, AAT.elevsea);
check('accumoon topo-geo RA diff < 0.1hr',
      Math.abs(moon_acc.topora - moon_acc.geora), 0, 0.1);

// moonPhaseText should mention "before new moon"
const phase_str = moonPhaseText(JD_REF);
check('moonPhaseText contains "before new"',
      phase_str.indexOf('before new') >= 0 ? 0 : 1, 0, 0.5);

// ============================================================
// 11. DST handling
// ============================================================
section('DST handling');

// AAT 2026: DST (AEDT) active in March (southern summer)
const { jdb, jde } = findDSTBounds(2026, AAT.stdz, AAT.useDST);
check('AAT DST active Mar-15 (zone=-11)',
      zoneOffset(AAT.useDST, AAT.stdz, JD_REF + AAT.stdz/24, jdb, jde), -11.0, 0.001);

// AAT July: should be standard time (AEST, UTC+10, zone=-10)
const jd_july = dateToJD(2026, 7, 1, 12, 0, 0);
const { jdb: jdb2, jde: jde2 } = findDSTBounds(2026, AAT.stdz, AAT.useDST);
check('AAT standard time Jul-1 (zone=-10)',
      zoneOffset(AAT.useDST, AAT.stdz, jd_july + AAT.stdz/24, jdb2, jde2), -10.0, 0.001);

// USA DST 2026: active in June
const jd_june_usa = dateToJD(2026, 6, 15, 12, 0, 0);
const stdz_usa = 5.0;  // EST (UTC-5, west-positive)
const { jdb: jdbUSA, jde: jdeUSA } = findDSTBounds(2026, stdz_usa, 1);
check('USA DST active Jun-15 (zone=4)',
      zoneOffset(1, stdz_usa, jd_june_usa + stdz_usa/24, jdbUSA, jdeUSA), 4.0, 0.001);

// No DST (use_dst=0) always returns stdz
check('no DST always stdz',
      zoneOffset(0, 7.0, JD_REF, 0, 1e99), 7.0, 0.001);

// trueJD with UT flag should match dateToJD directly
check('trueJD enterUT=true',
      trueJD(2026,3,15,12,0,0, AAT.useDST, true, false, AAT.stdz),
      JD_REF, 0.001);

// ============================================================
// 12. Galactic & ecliptic coordinates
// ============================================================
section('Galactic & ecliptic coordinates');

check('galactic l (deg)', galact(OBJ.ra, OBJ.dec, OBJ.epoch).glong, 293.46, 0.05);
check('galactic b (deg)', galact(OBJ.ra, OBJ.dec, OBJ.epoch).glat,   16.92, 0.05);

const ecl = eclipt(OBJ.ra, OBJ.dec, OBJ.epoch, JD_REF);
check('ecliptic long (deg)', ecl.eclong, 202.05, 0.1);
check('ecliptic lat (deg)',  ecl.eclat,  -40.45, 0.1);

// Galactic north pole (RA 12h49, Dec +27.4, epoch 1950)
// should have high glat
const gnp = galact(12 + 49/60, 27.4, 1950.0);
check('galactic pole glat > 80', gnp.glat > 80 ? 0 : 1, 0, 0.5);

// ============================================================
// 13. Barycentric / heliocentric corrections
// ============================================================
section('Barycentric / heliocentric corrections');

check('helcor tcor (sec)',  hc_ref.tcor, 337.7, 1.0);
check('helcor vcor (km/s)', hc_ref.vcor,  10.89, 0.05);

const bjd = JD_REF + hc_ref.tcor / SEC_IN_DAY;
check('BJD', bjd, 2461115.003909, 0.000010);

// Magnitude sanity: |vcor| < 40 km/s (Earth orbital + diurnal)
check('|vcor| < 40 km/s', Math.abs(hc_ref.vcor) < 40 ? 0 : 1, 0, 0.5);
// |tcor| < 600 sec (max light travel time across Earth's orbit)
check('|tcor| < 600 sec', Math.abs(hc_ref.tcor) < 600 ? 0 : 1, 0, 0.5);

// ============================================================
// 14. Planets
// ============================================================
section('Planets');

compEl(JD_REF);

// Jupiter at reference date
const planets = pposns(JD_REF, AAT.lat, lmst_ref);
// pposns result: [0]=Mercury, [1]=Venus, [2]=null(Earth), [3]=Mars, [4]=Jupiter, [5]=Saturn, [6]=Uranus, [7]=Neptune, [8]=Pluto
const jup = planets[4];
check('Jupiter RA (hrs)',  jup.ra,  7.095, 0.1);
check('Jupiter Dec (deg)', jup.dec, 22.933, 0.5);

// All planets should have sensible RA (0-24) and Dec (-90 to +90)
const pnames = ['Mercury','Venus','(Earth)','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
for (let i = 0; i < 9; i++) {
    if (planets[i] === null) continue;
    const p = planets[i];
    check(pnames[i] + ' RA in [0,24]',  (p.ra >= 0 && p.ra < 24)   ? 0 : 1, 0, 0.5);
    check(pnames[i] + ' Dec in [-90,90]', (p.dec >= -90 && p.dec <= 90) ? 0 : 1, 0, 0.5);
}

// Sun (from accusun, not pposns) should be near RA 23h41 in March
const sunPos = accusun(JD_REF, lmst_ref, AAT.lat);
check('Sun topora ~23.7h', sunPos.topora, 23.7, 0.2);
check('Sun topodec near 0 in March', Math.abs(sunPos.topodec) < 10 ? 0 : 1, 0, 0.5);

// ============================================================
// 15. Rise/set iterators
// ============================================================
section('Rise/set iterators');

// Sun sets in evening at AAT on 2026-Mar-15; guess ~local noon
const jd_midnight = dateToJD(2026, 3, 15, 13, 0, 0);   // local midnight = JD 13:00 UT
const jd_sunset_guess = dateToJD(2026, 3, 15, 9, 0, 0); // ~8 UT = 6pm local
const jd_sunset = jdSunAlt(-0.833, jd_sunset_guess, AAT.lat, AAT.longit);
// Reference: sunset 19:26 ADT = 08:26 UT; JD ~ 2461115.352
check('sunset JD within 10min of ref',
      Math.abs(jd_sunset - (JD_REF - 0.5 + 8.43/24)), 0, 10/1440);

// Twilight (sun at -18 deg): evening twilight ~20:43 ADT = 09:43 UT
const jd_twi_guess = dateToJD(2026, 3, 15, 10, 0, 0);
const jd_twi = jdSunAlt(-18.0, jd_twi_guess, AAT.lat, AAT.longit);
check('evening twilight within 10min of ref',
      Math.abs(jd_twi - (JD_REF - 0.5 + 9.717/24)), 0, 10/1440);

// Moon rise ~03:45 ADT Mar 16 = 16:45 UT Mar 15 = JD_REF + 4.75/24.
// Guess just before moonrise; verify the returned JD has moon near alt=0.
const jd_moonrise_guess = dateToJD(2026, 3, 15, 16, 30, 0);  // 16:30 UT, 15min before
const jd_moonrise = jdMoonAlt(0.0, jd_moonrise_guess, AAT.lat, AAT.longit, AAT.elevsea);
// Primary check: reference says moonrise ~16:45 UT (JD_REF + 4.75/24)
check('moonrise JD within 15min of ref',
      Math.abs(jd_moonrise - (JD_REF + 4.75/24)), 0, 15/1440);
// Secondary check: moon altitude at returned JD should be near 0
const sid_mr = lst(jd_moonrise, AAT.longit);
const moon_mr = accumoon(jd_moonrise, AAT.lat, sid_mr, AAT.elevsea);
const alt_mr = altit(moon_mr.topodec, sid_mr - moon_mr.topora, AAT.lat).alt;
check('moon alt at moonrise JD near 0', alt_mr, 0.0, 1.0);

// ============================================================
// Scenario 2: 2050 Jun 21 12:00 UT
//   Object: RA 17h 45m 40s  Dec -29° 00' 28"  (near Galactic Centre)
//   Site:   Kitt Peak [MDM Obs.]
//   Reference from C binary
// ============================================================

const KP = {
    lat:     31.9533,    // degrees N
    longit:   7.44111,  // decimal hours west
    elevsea: 1925.0,    // metres
    stdz:     7.0,      // hours west (no DST at Kitt Peak)
    useDST:   0
};

const OBJ2 = { ra: 17 + 45/60 + 40/3600, dec: -(29 + 28/3600), epoch: 2000.0 };
// 17h 45m 40s = 17.76111 hrs;  -29° 00' 28" = -29.00778°

const JD2 = 2469979.000000;   // 2050-Jun-21 12:00 UT

const lmst2     = lst(JD2, KP.longit);
const curep2    = 2000.0 + (JD2 - J2000) / 365.25;
const prec2     = precrot(OBJ2.ra, OBJ2.dec, OBJ2.epoch, curep2);
const ha2       = adjTime(lmst2 - prec2.ra);
const altaz2    = altit(prec2.dec, ha2, KP.lat);
const hc2       = helcor(JD2, prec2.ra, prec2.dec, ha2, KP.lat, KP.elevsea);

section('Scenario 2 — 2050-Jun-21, Galactic Centre region, Kitt Peak');

// LMST: 22h 33m 04.2s = 22.55117 hrs
check('S2 LMST (hrs)',          lmst2,         22.55117, 0.001);

// Precessed: RA 17h 48m 52.6s = 17.81461 hrs;  dec -29° 01' 24" = -29.02333°, ep 2050.47
check('S2 precessed RA (hrs)',  prec2.ra,      17.81461, 0.001);
check('S2 precessed Dec (deg)', prec2.dec,    -29.02333, 0.02);

// HA: +4h 44m 12s = +4.73667 hrs  (object is below horizon, west of meridian)
check('S2 hour angle (hrs)',    ha2,            4.73667, 0.01);
check('S2 altitude (deg)',      altaz2.alt,    -0.91,    0.1);
check('S2 azimuth (deg)',       altaz2.az,     235.80,   0.3);
// sec.z near horizon: 1/sin(-0.91°) ≈ -63; use loose tolerance
check('S2 sec(z)',              secantZ(altaz2.alt), -63.249, 5.0);
check('S2 parang (deg)',        parang(ha2, prec2.dec, KP.lat), 53.4, 2.0);

// No DST at Kitt Peak (useDST=0), zone=7 always
check('S2 no DST at KP (zone=7)',
      zoneOffset(KP.useDST, KP.stdz, JD2 + KP.stdz/24, 0, 1e99), 7.0, 0.001);

// Barycentric corrections: +505.4 sec, -1.64 km/s
check('S2 helcor tcor (sec)',   hc2.tcor,  505.4, 2.0);
check('S2 helcor vcor (km/s)',  hc2.vcor,  -1.64, 0.1);
check('S2 BJD',                 JD2 + hc2.tcor / SEC_IN_DAY, 2469979.005850, 0.00002);

// Galactic: l=359.94, b=-0.05
const gal2 = galact(OBJ2.ra, OBJ2.dec, OBJ2.epoch);
check('S2 galactic l (deg)',    gal2.glong, 359.94, 0.1);
check('S2 galactic b (deg)',    gal2.glat,   -0.05, 0.1);

// Ecliptic long=267.56, lat=-5.61
const ecl2 = eclipt(OBJ2.ra, OBJ2.dec, OBJ2.epoch, JD2);
check('S2 ecliptic long (deg)', ecl2.eclong, 267.56, 0.2);
check('S2 ecliptic lat (deg)',  ecl2.eclat,   -5.61, 0.1);

// Moon is down at Kitt Peak at this time
const moon2 = accumoon(JD2, KP.lat, lmst2, KP.elevsea);
const moonAlt2 = altit(moon2.topodec, lmst2 - moon2.topora, KP.lat).alt;
check('S2 moon is below horizon', moonAlt2 < 0 ? 0 : 1, 0, 0.5);

// Sun is in twilight (C: alt -4.7°, below horizon)
const sun2 = accusun(JD2, lmst2, KP.lat);
const sunAlt2 = altit(sun2.topodec, lmst2 - sun2.topora, KP.lat).alt;
check('S2 sun below horizon', sunAlt2 < 0 ? 0 : 1, 0, 0.5);

// ============================================================
// Scenario 3: 2075 Dec 15 12:00 UT
//   Object: RA 5h 34m 32s  Dec +22° 00' 52"  (Crab Nebula M1)
//   Site:   VLT Cerro Paranal
//   Reference from C binary
// ============================================================

const VLT = {
    lat:    -24.66667,  // degrees N (south = negative)
    longit:   4.6944,  // decimal hours west
    elevsea: 2635.0,   // metres
    stdz:     4.0,     // hours west; Chilean DST
    useDST:  -1
};

const OBJ3 = { ra: 5 + 34/60 + 32/3600, dec: 22 + 52/3600, epoch: 2000.0 };
// 5h 34m 32s = 5.57556 hrs;  +22° 00' 52" = 22.01444°

const JD3 = 2479287.000000;   // 2075-Dec-15 12:00 UT

const lmst3     = lst(JD3, VLT.longit);
const curep3    = 2000.0 + (JD3 - J2000) / 365.25;
const prec3     = precrot(OBJ3.ra, OBJ3.dec, OBJ3.epoch, curep3);
const ha3       = adjTime(lmst3 - prec3.ra);
const altaz3    = altit(prec3.dec, ha3, VLT.lat);
const hc3       = helcor(JD3, prec3.ra, prec3.dec, ha3, VLT.lat, VLT.elevsea);

section('Scenario 3 — 2075-Dec-15, Crab Nebula (M1), VLT');

// LMST: 12h 55m 29.8s = 12.92494 hrs
check('S3 LMST (hrs)',          lmst3,         12.92494, 0.001);

// Precessed: RA 5h 39m 06.5s = 5.65181 hrs;  dec +22° 03' 26" = 22.05722°, ep 2075.95
check('S3 precessed RA (hrs)',  prec3.ra,      5.65181,  0.001);
check('S3 precessed Dec (deg)', prec3.dec,     22.05722, 0.02);

// HA: +7h 16m 23s = +7.27306 hrs  (object is below horizon, far west)
check('S3 hour angle (hrs)',    ha3,            7.27306, 0.01);
check('S3 altitude (deg)',      altaz3.alt,   -25.61,    0.2);
check('S3 azimuth (deg)',       altaz3.az,    283.78,    0.3);
check('S3 sec(z)',              secantZ(altaz3.alt), -2.313, 0.05);
check('S3 parang (deg)',        parang(ha3, prec3.dec, VLT.lat), 107.8, 2.0);

// Chilean DST: December = southern summer, DST active, zone = stdz-1 = 3 (UTC-3 = CLST)
const { jdb: jdb3v, jde: jde3v } = findDSTBounds(2075, VLT.stdz, VLT.useDST);
check('S3 Chilean DST in Dec (zone=3)',
      zoneOffset(VLT.useDST, VLT.stdz, JD3 + VLT.stdz/24, jdb3v, jde3v), 3.0, 0.001);

// Barycentric corrections: +492.3 sec, +0.26 km/s
check('S3 helcor tcor (sec)',   hc3.tcor,  492.3, 2.0);
check('S3 helcor vcor (km/s)',  hc3.vcor,   0.26, 0.1);
check('S3 BJD',                 JD3 + hc3.tcor / SEC_IN_DAY, 2479287.005698, 0.00002);

// Galactic: l=184.56, b=-5.78
const gal3 = galact(OBJ3.ra, OBJ3.dec, OBJ3.epoch);
check('S3 galactic l (deg)',    gal3.glong, 184.56, 0.1);
check('S3 galactic b (deg)',    gal3.glat,   -5.78, 0.1);

// Ecliptic long=85.16, lat=-1.28
const ecl3 = eclipt(OBJ3.ra, OBJ3.dec, OBJ3.epoch, JD3);
check('S3 ecliptic long (deg)', ecl3.eclong, 85.16, 0.2);
check('S3 ecliptic lat (deg)',  ecl3.eclat,  -1.28, 0.1);

// Sun is UP at VLT at 12:00 UT (daytime; local time 09:00 CLST)
const sun3 = accusun(JD3, lmst3, VLT.lat);
const sunAlt3 = altit(sun3.topodec, lmst3 - sun3.topora, VLT.lat).alt;
check('S3 sun above horizon (daytime)', sunAlt3 > 0 ? 0 : 1, 0, 0.5);

// Moon is down at VLT at this time
const moon3 = accumoon(JD3, VLT.lat, lmst3, VLT.elevsea);
const moonAlt3 = altit(moon3.topodec, lmst3 - moon3.topora, VLT.lat).alt;
check('S3 moon is below horizon', moonAlt3 < 0 ? 0 : 1, 0, 0.5);

// ============================================================
// Scenario 4: 2099 Nov 10 14:00 UT
//   Object: RA 0h 42m 44s  Dec +41° 16' 09"  (M31, Andromeda Galaxy)
//   Site:   Mauna Kea
//   Reference from C binary
// ============================================================

const MK = {
    lat:     19.8267,   // degrees N
    longit:  10.36478,  // decimal hours west
    elevsea: 4215.0,    // metres
    stdz:    10.0,      // hours west; no DST in Hawaii
    useDST:   0
};

const OBJ4 = { ra: 0 + 42/60 + 44/3600, dec: 41 + 16/60 + 9/3600, epoch: 2000.0 };
// 0h 42m 44s = 0.71222 hrs;  +41° 16' 09" = 41.26917°

const JD4 = 2488018.083333;   // 2099-Nov-10 14:00 UT

const lmst4     = lst(JD4, MK.longit);
const curep4    = 2000.0 + (JD4 - J2000) / 365.25;
const prec4     = precrot(OBJ4.ra, OBJ4.dec, OBJ4.epoch, curep4);
const ha4       = adjTime(lmst4 - prec4.ra);
const altaz4    = altit(prec4.dec, ha4, MK.lat);
const hc4       = helcor(JD4, prec4.ra, prec4.dec, ha4, MK.lat, MK.elevsea);

section('Scenario 4 — 2099-Nov-10, M31 Andromeda Galaxy, Mauna Kea');

// LMST: 6h 58m 21.1s = 6.97253 hrs
check('S4 LMST (hrs)',          lmst4,         6.97253,  0.001);

// Precessed: RA 0h 48m 14.5s = 0.80403 hrs;  dec +41° 48' 51" = 41.81417°, ep 2099.86
check('S4 precessed RA (hrs)',  prec4.ra,      0.80403,  0.002);
check('S4 precessed Dec (deg)', prec4.dec,     41.81417, 0.05);

// HA: +6h 10m 07s = +6.16861 hrs  (setting in northwest, large but visible)
check('S4 hour angle (hrs)',    ha4,           6.16861,  0.01);
check('S4 altitude (deg)',      altaz4.alt,    11.26,    0.2);
check('S4 azimuth (deg)',       altaz4.az,     310.61,   0.3);
check('S4 sec(z)',              secantZ(altaz4.alt), 5.123, 0.05);
check('S4 parang (deg)',        parang(ha4, prec4.dec, MK.lat), 73.4, 1.0);

// No DST at Mauna Kea (Hawaii never uses DST), zone=10 always
check('S4 no DST at MK (zone=10)',
      zoneOffset(MK.useDST, MK.stdz, JD4 + MK.stdz/24, 0, 1e99), 10.0, 0.001);

// Barycentric corrections: +393.0 sec, -8.93 km/s
check('S4 helcor tcor (sec)',   hc4.tcor,  393.0, 2.0);
check('S4 helcor vcor (km/s)',  hc4.vcor,  -8.93, 0.1);
check('S4 BJD',                 JD4 + hc4.tcor / SEC_IN_DAY, 2488018.087882, 0.00002);

// Galactic: l=121.17, b=-21.57
const gal4 = galact(OBJ4.ra, OBJ4.dec, OBJ4.epoch);
check('S4 galactic l (deg)',    gal4.glong, 121.17, 0.1);
check('S4 galactic b (deg)',    gal4.glat,  -21.57, 0.1);

// Ecliptic long=29.24, lat=33.36
const ecl4 = eclipt(OBJ4.ra, OBJ4.dec, OBJ4.epoch, JD4);
check('S4 ecliptic long (deg)', ecl4.eclong, 29.24, 0.2);
check('S4 ecliptic lat (deg)',  ecl4.eclat,  33.36, 0.2);

// Sun and moon both down at 14:00 UT = 04:00 HST (nighttime)
const sun4 = accusun(JD4, lmst4, MK.lat);
const sunAlt4 = altit(sun4.topodec, lmst4 - sun4.topora, MK.lat).alt;
check('S4 sun is below horizon', sunAlt4 < 0 ? 0 : 1, 0, 0.5);

const moon4 = accumoon(JD4, MK.lat, lmst4, MK.elevsea);
const moonAlt4 = altit(moon4.topodec, lmst4 - moon4.topora, MK.lat).alt;
check('S4 moon is below horizon', moonAlt4 < 0 ? 0 : 1, 0, 0.5);

// ============================================================
// Summary
// ============================================================

print('\n' + '='.repeat(50));
print('Results: ' + passed + ' passed, ' + failed + ' failed  (' + (passed+failed) + ' total)');
if (failed === 0) {
    print('ALL TESTS PASSED');
} else {
    print('*** ' + failed + ' FAILURES ***');
}
print('='.repeat(50));
