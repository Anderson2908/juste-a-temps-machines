/**
 * Pointe les références runtime vers les WebP (OG, img, JSON-LD).
 * Usage : node scripts/fix-image-references.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const REPLACEMENTS = [
  ["assets/hero-office.jpg", "assets/hero-office.webp"],
  ["assets/fontaines-hero.jpg", "assets/fontaines-hero.webp"],
  ["assets/distributeurs-hero.png", "assets/distributeurs-hero.webp"],
  ["assets/about-hero-equipe.png", "assets/about-hero-equipe.webp"],
  ["assets/about-equipe-01.png", "assets/about-equipe-01.webp"],
  ["assets/about-equipe-02.png", "assets/about-equipe-02.webp"],
  ["assets/about-equipe-03.png", "assets/about-equipe-03.webp"],
  ["assets/about-equipe-04.png", "assets/about-equipe-04.webp"],
  ["assets/about-equipe-05.png", "assets/about-equipe-05.webp"],
  ["assets/about-equipe-06.png", "assets/about-equipe-06.webp"],
  ["assets/about-equipe-07.png", "assets/about-equipe-07.webp"],
  ["assets/machines/animo.png", "assets/machines/animo.webp"],
  ["assets/machines/jura-x4.png", "assets/machines/jura-x4.webp"],
  ["assets/machines/jura-ena-4.png", "assets/machines/jura-ena-4.webp"],
  ["assets/machines/jura-giga-x3.png", "assets/machines/jura-giga-x3.webp"],
  ["assets/machines/wmf.png", "assets/machines/wmf.webp"],
  ["assets/machines/gaggia-milano.png", "assets/machines/gaggia-milano.webp"],
  ["assets/machines/necta-concerto.png", "assets/machines/necta-concerto.webp"],
];

const files = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));

let total = 0;
for (const file of files) {
  const filePath = path.join(ROOT, file);
  let html = fs.readFileSync(filePath, "utf8");
  let changed = false;
  for (const [from, to] of REPLACEMENTS) {
    if (html.includes(from)) {
      html = html.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, html, "utf8");
    total += 1;
    console.log("OK", file);
  }
}

console.log(`\n${total} fichier(s) HTML mis à jour.`);
