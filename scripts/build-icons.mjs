// Generates src/data/icons.json from the canonical Lucide + FontAwesome sources.
// Lucide (stroke icons) for every generic glyph, FontAwesome Free brand icons
// (fill paths) for brand logos that Lucide does not ship. Re-run after editing
// the lists:  node scripts/build-icons.mjs
import { writeFile, mkdir } from "node:fs/promises";

// Generic UI glyphs -> Lucide (rendered as stroke, the lilAgents house standard).
const LUCIDE = [
  "globe", "mail", "calendar", "calendar-days", "link", "store", "map-pin",
  "phone", "file-text", "music", "newspaper", "image", "heart", "briefcase",
  "book-open", "shopping-bag", "video", "download", "external-link", "rss",
];

// Brand logos -> FontAwesome Free brands (rendered as fill; Lucide has none).
const FA_BRANDS = [
  "instagram", "youtube", "x-twitter", "linkedin", "tiktok", "github",
  "facebook", "spotify", "discord", "twitch", "patreon", "pinterest",
  "soundcloud", "medium", "behance", "dribbble", "snapchat", "whatsapp",
  "telegram", "reddit", "threads", "bluesky", "substack",
  "apple", "mastodon",
];

async function fetchSvg(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.text();
}

function viewBoxOf(svg) {
  const m = svg.match(/viewBox="([^"]+)"/i);
  return m ? m[1] : "0 0 24 24";
}

// Strip the <svg> wrapper and any <title>, keeping only the drawable children.
function inner(svg) {
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const out = {};
for (const n of LUCIDE) {
  try {
    const svg = await fetchSvg(`https://cdn.jsdelivr.net/npm/lucide-static/icons/${n}.svg`);
    out[n] = { mode: "stroke", viewBox: "0 0 24 24", body: inner(svg) };
  } catch (e) { console.error("lucide miss:", n, e.message); }
}
for (const n of FA_BRANDS) {
  try {
    const svg = await fetchSvg(`https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free/svgs/brands/${n}.svg`);
    out[n] = { mode: "fill", viewBox: viewBoxOf(svg), body: inner(svg) };
  } catch (e) { console.error("fa-brand miss:", n, e.message); }
}

await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../src/data/icons.json", import.meta.url), JSON.stringify(out));
console.log("wrote", Object.keys(out).length, "icons");
