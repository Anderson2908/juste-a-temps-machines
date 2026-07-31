const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const { handleContactSubmission } = require("./handlers/contact");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const rootDir = path.join(__dirname, "..");
const port = Number(process.env.PORT) || 5173;

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

app.post("/api/contact", async (req, res) => {
  const result = await handleContactSubmission({
    ...req.body,
    source: req.body?.source || req.get("referer") || "site-web",
  });
  res.status(result.status).json(result.body);
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

app.listen(port, () => {
  console.log(`Juste à temps — http://localhost:${port}`);
  if (!process.env.CONTACT_WEBHOOK_URL) {
    console.log("Contact API : mode log (définissez CONTACT_WEBHOOK_URL dans .env)");
  }
});
