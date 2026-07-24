/* Portal application state */
(function (global) {
  "use strict";

  var state = {
    bundle: null,
    manifest: null,
    sessionRole: "governance_administrator",
    decisions: [],
    selectedRequirementId: null,
    selectedItemId: null,
    /** When true, finishing a case opens another random unreviewed case. */
    rapidReview: false,
    /** Wizard step index for phone-friendly review flow. */
    wizardStep: 0,
    /** Carry-forward identity so doctors do not retype every case. */
    reviewerProfile: {
      reviewer_identifier: "",
      signature: "",
    },
    filters: {
      role: "",
      domain: "",
      category: "",
      clinical_category: "",
      terminal_action: "",
      concept: "",
      mapping_status: "",
      decision_status: "",
      severity: "",
      activation: "",
      search: "",
    },
    loadError: null,
  };

  var PROFILE_KEY = "care_rag_gov_reviewer_profile_v1";

  function loadReviewerProfile() {
    try {
      var raw = sessionStorage.getItem(PROFILE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        state.reviewerProfile.reviewer_identifier =
          parsed.reviewer_identifier || "";
        state.reviewerProfile.signature = parsed.signature || "";
      }
    } catch (e) {
      /* ignore */
    }
  }

  function saveReviewerProfile(form) {
    state.reviewerProfile.reviewer_identifier = form.reviewer_identifier || "";
    state.reviewerProfile.signature = form.signature || "";
    try {
      sessionStorage.setItem(
        PROFILE_KEY,
        JSON.stringify(state.reviewerProfile)
      );
    } catch (e) {
      /* ignore */
    }
  }

  function setBundle(bundle, manifest) {
    state.bundle = bundle;
    state.manifest = manifest;
    state.decisions = CareRagStorage.loadDecisions(bundle.governance_package_id);
    loadReviewerProfile();
  }

  /**
   * Unreviewed mandatory_active requirements eligible for random review.
   * Respects current filters when provided via itemMatchesFilters callback.
   */
  function pendingRequirementsForRapid(matchFn) {
    if (!state.bundle) return [];
    var role = state.sessionRole;
    return state.bundle.decision_requirements.requirements.filter(function (req) {
      if (req.requirement_activation_status !== "mandatory_active") return false;
      if (decisionForRequirement(req.decision_requirement_id)) return false;
      // CSO conditional never eligible; also skip if role is CSO and still pending.
      if (req.required_reviewer_role === "clinical_safety_officer") return false;
      if (
        role !== "governance_administrator" &&
        req.required_reviewer_role !== role
      ) {
        return false;
      }
      if (typeof matchFn === "function") {
        var item = req.review_item_id ? getItem(req.review_item_id) : null;
        if (!matchFn(item, req, null)) return false;
      }
      return true;
    });
  }

  function pickRandomPending(excludeId, matchFn) {
    var pool = pendingRequirementsForRapid(matchFn).filter(function (req) {
      return req.decision_requirement_id !== excludeId;
    });
    if (!pool.length) return null;
    var idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  function getRequirement(id) {
    if (!state.bundle) return null;
    var list = state.bundle.decision_requirements.requirements;
    for (var i = 0; i < list.length; i++) {
      if (list[i].decision_requirement_id === id) return list[i];
    }
    return null;
  }

  function getItem(id) {
    if (!state.bundle) return null;
    var list = state.bundle.review_queue.items;
    for (var i = 0; i < list.length; i++) {
      if (list[i].review_item_id === id) return list[i];
    }
    return null;
  }

  function requirementsForRole(role) {
    return state.bundle.decision_requirements.requirements.filter(function (r) {
      return r.required_reviewer_role === role;
    });
  }

  function activeDecisions() {
    return state.decisions.filter(function (d) {
      return d.status === "active";
    });
  }

  function decisionForRequirement(reqId) {
    var active = null;
    state.decisions.forEach(function (d) {
      if (d.decision_requirement_id === reqId && d.status === "active") active = d;
    });
    return active;
  }

  function upsertDecision(decision) {
    var next = state.decisions.slice();
    if (decision.supersedes_decision_id) {
      next = next.map(function (d) {
        if (d.decision_id === decision.supersedes_decision_id) {
          return Object.assign({}, d, {
            status: "superseded",
            superseded_by_decision_id: decision.decision_id,
          });
        }
        return d;
      });
    }
    next.push(decision);
    state.decisions = next;
    CareRagStorage.saveDecisions(state.bundle.governance_package_id, next);
  }

  function importDecisions(records) {
    var added = 0;
    records.forEach(function (rec) {
      if (!rec.decision_id) return;
      var exists = state.decisions.some(function (d) {
        return d.decision_id === rec.decision_id;
      });
      if (!exists) {
        state.decisions.push(rec);
        added += 1;
      }
    });
    CareRagStorage.saveDecisions(
      state.bundle.governance_package_id,
      state.decisions
    );
    return added;
  }

  function newDecisionId() {
    var rand = Math.random().toString(16).slice(2, 10);
    return (
      "dec_" +
      Date.now().toString(16) +
      "_" +
      rand
    );
  }

  function buildDecisionFromForm(requirement, form, opts) {
    opts = opts || {};
    var prior = decisionForRequirement(requirement.decision_requirement_id);
    var status = opts.status || "active";
    if (requirement.requirement_activation_status === "conditional_pending_policy") {
      status = "inactive_pending_policy";
    }
    return {
      decision_id: newDecisionId(),
      decision_requirement_id: requirement.decision_requirement_id,
      review_item_id: requirement.review_item_id || null,
      decision_scope: requirement.decision_scope,
      required_reviewer_role: requirement.required_reviewer_role,
      created_at: new Date().toISOString(),
      status: status,
      supersedes_decision_id: prior ? prior.decision_id : null,
      superseded_by_decision_id: null,
      governance_package_id: state.bundle.governance_package_id,
      baseline_snapshot_id: state.bundle.baseline_snapshot_id,
      review_item_hash: requirement.review_item_hash || null,
      protected_evidence_hashes: requirement.expected_protected_hashes || {},
      expected_protected_hashes: requirement.expected_protected_hashes || {},
      decision_value: form.decision_value || null,
      rationale: form.rationale || null,
      reviewer_identifier: form.reviewer_identifier || null,
      reviewer_role: form.reviewer_role || requirement.required_reviewer_role,
      review_date: form.review_date || null,
      signature: form.signature || null,
      requested_changes: form.requested_changes || null,
      requirement_activation_status: requirement.requirement_activation_status,
      activation_policy_question_id:
        requirement.activation_policy_question_id || null,
      provisional_classification: requirement.provisional_classification || null,
      mandatory_when_activated: requirement.mandatory_when_activated || null,
      export_authority_notice:
        "Prepared for governance ingestion only. Not authoritative until validated and ingested.",
      browser_prepared: true,
      clinically_approved: false,
      enables_pilot: false,
      enables_production: false,
      enableClarificationRoutingV2: false,
      enableDeviceClarificationPackV1: false,
    };
  }

  global.CareRagState = {
    state: state,
    setBundle: setBundle,
    getRequirement: getRequirement,
    getItem: getItem,
    requirementsForRole: requirementsForRole,
    activeDecisions: activeDecisions,
    decisionForRequirement: decisionForRequirement,
    upsertDecision: upsertDecision,
    importDecisions: importDecisions,
    buildDecisionFromForm: buildDecisionFromForm,
    newDecisionId: newDecisionId,
    pendingRequirementsForRapid: pendingRequirementsForRapid,
    pickRandomPending: pickRandomPending,
    saveReviewerProfile: saveReviewerProfile,
    loadReviewerProfile: loadReviewerProfile,
  };
})(window);
