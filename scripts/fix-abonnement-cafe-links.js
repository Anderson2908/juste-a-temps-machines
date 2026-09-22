"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const LOCAL_SIMULATEUR = new Set([
  "machines-a-cafe.html",
  "fontaines-a-eau.html",
  "distributeurs-automatiques.html",
  "a-propos.html",
  "index.html",
  "contact.html",
]);

const OLD_HREF =
  'href="https://abonnement-cafe.justeatemps.com/" target="_blank" rel="noopener noreferrer"';

for (const file of fs.readdirSync(ROOT).filter((name) => name.endsWith(".html"))) {
  const filePath = path.join(ROOT, file);
  let html = fs.readFileSync(filePath, "utf8");
  if (!html.includes("abonnement-cafe.justeatemps.com")) continue;

  const anchor = LOCAL_SIMULATEUR.has(file) ? "#simulateur" : "index.html#simulateur";
  const next = html.split(OLD_HREF).join(`href="${anchor}"`);
  if (next !== html) {
    fs.writeFileSync(filePath, next, "utf8");
    console.log(`${file} -> ${anchor}`);
  }
}
