const fs = require("fs");
const path = require("path");

const {
  SARBACANE_TIMEOUT_MS,
  sarbacaneCredentials,
  sarbacaneApiBase,
  resolveFieldMap,
  buildSarbacaneContact,
  pushContact,
  checkList,
} = require("../sarbacane");
const { sendCallbackAlert, checkSmtp, callbackRecipients } = require("../mailer");
const { envoyerAuPortailSdr } = require("../portail-sdr");

function sanitizeString(value, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function buildPayload(body, source) {
  return {
    company: sanitizeString(body.company, 200),
    name: sanitizeString(body.name, 200),
    email: sanitizeString(body.email, 320),
    phone: sanitizeString(body.phone, 50),
    message: sanitizeString(body.message, 5000),
    source: sanitizeString(source || body.source || "site-web", 120),
    submittedAt: new Date().toISOString(),
  };
}

function isValidFrenchPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10 && /^0[1-9]/.test(digits)) return true;
  if (digits.length === 11 && digits.startsWith("33") && /^33[1-9]/.test(digits)) return true;
  return false;
}

function isCallbackRequest(payload) {
  return payload.source === "problematique-rappel" || payload.source === "hero-rappel";
}

function validatePayload(payload) {
  const isCallback = isCallbackRequest(payload);

  if (isCallback) {
    if (!payload.phone) {
      return "Le numéro de téléphone est obligatoire.";
    }
    if (!isValidFrenchPhone(payload.phone)) {
      return "Veuillez saisir un numéro de téléphone français valide (10 chiffres).";
    }
    return null;
  }

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
 * Journal local des leads : filet de sécurité.
 * Une demande enregistrée ici n'est jamais perdue, même si Sarbacane
 * est indisponible ou si la clé API est refusée.
 * ------------------------------------------------------------------ */

function leadsFilePath() {
  return process.env.LEADS_FILE || path.join(__dirname, "..", "..", "data", "leads.jsonl");
}

function storeLead(payload, delivery) {
  const file = leadsFilePath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify({ ...payload, delivery })}\n`, "utf8");
    return true;
  } catch (error) {
    console.error("[contact] Impossible d'écrire le journal des leads :", error.message);
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Sarbacane — liste des leads du formulaire de contact.
 * Le client HTTP est partagé avec la newsletter (voir ../sarbacane.js).
 * ------------------------------------------------------------------ */

function listIdFromWebhookUrl(url) {
  const match = /\/lists\/([^/]+)\/contacts/.exec(url || "");
  return match ? match[1] : "";
}

function sarbacaneConfig() {
  const url = process.env.CONTACT_WEBHOOK_URL || "";
  const credentials = sarbacaneCredentials();
  if (!credentials) return null;

  const listId = (process.env.SARBACANE_LIST_ID || listIdFromWebhookUrl(url)).trim();
  if (!listId) return null;

  return { ...credentials, listId, base: sarbacaneApiBase() };
}

async function pushToSarbacane(payload) {
  const config = sarbacaneConfig();
  if (!config) return { ok: false, reason: "not-configured" };

  const fieldMap = await resolveFieldMap(config, "SARBACANE_FIELDS");
  const contact = buildSarbacaneContact(withOrigin(payload, fieldMap), fieldMap);

  return pushContact(config, contact);
}

// Libellés lisibles des points d'entrée du site, repris dans Sarbacane.
const SOURCE_LABELS = {
  "hero-rappel": "Être rappelé (accueil, en-tête)",
  "problematique-rappel": "Être rappelé (parcours « votre besoin »)",
};

function sourceLabel(source) {
  if (SOURCE_LABELS[source]) return SOURCE_LABELS[source];
  const page = String(source || "").replace(/^https?:\/\/[^/]+/, "").replace(/^\//, "");
  return page ? `Formulaire de contact (${page})` : "Formulaire de contact";
}

/**
 * La liste des leads n'a pas de champ « Source » : l'origine de la demande
 * (formulaire de contact ou bouton « Être rappelé », et la page) est ajoutée
 * au champ Message pour que l'équipe sache comment rappeler.
 */
function withOrigin(payload, fieldMap) {
  if (fieldMap.source || !fieldMap.message) return payload;
  const origine = `Origine : ${sourceLabel(payload.source)}`;
  return { ...payload, message: payload.message ? `${payload.message}\n\n${origine}` : origine };
}

/* ------------------------------------------------------------------ *
 * Webhook générique (si l'endpoint n'est pas Sarbacane)
 * ------------------------------------------------------------------ */

async function forwardToWebhook(payload) {
  const url = process.env.CONTACT_WEBHOOK_URL;
  if (!url) return null;

  const headerName = process.env.CONTACT_API_HEADER || "Authorization";
  const keyPrefix = process.env.CONTACT_API_KEY_PREFIX || "Bearer";
  const apiKey = process.env.CONTACT_API_KEY || "";

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (apiKey) {
    headers[headerName] =
      headerName.toLowerCase() === "authorization" && !apiKey.includes(" ")
        ? `${keyPrefix} ${apiKey}`.trim()
        : apiKey;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(SARBACANE_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `L'API de contact a répondu ${response.status}${detail ? ` : ${detail.slice(0, 200)}` : ""}`
    );
  }

  return response;
}

/* ------------------------------------------------------------------ */

const SUCCESS_MESSAGE =
  "Votre demande a bien été envoyée. Nous vous recontacterons rapidement.";

async function handleContactSubmission(body, meta = {}) {
  const payload = buildPayload(body, body.source);
  const validationError = validatePayload(payload);
  if (validationError) {
    return { status: 400, body: { ok: false, error: validationError } };
  }

  // File « Leads entrants » du Portail SDR, en arrière-plan (voir ../portail-sdr.js).
  envoyerAuPortailSdr(payload, meta).catch(() => {});

  // « Être rappelé » : l'équipe commerciale est prévenue tout de suite par
  // e-mail. Envoi en arrière-plan : le visiteur n'attend pas le serveur SMTP,
  // et un échec d'envoi n'empêche pas l'enregistrement du lead.
  if (isCallbackRequest(payload)) {
    sendCallbackAlert(payload).catch(() => {});
  }

  const useSarbacane = Boolean(sarbacaneConfig());
  const hasWebhook = Boolean(process.env.CONTACT_WEBHOOK_URL);

  if (useSarbacane || hasWebhook) {
    try {
      if (useSarbacane) {
        await pushToSarbacane(payload);
      } else {
        await forwardToWebhook(payload);
      }

      storeLead(payload, { status: "sent", provider: useSarbacane ? "sarbacane" : "webhook" });
      return {
        status: 200,
        body: { ok: true, mode: useSarbacane ? "sarbacane" : "webhook", message: SUCCESS_MESSAGE },
      };
    } catch (error) {
      console.error("[contact] Échec de transmission :", error.message);
      console.error("[contact] Lead concerné :", JSON.stringify(payload));

      const stored = storeLead(payload, {
        status: "failed",
        provider: useSarbacane ? "sarbacane" : "webhook",
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
            "Impossible d'envoyer votre demande pour le moment. Réessayez dans quelques instants.",
        },
      };
    }
  }

  const fallbackMode = process.env.CONTACT_FALLBACK_MODE || "log";
  if (fallbackMode === "error") {
    return {
      status: 503,
      body: {
        ok: false,
        error: "Le service de contact n'est pas encore configuré.",
      },
    };
  }

  storeLead(payload, { status: "stored", provider: "none" });
  console.info("[contact] Demande reçue (mode log — configurez CONTACT_WEBHOOK_URL) :", payload);
  return {
    status: 200,
    body: {
      ok: true,
      mode: "log",
      message: "Votre demande a bien été enregistrée. Nous vous recontacterons rapidement.",
    },
  };
}

async function checkContactHealth() {
  const config = sarbacaneConfig();
  const result = {
    ok: true,
    provider: config ? "sarbacane" : process.env.CONTACT_WEBHOOK_URL ? "webhook" : "log",
    webhookConfigured: Boolean(process.env.CONTACT_WEBHOOK_URL),
    credentialsConfigured: Boolean(sarbacaneCredentials()),
    listId: config ? config.listId : null,
  };

  // Alerte e-mail « être rappelé » : vérifie la connexion SMTP, sans envoi.
  const smtp = await checkSmtp();
  result.alerteRappel = { smtp: smtp.status, destinataires: callbackRecipients().length };

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
  handleContactSubmission,
  checkContactHealth,
  buildPayload,
  validatePayload,
  buildSarbacaneContact,
};
