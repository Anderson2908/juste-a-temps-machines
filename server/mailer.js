/* ------------------------------------------------------------------ *
 * Alerte e-mail « être rappelé ».
 *
 * Quand un visiteur laisse son numéro (bouton « Être rappelé » de l'accueil
 * ou parcours « Quel est votre problématique ? »), l'équipe commerciale
 * reçoit un e-mail immédiatement, en plus du lead envoyé à Sarbacane.
 *
 * Configuration (variables d'environnement, jamais dans le code) :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  — compte d'envoi (Office 365)
 *   EMAIL_FROM                                  — expéditeur affiché
 *   CALLBACK_EMAIL_TO                           — destinataires, séparés par des virgules
 * Sans SMTP configuré, l'alerte est simplement ignorée (le lead reste
 * enregistré dans Sarbacane et dans le journal local).
 * ------------------------------------------------------------------ */

const nodemailer = require("nodemailer");

const DEFAULT_CALLBACK_TO = "l.tedeschi@justeatemps.com,c.fortier@justeatemps.com";

let transporter = null;

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!smtpConfigured()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 587 = STARTTLS (Office 365)
      requireTLS: port !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

function callbackRecipients() {
  return (process.env.CALLBACK_EMAIL_TO || DEFAULT_CALLBACK_TO)
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** « 0612345678 » → « 06 12 34 56 78 » (sinon inchangé). */
function formatPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return digits.replace(/(\d{2})(?=\d)/g, "$1 ");
  return String(phone || "");
}

function phoneHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length === 10 ? `tel:+33${digits.slice(1)}` : `tel:${digits}`;
}

const ORIGINS = {
  "hero-rappel": "Bouton « Être rappelé » — en-tête de l'accueil",
  "problematique-rappel": "Parcours « Quel est votre problématique ? »",
};

/** Le besoin choisi par le visiteur, tiré de « Demande de rappel — <besoin> ». */
function needFrom(payload) {
  if (payload.source !== "problematique-rappel") return "";
  const parts = String(payload.message || "").split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ").trim() : "";
}

function formatDateParis(iso) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso || Date.now()));
}

function buildCallbackEmail(payload) {
  const phone = formatPhone(payload.phone);
  const need = needFrom(payload);
  const origin = ORIGINS[payload.source] || payload.source || "Site web";
  const when = formatDateParis(payload.submittedAt);

  const subject = need
    ? `Demande de rappel : ${phone} — ${need}`
    : `Demande de rappel : ${phone}`;

  const lines = [
    "Un visiteur du site demande à être rappelé.",
    "",
    `Téléphone : ${phone}`,
    need ? `Besoin : ${need}` : null,
    `Origine : ${origin}`,
    `Reçu le : ${when}`,
    "",
    "Engagement affiché sur le site : rappel sous 24 h.",
  ].filter((line) => line !== null);

  const row = (label, value) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#6b6460;white-space:nowrap">${label}</td>` +
    `<td style="padding:6px 0;color:#212529">${value}</td></tr>`;

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#faf8f6;font-family:Arial,Helvetica,sans-serif;font-size:15px">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e0d8d4;border-radius:12px;padding:24px">
    <p style="margin:0 0 4px;color:#c36043;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Demande de rappel</p>
    <p style="margin:0 0 20px;font-size:18px;color:#0a0a0a">Un visiteur du site demande à être rappelé.</p>
    <p style="margin:0 0 20px">
      <a href="${phoneHref(payload.phone)}" style="display:inline-block;background:#c36043;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:18px;font-weight:bold">${escapeHtml(phone)}</a>
    </p>
    <table style="border-collapse:collapse">
      ${need ? row("Besoin", escapeHtml(need)) : ""}
      ${row("Origine", escapeHtml(origin))}
      ${row("Reçu le", escapeHtml(when))}
    </table>
    <p style="margin:20px 0 0;color:#6b6460;font-size:13px">Engagement affiché sur le site : rappel sous 24&nbsp;h.</p>
  </div>
</body></html>`;

  return { subject, text: lines.join("\n"), html };
}

/**
 * Envoie l'alerte « être rappelé ». Ne lève jamais : un échec d'envoi est
 * journalisé, la demande du visiteur reste acceptée (et conservée ailleurs).
 */
async function sendCallbackAlert(payload) {
  const transport = getTransporter();
  if (!transport) {
    console.info("[rappel] SMTP non configuré : pas d'e-mail envoyé.");
    return { sent: false, reason: "not-configured" };
  }

  const to = callbackRecipients();
  if (to.length === 0) return { sent: false, reason: "no-recipient" };

  const { subject, text, html } = buildCallbackEmail(payload);
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    console.info(`[rappel] Alerte envoyée à ${to.length} destinataire(s).`);
    return { sent: true };
  } catch (error) {
    console.error("[rappel] Échec de l'envoi de l'alerte :", error.message);
    return { sent: false, reason: error.message };
  }
}

/** Diagnostic : vérifie la connexion SMTP sans envoyer de message. */
async function checkSmtp() {
  const transport = getTransporter();
  if (!transport) return { ok: false, status: "non configuré" };
  try {
    await transport.verify();
    return { ok: true, status: "ok" };
  } catch (error) {
    return { ok: false, status: error.message };
  }
}

module.exports = {
  sendCallbackAlert,
  checkSmtp,
  buildCallbackEmail,
  callbackRecipients,
  smtpConfigured,
};
