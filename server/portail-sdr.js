/**
 * Portail SDR — chaque demande (formulaire de contact, « Être rappelé »)
 * arrive aussi dans la file « Leads entrants » des SDR de l'intranet, qui la
 * prennent et créent l'affaire Pipedrive.
 *
 * S'ajoute à Sarbacane et à l'alerte e-mail, sans les remplacer. Envoi en
 * arrière-plan : le visiteur n'attend jamais le portail, et une panne du
 * portail n'empêche pas l'enregistrement de sa demande.
 *
 * Variables : LEADS_INTAKE_KEY (clé propre à ce site, obligatoire pour
 * activer l'envoi), LEADS_INTAKE_URL (facultative).
 */

const URL_PAR_DEFAUT =
  "https://intranet.juste-a-temps.com/proxy/portail-sdr/api/leads/intake";

const ETAPES = {
  "hero-rappel": "Être rappelé (accueil)",
  "problematique-rappel": "Être rappelé (votre besoin)",
};

function etape(source) {
  if (ETAPES[source]) return ETAPES[source];
  return "Formulaire de contact";
}

function page(source) {
  if (!source || ETAPES[source]) return null;
  if (/^https?:\/\//.test(source)) return source;
  return `https://services.justeatemps.com/${String(source).replace(/^\//, "")}`;
}

async function envoyerAuPortailSdr(payload, meta = {}) {
  const cle = process.env.LEADS_INTAKE_KEY;
  if (!cle) return { ok: false, reason: "not-configured" };

  const corps = {
    etape: etape(payload.source),
    societe: payload.company || undefined,
    contact: payload.name || undefined,
    email: payload.email || undefined,
    telephone: payload.phone || undefined,
    message: payload.message || undefined,
    page: page(payload.source) || undefined,
    ip: meta.ip || undefined,
    user_agent: meta.userAgent ? String(meta.userAgent).slice(0, 300) : undefined,
  };

  try {
    const response = await fetch(process.env.LEADS_INTAKE_URL || URL_PAR_DEFAUT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-lead-key": cle },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[portail-sdr] Réponse ${response.status} : ${detail.slice(0, 200)}`);
    }
    return { ok: response.ok };
  } catch (error) {
    console.error("[portail-sdr] Portail injoignable :", error.message);
    return { ok: false, reason: error.message };
  }
}

module.exports = { envoyerAuPortailSdr };
