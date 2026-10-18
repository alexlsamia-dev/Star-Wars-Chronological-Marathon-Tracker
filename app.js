const STORAGE_KEY = "star-wars-marathon-progress-v4";
const EXCLUSIONS_KEY = "star-wars-marathon-exclusions-v1";
const REVIEW_ERA = "Unplaced fan stories — review and decide";
const MAIN_TIMELINE_ERAS = new Set([
  "Old Republic",
  "High Republic",
  "Fall of the Jedi",
  "Reign of the Empire",
  "Galactic Civil War",
  "New Republic",
  "Rise of the First Order",
  "Legacy and Far Future",
]);
const ERA_META = {
  "Old Republic": { years: "c. 25,000–1,000 BBY", label: "Ancient Jedi, Sith, and Old Republic stories" },
  "High Republic": { years: "c. 500–100 BBY", label: "The Jedi Order at its height" },
  "Fall of the Jedi": { years: "100–19 BBY", label: "The prequel era and the Clone Wars" },
  "Reign of the Empire": { years: "19–5 BBY", label: "Order 66 through the early Rebellion" },
  "Galactic Civil War": { years: "5 BBY–5 ABY", label: "Rebellion against the Galactic Empire" },
  "New Republic": { years: "5–34 ABY", label: "After Endor and before the First Order" },
  "Rise of the First Order": { years: "34–35 ABY", label: "The sequel-trilogy era" },
  "Legacy and Far Future": { years: "36 ABY onward", label: "Legends, alternate futures, and distant eras" },
  "LEGO alternate continuity": { years: "Various eras", label: "LEGO stories and multiverse adventures" },
  "Retellings and kids": { years: "Various eras", label: "Retellings and young-viewer shorts" },
  "Parodies": { years: "Outside continuity", label: "Comedy and parody specials" },
  "Abandoned and reconstructed stories": { years: "Alternate Episode IX", label: "Unproduced and reconstructed concepts" },
};
const EXCLUSION_OPTIONS = [
  ["fan-video", "Fan videos"],
  ["fan-made", "Fan-made / non-canon"],
  ["ai", "AI-created"],
  ["gameplay", "Gameplay"],
  ["game-movie", "Game movies"],
  ["animated-short", "Animated shorts"],
  ["disney-plus", "Disney+"],
  ["canon", "Canon"],
  ["trailer", "Trailers"],
  ["series", "Series / seasons"],
  ["episode", "Episodes"],
  ["alternate-outcome", "Alternate outcomes"],
  ["movie", "Movies"],
];

const state = {
  data: null,
  done: new Set(),
  search: "",
  continuity: "",
  format: "",
  collection: "",
  hideCompleted: false,
  exclusions: new Set(),
  collapsedEras: new Set(),
};

const els = {};

function escapeHtml(value = "") {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]);
}

function humanizeDuration(value = "") {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return value;
  const [, hours, minutes, seconds] = match;
  return [hours && `${hours} hr`, minutes && `${minutes} min`, seconds && `${seconds} sec`].filter(Boolean).join(" ");
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

function loadExclusions() {
  try {
    const saved = JSON.parse(localStorage.getItem(EXCLUSIONS_KEY));
    state.exclusions = new Set(Array.isArray(saved?.excluded) ? saved.excluded : []);
  } catch (_) {
    state.exclusions = new Set();
  }
}

function saveExclusions() {
  localStorage.setItem(EXCLUSIONS_KEY, JSON.stringify({ excluded: [...state.exclusions], savedAt: new Date().toISOString() }));
}

function itemTags(item) {
  const tags = new Set();
  const continuity = (item.continuity || "").toLowerCase();
  const format = (item.format || "").toLowerCase();
  const where = (item.whereToWatch || "").toLowerCase();
  const title = (item.title || "").toLowerCase();
  const corpus = Object.values(item).join(" ").toLowerCase();
  if (format.includes("fan video")) tags.add("fan-video");
  if (/fan|non-canon|alternate universe|visions|lego|parody/.test(continuity)) tags.add("fan-made");
  if (format.includes("ai") || item.collection === "skywalker" || /ai-generated|ai generated|made with ai/.test(corpus)) tags.add("ai");
  if (format.includes("gameplay") || title.includes("full gameplay")) tags.add("gameplay");
  if (format.includes("game movie") || format.includes("game / cinematics") || format.includes("vr story")) tags.add("game-movie");
  if (format.includes("animated short") || format.includes("visions short")) tags.add("animated-short");
  if (where.includes("disney+")) tags.add("disney-plus");
  if (continuity === "canon") tags.add("canon");
  if (format.includes("trailer") || title.includes("reveal trailer")) tags.add("trailer");
  if (format.includes("series") || format.includes("season")) tags.add("series");
  if (format === "episode" || format === "episodes" || item.seasonEpisode) tags.add("episode");
  if (continuity.includes("alternate outcome") || title.startsWith("what if") || title.includes("what if ")) tags.add("alternate-outcome");
  if (format === "movie" || format === "tv movie") tags.add("movie");
  return tags;
}

function isExcluded(item) {
  if (!state.exclusions.size) return false;
  const tags = itemTags(item);
  return [...state.exclusions].some((tag) => tags.has(tag));
}

function scopedEntries() {
  return state.data.entries.filter((item) => !isExcluded(item));
}

function updateProgress() {
  const scope = scopedEntries();
  const total = scope.length;
  const completed = scope.filter((item) => state.done.has(item.id)).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  els.completedCount.textContent = completed;
  els.totalCount.textContent = total;
  els.progressPercent.textContent = `${percent}%`;
  els.progressRing.style.strokeDashoffset = 320.44 * (1 - (total ? completed / total : 0));
}

function uniqueValues(key) {
  return [...new Set(state.data.entries.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function matches(item) {
  if (isExcluded(item)) return false;
  if (state.hideCompleted && state.done.has(item.id)) return false;
  if (state.continuity && item.continuity !== state.continuity) return false;
  if (state.format && item.format !== state.format) return false;
  if (state.collection === "main" && item.collection !== "main") return false;
  if (state.collection === "fan" && !/fan/i.test(`${item.continuity} ${item.collection}`)) return false;
  if (state.collection === "skywalker" && item.collection !== "skywalker") return false;
  if (state.collection === "screenshots" && item.collection !== "screenshots") return false;
  if (state.collection === "creator channels" && item.collection !== "creator channels") return false;
  if (state.collection === "bonus" && item.collection !== "bonus") return false;
  if (state.collection === "review" && item.era !== REVIEW_ERA) return false;
  if (!state.search) return true;
  const haystack = Object.values(item).join(" ").toLowerCase();
  return haystack.includes(state.search);
}

function itemCard(item) {
  const done = state.done.has(item.id);
  const skywalker = item.collection === "skywalker";
  const screenshot = item.collection === "screenshots";
  const review = item.era === REVIEW_ERA;
  const watch = item.watchUrl ? `<a class="watch-link" href="${escapeHtml(item.watchUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.watchLabel || "Open")} <span aria-hidden="true">↗</span></a>` : "";
  const notes = item.notes ? `<p class="notes">${item.notesUrl ? `<a href="${escapeHtml(item.notesUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.notes)}</a>` : escapeHtml(item.notes)}</p>` : "";
  const detailRows = [
    ["Creator", item.creator],
    ["Runtime", humanizeDuration(item.duration)],
    ["Series", item.seriesName],
    ["Original title", item.originalTitle && item.originalTitle !== item.title ? item.originalTitle : ""],
    ["Suggested placement", item.chronologicalPlacement],
    ["Source file / screenshot(s)", item.sourceScreenshots],
    ["Verification", item.verificationStatus],
    ["Placement confidence", item.placementConfidence],
    ["Review reason", item.reviewReasons],
    ["Duplicate status", item.duplicateStatus],
  ].filter(([, value]) => value);
  const details = detailRows.length || item.description ? `
    <details class="entry-details">
      <summary>Source details &amp; verification</summary>
      ${detailRows.length ? `<dl>${detailRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""}
      ${item.description ? `<div class="entry-description"><strong>Visible description</strong><p>${escapeHtml(item.description)}</p></div>` : ""}
    </details>` : "";
  return `
    <article class="entry ${done ? "entry--done" : ""} ${skywalker ? "entry--skywalker" : ""} ${screenshot ? "entry--screenshot" : ""} ${review ? "entry--review" : ""}" data-id="${item.id}">
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
        ${details}
      </div>
    </article>`;
}

function render() {
  const filtered = state.data.entries.filter(matches);
  const hasActiveNarrowing = Boolean(state.search || state.continuity || state.format || state.collection || state.hideCompleted);
  const groups = new Map();
  filtered.forEach((item) => {
    if (!groups.has(item.era)) groups.set(item.era, []);
    groups.get(item.era).push(item);
  });

  els.tracker.innerHTML = [...groups.entries()].map(([era, items]) => {
    const id = `era-${era.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const eraScope = scopedEntries().filter((item) => item.era === era);
    const completed = eraScope.filter((item) => state.done.has(item.id)).length;
    const meta = ERA_META[era];
    const label = era === REVIEW_ERA
      ? "Uncertain placement · your decision"
      : meta?.label || (MAIN_TIMELINE_ERAS.has(era)
        ? "Official, Legends, and fan stories in chronological order"
        : "Alternate continuity and bonus material");
    const years = meta?.years ? `<span class="era__years">${escapeHtml(meta.years)}</span>` : "";
    const open = hasActiveNarrowing || !state.collapsedEras.has(era) ? " open" : "";
    return `<details class="era" id="${id}" data-era="${escapeHtml(era)}"${open}>
      <summary class="era__heading"><div><p>${escapeHtml(label)}</p><h2>${escapeHtml(era)} ${years}</h2></div><span>${completed}/${eraScope.length}<i aria-hidden="true"></i></span></summary>
      <div class="entries">${items.map(itemCard).join("")}</div>
    </details>`;
  }).join("");

  const scopeTotal = scopedEntries().length;
  els.resultsCount.textContent = `${filtered.length} shown · ${scopeTotal} in your marathon scope`;
  els.emptyState.hidden = filtered.length !== 0;
  updateProgress();
}

function buildFilters() {
  uniqueValues("continuity").forEach((value) => els.continuityFilter.add(new Option(value, value)));
  uniqueValues("format").forEach((value) => els.formatFilter.add(new Option(value, value)));
  const eras = [...new Set(state.data.entries.map((item) => item.era))];
  els.eraNav.innerHTML = eras.map((era) => {
    const id = `era-${era.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const years = ERA_META[era]?.years ? ` · ${ERA_META[era].years}` : "";
    return `<a href="#${id}">${escapeHtml(era.replace(/^Bonus: /, "") + years)}</a>`;
  }).join("");

  els.excludeOptions.innerHTML = EXCLUSION_OPTIONS.map(([value, label]) => `
    <label class="exclude-chip">
      <input type="checkbox" value="${value}" ${state.exclusions.has(value) ? "checked" : ""} />
      <span>${escapeHtml(label)}</span>
    </label>`).join("");
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
  ["completedCount", "totalCount", "progressPercent", "progressRing", "tracker", "emptyState", "resultsCount", "eraNav", "search", "continuityFilter", "formatFilter", "collectionFilter", "hideCompleted", "lastUpdated", "intakeSummary", "excludeOptions"].forEach((key) => {
    els[key] = document.getElementById(key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));
  });
  let lastError;
  for (const path of ["/data/entries.min.json?v=2026-10-18-2", "/data/entries.json?v=2026-10-18-2"]) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(`Tracker data request failed: ${response.status}`);
      state.data = await response.json();
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!state.data) throw lastError || new Error("Tracker data request failed.");
  if (!state.data || !Array.isArray(state.data.entries)) throw new Error("Tracker data is incomplete.");
  document.getElementById("sheet-link").href = state.data.sourceUrl;
  const updated = new Date(`${state.data.sourceUpdated}T12:00:00`);
  els.lastUpdated.textContent = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(updated);
  els.lastUpdated.dateTime = state.data.sourceUpdated;
  if (state.data.intake) {
    els.intakeSummary.textContent = `${state.data.total} entries · ${state.data.intake.images_received} source screenshots · ${state.data.intake.creator_channel_new_rows_added || 0} newly added creator-channel stories.`;
  }
  loadProgress(state.data.entries);
  loadExclusions();
  state.collapsedEras = new Set(state.data.entries.map((item) => item.era));
  buildFilters();
  render();

  els.search.addEventListener("input", (event) => { state.search = event.target.value.trim().toLowerCase(); render(); });
  els.continuityFilter.addEventListener("change", (event) => { state.continuity = event.target.value; render(); });
  els.formatFilter.addEventListener("change", (event) => { state.format = event.target.value; render(); });
  els.collectionFilter.addEventListener("change", (event) => { state.collection = event.target.value; render(); });
  els.hideCompleted.addEventListener("change", (event) => { state.hideCompleted = event.target.checked; render(); });
  els.excludeOptions.addEventListener("change", (event) => {
    if (event.target.type !== "checkbox") return;
    if (event.target.checked) state.exclusions.add(event.target.value); else state.exclusions.delete(event.target.value);
    saveExclusions();
    render();
  });
  els.tracker.addEventListener("change", (event) => {
    if (!event.target.classList.contains("entry-check")) return;
    const entry = event.target.closest(".entry");
    if (event.target.checked) state.done.add(entry.dataset.id); else state.done.delete(entry.dataset.id);
    saveProgress();
    render();
  });
  els.tracker.addEventListener("toggle", (event) => {
    const section = event.target;
    if (!section.classList?.contains("era")) return;
    if (section.open) state.collapsedEras.delete(section.dataset.era); else state.collapsedEras.add(section.dataset.era);
  }, true);
  document.getElementById("clear-filters").addEventListener("click", clearFilters);
  document.getElementById("clear-exclusions").addEventListener("click", () => {
    state.exclusions.clear();
    saveExclusions();
    els.excludeOptions.querySelectorAll("input").forEach((input) => { input.checked = false; });
    render();
  });
  document.getElementById("expand-all").addEventListener("click", () => {
    state.collapsedEras.clear();
    els.tracker.querySelectorAll(".era").forEach((section) => { section.open = true; });
  });
  document.getElementById("collapse-all").addEventListener("click", () => {
    els.tracker.querySelectorAll(".era").forEach((section) => {
      state.collapsedEras.add(section.dataset.era);
      section.open = false;
    });
  });
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

