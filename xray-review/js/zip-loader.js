(function (global) {
  "use strict";

  const C = () => global.XrayReviewConstants;
  const V = () => global.XrayReviewValidate;
  const Csv = () => global.XrayReviewCsv;

  function hex(buf) {
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function sha256File(file, onProgress) {
    const total = file.size || 1;
    if (onProgress) onProgress(0, total, "hashing");
    // Yield so the UI can paint before a large ArrayBuffer read.
    await new Promise((r) => setTimeout(r, 0));
    const buf = await file.arrayBuffer();
    if (onProgress) onProgress(Math.floor(total * 0.7), total, "hashing");
    await new Promise((r) => setTimeout(r, 0));
    const digest = await crypto.subtle.digest("SHA-256", buf);
    if (onProgress) onProgress(total, total, "hashing");
    return hex(digest);
  }

  function rawCentralDirectoryEntries(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const decoder = new TextDecoder("utf-8");
    const minEocd = Math.max(0, bytes.length - 65557);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= minEocd; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error("ZIP end-of-central-directory record not found");
    const count = view.getUint16(eocd + 10, true);
    let offset = view.getUint32(eocd + 16, true);
    const entries = [];
    for (let i = 0; i < count; i++) {
      if (view.getUint32(offset, true) !== 0x02014b50) {
        throw new Error("Malformed ZIP central directory");
      }
      const madeBy = view.getUint16(offset + 4, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const externalAttrs = view.getUint32(offset + 38, true);
      const nameStart = offset + 46;
      const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
      const unixMode = madeBy >> 8 === 3 ? (externalAttrs >>> 16) & 0xffff : 0;
      entries.push({
        name,
        isSymlink: (unixMode & 0xf000) === 0xa000,
      });
      offset = nameStart + nameLength + extraLength + commentLength;
    }
    return entries;
  }

  async function readText(zip, path) {
    const entry = zip.file(path);
    if (!entry) throw new Error(`Missing file: ${path}`);
    return entry.async("string");
  }

  function validateZipMembers(entries) {
    const errors = [];
    const seen = new Set();
    for (const entry of entries) {
      const name = typeof entry === "string" ? entry : entry.name;
      if (seen.has(name)) errors.push(`Duplicate ZIP member: ${name}`);
      seen.add(name);
      if (V().isUnsafeZipPath(name)) errors.push(`Unsafe path: ${name}`);
      if (V().hasForbiddenName(name)) errors.push(`Forbidden path: ${name}`);
      if (entry.isSymlink) errors.push(`Unsupported symlink entry: ${name}`);
    }
    return errors;
  }

  async function loadAndValidatePackage(file, onProgress) {
    const report = { steps: [], ok: false, errors: [] };

    if (onProgress) onProgress(0, 1, "hashing");
    const total = file.size || 1;
    const fileBuffer = await file.arrayBuffer();
    if (onProgress) onProgress(Math.floor(total * 0.7), total, "hashing");
    const zipSha256 = hex(await crypto.subtle.digest("SHA-256", fileBuffer));
    if (onProgress) onProgress(total, total, "hashing");
    report.zipSha256 = zipSha256;
    report.steps.push({ name: "zip_sha256", ok: true, value: zipSha256 });

    if (onProgress) onProgress(0, 1, "parsing");
    const rawEntries = rawCentralDirectoryEntries(fileBuffer);
    const memberErrors = validateZipMembers(rawEntries);
    if (memberErrors.length) {
      report.errors.push(...memberErrors);
      return report;
    }
    const zip = await JSZip.loadAsync(fileBuffer, { checkCRC32: true });
    report.steps.push({ name: "zip_members", ok: true, count: rawEntries.length });

    for (const req of C().REQUIRED_PACKAGE_FILES) {
      if (!zip.file(req)) {
        report.errors.push(`Missing required file: ${req}`);
      }
    }
    if (report.errors.length) return report;

    const format = JSON.parse(await readText(zip, "package_format_version.json"));
    const manifest = JSON.parse(await readText(zip, "package_manifest.json"));
    const schema = JSON.parse(await readText(zip, "annotation_schema.json"));

    const isFixture = !!(
      manifest.fixture_or_software_test_only ||
      manifest.package_id === "phase8c_webapp_fixture_v1"
    );

    if (format.package_format_version !== C().PACKAGE_FORMAT_VERSION && !isFixture) {
      // Fixture may omit full format file fields; still require matching if present
      if (format.package_format_version && format.package_format_version !== C().PACKAGE_FORMAT_VERSION) {
        report.errors.push(
          `Unsupported package_format_version: ${format.package_format_version}`
        );
      }
    }
    if (!isFixture && format.package_format_version !== C().PACKAGE_FORMAT_VERSION) {
      report.errors.push(
        `Expected package_format_version ${C().PACKAGE_FORMAT_VERSION}`
      );
    }

    if (!manifest.reviewer_id || !C().isAllowedReviewerId(manifest.reviewer_id)) {
      report.errors.push(
        "package_manifest.reviewer_id must be doctor01–doctor05 (or legacy reviewer1/reviewer2)"
      );
    }
    if (!manifest.package_id) report.errors.push("Missing package_id");
    if (
      !isFixture &&
      manifest.cohort_freeze_sha256 !== C().EXPECTED_COHORT_FREEZE_SHA256
    ) {
      report.errors.push("Cohort freeze hash does not match the approved Phase 8C cohort");
    }
    if (
      !isFixture &&
      manifest.package_format_version !== C().PACKAGE_FORMAT_VERSION
    ) {
      report.errors.push("Manifest package-format version mismatch");
    }
    if (
      !isFixture &&
      format.cohort_freeze_sha256 !== manifest.cohort_freeze_sha256
    ) {
      report.errors.push("Format/manifest cohort freeze mismatch");
    }
    if (
      !isFixture &&
      manifest.review_arm &&
      !["A", "B"].includes(manifest.review_arm)
    ) {
      report.errors.push("Invalid review_arm");
    }
    if (
      schema.schema_version &&
      schema.schema_version !== C().SCHEMA_VERSION
    ) {
      report.errors.push(`Unsupported annotation schema: ${schema.schema_version}`);
    }

    const digestRecord =
      (global.XrayReviewExpectedDigests || {})[manifest.package_id];
    const expectedHash =
      (digestRecord && (digestRecord.sha256 || digestRecord)) ||
      C().EXPECTED_ZIP_SHA256[manifest.package_id] ||
      (isFixture ? C().EXPECTED_ZIP_SHA256.phase8c_webapp_fixture_v1 : null);

    if (expectedHash) {
      const hashOk = zipSha256 === expectedHash;
      report.steps.push({
        name: "known_zip_hash",
        ok: hashOk,
        expected: expectedHash,
        actual: zipSha256,
      });
      if (!hashOk) {
        report.errors.push(
          "ZIP SHA-256 does not match the known integrity digest for this package_id"
        );
      }
    } else if (!isFixture) {
      report.errors.push(
        `Unknown package_id (no known integrity digest): ${manifest.package_id}`
      );
    }

    // Enrich incomplete fixture manifests for local software tests
    if (isFixture) {
      manifest.cohort_freeze_sha256 =
        manifest.cohort_freeze_sha256 || "fixture_no_freeze";
      manifest.n_review_units = manifest.n_review_units || 3;
      manifest.package_format_version =
        manifest.package_format_version || C().PACKAGE_FORMAT_VERSION;
      if (!format.package_format_version) {
        format.package_format_version = C().PACKAGE_FORMAT_VERSION;
      }
    }

    const orderCsv = Csv().parseCsv(await readText(zip, "reviewer_order.csv"));
    const unitsCsv = Csv().parseCsv(await readText(zip, "review_units_blinded.csv"));
    const viewsCsv = Csv().parseCsv(await readText(zip, "review_views_blinded.csv"));

    const forbiddenCols = [
      "source",
      "dataset",
      "fracture",
      "partition",
      "stratum",
      "prediction",
      "prob",
      "control",
      "unblinded",
    ];
    for (const col of [
      ...unitsCsv.headers,
      ...viewsCsv.headers,
      ...orderCsv.headers,
    ]) {
      const lower = col.toLowerCase();
      if (forbiddenCols.some((f) => lower.includes(f))) {
        report.errors.push(`Forbidden column present: ${col}`);
      }
    }

    const orderIds = orderCsv.records.map(
      (r) => r.anonymous_review_unit_id || r.review_unit_id
    );
    if (orderIds.some((id) => !id)) {
      report.errors.push("reviewer_order.csv missing anonymous_review_unit_id");
    }
    const unitIds = new Set(
      unitsCsv.records.map((r) => r.anonymous_review_unit_id)
    );
    const orderIdSet = new Set(orderIds);
    if (orderIds.length !== orderIdSet.size) {
      report.errors.push("reviewer_order.csv contains duplicate review-unit IDs");
    }
    if (unitsCsv.records.length !== unitIds.size) {
      report.errors.push("review_units_blinded.csv contains duplicate review-unit IDs");
    }
    if (
      orderIdSet.size !== unitIds.size ||
      [...orderIdSet].some((id) => !unitIds.has(id))
    ) {
      report.errors.push("Reviewer order and review-unit CSV contain different unit sets");
    }
    for (const id of orderIds) {
      if (id && !unitIds.has(id)) {
        report.errors.push(`Order unit missing from units CSV: ${id}`);
      }
    }

    const viewsByUnit = new Map();
    for (const view of viewsCsv.records) {
      const uid = view.anonymous_review_unit_id;
      if (!unitIds.has(uid)) {
        report.errors.push(`View references unknown unit: ${uid}`);
      }
      if (!viewsByUnit.has(uid)) viewsByUnit.set(uid, []);
      viewsByUnit.get(uid).push(view);
      const path = view.preview_path;
      if (!path || !zip.file(path)) {
        report.errors.push(`Missing preview: ${path || "(empty)"}`);
      }
    }
    for (const id of orderIds) {
      if (id && (!viewsByUnit.has(id) || !viewsByUnit.get(id).length)) {
        report.errors.push(`No views for unit: ${id}`);
      }
    }

    if (report.errors.length) return report;

    const expectedN = manifest.n_review_units || orderIds.length;
    if (!isFixture && orderIds.length !== expectedN) {
      report.errors.push(
        `Expected ${expectedN} review units, found ${orderIds.length}`
      );
    }
    if (
      !isFixture &&
      format.n_expected_review_units &&
      Number(format.n_expected_review_units) !== orderIds.length
    ) {
      report.errors.push("Format expected-unit count does not match reviewer order");
    }
    if (
      !isFixture &&
      manifest.n_views &&
      Number(manifest.n_views) !== viewsCsv.records.length
    ) {
      report.errors.push("Manifest view count does not match review views");
    }
    if (report.errors.length) return report;

    report.steps.push({
      name: "structure",
      ok: true,
      n_units: orderIds.length,
      n_views: viewsCsv.records.length,
      reviewer_id: manifest.reviewer_id,
      package_id: manifest.package_id,
      is_fixture: isFixture,
    });

    // Extract preview blobs lazily later; optionally cache all with progress
    const previewPaths = viewsCsv.records.map((v) => v.preview_path);
    const uniquePaths = [...new Set(previewPaths)];

    report.ok = true;
    report.package = {
      zip,
      file,
      zipSha256,
      format,
      manifest,
      schema,
      isFixture,
      order: orderIds,
      units: unitsCsv.records,
      views: viewsCsv.records,
      viewsByUnit,
      previewPaths: uniquePaths,
    };
    return report;
  }

  async function extractPreviews(pkg, onProgress) {
    const out = [];
    const paths = pkg.previewPaths;
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const entry = pkg.zip.file(path);
      const blob = await entry.async("blob");
      out.push({ previewPath: path, blob });
      if (onProgress) onProgress(i + 1, paths.length, "extracting");
      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    return out;
  }

  async function getPreviewBlob(pkg, sessionKey, path, storage) {
    if (storage) {
      const cached = await storage.getPreview(sessionKey, path);
      if (cached) return cached;
    }
    const entry = pkg.zip && pkg.zip.file(path);
    if (!entry) throw new Error(`Preview not found: ${path}`);
    const blob = await entry.async("blob");
    if (storage) await storage.putPreview(sessionKey, path, blob);
    return blob;
  }

  global.XrayReviewZip = {
    sha256File,
    rawCentralDirectoryEntries,
    validateZipMembers,
    loadAndValidatePackage,
    extractPreviews,
    getPreviewBlob,
  };
})(typeof window !== "undefined" ? window : globalThis);
