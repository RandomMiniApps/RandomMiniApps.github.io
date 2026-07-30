/* Phase 8C portable review — app constants (code only; no clinical data). */
(function (global) {
  "use strict";

  const APP_VERSION = "2.1.0";
  const APP_NAME = "xray-review";
  const PACKAGE_FORMAT_VERSION = "phase8c_portable_review_v1";
  const SCHEMA_VERSION = "phase8c_r_annotation_v1";
  const EXPECTED_COHORT_FREEZE_SHA256 =
    "5712218fc4f18277dbbd6a893b6766804cb71dadd81dd0408404ceebf3bf1127";
  const DB_NAME = "phase8c_xray_review_v1";
  const DB_VERSION = 1;

  /** Whole-ZIP SHA-256 digest for the synthetic software-test fixture. */
  const EXPECTED_ZIP_SHA256 = {
    phase8c_webapp_fixture_v1:
      "b81071488f09f714395b1469d069e2f4c0aba4446c746df107d83dbeab137df5",
  };

  function isAllowedReviewerId(id) {
    if (!id) return false;
    if (id === "reviewer1" || id === "reviewer2") return true;
    return /^doctor0[1-5]$/.test(id);
  }

  const REQUIRED_PACKAGE_FILES = [
    "package_manifest.json",
    "package_format_version.json",
    "reviewer_order.csv",
    "review_units_blinded.csv",
    "review_views_blinded.csv",
    "annotation_schema.json",
  ];

  const FORBIDDEN_NAME_PATTERNS = [
    /admin_private/i,
    /unblinded/i,
    /control_label/i,
    /sampling_plan/i,
    /cohort_unblinded/i,
    /server_import/i,
  ];

  const ACTIVE_ANATOMY = [
    "ankle",
    "elbow",
    "finger",
    "foot",
    "forearm",
    "hand",
    "humerus",
    "knee",
    "lower_leg",
    "pelvis_hip",
    "shoulder",
    "wrist",
  ];

  const SECONDARY_ANATOMY = [
    "spine",
    "chest",
    "skull_face",
    "neck",
    "abdomen",
    "whole_body_or_multiple_regions",
    "other_non_target",
    "unreadable",
    "uncertain",
  ];

  const ROUTER_TARGET_STATUS = [
    "target_active_anatomy",
    "target_but_adjacent_or_ambiguous",
    "non_target_radiograph",
    "non_radiograph_or_unreadable",
    "uncertain",
  ];

  const RECOMMENDED_ROUTER_ACTION = [
    "accept_active_class",
    "abstain_non_target",
    "abstain_ambiguous",
    "human_review_required",
    "unreadable",
  ];

  const HARDWARE_OR_TREATMENT_STATE = [
    "none_visible",
    "cast_or_splint",
    "internal_fixation",
    "prosthesis",
    "postoperative_or_treated",
    "other_hardware",
    "uncertain",
  ];

  const IMAGE_QUALITY_FLAGS = [
    "severe_crop",
    "field_of_view_ambiguity",
    "rotation_or_positioning",
    "underexposed",
    "overexposed",
    "acquisition_artifact",
    "text_or_marker_obscuration",
    "multiple_images_or_montage",
    "possible_duplicate",
    "non_diagnostic_quality",
    "other",
    "none",
  ];

  const REVIEWER_CONFIDENCE = ["high", "medium", "low"];

  const COMPLETION_REQUIRED = [
    "anonymous_review_unit_id",
    "review_order_key",
    "router_target_status",
    "primary_anatomy_or_fov",
    "recommended_router_action",
    "hardware_or_treatment_state",
    "image_quality_flags",
    "reviewer_confidence",
    "reviewer_id",
    "timestamp_utc",
    "completion_status",
  ];

  const LABELS = {
    router_target_status: {
      target_active_anatomy: "Target anatomy",
      target_but_adjacent_or_ambiguous: "Target but adjacent / ambiguous",
      non_target_radiograph: "Non-target radiograph",
      non_radiograph_or_unreadable: "Not a usable radiograph",
      uncertain: "Uncertain",
    },
    primary_anatomy_or_fov: Object.fromEntries(
      [...ACTIVE_ANATOMY, ...SECONDARY_ANATOMY].map((k) => [
        k,
        k.replace(/_/g, " "),
      ])
    ),
    recommended_router_action: {
      accept_active_class: "Accept active class",
      abstain_non_target: "Abstain — non-target",
      abstain_ambiguous: "Abstain — ambiguous",
      human_review_required: "Human review required",
      unreadable: "Unreadable",
    },
    hardware_or_treatment_state: {
      none_visible: "None visible",
      cast_or_splint: "Cast / splint",
      internal_fixation: "Internal fixation",
      prosthesis: "Prosthesis",
      postoperative_or_treated: "Post-op / treated",
      other_hardware: "Other hardware",
      uncertain: "Uncertain",
    },
    image_quality_flags: {
      severe_crop: "Severe crop",
      field_of_view_ambiguity: "FOV ambiguity",
      rotation_or_positioning: "Rotation / positioning",
      underexposed: "Underexposed",
      overexposed: "Overexposed",
      acquisition_artifact: "Acquisition artifact",
      text_or_marker_obscuration: "Text / marker obscuration",
      multiple_images_or_montage: "Multiple images / montage",
      possible_duplicate: "Possible duplicate",
      non_diagnostic_quality: "Non-diagnostic quality",
      other: "Other",
      none: "None",
    },
    reviewer_confidence: {
      high: "High",
      medium: "Medium",
      low: "Low",
    },
  };

  const WIZARD_STEPS = [
    "image",
    "target",
    "anatomy",
    "action",
    "hardware",
    "quality",
    "confidence",
    "confirm",
  ];

  global.XrayReviewConstants = {
    APP_VERSION,
    APP_NAME,
    PACKAGE_FORMAT_VERSION,
    SCHEMA_VERSION,
    EXPECTED_COHORT_FREEZE_SHA256,
    DB_NAME,
    DB_VERSION,
    EXPECTED_ZIP_SHA256,
    isAllowedReviewerId,
    REQUIRED_PACKAGE_FILES,
    FORBIDDEN_NAME_PATTERNS,
    ACTIVE_ANATOMY,
    SECONDARY_ANATOMY,
    ROUTER_TARGET_STATUS,
    RECOMMENDED_ROUTER_ACTION,
    HARDWARE_OR_TREATMENT_STATE,
    IMAGE_QUALITY_FLAGS,
    REVIEWER_CONFIDENCE,
    COMPLETION_REQUIRED,
    LABELS,
    WIZARD_STEPS,
  };
})(typeof window !== "undefined" ? window : globalThis);
