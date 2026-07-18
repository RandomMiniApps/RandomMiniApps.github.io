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

  function setBundle(bundle, manifest) {
    state.bundle = bundle;
    state.manifest = manifest;
    state.decisions = CareRagStorage.loadDecisions(bundle.governance_package_id);
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
  };
})(window);
