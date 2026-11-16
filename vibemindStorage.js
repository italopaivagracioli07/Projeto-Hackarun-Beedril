/**
 * VibeMind — Storage v1 (Equipe 04 — Mega Beedrill)
 * JavaScript ES Modules. Sem dependências externas.
 *
 * IMPORTANTE: o armazenamento de eventos/respostas/avaliações neste módulo
 * é LOCAL e serve para o MVP demonstrativo. Para visitantes em vários
 * dispositivos, integrar um banco compartilhado (ex.: Supabase).
 */

export const CATEGORIES = Object.freeze([
  "musica", "jogos", "cultura", "infantil", "gastronomia", "tecnologia",
]);

export const CATEGORY_LABELS = Object.freeze({
  musica: "Música", jogos: "Jogos", cultura: "Arte e cultura",
  infantil: "Família e crianças", gastronomia: "Gastronomia", tecnologia: "Tecnologia",
});

const KEYS = Object.freeze({
  events: "vibemind:v1:events",
  preferences: "vibemind:v1:preferences",
  evaluations: "vibemind:v1:evaluations",
  demo: "vibemind:v1:demo",
  secret: "vibemind:v1:secret",
  draft: "vibemind:v1:draft",
  secretClicks: "vibemind:v1:secretClicks",
});

function getDefaultStorage(type) {
  if (typeof window === "undefined") {
    throw new Error("Navegador indisponível: informe um Storage nos testes.");
  }
  try {
    const target = type === "local" ? window.localStorage : window.sessionStorage;
    const key = "__vibemind_test__";
    target.setItem(key, "1");
    target.removeItem(key);
    return target;
  } catch (_error) {
    throw new Error(`O navegador bloqueou ${type}Storage. Verifique as permissões.`);
  }
}

function requireText(value, field, maxLength = 120) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > maxLength) {
    throw new Error(`${field}: preencha entre 1 e ${maxLength} caracteres.`);
  }
  return text;
}

function assertCategory(value) {
  if (!CATEGORIES.includes(value)) {
    throw new Error(`Categoria inválida: ${String(value)}`);
  }
  return value;
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `vm-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function isISODate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function readJSON(store, key, fallback) {
  try {
    const raw = store.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (_error) {
    throw new Error(`Não foi possível ler ${key}. Os dados podem estar corrompidos.`);
  }
}

function writeJSON(store, key, value) {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch (_error) {
    throw new Error("Falha ao salvar dados. Verifique espaço e permissões do navegador.");
  }
}

function readArray(store, key) {
  const value = readJSON(store, key, []);
  if (!Array.isArray(value)) throw new Error(`Formato inesperado para ${key}.`);
  return value;
}

/** Fábrica que permite usar Storage real no navegador e simulado nos testes. */
export function createVibeMindStorage({ localStore, sessionStore } = {}) {
  const local = localStore ?? getDefaultStorage("local");
  const session = sessionStore ?? getDefaultStorage("session");

  function listEvents() {
    return readArray(local, KEYS.events);
  }

  function addEvent({ title, category, date, place = "Capim Dourado Shopping", description = "" }) {
    const event = {
      id: makeId(),
      title: requireText(title, "Nome do evento"),
      category: assertCategory(category),
      date: isISODate(date) ? date : (() => { throw new Error("Data inválida (AAAA-MM-DD)."); })(),
      place: requireText(place, "Local", 100),
      description: String(description).trim().slice(0, 300),
      createdAt: new Date().toISOString(),
    };
    writeJSON(local, KEYS.events, [...listEvents(), event]);
    return event;
  }

  function removeEvent(id) {
    const previous = listEvents();
    writeJSON(local, KEYS.events, previous.filter(event => event.id !== id));
    return previous.length !== listEvents().length;
  }

  function listPreferences() {
    return readArray(local, KEYS.preferences);
  }

  function savePreference({ interests, channel = "qr", ageRange = "nao-informado", schedule = "indiferente" }) {
    const selected = Array.isArray(interests) ? [...new Set(interests)] : [];
    if (selected.length === 0) throw new Error("Selecione ao menos um interesse.");
    selected.forEach(assertCategory);
    if (!["qr", "totem", "assistido"].includes(channel)) throw new Error("Canal inválido.");
    if (!["nao-informado", "crianca", "adolescente", "adulto", "idoso"].includes(ageRange)) {
      throw new Error("Faixa etária inválida.");
    }
    if (!["indiferente", "manha", "tarde", "noite"].includes(schedule)) {
      throw new Error("Horário inválido.");
    }
    const preference = {
      id: makeId(),
      interests: selected,
      channel, ageRange, schedule,
      createdAt: new Date().toISOString(),
    };
    writeJSON(local, KEYS.preferences, [...listPreferences(), preference]);
    clearDraft();
    return preference;
  }

  function listEvaluations() {
    return readArray(local, KEYS.evaluations);
  }

  function saveEvaluation({ eventId, rating }) {
    if (!listEvents().some(event => event.id === eventId)) {
      throw new Error("Selecione um evento cadastrado.");
    }
    const score = Number(rating);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new Error("Avaliação deve ser um número de 1 a 5.");
    }
    const evaluation = { id: makeId(), eventId, rating: score, createdAt: new Date().toISOString() };
    writeJSON(local, KEYS.evaluations, [...listEvaluations(), evaluation]);
    return evaluation;
  }

  function saveDraft(draft) {
    const interests = Array.isArray(draft?.interests) ? draft.interests : [];
    interests.forEach(assertCategory);
    writeJSON(session, KEYS.draft, {
      interests,
      channel: draft?.channel ?? "qr",
      ageRange: draft?.ageRange ?? "nao-informado",
      schedule: draft?.schedule ?? "indiferente",
    });
  }

  function loadDraft() {
    return readJSON(session, KEYS.draft, null);
  }

  function clearDraft() {
    session.removeItem(KEYS.draft);
  }

  function recommendEvents(interests) {
    const selected = Array.isArray(interests) ? interests : [];
    selected.forEach(assertCategory);
    return listEvents()
      .map(event => ({ ...event, matchScore: selected.includes(event.category) ? 1 : 0 }))
      .sort((a, b) => b.matchScore - a.matchScore || a.date.localeCompare(b.date));
  }

  function getDashboard() {
    const preferences = listPreferences();
    const evaluations = listEvaluations();
    const byInterest = Object.fromEntries(CATEGORIES.map(category => [category, 0]));
    const byChannel = { qr: 0, totem: 0, assistido: 0 };
    const byAgeRange = { "nao-informado": 0, crianca: 0, adolescente: 0, adulto: 0, idoso: 0 };
    preferences.forEach(response => {
      (response.interests ?? []).forEach(category => {
        if (category in byInterest) byInterest[category]++;
      });
      if (response.channel in byChannel) byChannel[response.channel]++;
      if (response.ageRange in byAgeRange) byAgeRange[response.ageRange]++;
    });
    const byEvent = listEvents().map(event => {
      const ratings = evaluations.filter(entry => entry.eventId === event.id);
      return {
        id: event.id, title: event.title, evaluations: ratings.length,
        averageRating: ratings.length
          ? Number((ratings.reduce((acc, entry) => acc + entry.rating, 0) / ratings.length).toFixed(1))
          : null,
      };
    });
    return {
      totalEvents: listEvents().length,
      totalResponses: preferences.length,
      totalEvaluations: evaluations.length,
      byInterest, byChannel, byAgeRange, byEvent,
      demoData: local.getItem(KEYS.demo) === "1",
    };
  }

  function getSnapshot() {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      events: listEvents(),
      preferences: listPreferences(),
      evaluations: listEvaluations(),
      demoData: local.getItem(KEYS.demo) === "1",
    };
  }

  function exportJSON() {
    return JSON.stringify(getSnapshot(), null, 2);
  }

  function importJSON(raw) {
    let data;
    try { data = typeof raw === "string" ? JSON.parse(raw) : raw; }
    catch (_error) { throw new Error("Arquivo JSON inválido."); }
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.events) ||
      !Array.isArray(data.preferences) || !Array.isArray(data.evaluations)) {
      throw new Error("Backup incompatível com o Storage v1.");
    }
    // Validação mínima; importar apenas backups gerados pelo próprio VibeMind.
    for (const event of data.events) {
      if (!event.id || !event.title || !isISODate(event.date)) throw new Error("Evento inválido no backup.");
      assertCategory(event.category);
    }
    for (const item of data.preferences) {
      if (!Array.isArray(item.interests)) throw new Error("Preferência inválida no backup.");
      item.interests.forEach(assertCategory);
    }
    for (const rating of data.evaluations) {
      if (!Number.isInteger(rating.rating) || rating.rating < 1 || rating.rating > 5) {
        throw new Error("Avaliação inválida no backup.");
      }
    }
    writeJSON(local, KEYS.events, data.events);
    writeJSON(local, KEYS.preferences, data.preferences);
    writeJSON(local, KEYS.evaluations, data.evaluations);
    local.setItem(KEYS.demo, data.demoData ? "1" : "0");
    return getSnapshot();
  }

  function clearAll() {
    for (const key of Object.values(KEYS)) local.removeItem(key);
    session.removeItem(KEYS.draft);
    session.removeItem(KEYS.secretClicks);
  }

  function seedDemoData() {
    clearAll();
    const samples = [
      ["Festival de Música Local", "musica", "2026-11-20"],
      ["Desafio Gamer", "jogos", "2026-11-21"],
      ["Oficina de Arte para Famílias", "infantil", "2026-11-22"],
      ["Exposição Cultura do Tocantins", "cultura", "2026-11-23"],
      ["Feira Sabores do Cerrado", "gastronomia", "2026-11-24"],
      ["Mostra de Tecnologia", "tecnologia", "2026-11-25"],
    ];
    const events = samples.map(([title, category, date]) => addEvent({ title, category, date }));
    [
      { interests: ["musica", "cultura"], channel: "qr", ageRange: "adulto", schedule: "noite" },
      { interests: ["jogos", "tecnologia"], channel: "qr", ageRange: "adolescente", schedule: "tarde" },
      { interests: ["infantil", "cultura"], channel: "totem", ageRange: "idoso", schedule: "tarde" },
      { interests: ["gastronomia", "musica"], channel: "assistido", ageRange: "nao-informado", schedule: "indiferente" },
    ].forEach(savePreference);
    saveEvaluation({ eventId: events[0].id, rating: 5 });
    saveEvaluation({ eventId: events[0].id, rating: 4 });
    saveEvaluation({ eventId: events[1].id, rating: 5 });
    local.setItem(KEYS.demo, "1");
    return getDashboard();
  }

  function registerLogoClick() {
    if (local.getItem(KEYS.secret) === "1") return { unlocked: true, justUnlocked: false };
    const clicks = Number(session.getItem(KEYS.secretClicks) || "0") + 1;
    if (clicks >= 13) {
      local.setItem(KEYS.secret, "1");
      session.removeItem(KEYS.secretClicks);
      return { unlocked: true, justUnlocked: true };
    }
    session.setItem(KEYS.secretClicks, String(clicks));
    return { unlocked: false, justUnlocked: false, remaining: 13 - clicks };
  }

  function isSecretUnlocked() {
    return local.getItem(KEYS.secret) === "1";
  }

  return {
    listEvents, addEvent, removeEvent,
    listPreferences, savePreference,
    listEvaluations, saveEvaluation,
    saveDraft, loadDraft, clearDraft,
    recommendEvents, getDashboard, getSnapshot, exportJSON, importJSON,
    seedDemoData, clearAll, registerLogoClick, isSecretUnlocked,
  };
}

// Importável diretamente em React/Vite: import { vibeStorage } from './storage/vibemindStorage.js';
// A criação é adiada até o primeiro uso para evitar erro em ambientes sem janela.
export const vibeStorage = typeof window !== "undefined" ? createVibeMindStorage() : null;
