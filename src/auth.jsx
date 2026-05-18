// Auth + session storage for Zepp Health.
// Manual session management (the Supabase SDK was unreliable). All auth + data
// calls go via direct REST. Data fetching is in adapter.jsx.

const SUPABASE_URL = 'https://fhfempisopwsdkmvywbt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MDxQPm0SzLHFTnDqg-eyyQ_0yposnES';
const SESSION_KEY = 'zh-session-v1';

const listeners = new Set();
let state = { session: null, loading: true, error: null };

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

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s.access_token && s.user ? s : null;
  } catch (e) { return null; }
}
function storeSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function clearStoredSession() { localStorage.removeItem(SESSION_KEY); }

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
  console.log('[ZH] initAuth');
  state.session = loadStoredSession();
  state.loading = false;
  emit();
}

async function signInWithPassword(email, password) {
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
  storeSession(state.session);
  emit();
}

async function signIn(email) {
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
  clearStoredSession();
  state.session = null;
  emit();
}

async function refreshSession() {
  if (!state.session || !state.session.refresh_token) return null;
  const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: state.session.refresh_token })
  });
  if (!res.ok) return null;
  const data = await res.json();
  state.session = sessionFromTokenResponse(data);
  storeSession(state.session);
  emit();
  return state.session;
}

window.ZH = window.ZH || {};
window.ZH.db = { useStore, initAuth, signIn, signInWithPassword, signOut, refreshSession,
                  getSession: () => state.session };
