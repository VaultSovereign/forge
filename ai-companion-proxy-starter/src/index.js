import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();
app.use(express.json({ limit: "5mb" }));

const BASE = process.env.TARGET_BASE || "https://cloudaicompanion.googleapis.com";
const SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const auth = new GoogleAuth({ scopes: [SCOPE] });

app.get("/health", (_, res) => res.json({ ok: true, base: BASE }));

app.post("/invoke", async (req, res) => {
  const { path = "/", method = "POST", body = {}, query = "" } = req.body || {};
  const url = `${BASE}${path}${query ? `?${new URLSearchParams(query).toString()}` : ""}`;
  try {
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const started = Date.now();
    const r = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body)
    });
    const text = await r.text();
    const ms = Date.now() - started;
    console.log(JSON.stringify({ level: "INFO", target: BASE, path, status: r.status, ms }));
    res.status(r.status).type("application/json").send(text);
  } catch (e) {
    console.error(JSON.stringify({ level: "ERROR", msg: e.message }));
    res.status(500).json({ error: "proxy_error", message: e.message });
  }
});

export default app;

