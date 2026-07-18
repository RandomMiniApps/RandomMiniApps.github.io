/* Phase 4.4.2a decision validation (browser). Mirrors care_rag_decision_validation.py */
(function (global) {
  "use strict";

  var CLINICAL_SCOPES = {
    clinical_mapping: true,
    patient_wording: true,
    pending_construct: true,
    safety_net_policy: true,
    clinical_safety_governance: true,
  };

  var FORBIDDEN_ENABLEMENT_KEYS = [
    "enable_pilot",
    "enable_production",
    "enableClarificationRoutingV2",
    "enableDeviceClarificationPackV1",
    "pilot_enabled",
    "production_enabled",
  ];

  var REQUIRED_HUMAN_FIELDS = [
    "decision_value",
    "rationale",
    "reviewer_identifier",
    "reviewer_role",
    "review_date",
    "signature",
  ];

  function err(code, message) {
    return { code: code, message: message };
  }

  function validateDecision(decision, opts) {
    opts = opts || {};
    var errors = [];
    var requirement = opts.requirement;
    var packageId = opts.packageId;
    var schema = opts.schema || {};
    var existingActive = opts.existingActive || [];

    if (!requirement) {
      errors.push(err("requirement_missing", "Decision requirement does not exist."));
      return errors;
    }

    if (decision.governance_package_id !== packageId) {
      errors.push(
        err(
          "package_id_mismatch",
          "Package ID does not match the currently loaded package."
        )
      );
    }

    if (decision.decision_requirement_id !== requirement.decision_requirement_id) {
      errors.push(
        err(
          "requirement_id_mismatch",
          "decision_requirement_id does not match the selected requirement."
        )
      );
    }

    var activation = requirement.requirement_activation_status;
    if (activation === "conditional_pending_policy") {
      errors.push(
        err(
          "conditional_inactive",
          "Requirement is conditional_pending_policy and cannot be exported as an active decision until an authorised regenerated requirements package marks it mandatory_active."
        )
      );
      if (decision.status === "active") {
        errors.push(
          err(
            "inactive_cso_exported_active",
            "Inactive/conditional requirement cannot be exported with status=active."
          )
        );
      }
    } else if (activation !== "mandatory_active" && decision.status === "active") {
      errors.push(
        err(
          "requirement_not_active",
          "Active export requires mandatory_active requirement status."
        )
      );
    }

    var role = decision.reviewer_role || decision.required_reviewer_role;
    if (role !== requirement.required_reviewer_role) {
      errors.push(
        err(
          "role_mismatch",
          "Reviewer role does not match the required reviewer role for this requirement."
        )
      );
    }

    var scope = requirement.decision_scope;
    var allowed =
      requirement.allowed_decision_values ||
      (schema.scope_allowed_decision_values &&
        schema.scope_allowed_decision_values[scope]) ||
      [];
    var value = decision.decision_value;
    if (allowed.indexOf(value) === -1) {
      errors.push(
        err(
          "decision_value_not_allowed",
          "Decision value '" +
            value +
            "' is not allowed for scope '" +
            scope +
            "'. Allowed: " +
            allowed.join(", ") +
            "."
        )
      );
    }

    if (scope === "technical_evidence_acknowledgement") {
      if (value === "approve" || decision.clinically_approved === true) {
        errors.push(
          err(
            "technical_as_clinical_approval",
            "Technical acknowledgement cannot produce clinical approval."
          )
        );
      }
    }

    if (scope === "governance_confirmation") {
      if (value === "approve" || decision.clinically_approved === true) {
        errors.push(
          err(
            "governance_as_clinical_approval",
            "Governance confirmation cannot produce clinical approval."
          )
        );
      }
    }

    if (
      decision.review_item_id &&
      requirement.review_item_id &&
      decision.review_item_id !== requirement.review_item_id
    ) {
      errors.push(
        err("review_item_id_mismatch", "review_item_id does not match requirement.")
      );
    }

    if (
      requirement.review_item_hash &&
      decision.review_item_hash !== requirement.review_item_hash
    ) {
      errors.push(
        err(
          "review_item_hash_mismatch",
          "review_item_hash does not match the authoritative requirement binding."
        )
      );
    }

    var expectedHashes = requirement.expected_protected_hashes || {};
    var provided =
      decision.expected_protected_hashes ||
      decision.protected_evidence_hashes ||
      {};
    Object.keys(expectedHashes).forEach(function (path) {
      if (provided[path] !== expectedHashes[path]) {
        errors.push(
          err("protected_hash_mismatch", "Protected hash mismatch for " + path + ".")
        );
      }
    });

    REQUIRED_HUMAN_FIELDS.forEach(function (field) {
      var val = decision[field];
      if (val == null || (typeof val === "string" && !String(val).trim())) {
        errors.push(
          err(
            "missing_human_field",
            "Required human field '" +
              field +
              "' is empty; drafts are not decisions."
          )
        );
      }
    });

    if (value === "request_change") {
      var rc = decision.requested_changes;
      if (rc == null || (typeof rc === "string" && !String(rc).trim())) {
        errors.push(
          err(
            "missing_requested_changes",
            "requested_changes is required when decision_value is request_change."
          )
        );
      }
    }

    FORBIDDEN_ENABLEMENT_KEYS.forEach(function (key) {
      if (decision[key] === true) {
        errors.push(
          err(
            "enablement_forbidden",
            "Decision must not set " + key + "; pilot and production remain blocked."
          )
        );
      }
    });
    if (decision.enables_pilot || decision.enables_production) {
      errors.push(
        err("enablement_forbidden", "No decision may enable pilot or production.")
      );
    }

    if (decision.status === "active" && decision.decision_requirement_id) {
      var peers = existingActive.filter(function (d) {
        return (
          d.decision_requirement_id === decision.decision_requirement_id &&
          d.status === "active" &&
          d.decision_id !== decision.decision_id
        );
      });
      if (peers.length && !decision.supersedes_decision_id) {
        errors.push(
          err(
            "duplicate_active_without_supersession",
            "An active decision already exists for this requirement; set supersedes_decision_id."
          )
        );
      }
      if (decision.supersedes_decision_id) {
        var known = {};
        existingActive.forEach(function (d) {
          known[d.decision_id] = true;
        });
        if (!known[decision.supersedes_decision_id] && peers.length) {
          if (!known[decision.supersedes_decision_id]) {
            errors.push(
              err(
                "supersedes_unresolvable",
                "supersedes_decision_id does not reference a known prior decision."
              )
            );
          }
        }
      }
    }

    return errors;
  }

  function progressCounts(requirements, decisions) {
    var activeReqs = requirements.filter(function (r) {
      return r.requirement_activation_status === "mandatory_active";
    });
    var conditional = requirements.filter(function (r) {
      return r.requirement_activation_status === "conditional_pending_policy";
    });
    var activeById = {};
    decisions.forEach(function (d) {
      if (d.status === "active" && d.decision_requirement_id) {
        activeById[d.decision_requirement_id] = d;
      }
    });
    var complete = 0;
    activeReqs.forEach(function (r) {
      if (activeById[r.decision_requirement_id]) complete += 1;
    });
    var outcomes = { reject: 0, request_change: 0, defer: 0, superseded: 0 };
    decisions.forEach(function (d) {
      if (d.status === "superseded") outcomes.superseded += 1;
      if (d.status === "active" && outcomes[d.decision_value] != null) {
        outcomes[d.decision_value] += 1;
      }
    });
    return {
      active_requirements_total: activeReqs.length,
      active_requirements_complete: complete,
      active_requirements_outstanding: activeReqs.length - complete,
      conditional_requirements_pending_policy: conditional.length,
      rejected_decisions: outcomes.reject,
      requested_changes: outcomes.request_change,
      deferred_decisions: outcomes.defer,
      superseded_decisions: outcomes.superseded,
    };
  }

  function validateImportedBundle(doc, packageId) {
    var errors = [];
    if (!doc || typeof doc !== "object") {
      return [err("invalid_json", "Import is not a JSON object.")];
    }
    var records = doc.decisions || doc.records || (Array.isArray(doc) ? doc : null);
    if (!records) {
      return [err("invalid_shape", "Expected { decisions: [...] } or { records: [...] }.")];
    }
    if (doc.governance_package_id && doc.governance_package_id !== packageId) {
      errors.push(err("package_id_mismatch", "Imported package ID does not match loaded package."));
    }
    return { errors: errors, records: records };
  }

  global.CareRagValidation = {
    validateDecision: validateDecision,
    progressCounts: progressCounts,
    validateImportedBundle: validateImportedBundle,
    CLINICAL_SCOPES: CLINICAL_SCOPES,
  };
})(window);
