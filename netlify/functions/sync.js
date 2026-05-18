// Netlify Function: triggers a GH Actions workflow_dispatch for the sync workflow.
// GH_TOKEN must be set as an env var in Netlify (fine-grained PAT with Actions:write).

export default async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const token = Netlify.env.get('GH_TOKEN');
  if (!token) return new Response('GH_TOKEN not configured', { status: 500 });

  let body = {};
  try { body = await request.json(); } catch (_) {}
  const lookbackDays = String(body.lookback_days || '60');

  const res = await fetch('https://api.github.com/repos/off-plate/zepp-health/actions/workflows/sync.yml/dispatches', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ref: 'main', inputs: { lookback_days: lookbackDays } })
  });

  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => '');
    return new Response('GitHub API error: ' + res.status + ' ' + text, { status: 502 });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
