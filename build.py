#!/usr/bin/env python3
"""Pre-compile JSX and inline styles + JS into index.html."""
from pathlib import Path
import subprocess, json

JS_ORDER = [
    "src/auth.jsx",        # window.ZH.db (session management)
    "src/adapter.jsx",     # window.ZH_ADAPTER (data fetch + globals population)
    "src/components.jsx",  # shared UI (ActivityRings, Sparkline, BadgeArt, etc.)
    "src/screen-today.jsx",
    "src/screen-bio.jsx",  # ScreenSleep, ScreenHeart, ScreenTraining
    "src/screen-flow.jsx", # ScreenWorkouts, ScreenAwards, ScreenCalendar, WorkoutDetail
    "src/app.jsx",         # entry: App, SignIn, mounts React
]
CSS_FILE = "src/styles.css"

ROOT = Path(__file__).resolve().parent
BABEL_PATH = Path("/tmp/babel-standalone.js")

if not BABEL_PATH.exists():
    print("Downloading babel-standalone…")
    subprocess.run(["curl", "-sL", "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js",
                    "-o", str(BABEL_PATH)], check=True)

# Concat JSX
parts = []
for rel in JS_ORDER:
    src = (ROOT / rel).read_text()
    parts.append(f"// ===== {rel} =====\n{src}\n")
inline_jsx = "\n".join(parts)

# Babel transpile via Node
node_script = f"""
const fs = require('fs');
const Babel = require({json.dumps(str(BABEL_PATH))});
const src = fs.readFileSync({json.dumps(str(ROOT / '.build-input.jsx'))}, 'utf8');
const out = Babel.transform(src, {{ presets: ['react'] }});
fs.writeFileSync({json.dumps(str(ROOT / '.build-output.js'))}, out.code);
"""
(ROOT / ".build-input.jsx").write_text(inline_jsx)
try:
    subprocess.run(["node", "-e", node_script], check=True)
    compiled = (ROOT / ".build-output.js").read_text()
finally:
    (ROOT / ".build-input.jsx").unlink(missing_ok=True)
    (ROOT / ".build-output.js").unlink(missing_ok=True)

# Inline CSS
css = (ROOT / CSS_FILE).read_text()

# Stamp into template
tpl = (ROOT / "index.template.html").read_text()
out = tpl.replace("/* __INLINE_STYLES__ */", css).replace("/* __INLINE_APP__ */", compiled)
(ROOT / "index.html").write_text(out)
print(f"Wrote index.html ({len(out):,} bytes; CSS {len(css):,}, JS {len(compiled):,})")
