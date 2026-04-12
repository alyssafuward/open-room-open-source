import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')!;
const GITHUB_REPO = 'alyssafuward/open-room-open-source';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const { registryId, githubUsername, gridX, gridY, title: editTitle, description } = await req.json();

  if (!registryId || !githubUsername || !editTitle) {
    return new Response('Missing required fields', { status: 400, headers: corsHeaders });
  }

  const title = `Task: ${registryId} (@${githubUsername}) — ${editTitle}`;
  const body = [
    `An edit has been requested for this room.`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Registry ID | \`${registryId}\` |`,
    `| GitHub | @${githubUsername} |`,
    `| Grid position | (${gridX ?? '?'}, ${gridY ?? '?'}) |`,
    ``,
    description ? `**What to change:** ${description}` : '',
    ``,
    `**Next step:** @${githubUsername} should fork the repo, update \`public/registry/${registryId}/\`, and open a PR.`,
  ].filter(line => line !== null).join('\n');

  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ title, body, labels: ['room'] }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('GitHub API error:', error);
    return new Response('Failed to create issue', { status: 500, headers: corsHeaders });
  }

  const issue = await response.json();
  console.log(`Created issue #${issue.number}: ${title}`);
  return new Response(JSON.stringify({ issue: issue.number, url: issue.html_url }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
