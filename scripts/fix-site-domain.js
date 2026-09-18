/**
 * Remplace le placeholder template par le domaine de production.
 * Source de vérité : SITE_ORIGIN ci-dessous (utiliser aussi dans gen_products.py).
 *
 * Usage : node scripts/fix-site-domain.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PLACEHOLDER_HOST = "www.votre-domaine.com";
const SITE_ORIGIN = "https://abonnement.justeatemps.com";
const SITE_HOST = "abonnement.justeatemps.com";

const SKIP_DIRS = new Set([
  ".git",
  ".tools",
  "node_modules",
]);

const TEXT_EXT = new Set([
  ".html",
  ".xml",
  ".txt",
  ".py",
  ".js",
  ".json",
  ".md",
  ".webmanifest",
]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(name.name)) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

let filesChanged = 0;
let replacements = 0;

for (const file of walk(ROOT)) {
  const ext = path.extname(file).toLowerCase();
  if (!TEXT_EXT.has(ext)) continue;
  if (file.includes(`${path.sep}scripts${path.sep}fix-site-domain.js`)) continue;

  const original = fs.readFileSync(file, "utf8");
  if (!original.includes(PLACEHOLDER_HOST)) continue;

  const updated = original.replaceAll(PLACEHOLDER_HOST, SITE_HOST);
  if (updated !== original) {
    fs.writeFileSync(file, updated, "utf8");
    const count = (original.match(new RegExp(PLACEHOLDER_HOST.replace(/\./g, "\\."), "g")) || []).length;
    replacements += count;
    filesChanged += 1;
    console.log(`${count}\t${path.relative(ROOT, file)}`);
  }
}

console.log(`\n${replacements} remplacement(s) dans ${filesChanged} fichier(s).`);
console.log(`Domaine cible : ${SITE_ORIGIN}`);
