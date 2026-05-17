// Charts and COLORS are exposed on window.ZH.charts (declared in charts.jsx above).
const COLORS_REF = () => window.ZH.charts.COLORS;
const Charts = {
  Bar: (p) => window.ZH.charts.BarChart(p),
  Line: (p) => window.ZH.charts.LineChart(p),
  Load: (p) => window.ZH.charts.TrainingLoadChart(p),
};

// Range options
const RANGES = [
  { key: '7', label: '7d', days: 7 },
  { key: '30', label: '30d', days: 30 },
  { key: '90', label: '90d', days: 90 },
  { key: '365', label: '1y', days: 365 },
];

function activityIcon(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('run')) return '🏃';
  if (t.includes('ride') || t.includes('cycl') || t.includes('bike')) return '🚴';
  if (t.includes('swim')) return '🏊';
  if (t.includes('walk') || t.includes('hike')) return '🥾';
  if (t.includes('strength') || t.includes('weight')) return '🏋️';
  if (t.includes('yoga') || t.includes('stretch')) return '🧘';
  return '💪';
}

function fmtDuration(secs) {
  if (!secs) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', weekday: 'short' });
}
function fmtKm(meters) {
  if (!meters) return null;
  return (meters / 1000).toFixed(2) + ' km';
}

// Take a range of wellness data, fill missing days with nulls.
function fillRange(rows, days, fields) {
  const byDay = new Map(rows.map(r => [r.day, r]));
  const out = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    const r = byDay.get(day);
    const item = { day };
    fields.forEach(f => item[f] = r ? r[f] : null);
    out.push(item);
  }
  return out;
}

function App() {
  const s = window.ZH.db.useStore();
  const [rangeKey, setRangeKey] = React.useState('30');
  const range = RANGES.find(r => r.key === rangeKey) || RANGES[1];

  if (s.loading) return <div className="signin-wrap"><div className="text-muted">Loading…</div></div>;
  if (!s.session) return <SignIn />;

  // Slice data to the selected range
  const days = range.days;
  const stepsData = fillRange(s.wellness, days, ['steps']).map(r => ({ day: r.day, value: r.steps }));
  const sleepData = fillRange(s.wellness, days, ['sleep_secs']).map(r => ({ day: r.day, value: r.sleep_secs ? r.sleep_secs / 3600 : null }));
  const rhrData = fillRange(s.wellness, days, ['resting_hr']).map(r => ({ day: r.day, value: r.resting_hr }));
  const weightData = fillRange(s.wellness, days, ['weight']).map(r => ({ day: r.day, value: r.weight }));
  const loadData = fillRange(s.wellness, days, ['ctl', 'atl']);

  // Stats: latest values + 7-day comparison
  const recent = s.wellness.slice(-7);
  const prev = s.wellness.slice(-14, -7);
  function avg(rows, field) {
    const vals = rows.map(r => r[field]).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  const avgSteps = avg(recent, 'steps'), prevSteps = avg(prev, 'steps');
  const avgSleep = avg(recent, 'sleep_secs'), prevSleep = avg(prev, 'sleep_secs');
  const avgRhr = avg(recent, 'resting_hr'), prevRhr = avg(prev, 'resting_hr');
  const latestWeight = s.wellness.map(r => r.weight).filter(v => v != null).slice(-1)[0];
  const latestCtl = s.wellness.map(r => r.ctl).filter(v => v != null).slice(-1)[0];
  const latestAtl = s.wellness.map(r => r.atl).filter(v => v != null).slice(-1)[0];

  // Workouts in range
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  const workouts = s.activities.filter(a => new Date(a.start_date) >= cutoff);

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <div className="brand-mark">♥</div>
          <div>
            <h1>Zepp Health</h1>
            <div className="sub">Your watch data, your dashboard.</div>
          </div>
        </div>
        <div className="row-h gap-12">
          <div className="range-tabs">
            {RANGES.map(r => (
              <button key={r.key} className={rangeKey === r.key ? 'active' : ''} onClick={() => setRangeKey(r.key)}>{r.label}</button>
            ))}
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => window.ZH.db.pullAll()}>↻</button>
          <button className="btn btn-sm btn-ghost" title="Sign out" onClick={async () => { if (confirm('Sign out?')) await window.ZH.db.signOut(); }}>👤</button>
        </div>
      </header>

      {s.wellness.length === 0 && s.activities.length === 0 ? (
        <div className="card empty">
          <p>No data yet.</p>
          <p className="text-sm">Trigger the sync workflow on GitHub Actions, or wait for the next scheduled run.</p>
        </div>
      ) : (
        <>
          <div className="stats">
            <Stat label="Steps (7d avg)" value={avgSteps ? Math.round(avgSteps).toLocaleString() : '—'} prev={prevSteps} cur={avgSteps} better="up" />
            <Stat label="Sleep (7d avg)" value={avgSleep ? (avgSleep / 3600).toFixed(1) : '—'} unit="h" prev={prevSleep} cur={avgSleep} better="up" />
            <Stat label="Resting HR (7d)" value={avgRhr ? Math.round(avgRhr) : '—'} unit="bpm" prev={prevRhr} cur={avgRhr} better="down" />
            <Stat label="Weight" value={latestWeight ? latestWeight.toFixed(1) : '—'} unit="kg" />
            <Stat label="Fitness (CTL)" value={latestCtl ? latestCtl.toFixed(1) : '—'} />
            <Stat label="Fatigue (ATL)" value={latestAtl ? latestAtl.toFixed(1) : '—'} />
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <h2 className="card-title">Daily steps</h2>
                <span className="card-sub">{range.label}</span>
              </div>
              <Charts.Bar data={stepsData} color={window.ZH.charts.COLORS.green} formatValue={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0)} />
            </div>

            <div className="card">
              <div className="card-head">
                <h2 className="card-title">Sleep duration</h2>
                <span className="card-sub">hours</span>
              </div>
              <Charts.Bar data={sleepData} color={window.ZH.charts.COLORS.purple} formatValue={v => v.toFixed(1)} />
            </div>

            <div className="card">
              <div className="card-head">
                <h2 className="card-title">Resting heart rate</h2>
                <span className="card-sub">bpm · 7d rolling avg</span>
              </div>
              <Charts.Line data={rhrData} color={window.ZH.charts.COLORS.accent} formatValue={v => Math.round(v)} />
            </div>

            <div className="card">
              <div className="card-head">
                <h2 className="card-title">Weight</h2>
                <span className="card-sub">kg</span>
              </div>
              <Charts.Line data={weightData} color={window.ZH.charts.COLORS.yellow} formatValue={v => v.toFixed(1)} />
            </div>
          </div>

          <div className="card" style={{marginTop: 14}}>
            <div className="card-head">
              <h2 className="card-title">Training load</h2>
              <div className="row-h text-sm">
                <span style={{color: window.ZH.charts.COLORS.blue}}>● CTL (fitness)</span>
                <span style={{color: window.ZH.charts.COLORS.accent}}>● ATL (fatigue)</span>
              </div>
            </div>
            <Charts.Load data={loadData} />
          </div>

          <div className="card" style={{marginTop: 14}}>
            <div className="card-head">
              <h2 className="card-title">Workouts</h2>
              <span className="card-sub">{workouts.length} in {range.label}</span>
            </div>
            {workouts.length === 0 ? (
              <div className="empty text-sm">No workouts in this range.</div>
            ) : workouts.map(w => (
              <div className="workout" key={w.id}>
                <div className="workout-icon">{activityIcon(w.type)}</div>
                <div className="workout-body">
                  <div className="workout-title">{w.name || w.type || 'Workout'}</div>
                  <div className="workout-meta">
                    <span>{fmtDate(w.start_date_local || w.start_date)}</span>
                    <span>{fmtDuration(w.moving_time || w.elapsed_time)}</span>
                    {fmtKm(w.distance) && <span>{fmtKm(w.distance)}</span>}
                    {w.average_heartrate && <span>{Math.round(w.average_heartrate)} bpm avg</span>}
                    {w.max_heartrate && <span>{w.max_heartrate} max</span>}
                  </div>
                </div>
                <div className="workout-right">
                  {w.calories ? <div>{Math.round(w.calories)} kcal</div> : null}
                  {w.icu_training_load ? <div>load {Math.round(w.icu_training_load)}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{marginTop: 32, textAlign: 'center', color: 'var(--muted-2)', fontSize: 11, fontFamily: 'JetBrains Mono'}}>
        {s.lastSync ? (
          <>last sync: {new Date(s.lastSync.ran_at).toLocaleString('en-GB')} {s.lastSync.ok ? '✓' : '⚠ failed'}</>
        ) : 'never synced'}
      </div>
    </div>
  );
}

function Stat({ label, value, unit, prev, cur, better }) {
  let deltaClass = '';
  let deltaText = '';
  if (cur != null && prev != null && prev > 0) {
    const pct = ((cur - prev) / prev) * 100;
    const sign = pct >= 0 ? '+' : '';
    deltaText = `${sign}${pct.toFixed(0)}% vs prev 7d`;
    if (better === 'up') deltaClass = pct >= 0 ? 'up' : 'down';
    else if (better === 'down') deltaClass = pct <= 0 ? 'up' : 'down';
  }
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}{unit && <span className="unit">{unit}</span>}</div>
      {deltaText && <div className={'delta ' + deltaClass}>{deltaText}</div>}
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = React.useState('mihael.florian@gmail.com');
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null); setBusy(true);
    try { await window.ZH.db.signIn(email.trim()); setSent(true); }
    catch (e) { setError(e.message || 'Sign in failed'); }
    finally { setBusy(false); }
  }

  return (
    <div className="signin-wrap">
      <div className="card signin-card">
        <div className="row-h" style={{marginBottom: 20}}>
          <div className="brand-mark">♥</div>
          <div style={{fontWeight: 700}}>Zepp Health</div>
        </div>
        {sent ? (
          <>
            <h3 style={{margin: '0 0 8px'}}>Check your email</h3>
            <p className="text-muted text-sm">Magic link sent to <b>{email}</b>.</p>
          </>
        ) : (
          <form onSubmit={submit}>
            <h3 style={{margin: '0 0 16px'}}>Sign in</h3>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {error && <div className="text-sm" style={{color: 'var(--accent)', marginBottom: 12}}>{error}</div>}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
window.ZH.db.initAuth();
