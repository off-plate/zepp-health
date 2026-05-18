// Supabase client + data hooks for Zepp Health.

const SUPABASE_URL = 'https://fhfempisopwsdkmvywbt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MDxQPm0SzLHFTnDqg-eyyQ_0yposnES';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const listeners = new Set();
let state = { wellness: [], activities: [], lastSync: null, session: null, loading: true };

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

function initAuth() {
  console.log('[ZH] initAuth start');

  // Don't block on getSession (it hangs intermittently in Supabase JS).
  // Just register the listener — it fires INITIAL_SESSION once the lib initializes,
  // and again on any subsequent sign-in / sign-out.
  let resolvedOnce = false;
  sb.auth.onAuthStateChange(async (event, session) => {
    console.log('[ZH] auth event:', event, session ? session.user.email : 'none');
    state.session = session;
    state.loading = false;
    resolvedOnce = true;
    if (session) {
      try { await pullAll(); } catch (e) { console.error('[ZH] pull failed:', e); }
    } else {
      state.wellness = []; state.activities = [];
    }
    emit();
  });

  // Fallback: if for some reason the listener never fires, stop loading after 10s
  // so the sign-in screen appears instead of hanging forever.
  setTimeout(() => {
    if (!resolvedOnce && state.loading) {
      console.warn('[ZH] auth listener never fired, falling through to sign-in');
      state.loading = false;
      emit();
    }
  }, 10000);
}

async function signIn(email) {
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (error) throw error;
}
async function signInWithPassword(email, password) {
  console.log('[ZH] signInWithPassword start (direct REST)');
  // Bypass SDK — direct REST call to Supabase auth.
  const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json();
  if (!res.ok || json.error || !json.access_token) {
    throw new Error(json.error_description || json.error || json.msg || ('Sign in failed (' + res.status + ')'));
  }
  console.log('[ZH] got tokens, hydrating SDK session');
  // Feed the tokens into the SDK so it manages refresh + storage.
  const { error } = await sb.auth.setSession({ access_token: json.access_token, refresh_token: json.refresh_token });
  if (error) throw error;
}
async function signOut() { await sb.auth.signOut(); }

async function pullAll() {
  console.log('[ZH] pullAll start');
  const timer = setTimeout(() => console.warn('[ZH] pullAll: still waiting after 8s'), 8000);
  try {
    const oldest = new Date(); oldest.setDate(oldest.getDate() - 365);
    const oldestISO = oldest.toISOString().slice(0, 10);

    const [w, a, log] = await Promise.all([
      sb.from('zepp_wellness').select('*').gte('day', oldestISO).order('day', { ascending: true }),
      sb.from('zepp_activities').select('*').gte('start_date', oldest.toISOString()).order('start_date', { ascending: false }),
      sb.from('zepp_sync_log').select('*').order('ran_at', { ascending: false }).limit(1)
    ]);
    if (w.error) console.error('[ZH] wellness error:', w.error);
    if (a.error) console.error('[ZH] activities error:', a.error);
    if (log.error) console.error('[ZH] log error:', log.error);
    console.log('[ZH] pulled', { wellness: (w.data||[]).length, activities: (a.data||[]).length });
    state.wellness = w.data || [];
    state.activities = a.data || [];
    state.lastSync = (log.data && log.data[0]) || null;
    emit();
  } catch (e) {
    console.error('Pull failed:', e);
  } finally {
    clearTimeout(timer);
  }
}

window.ZH = window.ZH || {};
window.ZH.db = { useStore, initAuth, signIn, signInWithPassword, signOut, pullAll, getSession: () => state.session };
