const fs = require("fs");
const path = require("path");

const {
  sarbacaneCredentials,
  sarbacaneApiBase,
  resolveFieldMap,
  buildSarbacaneContact,
  pushContact,
  checkList,
} = require("../sarbacane");

// Liste Sarbacane dédiée à la newsletter (distincte de celle des leads du
// formulaire de contact). Surchargeable via NEWSLETTER_LIST_ID.
const DEFAULT_NEWSLETTER_LIST_ID = "e148f4c3-567d-473a-9626-0cdbf9848f30";

function sanitizeString(value, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function buildPayload(body, source) {
  return {
    email: sanitizeString(body.email, 320),
    source: sanitizeString(source || body.source || "newsletter-footer", 120),
    submittedAt: new Date().toISOString(),
  };
}

function validatePayload(payload) {
  if (!payload.email) {
    return "L'adresse e-mail est obligatoire.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(payload.email)) {
    return "L'adresse e-mail n'est pas valide.";
  }

  return null;
}

/* ------------------------------------------------------------------ *
 * Journal local des inscriptions : filet de sécurité.
 * Une inscription enregistrée ici n'est jamais perdue, même si Sarbacane
 * est indisponible ou si la clé API est refusée.
 * ------------------------------------------------------------------ */

function subscribersFilePath() {
  return (
    process.env.NEWSLETTER_FILE || path.join(__dirname, "..", "..", "data", "newsletter.jsonl")
  );
}

function storeSubscriber(payload, delivery) {
  const file = subscribersFilePath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify({ ...payload, delivery })}\n`, "utf8");
    return true;
  } catch (error) {
    console.error("[newsletter] Impossible d'écrire le journal des inscrits :", error.message);
    return false;
  }
}

/* ------------------------------------------------------------------ */

function newsletterConfig() {
  const credentials = sarbacaneCredentials();
  if (!credentials) return null;

  const listId = (process.env.NEWSLETTER_LIST_ID || DEFAULT_NEWSLETTER_LIST_ID).trim();
  if (!listId) return null;

  return { ...credentials, listId, base: sarbacaneApiBase() };
}

async function pushToSarbacane(payload) {
  const config = newsletterConfig();
  if (!config) return { ok: false, reason: "not-configured" };

  // La liste newsletter n'a besoin que de l'e-mail ; on ajoute la page
  // d'origine si un champ "source" existe côté Sarbacane.
  const fieldMap = await resolveFieldMap(config, "NEWSLETTER_FIELDS");
  const contact = buildSarbacaneContact(payload, fieldMap, ["source"]);

  return pushContact(config, contact);
}

const SUCCESS_MESSAGE = "Merci ! Votre inscription à la newsletter est bien enregistrée.";

async function handleNewsletterSubmission(body) {
  const payload = buildPayload(body, body.source);
  const validationError = validatePayload(payload);
  if (validationError) {
    return { status: 400, body: { ok: false, error: validationError } };
  }

  const config = newsletterConfig();

  if (config) {
    try {
      await pushToSarbacane(payload);
      storeSubscriber(payload, { status: "sent", provider: "sarbacane", listId: config.listId });
      return { status: 200, body: { ok: true, mode: "sarbacane", message: SUCCESS_MESSAGE } };
    } catch (error) {
      console.error("[newsletter] Échec de transmission :", error.message);
      console.error("[newsletter] Inscription concernée :", JSON.stringify(payload));

      const stored = storeSubscriber(payload, {
        status: "failed",
        provider: "sarbacane",
        listId: config.listId,
        error: error.message,
      });
      const strict = process.env.CONTACT_STRICT === "true";

      if (stored && !strict) {
        return { status: 200, body: { ok: true, mode: "stored", message: SUCCESS_MESSAGE } };
      }

      return {
        status: 502,
        body: {
          ok: false,
          error:
            "Impossible d'enregistrer votre inscription pour le moment. Réessayez dans quelques instants.",
        },
      };
    }
  }

  const fallbackMode = process.env.CONTACT_FALLBACK_MODE || "log";
  if (fallbackMode === "error") {
    return {
      status: 503,
      body: { ok: false, error: "Le service d'inscription n'est pas encore configuré." },
    };
  }

  storeSubscriber(payload, { status: "stored", provider: "none" });
  console.info(
    "[newsletter] Inscription reçue (mode log — configurez SARBACANE_ACCOUNT_ID / SARBACANE_API_KEY) :",
    payload
  );
  return { status: 200, body: { ok: true, mode: "log", message: SUCCESS_MESSAGE } };
}

async function checkNewsletterHealth() {
  const config = newsletterConfig();
  const result = {
    ok: true,
    provider: config ? "sarbacane" : "log",
    credentialsConfigured: Boolean(sarbacaneCredentials()),
    listId: config ? config.listId : null,
  };

  if (!config) {
    result.sarbacane = "non-configuré";
    return result;
  }

  const check = await checkList(config);
  result.ok = check.ok;
  result.sarbacane = check.status;
  return result;
}

module.exports = {
  handleNewsletterSubmission,
  checkNewsletterHealth,
  buildPayload,
  validatePayload,
  newsletterConfig,
};
