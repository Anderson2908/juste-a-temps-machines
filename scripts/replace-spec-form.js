/**
 * Remplace le formulaire « Recevoir la fiche technique » par un lien PDF direct.
 * Usage : node scripts/replace-spec-form.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const PDF_BY_PREFIX = {
  "machine-": {
    url: "https://www.justeatemps.com/machinescafe.pdf",
    category: "machines",
  },
  "fontaine-": {
    url: "https://www.justeatemps.com/fontaines.pdf",
    category: "fontaines",
  },
  "distributeur-": {
    url: "https://www.justeatemps.com/da.pdf",
    category: "distributeurs",
  },
};

const FORM_BLOCK =
  /                <form class="machine-specs__form" action="#" method="post">\r?\n[\s\S]*?                <\/form>\r?\n/;

function downloadBlock(url, category, eol) {
  return `                <div class="machine-specs__download">${eol}                  <p class="machine-specs__download-title">Télécharger la fiche technique</p>${eol}                  <a href="${url}" class="btn btn-primary js-spec-sheet-download" target="_blank" rel="noopener" data-spec-category="${category}">Télécharger la fiche technique</a>${eol}                </div>${eol}`;
}

const files = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html") && FORM_BLOCK.test(fs.readFileSync(path.join(ROOT, f), "utf8")));

let updated = 0;
for (const file of files) {
  const filePath = path.join(ROOT, file);
  let html = fs.readFileSync(filePath, "utf8");
  if (!FORM_BLOCK.test(html)) continue;

  const prefix = Object.keys(PDF_BY_PREFIX).find((p) => file.startsWith(p));
  if (!prefix) {
    console.warn("Skip (prefix inconnu):", file);
    continue;
  }

  const { url, category } = PDF_BY_PREFIX[prefix];
  const eol = html.includes("\r\n") ? "\r\n" : "\n";
  html = html.replace(FORM_BLOCK, downloadBlock(url, category, eol));
  fs.writeFileSync(filePath, html, "utf8");
  updated += 1;
  console.log("OK", file);
}

console.log(`\n${updated} fichier(s) mis à jour.`);
