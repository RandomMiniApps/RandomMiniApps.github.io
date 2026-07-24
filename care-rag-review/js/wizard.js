/* Phone-first clinician review wizard for random cases. */
(function (global) {
  "use strict";

  var STEPS = [
    { id: "case", title: "Case" },
    { id: "chat", title: "Chat" },
    { id: "answer", title: "App answer" },
    { id: "decide", title: "Decide" },
    { id: "confirm", title: "Confirm" },
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toast(msg) {
    if (global.CareRagViews && CareRagViews.toast) {
      CareRagViews.toast(msg);
      return;
    }
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(function () {
      el.classList.remove("show");
    }, 2200);
  }

  function filterMatchForRapid(item, req) {
    var filters = Object.assign({}, CareRagState.state.filters);
    filters.decision_status = "unreviewed";
    if (!filters.activation) filters.activation = "mandatory_active";
    if (CareRagViews && CareRagViews.itemMatchesFilters) {
      return CareRagViews.itemMatchesFilters(item, req, filters, null);
    }
    if (filters.role && req.required_reviewer_role !== filters.role) return false;
    return req.requirement_activation_status === "mandatory_active";
  }

  function pendingCount() {
    return CareRagState.pendingRequirementsForRapid(filterMatchForRapid).length;
  }

  function goNext(excludeId) {
    CareRagState.state.wizardStep = 0;
    var next = CareRagState.pickRandomPending(excludeId, filterMatchForRapid);
    if (!next) {
      CareRagState.state.rapidReview = false;
      toast("All done for now — no unreviewed cases left.");
      location.hash = "#/queue";
      return;
    }
    location.hash = "#/wizard/" + encodeURIComponent(next.decision_requirement_id);
  }

  function start() {
    if (CareRagState.state.sessionRole === "governance_administrator") {
      CareRagState.state.sessionRole = "clinician";
      CareRagState.state.filters.role = "clinician";
      var roleSelect = document.getElementById("sessionRole");
      if (roleSelect) roleSelect.value = "clinician";
    }
    CareRagState.state.rapidReview = true;
    CareRagState.state.wizardStep = 0;
    var next = CareRagState.pickRandomPending(null, filterMatchForRapid);
    if (!next) {
      CareRagState.state.rapidReview = false;
      toast("No unreviewed cases left for this role.");
      return;
    }
    location.hash = "#/wizard/" + encodeURIComponent(next.decision_requirement_id);
  }

  function setWizardChrome(on) {
    document.body.classList.toggle("wizard-mode", !!on);
  }

  function renderTranscript(transcript) {
    if (!transcript) return '<p class="wiz-empty">No conversation available.</p>';
    var turns = Array.isArray(transcript)
      ? transcript
      : transcript.turns || transcript.messages || [];
    if (!turns.length) {
      return '<p class="wiz-empty">No conversation turns.</p>';
    }
    return (
      '<div class="wiz-transcript" aria-label="Conversation">' +
      turns
        .map(function (t) {
          var speaker = (t.speaker || t.role || "turn").toString().toLowerCase();
          var label =
            speaker === "patient" || speaker === "user"
              ? "Patient"
              : speaker === "assistant" || speaker === "app" || speaker === "system"
                ? "App"
                : speaker;
          var text = t.text || t.content || t.message || JSON.stringify(t);
          return (
            '<div class="wiz-bubble" data-speaker="' +
            esc(speaker) +
            '"><span class="wiz-who">' +
            esc(label) +
            "</span><p>" +
            esc(text) +
            "</p></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function allowedValues(req) {
    var schema = CareRagState.state.bundle.decision_schema;
    return (
      req.allowed_decision_values ||
      (schema.scope_allowed_decision_values &&
        schema.scope_allowed_decision_values[req.decision_scope]) ||
      ["approve", "reject", "request_change", "defer"]
    );
  }

  function friendlyDecisionLabel(v) {
    var map = {
      approve: "Approve",
      reject: "Reject",
      request_change: "Needs changes",
      defer: "Defer",
      acknowledge: "Acknowledge",
      dispute_evidence: "Dispute",
      confirm_governance_position: "Confirm",
      withhold_confirmation: "Withhold",
    };
    return map[v] || v.replace(/_/g, " ");
  }

  function draftKey(req) {
    return {
      pkg: CareRagState.state.bundle.governance_package_id,
      role: CareRagState.state.sessionRole,
      id: req.decision_requirement_id,
    };
  }

  function loadDraft(req) {
    var k = draftKey(req);
    return CareRagStorage.loadDraft(k.pkg, k.role, k.id) || {};
  }

  function saveDraft(req, data) {
    var k = draftKey(req);
    CareRagStorage.saveDraft(k.pkg, k.role, k.id, data);
  }

  function stepCase(req, item, runtime) {
    return (
      '<section class="wiz-panel">' +
      '<p class="wiz-kicker">Patient case</p>' +
      "<h2>" +
      esc((item && item.concept) || req.decision_scope || "Review case") +
      "</h2>" +
      '<div class="wiz-chips">' +
      '<span class="wiz-chip">' +
      esc((item && item.review_item_category) || req.review_item_category || "clinical") +
      "</span>" +
      '<span class="wiz-chip">' +
      esc(runtime.clinical_category || "—") +
      "</span>" +
      '<span class="wiz-chip">' +
      esc(runtime.normalized_action || runtime.raw_action || "—") +
      "</span>" +
      "</div>" +
      '<p class="wiz-lead">' +
      esc(
        (item && (item.patient_prompt || item.prompt_text || item.source_prompt)) ||
          "Open Chat to read the conversation, then decide if the app outcome is clinically acceptable."
      ) +
      "</p>" +
      '<p class="wiz-warn" role="status">Synthetic evidence only · Not clinically approved · Drafts are not decisions</p>' +
      "</section>"
    );
  }

  function stepChat(item) {
    return (
      '<section class="wiz-panel">' +
      '<p class="wiz-kicker">Conversation</p>' +
      "<h2>What was said</h2>" +
      renderTranscript(item && item.representative_transcript) +
      "</section>"
    );
  }

  function stepAnswer(item, runtime) {
    return (
      '<section class="wiz-panel">' +
      '<p class="wiz-kicker">App outcome</p>' +
      "<h2>What the app did</h2>" +
      '<dl class="wiz-facts">' +
      "<div><dt>Action</dt><dd>" +
      esc(runtime.normalized_action || runtime.raw_action || "—") +
      "</dd></div>" +
      "<div><dt>Category</dt><dd>" +
      esc(runtime.clinical_category || "—") +
      "</dd></div>" +
      "<div><dt>Stop reason</dt><dd>" +
      esc(runtime.stop_reason || "—") +
      "</dd></div>" +
      "<div><dt>Mapping</dt><dd>" +
      esc((item && item.mapping_status) || "—") +
      "</dd></div>" +
      "<div><dt>Concept</dt><dd>" +
      esc((item && item.concept) || "—") +
      "</dd></div>" +
      "<div><dt>Slot</dt><dd>" +
      esc((item && item.terminal_slot) || "—") +
      "</dd></div>" +
      "</dl>" +
      ((item && item.terminal_response) || (runtime && runtime.terminal_response)
        ? '<div class="wiz-answer-box"><p class="wiz-kicker">Terminal response</p><p>' +
          esc(item.terminal_response || runtime.terminal_response) +
          "</p></div>"
        : "") +
      "</section>"
    );
  }

  function stepDecide(req, draft) {
    var allowed = allowedValues(req);
    return (
      '<section class="wiz-panel">' +
      '<p class="wiz-kicker">Your decision</p>' +
      "<h2>Is this outcome acceptable?</h2>" +
      '<div class="wiz-choices" role="group" aria-label="Decision value">' +
      allowed
        .map(function (v) {
          var selected = draft.decision_value === v;
          return (
            '<button type="button" class="wiz-choice' +
            (selected ? " selected" : "") +
            (v === "approve" ? " ok" : "") +
            (v === "reject" || v === "request_change" ? " bad" : "") +
            '" data-decision="' +
            esc(v) +
            '" aria-pressed="' +
            (selected ? "true" : "false") +
            '">' +
            esc(friendlyDecisionLabel(v)) +
            "</button>"
          );
        })
        .join("") +
      "</div>" +
      '<p class="wiz-hint">Tap one option, then Continue.</p>' +
      "</section>"
    );
  }

  function stepConfirm(req, draft) {
    var profile = CareRagState.state.reviewerProfile || {};
    var today = new Date().toISOString().slice(0, 10);
    var needsChanges = draft.decision_value === "request_change";
    return (
      '<section class="wiz-panel">' +
      '<p class="wiz-kicker">Confirm</p>' +
      "<h2>" +
      esc(friendlyDecisionLabel(draft.decision_value || "Decision")) +
      "</h2>" +
      '<label class="wiz-field" for="wiz_rationale">Short rationale' +
      '<textarea id="wiz_rationale" rows="3" required placeholder="Why this decision?">' +
      esc(draft.rationale || "") +
      "</textarea></label>" +
      (needsChanges
        ? '<label class="wiz-field" for="wiz_changes">What should change?' +
          '<textarea id="wiz_changes" rows="2" required>' +
          esc(draft.requested_changes || "") +
          "</textarea></label>"
        : "") +
      '<label class="wiz-field" for="wiz_name">Your name / ID' +
      '<input id="wiz_name" required value="' +
      esc(draft.reviewer_identifier || profile.reviewer_identifier || "") +
      '" autocomplete="name" /></label>' +
      '<label class="wiz-field" for="wiz_attest">Attestation (typed — not a digital signature)' +
      '<input id="wiz_attest" required value="' +
      esc(draft.signature || profile.signature || "") +
      '" placeholder="I attest this review" /></label>' +
      '<input type="hidden" id="wiz_date" value="' +
      esc(draft.review_date || today) +
      '" />' +
      '<input type="hidden" id="wiz_role" value="' +
      esc(draft.reviewer_role || req.required_reviewer_role) +
      '" />' +
      '<p class="wiz-hint">Saves a prepared local decision for later export. Not authoritative approval by itself.</p>' +
      '<div id="wizErrors" class="wiz-errors" role="alert" hidden></div>' +
      "</section>"
    );
  }

  function render(root, requirementId) {
    setWizardChrome(true);
    CareRagState.state.rapidReview = true;

    if (!requirementId) {
      start();
      return;
    }

    var req = CareRagState.getRequirement(requirementId);
    if (!req) {
      root.innerHTML =
        '<div class="wiz-shell"><p>Case not found.</p><a class="wiz-btn" href="#/queue">Back to queue</a></div>';
      return;
    }

    if (CareRagState.state.selectedRequirementId !== requirementId) {
      CareRagState.state.selectedRequirementId = requirementId;
      CareRagState.state.wizardStep = 0;
    }

    var conditional = req.requirement_activation_status === "conditional_pending_policy";
    var csoBlocked =
      req.required_reviewer_role === "clinical_safety_officer" && conditional;
    if (csoBlocked) {
      root.innerHTML =
        '<div class="wiz-shell"><p class="wiz-warn">This CSO item is not currently mandatory (pending policy). Open the full detail view to browse evidence.</p>' +
        '<a class="wiz-btn" href="#/item/' +
        encodeURIComponent(req.decision_requirement_id) +
        '">Open detail</a> ' +
        '<button type="button" class="wiz-btn ghost" id="wizSkip">Skip</button></div>';
      document.getElementById("wizSkip").addEventListener("click", function () {
        goNext(req.decision_requirement_id);
      });
      return;
    }

    var item = req.review_item_id ? CareRagState.getItem(req.review_item_id) : null;
    var runtime = (item && item.runtime_observed_outcome) || {};
    var draft = loadDraft(req);
    var step = Math.max(0, Math.min(STEPS.length - 1, CareRagState.state.wizardStep || 0));
    CareRagState.state.wizardStep = step;
    var left = pendingCount();

    var body = "";
    if (STEPS[step].id === "case") body = stepCase(req, item, runtime);
    else if (STEPS[step].id === "chat") body = stepChat(item);
    else if (STEPS[step].id === "answer") body = stepAnswer(item, runtime);
    else if (STEPS[step].id === "decide") body = stepDecide(req, draft);
    else body = stepConfirm(req, draft);

    root.innerHTML =
      '<div class="wiz-shell" role="region" aria-label="Case review wizard">' +
      '<header class="wiz-top">' +
      '<button type="button" class="wiz-icon-btn" id="wizExit" aria-label="Exit wizard">✕</button>' +
      '<div class="wiz-progress" aria-label="Progress">' +
      '<span class="wiz-step-label">Step ' +
      (step + 1) +
      " of " +
      STEPS.length +
      " · " +
      esc(STEPS[step].title) +
      "</span>" +
      '<div class="wiz-bar" aria-hidden="true"><i style="width:' +
      (((step + 1) / STEPS.length) * 100).toFixed(0) +
      '%"></i></div>' +
      "</div>" +
      '<span class="wiz-left">' +
      left +
      " left</span>" +
      "</header>" +
      '<div class="wiz-body">' +
      body +
      "</div>" +
      '<footer class="wiz-footer">' +
      (step > 0
        ? '<button type="button" class="wiz-btn ghost" id="wizBack">Back</button>'
        : '<button type="button" class="wiz-btn ghost" id="wizSkip">Skip</button>') +
      (step < STEPS.length - 1
        ? '<button type="button" class="wiz-btn primary" id="wizNext"' +
          (STEPS[step].id === "decide" && !draft.decision_value ? " disabled" : "") +
          ">Continue</button>"
        : '<button type="button" class="wiz-btn primary" id="wizSave">Save &amp; next</button>') +
      "</footer>" +
      '<p class="wiz-foot-link"><a href="#/item/' +
      encodeURIComponent(req.decision_requirement_id) +
      '">Full detail view</a></p>' +
      "</div>";

    bind(root, req, draft, step);
  }

  function readConfirmFields(draft) {
    return {
      decision_value: draft.decision_value || "",
      rationale: (document.getElementById("wiz_rationale") || {}).value || "",
      requested_changes: (document.getElementById("wiz_changes") || {}).value || "",
      reviewer_identifier: (document.getElementById("wiz_name") || {}).value || "",
      reviewer_role: (document.getElementById("wiz_role") || {}).value || "",
      review_date: (document.getElementById("wiz_date") || {}).value || "",
      signature: (document.getElementById("wiz_attest") || {}).value || "",
    };
  }

  function bind(root, req, draft, step) {
    var exit = document.getElementById("wizExit");
    if (exit) {
      exit.addEventListener("click", function () {
        CareRagState.state.rapidReview = false;
        CareRagState.state.wizardStep = 0;
        setWizardChrome(false);
        location.hash = "#/queue";
      });
    }

    var back = document.getElementById("wizBack");
    if (back) {
      back.addEventListener("click", function () {
        if (STEPS[step].id === "confirm") {
          Object.assign(draft, readConfirmFields(draft));
          saveDraft(req, draft);
        }
        CareRagState.state.wizardStep = step - 1;
        render(root, req.decision_requirement_id);
      });
    }

    var skip = document.getElementById("wizSkip");
    if (skip) {
      skip.addEventListener("click", function () {
        toast("Skipped");
        CareRagState.state.wizardStep = 0;
        goNext(req.decision_requirement_id);
      });
    }

    root.querySelectorAll("[data-decision]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        draft.decision_value = btn.getAttribute("data-decision");
        saveDraft(req, draft);
        CareRagState.state.wizardStep = step;
        render(root, req.decision_requirement_id);
      });
    });

    var next = document.getElementById("wizNext");
    if (next) {
      next.addEventListener("click", function () {
        if (STEPS[step].id === "decide" && !draft.decision_value) {
          toast("Pick a decision first");
          return;
        }
        CareRagState.state.wizardStep = step + 1;
        render(root, req.decision_requirement_id);
      });
    }

    var save = document.getElementById("wizSave");
    if (save) {
      save.addEventListener("click", function () {
        var formData = readConfirmFields(draft);
        if (!formData.decision_value) {
          toast("Go back and pick a decision");
          return;
        }
        var decision = CareRagState.buildDecisionFromForm(req, formData);
        var errors = CareRagValidation.validateDecision(decision, {
          packageId: CareRagState.state.bundle.governance_package_id,
          requirement: req,
          schema: CareRagState.state.bundle.decision_schema,
          existingActive: CareRagState.activeDecisions(),
        });
        var box = document.getElementById("wizErrors");
        if (errors.length) {
          box.hidden = false;
          box.innerHTML =
            "<ul>" +
            errors
              .map(function (er) {
                return "<li>" + esc(er.message) + "</li>";
              })
              .join("") +
            "</ul>";
          return;
        }
        CareRagState.saveReviewerProfile(formData);
        CareRagState.upsertDecision(decision);
        var k = draftKey(req);
        CareRagStorage.deleteDraft(k.pkg, k.role, k.id);
        CareRagState.state.wizardStep = 0;
        toast("Saved — next case");
        goNext(req.decision_requirement_id);
      });
    }
  }

  function teardown() {
    setWizardChrome(false);
  }

  global.CareRagWizard = {
    start: start,
    render: render,
    goNext: goNext,
    teardown: teardown,
    filterMatchForRapid: filterMatchForRapid,
  };
})(window);
