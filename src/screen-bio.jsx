/* global React, ActivityRings, Sparkline, NumberTicker, HoverTile, RangeTabs, HeartIcon, Gauge, Heatbar, RouteMap, Icon, ChartTooltip, wellness, todayW, workouts, lastNight, hrZones, streaks, awards, calendarData */

// helpful: turn wellness slice into labels
var fmtDateLabel = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ========================= SLEEP =========================
function ScreenSleep() {
  const [range, setRange] = React.useState('30D');
  const days = range === '7D' ? 7 : range === '30D' ? 30 : range === '90D' ? 90 : 90;
  const slice = wellness.slice(-days);

  return (
    <div className="stagger" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
      {/* Last night detail */}
      <HoverTile tilt={false} style={{ gridColumn: '1 / -1' }}>
        <div className="between" style={{ marginBottom: 16 }}>
          <div>
            <div className="tile-label" style={{ '--accent': 'var(--sleep)' }}>
              <Icon name="bedtime" fill className="sm" style={{ color: 'var(--sleep)' }} /> Last Night
            </div>
            <div style={{ display: 'flex', gap: 32, alignItems: 'baseline', marginTop: 8 }}>
              <div>
                <div className="tile-value">
                  <NumberTicker value={Math.floor(lastNight.totalSec / 3600)} /><span className="tile-unit" style={{ marginLeft: -3 }}>h</span>
                  <NumberTicker value={Math.floor(lastNight.totalSec % 3600 / 60)} format={(v) => ' ' + Math.round(v)} /><span className="tile-unit" style={{ marginLeft: -3 }}>m</span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{lastNight.bedAt} → {lastNight.wakeAt}</div>
              </div>
              <div>
                <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--sleep-soft)' }}>
                  <NumberTicker value={lastNight.score} />
                </div>
                <div className="muted" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4, fontWeight: 600 }}>Score</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)' }}>{lastNight.quality}</div>
                <div className="muted" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4, fontWeight: 600 }}>Quality</div>
              </div>
            </div>
          </div>
          <SleepLegend />
        </div>
        <SleepHypnogram stages={lastNight.stages} />
      </HoverTile>

      {/* Sleep score trend */}
      <HoverTile tilt={false}>
        <div className="between" style={{ marginBottom: 12 }}>
          <div className="tile-label" style={{ '--accent': 'var(--sleep)' }}>
            <Icon name="insights" className="sm" style={{ color: 'var(--sleep)' }} /> Sleep Score Trend
          </div>
          <RangeTabs value={range} onChange={setRange} options={['7D', '30D', '90D']} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div className="tile-value">
            <NumberTicker value={slice.reduce((a, d) => a + d.sleepScore, 0) / slice.length} format={(v) => v.toFixed(0)} />
          </div>
          <div className="muted" style={{ fontSize: 13 }}>{days}-day average</div>
        </div>
        <Sparkline data={slice.map((d) => d.sleepScore)} color="var(--sleep)" height={110}
          labels={slice.map((d) => fmtDateLabel(d.date))} unit="pts" />
      </HoverTile>

      {/* Bedtime consistency */}
      <HoverTile tilt={false}>
        <div className="tile-label" style={{ '--accent': 'var(--sleep)' }}>
          <Icon name="schedule" className="sm" style={{ color: 'var(--sleep)' }} /> Bedtime Consistency
        </div>
        <BedtimeClock />
        <div className="between" style={{ marginTop: 14 }}>
          <div className="col">
            <div className="muted" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Avg bed</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>23:38</div>
          </div>
          <div className="col">
            <div className="muted" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Avg wake</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>07:14</div>
          </div>
          <div className="col">
            <div className="muted" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Variance</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--steps)' }}>±18m</div>
          </div>
        </div>
      </HoverTile>
    </div>);

}

function SleepLegend() {
  const items = [
  { name: 'Deep', c: 'var(--sleep)' },
  { name: 'REM', c: 'var(--cardio-soft)' },
  { name: 'Light', c: 'var(--recovery)' },
  { name: 'Awake', c: 'var(--train)' }];

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      {items.map((i) =>
      <div key={i.name} className="row" style={{ gap: 6, fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: i.c, boxShadow: `0 0 6px ${i.c}` }}></span> {i.name}
        </div>
      )}
    </div>);

}

function SleepHypnogram({ stages }) {
  // stages: [stage, startMin, duration]
  const ref = React.useRef();
  const [w, setW] = React.useState(800);
  const [hover, setHover] = React.useState(null);
  React.useEffect(() => {
    const obs = new ResizeObserver(([e]) => setW(e.contentRect.width || 800));
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const totalMin = stages[stages.length - 1][1] + stages[stages.length - 1][2];
  const height = 200;
  const rowY = { awake: 20, rem: 60, light: 110, deep: 165 };
  const colors = { awake: 'var(--train)', rem: 'var(--cardio-soft)', light: 'var(--recovery)', deep: 'var(--sleep)' };
  const px = (m) => m / totalMin * w;

  // base bed time → build clock-time string from min offset
  const fmtTime = (minFromBed) => {
    const baseH = 23, baseM = 42;
    const tot = baseH * 60 + baseM + minFromBed;
    const h = Math.floor(tot / 60) % 24;
    const m = tot % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div ref={ref} className="chart-wrap" style={{ width: '100%', position: 'relative' }}>
      <svg width={w} height={height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        {/* Row labels */}
        {Object.entries(rowY).map(([k, y]) =>
        <g key={k}>
            <text x={0} y={y - 12} fontSize="9" fontWeight="700" letterSpacing="0.16em" textTransform="uppercase" fill="rgba(255,255,255,0.4)">{k.toUpperCase()}</text>
            <line x1={50} x2={w} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 4" />
          </g>
        )}
        {/* Stage bars */}
        {stages.map((s, i) => {
          const [stage, start, dur] = s;
          const offset = 50;
          const x1 = start / totalMin * (w - offset) + offset;
          const x2 = (start + dur) / totalMin * (w - offset) + offset;
          const y = rowY[stage];
          return (
            <g key={i}>
              <rect
                className="hypno-bar"
                x={x1} y={y - 10}
                width={Math.max(2, x2 - x1)} height={20}
                rx={4}
                fill={colors[stage]}
                style={{
                  opacity: 0,
                  color: colors[stage],
                  animation: `fade-in 0.4s ease ${0.1 + i * 0.03}s forwards, zone-grow 0.5s var(--ease-spring) ${0.1 + i * 0.03}s both`,
                  transformOrigin: `${x1}px ${y}px`,
                  filter: `drop-shadow(0 0 6px ${colors[stage]})`
                }}
                onMouseEnter={() => setHover({ stage, start, dur, x: (x1 + x2) / 2, y })}
                onMouseLeave={() => setHover(null)} />
              {/* Connecting transitions */}
              {i < stages.length - 1 && (() => {
                const next = stages[i + 1];
                const ny = rowY[next[0]];
                const cx = x2;
                return <line x1={cx} y1={y} x2={cx} y2={ny} stroke={colors[stage]} strokeOpacity="0.3" strokeWidth="1.5" style={{ opacity: 0, animation: `fade-in 0.3s ease ${0.4 + i * 0.03}s forwards` }} />;
              })()}
            </g>);

        })}
        {/* Time axis */}
        <text x={50} y={height - 4} fontSize="10" fill="rgba(255,255,255,0.4)" fontVariantNumeric="tabular-nums">23:42</text>
        <text x={w - 30} y={height - 4} fontSize="10" fill="rgba(255,255,255,0.4)" fontVariantNumeric="tabular-nums">07:18</text>
      </svg>
      {hover && (
        <ChartTooltip
          visible
          x={hover.x}
          y={hover.y}
          accent={colors[hover.stage]}
          label={hover.stage.toUpperCase()}
          value={`${hover.dur}m`}
          sub={`${fmtTime(hover.start)} → ${fmtTime(hover.start + hover.dur)}`}
        />
      )}
    </div>);

}

function BedtimeClock() {
  // Plot bedtime/wake points around a 24h clock
  const size = 220;
  const cx = size / 2,cy = size / 2;
  const r = size / 2 - 22;
  const [hover, setHover] = React.useState(null);
  const points = wellness.slice(-30).map((d, i) => {
    // Fake: bedtime around 23:38 ± variance
    const bed = 23 + Math.sin(i * 0.7) * 0.3 + 38 / 60;
    const wake = 7 + Math.cos(i * 0.5) * 0.2 + 14 / 60;
    return { bed, wake, i, date: d.date };
  });
  const toXY = (hour, rad = r) => {
    const a = hour / 24 * Math.PI * 2 - Math.PI / 2;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const hourFmt = (h) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  return (
    <div className="chart-wrap" style={{ display: 'flex', justifyContent: 'center', marginTop: 10, position: 'relative' }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        {/* Night arc */}
        {(() => {
          const a1 = 22 / 24 * Math.PI * 2 - Math.PI / 2;
          const a2 = 8 / 24 * Math.PI * 2 - Math.PI / 2 + Math.PI * 2;
          const x1 = cx + r * Math.cos(a1),y1 = cy + r * Math.sin(a1);
          const x2 = cx + r * Math.cos(a2),y2 = cy + r * Math.sin(a2);
          return <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`} fill="none" stroke="rgba(142,123,255,0.18)" strokeWidth="14" strokeLinecap="round" />;
        })()}
        {/* Hour ticks */}
        {[0, 6, 12, 18].map((h) => {
          const [x, y] = toXY(h, r + 12);
          return <text key={h} x={x} y={y + 3} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)" fontVariantNumeric="tabular-nums">{h}h</text>;
        })}
        {/* Bedtime points */}
        {points.map((p, i) => {
          const [bx, by] = toXY(p.bed);
          const [wx, wy] = toXY(p.wake);
          const isHover = hover && hover.i === i;
          return (
            <g key={i} style={{ animation: `pop 0.5s var(--ease-spring) ${0.05 * i}s both` }}>
              <circle className="bedtime-pt" cx={bx} cy={by} r={isHover ? 5 : 2.5} fill="var(--sleep)"
                style={{ filter: isHover ? 'drop-shadow(0 0 6px var(--sleep))' : 'none' }}
                onMouseEnter={() => setHover({ ...p, kind: 'bed', x: bx, y: by })}
                onMouseLeave={() => setHover(null)} />
              <circle className="bedtime-pt" cx={wx} cy={wy} r={isHover ? 5 : 2.5} fill="var(--train)"
                style={{ filter: isHover ? 'drop-shadow(0 0 6px var(--train))' : 'none' }}
                onMouseEnter={() => setHover({ ...p, kind: 'wake', x: wx, y: wy })}
                onMouseLeave={() => setHover(null)} />
            </g>);

        })}
        {/* Center label */}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" letterSpacing="0.18em" fill="rgba(255,255,255,0.4)" fontWeight="700">30 NIGHTS</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize="22" fill="white" fontWeight="700" letterSpacing="-0.02em">7h 36m</text>
      </svg>
      {hover && (
        <ChartTooltip
          visible
          x={hover.x}
          y={hover.y}
          accent={hover.kind === 'bed' ? 'var(--sleep)' : 'var(--train)'}
          label={hover.kind === 'bed' ? 'BEDTIME' : 'WAKE'}
          value={hourFmt(hover.kind === 'bed' ? hover.bed : hover.wake)}
          sub={hover.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        />
      )}
    </div>);

}

// ========================= HEART =========================
function ScreenHeart() {
  const [range, setRange] = React.useState('30D');
  const days = range === '7D' ? 7 : range === '30D' ? 30 : 90;
  const slice = wellness.slice(-days);

  return (
    <div className="stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
      <HoverTile tilt={false} style={{ gridColumn: '1 / -1' }}>
        <div className="between">
          <div>
            <div className="tile-label" style={{ '--accent': 'var(--cardio)' }}>
              <Icon name="favorite" fill className="sm" style={{ color: 'var(--cardio)' }} /> Resting Heart Rate
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginTop: 10 }}>
              <div className="row" style={{ gap: 18 }}>
                <div className="heart-wrap" style={{ width: 96, height: 96 }}>
                  <div className="heart-ring"></div>
                  <div className="heart-shape" style={{ width: 78, height: 78 }}><HeartIcon /></div>
                </div>
                <div>
                  <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 0.9 }}>
                    <NumberTicker value={todayW.rhr} />
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                    bpm · 7-day avg <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{Math.round(slice.slice(-7).reduce((a, d) => a + d.rhr, 0) / 7)}</span>
                  </div>
                  <div className="row" style={{ gap: 8, marginTop: 8 }}>
                    <span className="delta down">−6 bpm vs 90-day</span>
                    <span style={{ fontSize: 11, color: 'var(--steps)' }}>Improving</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <RangeTabs value={range} onChange={setRange} options={['7D', '30D', '90D']} />
        </div>
        <Sparkline data={slice.map((d) => d.rhr)} color="var(--cardio)" height={150}
          labels={slice.map((d) => fmtDateLabel(d.date))} unit="bpm" />
      </HoverTile>

      <HoverTile tilt={false}>
        <div className="tile-label" style={{ '--accent': 'var(--recovery)' }}>
          <Icon name="ecg_heart" className="sm" style={{ color: 'var(--recovery)' }} /> HRV (RMSSD)
        </div>
        <div className="tile-value" style={{ fontSize: 44 }}>
          <NumberTicker value={todayW.hrv} /><span className="tile-unit">ms</span>
        </div>
        <div className="tile-sub" style={{ marginBottom: 6 }}>
          <span className="delta up">+12% baseline</span>
        </div>
        <Sparkline data={slice.map((d) => d.hrv)} color="var(--recovery)" height={88}
          labels={slice.map((d) => fmtDateLabel(d.date))} unit="ms" />
      </HoverTile>

      <HoverTile tilt={false}>
        <div className="tile-label" style={{ '--accent': 'var(--cardio)' }}>
          <Icon name="speed" className="sm" style={{ color: 'var(--cardio)' }} /> Time in Zones (Today)
        </div>
        <div style={{ marginTop: 4 }}>
          {hrZones.map((z) =>
          <div key={z.name} className="zone-row">
              <div className="zone-label">{z.name} <span className="muted" style={{ fontSize: 10, marginLeft: 4 }}>{z.label}</span></div>
              <div className="zone-bar"><div className="zone-bar-fill" style={{ '--c': z.color, width: `${z.mins / 70 * 100}%` }}></div></div>
              <div className="zone-time">{z.mins} min</div>
            </div>
          )}
        </div>
      </HoverTile>

      <HoverTile tilt={false}>
        <div className="tile-label" style={{ '--accent': 'var(--cardio)' }}>
          <Icon name="bar_chart" className="sm" style={{ color: 'var(--cardio)' }} /> Max HR Distribution
        </div>
        <MaxHrDistribution />
      </HoverTile>
    </div>);

}

function MaxHrDistribution() {
  const bins = [
  { range: '140-150', n: 4, c: 'var(--steps)' },
  { range: '150-160', n: 12, c: 'var(--steps)' },
  { range: '160-170', n: 22, c: 'var(--train)' },
  { range: '170-180', n: 38, c: 'var(--train)' },
  { range: '180-190', n: 28, c: 'var(--cardio-soft)' },
  { range: '190-200', n: 9, c: 'var(--cardio)' }];

  const max = Math.max(...bins.map((b) => b.n));
  const [hover, setHover] = React.useState(null);
  const ref = React.useRef();

  return (
    <div ref={ref} className="chart-wrap" style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, marginTop: 16, padding: '0 4px', position: 'relative' }}>
      {bins.map((b, i) =>
      <div key={b.range} className="col" style={{ flex: 1, alignItems: 'center', gap: 6, position: 'relative' }}
        onMouseEnter={(e) => {
          const r = ref.current.getBoundingClientRect();
          const br = e.currentTarget.getBoundingClientRect();
          setHover({ ...b, x: br.left - r.left + br.width / 2, y: br.top - r.top + (140 - b.n / max * 110) - 14 });
        }}
        onMouseLeave={() => setHover(null)}>
          <div style={{ fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)', opacity: hover && hover.range === b.range ? 0 : 1, transition: 'opacity 0.2s' }}>{b.n}</div>
          <div style={{
          width: '100%',
          height: `${b.n / max * 110}px`,
          background: b.c,
          borderRadius: '6px 6px 2px 2px',
          boxShadow: `0 0 14px ${b.c}, inset 0 1px 0 rgba(255,255,255,0.2)`,
          animation: `zone-grow 1s var(--ease-spring) ${i * 0.06}s both`,
          transformOrigin: 'bottom',
          cursor: 'crosshair',
          filter: hover && hover.range === b.range ? `brightness(1.3) drop-shadow(0 0 12px ${b.c})` : 'none',
          transition: 'filter 0.2s'
        }} />
          <div style={{ fontSize: 9, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>{b.range}</div>
        </div>
      )}
      {hover && (
        <ChartTooltip
          visible
          x={hover.x}
          y={hover.y}
          accent={hover.c}
          label={`${hover.range} bpm`}
          value={hover.n}
          unit="workouts"
        />
      )}
    </div>);

}

// ========================= TRAINING LOAD =========================
function ScreenTraining() {
  const [range, setRange] = React.useState('90D');
  const days = range === '30D' ? 30 : range === '90D' ? 90 : 90;
  const slice = wellness.slice(-days);

  return (
    <div className="stagger" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <HoverTile tilt={false} style={{ gridColumn: '1 / -1' }}>
        <div className="between">
          <div>
            <div className="tile-label" style={{ '--accent': 'var(--train)' }}>
              <Icon name="monitoring" className="sm" style={{ color: 'var(--train)' }} /> Performance Management
            </div>
            <div style={{ display: 'flex', gap: 30, marginTop: 12 }}>
              <Metric label="Fitness · CTL" v={todayW.ctl.toFixed(0)} color="var(--recovery)" />
              <Metric label="Fatigue · ATL" v={todayW.atl.toFixed(0)} color="var(--cardio)" />
              <Metric label="Form · TSB" v={(todayW.tsb >= 0 ? '+' : '') + todayW.tsb.toFixed(0)} color={todayW.tsb >= 0 ? 'var(--steps)' : 'var(--train)'} />
              <Metric label="Ramp" v={todayW.rampRate.toFixed(1) + '/wk'} color={todayW.rampRate > 6 ? 'var(--cardio)' : 'var(--text-1)'} />
            </div>
          </div>
          <RangeTabs value={range} onChange={setRange} options={['30D', '90D', '1Y']} />
        </div>
        <PMCChart data={slice} />
      </HoverTile>

      <HoverTile tilt={false}>
        <div className="tile-label" style={{ '--accent': 'var(--train)' }}>
          <Icon name="calendar_view_week" className="sm" style={{ color: 'var(--train)' }} /> Weekly Volume
        </div>
        <WeeklyVolume />
      </HoverTile>

      <HoverTile tilt={false}>
        <div className="tile-label" style={{ '--accent': todayW.rampRate > 6 ? 'var(--cardio)' : 'var(--steps)' }}>
          <Icon name="warning" className="sm" style={{ color: todayW.rampRate > 6 ? 'var(--cardio)' : 'var(--steps)' }} /> Ramp Rate Watch
        </div>
        <RampGauge value={todayW.rampRate} />
      </HoverTile>
    </div>);

}

function Metric({ label, v, color }) {
  return (
    <div className="col">
      <div style={{ fontSize: 10, letterSpacing: '0.14em', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color, marginTop: 4, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {v}
      </div>
    </div>);

}

function PMCChart({ data }) {
  const ref = React.useRef();
  const [w, setW] = React.useState(900);
  const [hover, setHover] = React.useState(null);
  React.useEffect(() => {
    const obs = new ResizeObserver(([e]) => setW(e.contentRect.width || 900));
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const h = 260;
  const max = Math.max(...data.map((d) => Math.max(d.atl, d.ctl))) * 1.15;
  const min = Math.min(...data.map((d) => d.tsb), 0);
  const tsbRange = max - min;
  const px = (i) => i / (data.length - 1) * (w - 40) + 20;
  const py = (v) => h - 20 - (v - min) / tsbRange * (h - 40);

  const ctlPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(d.ctl)}`).join(' ');
  const atlPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(d.atl)}`).join(' ');
  const tsbPath = `M ${px(0)} ${py(0)} ` + data.map((d, i) => `L ${px(i)} ${py(d.tsb)}`).join(' ') + ` L ${px(data.length - 1)} ${py(0)} Z`;

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round((x - 20) / ((w - 40) / (data.length - 1)))));
    setHover({ idx, x: px(idx) });
  };
  const hd = hover ? data[hover.idx] : null;

  return (
    <div ref={ref} className="chart-wrap" style={{ marginTop: 16, position: 'relative' }}>
      <svg width={w} height={h}>
        <defs>
          <linearGradient id="atl-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--cardio)" stopOpacity="0.3" />
            <stop offset="1" stopColor="var(--cardio)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tsb-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--steps)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--steps)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const y = 20 + p * (h - 40);
          return <line key={p} x1={20} x2={w - 20} y1={y} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="2 4" />;
        })}
        {/* Zero line */}
        <line x1={20} x2={w - 20} y1={py(0)} y2={py(0)} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        {/* TSB shading */}
        <path d={tsbPath} fill="url(#tsb-fill)" style={{ opacity: 0, animation: 'fade-in 0.8s ease 0.8s forwards' }} />
        {/* ATL fill */}
        <path d={`${atlPath} L ${px(data.length - 1)} ${h - 20} L ${px(0)} ${h - 20} Z`} fill="url(#atl-fill)" style={{ opacity: 0, animation: 'fade-in 0.8s ease 0.4s forwards' }} />
        {/* ATL line */}
        <path d={atlPath} fill="none" stroke="var(--cardio)" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 4px var(--cardio))', strokeDasharray: 4000, strokeDashoffset: 4000, animation: 'draw-line 1.8s var(--ease-soft) 0.2s forwards' }} />
        {/* CTL line */}
        <path d={ctlPath} fill="none" stroke="var(--recovery)" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 6px var(--recovery))', strokeDasharray: 4000, strokeDashoffset: 4000, animation: 'draw-line 1.8s var(--ease-soft) 0.4s forwards' }} />
        {/* Today marker */}
        <circle cx={px(data.length - 1)} cy={py(data[data.length - 1].ctl)} r="5" fill="var(--recovery)" style={{ filter: 'drop-shadow(0 0 8px var(--recovery))', opacity: 0, animation: 'pop 0.5s var(--ease-spring) 2s forwards' }} />
        {/* Hover crosshair */}
        {hover && (
          <g className="chart-hover-dot">
            <line className="chart-crosshair" x1={hover.x} y1={20} x2={hover.x} y2={h - 20} />
            <circle cx={hover.x} cy={py(hd.ctl)} r="4" fill="var(--recovery)" style={{ filter: 'drop-shadow(0 0 6px var(--recovery))' }} />
            <circle cx={hover.x} cy={py(hd.atl)} r="4" fill="var(--cardio)" style={{ filter: 'drop-shadow(0 0 6px var(--cardio))' }} />
            <circle cx={hover.x} cy={py(hd.tsb)} r="3" fill={hd.tsb >= 0 ? 'var(--steps)' : 'var(--train)'} />
          </g>
        )}
        {/* Labels */}
        <text x={20} y={14} fontSize="9" fontWeight="700" letterSpacing="0.14em" fill="rgba(255,255,255,0.5)">90 DAYS</text>
        <text x={w - 30} y={14} fontSize="9" fontWeight="700" letterSpacing="0.14em" fill="rgba(255,255,255,0.5)">TODAY</text>
        <rect className="chart-hover-rect" x="0" y="0" width={w} height={h} onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {hover && hd && (
        <div className="chart-tooltip visible" style={{
          left: hover.x,
          top: py(Math.max(hd.ctl, hd.atl)) - 8,
          transform: 'translate(-50%, calc(-100% - 12px))',
          minWidth: 140
        }}>
          <div className="chart-tooltip-label">{hd.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          <div className="chart-tooltip-row"><span>CTL</span><strong style={{ color: 'var(--recovery)' }}>{hd.ctl.toFixed(0)}</strong></div>
          <div className="chart-tooltip-row"><span>ATL</span><strong style={{ color: 'var(--cardio)' }}>{hd.atl.toFixed(0)}</strong></div>
          <div className="chart-tooltip-row"><span>TSB</span><strong style={{ color: hd.tsb >= 0 ? 'var(--steps)' : 'var(--train)' }}>{hd.tsb >= 0 ? '+' : ''}{hd.tsb.toFixed(0)}</strong></div>
        </div>
      )}
    </div>);

}

function WeeklyVolume() {
  const weeks = React.useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const base = 60 + Math.sin(i / 2) * 30;
    return { week: i, hours: Math.max(2, base + (Math.sin(i * 1.7) * 10)) / 6 };
  }), []);
  const max = Math.max(...weeks.map((w) => w.hours));
  const [hover, setHover] = React.useState(null);
  const ref = React.useRef();

  return (
    <div ref={ref} className="chart-wrap" style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 200, marginTop: 18, position: 'relative' }}>
      {weeks.map((w, i) =>
      <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 6 }}
        onMouseEnter={(e) => {
          const r = ref.current.getBoundingClientRect();
          const br = e.currentTarget.getBoundingClientRect();
          setHover({ ...w, x: br.left - r.left + br.width / 2, y: br.top - r.top + (200 - w.hours / max * 170) - 12 });
        }}
        onMouseLeave={() => setHover(null)}>
          <div style={{
          width: '100%',
          height: `${w.hours / max * 170}px`,
          background: `linear-gradient(180deg, var(--train), rgba(255,181,71,0.3))`,
          borderRadius: '5px 5px 2px 2px',
          boxShadow: hover && hover.week === w.week ? '0 0 18px var(--train), inset 0 1px 0 rgba(255,255,255,0.3)' : '0 0 10px rgba(255,181,71,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          animation: `zone-grow 0.8s var(--ease-spring) ${i * 0.05}s both`,
          transformOrigin: 'bottom',
          cursor: 'crosshair',
          transition: 'box-shadow 0.2s'
        }} />
        </div>
      )}
      {hover && (
        <ChartTooltip
          visible
          x={hover.x}
          y={hover.y}
          accent="var(--train)"
          label={`Week ${12 - hover.week}`}
          value={hover.hours.toFixed(1)}
          unit="hours"
          sub={`${(hover.hours * 6).toFixed(0)} TSS load`}
        />
      )}
    </div>);

}

function RampGauge({ value }) {
  const max = 12;
  const v = Math.min(value, max);
  const segments = 30;
  return (
    <div className="col" style={{ alignItems: 'center', marginTop: 12 }}>
      <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.04em' }}>
        <NumberTicker value={value} format={(v) => v.toFixed(1)} /><span style={{ fontSize: 18, color: 'var(--text-3)', marginLeft: 4 }}>/wk</span>
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 14 }}>
        {Array.from({ length: segments }, (_, i) => {
          const t = i / segments;
          const active = t < v / max;
          const danger = t > 0.6;
          const c = !active ? 'rgba(255,255,255,0.06)' :
          danger ? 'var(--cardio)' :
          t > 0.3 ? 'var(--train)' : 'var(--steps)';
          return <div key={i} style={{ width: 4, height: 32, background: c, borderRadius: 2, boxShadow: active ? `0 0 6px ${c}` : 'none', transition: 'background 0.4s' }} />;
        })}
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 14, textAlign: 'center', maxWidth: 220 }}>
        {value > 6 ? 'Pumping fitness fast — careful of injury risk.' : 'Healthy ramp. Fitness building sustainably.'}
      </div>
    </div>);

}

window.ScreenSleep = ScreenSleep;
window.ScreenHeart = ScreenHeart;
window.ScreenTraining = ScreenTraining;