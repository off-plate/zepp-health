// Supabase client + session management for Zepp Health.
// We DON'T trust the SDK's onAuthStateChange listener (it silently fails to fire).
// Instead we manage session manually: tokens stored in localStorage, used in fetch Authorization headers.

const SUPABASE_URL = 'https://fhfempisopwsdkmvywbt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MDxQPm0SzLHFTnDqg-eyyQ_0yposnES';
const SESSION_KEY = 'zh-session-v1';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const listeners = new Set();
let state = { wellness: [], activities: [], lastSync: null, session: null, loading: true, error: null };

function emit() { listeners.forEach(fn => fn()); }
function useStore() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const fn = () => force();
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return state;
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.access_token || !s.user) return null;
    // Optional: check expires_at
    if (s.expires_at && s.expires_at * 1000 < Date.now()) {
      console.log('[ZH] stored session expired');
      // We could refresh here; for now treat as logged out.
      // (Refresh attempt happens lazily on next data pull failure.)
    }
    return s;
  } catch (e) { return null; }
}
function saveSession(s) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

async function refreshSession() {
  if (!state.session || !state.session.refresh_token) return null;
  console.log('[ZH] refreshing session…');
  const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: state.session.refresh_token })
  });
  if (!res.ok) {
    console.warn('[ZH] refresh failed', res.status);
    return null;
  }
  const data = await res.json();
  const next = sessionFromTokenResponse(data);
  state.session = next;
  saveSession(next);
  emit();
  return next;
}

function sessionFromTokenResponse(data) {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: data.user
  };
}

function initAuth() {
  console.log('[ZH] initAuth start');
  const stored = loadSession();
  state.session = stored;
  state.loading = false;
  emit();
  if (stored) {
    console.log('[ZH] session restored for', stored.user.email);
    pullAll();
  } else {
    console.log('[ZH] no stored session');
  }
}

async function signInWithPassword(email, password) {
  console.log('[ZH] signIn start');
  const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || json.msg || ('Sign in failed (' + res.status + ')'));
  }
  state.session = sessionFromTokenResponse(json);
  saveSession(state.session);
  console.log('[ZH] signed in as', state.session.user.email);
  emit();
  pullAll();
}

async function signIn(email) {
  // Magic link path — keep for completeness, redirect targets zepp-health.
  const redirectTo = window.location.origin + window.location.pathname;
  const res = await fetch(SUPABASE_URL + '/auth/v1/otp', {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, options: { email_redirect_to: redirectTo } })
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error_description || json.msg || ('Magic link failed (' + res.status + ')'));
  }
}

async function signOut() {
  clearSession();
  state.session = null;
  state.wellness = [];
  state.activities = [];
  emit();
}

async function pullAll() {
  console.log('[ZH] pullAll start');
  if (!state.session) return;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + state.session.access_token,
    'Content-Type': 'application/json'
  };
  const oldest = new Date(); oldest.setDate(oldest.getDate() - 365);
  const oldestDate = oldest.toISOString().slice(0, 10);
  const oldestTS = oldest.toISOString();

  try {
    const [wRes, aRes, lRes] = await Promise.all([
      fetch(SUPABASE_URL + `/rest/v1/zepp_wellness?select=*&day=gte.${oldestDate}&order=day.asc`, { headers }),
      fetch(SUPABASE_URL + `/rest/v1/zepp_activities?select=*&start_date=gte.${oldestTS}&order=start_date.desc`, { headers }),
      fetch(SUPABASE_URL + `/rest/v1/zepp_sync_log?select=*&order=ran_at.desc&limit=1`, { headers })
    ]);
    if (wRes.status === 401 || aRes.status === 401) {
      console.log('[ZH] 401 — trying refresh');
      const refreshed = await refreshSession();
      if (refreshed) return pullAll();
      clearSession(); state.session = null; emit();
      return;
    }
    const [w, a, l] = await Promise.all([wRes.json(), aRes.json(), lRes.json()]);
    state.wellness = Array.isArray(w) ? w : [];
    state.activities = Array.isArray(a) ? a : [];
    state.lastSync = Array.isArray(l) ? l[0] : null;
    console.log('[ZH] pulled', { wellness: state.wellness.length, activities: state.activities.length });
    emit();
  } catch (e) {
    console.error('[ZH] pull failed:', e);
  }
}

window.ZH = window.ZH || {};
window.ZH.db = { useStore, initAuth, signIn, signInWithPassword, signOut, pullAll, getSession: () => state.session };
