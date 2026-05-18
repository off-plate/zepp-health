#!/usr/bin/env python3
"""Build index.html from index.template.html and src/*.jsx.

PRE-COMPILE the JSX to plain JS using babel-standalone via Node. No in-browser
Babel — the deployed page just runs plain JS, fast.
"""
from pathlib import Path
import subprocess, json, sys, tempfile

ORDER = [
    "src/charts.jsx",
    "src/data.jsx",
    "src/app.jsx",
]

ROOT = Path(__file__).resolve().parent
BABEL_PATH = Path("/tmp/babel-standalone.js")

# Ensure babel-standalone is available locally for the build
if not BABEL_PATH.exists():
    print("Downloading babel-standalone...")
    subprocess.run(["curl", "-sL", "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js",
                    "-o", str(BABEL_PATH)], check=True)

# Concatenate the source
parts = []
for rel in ORDER:
    src = (ROOT / rel).read_text()
    parts.append(f"// ===== {rel} =====\n{src}\n")
inline_jsx = "\n".join(parts)

# Transpile via Node + babel-standalone
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

tpl = (ROOT / "index.template.html").read_text()
out = tpl.replace("/* __INLINE_APP__ */", compiled)
(ROOT / "index.html").write_text(out)
print(f"Wrote index.html ({len(out):,} bytes, compiled JS {len(compiled):,} bytes)")
