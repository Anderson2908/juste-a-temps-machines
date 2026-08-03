const REQUIRED_FIELDS = ["email"];

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
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Sarbacane a répondu ${response.status}${detail ? ` : ${detail.slice(0, 200)}` : ""}`
    );
  }

  return response;
}

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
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `L'API de contact a répondu ${response.status}${detail ? ` : ${detail.slice(0, 200)}` : ""}`
    );
  }

  return response;
}

async function handleContactSubmission(body) {
  const payload = buildPayload(body, body.source);
  const validationError = validatePayload(payload);
  if (validationError) {
    return { status: 400, body: { ok: false, error: validationError } };
  }

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
      };
    } catch (error) {
      console.error("[contact]", error.message);
      return {
        status: 502,
        body: {
          ok: false,
          error: "Impossible d'envoyer votre demande pour le moment. Réessayez dans quelques instants.",
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

  console.info("[contact] Demande reçue (mode log) :", payload);
  return {
    status: 200,
    body: {
      ok: true,
      mode: "log",
      message: "Votre demande a bien été enregistrée. Nous vous recontacterons rapidement.",
    },
  };
}

module.exports = {
  handleContactSubmission,
  buildPayload,
  validatePayload,
  isSarbacaneMode,
};
