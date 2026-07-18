/* Draft persistence — local only, never authoritative. */
(function (global) {
  "use strict";

  var PREFIX = "care_rag_gov_draft_v1";

  function draftKey(packageId, role, requirementId) {
    return [PREFIX, packageId, role, requirementId].join("::");
  }

  function decisionsKey(packageId) {
    return PREFIX + "::decisions::" + packageId;
  }

  function policyDraftKey(packageId, policyQuestionId) {
    return [PREFIX, "policy", packageId, policyQuestionId].join("::");
  }

  function saveDraft(packageId, role, requirementId, draft) {
    var payload = Object.assign({}, draft, {
      _draft_only: true,
      _not_authoritative: true,
      _saved_at: new Date().toISOString(),
    });
    localStorage.setItem(
      draftKey(packageId, role, requirementId),
      JSON.stringify(payload)
    );
  }

  function loadDraft(packageId, role, requirementId) {
    var raw = localStorage.getItem(draftKey(packageId, role, requirementId));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function deleteDraft(packageId, role, requirementId) {
    localStorage.removeItem(draftKey(packageId, role, requirementId));
  }

  function listDraftKeys(packageId) {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX + "::" + packageId) === 0) keys.push(k);
      if (k && k.indexOf(PREFIX + "::policy::" + packageId) === 0) keys.push(k);
    }
    return keys;
  }

  function loadDecisions(packageId) {
    var raw = localStorage.getItem(decisionsKey(packageId));
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveDecisions(packageId, decisions) {
    localStorage.setItem(decisionsKey(packageId), JSON.stringify(decisions));
  }

  function savePolicyDraft(packageId, policyQuestionId, draft) {
    localStorage.setItem(
      policyDraftKey(packageId, policyQuestionId),
      JSON.stringify(
        Object.assign({}, draft, {
          _draft_only: true,
          _not_authoritative: true,
        })
      )
    );
  }

  function loadPolicyDraft(packageId, policyQuestionId) {
    var raw = localStorage.getItem(policyDraftKey(packageId, policyQuestionId));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  global.CareRagStorage = {
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    deleteDraft: deleteDraft,
    listDraftKeys: listDraftKeys,
    loadDecisions: loadDecisions,
    saveDecisions: saveDecisions,
    savePolicyDraft: savePolicyDraft,
    loadPolicyDraft: loadPolicyDraft,
    draftKey: draftKey,
  };
})(window);
