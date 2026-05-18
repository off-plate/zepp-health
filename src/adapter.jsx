// Real-data adapter: fetches from Supabase and exposes the globals the design expects:
//   wellness, todayW, workouts, lastNight, hrZones, streaks, awards, calendarData
//
// Where real data isn't available (HRV, readiness, sleep stages, GPS, time-in-zones),
// we synthesize reasonable values from related fields so the design degrades gracefully.

// SUPABASE_URL and SUPABASE_KEY are declared in auth.jsx, which is concatenated before this file.

const ACCENT_BY_TYPE = {
  run: 'var(--cardio)', running: 'var(--cardio)',
  ride: 'var(--train)', cycling: 'var(--train)', bike: 'var(--train)',
  swim: 'var(--recovery)', swimming: 'var(--recovery)',
  walk: 'var(--steps)', walking: 'var(--steps)', hike: 'var(--train)',
  strength: 'var(--sleep)', weight: 'var(--sleep)', weighttraining: 'var(--sleep)',
  yoga: 'var(--steps)', stretch: 'var(--steps)',
  workout: 'var(--cardio)', default: 'var(--cardio)'
};

function normalizeType(t) {
  if (!t) return 'workout';
  const s = t.toLowerCase().replace(/\s+/g, '');
  if (s.includes('run')) return 'run';
  if (s.includes('ride') || s.includes('bike') || s.includes('cycl')) return 'ride';
  if (s.includes('swim')) return 'swim';
  if (s.includes('walk')) return 'walk';
  if (s.includes('hike')) return 'hike';
  if (s.includes('strength') || s.includes('weight')) return 'strength';
  if (s.includes('yoga') || s.includes('stretch')) return 'yoga';
  return 'workout';
}

function mapWellness(rows) {
  return rows.map(r => ({
    date: new Date(r.day + 'T00:00:00'),
    steps: r.steps ?? null,
    sleepSeconds: r.sleep_secs ?? null,
    sleepScore: r.sleep_score ?? null,
    sleepQuality: r.sleep_quality ?? null,
    rhr: r.resting_hr ?? null,
    hrv: null,
    readiness: null,
    weight: r.weight ?? null,
    bodyFat: null,
    ctl: r.ctl ?? 0,
    atl: r.atl ?? 0,
    tsb: (r.ctl ?? 0) - (r.atl ?? 0),
    rampRate: r.ramp_rate ?? 0,
    spo2: null,
    stress: null,
    _raw: r.raw || null
  }));
}

// Fill missing days in [start, end] with null-valued rows so charts stay continuous.
function fillDaily(rows, days) {
  const byDay = new Map(rows.map(r => [r.day.toISOString().slice(0, 10), r]));
  const out = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const r = byDay.get(key);
    const last = out[out.length - 1];
    if (r) {
      // Forward-fill any missing fields within the row from last known.
      out.push({
        ...r, date: d,
        rhr: r.rhr ?? (last ? last.rhr : null),
        sleepSeconds: r.sleepSeconds ?? (last ? last.sleepSeconds : null),
        sleepScore: r.sleepScore ?? (last ? last.sleepScore : null),
        weight: r.weight ?? (last ? last.weight : null),
      });
    } else {
      out.push({
        date: d,
        steps: 0,
        sleepSeconds: last ? last.sleepSeconds : 0,
        sleepScore: last ? last.sleepScore : 0,
        sleepQuality: last ? last.sleepQuality : null,
        rhr: last ? last.rhr : 0,
        hrv: null, readiness: null,
        weight: last ? last.weight : 0,
        bodyFat: null,
        ctl: last ? last.ctl : 0,
        atl: last ? last.atl : 0,
        tsb: last ? last.tsb : 0,
        rampRate: 0,
        spo2: null, stress: null,
        _filled: true
      });
    }
  }
  return out;
}

// Synthesize 5-zone time distribution from avg/max HR + duration.
function synthZones(avgHr, maxHr, durationMin) {
  if (!avgHr || !durationMin) return [0, 0, 0, 0, 0];
  // Rough Coggan-style buckets centered on avg HR.
  const z1 = durationMin * 0.18;
  const z2 = durationMin * 0.36;
  const z3 = durationMin * 0.22;
  const z4 = durationMin * 0.16;
  const z5 = durationMin * 0.08;
  return [z1, z2, z3, z4, z5].map(v => Math.round(v));
}

// Synthesize a 32-bucket intensity heatbar (0-100) from a constant-ish intensity.
function synthHeat(load) {
  const base = Math.min(100, Math.max(20, (load || 50)));
  const arr = [];
  for (let i = 0; i < 32; i++) {
    const noise = Math.sin(i * 0.7) * 12 + Math.cos(i * 1.3) * 8;
    arr.push(Math.round(Math.max(8, Math.min(100, base + noise))));
  }
  return arr;
}

function mapActivity(r) {
  const type = normalizeType(r.type || r.sub_type);
  const durationSec = r.moving_time || r.elapsed_time || 0;
  const durationMin = Math.round(durationSec / 60);
  const distanceKm = r.distance ? r.distance / 1000 : 0;
  const intensity = r.icu_training_load ? Math.min(10, Math.max(1, Math.round(r.icu_training_load / 12))) : 4;
  return {
    id: r.id,
    type,
    sub_type: r.sub_type,
    name: r.name || (type.charAt(0).toUpperCase() + type.slice(1)),
    description: r.description,
    accent: ACCENT_BY_TYPE[type] || ACCENT_BY_TYPE.default,
    date: new Date(r.start_date_local || r.start_date),
    duration: durationMin,
    distance: distanceKm,
    elevation: Math.round(r.total_elevation_gain || 0),
    avgHr: r.average_heartrate ? Math.round(r.average_heartrate) : null,
    maxHr: r.max_heartrate ? Math.round(r.max_heartrate) : null,
    avgCadence: r.average_cadence ? Math.round(r.average_cadence) : null,
    cal: r.calories ? Math.round(r.calories) : null,
    trimp: r.trimp ? Math.round(r.trimp) : null,
    load: r.icu_training_load ? Math.round(r.icu_training_load) : null,
    intensity,
    device: r.device_name,
    zones: synthZones(r.average_heartrate, r.max_heartrate, durationMin),
    heat: synthHeat(r.icu_training_load),
    routePath: null,
    _raw: r.raw || null
  };
}

// Build "last night" object from latest wellness row that has sleep data.
function buildLastNight(wellnessRows) {
  const withSleep = [...wellnessRows].reverse().find(d => d.sleepSeconds);
  if (!withSleep) {
    return {
      bedAt: '—', wakeAt: '—', totalSec: 0, score: 0, quality: '—',
      stages: [], totals: { deep: 0, rem: 0, light: 0, awake: 0 }
    };
  }
  const totalMin = Math.round(withSleep.sleepSeconds / 60);
  // No granular stage data — approximate distribution from total + score.
  const goodness = (withSleep.sleepScore || 70) / 100;
  const deep = Math.round(totalMin * (0.14 + goodness * 0.08));
  const rem = Math.round(totalMin * (0.18 + goodness * 0.08));
  const awake = Math.round(totalMin * (0.02 + (1 - goodness) * 0.04));
  const light = Math.max(0, totalMin - deep - rem - awake);
  const qualityLabels = ['Poor', 'Restless', 'OK', 'Good', 'Restful', 'Excellent'];
  const quality = qualityLabels[Math.min(5, Math.max(0, withSleep.sleepQuality || 3))];
  // Synthetic bed/wake times based on default 23:30 bedtime + duration
  const bedHour = 23, bedMin = 30;
  const wakeMins = (bedHour * 60 + bedMin + totalMin) % (24 * 60);
  const wakeAt = `${String(Math.floor(wakeMins / 60)).padStart(2, '0')}:${String(wakeMins % 60).padStart(2, '0')}`;
  // Synthetic hypnogram from totals
  const stages = synthHypnogram({ deep, rem, light, awake }, totalMin);
  return {
    bedAt: `${String(bedHour).padStart(2,'0')}:${String(bedMin).padStart(2,'0')}`,
    wakeAt,
    totalSec: withSleep.sleepSeconds,
    score: Math.round(withSleep.sleepScore || 0),
    quality,
    stages,
    totals: { deep, rem, light, awake }
  };
}

function synthHypnogram(totals, totalMin) {
  // Walk through a rough 90-min cycle structure.
  const stages = [];
  let t = 0;
  let cycle = 0;
  while (t < totalMin) {
    const cycleEnd = Math.min(totalMin, t + 90);
    if (cycle === 0) stages.push(['awake', t, 4]);
    stages.push(['light', t + (cycle === 0 ? 4 : 0), 18]);
    stages.push(['deep', t + 22, 28]);
    stages.push(['light', t + 50, 18]);
    stages.push(['rem', t + 68, Math.min(22, cycleEnd - (t + 68))]);
    t = cycleEnd;
    cycle++;
  }
  return stages.filter(s => s[2] > 0);
}

// Build HR-zone summary for "today" from the latest workout that has HR data.
function buildHrZones(activities) {
  const latest = activities.find(a => a.avgHr);
  if (!latest) {
    return [
      { name: 'Z1', label: 'Recovery', mins: 0, color: 'var(--recovery)', range: '< 122' },
      { name: 'Z2', label: 'Endurance', mins: 0, color: 'var(--steps)', range: '122–145' },
      { name: 'Z3', label: 'Tempo', mins: 0, color: 'var(--train)', range: '146–162' },
      { name: 'Z4', label: 'Threshold', mins: 0, color: 'var(--cardio-soft)', range: '163–175' },
      { name: 'Z5', label: 'VO₂', mins: 0, color: 'var(--cardio)', range: '176+' },
    ];
  }
  const [z1, z2, z3, z4, z5] = latest.zones;
  return [
    { name: 'Z1', label: 'Recovery', mins: z1, color: 'var(--recovery)', range: '< 122 bpm' },
    { name: 'Z2', label: 'Endurance', mins: z2, color: 'var(--steps)', range: '122–145' },
    { name: 'Z3', label: 'Tempo', mins: z3, color: 'var(--train)', range: '146–162' },
    { name: 'Z4', label: 'Threshold', mins: z4, color: 'var(--cardio-soft)', range: '163–175' },
    { name: 'Z5', label: 'VO₂', mins: z5, color: 'var(--cardio)', range: '176+' },
  ];
}

// Compute active streaks from real data.
function buildStreaks(wellness, activities) {
  // 1) Workout streak: consecutive days with at least one workout ending in last-active-day
  const activeDays = new Set(activities.map(a => a.date.toISOString().slice(0, 10)));
  function streakBack(predicate) {
    let n = 0;
    const d = new Date(); d.setHours(0, 0, 0, 0);
    while (predicate(d)) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const workoutStreak = streakBack(d => activeDays.has(d.toISOString().slice(0, 10)));
  // 2) Sleep streak: consecutive days with sleep > 7h
  const sleepyDays = new Set(wellness.filter(w => w.sleepSeconds && w.sleepSeconds > 7 * 3600).map(w => w.date.toISOString().slice(0, 10)));
  const sleepStreak = streakBack(d => sleepyDays.has(d.toISOString().slice(0, 10)));
  // 3) Step streak: consecutive days with > 8000 steps
  const stepDays = new Set(wellness.filter(w => w.steps && w.steps >= 8000).map(w => w.date.toISOString().slice(0, 10)));
  const stepStreak = streakBack(d => stepDays.has(d.toISOString().slice(0, 10)));
  // Longest historical computed quickly
  function longest(set, days = 365) {
    let max = 0, cur = 0;
    const d = new Date(); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const k = d.toISOString().slice(0, 10);
      if (set.has(k)) { cur++; max = Math.max(max, cur); } else cur = 0;
      d.setDate(d.getDate() - 1);
    }
    return max;
  }
  return [
    { name: 'Workout streak', meta: `longest ${longest(activeDays)}d`, count: workoutStreak, unit: 'days' },
    { name: 'Sleep > 7h', meta: `longest ${longest(sleepyDays)}d`, count: sleepStreak, unit: 'nights' },
    { name: '8k+ steps', meta: `longest ${longest(stepDays)}d`, count: stepStreak, unit: 'days' },
  ];
}

// Award progress from real data. Currently catalogs basic real-data-derivable awards.
function buildAwards(wellness, activities) {
  const totalActivities = activities.length;
  const runActivities = activities.filter(a => a.type === 'run');
  const totalRunKm = runActivities.reduce((s, a) => s + a.distance, 0);
  const totalSteps = wellness.reduce((s, w) => s + (w.steps || 0), 0);
  const totalElevation = activities.reduce((s, a) => s + (a.elevation || 0), 0);

  const earlyMornings = activities.filter(a => a.date.getHours() < 7).length;
  const lateNights = activities.filter(a => a.date.getHours() >= 21).length;

  // RHR baseline = avg of first 14 days with data; current = avg of last 7
  const rhrAll = wellness.filter(w => w.rhr).map(w => w.rhr);
  const baseline = rhrAll.slice(0, 14).reduce((a, b) => a + b, 0) / Math.max(1, rhrAll.slice(0, 14).length);
  const recent = rhrAll.slice(-7).reduce((a, b) => a + b, 0) / Math.max(1, rhrAll.slice(-7).length);
  const rhrDrop = Math.max(0, baseline - recent);

  const def = (id, name, cat, tier, accent, badge, current, goal, narrative) => ({
    id, name, cat, tier, accent, badge,
    unlocked: current >= goal, progress: Math.min(1, current / goal),
    earned: current >= goal ? 'Earned' : null, narrative
  });

  return [
    def('streak7', '7-Day Streak', 'Streaks', 'Bronze', 'var(--train)', 'flame', activities.length, 7, 'Seven days of workouts.'),
    def('streak30', '30-Day Streak', 'Streaks', 'Silver', 'var(--train)', 'flame', activities.length, 30, 'Thirty days of consistent training.'),
    def('streak100', '100-Day Streak', 'Streaks', 'Gold', 'var(--train)', 'flame', activities.length, 100, 'One hundred workouts.'),

    def('steps100k', '100k Steps', 'Volume', 'Bronze', 'var(--steps)', 'mountain', totalSteps, 100000, '100,000 steps logged.'),
    def('steps1m', '1M Steps', 'Volume', 'Gold', 'var(--steps)', 'mountain', totalSteps, 1000000, '1 million steps lifetime.'),
    def('run100', '100 km Run', 'Volume', 'Bronze', 'var(--cardio)', 'shoe', totalRunKm, 100, '100 kilometers covered on foot.'),
    def('run1000', '1000 km Run', 'Volume', 'Gold', 'var(--cardio)', 'shoe', totalRunKm, 1000, '1000 kilometers covered on foot.'),
    def('everest', 'Everested', 'Volume', 'Platinum', 'var(--recovery)', 'peak', totalElevation, 8848, 'Climbed the height of Everest.'),
    def('wo10', '10 Workouts', 'Volume', 'Bronze', 'var(--sleep)', 'medal', totalActivities, 10, '10 sessions logged.'),
    def('wo100', '100 Workouts', 'Volume', 'Silver', 'var(--sleep)', 'medal', totalActivities, 100, '100 sessions logged.'),

    def('earlybird', 'Early Bird', 'Habits', 'Silver', 'var(--train)', 'sun', earlyMornings, 10, '10 workouts before 7am.'),
    def('nightowl', 'Night Owl', 'Habits', 'Bronze', 'var(--sleep)', 'moon', lateNights, 10, '10 workouts after 9pm.'),

    def('rhr5', 'RHR −5 bpm', 'Recovery', 'Bronze', 'var(--recovery)', 'heart', rhrDrop, 5, 'Resting heart rate down 5 bpm from baseline.'),
    def('rhr10', 'RHR −10 bpm', 'Recovery', 'Gold', 'var(--recovery)', 'heart', rhrDrop, 10, 'Resting heart rate down 10 bpm from baseline.'),
  ];
}

// 365-day calendar heatmap (level 0..5 based on workout intensity for that day)
function buildCalendar(activities) {
  const byDay = new Map();
  activities.forEach(a => {
    const k = a.date.toISOString().slice(0, 10);
    byDay.set(k, Math.max(byDay.get(k) || 0, a.load || a.intensity * 10));
  });
  const out = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    const v = byDay.get(k) || 0;
    let level = 0;
    if (v > 80) level = 5;
    else if (v > 60) level = 4;
    else if (v > 40) level = 3;
    else if (v > 20) level = 2;
    else if (v > 0) level = 1;
    out.push({ date: d, level });
  }
  return out;
}

async function loadAllData(session) {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + session.access_token
  };
  const oldest = new Date(); oldest.setDate(oldest.getDate() - 365);
  const oldestDate = oldest.toISOString().slice(0, 10);
  const oldestTS = oldest.toISOString();

  const [wRes, aRes, lRes] = await Promise.all([
    fetch(SUPABASE_URL + `/rest/v1/zepp_wellness?select=*&day=gte.${oldestDate}&order=day.asc&limit=400`, { headers }),
    fetch(SUPABASE_URL + `/rest/v1/zepp_activities?select=*&start_date=gte.${oldestTS}&order=start_date.desc&limit=500`, { headers }),
    fetch(SUPABASE_URL + `/rest/v1/zepp_sync_log?select=*&order=ran_at.desc&limit=1`, { headers })
  ]);
  if (!wRes.ok || !aRes.ok) throw new Error('Data fetch failed: ' + wRes.status + '/' + aRes.status);

  const wRaw = await wRes.json();
  const aRaw = await aRes.json();
  const lRaw = await lRes.json();

  const wellnessMapped = mapWellness(wRaw);
  // Fill missing days for the last 90 days so charts are continuous; older stays sparse.
  const last90 = fillDaily(wellnessMapped, 90);
  const wellness = last90;
  const todayW = wellness[wellness.length - 1] || {
    date: new Date(), steps: 0, sleepSeconds: 0, sleepScore: 0, rhr: 0,
    weight: 0, ctl: 0, atl: 0, tsb: 0, rampRate: 0,
    hrv: null, readiness: null, bodyFat: null, spo2: null, stress: null
  };
  // Synthesize readiness from sleep score + RHR delta so the gauge renders.
  if (todayW.readiness == null) {
    const sleepFactor = todayW.sleepScore ? todayW.sleepScore : 75;
    todayW.readiness = Math.round(Math.max(20, Math.min(100, sleepFactor * 0.7 + 30 - (todayW.tsb < 0 ? 10 : 0))));
  }
  // HRV placeholder so charts don't crash; replace when real data arrives.
  if (todayW.hrv == null) todayW.hrv = 0;
  const workouts = aRaw.map(mapActivity);
  const lastNight = buildLastNight(wellness);
  const hrZones = buildHrZones(workouts);
  const streaks = buildStreaks(wellness, workouts);
  const awards = buildAwards(wellness, workouts);
  const calendarData = buildCalendar(workouts);

  const lastSync = lRaw && lRaw[0] ? new Date(lRaw[0].ran_at) : null;

  // Expose globals matching the design's expected shape.
  Object.assign(window, {
    wellness, todayW, workouts, lastNight, hrZones, streaks, awards, calendarData,
    zhLastSync: lastSync
  });
}

window.ZH_ADAPTER = { loadAllData };
