/* global React, ActivityRings, Sparkline, NumberTicker, HoverTile, RangeTabs, HeartIcon, Gauge, Heatbar, RouteMap, Icon, ChartTooltip, wellness, todayW, workouts, lastNight, hrZones, streaks, awards, calendarData */
function ScreenWorkouts({ onOpen }) {
  const [range, setRange] = React.useState('30D');
  const [type, setType] = React.useState('All');

  const days = { '7D': 7, '30D': 30, '90D': 90, '1Y': 365, 'ALL': 9999 }[range];
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);

  const allTypes = ['All', ...Array.from(new Set(workouts.map(w => w.type)))];
  const filtered = workouts
    .filter(w => w.date >= cutoff)
    .filter(w => type === 'All' || w.type === type);

  const totals = filtered.reduce((acc, w) => {
    acc.n += 1;
    acc.distance += w.distance;
    acc.time += w.duration;
    acc.elev += w.elevation;
    return acc;
  }, { n: 0, distance: 0, time: 0, elev: 0 });

  return (
    <div className="stagger" style={{ display: 'grid', gap: 14 }}>
      <div className="between" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div className="muted" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
            {range === 'ALL' ? 'All Time' : `Last ${range}`}{type !== 'All' && ` · ${type}`}
          </div>
          <div style={{ display: 'flex', gap: 28, marginTop: 4 }}>
            <div><div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}><NumberTicker value={totals.n} /></div><div className="muted" style={{ fontSize: 11 }}>Workouts</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}><NumberTicker value={totals.distance} format={v => v.toFixed(0)} /><span style={{ fontSize: 14, color: 'var(--text-3)' }}>km</span></div><div className="muted" style={{ fontSize: 11 }}>Distance</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}><NumberTicker value={totals.time / 60} format={v => v.toFixed(1)} /><span style={{ fontSize: 14, color: 'var(--text-3)' }}>h</span></div><div className="muted" style={{ fontSize: 11 }}>Moving Time</div></div>
            <div><div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}><NumberTicker value={totals.elev} /><span style={{ fontSize: 14, color: 'var(--text-3)' }}>m</span></div><div className="muted" style={{ fontSize: 11 }}>Elevation</div></div>
          </div>
        </div>
        <div className="col" style={{ gap: 8, alignItems: 'flex-end' }}>
          <RangeTabs value={range} onChange={setRange} options={['7D','30D','90D','1Y','ALL']} />
          <div className="range-tabs">
            {allTypes.map(t => (
              <button key={t} className={`range-tab ${t === type ? 'active' : ''}`} onClick={() => setType(t)}>
                {t === 'All' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="tile tile-flat" style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
          <Icon name="sentiment_satisfied" className="xl" style={{ color: 'var(--text-3)', display: 'block', margin: '0 auto 8px' }} />
          No workouts in this range. Try a longer window.
        </div>
      ) : (
        filtered.map(w => <WorkoutCard key={w.id} w={w} onClick={() => onOpen(w)} />)
      )}
    </div>
  );
}

function WorkoutCard({ w, onClick }) {
  const fmtTime = `${Math.floor(w.duration / 60)}:${String(w.duration % 60).padStart(2,'0')}`;
  const dateStr = w.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div className="workout-card" onClick={onClick} style={{ '--accent': w.accent }}>
      <div className="workout-thumb">
        {w.routePath ? <RouteMap path={w.routePath} color={w.accent} animated={false} /> : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <ActivityTypeIcon type={w.type} color={w.accent} />
          </div>
        )}
      </div>
      <div className="workout-meta">
        <div className="workout-type" style={{ color: w.accent }}>{w.type} · {dateStr}</div>
        <div className="workout-title">{w.name}</div>
        <div className="workout-stats">
          {w.distance > 0 && <div className="workout-stat"><strong>{w.distance.toFixed(1)}</strong> km</div>}
          <div className="workout-stat"><strong>{fmtTime}</strong> time</div>
          <div className="workout-stat"><strong>{w.avgHr}</strong> bpm avg</div>
          <div className="workout-stat"><strong>{w.cal}</strong> cal</div>
          <div className="workout-stat"><strong>{w.load}</strong> TSS</div>
        </div>
        <Heatbar zones={w.heat} />
      </div>
      <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Intensity</div>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: w.accent }}>{w.intensity}<span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>/10</span></div>
      </div>
    </div>
  );
}

function ActivityTypeIcon({ type, color }) {
  // Material icon name per activity type
  const map = { run: 'directions_run', ride: 'directions_bike', swim: 'pool', strength: 'fitness_center', yoga: 'self_improvement', hike: 'hiking' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Icon name={map[type] || 'directions_run'} fill className="xl" style={{ color, fontSize: 40, filter: `drop-shadow(0 0 8px ${color})` }} />
    </div>
  );
}

// Detail modal
function WorkoutDetail({ w, onClose }) {
  const fmtTime = `${Math.floor(w.duration / 60)}:${String(w.duration % 60).padStart(2,'0')}`;
  return (
    <div className="unlock-overlay" onClick={onClose} style={{ alignItems: 'flex-start', overflowY: 'auto', padding: '60px 0' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '92%', maxWidth: 1100, position: 'relative' }} className="tile tile-flat">
        <div className="between" style={{ marginBottom: 18 }}>
          <div>
            <div className="workout-type" style={{ color: w.accent }}>{w.type} · {w.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 4 }}>{w.name}</div>
          </div>
          <button className="unlock-close" onClick={onClose} style={{ marginTop: 0, animation: 'none' }}>Close</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginTop: 16 }}>
          {/* Map */}
          <div className="map-stage">
            <RoutePlaybackMap path={w.routePath} accent={w.accent} />
            <div className="map-controls">
              <button className="map-btn">Speed</button>
              <button className="map-btn">HR</button>
              <button className="map-btn">Elev</button>
            </div>
          </div>

          {/* HR donut + stats */}
          <div className="col" style={{ gap: 16 }}>
            <div className="tile" style={{ padding: 18, cursor: 'default' }}>
              <div className="tile-label" style={{ '--accent': w.accent }}><Icon name="speed" className="sm" style={{ color: w.accent }} /> Heart Rate Zones</div>
              <HRZoneDonut zones={w.zones} duration={w.duration} />
            </div>
            <div className="tile" style={{ padding: 18, cursor: 'default' }}>
              <div className="tile-label" style={{ '--accent': w.accent }}><Icon name="compare_arrows" className="sm" style={{ color: w.accent }} /> Vs Your Average</div>
              <div className="col" style={{ gap: 10, marginTop: 6 }}>
                {[
                  { label: 'Pace', you: '5:12/km', avg: '5:34/km', better: true },
                  { label: 'Avg HR', you: `${w.avgHr} bpm`, avg: '148 bpm', better: w.avgHr < 148 },
                  { label: 'Cadence', you: '178 spm', avg: '172 spm', better: true },
                  { label: 'Decoupling', you: '3.2%', avg: '5.1%', better: true },
                ].map(r => (
                  <div key={r.label} className="between" style={{ fontSize: 13 }}>
                    <div className="muted">{r.label}</div>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.you}</span>
                      <span className={`delta ${r.better ? 'up' : 'down'}`}>{r.better ? '↑' : '↓'} vs {r.avg}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Splits */}
        <div style={{ marginTop: 16 }}>
          <div className="tile-label" style={{ '--accent': w.accent, marginBottom: 8 }}><Icon name="timeline" className="sm" style={{ color: w.accent }} /> Splits</div>
          <table className="tbl">
            <thead><tr><th>km</th><th>Pace</th><th>Avg HR</th><th>Cadence</th><th>Elev</th><th></th></tr></thead>
            <tbody>
              {Array.from({ length: Math.max(3, Math.floor(w.distance)) }, (_, i) => {
                const pace = 280 + Math.round(Math.sin(i) * 22 + (Math.random() - 0.5) * 8);
                const pm = Math.floor(pace / 60), ps = pace % 60;
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{i + 1}</td>
                    <td>{pm}:{String(ps).padStart(2, '0')}</td>
                    <td>{140 + Math.round(Math.sin(i + 1) * 12 + 8)}</td>
                    <td>{170 + Math.round(Math.cos(i) * 6 + 4)}</td>
                    <td>+{Math.round(8 + Math.abs(Math.sin(i + 2) * 14))} m</td>
                    <td style={{ width: 200 }}>
                      <div style={{ height: 6, background: 'var(--hairline)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${(330 - pace) / 80 * 100}%`, height: '100%', background: w.accent, boxShadow: `0 0 6px ${w.accent}` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HRZoneDonut({ zones, duration }) {
  const total = zones.reduce((a, b) => a + b, 0);
  const cx = 110, cy = 110, r = 78;
  const stroke = 22;
  let acc = 0;
  const colors = ['var(--recovery)', 'var(--steps)', 'var(--train)', 'var(--cardio-soft)', 'var(--cardio)'];
  const c = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 10 }}>
      <svg width={220} height={220}>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {zones.map((z, i) => {
            const frac = z / total;
            const dash = frac * c;
            const offset = -acc;
            acc += dash;
            return (
              <circle key={i} cx={cx} cy={cy} r={r}
                fill="none" stroke={colors[i]} strokeWidth={stroke}
                strokeDasharray={`${dash - 3} ${c}`}
                strokeDashoffset={offset}
                style={{ filter: `drop-shadow(0 0 4px ${colors[i]})`, opacity: 0, animation: `fade-in 0.5s ease ${i * 0.1}s forwards` }}
              />
            );
          })}
        </g>
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" letterSpacing="0.14em" fill="rgba(255,255,255,0.5)" fontWeight="700">TOTAL</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize="22" fill="white" fontWeight="700" fontVariantNumeric="tabular-nums">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2,'0')}</text>
      </svg>
      <div className="col" style={{ gap: 7, flex: 1 }}>
        {zones.map((z, i) => (
          <div key={i} className="between" style={{ fontSize: 12 }}>
            <div className="row" style={{ gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[i] }}></span>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>Z{i + 1}</span>
            </div>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{z}m</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoutePlaybackMap({ path, accent }) {
  const [t, setT] = React.useState(1);
  const ref = React.useRef();
  const [len, setLen] = React.useState(1);

  React.useEffect(() => {
    if (ref.current) {
      try { setLen(ref.current.getTotalLength()); } catch {}
    }
  }, []);

  React.useEffect(() => {
    let raf, start;
    const tick = (now) => {
      if (!start) start = now;
      const elapsed = (now - start) / 4000;
      setT(Math.min(1, elapsed));
      if (elapsed < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  let head = null;
  if (ref.current && len) {
    try {
      const p = ref.current.getPointAtLength(len * t);
      head = { x: p.x, y: p.y };
    } catch {}
  }

  return (
    <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <pattern id="streets-big" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M0 30 L60 30 M30 0 L30 60" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <path d="M0 15 L60 15 M0 45 L60 45 M15 0 L15 60 M45 0 L45 60" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
        </pattern>
        <radialGradient id="map-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(142,123,255,0.16)" />
          <stop offset="1" stopColor="rgba(142,123,255,0)" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#streets-big)" />
      <rect width="800" height="450" fill="url(#map-glow)" />
      {/* big route */}
      <path
        ref={ref}
        d="M 80 320 Q 180 200 280 240 T 460 200 Q 520 180 580 240 T 720 180"
        fill="none"
        stroke={accent}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - t)}
        style={{ filter: `drop-shadow(0 0 8px ${accent})` }}
      />
      {/* Start */}
      <circle cx="80" cy="320" r="8" fill={accent} stroke="white" strokeWidth="2" style={{ filter: `drop-shadow(0 0 8px ${accent})` }} />
      <text x="96" y="324" fontSize="11" fill="white" fontWeight="600" letterSpacing="0.1em">START</text>
      {/* Head */}
      {head && (
        <g>
          <circle cx={head.x} cy={head.y} r="14" fill={accent} opacity="0.3" />
          <circle cx={head.x} cy={head.y} r="6" fill="white" stroke={accent} strokeWidth="3" />
        </g>
      )}
    </svg>
  );
}

// ========================= AWARDS =========================
const CAT_ICONS = {
  Streaks: 'local_fire_department',
  Volume: 'route',
  Performance: 'bolt',
  Recovery: 'spa',
  Habits: 'wb_sunny',
  Variety: 'shuffle',
  Heart: 'favorite',
};

function ScreenAwards({ onUnlock }) {
  const earned = awards.filter(a => a.unlocked).length;
  const cats = Array.from(new Set(awards.map(a => a.cat)));
  const [filter, setFilter] = React.useState('All');

  const closeToUnlock = awards
    .filter(a => !a.unlocked && a.progress >= 0.7)
    .sort((a, b) => b.progress - a.progress);

  const filtered = filter === 'All' ? awards : awards.filter(a => a.cat === filter);
  const filteredCats = filter === 'All' ? cats : [filter];

  return (
    <div className="stagger">
      <div className="tile tile-flat" style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 24 }}>
        <div>
          <div className="tile-label" style={{ '--accent': 'var(--train)' }}>
            <Icon name="emoji_events" fill className="sm" style={{ color: 'var(--train)' }} /> Trophy Room
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, marginTop: 8 }}>
            <NumberTicker value={earned} /><span className="tile-unit" style={{ fontSize: 20 }}>/{awards.length}</span>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>awards unlocked</div>
          <div style={{ height: 6, background: 'var(--hairline)', borderRadius: 3, overflow: 'hidden', marginTop: 14 }}>
            <div style={{ width: `${earned / awards.length * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--train), var(--cardio))', boxShadow: '0 0 8px var(--train)', animation: 'zone-grow 1.2s var(--ease-spring) both', transformOrigin: 'left' }} />
          </div>
        </div>
        <div className="col" style={{ justifyContent: 'center', gap: 8 }}>
          <div className="muted" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>By Tier</div>
          {[
            { tier: 'Bronze', c: '#CD7F32', icon: 'workspace_premium', n: awards.filter(a => a.unlocked && a.tier === 'Bronze').length, tot: awards.filter(a => a.tier === 'Bronze').length },
            { tier: 'Silver', c: '#C0C0C0', icon: 'workspace_premium', n: awards.filter(a => a.unlocked && a.tier === 'Silver').length, tot: awards.filter(a => a.tier === 'Silver').length },
            { tier: 'Gold',   c: '#FFD700', icon: 'workspace_premium', n: awards.filter(a => a.unlocked && a.tier === 'Gold').length, tot: awards.filter(a => a.tier === 'Gold').length },
            { tier: 'Platinum', c: '#E5E4E2', icon: 'diamond', n: awards.filter(a => a.unlocked && a.tier === 'Platinum').length, tot: awards.filter(a => a.tier === 'Platinum').length },
          ].map(t => (
            <div key={t.tier} className="between" style={{ fontSize: 13 }}>
              <div className="row" style={{ gap: 8 }}>
                <Icon name={t.icon} fill className="sm" style={{ color: t.c, filter: `drop-shadow(0 0 4px ${t.c})` }} />
                <span>{t.tier}</span>
              </div>
              <span className="mono" style={{ fontWeight: 700 }}>{t.n}<span style={{ color: 'var(--text-3)', fontWeight: 500 }}>/{t.tot}</span></span>
            </div>
          ))}
        </div>
        <div className="col" style={{ justifyContent: 'center' }}>
          <div className="muted" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Latest unlock</div>
          <div className="row" style={{ gap: 14 }}>
            <div style={{ width: 64, height: 64 }}><BadgeArt kind="lightning" accent="var(--cardio)" tier="Gold" /></div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>5k PR — 21:14</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Earned 11 May · Gold tier</div>
              <button
                onClick={() => onUnlock(awards.find(a => a.id === 'pr5k'))}
                style={{
                  marginTop: 8,
                  padding: '6px 12px',
                  background: 'var(--glass-bright)',
                  border: '1px solid var(--hairline-bright)',
                  borderRadius: 999,
                  color: 'var(--text-1)',
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}><Icon name="replay" className="sm" style={{ fontSize: 12 }} /> Replay unlock</button>
            </div>
          </div>
        </div>
      </div>

      {/* Almost There highlight strip */}
      {closeToUnlock.length > 0 && (
        <div className="tile tile-flat" style={{ marginBottom: 24, padding: 20, background: 'linear-gradient(135deg, rgba(255,181,71,0.08), rgba(255,92,108,0.04))', border: '1px solid rgba(255,181,71,0.18)' }}>
          <div className="between" style={{ marginBottom: 14 }}>
            <div className="tile-label" style={{ '--accent': 'var(--train)' }}>
              <Icon name="trending_up" className="sm" style={{ color: 'var(--train)' }} /> Almost There
            </div>
            <div className="muted" style={{ fontSize: 11 }}>{closeToUnlock.length} unlock{closeToUnlock.length === 1 ? '' : 's'} within reach</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {closeToUnlock.map(a => (
              <div key={a.id} className="upnext-card" style={{ '--accent': a.accent, '--accent-fade': a.accent.replace('var(', 'rgba(').replace(')', ', 0.15)') }}>
                <div className="upnext-badge"><BadgeArt kind={a.badge} accent={a.accent} tier={a.tier} /></div>
                <div className="upnext-info">
                  <div className="upnext-name">{a.name}</div>
                  <div className="upnext-progress-bar"><div className="upnext-progress-fill" style={{ width: `${a.progress * 100}%`, animation: 'zone-grow 1s var(--ease-spring) both', transformOrigin: 'left' }} /></div>
                  <div className="upnext-progress-text">{Math.round(a.progress * 100)}% · {a.tier} tier</div>
                </div>
                <div className="upnext-pct" style={{ color: a.accent }}>{Math.round(a.progress * 100)}<span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>%</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="range-tabs" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        <button className={`range-tab ${filter === 'All' ? 'active' : ''}`} onClick={() => setFilter('All')}>All</button>
        {cats.map(c => (
          <button key={c} className={`range-tab ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name={CAT_ICONS[c] || 'workspace_premium'} className="sm" style={{ fontSize: 13 }} /> {c}
          </button>
        ))}
      </div>

      {filteredCats.map(cat => {
        const items = filtered.filter(a => a.cat === cat);
        if (!items.length) return null;
        return (
          <div key={cat} style={{ marginBottom: 28 }}>
            <div className="between" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={CAT_ICONS[cat] || 'workspace_premium'} className="sm" style={{ color: 'var(--text-2)' }} />
                {cat}
              </div>
              <div className="muted" style={{ fontSize: 11 }}>{items.filter(i => i.unlocked).length} / {items.length}</div>
            </div>
            <div className="awards-grid">
              {items.map(a => <AwardCard key={a.id} a={a} onClick={() => a.unlocked && onUnlock(a)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AwardCard({ a, onClick }) {
  return (
    <div className={`award-card ${a.unlocked ? '' : 'locked'}`} onClick={onClick} style={{ '--accent': a.accent, '--accent-glow': a.accent.replace('var(', 'var(').replace(')', '-glow)') }}>
      <div className="award-tier">{a.tier}</div>
      <div className="award-badge"><BadgeArt kind={a.badge} accent={a.accent} tier={a.tier} locked={!a.unlocked} /></div>
      <div className="col" style={{ gap: 4 }}>
        <div className="award-name">{a.name}</div>
        {!a.unlocked && (
          <>
            <div className="award-progress"><div className="award-progress-fill" style={{ width: `${a.progress * 100}%`, background: a.accent }}></div></div>
            <div className="muted" style={{ fontSize: 10, textAlign: 'center', marginTop: 2 }}>{Math.round(a.progress * 100)}%</div>
          </>
        )}
        {a.unlocked && a.earned && <div className="muted" style={{ fontSize: 10, textAlign: 'center' }}>{a.earned}</div>}
      </div>
    </div>
  );
}

function BadgeArt({ kind, accent, tier, locked }) {
  const tierColors = {
    Bronze: ['#CD7F32', '#8B5A2B'],
    Silver: ['#E8E8E8', '#A8A8A8'],
    Gold: ['#FFE066', '#D4A017'],
    Platinum: ['#F5F5F5', '#B8B8C8'],
  };
  const [c1, c2] = tierColors[tier] || ['#FFE066', '#D4A017'];
  const gid = `bg-${kind}-${tier}-${Math.random().toString(36).slice(2, 6)}`;

  const glyphs = {
    flame: <path d="M44 24 C 38 30, 32 36, 32 50 C 32 60, 40 68, 44 68 C 48 68, 56 60, 56 50 C 56 40, 50 36, 50 30 C 48 32, 46 26, 44 24 Z" fill={accent} opacity="0.92" />,
    rings: <g><circle cx="44" cy="46" r="14" stroke={accent} strokeWidth="3" fill="none" /><circle cx="44" cy="46" r="9" stroke="white" strokeWidth="3" fill="none" opacity="0.7" /><circle cx="44" cy="46" r="4" fill={accent} /></g>,
    mountain: <path d="M22 60 L36 36 L46 50 L56 32 L66 60 Z" fill={accent} opacity="0.9" />,
    shoe: <path d="M24 56 Q 24 40, 38 38 Q 50 36, 56 42 L 64 52 L 64 58 Z" fill={accent} opacity="0.9" />,
    peak: <g><path d="M24 60 L36 28 L44 44 L52 22 L64 60 Z" fill={accent} opacity="0.9" /><path d="M40 32 L36 28 L40 44 Z" fill="white" opacity="0.4" /></g>,
    medal: <g><circle cx="44" cy="46" r="14" fill={accent} opacity="0.9" /><path d="M36 26 L44 36 L52 26" stroke={accent} strokeWidth="2.5" fill="none" /></g>,
    lightning: <path d="M48 18 L 32 46 L 42 46 L 38 68 L 56 38 L 46 38 Z" fill={accent} opacity="0.95" />,
    heart: <path d="M44 64 C 26 52, 22 38, 30 32 C 38 28, 42 32, 44 36 C 46 32, 50 28, 58 32 C 66 38, 62 52, 44 64 Z" fill={accent} opacity="0.92" />,
    leaf: <path d="M44 22 C 28 32, 26 56, 44 66 C 62 56, 60 32, 44 22 Z M 44 28 L 44 60" fill={accent} opacity="0.9" />,
    sun: <g><circle cx="44" cy="46" r="10" fill={accent} /><g stroke={accent} strokeWidth="3" strokeLinecap="round">{[0,45,90,135,180,225,270,315].map(deg => { const a = deg * Math.PI / 180; return <line key={deg} x1={44 + Math.cos(a) * 18} y1={46 + Math.sin(a) * 18} x2={44 + Math.cos(a) * 26} y2={46 + Math.sin(a) * 26} />; })}</g></g>,
    moon: <path d="M52 26 C 38 26, 30 38, 32 50 C 34 60, 48 68, 58 62 C 46 60, 38 52, 38 42 C 38 34, 44 28, 52 26 Z" fill={accent} opacity="0.9" />,
    shield: <path d="M44 22 L 28 30 L 28 48 Q 28 60, 44 68 Q 60 60, 60 48 L 60 30 Z" fill={accent} opacity="0.9" />,
    tri: <g><circle cx="32" cy="56" r="6" fill={accent} /><circle cx="56" cy="56" r="6" fill={accent} /><path d="M40 30 L 48 30 L 44 50 Z" fill={accent} /></g>,
    zones: <g>{[0,1,2,3,4].map(i => <rect key={i} x={22 + i * 8} y={56 - i * 6} width="6" height={12 + i * 6} fill={accent} opacity={0.4 + i * 0.14} rx="1" />)}</g>,
  };

  return (
    <svg viewBox="0 0 88 88">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
        <radialGradient id={gid + '-shine'} cx="0.3" cy="0.3" r="0.5">
          <stop offset="0" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      {/* Outer hex/circle plinth */}
      <circle cx="44" cy="44" r="38" fill={`url(#${gid})`} opacity={locked ? 0.45 : 0.92} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
      <circle cx="44" cy="44" r="38" fill={`url(#${gid}-shine)`} />
      <circle cx="44" cy="44" r="32" fill="rgba(10,8,16,0.55)" />
      {/* Inner glyph */}
      {glyphs[kind] || glyphs.flame}
      {/* Tier ring */}
      <circle cx="44" cy="44" r="38" fill="none" stroke={c1} strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

// ========================= CALENDAR / HISTORY =========================
function ScreenCalendar() {
  const months = ['JUN','JUL','AUG','SEP','OCT','NOV','DEC','JAN','FEB','MAR','APR','MAY'];
  // group by week (52 columns)
  const weeks = [];
  let curWeek = [];
  calendarData.forEach((d, i) => {
    curWeek.push(d);
    if (curWeek.length === 7) { weeks.push(curWeek); curWeek = []; }
  });
  if (curWeek.length) weeks.push(curWeek);

  const totalActive = calendarData.filter(d => d.level > 0).length;
  const totalDays = calendarData.length;

  return (
    <div className="stagger" style={{ display: 'grid', gap: 16 }}>
      <HoverTile tilt={false}>
        <div className="between" style={{ marginBottom: 18 }}>
          <div>
            <div className="tile-label" style={{ '--accent': 'var(--steps)' }}>
              <Icon name="calendar_month" className="sm" style={{ color: 'var(--steps)' }} /> Activity Calendar · Last 365 Days
            </div>
            <div style={{ display: 'flex', gap: 28, marginTop: 12 }}>
              <div><div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}><NumberTicker value={totalActive} /></div><div className="muted" style={{ fontSize: 11 }}>active days</div></div>
              <div><div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--steps)' }}><NumberTicker value={Math.round(totalActive / totalDays * 100)} format={v => Math.round(v) + '%'} /></div><div className="muted" style={{ fontSize: 11 }}>consistency</div></div>
              <div><div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}>31</div><div className="muted" style={{ fontSize: 11 }}>longest streak</div></div>
            </div>
          </div>
          <div className="row" style={{ gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
            <span>Less</span>
            {[0,1,2,3,4,5].map(l => <div key={l} className="heatmap-cell" data-level={l || ''} style={{ cursor: 'default' }} />)}
            <span>More</span>
          </div>
        </div>

        <div className="heatmap-wrap scroller">
          <div style={{ display: 'flex', gap: 16, fontSize: 9, color: 'var(--text-3)', marginBottom: 6, paddingLeft: 28, letterSpacing: '0.14em', fontWeight: 600 }}>
            {months.map(m => <span key={m} style={{ flex: 1, minWidth: 50 }}>{m}</span>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 6, alignItems: 'start' }}>
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 14px)', gap: 3, fontSize: 9, color: 'var(--text-3)' }}>
              <span></span><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span>
            </div>
            <div className="heatmap">
              {weeks.flatMap((week, wi) =>
                week.map((d, di) => (
                  <div
                    key={`${wi}-${di}`}
                    className="heatmap-cell"
                    data-level={d.level || ''}
                    title={`${d.date.toLocaleDateString()} · level ${d.level}`}
                    style={{ animation: `pop 0.4s var(--ease-spring) ${(wi * 7 + di) * 0.003}s both` }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </HoverTile>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <HoverTile tilt={false}>
          <div className="tile-label" style={{ '--accent': 'var(--steps)' }}><Icon name="star" fill className="sm" style={{ color: 'var(--steps)' }} /> Best Months</div>
          <div className="col" style={{ gap: 12, marginTop: 12 }}>
            {[
              { m: 'November 2025', n: 28, t: '52h 12m', acc: 'var(--steps)' },
              { m: 'April 2026', n: 26, t: '47h 30m', acc: 'var(--train)' },
              { m: 'February 2026', n: 24, t: '43h 18m', acc: 'var(--cardio)' },
              { m: 'September 2025', n: 22, t: '38h 04m', acc: 'var(--recovery)' },
            ].map(b => (
              <div key={b.m} className="between" style={{ padding: '10px 0', borderBottom: '1px solid var(--hairline)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.m}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{b.n} active days · {b.t}</div>
                </div>
                <div style={{ width: 100, height: 6, background: 'var(--hairline)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(b.n / 30) * 100}%`, height: '100%', background: b.acc, boxShadow: `0 0 6px ${b.acc}`, animation: 'zone-grow 1s var(--ease-spring) both', transformOrigin: 'left' }} />
                </div>
              </div>
            ))}
          </div>
        </HoverTile>
        <HoverTile tilt={false}>
          <div className="tile-label" style={{ '--accent': 'var(--cardio)' }}><Icon name="military_tech" fill className="sm" style={{ color: 'var(--cardio)' }} /> Personal Records</div>
          <div className="col" style={{ gap: 12, marginTop: 12 }}>
            {[
              { name: '5k', v: '21:14', d: '11 May 2026', acc: 'var(--cardio)' },
              { name: '10k', v: '44:08', d: '28 Apr 2026', acc: 'var(--cardio)' },
              { name: 'Half Marathon', v: '1:38:22', d: '12 Mar 2026', acc: 'var(--cardio)' },
              { name: 'Longest Run', v: '32.1 km', d: '04 Feb 2026', acc: 'var(--train)' },
              { name: 'Biggest Week', v: '852 TSS', d: '07 Apr 2026', acc: 'var(--train)' },
              { name: 'Lowest RHR', v: '47 bpm', d: '14 May 2026', acc: 'var(--recovery)' },
            ].map(p => (
              <div key={p.name} className="between" style={{ padding: '8px 0', borderBottom: '1px solid var(--hairline)' }}>
                <div>
                  <div className="muted" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: p.acc }}>{p.v}</div>
                </div>
                <div className="muted" style={{ fontSize: 11 }}>{p.d}</div>
              </div>
            ))}
          </div>
        </HoverTile>
      </div>
    </div>
  );
}

window.ScreenWorkouts = ScreenWorkouts;
window.WorkoutDetail = WorkoutDetail;
window.ScreenAwards = ScreenAwards;
window.ScreenCalendar = ScreenCalendar;
window.BadgeArt = BadgeArt;
