const modelsByProvider = {
  openai: ["gpt-4.1", "gpt-4o-mini", "gpt-4.1-mini"],
  anthropic: ["claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"],
  google: ["gemini-2.0-flash", "gemini-1.5-pro"],
  openrouter: []
};

const providerEl = document.getElementById("provider");
const modelEl = document.getElementById("model");
const modelSearchEl = document.getElementById("modelSearch");
const chatSearchEl = document.getElementById("chatSearch");
const promptPresetEl = document.getElementById("promptPreset");
const applyPresetEl = document.getElementById("applyPreset");
const apiKeyEl = document.getElementById("apiKey");
const saveKeyEl = document.getElementById("saveKey");
const clearKeysEl = document.getElementById("clearKeys");
const messagesEl = document.getElementById("messages");
const promptEl = document.getElementById("prompt");
const sendEl = document.getElementById("send");
const statusEl = document.getElementById("status");
const charCountEl = document.getElementById("charCount");
const temperatureEl = document.getElementById("temperature");
const newChatEl = document.getElementById("newChat");
const exportChatEl = document.getElementById("exportChat");
const importChatEl = document.getElementById("importChat");
const importFileEl = document.getElementById("importFile");
const regenerateEl = document.getElementById("regenerate");
const themeToggleEl = document.getElementById("themeToggle");
const messageCountEl = document.getElementById("messageCount");
const favoriteCountEl = document.getElementById("favoriteCount");
const sessionTimeEl = document.getElementById("sessionTime");
const activeModelLabelEl = document.getElementById("activeModelLabel");

const keyStorageKey = "eclat_pro_ai_keys";
const historyStorageKey = "eclat_pro_ai_history";
const themeStorageKey = "eclat_pro_ai_theme";
const favoritesStorageKey = "eclat_pro_ai_favorites";

const systemPrompt = "Tu es Eclat Pro AI, un assistant clair, fiable et professionnel.";
const conversation = [{ role: "system", content: systemPrompt }];
const startedAt = Date.now();
const openRouterFallbackModels = ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash-001"];

const promptPresets = {
  resume: "Resume ce texte en 5 points cles, style simple et actionnable:\n\n",
  code: "Genere une solution robuste avec etapes, code, et explications courtes pour:\n\n",
  marketing: "Redige un post marketing convaincant avec hook + preuve + CTA sur:\n\n",
  plan: "Construis un plan d'action concret en 10 etapes pour:\n\n"
};

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const nowTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2, 9)}`;

let favorites = new Set(readJson(favoritesStorageKey, []));

const updateCounters = () => {
  messageCountEl.textContent = String(conversation.filter((m) => m.role !== "system").length);
  favoriteCountEl.textContent = String(favorites.size);
};

const refreshSessionClock = () => {
  const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");
  sessionTimeEl.textContent = `${mm}:${ss}`;
};

const applyChatSearch = () => {
  const q = chatSearchEl.value.trim().toLowerCase();
  const wraps = messagesEl.querySelectorAll(".message-wrap");
  wraps.forEach((w) => {
    const text = w.querySelector(".message")?.textContent?.toLowerCase() || "";
    w.classList.toggle("hidden", q.length > 0 && !text.includes(q));
  });
};

const persistHistory = () => {
  const history = conversation.filter((m) => m.role !== "system");
  writeJson(historyStorageKey, history);
  writeJson(favoritesStorageKey, Array.from(favorites));
  updateCounters();
};

const toggleFavorite = (id, wrap) => {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  wrap.classList.toggle("favorite", favorites.has(id));
  persistHistory();
};

const deleteMessage = (id, wrap) => {
  const idx = conversation.findIndex((m) => m.id === id);
  if (idx !== -1) conversation.splice(idx, 1);
  wrap.remove();
  favorites.delete(id);
  persistHistory();
};

const renderMessage = (role, content, time = nowTime(), forcedId = uid()) => {
  const id = forcedId;
  const wrap = document.createElement("div");
  wrap.className = `message-wrap ${role}`;
  wrap.dataset.id = id;
  if (favorites.has(id)) wrap.classList.add("favorite");

  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = content;

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.textContent = `${role === "user" ? "Toi" : "Assistant"} - ${time}`;

  const favBtn = document.createElement("button");
  favBtn.className = "mini-btn";
  favBtn.textContent = favorites.has(id) ? "Unpin" : "Pin";
  favBtn.addEventListener("click", () => {
    toggleFavorite(id, wrap);
    favBtn.textContent = favorites.has(id) ? "Unpin" : "Pin";
  });
  meta.appendChild(favBtn);

  const delBtn = document.createElement("button");
  delBtn.className = "mini-btn";
  delBtn.textContent = "Suppr";
  delBtn.addEventListener("click", () => deleteMessage(id, wrap));
  meta.appendChild(delBtn);

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
  applyChatSearch();
  return id;
};

const loadHistory = () => {
  const history = readJson(historyStorageKey, []);
  history.forEach((m) => {
    conversation.push({ id: m.id || uid(), role: m.role, content: m.content, time: m.time || nowTime() });
    renderMessage(m.role, m.content, m.time || nowTime(), m.id || uid());
  });
  updateCounters();
};

const setBusy = (busy, text = "") => {
  sendEl.disabled = busy;
  regenerateEl.disabled = busy;
  promptEl.disabled = busy;
  statusEl.textContent = text || (busy ? "Generation en cours..." : "Pret.");
};

const getFilteredModels = (provider) => {
  const query = modelSearchEl.value.trim().toLowerCase();
  const list = modelsByProvider[provider] || [];
  if (!query) return list;
  return list.filter((m) => m.toLowerCase().includes(query));
};

const renderModelSelect = (provider) => {
  const list = getFilteredModels(provider);
  modelEl.innerHTML = "";
  list.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modelEl.appendChild(opt);
  });
  activeModelLabelEl.textContent = `${provider} / ${modelEl.value || "-"}`;
};

const updateModelOptions = async () => {
  const provider = providerEl.value;
  if (provider === "openrouter" && modelsByProvider.openrouter.length === 0) {
    statusEl.textContent = "Chargement des modeles OpenRouter...";
    try {
      const response = await fetch("/api/models/openrouter");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Echec chargement OpenRouter");
      modelsByProvider.openrouter = Array.isArray(data.models) ? data.models : [];
      statusEl.textContent = `${modelsByProvider.openrouter.length} modeles OpenRouter charges.`;
    } catch {
      modelsByProvider.openrouter = openRouterFallbackModels;
      statusEl.textContent = "API OpenRouter indisponible: liste de secours chargee.";
    }
  }
  renderModelSelect(provider);
  const keys = readJson(keyStorageKey, {});
  apiKeyEl.value = keys[provider] || "";
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
  favorites = new Set();
  conversation.push({ role: "system", content: systemPrompt });
  localStorage.removeItem(historyStorageKey);
  localStorage.removeItem(favoritesStorageKey);
  updateCounters();
  renderMessage("assistant", "Nouvelle conversation lancee.");
};

const exportConversation = () => {
  const history = conversation.filter((m) => m.role !== "system");
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), history }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eclat-pro-ai-chat-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  statusEl.textContent = "Conversation exportee.";
};

const importConversation = async (file) => {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const history = Array.isArray(parsed?.history) ? parsed.history : [];
    clearConversation();
    history.forEach((m) => {
      const id = m.id || uid();
      const role = m.role === "assistant" ? "assistant" : "user";
      const content = String(m.content || "");
      const time = m.time || nowTime();
      conversation.push({ id, role, content, time });
      renderMessage(role, content, time, id);
    });
    persistHistory();
    statusEl.textContent = "Conversation importee.";
  } catch {
    statusEl.textContent = "Import impossible: fichier invalide.";
  }
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

const updateCharCount = () => {
  const n = promptEl.value.length;
  charCountEl.textContent = `${n} caractere${n > 1 ? "s" : ""}`;
};

const sendPrompt = async (forcedText = null) => {
  const text = (forcedText ?? promptEl.value).trim();
  if (!text) return;

  const provider = providerEl.value;
  const model = modelEl.value;
  const temperature = Number(temperatureEl.value || 0.7);
  const apiKey = apiKeyEl.value.trim();
  if (!apiKey) return (statusEl.textContent = "Ajoute une cle API avant d'envoyer.");

  if (!forcedText) {
    const id = renderMessage("user", text);
    conversation.push({ id, role: "user", content: text, time: nowTime() });
    promptEl.value = "";
    updateCharCount();
  }
  persistHistory();
  setBusy(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, apiKey, messages: conversation.map((m) => ({ role: m.role, content: m.content })), temperature })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur inconnue");

    const id = renderMessage("assistant", data.answer);
    conversation.push({ id, role: "assistant", content: data.answer, time: nowTime() });
    persistHistory();
    setBusy(false, "Reponse terminee.");
  } catch (error) {
    const txt = `Erreur: ${error.message}`;
    const id = renderMessage("assistant", txt);
    conversation.push({ id, role: "assistant", content: txt, time: nowTime() });
    persistHistory();
    setBusy(false, "Erreur lors de l'appel API.");
  }
};

const regenerateLastAnswer = async () => {
  const lastUser = [...conversation].reverse().find((m) => m.role === "user");
  if (!lastUser) return (statusEl.textContent = "Aucun message utilisateur a regenerer.");
  await sendPrompt(lastUser.content);
};

saveKeyEl.addEventListener("click", saveKey);
clearKeysEl.addEventListener("click", clearKeys);
providerEl.addEventListener("change", () => updateModelOptions());
modelEl.addEventListener("change", () => (activeModelLabelEl.textContent = `${providerEl.value} / ${modelEl.value}`));
modelSearchEl.addEventListener("input", () => renderModelSelect(providerEl.value));
chatSearchEl.addEventListener("input", applyChatSearch);
applyPresetEl.addEventListener("click", () => {
  const key = promptPresetEl.value;
  if (!key || !promptPresets[key]) return;
  promptEl.value = `${promptPresets[key]}${promptEl.value}`;
  updateCharCount();
  statusEl.textContent = "Template applique.";
});
newChatEl.addEventListener("click", clearConversation);
exportChatEl.addEventListener("click", exportConversation);
importChatEl.addEventListener("click", () => importFileEl.click());
importFileEl.addEventListener("change", async () => {
  const file = importFileEl.files?.[0];
  if (file) await importConversation(file);
  importFileEl.value = "";
});
regenerateEl.addEventListener("click", regenerateLastAnswer);
themeToggleEl.addEventListener("click", toggleTheme);
sendEl.addEventListener("click", () => sendPrompt());
promptEl.addEventListener("input", updateCharCount);
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
updateCharCount();

if (readJson(historyStorageKey, []).length > 0) {
  loadHistory();
  statusEl.textContent = "Historique restaure.";
} else {
  const id = renderMessage("assistant", "Bienvenue dans Eclat Pro AI. Utilise les templates, la recherche, les favoris et l'export pour travailler plus vite.");
  conversation.push({ id, role: "assistant", content: "Bienvenue dans Eclat Pro AI. Utilise les templates, la recherche, les favoris et l'export pour travailler plus vite.", time: nowTime() });
  persistHistory();
}