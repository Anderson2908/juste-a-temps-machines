/* ------------------------------------------------------------------ *
 * Client Sarbacane partagé (formulaire de contact + newsletter).
 *
 * Auth : DEUX en-têtes `accountId` + `apiKey` (jamais Authorization/Bearer).
 * Ajout d'un contact : POST /v1/lists/{listId}/contacts
 * Corps : un OBJET { email, phone, "<idChampPerso>": "valeur" }.
 * Les champs autres qu'email/phone sont identifiés par leur ID, pas par
 * leur nom : on les découvre via GET /v1/lists/{listId}/fields.
 * ------------------------------------------------------------------ */

const SARBACANE_TIMEOUT_MS = Number(process.env.SARBACANE_TIMEOUT_MS) || 10000;

function sarbacaneCredentials() {
  const accountId = (process.env.SARBACANE_ACCOUNT_ID || "").trim();
  const apiKey = (process.env.SARBACANE_API_KEY || process.env.CONTACT_API_KEY || "").trim();
  return accountId && apiKey ? { accountId, apiKey } : null;
}

function sarbacaneApiBase() {
  return (process.env.SARBACANE_API_BASE || "https://sarbacaneapis.com/v1").replace(/\/+$/, "");
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

// Alias de noms de champs Sarbacane -> clés de nos formulaires.
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

// Un cache par liste : contact et newsletter n'ont pas les mêmes champs.
const fieldMapCache = new Map();

function fieldMapFromEnv(envVar) {
  const raw = process.env[envVar];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.error(`[sarbacane] ${envVar} n'est pas un JSON valide :`, error.message);
    return null;
  }
}

function listFieldsUrl(config) {
  return `${config.base}/lists/${config.listId}/fields`;
}

async function fetchListFields(config) {
  return sarbacaneFetch(listFieldsUrl(config), config);
}

/**
 * Retourne la correspondance { clé formulaire -> id du champ Sarbacane }.
 * Priorité à la variable d'environnement, sinon découverte via l'API
 * (résultat mis en cache par liste). En cas d'échec : {} — seuls email
 * et téléphone seront transmis, ce qui suffit pour ne pas perdre le lead.
 */
async function resolveFieldMap(config, envVar) {
  const fromEnv = envVar ? fieldMapFromEnv(envVar) : null;
  if (fromEnv) return fromEnv;

  const cached = fieldMapCache.get(config.listId);
  if (cached) return cached;

  try {
    const response = await fetchListFields(config);
    if (!response.ok) {
      console.warn(
        `[sarbacane] Champs de la liste ${config.listId} illisibles (HTTP ${response.status}) : seuls email et téléphone seront transmis.`
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

    fieldMapCache.set(config.listId, map);
    return map;
  } catch (error) {
    console.warn("[sarbacane] Découverte des champs impossible :", error.message);
    return {};
  }
}

/**
 * Traduit notre payload en contact Sarbacane : email/phone en clair,
 * le reste sous l'ID du champ personnalisé correspondant.
 */
function buildSarbacaneContact(payload, fieldMap, keys = ["company", "name", "message", "source"]) {
  const contact = {};
  if (payload.email) contact.email = payload.email;
  if (payload.phone) contact.phone = payload.phone;

  for (const key of keys) {
    const fieldId = fieldMap[key];
    if (fieldId && payload[key]) contact[fieldId] = payload[key];
  }

  return contact;
}

async function pushContact(config, contact) {
  const url = `${config.base}/lists/${config.listId}/contacts?upsert=true`;

  const response = await sarbacaneFetch(url, config, {
    method: "POST",
    body: JSON.stringify(contact),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(
      `Sarbacane a répondu ${response.status}${detail ? ` : ${detail.slice(0, 200)}` : ""}`
    );
    error.status = response.status;
    throw error;
  }

  return { ok: true };
}

/**
 * Diagnostic d'une liste : lit ses champs, sans jamais rien y écrire.
 */
async function checkList(config) {
  try {
    const response = await fetchListFields(config);
    if (response.ok) return { ok: true, status: "ok" };
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        status: "identifiants refusés (401) — régénérez la clé API Sarbacane",
      };
    }
    return { ok: false, status: `réponse inattendue (HTTP ${response.status})` };
  } catch (error) {
    return { ok: false, status: `injoignable : ${error.message}` };
  }
}

module.exports = {
  SARBACANE_TIMEOUT_MS,
  sarbacaneCredentials,
  sarbacaneApiBase,
  sarbacaneFetch,
  resolveFieldMap,
  buildSarbacaneContact,
  pushContact,
  checkList,
};
