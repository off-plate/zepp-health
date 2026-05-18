/* global React, ReactDOM, ScreenToday, ScreenSleep, ScreenHeart, ScreenTraining, ScreenWorkouts, ScreenAwards, ScreenCalendar, WorkoutDetail, BadgeArt */

// useState/useEffect/useMemo already destructured in components.jsx — reuse those globals.

const NAV = [
  { id: 'today', label: 'Today' },
  { id: 'workouts', label: 'Workouts' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'heart', label: 'Heart' },
  { id: 'training', label: 'Training Load' },
  { id: 'awards', label: 'Awards' },
  { id: 'calendar', label: 'Calendar' }
];

const NAV_ICONS = {
  today: 'today', workouts: 'directions_run', sleep: 'bedtime',
  heart: 'favorite', training: 'monitoring', awards: 'workspace_premium',
  calendar: 'calendar_month'
};

function App() {
  const auth = window.ZH.db.useStore();
  const [tab, setTab] = useState('today');
  const [workout, setWorkout] = useState(null);
  const [unlocked, setUnlocked] = useState(null);
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [dataVer, setDataVer] = useState(0); // bump to re-read globals after refresh

  // Load Supabase data into window globals when authenticated.
  useEffect(() => {
    if (!auth.session) { setDataReady(false); return; }
    let cancelled = false;
    setDataError(null);
    window.ZH_ADAPTER.loadAllData(auth.session)
      .then(() => { if (!cancelled) { setDataReady(true); setDataVer(v => v + 1); } })
      .catch(err => { if (!cancelled) setDataError(err.message || String(err)); });
    return () => { cancelled = true; };
  }, [auth.session]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setWorkout(null); setUnlocked(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [syncing, setSyncing] = useState(false);

  async function refresh() {
    if (!auth.session) return;
    try {
      await window.ZH_ADAPTER.loadAllData(auth.session);
      setDataVer(v => v + 1);
    } catch (e) { setDataError(e.message); }
  }

  async function syncNow() {
    if (!auth.session || syncing) return;
    setSyncing(true);
    const since = window.zhLastSync || new Date(0);
    try {
      await window.ZH_ADAPTER.triggerSync(60);
      const result = await window.ZH_ADAPTER.waitForSyncComplete(auth.session, since);
      if (result) await window.ZH_ADAPTER.loadAllData(auth.session);
      setDataVer(v => v + 1);
    } catch (e) {
      console.error('[ZH] sync now failed:', e);
    } finally {
      setSyncing(false);
    }
  }

  if (auth.loading) return <LoadingScreen msg="Loading…" />;
  if (!auth.session) return <SignIn />;
  if (dataError) return <ErrorScreen msg={dataError} onRetry={refresh} />;
  if (!dataReady) return <LoadingScreen msg="Pulling your health data…" />;

  const lastSyncLabel = (() => {
    if (!window.zhLastSync) return 'Not synced';
    const diff = Date.now() - window.zhLastSync.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  })();

  return (
    <div className="app" key={dataVer}>
      <div className="bg-stage" />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"></span>
          <span>Zepp Health</span>
        </div>

        <nav className="nav">
          {NAV.map(n => (
            <button key={n.id}
              className={`nav-item ${tab === n.id ? 'active' : ''}`}
              onClick={() => setTab(n.id)}>
              <span className="icon sm" style={{ marginRight: 6, fontSize: 14 }}>{NAV_ICONS[n.id]}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="user-chip">
          <button className="user-sync" onClick={syncNow} disabled={syncing} title="Pull fresh data from Intervals.icu"
            style={{ background: 'transparent', border: 0, color: 'inherit', cursor: syncing ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: syncing ? 0.6 : 1 }}>
            <span className="icon sm" style={{ color: 'var(--steps)', fontSize: 14, animation: syncing ? 'spin 1s linear infinite' : 'none' }}>sync</span>
            {syncing ? 'Syncing…' : `Synced ${lastSyncLabel}`}
          </button>
          <span className="user-avatar" onClick={() => { if (confirm('Sign out?')) window.ZH.db.signOut(); }} style={{ cursor: 'pointer' }}>MF</span>
        </div>
      </header>

      <main className="screen" key={tab}>
        <ScreenHeader tab={tab} />
        {tab === 'today' && <ScreenToday onOpenWorkout={setWorkout} onUnlock={setUnlocked} />}
        {tab === 'workouts' && <ScreenWorkouts onOpen={setWorkout} />}
        {tab === 'sleep' && <ScreenSleep />}
        {tab === 'heart' && <ScreenHeart />}
        {tab === 'training' && <ScreenTraining />}
        {tab === 'awards' && <ScreenAwards onUnlock={setUnlocked} />}
        {tab === 'calendar' && <ScreenCalendar />}
      </main>

      {workout && <WorkoutDetail w={workout} onClose={() => setWorkout(null)} />}
      {unlocked && <UnlockOverlay a={unlocked} onClose={() => setUnlocked(null)} />}
    </div>
  );
}

function ScreenHeader({ tab }) {
  const now = new Date();
  const hi = (() => {
    const h = now.getHours();
    if (h < 5) return 'Late night';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();
  const titles = {
    today: 'Today', workouts: 'Workouts', sleep: 'Sleep', heart: 'Heart',
    training: 'Training Load', awards: 'Awards', calendar: 'Calendar'
  };
  const subs = {
    today: `Your snapshot for ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    workouts: 'Every session from your Amazfit',
    sleep: 'Stages, scores and consistency',
    heart: 'Cardiac signal — daily, weekly, decade',
    training: 'Fitness, fatigue, form — the long game',
    awards: 'Earned through honest miles',
    calendar: 'A year at a glance'
  };
  return (
    <div className="screen-head">
      <div>
        {tab === 'today' && <div className="screen-greeting">{hi}, Michael</div>}
        <h1 className="screen-title">{titles[tab]}</h1>
        <div className="screen-date" style={{ marginTop: 8 }}>{subs[tab]}</div>
      </div>
    </div>
  );
}

// ====================== UNLOCK OVERLAY ======================
function UnlockOverlay({ a, onClose }) {
  const particles = useMemo(() => Array.from({ length: 36 }, (_, i) => {
    const angle = i / 36 * Math.PI * 2 + Math.random() * 0.4;
    const dist = 220 + Math.random() * 200;
    return { i, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, delay: Math.random() * 0.2 };
  }), [a.id]);

  return (
    <div className="unlock-overlay" onClick={onClose} style={{ '--accent': a.accent, '--accent-glow': a.accent + '-glow' }}>
      <div className="unlock-particles">
        {particles.map(p =>
          <div key={p.i} className="unlock-particle"
            style={{ left: '50%', top: '50%', '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, animationDelay: `${0.5 + p.delay}s` }} />
        )}
      </div>
      <div className="unlock-card" onClick={(e) => e.stopPropagation()}>
        <div className="unlock-tier" style={{ background: a.accent }}>{a.tier} Tier Unlocked</div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 220, height: 220 }}>
            <BadgeArt kind={a.badge} accent={a.accent} tier={a.tier} />
          </div>
        </div>
        <div className="unlock-title">{a.name}</div>
        <div className="unlock-sub">{a.narrative || `Earned through consistent effort. You've hit the ${a.tier.toLowerCase()} milestone.`}</div>
        <button className="unlock-close" onClick={onClose}>Continue</button>
      </div>
    </div>
  );
}

// ====================== AUTH SCREENS ======================
function LoadingScreen({ msg }) {
  return (
    <div className="app">
      <div className="bg-stage" />
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', position: 'relative' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-2)' }}>
          <div className="brand-mark" style={{ margin: '0 auto 18px', width: 56, height: 56, fontSize: 22, animation: 'pulse-soft 1.5s ease-in-out infinite' }}></div>
          <div style={{ fontSize: 14, letterSpacing: '0.04em' }}>{msg}</div>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ msg, onRetry }) {
  return (
    <div className="app">
      <div className="bg-stage" />
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', position: 'relative', padding: 20 }}>
        <div className="tile" style={{ maxWidth: 480, padding: 24 }}>
          <h2 style={{ margin: '0 0 10px', color: 'var(--cardio)' }}>Couldn't load data</h2>
          <div style={{ color: 'var(--text-2)', fontSize: 13, fontFamily: 'var(--font-mono)', marginBottom: 16, whiteSpace: 'pre-wrap' }}>{msg}</div>
          <button className="unlock-close" onClick={onRetry} style={{ background: 'var(--cardio)', color: '#1a0e0c' }}>Retry</button>
        </div>
      </div>
    </div>
  );
}

function SignIn() {
  const [mode, setMode] = useState('password');
  const [email, setEmail] = useState('mihael.florian@gmail.com');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      if (mode === 'password') await window.ZH.db.signInWithPassword(email.trim(), password);
      else { await window.ZH.db.signIn(email.trim()); setSent(true); }
    } catch (e) { setError(e.message || 'Sign in failed'); }
    finally { setBusy(false); }
  }

  return (
    <div className="app">
      <div className="bg-stage" />
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', position: 'relative', padding: 20 }}>
        <div className="tile" style={{ maxWidth: 380, width: '100%', padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span className="brand-mark"></span>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Zepp Health</div>
          </div>
          {sent ? (
            <>
              <h3 style={{ margin: '0 0 8px' }}>Check your email</h3>
              <div style={{ color: 'var(--text-2)', fontSize: 13 }}>Magic link sent to <b>{email}</b>.</div>
            </>
          ) : (
            <form onSubmit={submit}>
              <h3 style={{ margin: '0 0 18px', fontSize: 18 }}>Sign in</h3>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', background: 'var(--glass-strong)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '10px 12px', color: 'var(--text-1)', fontSize: 14, marginBottom: 14, fontFamily: 'inherit' }} />
              {mode === 'password' && (
                <>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Password</label>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoFocus
                    style={{ width: '100%', background: 'var(--glass-strong)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '10px 12px', color: 'var(--text-1)', fontSize: 14, marginBottom: 14, fontFamily: 'inherit' }} />
                </>
              )}
              {error && <div style={{ color: 'var(--cardio)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
              <button type="submit" disabled={busy}
                style={{ width: '100%', background: 'var(--cardio)', color: '#1a0e0c', border: 0, padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                {busy ? '…' : (mode === 'password' ? 'Sign in' : 'Send magic link')}
              </button>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button type="button" onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setError(null); }}
                  style={{ background: 'transparent', border: 0, color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>
                  {mode === 'password' ? 'Use magic link instead' : 'Use password instead'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
window.ZH.db.initAuth();
