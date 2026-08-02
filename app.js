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
const phaseSummary = document.querySelector("#phaseSummary");
const phasePill = document.querySelector("#phasePill");
const currentPhase = document.querySelector("#currentPhase");
const phaseDetail = document.querySelector("#phaseDetail");
const ovulationDate = document.querySelector("#ovulationDate");
const ovulationDetail = document.querySelector("#ovulationDetail");
const fertileWindow = document.querySelector("#fertileWindow");
const eggDetail = document.querySelector("#eggDetail");
const cycleMap = document.querySelector("#cycleMap");
const dayStoryList = document.querySelector("#dayStoryList");
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

function formatShortRange(start, end) {
  return `${formatDate(start)} - ${formatDate(end)}`;
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

function getCycleEstimate(latest, stats) {
  const today = toInputDate();
  const daysSinceLatestStart = Math.max(0, daysBetween(latest.startDate, today));
  const cycleIndex = Math.floor(daysSinceLatestStart / stats.averageCycleLength);
  const currentCycleStart = addDays(latest.startDate, cycleIndex * stats.averageCycleLength);
  const cycleDay = daysBetween(currentCycleStart, today) + 1;
  const nextStart = addDays(currentCycleStart, stats.averageCycleLength);
  const ovulationDay = Math.max(stats.averagePeriodLength + 1, stats.averageCycleLength - 14);
  const ovulation = addDays(currentCycleStart, ovulationDay - 1);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  const periodEnd = addDays(currentCycleStart, stats.averagePeriodLength - 1);
  const progress = Math.min(360, Math.max(4, Math.round((cycleDay / stats.averageCycleLength) * 360)));
  const daysToOvulation = daysBetween(today, ovulation);
  const daysToNextPeriod = daysBetween(today, nextStart);

  let phase = "Follicular";
  let phaseClass = "phase-follicular";
  let detail = "Hormones are preparing the ovaries and rebuilding the uterine lining before ovulation.";

  if (cycleDay <= stats.averagePeriodLength) {
    phase = "Period";
    phaseClass = "phase-period";
    detail = "Bleeding days are counted as the start of this cycle.";
  } else if (today >= fertileStart && today <= fertileEnd) {
    phase = today === ovulation ? "Ovulation estimate" : "Fertile window";
    phaseClass = today === ovulation ? "phase-ovulation" : "phase-fertile";
    detail =
      today === ovulation
        ? "Estimated egg release day. The egg is usually fertilizable for about 12-24 hours."
        : "This is the estimated fertile window around ovulation.";
  } else if (today > fertileEnd) {
    phase = "Luteal";
    phaseClass = "phase-luteal";
    detail = "This phase follows ovulation and continues toward the next expected period.";
  }

  return {
    currentCycleStart,
    cycleDay,
    daysToNextPeriod,
    daysToOvulation,
    fertileEnd,
    fertileStart,
    nextStart,
    ovulation,
    ovulationDay,
    periodEnd,
    phase,
    phaseClass,
    detail,
    progress,
  };
}

function getDayPhase(dayNumber, estimate, stats) {
  const isPeriod = dayNumber <= stats.averagePeriodLength;
  const isOvulation = dayNumber === estimate.ovulationDay;
  const isFertile = dayNumber >= estimate.ovulationDay - 5 && dayNumber <= estimate.ovulationDay + 1;

  if (isPeriod) {
    return {
      key: "period",
      label: "Period",
      story: "Bleeding days. This is the start of the cycle and the uterus sheds its lining.",
    };
  }

  if (isOvulation) {
    return {
      key: "ovulation",
      label: "Ovulation estimate",
      story: "Estimated egg release day. The egg usually survives about 12-24 hours.",
    };
  }

  if (isFertile) {
    return {
      key: "fertile",
      label: "Fertile window",
      story: "Fertile-window estimate. Sperm can survive for several days before ovulation.",
    };
  }

  if (dayNumber < estimate.ovulationDay) {
    return {
      key: "follicular",
      label: "Follicular",
      story: "The body prepares for ovulation and rebuilds the uterine lining.",
    };
  }

  return {
    key: "luteal",
    label: "Luteal",
    story: "After ovulation, hormones support the uterine lining before the next expected period.",
  };
}

function renderCycleMap(estimate, stats) {
  cycleMap.replaceChildren();
  dayStoryList.replaceChildren();

  if (!estimate) {
    const empty = document.createElement("div");
    empty.className = "cycle-map-empty";
    empty.textContent = "Add a period date to draw your cycle map.";
    cycleMap.append(empty);
    return;
  }

  const maxDays = Math.min(Math.max(stats.averageCycleLength, 21), 45);
  const storyDays = new Set([
    1,
    Math.min(stats.averagePeriodLength, maxDays),
    Math.max(1, estimate.ovulationDay - 5),
    estimate.ovulationDay,
    Math.min(maxDays, estimate.ovulationDay + 1),
    estimate.cycleDay,
    maxDays,
  ]);

  for (let dayNumber = 1; dayNumber <= maxDays; dayNumber += 1) {
    const phase = getDayPhase(dayNumber, estimate, stats);
    const date = addDays(estimate.currentCycleStart, dayNumber - 1);
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `cycle-dot ${phase.key}`;
    if (dayNumber === estimate.cycleDay) dot.classList.add("today");
    dot.setAttribute(
      "aria-label",
      `Day ${dayNumber}, ${formatDate(date)}: ${phase.label}. ${phase.story}`
    );
    dot.title = `Day ${dayNumber} - ${formatDate(date)}\n${phase.label}: ${phase.story}`;
    dot.innerHTML = `<span>${dayNumber}</span>`;
    cycleMap.append(dot);

    if (storyDays.has(dayNumber)) {
      const item = document.createElement("article");
      item.className = `day-story ${phase.key}`;
      if (dayNumber === estimate.cycleDay) item.classList.add("today");
      item.innerHTML = `
        <span>Day ${dayNumber} · ${formatDate(date)}</span>
        <strong>${dayNumber === estimate.cycleDay ? "Today: " : ""}${phase.label}</strong>
        <p>${phase.story}</p>
      `;
      dayStoryList.append(item);
    }
  }
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
    phaseSummary.textContent = "Add your last period to estimate ovulation and fertile days.";
    phasePill.textContent = "Estimate";
    currentPhase.textContent = "Add a period";
    phaseDetail.textContent = "Your cycle phase appears here after a period is saved.";
    ovulationDate.textContent = "Not enough data";
    ovulationDetail.textContent = "Ovulation is estimated from your average cycle length.";
    fertileWindow.textContent = "Not enough data";
    eggDetail.textContent = "The egg window appears here once your cycle can be estimated.";
    cycleRing.style.setProperty("--progress", "0deg");
    cycleRing.className = "cycle-ring";
    renderCycleMap(null, stats);
    return;
  }

  const estimate = getCycleEstimate(latest, stats);
  const ovulationCountdown =
    estimate.daysToOvulation > 0
      ? `${estimate.daysToOvulation} days away`
      : estimate.daysToOvulation === 0
        ? "Estimated today"
        : `${Math.abs(estimate.daysToOvulation)} days ago`;

  cycleDayLabel.textContent = `Day ${estimate.cycleDay}`;
  cyclePhaseLabel.textContent = estimate.phase;
  nextPeriodDate.textContent = formatDate(estimate.nextStart);
  phaseSummary.textContent = `${estimate.phase}: next period estimate in ${Math.max(0, estimate.daysToNextPeriod)} days.`;
  phasePill.textContent = stats.measuredCycleLength ? "Based on history" : "28-day estimate";
  currentPhase.textContent = estimate.phase;
  phaseDetail.textContent = estimate.detail;
  ovulationDate.textContent = formatDate(estimate.ovulation);
  ovulationDetail.textContent = `Estimated cycle day ${estimate.ovulationDay}; ${ovulationCountdown}.`;
  fertileWindow.textContent = formatShortRange(estimate.fertileStart, estimate.fertileEnd);
  eggDetail.textContent =
    "The fertile window includes the 5 days before ovulation and about 1 day after; the egg usually survives about 12-24 hours.";
  cycleRing.style.setProperty("--progress", `${estimate.progress}deg`);
  cycleRing.className = `cycle-ring ${estimate.phaseClass}`;
  renderCycleMap(estimate, stats);
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
