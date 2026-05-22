const modelsByProvider = {
  openai: ["gpt-4.1", "gpt-4o-mini", "gpt-4.1-mini"],
  anthropic: ["claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"],
  google: ["gemini-2.0-flash", "gemini-1.5-pro"],
  openrouter: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash-001"]
};

const providerEl = document.getElementById("provider");
const modelEl = document.getElementById("model");
const apiKeyEl = document.getElementById("apiKey");
const saveKeyEl = document.getElementById("saveKey");
const messagesEl = document.getElementById("messages");
const promptEl = document.getElementById("prompt");
const sendEl = document.getElementById("send");
const statusEl = document.getElementById("status");
const temperatureEl = document.getElementById("temperature");

const conversation = [
  {
    role: "system",
    content: "Tu es Eclat Pro AI, un assistant clair, fiable et professionnel."
  }
];

const keyStorageKey = "eclat_pro_ai_keys";

const readKeys = () => {
  try {
    return JSON.parse(localStorage.getItem(keyStorageKey) || "{}");
  } catch {
    return {};
  }
};

const writeKeys = (keys) => {
  localStorage.setItem(keyStorageKey, JSON.stringify(keys));
};

const updateModelOptions = () => {
  const provider = providerEl.value;
  const list = modelsByProvider[provider] || [];
  modelEl.innerHTML = "";
  list.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modelEl.appendChild(opt);
  });

  const keys = readKeys();
  apiKeyEl.value = keys[provider] || "";
};

const addMessage = (role, content) => {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = content;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

const setBusy = (busy, text = "") => {
  sendEl.disabled = busy;
  promptEl.disabled = busy;
  statusEl.textContent = text || (busy ? "Generation en cours..." : "Pret.");
};

saveKeyEl.addEventListener("click", () => {
  const provider = providerEl.value;
  const keys = readKeys();
  keys[provider] = apiKeyEl.value.trim();
  writeKeys(keys);
  statusEl.textContent = `Cle ${provider} enregistree localement.`;
});

providerEl.addEventListener("change", updateModelOptions);

const sendPrompt = async () => {
  const text = promptEl.value.trim();
  if (!text) return;

  const provider = providerEl.value;
  const model = modelEl.value;
  const temperature = Number(temperatureEl.value || 0.7);
  const apiKey = apiKeyEl.value.trim();

  if (!apiKey) {
    statusEl.textContent = "Ajoute une cle API avant d'envoyer.";
    return;
  }

  addMessage("user", text);
  conversation.push({ role: "user", content: text });
  promptEl.value = "";

  setBusy(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, apiKey, messages: conversation, temperature })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Erreur inconnue");
    }

    addMessage("assistant", data.answer);
    conversation.push({ role: "assistant", content: data.answer });
    setBusy(false, "Reponse terminee.");
  } catch (error) {
    addMessage("assistant", `Erreur: ${error.message}`);
    setBusy(false, "Erreur lors de l'appel API.");
  }
};

sendEl.addEventListener("click", sendPrompt);
promptEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendPrompt();
  }
});

updateModelOptions();
addMessage("assistant", "Bienvenue dans Eclat Pro AI. Choisis ton provider, ton modele, ajoute ta cle API et lance ta premiere requete.");