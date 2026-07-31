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

  if (process.env.CONTACT_WEBHOOK_URL) {
    try {
      await forwardToWebhook(payload);
      return {
        status: 200,
        body: {
          ok: true,
          mode: "webhook",
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
        error: "Le service de contact n'est pas encore configuré (CONTACT_WEBHOOK_URL).",
      },
    };
  }

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

module.exports = { handleContactSubmission, buildPayload, validatePayload };
