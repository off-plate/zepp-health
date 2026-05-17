#!/usr/bin/env bash
# Concatenate src/*.jsx into index.html as a single inline Babel script block.
set -euo pipefail
cd "$(dirname "$0")"
python3 build.py
