const STORAGE_KEY = "star-wars-marathon-progress-v1";

const state = {
  data: null,
  done: new Set(),
  search: "",
  continuity: "",
  format: "",
  collection: "",
  hideCompleted: false,
};

const els = {};

function escapeHtml(value = "") {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]);
}

function loadProgress(entries) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.completed && Array.isArray(saved.completed)) {
      state.done = new Set(saved.completed);
      return;
    }
  } catch (_) {}
  state.done = new Set(entries.filter((item) => item.defaultDone).map((item) => item.id));
  saveProgress();
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed: [...state.done], savedAt: new Date().toISOString() }));
}

function updateProgress() {
  const total = state.data.entries.length;
  const completed = state.done.size;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  els.completedCount.textContent = completed;
  els.totalCount.textContent = total;
  els.progressPercent.textContent = `${percent}%`;
  els.progressRing.style.strokeDashoffset = 320.44 * (1 - completed / total);
}

function uniqueValues(key) {
  return [...new Set(state.data.entries.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function matches(item) {
  if (state.hideCompleted && state.done.has(item.id)) return false;
  if (state.continuity && item.continuity !== state.continuity) return false;
  if (state.format && item.format !== state.format) return false;
  const isSkywalker = item.number.startsWith("SWS-");
  if (state.collection === "main" && isSkywalker) return false;
  if (state.collection === "skywalker" && !isSkywalker) return false;
  if (!state.search) return true;
  const haystack = Object.values(item).join(" ").toLowerCase();
  return haystack.includes(state.search);
}

function itemCard(item) {
  const done = state.done.has(item.id);
  const skywalker = item.number.startsWith("SWS-");
  const watch = item.watchUrl ? `<a class="watch-link" href="${escapeHtml(item.watchUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.watchLabel || "Open")} <span aria-hidden="true">↗</span></a>` : "";
  const notes = item.notes ? `<p class="notes">${item.notesUrl ? `<a href="${escapeHtml(item.notesUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.notes)}</a>` : escapeHtml(item.notes)}</p>` : "";
  return `
    <article class="entry ${done ? "entry--done" : ""} ${skywalker ? "entry--skywalker" : ""}" data-id="${item.id}">
      <label class="check-wrap" aria-label="Mark ${escapeHtml(item.title)} complete">
        <input class="entry-check" type="checkbox" ${done ? "checked" : ""} />
        <span class="checkmark"></span>
      </label>
      <div class="entry__number">${escapeHtml(item.number)}</div>
      <div class="entry__content">
        <div class="entry__topline">
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            ${item.seasonEpisode ? `<p class="episode">${escapeHtml(item.seasonEpisode)}</p>` : ""}
          </div>
          ${watch}
        </div>
        <div class="meta">
          ${item.releaseDate ? `<span><b>Released</b>${escapeHtml(item.releaseDate)}</span>` : ""}
          ${item.continuity ? `<span><b>Continuity</b>${escapeHtml(item.continuity)}</span>` : ""}
          ${item.format ? `<span><b>Format</b>${escapeHtml(item.format)}</span>` : ""}
          ${item.whereToWatch ? `<span><b>Where</b>${escapeHtml(item.whereToWatch)}</span>` : ""}
        </div>
        ${notes}
      </div>
    </article>`;
}

function render() {
  const filtered = state.data.entries.filter(matches);
  const groups = new Map();
  filtered.forEach((item) => {
    if (!groups.has(item.era)) groups.set(item.era, []);
    groups.get(item.era).push(item);
  });

  els.tracker.innerHTML = [...groups.entries()].map(([era, items]) => {
    const id = `era-${era.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const completed = items.filter((item) => state.done.has(item.id)).length;
    const label = era.startsWith("Skywalker Stories") ? "Fan anthology · suggested placement" : "Chronology section";
    return `<section class="era" id="${id}">
      <div class="era__heading"><div><p>${label}</p><h2>${escapeHtml(era)}</h2></div><span>${completed}/${items.length}</span></div>
      <div class="entries">${items.map(itemCard).join("")}</div>
    </section>`;
  }).join("");

  els.resultsCount.textContent = `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"} shown`;
  els.emptyState.hidden = filtered.length !== 0;
  updateProgress();
}

function buildFilters() {
  uniqueValues("continuity").forEach((value) => els.continuityFilter.add(new Option(value, value)));
  uniqueValues("format").forEach((value) => els.formatFilter.add(new Option(value, value)));
  const eras = [...new Set(state.data.entries.map((item) => item.era))];
  els.eraNav.innerHTML = eras.map((era) => {
    const id = `era-${era.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    return `<a href="#${id}">${escapeHtml(era.replace(/^Bonus: /, ""))}</a>`;
  }).join("");
}

function clearFilters() {
  state.search = "";
  state.continuity = "";
  state.format = "";
  state.collection = "";
  state.hideCompleted = false;
  els.search.value = "";
  els.continuityFilter.value = "";
  els.formatFilter.value = "";
  els.collectionFilter.value = "";
  els.hideCompleted.checked = false;
  render();
}

async function init() {
  ["completedCount", "totalCount", "progressPercent", "progressRing", "tracker", "emptyState", "resultsCount", "eraNav", "search", "continuityFilter", "formatFilter", "collectionFilter", "hideCompleted"].forEach((key) => {
    els[key] = document.getElementById(key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));
  });
  const response = await fetch("/data/entries.json");
  state.data = await response.json();
  document.getElementById("sheet-link").href = state.data.sourceUrl;
  loadProgress(state.data.entries);
  buildFilters();
  render();

  els.search.addEventListener("input", (event) => { state.search = event.target.value.trim().toLowerCase(); render(); });
  els.continuityFilter.addEventListener("change", (event) => { state.continuity = event.target.value; render(); });
  els.formatFilter.addEventListener("change", (event) => { state.format = event.target.value; render(); });
  els.collectionFilter.addEventListener("change", (event) => { state.collection = event.target.value; render(); });
  els.hideCompleted.addEventListener("change", (event) => { state.hideCompleted = event.target.checked; render(); });
  els.tracker.addEventListener("change", (event) => {
    if (!event.target.classList.contains("entry-check")) return;
    const entry = event.target.closest(".entry");
    if (event.target.checked) state.done.add(entry.dataset.id); else state.done.delete(entry.dataset.id);
    saveProgress();
    render();
  });
  document.getElementById("clear-filters").addEventListener("click", clearFilters);
  document.getElementById("reset-progress").addEventListener("click", () => {
    if (!confirm("Reset every checkbox on this browser? This cannot be undone.")) return;
    state.done.clear();
    saveProgress();
    render();
  });
}

init().catch(() => {
  document.getElementById("tracker").innerHTML = '<div class="empty-state"><p>The tracker data could not be loaded. Please refresh the page.</p></div>';
});
