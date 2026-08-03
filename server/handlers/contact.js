const fs = require("fs");
const path = require("path");

const SARBACANE_TIMEOUT_MS = Number(process.env.SARBACANE_TIMEOUT_MS) || 10000;

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

<<<<<<< HEAD
function isSarbacaneMode() {
  const provider = (process.env.CONTACT_PROVIDER || "").toLowerCase();
  const webhookUrl = (process.env.CONTACT_WEBHOOK_URL || "").toLowerCase();
  return (
    provider === "sarbacane" ||
    webhookUrl.includes("sarbacaneapis.com") ||
    Boolean(process.env.SARBACANE_LIST_ID)
  );
}

function getSarbacaneConfig() {
  const listId = process.env.SARBACANE_LIST_ID || "";
  const accountId = process.env.SARBACANE_ACCOUNT_ID || "";
  const apiKey = process.env.CONTACT_API_KEY || "";

  let url = (process.env.CONTACT_WEBHOOK_URL || "").replace(/\/+$/, "");
  if (listId) {
    url = `https://sarbacaneapis.com/v1/lists/${listId}/contacts`;
  } else if (url && !url.includes("/lists/")) {
    url = `${url}/lists/REPLACE_BY_LIST_ID/contacts`;
  }

  return { url, accountId, apiKey, listId };
}

function buildSarbacaneBody(payload) {
  const body = {
    email: payload.email,
  };

  if (payload.phone) {
    body.phone = payload.phone;
  }

  const noteParts = [
    payload.company && `Entreprise : ${payload.company}`,
    payload.name && `Nom : ${payload.name}`,
    payload.message && `Besoin : ${payload.message}`,
    payload.source && `Source : ${payload.source}`,
  ].filter(Boolean);

  if (noteParts.length) {
    body.comment = noteParts.join("\n");
  }

  return body;
}

async function forwardToSarbacane(payload) {
  const { url, accountId, apiKey, listId } = getSarbacaneConfig();

  if (!listId || url.includes("REPLACE_BY_LIST_ID")) {
    throw new Error("SARBACANE_LIST_ID manquant dans .env");
  }
  if (!accountId) {
    throw new Error("SARBACANE_ACCOUNT_ID manquant dans .env");
  }
  if (!apiKey) {
    throw new Error("CONTACT_API_KEY manquant dans .env");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      accountId,
      apiKey,
    },
    body: JSON.stringify(buildSarbacaneBody(payload)),
=======
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
 * Sarbacane
 * Auth : DEUX en-têtes `accountId` + `apiKey` (jamais Authorization/Bearer).
 * Ajout d'un contact : POST /v1/lists/{listId}/contacts
 * Corps : un OBJET { email, phone, "<idChampPerso>": "valeur" }.
 * Les champs autres qu'email/phone sont identifiés par leur ID, pas
 * par leur nom : on les découvre via GET /v1/lists/{listId}/fields.
 * ------------------------------------------------------------------ */

function sarbacaneCredentials() {
  const accountId = (process.env.SARBACANE_ACCOUNT_ID || "").trim();
  const apiKey = (process.env.SARBACANE_API_KEY || "").trim();
  return accountId && apiKey ? { accountId, apiKey } : null;
}

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

  const base = (process.env.SARBACANE_API_BASE || "https://sarbacaneapis.com/v1").replace(/\/+$/, "");
  return { ...credentials, listId, base };
}

async function sarbacaneFetch(url, { accountId, apiKey }, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      accountId,
      apiKey,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    signal: AbortSignal.timeout(SARBACANE_TIMEOUT_MS),
  });
}

// Alias de noms de champs Sarbacane -> clés de notre formulaire.
const FIELD_ALIASES = {
  company: ["societe", "société", "company", "entreprise", "organisation", "organization"],
  name: ["nom", "name", "lastname", "nom complet", "fullname", "contact"],
  message: ["message", "commentaire", "demande", "besoin", "comment"],
  source: ["source", "origine", "provenance", "page"],
};

function normalizeLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

let cachedFieldMap = null;

function fieldMapFromEnv() {
  const raw = process.env.SARBACANE_FIELDS;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.error("[contact] SARBACANE_FIELDS n'est pas un JSON valide :", error.message);
    return null;
  }
}

async function resolveFieldMap(config) {
  const fromEnv = fieldMapFromEnv();
  if (fromEnv) return fromEnv;
  if (cachedFieldMap) return cachedFieldMap;

  try {
    const response = await sarbacaneFetch(`${config.base}/lists/${config.listId}/fields`, config);
    if (!response.ok) {
      console.warn(
        `[contact] Champs Sarbacane illisibles (HTTP ${response.status}) : seuls email et téléphone seront transmis.`
      );
      return {};
    }

    const body = await response.json();
    const fields = Array.isArray(body) ? body : body.items || body.fields || [];
    const map = {};

    for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
      const match = fields.find((field) => {
        const label = normalizeLabel(field.name || field.label || field.title);
        return aliases.some((alias) => label === normalizeLabel(alias));
      });
      if (match && match.id) map[key] = match.id;
    }

    cachedFieldMap = map;
    return map;
  } catch (error) {
    console.warn("[contact] Découverte des champs Sarbacane impossible :", error.message);
    return {};
  }
}

function buildSarbacaneContact(payload, fieldMap) {
  const contact = {};
  if (payload.email) contact.email = payload.email;
  if (payload.phone) contact.phone = payload.phone;

  for (const key of ["company", "name", "message", "source"]) {
    const fieldId = fieldMap[key];
    if (fieldId && payload[key]) contact[fieldId] = payload[key];
  }

  return contact;
}

async function pushToSarbacane(payload) {
  const config = sarbacaneConfig();
  if (!config) return { ok: false, reason: "not-configured" };

  const fieldMap = await resolveFieldMap(config);
  const contact = buildSarbacaneContact(payload, fieldMap);
  const url = `${config.base}/lists/${config.listId}/contacts?upsert=true`;

  const response = await sarbacaneFetch(url, config, {
    method: "POST",
    body: JSON.stringify(contact),
>>>>>>> 86495ebee93fa7bde290e4f77d4c833cd05c26ec
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
<<<<<<< HEAD
    throw new Error(
      `Sarbacane a répondu ${response.status}${detail ? ` : ${detail.slice(0, 200)}` : ""}`
    );
  }

  return response;
}

=======
    const error = new Error(
      `Sarbacane a répondu ${response.status}${detail ? ` : ${detail.slice(0, 200)}` : ""}`
    );
    error.status = response.status;
    throw error;
  }

  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Webhook générique (si l'endpoint n'est pas Sarbacane)
 * ------------------------------------------------------------------ */

>>>>>>> 86495ebee93fa7bde290e4f77d4c833cd05c26ec
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

async function handleContactSubmission(body) {
  const payload = buildPayload(body, body.source);
  const validationError = validatePayload(payload);
  if (validationError) {
    return { status: 400, body: { ok: false, error: validationError } };
  }

<<<<<<< HEAD
  const useSarbacane = isSarbacaneMode();
  const hasWebhook = Boolean(process.env.CONTACT_WEBHOOK_URL) || Boolean(process.env.SARBACANE_LIST_ID);

  if (hasWebhook) {
    try {
      if (useSarbacane) {
        await forwardToSarbacane(payload);
      } else {
        await forwardToWebhook(payload);
      }
      return {
        status: 200,
        body: {
          ok: true,
          mode: useSarbacane ? "sarbacane" : "webhook",
          message: "Votre demande a bien été envoyée. Nous vous recontacterons rapidement.",
        },
=======
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
>>>>>>> 86495ebee93fa7bde290e4f77d4c833cd05c26ec
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

      // Le lead est conservé localement : inutile d'afficher une erreur au
      // visiteur, sa demande est bien enregistrée. CONTACT_STRICT=true force
      // le comportement inverse.
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

<<<<<<< HEAD
  console.info("[contact] Demande reçue (mode log) :", payload);
=======
  storeLead(payload, { status: "stored", provider: "none" });
  console.info("[contact] Demande reçue (mode log — configurez CONTACT_WEBHOOK_URL) :", payload);
>>>>>>> 86495ebee93fa7bde290e4f77d4c833cd05c26ec
  return {
    status: 200,
    body: {
      ok: true,
      mode: "log",
      message: "Votre demande a bien été enregistrée. Nous vous recontacterons rapidement.",
    },
  };
}

<<<<<<< HEAD
module.exports = {
  handleContactSubmission,
  buildPayload,
  validatePayload,
  isSarbacaneMode,
=======
// Diagnostic : vérifie la configuration et les identifiants sans rien écrire
// dans Sarbacane. Utilisé par GET /api/contact/health.
async function checkContactHealth() {
  const config = sarbacaneConfig();
  const result = {
    ok: true,
    provider: config ? "sarbacane" : process.env.CONTACT_WEBHOOK_URL ? "webhook" : "log",
    webhookConfigured: Boolean(process.env.CONTACT_WEBHOOK_URL),
    credentialsConfigured: Boolean(sarbacaneCredentials()),
    listId: config ? config.listId : null,
  };

  if (!config) {
    result.sarbacane = "non-configuré";
    return result;
  }

  try {
    const response = await sarbacaneFetch(`${config.base}/lists/${config.listId}/fields`, config);
    if (response.ok) {
      result.sarbacane = "ok";
    } else if (response.status === 401 || response.status === 403) {
      result.ok = false;
      result.sarbacane = "identifiants refusés (401) — régénérez la clé API Sarbacane";
    } else {
      result.ok = false;
      result.sarbacane = `réponse inattendue (HTTP ${response.status})`;
    }
  } catch (error) {
    result.ok = false;
    result.sarbacane = `injoignable : ${error.message}`;
  }

  return result;
}

module.exports = {
  handleContactSubmission,
  checkContactHealth,
  buildPayload,
  validatePayload,
  buildSarbacaneContact,
>>>>>>> 86495ebee93fa7bde290e4f77d4c833cd05c26ec
};
