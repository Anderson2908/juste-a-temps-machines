/**
 * Injecte les sections #simulateur et #contact (partials/) sur les pages catalogue.
 * Source de vérité : partials/conversion-*.html (extraits de index.html).
 * Exécuter après modification des partials : node scripts/sync-conversion-sections.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SYNC_NOTE =
  "<!-- CONVERSION-SECTIONS — synchroniser avec partials/ via: node scripts/sync-conversion-sections.js -->";
const SIM_START = "<!-- CONVERSION-SIMULATEUR:START -->";
const SIM_END = "<!-- CONVERSION-SIMULATEUR:END -->";
const CONTACT_START = "<!-- CONVERSION-CONTACT:START -->";
const CONTACT_END = "<!-- CONVERSION-CONTACT:END -->";
const POPUP_START = "<!-- CONVERSION-POPUP:START -->";
const POPUP_END = "<!-- CONVERSION-POPUP:END -->";

const simulateurPartial = fs.readFileSync(
  path.join(ROOT, "partials/conversion-simulateur.html"),
  "utf8"
);
const contactPartial = fs.readFileSync(
  path.join(ROOT, "partials/conversion-contact.html"),
  "utf8"
);
const popupPartial = fs.readFileSync(
  path.join(ROOT, "partials/conversion-cafe-popup.html"),
  "utf8"
);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSimulateurHtml() {
  return simulateurPartial.replace('href="contact.html"', 'href="#contact"');
}

function stripBlock(html, start, end) {
  const re = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\s*`, "g");
  return html.replace(re, "");
}

function stripExistingConversion(html) {
  let out = html;
  out = stripBlock(out, SIM_START, SIM_END);
  out = stripBlock(out, CONTACT_START, CONTACT_END);
  out = stripBlock(out, "<!-- CONVERSION-SECTIONS:START -->", "<!-- CONVERSION-SECTIONS:END -->");
  out = out.replace(new RegExp(`${escapeRegExp(SYNC_NOTE)}\\s*`, "g"), "");
  out = out.replace(
    /<!-- Contact -->[\s\S]*?<section class="section section-contact-lite" id="contact">[\s\S]*?<\/section>\s*/g,
    ""
  );
  return out;
}

function stripExistingPopup(html) {
  let out = stripBlock(html, POPUP_START, POPUP_END);
  return out.replace(/<!-- Pop-up simulateur café -->[\s\S]*?<\/aside>\s*/g, "");
}

function updateLinks(html) {
  return html
    .replace(
      /(<a href=")index\.html#simulateur(" class="btn btn-primary">Parler à un expert)/g,
      "$1#contact$2"
    )
    .replace(
      /(<a href=")index\.html#simulateur(" class="btn btn-primary btn-lg">Parler à un expert)/g,
      "$1#contact$2"
    )
    .replace(
      /(<li><a href=")index\.html#simulateur(">Parler à un expert<\/a><\/li>)/g,
      "$1#contact$2"
    )
    .replace(
      /(<a href=")index\.html#simulateur(" class="btn btn-primary">Me faire accompagner)/g,
      "$1#simulateur$2"
    )
    .replace(
      /(<a href=")index\.html#simulateur(" class="btn btn-primary btn-lg">Me faire accompagner)/g,
      "$1#simulateur$2"
    )
    .replace(
      /(<a href=")https:\/\/abonnement-(?:cafe|fontaines)\.justeatemps\.com\/(" target="_blank" rel="noopener noreferrer">votre solution café<\/a>)/g,
      '$1#simulateur">votre solution café</a>'
    )
    .replace(
      /(<a href="#simulateur") target="_blank" rel="noopener noreferrer">votre solution café<\/a>/g,
      '$1>votre solution café</a>'
    );
}

function wrapSimulateurBlock() {
  return `${SIM_START}\n${SYNC_NOTE}\n${getSimulateurHtml()}\n${SIM_END}`;
}

function wrapContactBlock() {
  return `${CONTACT_START}\n${contactPartial}\n${CONTACT_END}`;
}

function insertSimulateurBeforeCtaBand(html) {
  const block = wrapSimulateurBlock();
  const ctaRe = /(\s*)<div class="catalog-cta-band/;
  if (ctaRe.test(html)) {
    return html.replace(ctaRe, `\n\n      ${block}\n\n$1<div class="catalog-cta-band`);
  }
  return html.replace("</main>", `\n\n      ${block}\n\n    </main>`);
}

function insertContactBeforeMainClose(html) {
  const block = wrapContactBlock();
  return html.replace("</main>", `\n\n      ${block}\n\n    </main>`);
}

function insertPopup(html) {
  const popupBlock = `${POPUP_START}\n\n    ${popupPartial}\n\n    ${POPUP_END}`;
  if (html.includes(POPUP_START)) {
    return html.replace(
      new RegExp(`${escapeRegExp(POPUP_START)}[\\s\\S]*?${escapeRegExp(POPUP_END)}`),
      popupBlock
    );
  }
  return html.replace(
    /(\s*<script src="scripts\/lenis\.min\.js" defer><\/script>)/,
    `\n\n    ${popupBlock}\n$1`
  );
}

function processCatalogPage(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  let html = fs.readFileSync(filePath, "utf8");
  html = stripExistingConversion(html);
  html = stripExistingPopup(html);
  html = updateLinks(html);
  html = insertSimulateurBeforeCtaBand(html);
  html = insertContactBeforeMainClose(html);
  html = insertPopup(html);
  fs.writeFileSync(filePath, html, "utf8");
  console.log("updated", relativePath);
}

function processContactPage() {
  const filePath = path.join(ROOT, "contact.html");
  let html = fs.readFileSync(filePath, "utf8");
  html = stripExistingConversion(html);
  html = stripExistingPopup(html);
  html = updateLinks(html);

  const simBlock = wrapSimulateurBlock();
  const contactAnchor = '<section class="section section-contact" id="contact">';
  if (html.includes(SIM_START)) {
    html = html.replace(
      new RegExp(`${escapeRegExp(SIM_START)}[\\s\\S]*?${escapeRegExp(SIM_END)}`),
      simBlock
    );
  } else if (html.includes(contactAnchor)) {
    html = html.replace(contactAnchor, `${simBlock}\n\n      ${contactAnchor}`);
  } else {
    html = insertSimulateurBeforeCtaBand(html);
  }

  html = insertPopup(html);
  html = html.replace(
    'href="index.html#simulateur" class="btn btn-primary">Parler à un expert',
    'href="#contact" class="btn btn-primary">Parler à un expert'
  );
  html = html.replace(
    'href="index.html#simulateur">Parler à un expert',
    'href="#contact">Parler à un expert'
  );
  fs.writeFileSync(filePath, html, "utf8");
  console.log("updated contact.html");
}

[
  "machines-a-cafe.html",
  "fontaines-a-eau.html",
  "distributeurs-automatiques.html",
  "a-propos.html",
].forEach(processCatalogPage);

processContactPage();
