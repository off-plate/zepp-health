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

async function initAuth() {
  try {
    console.log('[ZH] initAuth start');
    // Race getSession against a generous timeout so we don't hang forever on rare
    // edge cases, but don't destroy stored sessions — if it times out, just fall
    // through to no-session state (user can sign in again).
    let session = null;
    try {
      const result = await Promise.race([
        sb.auth.getSession(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('getSession timeout')), 15000))
      ]);
      session = result.data && result.data.session;
      if (result.error) console.error('[ZH] getSession error:', result.error);
    } catch (e) {
      console.warn('[ZH] getSession timed out, proceeding without session');
    }
    console.log('[ZH] session:', session ? session.user.email : 'none');
    state.session = session;
    if (session) {
      console.log('[ZH] pulling data…');
      await pullAll();
    }
  } catch (err) {
    console.error('[ZH] initAuth fatal:', err);
    state.error = err.message || String(err);
  } finally {
    state.loading = false;
    emit();
  }

  sb.auth.onAuthStateChange(async (_event, session) => {
    console.log('[ZH] auth state change:', _event, session ? session.user.email : 'none');
    state.session = session;
    if (session) await pullAll();
    else { state.wellness = []; state.activities = []; }
    emit();
  });
}

async function signIn(email) {
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (error) throw error;
}
async function signOut() { await sb.auth.signOut(); }

async function pullAll() {
  console.log('[ZH] pullAll start');
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
  }
}

window.ZH = window.ZH || {};
window.ZH.db = { useStore, initAuth, signIn, signOut, pullAll, getSession: () => state.session };
