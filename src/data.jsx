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
  const { data: { session } } = await sb.auth.getSession();
  state.session = session;
  if (session) await pullAll();
  state.loading = false;
  emit();

  sb.auth.onAuthStateChange(async (_event, session) => {
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
  try {
    const oldest = new Date(); oldest.setDate(oldest.getDate() - 365);
    const oldestISO = oldest.toISOString().slice(0, 10);

    const [w, a, log] = await Promise.all([
      sb.from('zepp_wellness').select('*').gte('day', oldestISO).order('day', { ascending: true }),
      sb.from('zepp_activities').select('*').gte('start_date', oldest.toISOString()).order('start_date', { ascending: false }),
      sb.from('zepp_sync_log').select('*').order('ran_at', { ascending: false }).limit(1)
    ]);
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
