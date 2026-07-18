/* View renderers for CARE-RAG governance portal */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function chip(status, label) {
    return (
      '<span class="status-chip" data-status="' +
      esc(status) +
      '"><span class="sr-text">' +
      esc(label || status) +
      "</span></span>"
    );
  }

  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(function () {
      el.classList.remove("show");
    }, 3200);
  }

  function safetyStrip(bundle) {
    var s = bundle.safety;
    return (
      '<div class="warning-strip" aria-label="Governance safety status">' +
      '<div class="chip-row">' +
      chip("blocked", "synthetic evidence only") +
      chip("blocked", "no real patient data") +
      chip("not_started", "clinical review not started") +
      chip("not_started", "no decisions recorded") +
      chip("not_started", "no clinical approvals") +
      chip("blocked", "source-control provenance status = unversioned") +
      chip("blocked", "source-control provenance gate = blocked") +
      chip("pending", "reviewer requirement policy = pending") +
      chip("blocked", "human-review package readiness = blocked") +
      chip("blocked", "pilot readiness = blocked") +
      chip("blocked", "production readiness = blocked") +
      chip("blocked", "enableClarificationRoutingV2 = false") +
      chip("blocked", "enableDeviceClarificationPackV1 = false") +
      "</div>" +
      '<p class="notice danger" role="alert">' +
      "This package is <strong>not</strong> approved, clinically safe, ready for pilot, or ready for production." +
      "</p></div>"
    );
  }

  function renderOverview(root) {
    var b = CareRagState.state.bundle;
    var prog = CareRagValidation.progressCounts(
      b.decision_requirements.requirements,
      CareRagState.state.decisions
    );
    var tech = b.technical_status;
    root.innerHTML =
      "<h2 class=\"panel-title\">Overview</h2>" +
      safetyStrip(b) +
      "<p>Package <span class=\"mono\">" +
      esc(b.governance_package_id) +
      "</span> · Phase " +
      esc(b.phase) +
      " (parent " +
      esc(b.parent_phase) +
      ")</p>" +
      '<div class="metric-grid" aria-label="Package counts">' +
      metric("Review items", b.counts.review_items) +
      metric("Requirements", b.counts.decision_requirements) +
      metric("Active", b.counts.mandatory_active) +
      metric("Conditional", b.counts.conditional_pending_policy) +
      metric("Clinician", b.counts.by_role.clinician) +
      metric("CSO (conditional)", b.counts.by_role.clinical_safety_officer) +
      metric("Technical", b.counts.by_role.technical_reviewer) +
      metric("Gov. confirm", b.counts.by_role.governance_panel) +
      metric("Policy questions", b.counts.policy_questions) +
      metric("Active complete", prog.active_requirements_complete) +
      metric("Active outstanding", prog.active_requirements_outstanding) +
      metric("Local decisions", CareRagState.state.decisions.length) +
      "</div>" +
      "<h3>Technical verification (not clinical safety)</h3>" +
      '<div class="chip-row">' +
      chip(
        tech.release_verification_all_passed ? "complete" : "blocked",
        "release verification: " +
          (tech.release_verification_all_passed ? "passed (technical)" : "not passed")
      ) +
      chip(
        tech.terminal_delivery_verification_all_passed ? "complete" : "blocked",
        "terminal delivery verification: " +
          (tech.terminal_delivery_verification_all_passed
            ? "passed (technical)"
            : "not passed")
      ) +
      chip("blocked", "human-review readiness: blocked") +
      "</div>" +
      "<h3>Current blockers</h3>" +
      "<ol>" +
      "<li>Source-control provenance strategy (gate = blocked, status = unversioned)</li>" +
      "<li>CSO participation classification policy (<code>gpr_cso_participation_classification</code>)</li>" +
      "</ol>" +
      "<h3>Package hashes</h3>" +
      "<ul class=\"mono\">" +
      "<li>content_root: " +
      esc(tech.content_root_hash) +
      "</li>" +
      "<li>release_root: " +
      esc(tech.release_root_hash) +
      "</li>" +
      "<li>release_envelope: " +
      esc(tech.release_envelope_sha256) +
      "</li>" +
      "<li>portal_bundle_content: " +
      esc(b.portal_bundle_content_sha256) +
      "</li></ul>";
  }

  function metric(label, value) {
    return (
      '<div class="metric"><span>' +
      esc(label) +
      "</span><strong>" +
      esc(value) +
      "</strong></div>"
    );
  }

  function itemMatchesFilters(item, req, filters, decision) {
    if (filters.role && req.required_reviewer_role !== filters.role) return false;
    if (filters.domain && item && item.review_domain !== filters.domain) return false;
    if (
      filters.category &&
      ((item && item.review_item_category) || req.review_item_category) !==
        filters.category
    )
      return false;
    if (
      filters.clinical_category &&
      item &&
      item.runtime_observed_outcome &&
      item.runtime_observed_outcome.clinical_category !== filters.clinical_category
    )
      return false;
    if (
      filters.terminal_action &&
      item &&
      item.runtime_observed_outcome &&
      item.runtime_observed_outcome.normalized_action !== filters.terminal_action
    )
      return false;
    if (filters.concept && item && item.concept !== filters.concept) return false;
    if (filters.mapping_status && item && item.mapping_status !== filters.mapping_status)
      return false;
    if (filters.activation && req.requirement_activation_status !== filters.activation)
      return false;
    if (filters.decision_status) {
      var st = decision ? decision.status : "unreviewed";
      if (st !== filters.decision_status) return false;
    }
    if (filters.search) {
      var q = filters.search.toLowerCase();
      var blob = JSON.stringify({
        rid: req.decision_requirement_id,
        iid: req.review_item_id,
        concept: item && item.concept,
        slot: item && item.terminal_slot,
        asset: item && item.source_asset,
        transcript: item && item.representative_transcript,
      }).toLowerCase();
      if (blob.indexOf(q) === -1) return false;
    }
    return true;
  }

  function renderQueue(root) {
    var b = CareRagState.state.bundle;
    var role = CareRagState.state.sessionRole;
    var filters = CareRagState.state.filters;
    if (!filters.role) filters.role = role === "governance_administrator" ? "" : role;

    var reqs = b.decision_requirements.requirements;
    var rows = [];
    reqs.forEach(function (req) {
      var item = req.review_item_id
        ? CareRagState.getItem(req.review_item_id)
        : null;
      var decision = CareRagState.decisionForRequirement(req.decision_requirement_id);
      if (!itemMatchesFilters(item, req, filters, decision)) return;
      rows.push({ req: req, item: item, decision: decision });
    });

    root.innerHTML =
      "<h2>My review queue</h2>" +
      '<p class="notice info">Progress is calculated from decision requirements, not page visits. Drafts are not counted. Policy questions are listed under Policy decisions, not this clinical/technical queue.</p>' +
      filterForm(filters) +
      '<p><strong>' +
      rows.length +
      "</strong> requirements match filters.</p>" +
      '<div class="table-wrap"><table>' +
      "<thead><tr>" +
      "<th>Requirement</th><th>Item</th><th>Role</th><th>Scope</th><th>Activation</th><th>Decision</th><th></th>" +
      "</tr></thead><tbody>" +
      rows
        .map(function (row) {
          var act = row.req.requirement_activation_status;
          var decLabel = row.decision
            ? row.decision.decision_value + " (" + row.decision.status + ")"
            : "unreviewed";
          return (
            "<tr>" +
            "<td class=\"mono\">" +
            esc(row.req.decision_requirement_id) +
            "</td>" +
            "<td class=\"mono\">" +
            esc(row.req.review_item_id || "—") +
            "</td>" +
            "<td>" +
            esc(row.req.required_reviewer_role) +
            "</td>" +
            "<td>" +
            esc(row.req.decision_scope) +
            "</td>" +
            "<td>" +
            chip(
              act === "mandatory_active" ? "in_progress" : "inactive_pending_policy",
              act
            ) +
            "</td>" +
            "<td>" +
            esc(decLabel) +
            "</td>" +
            '<td><a class="btn" href="#/item/' +
            encodeURIComponent(row.req.decision_requirement_id) +
            '">Open</a></td>' +
            "</tr>"
          );
        })
        .join("") +
      "</tbody></table></div>";

    bindFilters();
  }

  function filterForm(f) {
    function opt(name, values) {
      return (
        "<label>" +
        esc(name) +
        '<select data-filter="' +
        esc(name) +
        '"><option value="">Any</option>' +
        values
          .map(function (v) {
            return (
              '<option value="' +
              esc(v) +
              '"' +
              (f[name] === v ? " selected" : "") +
              ">" +
              esc(v) +
              "</option>"
            );
          })
          .join("") +
        "</select></label>"
      );
    }
    return (
      '<form class="filters" id="queueFilters" aria-label="Queue filters">' +
      opt("role", [
        "clinician",
        "clinical_safety_officer",
        "technical_reviewer",
        "governance_panel",
      ]) +
      opt("domain", ["clinical", "technical", "governance"]) +
      opt("category", [
        "new_amber_cluster",
        "patient_wording",
        "pending_construct",
        "safety_net_policy",
        "technical_acknowledgement",
        "governance_confirmation",
      ]) +
      opt("clinical_category", ["red", "amber", "green", "insufficient_evidence"]) +
      opt("terminal_action", ["escalate", "self_care", "urgent", "stop"]) +
      opt("mapping_status", ["mapped", "unmapped", "mismatch", "pending"]) +
      opt("decision_status", ["unreviewed", "active", "superseded", "withdrawn"]) +
      opt("activation", ["mandatory_active", "conditional_pending_policy"]) +
      '<label>Search<input type="search" data-filter="search" value="' +
      esc(f.search || "") +
      '" placeholder="ID, concept, transcript…" /></label>' +
      '<div class="btn-row"><button type="submit" class="primary">Apply filters</button></div>' +
      "</form>"
    );
  }

  function bindFilters() {
    var form = document.getElementById("queueFilters");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var next = Object.assign({}, CareRagState.state.filters);
      form.querySelectorAll("[data-filter]").forEach(function (el) {
        next[el.getAttribute("data-filter")] = el.value;
      });
      CareRagState.state.filters = next;
      renderQueue(document.getElementById("main"));
    });
  }

  function renderTranscript(transcript) {
    if (!transcript) return "<p>No representative transcript.</p>";
    var turns = Array.isArray(transcript)
      ? transcript
      : transcript.turns || transcript.messages || [];
    if (!turns.length && typeof transcript === "object") {
      return "<pre class=\"mono\">" + esc(JSON.stringify(transcript, null, 2)) + "</pre>";
    }
    return (
      '<div class="transcript" aria-label="Representative transcript">' +
      turns
        .map(function (t) {
          var speaker = t.speaker || t.role || "turn";
          var text = t.text || t.content || t.message || JSON.stringify(t);
          return (
            '<div class="turn" data-speaker="' +
            esc(speaker) +
            '"><div class="speaker">' +
            esc(speaker) +
            "</div><div>" +
            esc(text) +
            "</div></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function decisionFormHtml(req, item, draft, disabled, disabledReason) {
    var schema = CareRagState.state.bundle.decision_schema;
    var allowed =
      req.allowed_decision_values ||
      (schema.scope_allowed_decision_values &&
        schema.scope_allowed_decision_values[req.decision_scope]) ||
      [];
    var d = draft || {};
    var today = new Date().toISOString().slice(0, 10);
    return (
      '<form id="decisionForm" class="form-grid" ' +
      (disabled ? 'aria-disabled="true"' : "") +
      ">" +
      (disabled
        ? '<p class="notice warn" role="status">' + esc(disabledReason) + "</p>"
        : "") +
      '<p><span class="draft-badge">Draft only — not submitted</span> until you export a validated decision JSON for governance ingestion.</p>' +
      '<label for="decision_value">Decision value' +
      '<select id="decision_value" name="decision_value" required ' +
      (disabled ? "disabled" : "") +
      '><option value="">Select…</option>' +
      allowed
        .map(function (v) {
          return (
            '<option value="' +
            esc(v) +
            '"' +
            (d.decision_value === v ? " selected" : "") +
            ">" +
            esc(v) +
            "</option>"
          );
        })
        .join("") +
      "</select></label>" +
      '<label for="rationale">Rationale<textarea id="rationale" name="rationale" rows="4" required ' +
      (disabled ? "disabled" : "") +
      ">" +
      esc(d.rationale || "") +
      "</textarea></label>" +
      '<label for="reviewer_identifier">Reviewer identifier<input id="reviewer_identifier" name="reviewer_identifier" required value="' +
      esc(d.reviewer_identifier || "") +
      '" ' +
      (disabled ? "disabled" : "") +
      " /></label>" +
      '<label for="reviewer_role">Reviewer role<input id="reviewer_role" name="reviewer_role" required value="' +
      esc(d.reviewer_role || req.required_reviewer_role) +
      '" ' +
      (disabled ? "disabled" : "") +
      " /></label>" +
      '<label for="review_date">Review date<input id="review_date" name="review_date" type="date" required value="' +
      esc(d.review_date || today) +
      '" ' +
      (disabled ? "disabled" : "") +
      " /></label>" +
      '<label for="signature">Signature or attestation (textual — not cryptographic)<input id="signature" name="signature" required value="' +
      esc(d.signature || "") +
      '" ' +
      (disabled ? "disabled" : "") +
      " /></label>" +
      '<label for="requested_changes">Requested changes (required if request_change)<textarea id="requested_changes" name="requested_changes" rows="3" ' +
      (disabled ? "disabled" : "") +
      ">" +
      esc(d.requested_changes || "") +
      "</textarea></label>" +
      '<div class="btn-row">' +
      '<button type="button" id="saveDraftBtn" ' +
      (disabled ? "disabled" : "") +
      ">Save draft</button>" +
      '<button type="button" id="clearDraftBtn">Delete draft</button>' +
      '<button type="submit" class="primary" id="prepareDecisionBtn" ' +
      (disabled ? "disabled" : "") +
      ">Validate &amp; prepare decision</button>" +
      "</div>" +
      '<div id="formErrors" class="error-list" role="alert" hidden></div>' +
      "</form>"
    );
  }

  function renderItem(root, requirementId) {
    var req = CareRagState.getRequirement(requirementId);
    if (!req) {
      root.innerHTML =
        "<h2>Review item</h2><p>Select a requirement from the queue.</p>";
      return;
    }
    var item = req.review_item_id ? CareRagState.getItem(req.review_item_id) : null;
    var draft = CareRagStorage.loadDraft(
      CareRagState.state.bundle.governance_package_id,
      CareRagState.state.sessionRole,
      req.decision_requirement_id
    );
    var conditional = req.requirement_activation_status === "conditional_pending_policy";
    var csoDisabled =
      req.required_reviewer_role === "clinical_safety_officer" && conditional;
    var disabled = csoDisabled;
    var disabledReason = csoDisabled
      ? "Final CSO decision submission is disabled. Requirement is conditional_pending_policy / not currently mandatory / inactive pending governance policy. Required policy: gpr_cso_participation_classification. Evidence browsing and draft notes only."
      : "";

    var runtime = (item && item.runtime_observed_outcome) || {};
    root.innerHTML =
      "<h2>Review item detail</h2>" +
      '<p class="notice danger" role="alert">Not clinically approved. Empty fields, page visits, checkboxes, and saved drafts are never approvals.</p>' +
      '<div class="split-layout">' +
      "<div>" +
      "<h3>" +
      esc(req.decision_requirement_id) +
      "</h3>" +
      "<p>Item <span class=\"mono\">" +
      esc(req.review_item_id || "n/a") +
      "</span> · Category " +
      esc((item && item.review_item_category) || req.review_item_category || "—") +
      " · Domain " +
      esc((item && item.review_domain) || "—") +
      "</p>" +
      chip(
        conditional ? "inactive_pending_policy" : "in_progress",
        req.requirement_activation_status
      ) +
      " " +
      chip("not_started", "decision scope: " + req.decision_scope) +
      "<h4>Observed runtime</h4>" +
      "<ul>" +
      "<li>Action: " +
      esc(runtime.normalized_action || runtime.raw_action || "—") +
      "</li>" +
      "<li>Clinical category: " +
      esc(runtime.clinical_category || "—") +
      "</li>" +
      "<li>Stop reason: " +
      esc(runtime.stop_reason || "—") +
      "</li>" +
      "<li>Terminal source: " +
      esc(runtime.terminal_source || "—") +
      "</li></ul>" +
      "<h4>Mapping &amp; concept</h4>" +
      "<ul>" +
      "<li>Concept: " +
      esc((item && item.concept) || "—") +
      "</li>" +
      "<li>Terminal slot: " +
      esc((item && item.terminal_slot) || "—") +
      "</li>" +
      "<li>Mapping status: " +
      esc((item && item.mapping_status) || "—") +
      "</li>" +
      "<li>Mismatch cause: " +
      esc((item && item.mismatch_cause) || "—") +
      "</li>" +
      "<li>Source asset: " +
      esc((item && item.source_asset) || "—") +
      "</li></ul>" +
      "<h4>Representative transcript</h4>" +
      renderTranscript(item && item.representative_transcript) +
      "<h4>Decision questions the reviewer must answer</h4>" +
      "<ul>" +
      ((item && item.decision_questions) || [])
        .map(function (q) {
          return "<li>" + esc(typeof q === "string" ? q : q.question || JSON.stringify(q)) + "</li>";
        })
        .join("") +
      "</ul>" +
      '<details class="provenance"><summary>Provenance &amp; hashes</summary>' +
      "<p>Review item hash:</p><p class=\"mono\">" +
      esc(req.review_item_hash) +
      "</p>" +
      "<p>Protected evidence hashes:</p><pre class=\"mono\">" +
      esc(JSON.stringify(req.expected_protected_hashes || {}, null, 2)) +
      "</pre>" +
      "<p>Source evidence refs:</p><pre class=\"mono\">" +
      esc(JSON.stringify((item && item.source_evidence_refs) || [], null, 2)) +
      "</pre></details>" +
      "</div>" +
      '<aside class="sticky-panel" aria-label="Reviewer decision form">' +
      "<h3>Reviewer decision</h3>" +
      decisionFormHtml(req, item, draft, disabled, disabledReason) +
      "</aside></div>";

    bindDecisionForm(req, disabled);
  }

  function readForm() {
    var form = document.getElementById("decisionForm");
    var data = {};
    if (!form) return data;
    ["decision_value", "rationale", "reviewer_identifier", "reviewer_role", "review_date", "signature", "requested_changes"].forEach(
      function (name) {
        var el = form.elements[name];
        data[name] = el ? el.value : "";
      }
    );
    return data;
  }

  function bindDecisionForm(req, disabled) {
    var pkg = CareRagState.state.bundle.governance_package_id;
    var role = CareRagState.state.sessionRole;
    var saveBtn = document.getElementById("saveDraftBtn");
    var clearBtn = document.getElementById("clearDraftBtn");
    var form = document.getElementById("decisionForm");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        CareRagStorage.saveDraft(pkg, role, req.decision_requirement_id, readForm());
        toast("Draft saved locally (not a decision).");
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        CareRagStorage.deleteDraft(pkg, role, req.decision_requirement_id);
        toast("Draft deleted.");
        renderItem(document.getElementById("main"), req.decision_requirement_id);
      });
    }
    if (form && !disabled) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var formData = readForm();
        var decision = CareRagState.buildDecisionFromForm(req, formData);
        var errors = CareRagValidation.validateDecision(decision, {
          packageId: pkg,
          requirement: req,
          schema: CareRagState.state.bundle.decision_schema,
          existingActive: CareRagState.activeDecisions(),
        });
        var box = document.getElementById("formErrors");
        if (errors.length) {
          box.hidden = false;
          box.innerHTML = errors
            .map(function (er) {
              return "<li>" + esc(er.message) + "</li>";
            })
            .join("");
          return;
        }
        if (
          !window.confirm(
            "Prepare this decision for export?\n\nIt will be stored locally as a prepared record for governance ingestion. It is NOT authoritative approval."
          )
        ) {
          return;
        }
        CareRagState.upsertDecision(decision);
        CareRagStorage.deleteDraft(pkg, role, req.decision_requirement_id);
        toast("Decision prepared locally. Export from Export & validation.");
        location.hash = "#/register";
      });
    }
  }

  function renderAdmin(root) {
    root.innerHTML =
      "<h2>Governance administrator</h2>" +
      '<p class="notice warn">These forms prepare governance policy decisions for export. Filling a draft does <strong>not</strong> activate the 201 conditional CSO requirements. Export the authorised policy decision and require regeneration of the authoritative decision-requirements package.</p>' +
      '<div class="card" id="provenanceCard">' +
      "<h3>1. Source-control provenance decision</h3>" +
      "<p>Current state: status = <strong>unversioned</strong>, gate = <strong>blocked</strong>, unresolved mode = plan_only (not an approval outcome).</p>" +
      provenanceForm() +
      "</div>" +
      '<div class="card" id="csoPolicyCard">' +
      "<h3>2. CSO participation-classification policy</h3>" +
      "<p>Policy question ID: <code>gpr_cso_participation_classification</code></p>" +
      csoPolicyForm() +
      "</div>";
    bindAdminForms();
  }

  function provenanceForm() {
    var strategies = [
      "existing_repository",
      "new_dedicated_repository",
      "accepted_non_git_provenance_policy",
      "defer",
      "reject",
      "request_change",
    ];
    return (
      '<form id="provenanceForm" class="form-grid">' +
      '<label for="prov_decision_id">decision_id (auto on prepare)<input id="prov_decision_id" name="decision_id" readonly value="(generated on prepare)" /></label>' +
      '<label>decision_type<input name="decision_type" value="source_control_provenance_strategy" readonly /></label>' +
      "<label>selected_strategy<select name=\"selected_strategy\" required><option value=\"\">Select…</option>" +
      strategies
        .map(function (s) {
          return '<option value="' + s + '">' + s + "</option>";
        })
        .join("") +
      "</select></label>" +
      '<label>repository_or_mechanism<input name="repository_or_mechanism" required /></label>' +
      '<label>responsible_owner<input name="responsible_owner" required /></label>' +
      '<label>integrity_controls<textarea name="integrity_controls" rows="2" required></textarea></label>' +
      '<label>retention_policy<textarea name="retention_policy" rows="2" required></textarea></label>' +
      '<label>version_identifier<input name="version_identifier" required /></label>' +
      '<label>access_controls<textarea name="access_controls" rows="2" required></textarea></label>' +
      '<label>change_control_process<textarea name="change_control_process" rows="2" required></textarea></label>' +
      '<label>approval_date<input name="approval_date" type="date" required /></label>' +
      '<label>reviewer_identifier<input name="reviewer_identifier" required /></label>' +
      '<label>reviewer_role<input name="reviewer_role" value="governance_administrator" required /></label>' +
      '<label>rationale<textarea name="rationale" rows="3" required></textarea></label>' +
      '<label>signature_or_attestation<input name="signature_or_attestation" required /></label>' +
      '<label>status<select name="status"><option value="active">active (prepared export)</option><option value="defer">defer</option></select></label>' +
      '<div class="btn-row"><button type="submit" class="primary">Validate &amp; prepare provenance decision</button></div>' +
      '<div id="provErrors" class="error-list" role="alert" hidden></div>' +
      "</form>"
    );
  }

  function csoPolicyForm() {
    return (
      '<form id="csoPolicyForm" class="form-grid">' +
      '<label>policy_question_id<input name="policy_question_id" value="gpr_cso_participation_classification" readonly /></label>' +
      '<label>policy_version<input name="policy_version" required placeholder="e.g. cso-class-v1" /></label>' +
      "<label>Default classification for new_amber_cluster<select name=\"rule_new_amber_cluster\">" +
      classOptions() +
      "</select></label>" +
      "<label>Default for patient_wording<select name=\"rule_patient_wording\">" +
      classOptions() +
      "</select></label>" +
      "<label>Default for pending_construct<select name=\"rule_pending_construct\">" +
      classOptions() +
      "</select></label>" +
      "<label>Default for safety_net_policy<select name=\"rule_safety_net_policy\">" +
      classOptions() +
      "</select></label>" +
      "<label>Default for technical / governance items<select name=\"rule_other\">" +
      classOptions() +
      "</select></label>" +
      '<label>Additional rules (JSON array of metadata-based rules)<textarea name="rules_json" rows="5" placeholder=\'[{"when":{"severity":"amber"},"classification":"sampled_cso_oversight"}]\'></textarea></label>' +
      '<label>rationale<textarea name="rationale" rows="4" required></textarea></label>' +
      '<label>reviewer_identifier<input name="reviewer_identifier" required /></label>' +
      '<label>reviewer_role<input name="reviewer_role" value="governance_panel" required /></label>' +
      '<label>review_date<input name="review_date" type="date" required /></label>' +
      '<label>signature_or_attestation<input name="signature_or_attestation" required /></label>' +
      '<p class="notice warn">Exporting this policy does not activate CSO requirements in the browser. Regeneration of decision-requirements is required.</p>' +
      '<div class="btn-row"><button type="submit" class="primary">Validate &amp; prepare CSO policy decision</button></div>' +
      '<div id="csoPolErrors" class="error-list" role="alert" hidden></div>' +
      "</form>"
    );
  }

  function classOptions() {
    return [
      "individual_mandatory_cso_review",
      "sampled_cso_oversight",
      "clinician_review_only",
      "governance_escalation",
      "deferred_classification",
    ]
      .map(function (v) {
        return '<option value="' + v + '">' + v + "</option>";
      })
      .join("");
  }

  function bindAdminForms() {
    var pf = document.getElementById("provenanceForm");
    if (pf) {
      pf.addEventListener("submit", function (e) {
        e.preventDefault();
        var fd = new FormData(pf);
        var strategy = fd.get("selected_strategy");
        if (strategy === "plan_only") {
          showErrors("provErrors", ["plan_only is not an allowed approval outcome."]);
          return;
        }
        var missing = [];
        [
          "selected_strategy",
          "repository_or_mechanism",
          "responsible_owner",
          "integrity_controls",
          "retention_policy",
          "version_identifier",
          "access_controls",
          "change_control_process",
          "approval_date",
          "reviewer_identifier",
          "reviewer_role",
          "rationale",
          "signature_or_attestation",
        ].forEach(function (k) {
          if (!String(fd.get(k) || "").trim()) missing.push(k + " is required");
        });
        if (missing.length) {
          showErrors("provErrors", missing);
          return;
        }
        if (
          !confirm(
            "Prepare provenance strategy decision for export? This does not change the package gate by itself."
          )
        )
          return;
        var rec = {
          decision_id: CareRagState.newDecisionId(),
          decision_type: "source_control_provenance_strategy",
          decision_requirement_id: "gov_admin_source_control_provenance_strategy",
          decision_scope: "governance_confirmation",
          required_reviewer_role: "governance_administrator",
          governance_package_id: CareRagState.state.bundle.governance_package_id,
          baseline_snapshot_id: CareRagState.state.bundle.baseline_snapshot_id,
          status: "active",
          decision_value: strategy,
          selected_strategy: strategy,
          repository_or_mechanism: fd.get("repository_or_mechanism"),
          responsible_owner: fd.get("responsible_owner"),
          integrity_controls: fd.get("integrity_controls"),
          retention_policy: fd.get("retention_policy"),
          version_identifier: fd.get("version_identifier"),
          access_controls: fd.get("access_controls"),
          change_control_process: fd.get("change_control_process"),
          review_date: fd.get("approval_date"),
          approval_date: fd.get("approval_date"),
          reviewer_identifier: fd.get("reviewer_identifier"),
          reviewer_role: fd.get("reviewer_role"),
          rationale: fd.get("rationale"),
          signature: fd.get("signature_or_attestation"),
          enables_pilot: false,
          enables_production: false,
          export_authority_notice:
            "Prepared for governance ingestion only. Does not un-block provenance gate until ingested.",
          created_at: new Date().toISOString(),
        };
        CareRagState.upsertDecision(rec);
        toast("Provenance decision prepared for export.");
        location.hash = "#/export";
      });
    }
    var cf = document.getElementById("csoPolicyForm");
    if (cf) {
      cf.addEventListener("submit", function (e) {
        e.preventDefault();
        var fd = new FormData(cf);
        var fields = [
          "policy_version",
          "rationale",
          "reviewer_identifier",
          "reviewer_role",
          "review_date",
          "signature_or_attestation",
        ];
        var missing = fields.filter(function (k) {
          return !String(fd.get(k) || "").trim();
        });
        if (missing.length) {
          showErrors(
            "csoPolErrors",
            missing.map(function (m) {
              return m + " is required";
            })
          );
          return;
        }
        var extraRules = [];
        var raw = String(fd.get("rules_json") || "").trim();
        if (raw) {
          try {
            extraRules = JSON.parse(raw);
          } catch (err) {
            showErrors("csoPolErrors", ["rules_json must be valid JSON"]);
            return;
          }
        }
        if (
          !confirm(
            "Prepare CSO participation policy for export?\n\nThis will NOT activate conditional CSO requirements in the browser."
          )
        )
          return;
        var rec = {
          decision_id: CareRagState.newDecisionId(),
          decision_type: "governance_policy_answer",
          policy_question_id: "gpr_cso_participation_classification",
          decision_requirement_id: "policy_gpr_cso_participation_classification",
          decision_scope: "governance_confirmation",
          required_reviewer_role: "governance_panel",
          governance_package_id: CareRagState.state.bundle.governance_package_id,
          baseline_snapshot_id: CareRagState.state.bundle.baseline_snapshot_id,
          status: "active",
          decision_value: "confirm_governance_position",
          policy_version: fd.get("policy_version"),
          classification_defaults: {
            new_amber_cluster: fd.get("rule_new_amber_cluster"),
            patient_wording: fd.get("rule_patient_wording"),
            pending_construct: fd.get("rule_pending_construct"),
            safety_net_policy: fd.get("rule_safety_net_policy"),
            other: fd.get("rule_other"),
          },
          metadata_rules: extraRules,
          activates_cso_in_browser: false,
          requires_requirements_regeneration: true,
          rationale: fd.get("rationale"),
          reviewer_identifier: fd.get("reviewer_identifier"),
          reviewer_role: fd.get("reviewer_role"),
          review_date: fd.get("review_date"),
          signature: fd.get("signature_or_attestation"),
          enables_pilot: false,
          enables_production: false,
          export_authority_notice:
            "Policy export only. Regenerate decision-requirements before CSO activation.",
          created_at: new Date().toISOString(),
        };
        CareRagState.upsertDecision(rec);
        toast("CSO policy decision prepared. Requirements not activated in-browser.");
        location.hash = "#/export";
      });
    }
  }

  function showErrors(id, messages) {
    var box = document.getElementById(id);
    box.hidden = false;
    box.innerHTML = messages
      .map(function (m) {
        return "<li>" + esc(m) + "</li>";
      })
      .join("");
  }

  function renderCso(root) {
    var view = CareRagState.state.bundle.review_views.views.find(function (v) {
      return v.view_id === "provisional_cso_candidates_pending_policy";
    });
    var reqs = CareRagState.requirementsForRole("clinical_safety_officer");
    root.innerHTML =
      "<h2>Clinical Safety Officer workspace</h2>" +
      '<p class="notice warn" role="status">View: <code>provisional_cso_candidates_pending_policy</code>. All ' +
      reqs.length +
      " CSO candidates are <strong>conditional_pending_policy</strong>, <strong>not currently mandatory</strong>, and <strong>inactive pending governance policy</strong>.</p>" +
      "<ul>" +
      "<li>Final CSO decision submission is disabled.</li>" +
      "<li>Evidence browsing is allowed.</li>" +
      "<li>Private notes/drafts are non-authoritative only.</li>" +
      "<li>Required policy for activation: <code>gpr_cso_participation_classification</code>.</li>" +
      "<li>CSO items are not counted as overdue mandatory decisions.</li>" +
      "<li>CSO is not presented as an active required reviewer until an authorised regenerated requirements package is loaded.</li>" +
      "</ul>" +
      "<p>View item count: " +
      esc(view && view.item_count) +
      "</p>" +
      '<div class="table-wrap"><table><thead><tr><th>Requirement</th><th>Item</th><th>Status</th><th></th></tr></thead><tbody>' +
      reqs
        .slice(0, 50)
        .map(function (r) {
          return (
            "<tr><td class=\"mono\">" +
            esc(r.decision_requirement_id) +
            '</td><td class="mono">' +
            esc(r.review_item_id) +
            "</td><td>" +
            chip("inactive_pending_policy", "conditional_pending_policy") +
            '</td><td><a href="#/item/' +
            encodeURIComponent(r.decision_requirement_id) +
            '">Browse evidence</a></td></tr>'
          );
        })
        .join("") +
      "</tbody></table></div>" +
      "<p class=\"notice info\">Showing first 50 of " +
      reqs.length +
      ". Use My review queue with role filter for the full set.</p>";
  }

  function renderTechnical(root) {
    var reqs = CareRagState.requirementsForRole("technical_reviewer");
    root.innerHTML =
      "<h2>Technical reviewer workspace</h2>" +
      '<p class="notice info">Technical acknowledgements are never clinical approvals. Allowed values: acknowledge, dispute_evidence, request_change, defer.</p>' +
      reqs
        .map(function (r) {
          var item = CareRagState.getItem(r.review_item_id);
          return (
            '<div class="card"><h3 class="mono">' +
            esc(r.decision_requirement_id) +
            "</h3>" +
            "<p>Scope: " +
            esc(r.decision_scope) +
            " · Item: " +
            esc(r.review_item_id) +
            "</p>" +
            "<p>Technical validation: " +
            esc(
              item && item.technical_validation_result
                ? JSON.stringify(item.technical_validation_result)
                : "see provenance"
            ) +
            "</p>" +
            '<p><a class="btn primary" href="#/item/' +
            encodeURIComponent(r.decision_requirement_id) +
            '">Open acknowledgement task</a></p></div>'
          );
        })
        .join("");
  }

  function renderGovernance(root) {
    var reqs = CareRagState.requirementsForRole("governance_panel");
    root.innerHTML =
      "<h2>Governance-panel confirmations</h2>" +
      '<p class="notice info">Governance confirmation must not approve a clinical mapping. Allowed: confirm_governance_position, withhold_confirmation, request_change, defer.</p>' +
      reqs
        .map(function (r) {
          return (
            '<div class="card"><h3 class="mono">' +
            esc(r.decision_requirement_id) +
            "</h3><p>Scope: " +
            esc(r.decision_scope) +
            '</p><p><a class="btn primary" href="#/item/' +
            encodeURIComponent(r.decision_requirement_id) +
            '">Open confirmation</a></p></div>'
          );
        })
        .join("");
  }

  function renderPolicy(root) {
    var entries = CareRagState.state.bundle.policy_register.entries;
    var pkg = CareRagState.state.bundle.governance_package_id;
    root.innerHTML =
      "<h2>Governance-policy register</h2>" +
      '<p class="notice info">Eight policy questions — separate from the 204-item clinical queue. Each exports independently.</p>' +
      entries
        .map(function (e, idx) {
          var draft = CareRagStorage.loadPolicyDraft(pkg, e.policy_question_id) || {};
          return (
            '<div class="card" id="policy_' +
            esc(e.policy_question_id) +
            '">' +
            "<h3>" +
            (idx + 1) +
            ". " +
            esc(e.policy_question_id) +
            "</h3>" +
            "<p>" +
            esc(e.question) +
            "</p>" +
            "<ul>" +
            "<li>Owner role: " +
            esc(e.owner_role) +
            "</li>" +
            "<li>Status: " +
            chip("pending", e.status || "unanswered") +
            "</li>" +
            "<li>Current answer: " +
            esc(e.answer == null ? "(none)" : e.answer) +
            "</li>" +
            "<li>Part of clinical queue: " +
            esc(String(e.part_of_clinical_review_queue)) +
            "</li></ul>" +
            '<form class="form-grid policy-form" data-policy-id="' +
            esc(e.policy_question_id) +
            '">' +
            '<label>Prepared answer<textarea name="answer" rows="3">' +
            esc(draft.answer || "") +
            "</textarea></label>" +
            '<label>Rationale<textarea name="rationale" rows="3">' +
            esc(draft.rationale || "") +
            "</textarea></label>" +
            '<label>Reviewer identifier<input name="reviewer_identifier" value="' +
            esc(draft.reviewer_identifier || "") +
            '" /></label>' +
            '<label>Review date<input type="date" name="review_date" value="' +
            esc(draft.review_date || "") +
            '" /></label>' +
            '<label>Attestation<input name="signature" value="' +
            esc(draft.signature || "") +
            '" /></label>' +
            '<div class="btn-row">' +
            '<button type="button" class="save-policy-draft">Save draft</button>' +
            '<button type="submit" class="primary">Prepare policy decision export</button>' +
            "</div></form></div>"
          );
        })
        .join("");
    root.querySelectorAll(".policy-form").forEach(function (form) {
      var pid = form.getAttribute("data-policy-id");
      form.querySelector(".save-policy-draft").addEventListener("click", function () {
        CareRagStorage.savePolicyDraft(pkg, pid, Object.fromEntries(new FormData(form)));
        toast("Policy draft saved (not a decision).");
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        if (!String(fd.get("answer") || "").trim() || !String(fd.get("rationale") || "").trim()) {
          toast("Answer and rationale required.");
          return;
        }
        if (!confirm("Prepare policy decision for " + pid + " for export?")) return;
        CareRagState.upsertDecision({
          decision_id: CareRagState.newDecisionId(),
          decision_type: "governance_policy_answer",
          policy_question_id: pid,
          decision_requirement_id: "policy_" + pid,
          decision_scope: "governance_confirmation",
          required_reviewer_role: "governance_panel",
          governance_package_id: pkg,
          baseline_snapshot_id: CareRagState.state.bundle.baseline_snapshot_id,
          status: "active",
          decision_value: "confirm_governance_position",
          answer: fd.get("answer"),
          rationale: fd.get("rationale"),
          reviewer_identifier: fd.get("reviewer_identifier"),
          reviewer_role: "governance_panel",
          review_date: fd.get("review_date"),
          signature: fd.get("signature"),
          enables_pilot: false,
          enables_production: false,
          created_at: new Date().toISOString(),
          export_authority_notice: "Policy decision prepared for governance ingestion only.",
        });
        toast("Policy decision prepared.");
      });
    });
  }

  function renderRegister(root) {
    var rows = CareRagState.state.decisions;
    root.innerHTML =
      "<h2>Decision register</h2>" +
      '<p>Locally prepared / imported decision records. Browser storage is not the authoritative register.</p>' +
      '<div class="table-wrap"><table><thead><tr>' +
      "<th>Decision ID</th><th>Requirement / policy</th><th>Role</th><th>Reviewer</th><th>Value</th><th>Status</th><th>Date</th><th>Package</th><th>Item hash</th><th>Supersession</th>" +
      "</tr></thead><tbody>" +
      (rows.length
        ? rows
            .map(function (d) {
              return (
                "<tr>" +
                '<td class="mono">' +
                esc(d.decision_id) +
                "</td>" +
                '<td class="mono">' +
                esc(d.decision_requirement_id || d.policy_question_id) +
                "</td>" +
                "<td>" +
                esc(d.reviewer_role || d.required_reviewer_role) +
                "</td>" +
                "<td>" +
                esc(d.reviewer_identifier) +
                "</td>" +
                "<td>" +
                esc(d.decision_value || d.selected_strategy || d.answer) +
                "</td>" +
                "<td>" +
                esc(d.status) +
                "</td>" +
                "<td>" +
                esc(d.review_date || d.created_at) +
                "</td>" +
                '<td class="mono">' +
                esc(d.governance_package_id) +
                "</td>" +
                '<td class="mono">' +
                esc((d.review_item_hash || "").slice(0, 12)) +
                "</td>" +
                "<td>" +
                esc(d.supersedes_decision_id || d.superseded_by_decision_id || "—") +
                "</td></tr>"
              );
            })
            .join("")
        : "<tr><td colspan=\"10\">No decisions prepared yet (correct — none were pre-populated).</td></tr>") +
      "</tbody></table></div>";
  }

  function renderExport(root) {
    root.innerHTML =
      "<h2>Export &amp; validation</h2>" +
      '<p class="notice warn">Exported JSON requires ingestion through the authorised governance process. Validation errors are shown without silently modifying data.</p>' +
      '<div class="btn-row">' +
      '<button type="button" class="primary" id="exportAll">Export full decision bundle</button>' +
      '<button type="button" id="exportRole">Export current role decisions</button>' +
      '<button type="button" id="exportSelected">Export selected (register filter TBD — exports all active)</button>' +
      '<label class="btn">Import JSON<input type="file" id="importFile" accept="application/json,.json" hidden /></label>' +
      "</div>" +
      '<pre id="exportPreview" class="mono" style="max-height:20rem;overflow:auto;background:#f7f9f7;padding:0.75rem;border-radius:8px;"></pre>' +
      '<div id="importErrors" class="error-list" role="alert"></div>';

    document.getElementById("exportAll").addEventListener("click", function () {
      doExport(CareRagState.state.decisions);
    });
    document.getElementById("exportRole").addEventListener("click", function () {
      var role = CareRagState.state.sessionRole;
      doExport(
        CareRagState.state.decisions.filter(function (d) {
          return (
            d.reviewer_role === role ||
            d.required_reviewer_role === role ||
            (role === "governance_administrator" &&
              d.decision_type === "source_control_provenance_strategy")
          );
        })
      );
    });
    document.getElementById("exportSelected").addEventListener("click", function () {
      doExport(
        CareRagState.state.decisions.filter(function (d) {
          return d.status === "active";
        })
      );
    });
    document.getElementById("importFile").addEventListener("change", function (ev) {
      var file = ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var doc = JSON.parse(reader.result);
          var result = CareRagValidation.validateImportedBundle(
            doc,
            CareRagState.state.bundle.governance_package_id
          );
          if (result.errors && result.errors.length) {
            document.getElementById("importErrors").innerHTML = result.errors
              .map(function (e) {
                return "<li>" + esc(e.message) + "</li>";
              })
              .join("");
            return;
          }
          var added = CareRagState.importDecisions(result.records);
          toast("Imported " + added + " decision record(s).");
          renderRegister(document.getElementById("main"));
        } catch (err) {
          document.getElementById("importErrors").innerHTML =
            "<li>Invalid JSON: " + esc(err.message) + "</li>";
        }
      };
      reader.readAsText(file);
    });
  }

  function doExport(records) {
    var pkg = CareRagState.state.bundle.governance_package_id;
    var validated = [];
    var allErrors = [];
    records.forEach(function (rec) {
      var req = CareRagState.getRequirement(rec.decision_requirement_id);
      if (!req && rec.decision_type) {
        // Admin/policy decisions without queue requirements — structural check only
        if (rec.governance_package_id !== pkg) {
          allErrors.push({
            decision_id: rec.decision_id,
            errors: [{ message: "package_id mismatch" }],
          });
          return;
        }
        if (rec.enables_pilot || rec.enables_production) {
          allErrors.push({
            decision_id: rec.decision_id,
            errors: [{ message: "must not enable pilot/production" }],
          });
          return;
        }
        validated.push(rec);
        return;
      }
      var errors = CareRagValidation.validateDecision(rec, {
        packageId: pkg,
        requirement: req,
        schema: CareRagState.state.bundle.decision_schema,
        existingActive: CareRagState.activeDecisions(),
      });
      if (errors.length) {
        allErrors.push({ decision_id: rec.decision_id, errors: errors });
      } else {
        validated.push(rec);
      }
    });
    if (allErrors.length) {
      document.getElementById("exportPreview").textContent = JSON.stringify(
        { validation_failed: true, errors: allErrors },
        null,
        2
      );
      toast("Export blocked: validation errors (data not modified).");
      return;
    }
    if (
      !confirm(
        "Export " +
          validated.length +
          " decision(s)?\n\nExported files require authorised governance ingestion."
      )
    )
      return;
    var bundle = {
      export_kind: "care_rag_phase4_4_2a_decision_bundle",
      governance_package_id: pkg,
      baseline_snapshot_id: CareRagState.state.bundle.baseline_snapshot_id,
      exported_at_utc: new Date().toISOString(),
      authority_notice:
        "Prepared in browser for governance ingestion. Not authoritative until validated and ingested.",
      clinical_approvals_implied: false,
      enables_pilot: false,
      enables_production: false,
      decisions: validated,
    };
    document.getElementById("exportPreview").textContent = JSON.stringify(
      bundle,
      null,
      2
    );
    var blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download =
      "care_rag_decisions_" + pkg.slice(0, 24) + "_" + Date.now() + ".json";
    a.click();
    toast("Decision bundle downloaded.");
  }

  function renderRelease(root) {
    root.innerHTML =
      "<h2>Release (read-only)</h2>" +
      '<div class="release-disabled">' +
      '<p class="notice danger" role="alert">Pilot and production remain <strong>blocked</strong>. Clinical review completion does not itself enable a pilot. Separate explicit governance decisions are required.</p>' +
      '<div class="enable-controls card">' +
      "<p>Enable pilot — <strong>disabled</strong></p>" +
      "<p>Enable production — <strong>disabled</strong></p>" +
      "<p>Feature flags:</p>" +
      "<ul><li><code>enableClarificationRoutingV2</code> = false</li>" +
      "<li><code>enableDeviceClarificationPackV1</code> = false</li></ul>" +
      '<button type="button" disabled>Enable pilot</button> ' +
      '<button type="button" disabled>Enable production</button>' +
      "</div></div>";
  }

  global.CareRagViews = {
    renderOverview: renderOverview,
    renderQueue: renderQueue,
    renderItem: renderItem,
    renderAdmin: renderAdmin,
    renderCso: renderCso,
    renderTechnical: renderTechnical,
    renderGovernance: renderGovernance,
    renderPolicy: renderPolicy,
    renderRegister: renderRegister,
    renderExport: renderExport,
    renderRelease: renderRelease,
    toast: toast,
    safetyStrip: safetyStrip,
  };
})(window);
