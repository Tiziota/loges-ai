const modelsByProvider = {
  openai: ["gpt-4.1", "gpt-4o-mini", "gpt-4.1-mini"],
  anthropic: ["claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"],
  google: ["gemini-2.0-flash", "gemini-1.5-pro"],
  openrouter: []
};

const providerEl = document.getElementById("provider");
const modelEl = document.getElementById("model");
const apiKeyEl = document.getElementById("apiKey");
const saveKeyEl = document.getElementById("saveKey");
const clearKeysEl = document.getElementById("clearKeys");
const messagesEl = document.getElementById("messages");
const promptEl = document.getElementById("prompt");
const sendEl = document.getElementById("send");
const statusEl = document.getElementById("status");
const temperatureEl = document.getElementById("temperature");
const newChatEl = document.getElementById("newChat");
const exportChatEl = document.getElementById("exportChat");
const themeToggleEl = document.getElementById("themeToggle");
const messageCountEl = document.getElementById("messageCount");
const sessionTimeEl = document.getElementById("sessionTime");
const activeModelLabelEl = document.getElementById("activeModelLabel");

const keyStorageKey = "eclat_pro_ai_keys";
const historyStorageKey = "eclat_pro_ai_history";
const themeStorageKey = "eclat_pro_ai_theme";

const systemPrompt = "Tu es Eclat Pro AI, un assistant clair, fiable et professionnel.";
const conversation = [{ role: "system", content: systemPrompt }];
const startedAt = Date.now();
const openRouterFallbackModels = ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash-001"];

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const nowTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const updateCounters = () => {
  const count = conversation.filter((m) => m.role !== "system").length;
  messageCountEl.textContent = String(count);
};

const refreshSessionClock = () => {
  const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");
  sessionTimeEl.textContent = `${mm}:${ss}`;
};

const renderMessage = (role, content, time = nowTime()) => {
  const wrap = document.createElement("div");
  wrap.className = `message-wrap ${role}`;

  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = content;

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.textContent = `${role === "user" ? "Toi" : "Assistant"} - ${time}`;

  if (role === "assistant") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "mini-btn";
    copyBtn.textContent = "Copier";
    copyBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(content);
      statusEl.textContent = "Reponse copiee.";
    });
    meta.appendChild(copyBtn);
  }

  wrap.appendChild(div);
  wrap.appendChild(meta);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

const persistHistory = () => {
  const history = conversation.filter((m) => m.role !== "system");
  writeJson(historyStorageKey, history);
  updateCounters();
};

const loadHistory = () => {
  const history = readJson(historyStorageKey, []);
  history.forEach((m) => {
    conversation.push({ role: m.role, content: m.content });
    renderMessage(m.role, m.content, m.time || nowTime());
  });
  updateCounters();
};

const setBusy = (busy, text = "") => {
  sendEl.disabled = busy;
  promptEl.disabled = busy;
  statusEl.textContent = text || (busy ? "Generation en cours..." : "Pret.");
};

const updateModelOptions = async () => {
  const provider = providerEl.value;
  let list = modelsByProvider[provider] || [];

  if (provider === "openrouter" && list.length === 0) {
    statusEl.textContent = "Chargement des modeles OpenRouter...";
    try {
      const response = await fetch("/api/models/openrouter");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Echec chargement OpenRouter");
      modelsByProvider.openrouter = Array.isArray(data.models) ? data.models : [];
      list = modelsByProvider.openrouter;
      statusEl.textContent = `${list.length} modeles OpenRouter charges.`;
    } catch {
      modelsByProvider.openrouter = openRouterFallbackModels;
      list = openRouterFallbackModels;
      statusEl.textContent = "API OpenRouter indisponible: liste de secours chargee.";
    }
  }

  modelEl.innerHTML = "";
  list.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modelEl.appendChild(opt);
  });

  const keys = readJson(keyStorageKey, {});
  apiKeyEl.value = keys[provider] || "";
  activeModelLabelEl.textContent = `${provider} / ${modelEl.value || "-"}`;
};

const saveKey = () => {
  const provider = providerEl.value;
  const keys = readJson(keyStorageKey, {});
  keys[provider] = apiKeyEl.value.trim();
  writeJson(keyStorageKey, keys);
  statusEl.textContent = `Cle ${provider} enregistree localement.`;
};

const clearKeys = () => {
  localStorage.removeItem(keyStorageKey);
  apiKeyEl.value = "";
  statusEl.textContent = "Toutes les cles locales ont ete supprimees.";
};

const clearConversation = () => {
  messagesEl.innerHTML = "";
  conversation.length = 0;
  conversation.push({ role: "system", content: systemPrompt });
  localStorage.removeItem(historyStorageKey);
  updateCounters();
  renderMessage("assistant", "Nouvelle conversation lancee.");
};

const exportConversation = () => {
  const history = readJson(historyStorageKey, []);
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), history }, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eclat-pro-ai-chat-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  statusEl.textContent = "Conversation exportee.";
};

const applyTheme = (theme) => {
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem(themeStorageKey, theme);
  themeToggleEl.textContent = theme === "dark" ? "Mode clair" : "Mode sombre";
};

const toggleTheme = () => {
  const current = localStorage.getItem(themeStorageKey) || "light";
  applyTheme(current === "light" ? "dark" : "light");
};

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

  renderMessage("user", text);
  conversation.push({ role: "user", content: text });
  persistHistory();
  promptEl.value = "";
  setBusy(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, apiKey, messages: conversation, temperature })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur inconnue");

    renderMessage("assistant", data.answer);
    conversation.push({ role: "assistant", content: data.answer });
    persistHistory();
    setBusy(false, "Reponse terminee.");
  } catch (error) {
    renderMessage("assistant", `Erreur: ${error.message}`);
    conversation.push({ role: "assistant", content: `Erreur: ${error.message}` });
    persistHistory();
    setBusy(false, "Erreur lors de l'appel API.");
  }
};

saveKeyEl.addEventListener("click", saveKey);
clearKeysEl.addEventListener("click", clearKeys);
providerEl.addEventListener("change", () => {
  updateModelOptions();
});
modelEl.addEventListener("change", () => {
  activeModelLabelEl.textContent = `${providerEl.value} / ${modelEl.value}`;
});
newChatEl.addEventListener("click", clearConversation);
exportChatEl.addEventListener("click", exportConversation);
themeToggleEl.addEventListener("click", toggleTheme);
sendEl.addEventListener("click", sendPrompt);

promptEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendPrompt();
  }
});

setInterval(refreshSessionClock, 1000);
refreshSessionClock();
applyTheme(localStorage.getItem(themeStorageKey) || "light");
updateModelOptions();

if (readJson(historyStorageKey, []).length > 0) {
  loadHistory();
  statusEl.textContent = "Historique restaure.";
} else {
  renderMessage(
    "assistant",
    "Bienvenue dans Eclat Pro AI. Choisis ton provider, ton modele, ajoute ta cle API et lance ta premiere requete."
  );
}
