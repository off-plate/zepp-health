# Zepp Health

Personal health dashboard. Pulls workout + wellness data from Intervals.icu (which syncs from your Zepp/Amazfit watch) and shows charts.

## Live site

After deploy: `https://zepp-health.netlify.app`

## Data flow

```
Amazfit watch  →  Zepp app  →  Intervals.icu  →  GH Actions cron  →  Supabase  →  Dashboard
```

## What you see

- Stats: steps avg, sleep avg, resting HR, weight, fitness (CTL), fatigue (ATL) — each with 7d-vs-prev-7d trend
- Daily steps bar chart
- Sleep duration bar chart
- Resting heart rate line chart with 7d rolling average
- Weight trend line chart
- Training load chart (CTL vs ATL)
- Workouts list (date, type, duration, HR, calories, training load)
- Time ranges: 7d / 30d / 90d / 1y

## Stack

- **Hosting**: Netlify (publish from root, no build)
- **DB**: shared Supabase project `fhfempisopwsdkmvywbt`, tables prefixed `zepp_`
- **Auth**: Supabase magic link
- **Sync**: GitHub Actions cron (daily at 05:00 UTC), Node script calling Intervals.icu API
- **Frontend**: React via CDN + Babel standalone, hand-rolled SVG charts, single concatenated `index.html`

## Files

- `db/migration.sql` — Supabase schema
- `sync/sync.mjs` — Node sync worker
- `sync/package.json` — sync deps
- `.github/workflows/sync.yml` — daily cron
- `src/*.jsx` — frontend source
- `index.template.html` — HTML shell
- `index.html` — built artifact (do not edit directly)
- `build.py` — inliner

## Local dev

```bash
python3 build.py            # rebuild index.html from src/
python3 -m http.server 8000 # serve
# open http://localhost:8000
```

## Setup checklist

- [x] Schema applied (`db/migration.sql` run in Supabase SQL Editor)
- [ ] GitHub Actions secrets set: `INTERVALS_API_KEY`, `INTERVALS_ATHLETE_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] First sync run (manual via Actions tab)
- [ ] Netlify site connected to GitHub repo
- [ ] Netlify URL added to Supabase redirect URL allowlist
- [ ] Signed in on the deployed site once (creates auth user; sync worker needs an existing user to attach data to)
