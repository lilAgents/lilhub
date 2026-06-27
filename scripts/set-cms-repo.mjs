// Prebuild step: point the Sveltia CMS config at whoever deployed this copy.
//
// When someone clicks "Deploy to Netlify" on the lilHub template, Netlify forks
// the repo into their own GitHub account and sets REPOSITORY_URL at build time
// (e.g. https://github.com/someuser/their-lilhub). This script reads that, pulls
// out the "owner/repo" slug, and rewrites the `repo:` line in
// public/admin/config.yml so /admin saves to the deployer's own repo.
//
// If REPOSITORY_URL is unset (local dev, or a generic build), the placeholder
// `owner/repo` is left in place and editing falls back to Sveltia's local
// backend ("Work with Local Repository").
//
// Runs before `astro build` (see the "build" script in package.json and the
// build command in netlify.toml).

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, "..", "public", "admin", "config.yml");
const PLACEHOLDER = "owner/repo";

// Parse "owner/repo" from a Git remote URL. Handles the https form Netlify
// provides (https://github.com/owner/repo[.git]) and the ssh form
// (git@github.com:owner/repo.git), trimming any trailing slash or .git suffix.
function parseSlug(repositoryUrl) {
  if (!repositoryUrl) return null;
  let s = repositoryUrl.trim();
  s = s.replace(/\.git$/i, "").replace(/\/$/, "");
  // ssh: git@host:owner/repo
  const sshMatch = s.match(/^git@[^:]+:(.+)$/i);
  if (sshMatch) s = sshMatch[1];
  else {
    // https/http: strip scheme + host, keep the path
    const httpMatch = s.match(/^https?:\/\/[^/]+\/(.+)$/i);
    if (httpMatch) s = httpMatch[1];
  }
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  // Take the first two path segments as owner/repo.
  return `${parts[0]}/${parts[1]}`;
}

async function main() {
  const slug = parseSlug(process.env.REPOSITORY_URL);

  if (!slug) {
    console.log(
      "[set-cms-repo] REPOSITORY_URL not set or unparseable; leaving placeholder repo:",
      PLACEHOLDER,
    );
    return;
  }

  const original = await readFile(CONFIG_PATH, "utf8");
  // Replace the value on the `repo:` line under the backend block, preserving
  // indentation. Matches the first top-of-line-or-indented `repo:` key.
  const updated = original.replace(
    /^(\s*repo:\s*).*$/m,
    `$1${slug}`,
  );

  if (updated === original) {
    console.warn(
      "[set-cms-repo] No `repo:` line found in config.yml; nothing changed.",
    );
    return;
  }

  await writeFile(CONFIG_PATH, updated, "utf8");
  console.log(`[set-cms-repo] Set CMS repo to ${slug}`);
}

main().catch((err) => {
  console.error("[set-cms-repo] Failed:", err);
  process.exit(1);
});
