import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

const providerConfig = {
  openai: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    buildPayload: ({ model, messages, temperature }) => ({ model, messages, temperature })
  },
  anthropic: {
    endpoint: "https://api.anthropic.com/v1/messages",
    buildPayload: ({ model, messages, temperature }) => {
      const systemMessage = messages.find((msg) => msg.role === "system")?.content || "";
      const chatMessages = messages
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({ role: msg.role === "assistant" ? "assistant" : "user", content: msg.content }));

      return {
        model,
        max_tokens: 1000,
        temperature,
        system: systemMessage,
        messages: chatMessages
      };
    }
  },
  google: {
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    buildPayload: ({ messages }) => {
      const contents = messages
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        }));

      return { contents };
    }
  },
  openrouter: {
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    buildPayload: ({ model, messages, temperature }) => ({ model, messages, temperature })
  }
};

const extractText = (provider, responseJson) => {
  if (provider === "openai" || provider === "openrouter") {
    return responseJson?.choices?.[0]?.message?.content || "Aucune reponse retournee.";
  }

  if (provider === "anthropic") {
    return responseJson?.content?.map((c) => c?.text || "").join("\n") || "Aucune reponse retournee.";
  }

  if (provider === "google") {
    return (
      responseJson?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join("\n") ||
      "Aucune reponse retournee."
    );
  }

  return "Provider non supporte.";
};

const buildHeaders = ({ provider, apiKey }) => {
  if (!apiKey) {
    throw new Error("Cle API manquante.");
  }

  if (provider === "openai" || provider === "openrouter") {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    };
  }

  if (provider === "anthropic") {
    return {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    };
  }

  if (provider === "google") {
    return {
      "Content-Type": "application/json"
    };
  }

  throw new Error("Provider inconnu.");
};

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "Eclat Pro AI", timestamp: new Date().toISOString() });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { provider, model, apiKey, messages = [], temperature = 0.7 } = req.body;

    if (!provider || !model || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Requete invalide: provider, model et messages sont requis." });
    }

    const config = providerConfig[provider];
    if (!config) {
      return res.status(400).json({ error: "Provider non supporte." });
    }

    let endpoint = config.endpoint;
    if (provider === "google") {
      if (!apiKey) {
        return res.status(400).json({ error: "Cle API Google manquante." });
      }
      endpoint = endpoint.replace("{model}", encodeURIComponent(model));
      endpoint += `?key=${encodeURIComponent(apiKey)}`;
    }

    const payload = config.buildPayload({ model, messages, temperature });
    const headers = buildHeaders({ provider, apiKey });

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || data?.error || "Erreur API externe",
        details: data
      });
    }

    const answer = extractText(provider, data);
    return res.json({ answer, raw: data });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Eclat Pro AI disponible sur http://localhost:${PORT}`);
});