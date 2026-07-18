const DATA_URL = "review_cases.json";

const REQUIRED_FIELDS = [
  "doctor_safe",
  "doctor_correct_triage",
  "missing_info",
  "unsafe_or_unclear",
];

const PRIORITY_ORDER = ["red", "amber", "insufficient_evidence", "routine"];

const state = {
  dataset: null,
  cases: [],
  caseById: new Map(),
  currentCaseId: "",
  reviews: {},
  reviewerId: "",
  storageKey: "",
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  loadDataset();
});

function bindElements() {
  [
    "datasetMeta",
    "reviewerId",
    "metricTotal",
    "metricReviewed",
    "metricRemaining",
    "metricFlagged",
    "casePosition",
    "caseTitle",
    "caseMeta",
    "promptText",
    "answerText",
    "floorCategory",
    "composedCategory",
    "patientAnswerSource",
    "primaryFinalAction",
    "primaryFinalCategory",
    "sourceSufficient",
    "composerProvider",
    "responsePathway",
    "responseIntent",
    "sourceTitles",
    "prohibitedClaims",
    "reviewState",
    "reviewerNotes",
    "saveNext",
    "skipCase",
    "exportCsv",
    "exportJson",
    "importJson",
    "importFile",
    "clearProgress",
    "toast",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll(".segmented").forEach((group) => {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-value]");
      if (!button) return;
      setReviewField(group.dataset.field, button.dataset.value);
    });
  });

  els.reviewerNotes.addEventListener("input", () => {
    const review = getCurrentReview();
    if (!review) return;
    review.reviewer_notes = els.reviewerNotes.value;
    review.reviewer_id = state.reviewerId;
    saveLocal();
  });

  els.reviewerId.addEventListener("input", () => {
    state.reviewerId = els.reviewerId.value.trim();
    const review = getCurrentReview(false);
    if (review) review.reviewer_id = state.reviewerId;
    saveLocal();
    updateMetrics();
  });

  els.saveNext.addEventListener("click", saveAndNext);
  els.skipCase.addEventListener("click", () => {
    selectNextUnreviewed({ excludeCaseId: state.currentCaseId });
    render();
  });
  els.exportCsv.addEventListener("click", exportCsv);
  els.exportJson.addEventListener("click", exportJson);
  els.importJson.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importJson);
  els.clearProgress.addEventListener("click", clearProgress);
}

async function loadDataset() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${DATA_URL}`);

    state.dataset = await response.json();
    state.cases = state.dataset.cases || [];
    state.caseById = new Map(state.cases.map((item) => [item.id, item]));
    state.storageKey = `care-rag-review:${state.dataset.dataset_id}`;
    loadLocal();

    if (!state.currentCaseId || isComplete(state.reviews[state.currentCaseId])) {
      selectNextUnreviewed();
    }

    render();
    showToast("Review set loaded");
  } catch (error) {
    els.datasetMeta.textContent = "Could not load review_cases.json";
    els.caseTitle.textContent = "Dataset load failed";
    els.promptText.textContent = String(error);
    showToast("Dataset load failed");
  }
}

function loadLocal() {
  const raw = localStorage.getItem(state.storageKey);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    state.reviews = saved.reviews || {};
    state.reviewerId = saved.reviewerId || "";
    state.currentCaseId = saved.currentCaseId || "";
    els.reviewerId.value = state.reviewerId;
  } catch (_) {
    state.reviews = {};
  }
}

function saveLocal() {
  if (!state.storageKey) return;
  localStorage.setItem(
    state.storageKey,
    JSON.stringify({
      reviewerId: state.reviewerId,
      currentCaseId: state.currentCaseId,
      reviews: state.reviews,
      savedAtUtc: new Date().toISOString(),
    }),
  );
}

function render() {
  renderDatasetMeta();
  updateMetrics();
  renderCurrentCase();
  saveLocal();
}

function renderDatasetMeta() {
  if (!state.dataset) return;
  const method = (state.dataset.rag_methods || []).join(", ");
  const mode = state.dataset.selection_mode || "unknown";
  const sourceCount = state.dataset.source_case_count || state.dataset.case_count;
  els.datasetMeta.textContent = `${state.dataset.case_count} review cases (${mode}, from ${sourceCount} source) | ${method} | ${state.dataset.dataset_id}`;
}

function updateMetrics() {
  const total = state.cases.length;
  const reviewed = state.cases.filter((item) => isComplete(state.reviews[item.id])).length;
  const flagged = state.cases.filter((item) => isFlagged(state.reviews[item.id])).length;
  els.metricTotal.textContent = total.toString();
  els.metricReviewed.textContent = reviewed.toString();
  els.metricRemaining.textContent = Math.max(total - reviewed, 0).toString();
  els.metricFlagged.textContent = flagged.toString();
}

function renderCurrentCase() {
  const item = getCurrentCase();
  if (!item) {
    renderFinishedState();
    return;
  }

  const remaining = unreviewedCases().length;
  const currentPriority = labelForPriority(item.review_priority);
  els.casePosition.textContent = `${remaining} unreviewed | current priority: ${currentPriority}`;
  els.caseTitle.textContent = item.id;
  els.promptText.textContent = item.prompt;
  els.answerText.textContent = item.patient_answer || "No patient-facing message generated";
  els.floorCategory.textContent = item.triage.floor_category || "-";
  els.composedCategory.textContent = item.triage.composed_category || "-";
  els.patientAnswerSource.textContent = labelForAnswerSource(item.patient_answer_source);
  els.primaryFinalAction.textContent = item.triage.primary_final_action || "-";
  els.primaryFinalCategory.textContent = item.triage.primary_final_category || "-";
  els.sourceSufficient.textContent = boolLabel(item.retrieval.source_sufficient);
  els.composerProvider.textContent = item.retrieval.composer_provider || "-";
  els.responsePathway.textContent = item.response_plan.pathway || "-";
  els.responseIntent.textContent = item.response_plan.intent || "-";
  els.sourceTitles.textContent =
    (item.retrieval.source_titles || []).join(" | ") || "None retrieved";
  els.prohibitedClaims.textContent =
    (item.response_plan.prohibited_claims || []).join(" | ") || "None listed";
  els.saveNext.disabled = false;
  els.skipCase.disabled = remaining <= 1;
  setReviewControlsDisabled(false);
  renderCaseMeta(item);
  renderReview(item);
}

function renderFinishedState() {
  els.casePosition.textContent = "Review complete";
  els.caseTitle.textContent = "All cases have been reviewed";
  els.promptText.textContent = "Export your completed review using the buttons on the right.";
  els.answerText.textContent = "";
  els.floorCategory.textContent = "-";
  els.composedCategory.textContent = "-";
  els.patientAnswerSource.textContent = "-";
  els.primaryFinalAction.textContent = "-";
  els.primaryFinalCategory.textContent = "-";
  els.sourceSufficient.textContent = "-";
  els.composerProvider.textContent = "-";
  els.responsePathway.textContent = "-";
  els.responseIntent.textContent = "-";
  els.sourceTitles.textContent = "-";
  els.prohibitedClaims.textContent = "None";
  els.caseMeta.replaceChildren();
  els.reviewerNotes.value = "";
  els.reviewState.textContent = "Complete";
  els.reviewState.className = "reviewed";
  els.saveNext.disabled = true;
  els.skipCase.disabled = true;
  setReviewControlsDisabled(true);
}

function renderCaseMeta(item) {
  const values = [
    [labelForPriority(item.review_priority), `priority-${item.review_priority}`],
    [`Floor: ${item.triage.floor_category}`, ""],
    [`Answer: ${item.triage.composed_category}`, ""],
    [`Highest path: ${item.triage.highest_path_category}`, ""],
    [`Red paths: ${item.triage.red_path_count}`, ""],
    [`Amber paths: ${item.triage.amber_path_count}`, ""],
  ];
  const fragment = document.createDocumentFragment();
  values.forEach(([text, className]) => {
    const chip = document.createElement("span");
    chip.textContent = text;
    if (className) chip.classList.add(className);
    fragment.append(chip);
  });
  els.caseMeta.replaceChildren(fragment);
}

function renderReview(item) {
  const review = getReview(item.id);
  document.querySelectorAll(".segmented").forEach((group) => {
    const field = group.dataset.field;
    group.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("selected", review[field] === button.dataset.value);
    });
  });
  els.reviewerNotes.value = review.reviewer_notes || "";

  const complete = isComplete(review);
  const flagged = isFlagged(review);
  els.reviewState.textContent = flagged ? "Flagged" : complete ? "Reviewed" : "Unreviewed";
  els.reviewState.className = flagged ? "flagged" : complete ? "reviewed" : "";
}

function setReviewControlsDisabled(disabled) {
  document.querySelectorAll(".segmented button, #reviewerNotes").forEach((control) => {
    control.disabled = disabled;
  });
}

function getCurrentCase() {
  return state.caseById.get(state.currentCaseId) || null;
}

function getCurrentReview(create = true) {
  if (!state.currentCaseId) return null;
  if (!state.reviews[state.currentCaseId] && create) {
    state.reviews[state.currentCaseId] = emptyReview(state.currentCaseId);
  }
  return state.reviews[state.currentCaseId] || null;
}

function getReview(caseId) {
  if (!state.reviews[caseId]) {
    state.reviews[caseId] = emptyReview(caseId);
  }
  return state.reviews[caseId];
}

function emptyReview(caseId) {
  return {
    eval_id: caseId,
    reviewer_id: state.reviewerId,
    doctor_safe: "",
    doctor_correct_triage: "",
    missing_info: "",
    unsafe_or_unclear: "",
    reviewer_notes: "",
    reviewed_at_utc: "",
  };
}

function setReviewField(field, value, rerender = true) {
  const review = getCurrentReview();
  if (!review) return;
  review[field] = value;
  review.reviewer_id = state.reviewerId;
  if (rerender) render();
  else saveLocal();
}

function requireReviewerId() {
  state.reviewerId = els.reviewerId.value.trim();
  if (!state.reviewerId) {
    showToast("Enter your reviewer ID before saving");
    els.reviewerId.focus();
    return false;
  }
  return true;
}

function saveAndNext() {
  if (!requireReviewerId()) return;
  const review = getCurrentReview();
  if (!isComplete(review)) {
    showToast("Please answer all four review questions first");
    return;
  }
  review.reviewer_id = state.reviewerId;
  review.reviewed_at_utc = new Date().toISOString();
  selectNextUnreviewed();
  render();
  showToast("Saved. Next priority case loaded");
}

function selectNextUnreviewed({ excludeCaseId = "" } = {}) {
  const pool = unreviewedCases().filter((item) => item.id !== excludeCaseId);
  if (!pool.length) {
    state.currentCaseId = "";
    return;
  }

  for (const priority of PRIORITY_ORDER) {
    const priorityPool = pool.filter((item) => item.review_priority === priority);
    if (!priorityPool.length) continue;
    state.currentCaseId = priorityPool[Math.floor(Math.random() * priorityPool.length)].id;
    return;
  }

  state.currentCaseId = pool[Math.floor(Math.random() * pool.length)].id;
}

function unreviewedCases() {
  return state.cases.filter((item) => !isComplete(state.reviews[item.id]));
}

function isComplete(review) {
  return Boolean(review && REQUIRED_FIELDS.every((field) => review[field]));
}

function isFlagged(review) {
  return Boolean(
    review &&
      (review.doctor_safe === "no" ||
        review.doctor_correct_triage === "no" ||
        review.missing_info === "major" ||
        review.unsafe_or_unclear === "yes"),
  );
}

function exportCsv() {
  if (!requireReviewerId()) return;
  const rows = buildExportRows();
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
  download(
    csv,
    `care_rag_reviews_${safeReviewer()}_${dateStamp()}.csv`,
    "text/csv;charset=utf-8",
  );
}

function exportJson() {
  if (!requireReviewerId()) return;
  const payload = {
    dataset_id: state.dataset.dataset_id,
    source_sha256: state.dataset.source_sha256,
    reviewer_id: state.reviewerId,
    exported_at_utc: new Date().toISOString(),
    reviews: buildReviewObjects(),
  };
  download(
    JSON.stringify(payload, null, 2),
    `care_rag_reviews_${safeReviewer()}_${dateStamp()}.json`,
    "application/json;charset=utf-8",
  );
}

function buildExportRows() {
  const header = [
    "dataset_id",
    "reviewer_id",
    "eval_id",
    "rag_method",
    "review_priority",
    "review_complete",
    "doctor_safe",
    "doctor_correct_triage",
    "missing_info",
    "unsafe_or_unclear",
    "reviewer_notes",
    "reviewed_at_utc",
    "prompt_text",
    "patient_answer",
    "patient_answer_source",
    "floor_category",
    "composed_category",
    "primary_final_action",
    "primary_final_category",
    "source_titles",
    "source_sufficient",
    "composer_provider",
  ];
  return [
    header,
    ...buildReviewObjects().map((item) => header.map((key) => String(item[key] ?? ""))),
  ];
}

function buildReviewObjects() {
  return state.cases.map((item) => {
    const review = state.reviews[item.id] || {};
    return {
      dataset_id: state.dataset.dataset_id,
      reviewer_id: review.reviewer_id || state.reviewerId,
      eval_id: item.id,
      rag_method: item.rag_method,
      review_priority: item.review_priority,
      review_complete: isComplete(review) ? "yes" : "no",
      doctor_safe: review.doctor_safe || "",
      doctor_correct_triage: review.doctor_correct_triage || "",
      missing_info: review.missing_info || "",
      unsafe_or_unclear: review.unsafe_or_unclear || "",
      reviewer_notes: review.reviewer_notes || "",
      reviewed_at_utc: review.reviewed_at_utc || "",
      prompt_text: item.prompt,
      patient_answer: item.patient_answer || "",
      patient_answer_source: item.patient_answer_source || "",
      floor_category: item.triage.floor_category,
      composed_category: item.triage.composed_category,
      primary_final_action: item.triage.primary_final_action || "",
      primary_final_category: item.triage.primary_final_category || "",
      source_titles: (item.retrieval.source_titles || []).join(" | "),
      source_sufficient: boolLabel(item.retrieval.source_sufficient),
      composer_provider: item.retrieval.composer_provider,
    };
  });
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Export ready");
}

async function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (payload.dataset_id && payload.dataset_id !== state.dataset.dataset_id) {
      const proceed = window.confirm(
        `Imported reviews target dataset ${payload.dataset_id}, but this portal is loaded with ${state.dataset.dataset_id}. Import anyway?`,
      );
      if (!proceed) {
        showToast("Import cancelled: dataset mismatch");
        return;
      }
    }

    const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
    reviews.forEach((review) => {
      if (!review.eval_id) return;
      state.reviews[review.eval_id] = {
        eval_id: review.eval_id,
        reviewer_id: review.reviewer_id || state.reviewerId,
        doctor_safe: review.doctor_safe || "",
        doctor_correct_triage: review.doctor_correct_triage || "",
        missing_info: review.missing_info || "",
        unsafe_or_unclear: review.unsafe_or_unclear || "",
        reviewer_notes: review.reviewer_notes || "",
        reviewed_at_utc: review.reviewed_at_utc || "",
      };
    });
    if (payload.reviewer_id && !state.reviewerId) {
      state.reviewerId = payload.reviewer_id;
      els.reviewerId.value = state.reviewerId;
    }
    if (!state.currentCaseId || isComplete(state.reviews[state.currentCaseId])) {
      selectNextUnreviewed();
    }
    saveLocal();
    render();
    showToast(`Imported ${reviews.length} reviews`);
  } catch (_) {
    showToast("Import failed");
  } finally {
    event.target.value = "";
  }
}

function clearProgress() {
  const ok = window.confirm("Clear saved reviews for this dataset on this browser?");
  if (!ok) return;
  state.reviews = {};
  localStorage.removeItem(state.storageKey);
  selectNextUnreviewed();
  render();
  showToast("Local progress cleared");
}

function labelForPriority(value) {
  return {
    red: "Red",
    amber: "Amber",
    insufficient_evidence: "Insufficient",
    routine: "Routine",
  }[value] || value || "-";
}

function labelForAnswerSource(value) {
  return {
    composed: "Composed answer",
    path_escalate: "Path escalation",
    path_safety_net: "Path safety net",
    path_answer: "Path answer",
    none: "None",
  }[value] || value || "-";
}

function boolLabel(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "-";
}

function safeReviewer() {
  return (state.reviewerId || "reviewer").replace(/[^a-z0-9_-]+/gi, "_");
}

function dateStamp() {
  return new Date().toISOString().slice(0, 19).replaceAll(":", "-");
}

let toastTimer = 0;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("visible"), 2200);
}
