(function (global) {
  "use strict";

  const C = () => global.XrayReviewConstants;

  function suggestRouterAction(targetStatus) {
    switch (targetStatus) {
      case "non_target_radiograph":
        return "abstain_non_target";
      case "target_but_adjacent_or_ambiguous":
        return "abstain_ambiguous";
      case "non_radiograph_or_unreadable":
        return "unreadable";
      case "uncertain":
        return "human_review_required";
      case "target_active_anatomy":
        return "accept_active_class";
      default:
        return null;
    }
  }

  function normalizeQualityFlags(flags) {
    if (flags == null || flags === "") {
      return { ok: false, flags: [], error: "image_quality_flags required" };
    }
    const list = Array.isArray(flags)
      ? flags
      : String(flags)
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
    if (!list.length) {
      return { ok: false, flags: [], error: "image_quality_flags required" };
    }
    if (list.includes("none") && list.length > 1) {
      return { ok: false, flags: list, error: "`none` cannot combine with other quality flags" };
    }
    const allowed = new Set(C().IMAGE_QUALITY_FLAGS);
    for (const f of list) {
      if (!allowed.has(f)) {
        return { ok: false, flags: list, error: `Unknown quality flag: ${f}` };
      }
    }
    return { ok: true, flags: list };
  }

  function qualityFlagsToString(flags) {
    const n = normalizeQualityFlags(flags);
    return n.ok ? n.flags.join("|") : "";
  }

  function emptyAnnotation(unitId, orderKey, reviewerId) {
    return {
      anonymous_review_unit_id: unitId,
      review_order_key: orderKey == null ? "" : String(orderKey),
      router_target_status: "",
      primary_anatomy_or_fov: "",
      recommended_router_action: "",
      hardware_or_treatment_state: "",
      image_quality_flags: "",
      reviewer_confidence: "",
      free_text_note: "",
      unable_to_review_reason: "",
      reviewer_id: reviewerId,
      timestamp_utc: "",
      completion_status: "not_started",
    };
  }

  function isCompleteAnnotation(ann, expectedReviewerId) {
    const errors = [];
    if (!ann) return { ok: false, errors: ["missing annotation"] };
    if (ann.completion_status !== "complete") {
      errors.push("completion_status must be complete");
    }
    if (expectedReviewerId && ann.reviewer_id !== expectedReviewerId) {
      errors.push("reviewer_id mismatch");
    }
    const enums = {
      router_target_status: C().ROUTER_TARGET_STATUS,
      primary_anatomy_or_fov: [
        ...C().ACTIVE_ANATOMY,
        ...C().SECONDARY_ANATOMY,
      ],
      recommended_router_action: C().RECOMMENDED_ROUTER_ACTION,
      hardware_or_treatment_state: C().HARDWARE_OR_TREATMENT_STATE,
      reviewer_confidence: C().REVIEWER_CONFIDENCE,
    };
    for (const [field, allowed] of Object.entries(enums)) {
      if (!ann[field] || !allowed.includes(ann[field])) {
        errors.push(`Invalid or missing ${field}`);
      }
    }
    const q = normalizeQualityFlags(ann.image_quality_flags);
    if (!q.ok || !q.flags.length) {
      errors.push(q.error || "image_quality_flags required");
    }
    if (!ann.anonymous_review_unit_id) errors.push("missing unit id");
    if (ann.review_order_key === "" || ann.review_order_key == null) {
      errors.push("missing review_order_key");
    }
    if (!isStrictUtcTimestamp(ann.timestamp_utc)) {
      errors.push("timestamp_utc must be ISO-8601 UTC");
    }
    return { ok: errors.length === 0, errors };
  }

  function isStrictUtcTimestamp(value) {
    if (typeof value !== "string" || !value.endsWith("Z")) return false;
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) return false;
    return new Date(parsed).toISOString() === value;
  }

  function canMarkComplete(draft, expectedReviewerId) {
    const candidate = {
      ...draft,
      completion_status: "complete",
      timestamp_utc: draft.timestamp_utc || new Date().toISOString(),
      image_quality_flags: qualityFlagsToString(draft.image_quality_flags),
    };
    return isCompleteAnnotation(candidate, expectedReviewerId);
  }

  function isUnsafeZipPath(name) {
    if (!name || typeof name !== "string") return true;
    if (name.includes("\\")) return true;
    if (name.startsWith("/") || /^[A-Za-z]:/.test(name)) return true;
    const parts = name.split("/");
    if (parts.some((p) => p === ".." || p === "")) {
      // allow trailing slash dirs as empty last part
      if (!(name.endsWith("/") && parts[parts.length - 1] === "")) return true;
      if (parts.slice(0, -1).some((p) => p === ".." || p === "")) return true;
    }
    return false;
  }

  function hasForbiddenName(name) {
    return C().FORBIDDEN_NAME_PATTERNS.some((re) => re.test(name));
  }

  global.XrayReviewValidate = {
    suggestRouterAction,
    normalizeQualityFlags,
    qualityFlagsToString,
    emptyAnnotation,
    isCompleteAnnotation,
    canMarkComplete,
    isStrictUtcTimestamp,
    isUnsafeZipPath,
    hasForbiddenName,
  };
})(typeof window !== "undefined" ? window : globalThis);
