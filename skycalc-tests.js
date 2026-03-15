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
