// skycalc-compute.js
// =====================================================================
// COMPUTE API — pure functions (no DOM). Embedded verbatim into
// skycalc.html by ./build.sh. Depends on skycalc-math.js (load first).
// =====================================================================

// ── Site data ──────────────────────────────────────────────────────
const SITES = [
  { code:'a', name:'Anglo-Australian Tel., Siding Spring', longit:-9.937739, lat:-31.277039, elevsea:1149, elevhoriz:670,  stdz:-10, useDST:-2 },
  { code:'k', name:'Kitt Peak [MDM Obs.]',                 longit: 7.44111,  lat: 31.9533,  elevsea:1925, elevhoriz:700,  stdz:  7, useDST: 0 },
  { code:'s', name:'Apache Point Observatory',             longit: 7.054667, lat: 32.78056, elevsea:2800, elevhoriz:2800, stdz:  7, useDST: 0 },
  { code:'e', name:'ESO La Silla',                         longit: 4.7153,   lat:-29.257,   elevsea:2347, elevhoriz:2347, stdz:  4, useDST:-1 },
  { code:'v', name:'VLT Cerro Paranal',                    longit: 4.6944,   lat:-24.66667, elevsea:2635, elevhoriz:2635, stdz:  4, useDST:-1 },
  { code:'p', name:'Palomar Observatory',                  longit: 7.79089,  lat: 33.35667, elevsea:1706, elevhoriz:1706, stdz:  8, useDST: 1 },
  { code:'t', name:'Cerro Tololo',                         longit: 4.721,    lat:-30.165,   elevsea:2215, elevhoriz:2215, stdz:  4, useDST:-1 },
  { code:'h', name:'Mt. Hopkins / MMT',                    longit: 7.39233,  lat: 31.6883,  elevsea:2608, elevhoriz:500,  stdz:  7, useDST: 0 },
  { code:'o', name:'McDonald Observatory',                 longit: 6.93478,  lat: 30.6717,  elevsea:2075, elevhoriz:1000, stdz:  6, useDST: 1 },
  { code:'b', name:'Baltimore, MD',                        longit: 5.11111,  lat: 39.18333, elevsea:   0, elevhoriz:   0, stdz:  5, useDST: 1 },
  { code:'d', name:'DAO Victoria BC',                      longit: 8.22778,  lat: 48.52,    elevsea:  74, elevhoriz:  74, stdz:  8, useDST: 1 },
  { code:'m', name:'Mauna Kea',                            longit:10.36478,  lat: 19.8267,  elevsea:4215, elevhoriz:4215, stdz: 10, useDST: 0 },
  { code:'l', name:'Lick Observatory',                     longit: 8.10911,  lat: 37.3433,  elevsea:1290, elevhoriz:1290, stdz:  8, useDST: 1 },
  { code:'r', name:'Roque de los Muchachos',               longit: 1.192,    lat: 28.75833, elevsea:2326, elevhoriz:2326, stdz:  0, useDST: 2 },
  { code:'x', name:'Custom Site',                          longit: 0,        lat:  0,       elevsea:   0, elevhoriz:   0, stdz:  0, useDST: 0 },
];

// ── Helpers ────────────────────────────────────────────────────────
const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function nowToJD() {
  return Date.now() / 86400000.0 + 2440587.5;
}

function horizDeg(site) {
  return Math.sqrt(2 * site.elevhoriz / 6378140) * DEG_IN_RADIAN;
}

function getDSTInfo(jd, site) {
  const cal = caldat(jd);
  const { jdb, jde } = findDSTBounds(cal.y, site.stdz, site.useDST);
  const zone = zoneOffset(site.useDST, site.stdz, jd, jdb, jde);
  return { zone, jdb, jde };
}

function jdToLocalCal(jd, zone) {
  return caldat(jd - zone / 24);
}

// ── Formatting helpers ─────────────────────────────────────────────
function fmtHMS(hrs, decimals) {
  if (decimals === undefined) decimals = 1;
  const neg = hrs < 0;
  const abs = Math.abs(hrs);
  const h = Math.trunc(abs);
  const mf = (abs - h) * 60;
  const m = Math.trunc(mf);
  const s = (mf - m) * 60;
  let ss;
  if (decimals > 0) {
    ss = s.toFixed(decimals).padStart(decimals + 3, '0');
  } else {
    ss = Math.round(s).toString().padStart(2, '0');
  }
  return `${neg ? '&minus;' : ''}${h}<span class="unit">h</span>${String(m).padStart(2,'0')}<span class="unit">m</span>${ss}<span class="unit">s</span>`;
}

function fmtHMSplain(hrs) {
  const neg = hrs < 0;
  const abs = Math.abs(hrs);
  const h = Math.trunc(abs);
  const mf = (abs - h) * 60;
  const m = Math.trunc(mf);
  const s = Math.round((mf - m) * 60);
  return `${neg ? '-' : ''}${h}h${String(m).padStart(2,'0')}m${String(s).padStart(2,'0')}s`;
}

function fmtHA(hrs) {
  const dir = hrs <= 0
    ? '<span class="badge-e">E</span>'
    : '<span class="badge-w">W</span>';
  return fmtHMS(hrs) + ' ' + dir;
}

function fmtDMS(deg, decimals) {
  if (decimals === undefined) decimals = 0;
  const neg = deg < 0;
  const abs = Math.abs(deg);
  const d = Math.trunc(abs);
  const mf = (abs - d) * 60;
  const m = Math.trunc(mf);
  const s = decimals > 0 ? ((mf - m) * 60).toFixed(decimals) : Math.round((mf - m) * 60).toString();
  return `${neg ? '&minus;' : '+'}${d}&deg;${String(m).padStart(2,'0')}&prime;${String(s).padStart(2,'0')}&Prime;`;
}

function fmtDeg(deg, dec) {
  if (dec === undefined) dec = 2;
  return deg.toFixed(dec) + '&deg;';
}

function fmtLocalTime(jd, zone) {
  // Round to the nearest minute, matching skycalc.c's print_time(...,0).
  const c = caldat(jd - zone / 24 + 0.5 / 1440);
  return `${String(c.h).padStart(2,'0')}:${String(c.mn).padStart(2,'0')}`;
}

function fmtLocalTimeSec(jd, zone) {
  const c = caldat(jd - zone / 24);
  return `${String(c.h).padStart(2,'0')}:${String(c.mn).padStart(2,'0')}:${String(Math.round(c.s)).padStart(2,'0')}`;
}

// Sidereal time as HH:MM, rounded to the nearest minute and wrapped to [0,24),
// matching skycalc.c's put_coords(...,0) for the LMST-at-event readouts.
function fmtSidHM(hrs) {
  let m = Math.round(hrs * 60);
  m = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`;
}

function fmtDate(cal) {
  return `${DAYS_SHORT[cal.dow]} ${cal.d} ${MONTHS[cal.mo-1]} ${cal.y}`;
}

// "night of" span, e.g. "Thu 9 → Fri 10 Jul 2026". Month/year on the
// evening side are dropped when they match the morning side.
function fmtNightSpan(eve, morn) {
  let evePart = `${DAYS_SHORT[eve.dow]} ${eve.d}`;
  if (eve.mo !== morn.mo || eve.y !== morn.y) evePart += ` ${MONTHS[eve.mo-1]}`;
  if (eve.y !== morn.y) evePart += ` ${eve.y}`;
  return `${evePart} → ${fmtDate(morn)}`;
}

function fmtFullTime(cal) {
  return `${String(cal.h).padStart(2,'0')}:${String(cal.mn).padStart(2,'0')}:${String(Math.round(cal.s)).padStart(2,'0')}`;
}

function fmtUTTime(jd) {
  // Round to the nearest minute, matching skycalc.c's print_time(...,0).
  const c = caldat(jd + 0.5 / 1440);
  return `${String(c.h).padStart(2,'0')}:${String(c.mn).padStart(2,'0')} UT`;
}

function airmassClass(secz) {
  if (secz <= 0 || secz > 100) return 'poor';
  if (secz < 1.5) return 'excellent';
  if (secz < 2.0) return 'good';
  if (secz < 3.0) return 'marginal';
  return 'poor';
}

function sunClass(alt) {
  if (alt < -18) return 'night';
  if (alt < -12) return 'astro';
  if (alt < -6)  return 'nautical';
  if (alt < 0)   return 'civil';
  return 'day';
}

function sunLabel(alt) {
  if (alt < -18) return 'Night';
  if (alt < -12) return 'Astro twilight';
  if (alt < -6)  return 'Nautical twilight';
  if (alt < 0)   return 'Civil twilight';
  return 'Day';
}

// ── RA / Dec parsing ───────────────────────────────────────────────
function parseRA(str) {
  str = str.trim().replace(/[:\s]+/g, ' ');
  const parts = str.split(' ').filter(Boolean);
  if (parts.length >= 3) return +parts[0] + +parts[1]/60 + +parts[2]/3600;
  if (parts.length === 2) return +parts[0] + +parts[1]/60;
  return parseFloat(str);
}

function parseDec(str) {
  str = str.trim();
  const neg = str.startsWith('-');
  str = str.replace(/^[-+]/, '').replace(/[:\s]+/g, ' ');
  const parts = str.split(' ').filter(Boolean);
  let val;
  if (parts.length >= 3) val = +parts[0] + +parts[1]/60 + +parts[2]/3600;
  else if (parts.length === 2) val = +parts[0] + +parts[1]/60;
  else val = parseFloat(str);
  return neg ? -val : val;
}

// ── Compute Circumstances ──────────────────────────────────────────
function computeCircumstances(state) {
  const { site, jdUT, ra, dec, epoch } = state;
  const jd = jdUT;
  const lmst = lst(jd, site.longit);
  const curEpoch = 2000.0 + (jd - J2000) / 365.25;

  const { zone } = getDSTInfo(jd, site);
  const utCal  = caldat(jd);
  const locCal = jdToLocalCal(jd, zone);

  const prec = precrot(ra, dec, epoch, curEpoch);
  const ha   = adjTime(lmst - prec.ra);
  const { alt, az } = altit(prec.dec, ha, site.lat);
  const secz = secantZ(alt);
  const pa   = parang(ha, prec.dec, site.lat);

  const sun   = accusun(jd, lmst, site.lat);
  const sunHA = adjTime(lmst - sun.topora);
  const { alt: sunAlt } = altit(sun.topodec, sunHA, site.lat);

  const moon   = accumoon(jd, site.lat, lmst, site.elevsea);
  const moonHA = adjTime(lmst - moon.topora);
  const { alt: moonAlt } = altit(moon.topodec, moonHA, site.lat);
  const moonPhase = moonPhaseText(jd);
  // Illuminated fraction from the sun–moon elongation (skycalc.c ill_frac),
  // not the lunar-age approximation.
  const sunMoonSep  = subtend(moon.topora, moon.topodec, sun.topora, sun.topodec);
  const moonIllum   = 0.5 * (1 - Math.cos(sunMoonSep));
  const moonDistRad = subtend(prec.ra, prec.dec, moon.topora, moon.topodec);
  const moonDistDeg = moonDistRad * DEG_IN_RADIAN;
  // Lunar contribution to sky brightness at the object (V mag/arcsec²),
  // Krisciunas & Schaefer 1991 — as skycalc.c prints in print_circumstances.
  // Only meaningful with the moon up, the object well clear of the horizon,
  // and the sun well down (KZEN = 0.172 zenith extinction).
  let moonSky = null;
  if (moonAlt > 0 && alt > 0.5 && sunAlt < -9) {
    const v = lunskybright(sunMoonSep * DEG_IN_RADIAN, moonDistDeg, 0.172,
                           moonAlt, alt, moon.topodist);
    if (v < 90) moonSky = v;   // lunskybright returns 99 when negligible
  }

  const hc  = helcor(jd, prec.ra, prec.dec, ha, site.lat, site.elevsea);
  const bjd = jd + hc.tcor / SEC_IN_DAY;
  const dt  = etcorr(jd);

  const gal = galact(ra, dec, epoch);
  const ecl = eclipt(ra, dec, epoch, jd);

  return {
    jd, lmst, curEpoch, zone,
    utCal, locCal,
    ra, dec, epoch,
    prec,
    ha, alt, az, secz, pa,
    sunAlt,
    moonAlt, moonPhase, moonIllum, moonDistDeg, moonSky,
    hc, bjd, dt,
    gal, ecl
  };
}

// ── Compute Almanac ────────────────────────────────────────────────
function computeAlmanac(state) {
  const { site, jdUT } = state;
  const jd = jdUT;

  const { zone, jdb, jde } = getDSTInfo(jd, site);
  const locCal = jdToLocalCal(jd, zone);

  // Local midnight of the current observing night.
  // "Night date" convention: if local hour < 12 (i.e., we're past midnight), we're still
  // in the previous night — subtract 1 day so midnight refers to the same night.
  let y = locCal.y, mo = locCal.mo, d = locCal.d;
  if (locCal.h < 12) {
    const prevJD = dateToJD(y, mo, d, 0, 0, 0) - 1;  // go back 1 day
    const prev = caldat(prevJD);
    y = prev.y; mo = prev.mo; d = prev.d;
  }
  // JD of local midnight (end of this observing day = d+1 00:00 local)
  const jdMidnightLocal = dateToJD(y, mo, d, 24, 0, 0);
  const jdmid = jdMidnightLocal + zone / 24;

  // Evening (sunset) and morning (sunrise) dates that bound this night.
  const jdEveNoon = dateToJD(y, mo, d, 12, 0, 0);
  const eveCal  = caldat(jdEveNoon);
  const mornCal = caldat(jdEveNoon + 1);

  const horiz = horizDeg(site);
  const lmstMid = lst(jdmid, site.longit);
  const sunMid  = lpsun(jdmid);   // low-precision sun at midnight — seeds the
                                  // event guesses and the illuminated fraction.

  function sunEvt(alt, guess) {
    const r = jdSunAlt(alt, guess, site.lat, site.longit);
    return r < -999 ? null : r;
  }
  function moonEvt(alt, guess) {
    const r = jdMoonAlt(alt, guess, site.lat, site.longit, site.elevsea);
    return r < -999 ? null : r;
  }

  // Sun/twilight events — skycalc.c print_tonight method: seed each iterator
  // from the sun's hour angle at midnight (not a fixed clock offset), then
  // refine. haAlt returns +1000 if the sun stays ABOVE this altitude all night
  // (event never happens — e.g. sun up all night) and −1000 if it never reaches
  // it (e.g. never rises above −18° = full darkness all day).
  function sunEvents(alt) {
    const ha = haAlt(sunMid.dec, site.lat, alt);
    if (ha >  900) return { eve: null, morn: null, alwaysAbove: true };
    if (ha < -900) return { eve: null, morn: null, alwaysBelow: true };
    return {
      eve:  sunEvt(alt, jdmid + adjTime(sunMid.ra + ha - lmstMid) / 24),
      morn: sunEvt(alt, jdmid + adjTime(sunMid.ra - ha - lmstMid) / 24),
    };
  }
  const sset = sunEvents(-0.83 - horiz);
  const t18  = sunEvents(-18);
  const t12  = sunEvents(-12);
  const t6   = sunEvents(-6);
  const jdSunset = sset.eve, jdSunrise = sset.morn;
  const jdEveT18 = t18.eve,  jdMornT18 = t18.morn;
  const jdEveT12 = t12.eve,  jdMornT12 = t12.morn;
  const jdEveT6  = t6.eve,   jdMornT6  = t6.morn;

  // Astronomical dark span (18°→18°), with the polar branches skycalc.c prints.
  let darkHours;
  if      (sset.alwaysAbove)      darkHours = 0;    // sun up all night
  else if (t18.alwaysBelow)       darkHours = 24;   // sun never rises above −18° — dark all day
  else if (t18.alwaysAbove)       darkHours = 0;    // sun never drops below −18°
  else if (jdEveT18 && jdMornT18) darkHours = (jdMornT18 - jdEveT18) * 24;
  else                            darkHours = null;

  // Center of night = midpoint of sunset and sunrise (skycalc.c jdcent).
  const jdNightCenter = (jdSunset && jdSunrise) ? (jdSunset + jdSunrise) / 2 : null;

  // Moon position & illumination at local midnight.
  const moonMid = accumoon(jdmid, site.lat, lmstMid, site.elevsea);
  // Illuminated fraction from the true sun–moon elongation, matching
  // skycalc.c's ill_frac = 0.5*(1 - cos(subtend(moon, sun))).
  const moonIllumMid = 0.5 * (1 - Math.cos(
    subtend(moonMid.topora, moonMid.topodec, sunMid.ra, sunMid.dec)));

  // Moonrise / moonset — skycalc.c print_tonight method: the initial guess
  // comes from the moon's hour angle at midnight (not a fixed ±6 h offset),
  // then the alt iterator refines it at the −(0.83°+horizon) rise/set altitude.
  // An event is only reported if it falls within ~moon_print hours of midnight
  // (0.65× the sun-down span, min 6.5 h), so far-off crossings are suppressed.
  const moonSetAlt = -(0.83 + horiz);
  const { min: moonMinAlt, max: moonMaxAlt } = minMaxAlt(site.lat, moonMid.topodec);
  const haMoon    = haAlt(moonMid.topodec, site.lat, moonSetAlt);
  const tMoonrise = adjTime(moonMid.topora - haMoon - lmstMid);
  const tMoonset  = adjTime(moonMid.topora + haMoon - lmstMid);
  const setToRise = (jdSunset && jdSunrise) ? (jdSunrise - jdSunset) * 24 : 12;
  const moonPrint = Math.abs(setToRise) > 10 ? 0.65 * Math.abs(setToRise) : 6.5;

  let jdMoonrise = null, jdMoonset = null;
  if (moonMaxAlt >= moonSetAlt && moonMinAlt <= moonSetAlt) {
    // Moon does rise and set at this latitude / declination.
    jdMoonrise = moonEvt(moonSetAlt, jdmid + tMoonrise / 24);
    jdMoonset  = moonEvt(moonSetAlt, jdmid + tMoonset  / 24);
  }
  const showMoonrise = jdMoonrise && Math.abs(tMoonrise) < moonPrint;
  const showMoonset  = jdMoonset  && Math.abs(tMoonset)  < moonPrint;

  // Moon-free astronomical dark hours (moon below horizon during 18° dark).
  let moonDarkHours = null;
  if (jdEveT18 && jdMornT18) {
    const darkStart = jdEveT18, darkEnd = jdMornT18;
    let moonUp = 0;
    if (jdMoonset  && jdMoonset  > darkStart && jdMoonset  < darkEnd) moonUp += (jdMoonset  - darkStart) * 24;
    if (jdMoonrise && jdMoonrise > darkStart && jdMoonrise < darkEnd) moonUp += (darkEnd - jdMoonrise) * 24;
    if (moonUp === 0) {
      // No rise/set inside the dark window: moon is up or down the whole night.
      const moonMidHA = adjTime(lmstMid - moonMid.topora);
      const { alt: moonMidAlt } = altit(moonMid.topodec, moonMidHA, site.lat);
      if (moonMidAlt > moonSetAlt) moonUp = darkHours || 0;
    }
    moonDarkHours = Math.max(0, (darkHours || 0) - moonUp);
  }

  function fmt(jd_evt) {
    if (!jd_evt) return { local: '—', ut: '', lmst: '' };
    return {
      local: fmtLocalTime(jd_evt, zone),
      ut:    fmtUTTime(jd_evt),
      lmst:  fmtSidHM(lst(jd_evt, site.longit)),
    };
  }

  return {
    zone,
    jdmid,
    sunset:   fmt(jdSunset),
    sunrise:  fmt(jdSunrise),
    eveT18:   fmt(jdEveT18),
    mornT18:  fmt(jdMornT18),
    eveT12:   fmt(jdEveT12),
    mornT12:  fmt(jdMornT12),
    eveT6:    fmt(jdEveT6),
    mornT6:   fmt(jdMornT6),
    nightCenter: fmt(jdNightCenter),
    moonrise: fmt(showMoonrise ? jdMoonrise : null),
    moonset:  fmt(showMoonset  ? jdMoonset  : null),
    darkHours,
    moonDarkHours,
    moonIllumMid,
    moonPhaseMid: moonPhaseText(jdmid),
    lmstMid,
    locDate: fmtDate(locCal),
    nightSpan: fmtNightSpan(eveCal, mornCal),
  };
}

// ── Compute Planets ────────────────────────────────────────────────
function computePlanets(state) {
  const { site, jdUT } = state;
  const jd  = jdUT;
  const sid = lst(jd, site.longit);

  const sun   = accusun(jd, sid, site.lat);
  const sunHA = adjTime(sid - sun.topora);
  const sunAz = altit(sun.topodec, sunHA, site.lat);

  const moon   = accumoon(jd, site.lat, sid, site.elevsea);
  const moonHA = adjTime(sid - moon.topora);
  const moonAz = altit(moon.topodec, moonHA, site.lat);

  const planets = pposns(jd, site.lat, sid);
  const PNAMES  = ['Mercury','Venus',null,'Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];

  const rows = [];
  rows.push({ name:'Sun',  ra:sun.topora,  dec:sun.topodec,  ha:sunHA,  alt:sunAz.alt,  az:sunAz.az,  secz:secantZ(sunAz.alt),  type:'sun' });
  rows.push({ name:'Moon', ra:moon.topora, dec:moon.topodec, ha:moonHA, alt:moonAz.alt, az:moonAz.az, secz:secantZ(moonAz.alt), type:'moon' });

  for (let i = 0; i < 9; i++) {
    if (!planets[i]) continue;
    const p  = planets[i];
    const ha = adjTime(sid - p.ra);
    const { alt, az } = altit(p.dec, ha, site.lat);
    rows.push({ name: PNAMES[i], ra: p.ra, dec: p.dec, ha, alt, az, secz: secantZ(alt), type:'planet' });
  }
  return rows;
}

// ── Compute Hourly ─────────────────────────────────────────────────
function computeHourly(state) {
  const { site, jdUT, ra, dec, epoch } = state;
  const jd = jdUT;

  const { zone } = getDSTInfo(jd, site);
  const locCal = jdToLocalCal(jd, zone);
  let y = locCal.y, mo = locCal.mo, d = locCal.d;
  if (locCal.h < 12) { const p = caldat(dateToJD(y,mo,d,0,0,0)-1); y=p.y; mo=p.mo; d=p.d; }
  const jdMidnightLocal = dateToJD(y, mo, d, 24, 0, 0);
  const jdmid = jdMidnightLocal + zone / 24;

  const curEpoch = 2000.0 + (jdmid - J2000) / 365.25;
  const prec = precrot(ra, dec, epoch, curEpoch);

  // Time lattice — skycalc.c hourly_airmass: center on the middle of the night
  // (jdcent = midpoint of sunset & sunrise, snapped to the nearest UT hour) and
  // span ±hrSpan hours (half the sunset→sunrise length), rather than clock
  // midnight ±13 h. Rows with the sun above the horizon are skipped.
  const sunMid = lpsun(jdmid);
  const hasset = haAlt(sunMid.dec, site.lat, -0.83);
  let jdcent, hrSpan;
  if (hasset > 900 || hasset < -900) {
    jdcent = jdmid; hrSpan = 12;              // sun never sets / never rises
  } else {
    const jdsset  = jdSunAlt(-0.83, jdmid - (12 - hasset) / 24, site.lat, site.longit);
    const jdsrise = jdSunAlt(-0.83, jdmid + (12 - hasset) / 24, site.lat, site.longit);
    hrSpan = Math.round(12 * (jdsrise - jdsset));
    jdcent = Math.round(24 * (jdsset + jdsrise) / 2) / 24 + 0.00001;  // snap to UT hour
  }

  const rows = [];
  for (let i = -hrSpan; i <= hrSpan; i++) {
    const jdt  = jdcent + i / 24;
    const sid  = lst(jdt, site.longit);
    const ha   = adjTime(sid - prec.ra);
    const { alt, az } = altit(prec.dec, ha, site.lat);
    const secz = secantZ(alt);
    const pa   = parang(ha, prec.dec, site.lat);

    const sun   = accusun(jdt, sid, site.lat);
    const sunHA = adjTime(sid - sun.topora);
    const { alt: sunAlt } = altit(sun.topodec, sunHA, site.lat);

    if (sunAlt > 0) continue;  // skip rows with the sun above the horizon (skycalc.c)

    const moon   = accumoon(jdt, site.lat, sid, site.elevsea);
    const moonHA = adjTime(sid - moon.topora);
    const { alt: moonAlt } = altit(moon.topodec, moonHA, site.lat);

    rows.push({
      jdt, dh: i,
      localTime: fmtLocalTime(jdt, zone),
      localDate: fmtDate(caldat(jdt - zone/24)),
      ha, alt, az, secz, pa,
      sunAlt,
      moonAlt,
    });
  }
  return rows;
}

// ── Compute Observability ──────────────────────────────────────────
// hrs_up (skycalc.c): hours an object is up AND it's dark, given the JDs it
// rises past / sets below a target altitude (jdup/jddown, the crossings around
// the transit nearest midnight) and the evening/morning twilight JDs. Handles
// circumpolar objects that come back up a second time before morning.
function hrsUp(jdup, jddown, jdeve, jdmorn) {
  const SID_RATE = 1.0027379093;
  if (jdup < jdeve) {
    if (jddown >= jdmorn) return (jdmorn - jdeve) * 24;          // up all night
    if (jddown >= jdeve) {
      const jdup2 = jdup + 1.0 / SID_RATE;
      return (jdup2 > jdmorn) ? (jddown - jdeve) * 24
                              : ((jddown - jdeve) + (jdmorn - jdup2)) * 24;
    }
    return 0;
  }
  if (jddown > jdmorn) {
    if (jdup >= jdmorn) return 0;
    const jddown0 = jddown - 1.0 / SID_RATE;
    return (jddown0 < jdeve) ? (jdmorn - jdup) * 24
                             : ((jddown0 - jdeve) + (jdmorn - jdup)) * 24;
  }
  return (jddown - jdup) * 24;   // up & down the same night
}

// Faithful port of skycalc.c's obs_season: tabulates observability at each new
// and full moon between startJD and endJD. Each row is the night whose LOCAL
// MIDNIGHT (longitude-based, no DST) is nearest that lunar phase; HA and sec z
// are given at evening twilight, the sun's lower culmination (the natural
// centre of night), and morning twilight; then the number of dark hours the
// object spends below sec z 3, 2 and 1.5 (analytic, via hrsUp).
function computeObservability(state, startJD, endJD, sunAltDeg) {
  const { site, ra, dec, epoch } = state;
  const lon = site.longit, lat = site.lat;
  const ALT_3 = 19.47, ALT_2 = 30.0, ALT_15 = 41.81, SID_RATE = 1.0027379093;

  // Object precessed to the middle of the requested range (used for all rows),
  // and the phase counter seeded at the last new moon at/before the start.
  const la0 = lunAge(startJD);
  let nlun = la0.nlun;
  let jd = startJD - la0.age;
  let nph = 0;

  const curEpoch = 2000.0 + ((jd + endJD) / 2 - J2000) / 365.25;
  const prec = precrot(ra, dec, epoch, curEpoch);
  const { min: minAlt, max: maxAlt } = minMaxAlt(lat, prec.dec);

  function objAt(jdt) {
    const ha = adjTime(lst(jdt, lon) - prec.ra);
    const { alt } = altit(prec.dec, ha, lat);
    return { ha, secz: secantZ(alt), alt };
  }

  const results = [];
  let guard = 0;
  while (jd <= endJD && guard++ < 500) {
    if (nph === 0) nph = 2;
    else if (nph === 2) { nlun++; nph = 0; }
    jd = flmoon(nlun, nph);

    // Local midnight nearest the phase instant (longitude-based, no DST).
    const midnfrac = 0.5 + lon / 24;
    let jdmid = Math.trunc(jd) + midnfrac;
    if (jd - jdmid > 0.5) jdmid += 1;
    else if (jd - jdmid < -0.5) jdmid -= 1;

    // Sun's lower culmination = natural centre of night.
    const sun = lpsun(jdmid);
    const hasun = adjTime(lst(jdmid, lon) - sun.ra);
    const jdcent = hasun > 0 ? jdmid + (12 - hasun) / 24 : jdmid - (hasun + 12) / 24;

    // Evening / morning twilight at the chosen sun altitude.
    const hatwi = haAlt(sun.dec, lat, sunAltDeg);
    let jdeve = null, jdmorn = null;
    if (hatwi > 100) { /* no twilight — sun never reaches that altitude */ }
    else if (hatwi < -100) { jdeve = jdcent - 0.5; jdmorn = jdcent + 0.5; } // dark all day
    else {
      jdeve  = jdSunAlt(sunAltDeg, jdcent - (12 - hatwi) / 24, lat, lon);
      jdmorn = jdSunAlt(sunAltDeg, jdcent + (12 - hatwi) / 24, lat, lon);
    }

    const eve  = jdeve  ? objAt(jdeve)  : null;
    const ctr  = objAt(jdcent);
    const morn = jdmorn ? objAt(jdmorn) : null;

    // Dark hours below sec z 3 / 2 / 1.5 via the analytic hrsUp crossing.
    const jdtrans = jdcent - ctr.ha / (SID_RATE * 24);   // transit nearest midnight
    function hoursAt(altLimit) {
      if (!jdeve) return 0;                               // twilight all night / never
      if (minAlt < altLimit && maxAlt > altLimit) {
        const dt = haAlt(prec.dec, lat, altLimit) / (SID_RATE * 24);
        return hrsUp(jdtrans - dt, jdtrans + dt, jdeve, jdmorn);
      }
      return (minAlt > altLimit) ? 24 * (jdmorn - jdeve) : 0;
    }

    // Evening date (skycalc.c: jdcent - longit/24 - 0.25).
    const eveCal = caldat(jdcent - lon / 24 - 0.25);

    results.push({
      jdPhase: jd,
      phase:   nph === 0 ? 'N' : 'F',
      dateStr: fmtDate(eveCal),
      eve, ctr, morn,
      hrs3:   hoursAt(ALT_3).toFixed(1),
      hrs2:   hoursAt(ALT_2).toFixed(1),
      hrs1p5: hoursAt(ALT_15).toFixed(1),
    });
  }
  return results;
}
