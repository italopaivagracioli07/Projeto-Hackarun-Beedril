import { vibeStorage, CATEGORIES, CATEGORY_LABELS } from "../src/storage/vibemindStorage.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const showStatus = (message, error = false) => {
  const status = $("#status");
  status.textContent = message;
  status.classList.toggle("error", error);
  status.hidden = false;
  status.scrollIntoView({ block: "nearest", behavior: "smooth" });
};
const run = (fn) => { try { fn(); } catch (error) { showStatus(error.message, true); } };

function showTab(target) {
  $$(".tab").forEach(button => {
    const isActive = button.dataset.target === target;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  ["visitor", "admin", "storage"].forEach(id => { $(`#${id}`).hidden = id !== target; });
  $("#status").hidden = true;
  if (target === "admin") renderDashboard();
  if (target === "storage") $("#snapshot").textContent = vibeStorage.exportJSON();
}
$$(".tab").forEach(button => button.addEventListener("click", () => showTab(button.dataset.target)));

function newElement(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = String(content);
  return el;
}

function renderRecommendations(interests = []) {
  const holder = $("#recommended");
  holder.replaceChildren();
  const recommendations = vibeStorage.recommendEvents(interests);
  if (!recommendations.length) {
    holder.append(newElement("p", "empty", "Nenhum evento cadastrado. Vá ao painel ou carregue os dados fictícios em Storage."));
    return;
  }
  recommendations.slice(0, 6).forEach(event => {
    const card = newElement("div", "event-card");
    const content = newElement("div");
    content.append(newElement("strong", "", event.title));
    content.append(newElement("small", "", `${CATEGORY_LABELS[event.category]} • ${event.date}`));
    card.append(content);
    card.append(newElement("span", "match", event.matchScore ? "Combina com você ✓" : "Outras opções"));
    holder.append(card);
  });
}

function captureDraft() {
  return {
    interests: $$("input[name='interest']:checked").map(input => input.value),
    channel: $("#channel").value,
    ageRange: $("#age-range").value,
    schedule: $("#schedule").value,
  };
}
$("#save-draft").addEventListener("click", () => run(() => {
  vibeStorage.saveDraft(captureDraft());
  showStatus("Rascunho guardado no sessionStorage. Recarregue a página para testar.");
}));
$("#preference-form").addEventListener("submit", event => {
  event.preventDefault();
  run(() => {
    const draft = captureDraft();
    vibeStorage.savePreference(draft);
    renderRecommendations(draft.interests);
    showStatus("Preferências salvas localmente! Veja as recomendações abaixo e as contagens no EventMind.");
    // Não limpar a escolha automaticamente: o usuário pode vê-la após salvar.
  });
});

function renderEventSelectors() {
  const select = $("#evaluation-event");
  const previous = select.value;
  select.replaceChildren();
  const events = vibeStorage.listEvents();
  if (!events.length) select.append(new Option("Nenhum evento cadastrado", ""));
  events.forEach(event => select.append(new Option(event.title, event.id)));
  if (events.some(event => event.id === previous)) select.value = previous;
  $("#evaluation-form button").disabled = !events.length;
}
$("#evaluation-form").addEventListener("submit", event => {
  event.preventDefault();
  run(() => {
    vibeStorage.saveEvaluation({ eventId: $("#evaluation-event").value, rating: Number($("#rating").value) });
    showStatus("Avaliação registrada no localStorage!");
  });
});

function metric(title, number) {
  const card = newElement("div", "metric");
  card.append(newElement("b", "", number));
  card.append(newElement("span", "", title));
  return card;
}
function renderBars(targetSelector, values, labelMap) {
  const target = $(targetSelector);
  target.replaceChildren();
  const max = Math.max(1, ...Object.values(values));
  for (const [key, value] of Object.entries(values)) {
    const row = newElement("div", "bar-row");
    row.append(newElement("span", "", labelMap[key] ?? key));
    const track = newElement("div", "bar-track");
    const fill = newElement("div", "bar-fill");
    fill.style.width = `${(value / max) * 100}%`;
    track.append(fill);
    row.append(track);
    row.append(newElement("b", "", value));
    target.append(row);
  }
}
function renderDashboard() {
  const stats = vibeStorage.getDashboard();
  $("#demo-badge").hidden = !stats.demoData;
  $("#metrics").replaceChildren(
    metric("Eventos cadastrados", stats.totalEvents),
    metric("Respostas locais", stats.totalResponses),
    metric("Avaliações locais", stats.totalEvaluations)
  );
  renderBars("#interests-chart", stats.byInterest, CATEGORY_LABELS);
  renderBars("#channel-chart", stats.byChannel, { qr: "QR Code", totem: "Totem", assistido: "Assistido" });
  const holder = $("#events-admin");
  holder.replaceChildren();
  if (!stats.byEvent.length) holder.append(newElement("p", "empty", "Nenhum evento cadastrado."));
  stats.byEvent.forEach(event => {
    const card = newElement("div", "event-card");
    card.append(newElement("strong", "", event.title));
    card.append(newElement("span", "match", event.averageRating === null
      ? "Sem avaliações"
      : `${event.averageRating}/5 • ${event.evaluations} avaliações`));
    holder.append(card);
  });
  renderEventSelectors();
}

for (const category of CATEGORIES) $("#event-category").append(new Option(CATEGORY_LABELS[category], category));
$("#event-form").addEventListener("submit", event => {
  event.preventDefault();
  run(() => {
    vibeStorage.addEvent({ title: $("#event-title").value, category: $("#event-category").value, date: $("#event-date").value });
    $("#event-title").value = "";
    renderDashboard();
    showStatus("Evento armazenado localmente com sucesso!");
  });
});
$("#seed-demo").addEventListener("click", () => run(() => {
  if (!confirm("Substituir os registros locais por dados FICTÍCIOS para demonstração?")) return;
  vibeStorage.seedDemoData();
  renderEventSelectors();
  $("#snapshot").textContent = vibeStorage.exportJSON();
  showStatus("Dados fictícios carregados. Vá às abas Visitante e EventMind para testar.");
}));
$("#clear-data").addEventListener("click", () => run(() => {
  if (!confirm("Apagar todos os registros deste protótipo neste navegador?")) return;
  vibeStorage.clearAll();
  renderEventSelectors();
  $("#snapshot").textContent = vibeStorage.exportJSON();
  $("#recommended").replaceChildren(newElement("p", "empty", "Envie preferências para gerar recomendações."));
  $("#secret").hidden = true;
  showStatus("Storage do VibeMind limpo.");
}));
$("#export-data").addEventListener("click", () => run(() => {
  const blob = new Blob([vibeStorage.exportJSON()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "vibemind-backup.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showStatus("Backup JSON gerado.");
}));
$("#import-file").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file || !confirm("Importar backup e SUBSTITUIR os dados armazenados neste navegador?")) return;
  try {
    const content = await file.text();
    vibeStorage.importJSON(content);
    renderEventSelectors();
    $("#snapshot").textContent = vibeStorage.exportJSON();
    showStatus("Backup importado. Veja o EventMind.");
  } catch (error) { showStatus(error.message, true); }
  event.target.value = "";
});

$("#logo").addEventListener("click", () => run(() => {
  const result = vibeStorage.registerLogoClick();
  if (result.unlocked) {
    $("#secret").hidden = false;
    if (result.justUnlocked) showStatus("Você desbloqueou o Easter Egg da sexta-feira 13!");
  }
}));

// Recupera o rascunho se a mesma aba for recarregada.
run(() => {
  const draft = vibeStorage.loadDraft();
  if (draft) {
    $$("input[name='interest']").forEach(input => { input.checked = draft.interests?.includes(input.value) ?? false; });
    $("#age-range").value = draft.ageRange ?? "nao-informado";
    $("#schedule").value = draft.schedule ?? "indiferente";
    $("#channel").value = draft.channel ?? "qr";
    showStatus("Rascunho recuperado do sessionStorage. Continue de onde parou.");
  }
  if (vibeStorage.isSecretUnlocked()) $("#secret").hidden = false;
  renderEventSelectors();
});
