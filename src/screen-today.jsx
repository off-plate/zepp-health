/* global React, ActivityRings, Sparkline, NumberTicker, HoverTile, RangeTabs, HeartIcon, Gauge, Heatbar, RouteMap, Icon, wellness, todayW, workouts, lastNight, hrZones, streaks, awards, calendarData */

const { useState: uS, useEffect: uE, useMemo: uM, useRef: uR } = React;

// helpful: turn wellness slice into labels
var fmtDateLabel = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ========================= TODAY =========================
function ScreenToday({ onOpenWorkout, onUnlock }) {
  const stepsGoal = 12000;
  const sleepGoal = 8 * 3600;
  const trainGoal = 100;

  const rings = [
    { color: 'var(--steps)',  colorB: 'var(--steps-soft)',  value: Math.min(1, todayW.steps / stepsGoal) },
    { color: 'var(--sleep)',  colorB: 'var(--sleep-soft)',  value: Math.min(1, todayW.sleepSeconds / sleepGoal) },
    { color: 'var(--train)',  colorB: 'var(--train-soft)',  value: Math.min(1, 72 / trainGoal) },
  ];

  const stepsData = wellness.slice(-30).map(d => d.steps);
  const rhrData = wellness.slice(-14).map(d => d.rhr);

  return (
    <div className="today-grid stagger">
      {/* HERO: triple rings */}
      <HoverTile className="today-hero" tilt={false}>
        <div className="between" style={{ marginBottom: 6 }}>
          <div className="tile-label" style={{ '--accent': 'var(--cardio)' }}>
            <Icon name="sports_score" className="sm" style={{ color: 'var(--cardio)' }} /> Today's Move
          </div>
          <div className="muted" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            Mon · May 18
          </div>
        </div>
        <div className="rings-hero">
          <div className="rings-stage">
            <ActivityRings size={260} stroke={20} gap={6} rings={rings} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>Daily Goals</div>
              <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>
                <NumberTicker value={Math.round((rings[0].value + rings[1].value + rings[2].value) / 3 * 100)} format={v => Math.round(v) + '%'} />
              </div>
              <div className="muted" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>closing</div>
            </div>
          </div>
          <div className="rings-legend">
            <div className="rings-legend-item">
              <div className="rings-legend-row">
                <span className="rings-legend-swatch" style={{ '--accent': 'var(--steps)' }}></span> Steps
              </div>
              <div className="rings-legend-value">
                <NumberTicker value={todayW.steps} />
              </div>
              <div className="rings-legend-goal">of {stepsGoal.toLocaleString()}</div>
            </div>
            <div className="rings-legend-item">
              <div className="rings-legend-row">
                <span className="rings-legend-swatch" style={{ '--accent': 'var(--sleep)' }}></span> Sleep
              </div>
              <div className="rings-legend-value">
                <NumberTicker value={todayW.sleepSeconds / 3600} format={v => v.toFixed(1) + 'h'} />
              </div>
              <div className="rings-legend-goal">of 8.0h target</div>
            </div>
            <div className="rings-legend-item">
              <div className="rings-legend-row">
                <span className="rings-legend-swatch" style={{ '--accent': 'var(--train)' }}></span> Training Load
              </div>
              <div className="rings-legend-value">
                <NumberTicker value={72} />
              </div>
              <div className="rings-legend-goal">of 100 TSS target</div>
            </div>
          </div>
        </div>
      </HoverTile>

      {/* RHR */}
      <HoverTile className="today-rhr">
        <div className="tile-label" style={{ '--accent': 'var(--cardio)' }}>
          <Icon name="favorite" fill className="sm" style={{ color: 'var(--cardio)' }} /> Resting Heart Rate
        </div>
        <div className="row" style={{ gap: 16, marginBottom: 6 }}>
          <div className="heart-wrap">
            <div className="heart-ring"></div>
            <div className="heart-shape"><HeartIcon /></div>
          </div>
          <div>
            <div className="tile-value">
              <NumberTicker value={todayW.rhr} /><span className="tile-unit">bpm</span>
            </div>
            <div className="tile-sub">
              <span className="delta down">−3 vs avg</span>
            </div>
          </div>
        </div>
        <Sparkline data={rhrData} color="var(--cardio)" height={44}
          labels={wellness.slice(-14).map(d => fmtDateLabel(d.date))}
          unit="bpm" />
      </HoverTile>

      {/* Readiness */}
      <HoverTile className="today-readiness">
        <div className="tile-label" style={{ '--accent': 'var(--recovery)' }}>
          <Icon name="battery_charging_full" className="sm" style={{ color: 'var(--recovery)' }} /> Readiness
        </div>
        <div style={{ position: 'relative' }}>
          <Gauge value={todayW.readiness} color="#4ECDC4" />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '6%' }}>
            <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>
              <NumberTicker value={todayW.readiness} />
            </div>
            <div className="muted" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4, fontWeight: 600, color: 'var(--recovery)' }}>
              Prime
            </div>
          </div>
        </div>
      </HoverTile>

      {/* Sleep */}
      <HoverTile className="today-sleep breathe">
        <div className="tile-label" style={{ '--accent': 'var(--sleep)' }}>
          <Icon name="bedtime" fill className="sm" style={{ color: 'var(--sleep)' }} /> Last Night
        </div>
        <div className="tile-value">
          <NumberTicker value={lastNight.totalSec / 3600} format={v => v.toFixed(1)} /><span className="tile-unit">hours</span>
        </div>
        <div className="tile-sub" style={{ marginBottom: 12 }}>
          <span style={{ color: 'var(--sleep-soft)', fontWeight: 600 }}>Score {lastNight.score}</span>
          <span className="delta up">+6 vs avg</span>
        </div>
        <SleepStagesBar totals={lastNight.totals} compact />
      </HoverTile>

      {/* Form / TSB */}
      <HoverTile className="today-form">
        <div className="tile-label" style={{ '--accent': 'var(--train)' }}>
          <Icon name="monitoring" className="sm" style={{ color: 'var(--train)' }} /> Fitness · Fatigue
        </div>
        <div className="col" style={{ gap: 10, marginTop: 4 }}>
          <FormBars ctl={todayW.ctl} atl={todayW.atl} tsb={todayW.tsb} />
        </div>
        <div className="tile-sub" style={{ marginTop: 12 }}>
          {todayW.tsb >= 0 ? (
            <><span style={{ color: 'var(--steps)', fontWeight: 600 }}>Fresh</span> · ready to push</>
          ) : (
            <><span style={{ color: 'var(--train)', fontWeight: 600 }}>Loaded</span> · plan recovery</>
          )}
        </div>
      </HoverTile>

      {/* Latest workout */}
      <HoverTile className="today-workout" tilt={false} onClick={() => onOpenWorkout(workouts[0])}>
        <div className="between" style={{ marginBottom: 14 }}>
          <div className="tile-label" style={{ '--accent': workouts[0].accent }}>
            <Icon name="directions_run" className="sm" style={{ color: workouts[0].accent }} /> Latest Workout
          </div>
          <div className="muted" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>tap for detail <Icon name="arrow_forward" className="sm" style={{ fontSize: 12 }} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 20, alignItems: 'center' }}>
          <div className="workout-thumb" style={{ width: 140, height: 100 }}>
            <RouteMap path={workouts[0].routePath} color="var(--cardio)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cardio)' }}>
              {workouts[0].type}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 2 }}>{workouts[0].name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginTop: 14, maxWidth: 480 }}>
              <StatChip label="Distance" v={`${workouts[0].distance.toFixed(1)}`} u="km" />
              <StatChip label="Time" v={`${Math.floor(workouts[0].duration / 60) || 0}:${String(workouts[0].duration % 60).padStart(2,'0')}`} u="" />
              <StatChip label="Avg HR" v={workouts[0].avgHr} u="bpm" />
              <StatChip label="Load" v={workouts[0].load} u="TSS" />
            </div>
            <Heatbar zones={workouts[0].heat} />
          </div>
        </div>
      </HoverTile>

      {/* Streaks */}
      <HoverTile className="today-streaks">
        <div className="tile-label" style={{ '--accent': 'var(--train)' }}>
          <Icon name="local_fire_department" fill className="sm" style={{ color: 'var(--train)' }} /> Active Streaks
        </div>
        <div style={{ marginTop: 4 }}>
          {streaks.map(s => (
            <div key={s.name} className="streak-row">
              <div className="streak-info">
                <div className="streak-name">{s.name}</div>
                <div className="streak-meta">{s.meta}</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <div className="streak-count">{s.count}</div>
                <div className="muted" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{s.unit}</div>
              </div>
            </div>
          ))}
        </div>
      </HoverTile>

      {/* Up Next achievements */}
      <UpNextAchievements />
    </div>
  );
}

// Apple-Health-style "close to unlocking" panel
function UpNextAchievements() {
  const locked = awards
    .filter(a => !a.unlocked && a.progress < 1)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 4);

  return (
    <HoverTile className="today-upnext" tilt={false}>
      <div className="between" style={{ marginBottom: 16 }}>
        <div className="tile-label" style={{ '--accent': 'var(--train)' }}>
          <Icon name="emoji_events" fill className="sm" style={{ color: 'var(--train)' }} /> Up Next · Almost There
        </div>
        <div className="muted" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          {locked.length} awards within reach
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {locked.map(a => (
          <div key={a.id} className="upnext-card" style={{ '--accent': a.accent, '--accent-fade': a.accent.replace('var(', 'rgba(').replace(')', ', 0.12)') }}>
            <div className="upnext-badge">
              <BadgeArt kind={a.badge} accent={a.accent} tier={a.tier} />
            </div>
            <div className="upnext-info">
              <div className="upnext-name">{a.name}</div>
              <div className="upnext-progress-bar"><div className="upnext-progress-fill" style={{ width: `${a.progress * 100}%`, animation: 'zone-grow 1s var(--ease-spring) both', transformOrigin: 'left' }} /></div>
              <div className="upnext-progress-text">{Math.round(a.progress * 100)}% · {a.tier} tier</div>
            </div>
            <div className="upnext-pct" style={{ color: a.accent }}>{Math.round(a.progress * 100)}<span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>%</span></div>
          </div>
        ))}
      </div>
    </HoverTile>
  );
}

function StatChip({ label, v, u }) {
  return (
    <div className="col">
      <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {typeof v === 'number' ? <NumberTicker value={v} /> : v}
        {u && <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginLeft: 3 }}>{u}</span>}
      </div>
    </div>
  );
}

function SleepStagesBar({ totals, compact }) {
  const total = totals.deep + totals.rem + totals.light + totals.awake;
  const segs = [
    { name: 'Deep', mins: totals.deep, color: 'var(--sleep)' },
    { name: 'REM', mins: totals.rem, color: 'var(--cardio-soft)' },
    { name: 'Light', mins: totals.light, color: 'var(--recovery)' },
    { name: 'Awake', mins: totals.awake, color: 'var(--train)' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', height: compact ? 10 : 12, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
        {segs.map(s => (
          <div key={s.name} style={{ width: `${(s.mins / total) * 100}%`, background: s.color, boxShadow: `0 0 6px ${s.color}`, transition: 'width 1s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--text-2)' }}>
        {segs.map(s => (
          <div key={s.name} className="row" style={{ gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: s.color }}></span>
            <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{s.name}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-1)' }}>{s.mins}m</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormBars({ ctl, atl, tsb }) {
  const max = Math.max(ctl, atl, 80);
  const tsbAbs = Math.abs(tsb);
  return (
    <div className="col" style={{ gap: 14 }}>
      {[
        { label: 'CTL · Fitness', v: ctl, color: 'var(--recovery)' },
        { label: 'ATL · Fatigue', v: atl, color: 'var(--cardio)' },
      ].map(b => (
        <div key={b.label}>
          <div className="between" style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase' }}>{b.label}</div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}><NumberTicker value={b.v} format={v => v.toFixed(0)} /></div>
          </div>
          <div style={{ height: 6, background: 'var(--hairline)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(b.v / max) * 100}%`, height: '100%', background: b.color, boxShadow: `0 0 6px ${b.color}`, transformOrigin: 'left', animation: 'zone-grow 1.2s var(--ease-spring) both' }} />
          </div>
        </div>
      ))}
      <div className="between" style={{ marginTop: 2 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase' }}>TSB · Form</div>
        <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: tsb >= 0 ? 'var(--steps)' : 'var(--cardio)' }}>
          {tsb >= 0 ? '+' : ''}<NumberTicker value={tsb} format={v => v.toFixed(0)} />
        </div>
      </div>
    </div>
  );
}

window.ScreenToday = ScreenToday;
