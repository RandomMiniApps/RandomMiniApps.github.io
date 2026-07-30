(function (global) {
  "use strict";

  const C = () => global.XrayReviewConstants;
  const Csv = () => global.XrayReviewCsv;
  const V = () => global.XrayReviewValidate;

  const ANNOTATION_HEADERS = [
    "anonymous_review_unit_id",
    "review_order_key",
    "router_target_status",
    "primary_anatomy_or_fov",
    "recommended_router_action",
    "hardware_or_treatment_state",
    "image_quality_flags",
    "reviewer_confidence",
    "free_text_note",
    "unable_to_review_reason",
    "reviewer_id",
    "timestamp_utc",
    "completion_status",
  ];

  function hex(buf) {
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function sha256Text(text) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text)
    );
    return hex(digest);
  }

  function normalizeRow(ann, reviewerId, orderKeyById) {
    const flags = V().qualityFlagsToString(ann.image_quality_flags);
    return {
      anonymous_review_unit_id: ann.anonymous_review_unit_id,
      review_order_key:
        ann.review_order_key !== "" && ann.review_order_key != null
          ? String(ann.review_order_key)
          : String(orderKeyById.get(ann.anonymous_review_unit_id) ?? ""),
      router_target_status: ann.router_target_status || "",
      primary_anatomy_or_fov: ann.primary_anatomy_or_fov || "",
      recommended_router_action: ann.recommended_router_action || "",
      hardware_or_treatment_state: ann.hardware_or_treatment_state || "",
      image_quality_flags: flags,
      reviewer_confidence: ann.reviewer_confidence || "",
      free_text_note: ann.free_text_note || "",
      unable_to_review_reason: ann.unable_to_review_reason || "",
      reviewer_id: reviewerId,
      timestamp_utc: ann.timestamp_utc || "",
      completion_status: ann.completion_status || "not_started",
    };
  }

  function validateCompletion(rows, manifest, order) {
    const errors = [];
    const expected = manifest.n_review_units || order.length;
    if (rows.length !== expected) {
      errors.push(`Expected ${expected} rows, got ${rows.length}`);
    }
    const seen = new Set();
    for (const row of rows) {
      if (seen.has(row.anonymous_review_unit_id)) {
        errors.push(`Duplicate unit: ${row.anonymous_review_unit_id}`);
      }
      seen.add(row.anonymous_review_unit_id);
      const check = V().isCompleteAnnotation(row, manifest.reviewer_id);
      if (!check.ok) {
        errors.push(
          `${row.anonymous_review_unit_id}: ${check.errors.join("; ")}`
        );
      }
    }
    for (const id of order) {
      if (!seen.has(id)) errors.push(`Missing unit: ${id}`);
    }
    return { ok: errors.length === 0, errors };
  }

  async function buildExportZip({
    annotations,
    manifest,
    order,
    zipSha256,
    mode,
  }) {
    const orderKeyById = new Map(order.map((id, i) => [id, i]));
    const byId = new Map(
      annotations.map((a) => [a.anonymous_review_unit_id, a])
    );
    const rows = order.map((id) =>
      normalizeRow(
        byId.get(id) || V().emptyAnnotation(id, orderKeyById.get(id), manifest.reviewer_id),
        manifest.reviewer_id,
        orderKeyById
      )
    );

    const isFinal = mode === "final";
    let completion = { ok: true, errors: [] };
    if (isFinal) {
      completion = validateCompletion(rows, manifest, order);
      if (!completion.ok) {
        return { ok: false, errors: completion.errors };
      }
    }

    const csvText = Csv().toCsv(ANNOTATION_HEADERS, rows);
    const jsonText = JSON.stringify(rows, null, 2);
    const exportedAt = new Date().toISOString();
    const completionValidation = {
      mode,
      ok: completion.ok,
      errors: completion.errors,
      n_rows: rows.length,
      n_complete: rows.filter((r) => r.completion_status === "complete").length,
      n_expected: manifest.n_review_units || order.length,
      validated_at_utc: exportedAt,
      client_app: C().APP_NAME,
      client_version: C().APP_VERSION,
      note: "Server completion validation remains authoritative.",
    };

    const packageManifestCopy = {
      ...manifest,
      original_package_zip_sha256: zipSha256 || null,
      export_mode: mode,
      exported_at_utc: exportedAt,
      application: {
        name: C().APP_NAME,
        version: C().APP_VERSION,
      },
    };

    const files = {
      "annotations.csv": csvText,
      "annotations.json": jsonText,
      "completion_validation.json": JSON.stringify(completionValidation, null, 2),
      "reviewer_package_manifest.json": JSON.stringify(packageManifestCopy, null, 2),
      "original_package_id.txt": String(manifest.package_id || ""),
      "reviewer_id.txt": String(manifest.reviewer_id || ""),
      "cohort_freeze_hash.txt": String(manifest.cohort_freeze_sha256 || ""),
      "export_meta.json": JSON.stringify(
        {
          export_mode: mode,
          exported_at_utc: exportedAt,
          application_version: C().APP_VERSION,
          package_id: manifest.package_id,
          reviewer_id: manifest.reviewer_id,
          review_arm: manifest.review_arm || null,
          cohort_freeze_sha256: manifest.cohort_freeze_sha256,
          row_count: rows.length,
          original_package_zip_sha256: zipSha256 || null,
        },
        null,
        2
      ),
    };

    const shaManifest = {};
    for (const [name, content] of Object.entries(files)) {
      shaManifest[name] = await sha256Text(content);
    }
    files["SHA256SUMS.json"] = JSON.stringify(shaManifest, null, 2);
    files["integrity_report.json"] = JSON.stringify(
      {
        ok: true,
        export_mode: mode,
        file_sha256: shaManifest,
        exported_at_utc: exportedAt,
      },
      null,
      2
    );

    const zip = new JSZip();
    for (const [name, content] of Object.entries(files)) {
      zip.file(name, content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const filename =
      mode === "final"
        ? `${manifest.package_id}_feedback_final_${manifest.reviewer_id}.zip`
        : `${manifest.package_id}_progress_backup_${manifest.reviewer_id}.zip`;

    return { ok: true, blob, filename, completionValidation, rows };
  }

  async function downloadOrShare(blob, filename) {
    const file = new File([blob], filename, { type: "application/zip" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "X-ray review export",
          text: filename,
        });
        return { method: "share" };
      } catch (err) {
        if (err && err.name === "AbortError") return { method: "share-aborted" };
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { method: "download" };
  }

  global.XrayReviewExport = {
    ANNOTATION_HEADERS,
    buildExportZip,
    downloadOrShare,
    validateCompletion,
    normalizeRow,
  };
})(typeof window !== "undefined" ? window : globalThis);
