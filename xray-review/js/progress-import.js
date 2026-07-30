(function (global) {
  "use strict";

  const V = () => global.XrayReviewValidate;

  function validateDraftRow(row, reviewerId) {
    const errors = [];
    if (!["not_started", "draft", "complete"].includes(row.completion_status)) {
      errors.push("invalid completion_status");
    }
    if (row.reviewer_id !== reviewerId) errors.push("reviewer_id mismatch");
    if (row.completion_status === "complete") {
      return V().isCompleteAnnotation(row, reviewerId).errors;
    }
    const enumFields = {
      router_target_status: global.XrayReviewConstants.ROUTER_TARGET_STATUS,
      primary_anatomy_or_fov: [
        ...global.XrayReviewConstants.ACTIVE_ANATOMY,
        ...global.XrayReviewConstants.SECONDARY_ANATOMY,
      ],
      recommended_router_action:
        global.XrayReviewConstants.RECOMMENDED_ROUTER_ACTION,
      hardware_or_treatment_state:
        global.XrayReviewConstants.HARDWARE_OR_TREATMENT_STATE,
      reviewer_confidence: global.XrayReviewConstants.REVIEWER_CONFIDENCE,
    };
    for (const [field, allowed] of Object.entries(enumFields)) {
      if (row[field] && !allowed.includes(row[field])) {
        errors.push(`invalid ${field}`);
      }
    }
    if (row.image_quality_flags) {
      const quality = V().normalizeQualityFlags(row.image_quality_flags);
      if (!quality.ok) errors.push(quality.error);
    }
    if (row.timestamp_utc && !V().isStrictUtcTimestamp(row.timestamp_utc)) {
      errors.push("invalid timestamp_utc");
    }
    return errors;
  }

  async function parseAndValidateProgressBackup(file, pkg) {
    const errors = [];
    const buffer = await file.arrayBuffer();
    let rawEntries;
    try {
      rawEntries = global.XrayReviewZip.rawCentralDirectoryEntries(buffer);
      errors.push(...global.XrayReviewZip.validateZipMembers(rawEntries));
    } catch (err) {
      return { ok: false, errors: [err.message || String(err)] };
    }
    for (const entry of rawEntries) {
      if (
        /\.(png|jpe?g|dcm|gif|webp)$/i.test(entry.name) ||
        entry.name.startsWith("previews/")
      ) {
        errors.push(`Progress backup must not contain X-ray images: ${entry.name}`);
      }
    }

    let zip;
    try {
      zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
    } catch (err) {
      return { ok: false, errors: [err.message || String(err)] };
    }
    const required = [
      "annotations.json",
      "reviewer_package_manifest.json",
      "completion_validation.json",
      "export_meta.json",
    ];
    for (const name of required) {
      if (!zip.file(name)) errors.push(`Missing progress-backup file: ${name}`);
    }
    if (errors.length) return { ok: false, errors };

    let rows;
    let manifest;
    let meta;
    try {
      rows = JSON.parse(await zip.file("annotations.json").async("string"));
      manifest = JSON.parse(
        await zip.file("reviewer_package_manifest.json").async("string")
      );
      meta = JSON.parse(await zip.file("export_meta.json").async("string"));
    } catch (err) {
      return { ok: false, errors: [`Invalid progress-backup JSON: ${err.message}`] };
    }

    const expectedManifest = pkg.manifest;
    if (manifest.package_id !== expectedManifest.package_id) {
      errors.push("Progress backup belongs to a different package");
    }
    if (manifest.reviewer_id !== expectedManifest.reviewer_id) {
      errors.push("Progress backup belongs to a different doctor");
    }
    if (manifest.cohort_freeze_sha256 !== expectedManifest.cohort_freeze_sha256) {
      errors.push("Progress backup cohort version does not match");
    }
    if ((manifest.review_arm || "") !== (expectedManifest.review_arm || "")) {
      errors.push("Progress backup review arm does not match");
    }
    if (
      meta.original_package_zip_sha256 &&
      pkg.zipSha256 &&
      meta.original_package_zip_sha256 !== pkg.zipSha256
    ) {
      errors.push("Progress backup was created from a different package build");
    }
    if (!Array.isArray(rows)) {
      errors.push("annotations.json must contain an array");
      return { ok: false, errors };
    }

    const expectedIds = new Set(pkg.order);
    const seen = new Set();
    if (rows.length !== pkg.order.length) {
      errors.push(`Expected ${pkg.order.length} annotation rows, found ${rows.length}`);
    }
    for (const row of rows) {
      const id = row.anonymous_review_unit_id;
      if (!expectedIds.has(id)) errors.push(`Unknown review-unit ID: ${id}`);
      if (seen.has(id)) errors.push(`Duplicate review-unit ID: ${id}`);
      seen.add(id);
      const rowErrors = validateDraftRow(row, expectedManifest.reviewer_id);
      if (rowErrors.length) errors.push(`${id || "(missing)"}: ${rowErrors.join("; ")}`);
    }
    for (const id of pkg.order) {
      if (!seen.has(id)) errors.push(`Missing review-unit ID: ${id}`);
    }

    return {
      ok: errors.length === 0,
      errors,
      rows,
      nComplete: rows.filter((row) => row.completion_status === "complete").length,
      exportedAt: meta.exported_at_utc || null,
    };
  }

  global.XrayReviewProgressImport = {
    parseAndValidateProgressBackup,
    validateDraftRow,
  };
})(typeof window !== "undefined" ? window : globalThis);
