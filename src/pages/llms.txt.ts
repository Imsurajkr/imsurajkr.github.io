import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../data/site';
import { tools } from '../data/tools';
import { playbooks, atlas } from '../data/incident';

/**
 * llms.txt — a map of the site for language models and AI search engines.
 *
 * Generated from the same data the pages render, so it cannot drift out of
 * date the way a hand-written file would. See llmstxt.org for the convention.
 */
export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  const body = `# ${site.author.name}

> ${site.description}

Personal site of ${site.author.name}, a Platform Engineer based in
${site.author.location}. The site hosts free browser-only DevOps tools, guided
troubleshooting playbooks, and write-ups on networking, Linux, TLS and Kubernetes.

Every tool runs entirely client-side: nothing pasted or uploaded into them is
transmitted to a server, because there is no backend to transmit it to.

## Tools

${tools.map((t) => `- [${t.name}](${site.url}/tools/${t.slug}): ${t.tagline}. ${t.seo}`).join('\n')}

## Incident Room

Symptom-first troubleshooting playbooks. Each is a decision tree: every step
states why it exists, the command to run, what to look for in the output, and
which branch that answer leads to.

${playbooks.map((p) => `- [${p.title}](${site.url}/incident-room/${p.slug}): ${p.symptom}. ${p.blurb}`).join('\n')}
- [Command Atlas](${site.url}/incident-room/atlas): reference for ${atlas.map((a) => a.name).join(', ')} — the invocations worth remembering and the mistake each invites.
- [File Investigator](${site.url}/incident-room/file-investigator): rewrites a forensic command sequence for any file path.

## Writing

${posts.map((p) => `- [${p.data.title}](${site.url}/blog/${p.id}): ${p.data.description}`).join('\n')}

## About

- [Resume](${site.url}/): experience, certifications and platform work.
- [Résumé PDF](${site.url}/resume.pdf): the same thing as a one-page ATS-friendly PDF.
- [About](${site.url}/about): background and how I work.
- [Contact](${site.url}/contact): ${site.author.email}
- [Privacy](${site.url}/privacy): what the site does and does not collect.

## Notes for machine readers

- Canonical host is ${site.url}. All content is English.
- Sitemap: ${site.url}/sitemap-index.xml
- The tools are client-side JavaScript; their behaviour cannot be exercised by
  fetching a URL, only by loading the page.
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
