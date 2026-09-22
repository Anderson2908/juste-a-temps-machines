"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
const DOMAIN = "https://abonnement.justeatemps.com";

function locToSourceFile(loc) {
  const pathname = loc.replace(DOMAIN, "").replace(/^\//, "");
  return pathname ? pathname : "index.html";
}

function parseExistingSitemap(xml) {
  const entries = [];
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];

  for (const block of urlBlocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc) continue;

    entries.push({
      loc,
      changefreq: block.match(/<changefreq>([^<]+)<\/changefreq>/)?.[1] || "monthly",
      priority: block.match(/<priority>([^<]+)<\/priority>/)?.[1] || "0.5",
    });
  }

  return entries;
}

function toDateOnly(isoOrDate) {
  return isoOrDate.slice(0, 10);
}

function gitLastCommitDate(relativePath) {
  try {
    const output = execSync(`git log -1 --format=%cI -- "${relativePath.replace(/\\/g, "/")}"`, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return output ? toDateOnly(output) : null;
  } catch {
    return null;
  }
}

function fileMtimeDate(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return toDateOnly(fs.statSync(absolutePath).mtime.toISOString());
}

function hasUncommittedChanges(relativePath) {
  try {
    const normalized = relativePath.replace(/\\/g, "/");
    const output = execSync(`git status --porcelain -- "${normalized}"`, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return Boolean(output);
  } catch {
    return true;
  }
}

function getLastMod(relativePath) {
  const gitDate = gitLastCommitDate(relativePath);
  const mtimeDate = fileMtimeDate(relativePath);
  const dirty = hasUncommittedChanges(relativePath);

  if (gitDate && !dirty) {
    return gitDate;
  }

  if (gitDate && mtimeDate) {
    return gitDate > mtimeDate ? gitDate : mtimeDate;
  }

  return gitDate || mtimeDate || toDateOnly(new Date().toISOString());
}

function buildSitemap(entries) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const entry of entries) {
    const source = locToSourceFile(entry.loc);
    const lastmod = getLastMod(source);

    lines.push("  <url>");
    lines.push(`    <loc>${entry.loc}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push(`    <priority>${entry.priority}</priority>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  lines.push("");
  return lines.join("\n");
}

function main() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error("sitemap.xml introuvable.");
    process.exit(1);
  }

  const existing = fs.readFileSync(SITEMAP_PATH, "utf8");
  const entries = parseExistingSitemap(existing);

  if (!entries.length) {
    console.error("Aucune entrée trouvée dans sitemap.xml.");
    process.exit(1);
  }

  const xml = buildSitemap(entries);
  fs.writeFileSync(SITEMAP_PATH, xml, "utf8");

  for (const entry of entries) {
    const source = locToSourceFile(entry.loc);
    console.log(`${entry.loc} -> ${source} (${getLastMod(source)})`);
  }

  console.log(`\n${entries.length} URLs écrites dans sitemap.xml`);
}

main();
