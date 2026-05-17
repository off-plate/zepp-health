// Zepp Health sync worker.
// Pulls wellness + activities from Intervals.icu and upserts into Supabase.
// Runs as a GH Actions cron. Uses service role to bypass RLS for inserts.

import { createClient } from '@supabase/supabase-js';

const {
  INTERVALS_API_KEY,
  INTERVALS_ATHLETE_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  USER_EMAIL = 'mihael.florian@gmail.com',
  LOOKBACK_DAYS = '30',
} = process.env;

if (!INTERVALS_API_KEY || !INTERVALS_ATHLETE_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required env vars');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const intervalsAuth = 'Basic ' + Buffer.from('API_KEY:' + INTERVALS_API_KEY).toString('base64');

function ymd(d) { return d.toISOString().slice(0, 10); }

async function getUserId(email) {
  // Find the auth user_id by email. Service role can read auth.users via admin.
  const { data, error } = await sb.auth.admin.listUsers();
  if (error) throw error;
  const user = data.users.find(u => u.email === email);
  if (!user) throw new Error('No auth user for ' + email + '. Sign in once on the site first.');
  return user.id;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Authorization: intervalsAuth } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function syncWellness(userId, days) {
  const newest = new Date();
  const oldest = new Date(); oldest.setDate(oldest.getDate() - days);
  const url = `https://intervals.icu/api/v1/athlete/${INTERVALS_ATHLETE_ID}/wellness?oldest=${ymd(oldest)}&newest=${ymd(newest)}`;
  const rows = await fetchJson(url);

  const mapped = rows.map(r => ({
    user_id: userId,
    day: r.id,
    resting_hr: r.restingHR ?? null,
    sleep_secs: r.sleepSecs ?? null,
    sleep_score: r.sleepScore ?? null,
    sleep_quality: r.sleepQuality ?? null,
    steps: r.steps ?? null,
    weight: r.weight ?? null,
    ctl: r.ctl ?? null,
    atl: r.atl ?? null,
    atl_load: r.atlLoad ?? null,
    ctl_load: r.ctlLoad ?? null,
    ramp_rate: r.rampRate ?? null,
    raw: r,
    updated_at: new Date().toISOString(),
  }));

  if (mapped.length === 0) return 0;
  const { error } = await sb.from('zepp_wellness').upsert(mapped, { onConflict: 'user_id,day' });
  if (error) throw error;
  return mapped.length;
}

async function syncActivities(userId, days) {
  const newest = new Date();
  const oldest = new Date(); oldest.setDate(oldest.getDate() - days);
  const url = `https://intervals.icu/api/v1/athlete/${INTERVALS_ATHLETE_ID}/activities?oldest=${ymd(oldest)}&newest=${ymd(newest)}`;
  const rows = await fetchJson(url);

  const mapped = rows.map(r => ({
    id: r.id,
    user_id: userId,
    start_date: r.start_date,
    start_date_local: r.start_date_local,
    type: r.type,
    sub_type: r.sub_type,
    name: r.name,
    description: r.description,
    device_name: r.device_name,
    moving_time: r.moving_time,
    elapsed_time: r.elapsed_time,
    distance: r.distance,
    total_elevation_gain: r.total_elevation_gain,
    average_speed: r.average_speed,
    max_speed: r.max_speed,
    average_heartrate: r.average_heartrate,
    max_heartrate: r.max_heartrate,
    average_cadence: r.average_cadence,
    calories: r.calories,
    trimp: r.trimp,
    icu_training_load: r.icu_training_load,
    has_heartrate: r.has_heartrate,
    raw: r,
    updated_at: new Date().toISOString(),
  }));

  if (mapped.length === 0) return 0;
  const { error } = await sb.from('zepp_activities').upsert(mapped, { onConflict: 'id' });
  if (error) throw error;
  return mapped.length;
}

async function logSync(ok, wellnessRows, activityRows, error) {
  await sb.from('zepp_sync_log').insert({
    ok, wellness_rows: wellnessRows, activity_rows: activityRows,
    error: error ? String(error).slice(0, 1000) : null
  });
}

async function main() {
  const days = parseInt(LOOKBACK_DAYS, 10);
  console.log(`Sync starting (lookback ${days} days)…`);
  try {
    const userId = await getUserId(USER_EMAIL);
    console.log('User:', USER_EMAIL, '→', userId);

    const wellnessCount = await syncWellness(userId, days);
    console.log(`Wellness upserted: ${wellnessCount}`);

    const activityCount = await syncActivities(userId, days);
    console.log(`Activities upserted: ${activityCount}`);

    await logSync(true, wellnessCount, activityCount, null);
    console.log('OK');
  } catch (err) {
    console.error('Sync failed:', err);
    await logSync(false, 0, 0, err.message || String(err));
    process.exit(1);
  }
}

main();
