const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const { handleContactSubmission, checkContactHealth } = require("./handlers/contact");
const {
  handleNewsletterSubmission,
  checkNewsletterHealth,
  newsletterConfig,
} = require("./handlers/newsletter");

// En local, .env fournit la configuration. En production (Dokploy), les
// variables sont injectées par la plateforme : dotenv ne les écrase jamais.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const rootDir = path.join(__dirname, "..");
const port = Number(process.env.PORT) || 5173;
const host = process.env.HOST || "0.0.0.0";

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json({ limit: "32kb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

const LEGACY_REDIRECTS = {
  "/qui-sommes-nous.html": "/a-propos.html",
  "/qui-sommes-nous": "/a-propos.html",
};

app.use((req, res, next) => {
  const target = LEGACY_REDIRECTS[req.path];
  if (target && req.method === "GET") {
    res.redirect(301, target);
    return;
  }
  next();
});

// Sonde de vie pour le reverse proxy / Dokploy.
app.get("/healthz", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Diagnostic de la chaîne de contact (aucune écriture chez Sarbacane).
app.get("/api/contact/health", async (req, res) => {
  try {
    const health = await checkContactHealth();
    res.status(health.ok ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/contact", async (req, res) => {
  // Express 4 ne rattrape pas les rejets asynchrones : sans ce try/catch la
  // requête resterait pendante et le reverse proxy renverrait un 502.
  try {
    const result = await handleContactSubmission(
      {
        ...req.body,
        source: req.body?.source || req.get("referer") || "site-web",
      },
      {
        // Derrière Cloudflare : l'IP réelle du visiteur (anti-rafale du portail).
        ip: req.get("cf-connecting-ip") || String(req.get("x-forwarded-for") || "").split(",")[0].trim() || req.ip,
        userAgent: req.get("user-agent"),
      }
    );
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error("[contact] Erreur inattendue :", error);
    res.status(500).json({
      ok: false,
      error: "Une erreur inattendue est survenue. Réessayez dans quelques instants.",
    });
  }
});

// Diagnostic de la liste newsletter (aucune écriture chez Sarbacane).
app.get("/api/newsletter/health", async (req, res) => {
  try {
    const health = await checkNewsletterHealth();
    res.status(health.ok ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Inscription newsletter (footer) : liste Sarbacane dédiée.
app.post("/api/newsletter", async (req, res) => {
  try {
    const result = await handleNewsletterSubmission({
      ...req.body,
      source: req.body?.source || req.get("referer") || "newsletter-footer",
    });
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error("[newsletter] Erreur inattendue :", error);
    res.status(500).json({
      ok: false,
      error: "Une erreur inattendue est survenue. Réessayez dans quelques instants.",
    });
  }
});

app.use(express.static(rootDir, { extensions: ["html"] }));

app.use((req, res, next) => {
  if (req.method !== "GET") {
    next();
    return;
  }

  if (path.extname(req.path)) {
    next();
    return;
  }

  res.sendFile(path.join(rootDir, "404.html"));
});

app.listen(port, host, () => {
  console.log(`Juste à temps — écoute sur ${host}:${port}`);

  if (!process.env.CONTACT_WEBHOOK_URL) {
    console.log("Contact API : mode log (définissez CONTACT_WEBHOOK_URL)");
  } else if (!process.env.SARBACANE_ACCOUNT_ID || !process.env.SARBACANE_API_KEY) {
    console.warn(
      "Contact API : SARBACANE_ACCOUNT_ID / SARBACANE_API_KEY manquants — les envois seront refusés (401)."
    );
  } else {
    console.log("Contact API : Sarbacane configuré (vérifiez avec GET /api/contact/health)");
  }

  const newsletter = newsletterConfig();
  if (newsletter) {
    console.log(
      `Newsletter API : Sarbacane configuré — liste ${newsletter.listId} (vérifiez avec GET /api/newsletter/health)`
    );
  } else {
    console.log("Newsletter API : mode log (SARBACANE_ACCOUNT_ID / SARBACANE_API_KEY manquants)");
  }
});
