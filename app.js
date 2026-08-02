const STORAGE_KEY = "luna-log-period-entries-v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const form = document.querySelector("#periodForm");
const startDateInput = document.querySelector("#startDate");
const endDateInput = document.querySelector("#endDate");
const notesInput = document.querySelector("#notes");
const symptomGrid = document.querySelector("#symptomGrid");
const formStatus = document.querySelector("#formStatus");
const timeline = document.querySelector("#timeline");
const entryTemplate = document.querySelector("#entryTemplate");
const averageCycle = document.querySelector("#averageCycle");
const averagePeriod = document.querySelector("#averagePeriod");
const entryCount = document.querySelector("#entryCount");
const nextPeriodDate = document.querySelector("#nextPeriodDate");
const cycleDayLabel = document.querySelector("#cycleDayLabel");
const cyclePhaseLabel = document.querySelector("#cyclePhaseLabel");
const cycleRing = document.querySelector("#cycleRing");
const useTodayButton = document.querySelector("#useTodayButton");
const exportButton = document.querySelector("#exportButton");
const importFile = document.querySelector("#importFile");
const clearButton = document.querySelector("#clearButton");

let entries = loadEntries();

function loadEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((entry) => entry && entry.startDate)
      .map((entry) => ({
        id: entry.id || crypto.randomUUID(),
        startDate: entry.startDate,
        endDate: entry.endDate || "",
        symptoms: Array.isArray(entry.symptoms) ? entry.symptoms : [],
        notes: entry.notes || "",
      }))
      .sort(sortNewestFirst);
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function sortNewestFirst(a, b) {
  return new Date(b.startDate) - new Date(a.startDate);
}

function toDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toInputDate(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function formatDate(value) {
  return toDate(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysBetween(start, end) {
  return Math.round((toDate(end) - toDate(start)) / MS_PER_DAY);
}

function inclusiveDays(start, end) {
  if (!end) return 1;
  return Math.max(1, daysBetween(start, end) + 1);
}

function addDays(value, days) {
  const date = toDate(value);
  date.setDate(date.getDate() + days);
  return toInputDate(date);
}

function average(numbers) {
  if (!numbers.length) return null;
  return Math.round(numbers.reduce((sum, number) => sum + number, 0) / numbers.length);
}

function getCycleStats() {
  const oldestFirst = [...entries].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const cycleLengths = [];
  for (let index = 1; index < oldestFirst.length; index += 1) {
    const gap = daysBetween(oldestFirst[index - 1].startDate, oldestFirst[index].startDate);
    if (gap >= 15 && gap <= 60) cycleLengths.push(gap);
  }

  const periodLengths = entries
    .filter((entry) => entry.endDate)
    .map((entry) => inclusiveDays(entry.startDate, entry.endDate))
    .filter((length) => length > 0 && length <= 14);

  return {
    averageCycleLength: average(cycleLengths) || 28,
    measuredCycleLength: average(cycleLengths),
    averagePeriodLength: average(periodLengths) || 5,
    measuredPeriodLength: average(periodLengths),
  };
}

function renderSummary() {
  const stats = getCycleStats();
  const latest = entries[0];

  averageCycle.textContent = stats.measuredCycleLength ? `${stats.measuredCycleLength} days` : "-";
  averagePeriod.textContent = stats.measuredPeriodLength ? `${stats.measuredPeriodLength} days` : "-";
  entryCount.textContent = String(entries.length);

  if (!latest) {
    nextPeriodDate.textContent = "Not enough data";
    cycleDayLabel.textContent = "Day -";
    cyclePhaseLabel.textContent = "Add a period";
    cycleRing.style.setProperty("--progress", "0deg");
    return;
  }

  const today = toInputDate();
  const day = Math.max(1, daysBetween(latest.startDate, today) + 1);
  const progress = Math.min(360, Math.round((day / stats.averageCycleLength) * 360));
  const nextStart = addDays(latest.startDate, stats.averageCycleLength);
  const isOnPeriod = day <= inclusiveDays(latest.startDate, latest.endDate || addDays(latest.startDate, stats.averagePeriodLength - 1));

  cycleDayLabel.textContent = `Day ${day}`;
  cyclePhaseLabel.textContent = isOnPeriod ? "Period window" : "Cycle day";
  nextPeriodDate.textContent = formatDate(nextStart);
  cycleRing.style.setProperty("--progress", `${progress}deg`);
}

function renderTimeline() {
  timeline.replaceChildren();

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No entries yet. Add your last period to begin tracking.";
    timeline.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const item = entryTemplate.content.firstElementChild.cloneNode(true);
    const range = item.querySelector(".entry-range");
    const meta = item.querySelector(".entry-meta");
    const notes = item.querySelector(".entry-notes");
    const symptoms = item.querySelector(".entry-symptoms");
    const deleteButton = item.querySelector("button");

    range.textContent = entry.endDate
      ? `${formatDate(entry.startDate)} - ${formatDate(entry.endDate)}`
      : `${formatDate(entry.startDate)} - ongoing`;
    meta.textContent = `${inclusiveDays(entry.startDate, entry.endDate)} day period`;
    notes.textContent = entry.notes;
    notes.hidden = !entry.notes;

    entry.symptoms.forEach((symptom) => {
      const tag = document.createElement("span");
      tag.textContent = symptom;
      symptoms.append(tag);
    });
    symptoms.hidden = entry.symptoms.length === 0;

    deleteButton.addEventListener("click", () => {
      entries = entries.filter((savedEntry) => savedEntry.id !== entry.id);
      saveEntries();
      render();
    });

    timeline.append(item);
  });
}

function render() {
  renderSummary();
  renderTimeline();
}

function getSelectedSymptoms() {
  return [...symptomGrid.querySelectorAll("input:checked")].map((input) => input.value);
}

function clearForm() {
  form.reset();
  startDateInput.value = toInputDate();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  if (endDate && toDate(endDate) < toDate(startDate)) {
    formStatus.textContent = "End date cannot be before start date.";
    return;
  }

  entries = [
    {
      id: crypto.randomUUID(),
      startDate,
      endDate,
      symptoms: getSelectedSymptoms(),
      notes: notesInput.value.trim(),
    },
    ...entries,
  ].sort(sortNewestFirst);

  saveEntries();
  clearForm();
  formStatus.textContent = "Entry saved on this device.";
  render();
});

useTodayButton.addEventListener("click", () => {
  startDateInput.value = toInputDate();
  endDateInput.value = "";
  startDateInput.focus();
});

exportButton.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `luna-log-backup-${toInputDate()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

importFile.addEventListener("change", async () => {
  const [file] = importFile.files;
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error("Invalid backup");
    entries = imported
      .filter((entry) => entry.startDate)
      .map((entry) => ({
        id: entry.id || crypto.randomUUID(),
        startDate: entry.startDate,
        endDate: entry.endDate || "",
        symptoms: Array.isArray(entry.symptoms) ? entry.symptoms : [],
        notes: entry.notes || "",
      }))
      .sort(sortNewestFirst);
    saveEntries();
    formStatus.textContent = "Backup imported on this device.";
    render();
  } catch {
    formStatus.textContent = "That backup file could not be imported.";
  } finally {
    importFile.value = "";
  }
});

clearButton.addEventListener("click", () => {
  const confirmed = window.confirm("Clear all saved period entries from this browser?");
  if (!confirmed) return;
  entries = [];
  saveEntries();
  formStatus.textContent = "All local entries were cleared.";
  render();
});

clearForm();
render();
