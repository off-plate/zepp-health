#!/usr/bin/env python3
"""Inline src/*.jsx into index.html from index.template.html.

Order: charts → data → app entry.
"""
from pathlib import Path

ORDER = [
    "src/charts.jsx",
    "src/data.jsx",
    "src/app.jsx",
]

ROOT = Path(__file__).resolve().parent

parts = []
for rel in ORDER:
    src = (ROOT / rel).read_text()
    parts.append(f"// ===== {rel} =====\n{src}\n")
inline = "\n".join(parts)

tpl = (ROOT / "index.template.html").read_text()
out = tpl.replace("/* __INLINE_APP__ */", inline)
(ROOT / "index.html").write_text(out)
print(f"Wrote index.html ({len(out):,} bytes)")
