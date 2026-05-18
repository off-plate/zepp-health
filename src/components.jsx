/* global React */
// ============== SHARED COMPONENTS ==============

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ---------- Animated number ticker ----------
function useTween(target, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef();
  const startRef = useRef();
  const fromRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    fromRef.current = value;
    startRef.current = null;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const start = performance.now() + delay;
    const tick = (now) => {
      if (now < start) {rafRef.current = requestAnimationFrame(tick);return;}
      const t = Math.min(1, (now - start) / duration);
      const v = fromRef.current + (target - fromRef.current) * ease(t);
      setValue(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [target]);

  return value;
}

function NumberTicker({ value, format = (v) => Math.round(v).toLocaleString(), duration = 1200, delay = 0, className }) {
  const v = useTween(value, duration, delay);
  return <span className={className}>{format(v)}</span>;
}

// ---------- Mouse-parallax tile wrapper ----------
function HoverTile({ children, className = '', tilt = true, onClick, style }) {
  const ref = useRef();
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    ref.current.style.setProperty('--mx', `${x * 100}%`);
    ref.current.style.setProperty('--my', `${y * 100}%`);
    if (tilt) {
      const rx = (0.5 - y) * 6;
      const ry = (x - 0.5) * 6;
      ref.current.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
    }
  };
  const onLeave = () => {
    if (tilt) ref.current.style.transform = '';
  };
  return (
    <div ref={ref} className={`tile ${className}`} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick} style={style}>
      {children}
    </div>);

}

// ---------- Activity Rings (triple stacked, springy) ----------
function ActivityRings({ size = 280, stroke = 22, gap = 5, rings, animate = true }) {
  // rings: [{ color, value (0-1), glow }]
  const cx = size / 2,cy = size / 2;
  const radii = rings.map((_, i) => size / 2 - stroke / 2 - i * (stroke + gap));
  const [progress, setProgress] = useState(rings.map(() => 0));

  useEffect(() => {
    if (!animate) {setProgress(rings.map((r) => r.value));return;}
    // Spring-physics-ish curve
    const start = performance.now();
    const dur = 1600;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      // Springy overshoot
      const ease = (x) => {
        if (x >= 1) return 1;
        const p = 0.32;
        return 1 - Math.pow(2, -10 * x) * Math.cos((x * 10 - 0.75) * (2 * Math.PI) / 3);
      };
      const eased = Math.min(1.05, ease(t));
      setProgress(rings.map((r) => Math.min(r.value * 1.04, r.value * eased)));
      if (t < 1) requestAnimationFrame(tick);else
      setProgress(rings.map((r) => r.value));
    };
    requestAnimationFrame(tick);
    // eslint-disable-next-line
  }, []);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        {rings.map((r, i) =>
        <linearGradient key={i} id={`ring-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={r.color} />
            <stop offset="100%" stopColor={r.colorB || r.color} />
          </linearGradient>
        )}
        <filter id="ring-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {rings.map((r, i) => {
        const radius = radii[i];
        const c = 2 * Math.PI * radius;
        const p = Math.min(1, progress[i] || 0);
        return (
          <g key={i} transform={`rotate(-90 ${cx} ${cy})`}>
            {/* Track */}
            <circle cx={cx} cy={cy} r={radius} fill="none"
            stroke={r.color} strokeOpacity="0.12" strokeWidth={stroke} />
            {/* Glow underlay */}
            <circle cx={cx} cy={cy} r={radius} fill="none"
            stroke={`url(#ring-grad-${i})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`}
            opacity="0.5"
            filter="url(#ring-glow)" />
            {/* Main stroke */}
            <circle cx={cx} cy={cy} r={radius} fill="none"
            stroke={`url(#ring-grad-${i})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`} />
            {/* Highlight cap */}
            {p > 0 && p < 0.98 &&
            <circle
              cx={cx + radius * Math.cos(2 * Math.PI * p)}
              cy={cy + radius * Math.sin(2 * Math.PI * p)}
              r={stroke / 2}
              fill="white"
              opacity="0.4" />

            }
          </g>);

      })}
    </svg>);

}

// ---------- Tooltip ----------
function ChartTooltip({ x, y, visible, label, value, unit, sub, accent }) {
  return (
    <div
      className={`chart-tooltip ${visible ? 'visible' : ''}`}
      style={{ left: x, top: y, borderColor: accent ? 'var(--hairline-bright)' : 'var(--hairline)' }}>
      {label && <div className="chart-tooltip-label" style={{ color: accent || 'var(--text-3)' }}>{label}</div>}
      {value !== undefined && (
        <div className="chart-tooltip-value">
          {value}
          {unit && <span className="chart-tooltip-value-unit">{unit}</span>}
        </div>
      )}
      {sub && <div className="chart-tooltip-sub">{sub}</div>}
    </div>
  );
}

// ---------- Icon ----------
function Icon({ name, fill, className = '', style }) {
  return <span className={`icon ${fill ? 'fill' : ''} ${className}`} style={style}>{name}</span>;
}

// ---------- Sparkline ----------
function Sparkline({ data, labels = null, color = '#fff', height = 56, fillId = 'sparkfill', stroke = 2, animate = true, showTip = true, valueFormat, unit }) {
  const ref = useRef();
  const [w, setW] = useState(200);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setW(e.contentRect.width || 200));
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1 || 1);
  const points = data.map((v, i) => [i * stepX, height - 4 - ((v - min) / range) * (height - 8)]);
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const fillPath = `${path} L ${points[points.length - 1][0]} ${height} L 0 ${height} Z`;
  const fId = useMemo(() => `${fillId}-${Math.random().toString(36).slice(2, 7)}`, []);
  const last = points[points.length - 1];

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(x / stepX)));
    setHover({ idx, px: points[idx][0], py: points[idx][1] });
  };
  const fmt = valueFormat || ((v) => Math.round(v).toLocaleString());

  return (
    <div className="chart-wrap" ref={ref} style={{ height, position: 'relative' }}>
      <svg className="sparkline" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ '--accent': color, height, width: '100%' }}>
        <defs>
          <linearGradient id={fId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="fill" d={fillPath} fill={`url(#${fId})`} />
        <path className="line" d={path} style={{ strokeDasharray: animate ? 2000 : 'none', strokeDashoffset: animate ? 2000 : 'none' }} />
        {showTip && last && !hover && <circle className="tip" cx={last[0]} cy={last[1]} r="3.5" />}
        {hover && (
          <g className="chart-hover-dot">
            <line className="chart-crosshair" x1={hover.px} y1={0} x2={hover.px} y2={height} />
            <circle cx={hover.px} cy={hover.py} r="6" fill={color} opacity="0.25" />
            <circle cx={hover.px} cy={hover.py} r="3.5" fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
          </g>
        )}
        <rect className="chart-hover-rect" x="0" y="0" width={w} height={height}
          onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {hover && (
        <ChartTooltip
          visible
          x={hover.px}
          y={hover.py}
          accent={color}
          label={labels ? labels[hover.idx] : `${data.length - hover.idx}d ago`}
          value={fmt(data[hover.idx])}
          unit={unit}
        />
      )}
    </div>
  );
}

// ---------- Range tabs ----------
function RangeTabs({ value, onChange, options = ['7D', '30D', '90D', '1Y', 'ALL'] }) {
  return (
    <div className="range-tabs" data-comment-anchor="45fa040edc-div-183-5">
      {options.map((o) =>
      <button key={o} className={`range-tab ${o === value ? 'active' : ''}`} onClick={() => onChange(o)}>{o}</button>
      )}
    </div>);

}

// ---------- Heart icon ----------
function HeartIcon({ color = '#FF5C6C' }) {
  return (
    <svg viewBox="0 0 60 60" fill="none">
      <defs>
        <linearGradient id="h-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#FF8B7A" />
        </linearGradient>
      </defs>
      <path d="M30 52 C 8 38, 4 22, 14 14 C 22 8, 28 14, 30 18 C 32 14, 38 8, 46 14 C 56 22, 52 38, 30 52 Z"
      fill="url(#h-grad)" />
      <path d="M30 52 C 8 38, 4 22, 14 14 C 22 8, 28 14, 30 18 C 32 14, 38 8, 46 14 C 56 22, 52 38, 30 52 Z"
      fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
    </svg>);

}

// ---------- Gauge (semi-circle) ----------
function Gauge({ value, max = 100, color = '#4DE0A0', size = 220 }) {
  const cx = size / 2;
  const cy = size / 1.6;
  const r = size / 2 - 14;
  const stroke = 14;
  const start = Math.PI;
  const end = 2 * Math.PI;
  const total = end - start;
  const v = useTween(value, 1400);
  const ratio = Math.min(1, v / max);

  const arc = (from, to) => {
    const x1 = cx + r * Math.cos(from);
    const y1 = cy + r * Math.sin(from);
    const x2 = cx + r * Math.cos(to);
    const y2 = cy + r * Math.sin(to);
    const large = to - from > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  // ticks
  const ticks = [];
  for (let i = 0; i <= 30; i++) {
    const a = start + i / 30 * total;
    const x1 = cx + (r - 8) * Math.cos(a);
    const y1 = cy + (r - 8) * Math.sin(a);
    const x2 = cx + (r + 8) * Math.cos(a);
    const y2 = cy + (r + 8) * Math.sin(a);
    const active = i / 30 <= ratio;
    ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={active ? color : 'rgba(255,255,255,0.08)'} strokeWidth="2" strokeLinecap="round" style={{ filter: active ? `drop-shadow(0 0 4px ${color})` : 'none' }} />);
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="auto" style={{ aspectRatio: `${size}/${size}` }}>
      <defs>
        <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      {ticks}
      <path d={arc(start, start + total * ratio)} fill="none" stroke="url(#gauge-grad)" strokeWidth={stroke} strokeLinecap="round" opacity="0" />
    </svg>);

}

// ---------- Heatbar (intensity zones) ----------
function Heatbar({ zones, max }) {
  // zones array of values per minute or bucket
  const peak = max || Math.max(...zones, 1);
  return (
    <div className="heatbar">
      {zones.map((v, i) => {
        const p = v / peak;
        // map intensity → color (sleep blue to amber to coral)
        const c = p < 0.3 ? 'rgba(78,205,196,0.4)' :
        p < 0.55 ? 'rgba(77,224,160,0.6)' :
        p < 0.75 ? 'rgba(255,181,71,0.8)' :
        'var(--cardio)';
        return <div key={i} className="heatbar-cell" style={{ '--c': c, opacity: 0.4 + p * 0.6 }} />;
      })}
    </div>);

}

// ---------- Route map (stylized SVG path) ----------
function RouteMap({ path = 'M20,50 Q40,10 60,30 T100,60', animated = true, color = '#FFB547' }) {
  return (
    <svg viewBox="0 0 120 80" preserveAspectRatio="none">
      <defs>
        <pattern id="streets" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 10 L20 10 M10 0 L10 20" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="120" height="80" fill="url(#streets)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 4px ${color})`, strokeDasharray: animated ? 200 : 'none', strokeDashoffset: animated ? 200 : 0, animation: animated ? 'draw-line 1.4s ease 0.2s forwards' : 'none' }} />
    </svg>);

}

Object.assign(window, {
  useTween,
  NumberTicker,
  HoverTile,
  ActivityRings,
  Sparkline,
  RangeTabs,
  HeartIcon,
  Gauge,
  Heatbar,
  RouteMap,
  ChartTooltip,
  Icon,
});