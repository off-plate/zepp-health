// Hand-rolled SVG chart helpers. Dark theme, mobile-friendly.

const COLORS = {
  accent: '#e26d5c', green: '#6ec27a', blue: '#7aa8d8', yellow: '#e7c66b',
  purple: '#c08dd6', muted: '#8a8a85', grid: '#232328'
};

function fmtDay(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// Generic bar chart. data: [{ day, value }]
function BarChart({ data, color = COLORS.accent, unit = '', height = 160, formatValue = v => v }) {
  if (!data || data.length === 0) return <Empty />;
  const W = 600, H = height, P = { top: 16, right: 8, bottom: 24, left: 36 };
  const innerW = W - P.left - P.right;
  const innerH = H - P.top - P.bottom;
  const values = data.map(d => d.value || 0);
  const max = Math.max(...values, 1);
  const barW = innerW / data.length * 0.72;
  const step = innerW / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width: '100%', height: 'auto', display: 'block'}}>
      {[0.25, 0.5, 0.75, 1].map(p => (
        <line key={p} x1={P.left} x2={W - P.right} y1={P.top + innerH * (1 - p)} y2={P.top + innerH * (1 - p)} stroke={COLORS.grid} strokeWidth={1} />
      ))}
      {[0.5, 1].map(p => (
        <text key={p} x={P.left - 6} y={P.top + innerH * (1 - p) + 4} textAnchor="end" fill={COLORS.muted} fontSize="10" fontFamily="JetBrains Mono">
          {formatValue(max * p)}
        </text>
      ))}
      {data.map((d, i) => {
        const v = d.value || 0;
        const h = (v / max) * innerH;
        const x = P.left + i * step + (step - barW) / 2;
        const y = P.top + innerH - h;
        return <rect key={i} x={x} y={y} width={barW} height={h} fill={color} opacity={v ? 0.85 : 0.15} rx={2} />;
      })}
      {/* X labels: first, mid, last */}
      {[0, Math.floor(data.length / 2), data.length - 1].map(i => (
        <text key={i} x={P.left + i * step + step / 2} y={H - 6} textAnchor="middle" fill={COLORS.muted} fontSize="10" fontFamily="JetBrains Mono">
          {fmtDay(data[i].day)}
        </text>
      ))}
    </svg>
  );
}

// Line chart with optional rolling-average overlay. data: [{ day, value }]
function LineChart({ data, color = COLORS.accent, height = 160, overlay = true, formatValue = v => v }) {
  if (!data || data.length === 0) return <Empty />;
  const W = 600, H = height, P = { top: 16, right: 8, bottom: 24, left: 36 };
  const innerW = W - P.left - P.right;
  const innerH = H - P.top - P.bottom;
  const valid = data.filter(d => d.value != null);
  if (valid.length === 0) return <Empty />;
  const values = valid.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const pad = range * 0.1;
  const lo = min - pad, hi = max + pad;

  const xAt = i => P.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yAt = v => P.top + innerH * (1 - (v - lo) / (hi - lo));

  // Rolling 7-day average
  const rolled = data.map((d, i) => {
    if (!overlay) return null;
    const window = data.slice(Math.max(0, i - 6), i + 1).filter(x => x.value != null);
    if (window.length === 0) return null;
    return window.reduce((s, x) => s + x.value, 0) / window.length;
  });

  // Build line path skipping nulls
  let path = '';
  data.forEach((d, i) => {
    if (d.value == null) { path += ' M'; return; }
    const cmd = (i === 0 || path.endsWith(' M')) ? 'M' : 'L';
    path += (path.endsWith(' M') ? '' : ' ') + cmd + xAt(i) + ',' + yAt(d.value);
  });
  path = path.replace(/ M$/, '').replace(/ M /g, ' ');

  let rolledPath = '';
  if (overlay) {
    rolled.forEach((v, i) => {
      if (v == null) return;
      rolledPath += (rolledPath ? ' L' : 'M') + xAt(i) + ',' + yAt(v);
    });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width: '100%', height: 'auto', display: 'block'}}>
      {[0.25, 0.5, 0.75, 1].map(p => (
        <line key={p} x1={P.left} x2={W - P.right} y1={P.top + innerH * (1 - p)} y2={P.top + innerH * (1 - p)} stroke={COLORS.grid} strokeWidth={1} />
      ))}
      <text x={P.left - 6} y={P.top + 4} textAnchor="end" fill={COLORS.muted} fontSize="10" fontFamily="JetBrains Mono">{formatValue(hi)}</text>
      <text x={P.left - 6} y={P.top + innerH + 4} textAnchor="end" fill={COLORS.muted} fontSize="10" fontFamily="JetBrains Mono">{formatValue(lo)}</text>

      {overlay && rolledPath && <path d={rolledPath} fill="none" stroke={color} strokeWidth={3} opacity={0.6} />}
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} opacity={overlay ? 0.45 : 1} />

      {data.map((d, i) => d.value != null ? (
        <circle key={i} cx={xAt(i)} cy={yAt(d.value)} r={2.2} fill={color} />
      ) : null)}

      {[0, Math.floor(data.length / 2), data.length - 1].map(i => (
        <text key={i} x={xAt(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fill={COLORS.muted} fontSize="10" fontFamily="JetBrains Mono">
          {fmtDay(data[i].day)}
        </text>
      ))}
    </svg>
  );
}

// Training load: CTL (fitness), ATL (fatigue), Form (CTL-ATL)
function TrainingLoadChart({ data, height = 200 }) {
  if (!data || data.length === 0) return <Empty />;
  const W = 600, H = height, P = { top: 16, right: 8, bottom: 24, left: 36 };
  const innerW = W - P.left - P.right;
  const innerH = H - P.top - P.bottom;
  const all = data.flatMap(d => [d.ctl, d.atl]).filter(v => v != null);
  if (all.length === 0) return <Empty />;
  const min = Math.min(...all, 0);
  const max = Math.max(...all, 1);
  const range = Math.max(max - min, 1);

  const xAt = i => P.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yAt = v => P.top + innerH * (1 - (v - min) / range);

  function pathFor(field) {
    let p = '';
    data.forEach((d, i) => {
      if (d[field] == null) return;
      p += (p ? ' L' : 'M') + xAt(i) + ',' + yAt(d[field]);
    });
    return p;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width: '100%', height: 'auto', display: 'block'}}>
      {[0.25, 0.5, 0.75, 1].map(p => (
        <line key={p} x1={P.left} x2={W - P.right} y1={P.top + innerH * (1 - p)} y2={P.top + innerH * (1 - p)} stroke={COLORS.grid} strokeWidth={1} />
      ))}
      <path d={pathFor('ctl')} fill="none" stroke={COLORS.blue} strokeWidth={2.2} />
      <path d={pathFor('atl')} fill="none" stroke={COLORS.accent} strokeWidth={2.2} />
      <text x={P.left - 6} y={P.top + 4} textAnchor="end" fill={COLORS.muted} fontSize="10" fontFamily="JetBrains Mono">{Math.round(max)}</text>
      <text x={P.left - 6} y={P.top + innerH + 4} textAnchor="end" fill={COLORS.muted} fontSize="10" fontFamily="JetBrains Mono">{Math.round(min)}</text>
      {[0, Math.floor(data.length / 2), data.length - 1].map(i => (
        <text key={i} x={xAt(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fill={COLORS.muted} fontSize="10" fontFamily="JetBrains Mono">
          {fmtDay(data[i].day)}
        </text>
      ))}
    </svg>
  );
}

function Empty() {
  return <div style={{padding: '40px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13}}>No data in this range yet.</div>;
}

window.ZH = window.ZH || {};
window.ZH.charts = { BarChart, LineChart, TrainingLoadChart, COLORS };
