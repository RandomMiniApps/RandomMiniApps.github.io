(function () {
  "use strict";

  const C = window.XrayReviewConstants;
  const Storage = window.XrayReviewStorage;
  const Zip = window.XrayReviewZip;
  const V = window.XrayReviewValidate;
  const Export = window.XrayReviewExport;
  const ProgressImport = window.XrayReviewProgressImport;

  const state = {
    screen: "welcome",
    package: null,
    sessionKey: null,
    annotations: new Map(),
    unitIndex: 0,
    integrityReport: null,
    wizard: null,
    objectUrls: [],
    selectedDoctorPackages: [],
  };

  const app = document.getElementById("app");

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setScreen(name) {
    state.screen = name;
    render();
  }

  function privacyBanner() {
    return `<p class="privacy-banner">After download and unlock, review images and annotations stay on this device and are not uploaded by this application.</p>`;
  }

  function renderWelcome() {
    app.innerHTML = `
      <section class="screen welcome">
        <p class="eyebrow">Phase 8C anatomy review</p>
        <h1>X-ray review</h1>
        <p class="lede">Fast blinded anatomy / router review. Each doctor completes two non-overlapping parts (248 cases each); every case is independently reviewed by two different doctors. Not fracture diagnosis. Not a medical device.</p>
        ${privacyBanner()}
        <ol class="steps-preview">
          <li>Tap <strong>Load my review</strong> and choose doctor01–doctor05</li>
          <li>Enter the password you were given separately</li>
          <li>Complete Part A and Part B — the cases do not overlap</li>
          <li>Export each final feedback ZIP and send both back</li>
        </ol>
        <button type="button" class="btn primary block" id="btnLoadSite">Load my review</button>
        <button type="button" class="btn secondary block" id="btnSelectZip">Or select a local ZIP / .ffenc file</button>
        <button type="button" class="btn ghost block" id="btnResume">Resume saved session</button>
        <p class="fine">Each part downloads ~40–50 MB. Keep the screen on during the first load.</p>
        <nav class="footer-links">
          <a href="docs/doctor-guide.html">Doctor guide</a>
          <a href="docs/privacy.html">Privacy</a>
        </nav>
      </section>
    `;
    document.getElementById("btnLoadSite").onclick = () => setScreen("pickPackage");
    document.getElementById("btnSelectZip").onclick = () =>
      document.getElementById("zipInput").click();
    document.getElementById("btnResume").onclick = resumePicker;
  }

  async function renderPickPackage() {
    let packages = [];
    try {
      const resp = await fetch("packages/manifest.json", { cache: "no-store" });
      if (!resp.ok) throw new Error("Could not load package list");
      const manifest = await resp.json();
      packages = manifest.packages || [];
    } catch (err) {
      app.innerHTML = `
        <section class="screen">
          <h1>Packages unavailable</h1>
          <p class="err-msg">${escapeHtml(err.message || String(err))}</p>
          <p class="hint">If you are testing locally, ensure <code>packages/manifest.json</code> exists.</p>
          <button type="button" class="btn primary block" id="btnBack">Back</button>
        </section>`;
      document.getElementById("btnBack").onclick = () => setScreen("welcome");
      return;
    }

    const byDoctor = new Map();
    for (const pkg of packages) {
      if (!byDoctor.has(pkg.doctor_id)) byDoctor.set(pkg.doctor_id, []);
      byDoctor.get(pkg.doctor_id).push(pkg);
    }
    const doctors = [...byDoctor.entries()].sort(([a], [b]) =>
      a.localeCompare(b)
    );

    app.innerHTML = `
      <section class="screen">
        <h1>Choose your doctor ID</h1>
        ${privacyBanner()}
        <p class="lede">Each ID has two non-overlapping 248-case parts. Use the same password for both.</p>
        <ul class="session-list">
          ${doctors
            .map(
              ([doctorId, doctorPackages]) => `
            <li>
              <button type="button" class="choice-btn block" data-doctor="${escapeHtml(doctorId)}">
                <strong>${escapeHtml(doctorId)}</strong>
                <span>${doctorPackages.length} parts · ${doctorPackages.reduce((n, p) => n + Number(p.n_review_units || 0), 0)} unique cases</span>
              </button>
            </li>`
            )
            .join("")}
        </ul>
        <button type="button" class="btn secondary block" id="btnBack">Back</button>
      </section>`;
    document.getElementById("btnBack").onclick = () => setScreen("welcome");
    app.querySelectorAll("[data-doctor]").forEach((btn) => {
      btn.onclick = () => {
        const doctorId = btn.getAttribute("data-doctor");
        renderDoctorParts(doctorId, byDoctor.get(doctorId) || []);
      };
    });
  }

  function renderDoctorParts(doctorId, packages) {
    state.selectedDoctorPackages = packages;
    app.innerHTML = `
      <section class="screen">
        <h1>${escapeHtml(doctorId)}</h1>
        ${privacyBanner()}
        <p class="lede">Complete both parts. They contain different cases.</p>
        <ul class="session-list">
          ${packages
            .slice()
            .sort((a, b) => String(a.review_arm || "").localeCompare(String(b.review_arm || "")))
            .map(
              (p) => `
              <li>
                <button type="button" class="choice-btn block" data-file="${escapeHtml(p.file)}" data-id="${escapeHtml(p.doctor_id)}" data-package="${escapeHtml(p.package_id)}" data-arm="${escapeHtml(p.review_arm || "")}">
                  <strong>${escapeHtml(p.part_label || `Part ${p.review_arm || ""}`)}</strong>
                  <span>${escapeHtml(String(p.n_review_units))} cases</span>
                </button>
              </li>`
            )
            .join("")}
        </ul>
        <button type="button" class="btn secondary block" id="btnBack">Back</button>
      </section>`;
    document.getElementById("btnBack").onclick = () => setScreen("pickPackage");
    app.querySelectorAll("[data-file]").forEach((btn) => {
      btn.onclick = () =>
        renderPasswordPrompt({
          file: btn.getAttribute("data-file"),
          doctorId: btn.getAttribute("data-id"),
          packageId: btn.getAttribute("data-package"),
          reviewArm: btn.getAttribute("data-arm"),
        });
    });
  }

  function renderPasswordPrompt({ file, doctorId, packageId, reviewArm }) {
    app.innerHTML = `
      <section class="screen">
        <h1>${escapeHtml(doctorId)} · Part ${escapeHtml(reviewArm || "")}</h1>
        ${privacyBanner()}
        <p class="lede">Enter the password shared with you privately (not on this website).</p>
        <label class="field-label" for="pkgPassword">Package password</label>
        <input id="pkgPassword" type="password" autocomplete="current-password" class="password-input" />
        <button type="button" class="btn primary block" id="btnUnlock">Unlock &amp; load</button>
        <button type="button" class="btn secondary block" id="btnBack">Back</button>
        <p class="fine" id="unlockStatus"></p>
      </section>`;
    const input = document.getElementById("pkgPassword");
    input.focus();
    document.getElementById("btnBack").onclick = () => setScreen("pickPackage");
    const go = () => unlockAndLoadSitePackage({ file, doctorId, packageId, reviewArm, password: input.value });
    document.getElementById("btnUnlock").onclick = go;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
  }

  async function unlockAndLoadSitePackage({ file, doctorId, packageId, reviewArm, password }) {
    const status = document.getElementById("unlockStatus");
    if (!password) {
      if (status) status.textContent = "Enter your password.";
      return;
    }
    try {
      if (status) status.textContent = "Downloading encrypted package…";
      renderImportProgress(`Downloading ${doctorId}…`, 0, 1);
      const resp = await fetch(`packages/${file}`);
      if (!resp.ok) throw new Error(`Download failed (${resp.status})`);
      const buf = await resp.arrayBuffer();
      renderImportProgress("Decrypting…", 1, 2);
      const zipFile = await window.XrayReviewCrypto.decryptFfencToZipFile(
        buf,
        password,
        `${packageId}.zip`
      );
      await handleZipFile(zipFile);
    } catch (err) {
      app.innerHTML = `
        <section class="screen">
          <h1>Could not unlock</h1>
          <p class="err-msg">${escapeHtml(err.message || String(err))}</p>
          <button type="button" class="btn primary block" id="btnRetry">Try again</button>
          <button type="button" class="btn secondary block" id="btnBack">Back</button>
        </section>`;
      document.getElementById("btnRetry").onclick = () =>
        renderPasswordPrompt({ file, doctorId, packageId, reviewArm });
      document.getElementById("btnBack").onclick = () =>
        renderDoctorParts(doctorId, state.selectedDoctorPackages);
    }
  }

  async function resumePicker() {
    const sessions = await Storage.listSessions();
    if (!sessions.length) {
      alert("No saved sessions on this device.");
      return;
    }
    app.innerHTML = `
      <section class="screen">
        <h1>Resume session</h1>
        ${privacyBanner()}
        <ul class="session-list">
          ${sessions
            .map(
              (s) => `
            <li>
              <button type="button" class="choice-btn block" data-key="${escapeHtml(s.sessionKey)}">
                <strong>${escapeHtml(s.manifest.reviewer_id)}</strong>
                <span>${escapeHtml(s.manifest.package_id)}</span>
                <span class="meta">${escapeHtml(s.savedAt || "")}</span>
              </button>
            </li>`
            )
            .join("")}
        </ul>
        <button type="button" class="btn secondary block" id="btnBackWelcome">Back</button>
      </section>
    `;
    document.getElementById("btnBackWelcome").onclick = () => setScreen("welcome");
    app.querySelectorAll("[data-key]").forEach((btn) => {
      btn.onclick = () => resumeSession(btn.getAttribute("data-key"));
    });
  }

  async function resumeSession(key) {
    const session = await Storage.getSession(key);
    if (!session) {
      alert("Session not found.");
      return;
    }
    state.sessionKey = key;
    state.package = {
      zip: null,
      file: null,
      zipSha256: session.zipSha256,
      manifest: session.manifest,
      format: session.format,
      isFixture: session.isFixture,
      order: session.order,
      units: session.units,
      views: session.views,
      viewsByUnit: new Map(session.viewsByUnitEntries),
      previewPaths: session.previewPaths,
      fromCache: true,
    };
    const anns = await Storage.getAllAnnotations(key);
    state.annotations = new Map(anns.map((a) => [a.anonymous_review_unit_id, a]));
    state.unitIndex = firstIncompleteIndex();
    setScreen("review");
  }

  function renderImportProgress(label, current, total) {
    const pct = total ? Math.round((current / total) * 100) : 0;
    app.innerHTML = `
      <section class="screen">
        <h1>Checking package</h1>
        ${privacyBanner()}
        <p class="lede" id="importLabel">${escapeHtml(label)}</p>
        <div class="progress-bar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" role="progressbar">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <p class="fine">${pct}%</p>
      </section>
    `;
  }

  async function handleZipFile(file) {
    try {
      let zipFile = file;
      const name = (file && file.name) || "";
      if (/\.ffenc$/i.test(name) || (file.type === "application/octet-stream" && name.includes("ffenc"))) {
        const password = prompt("Enter package password:");
        if (!password) {
          setScreen("welcome");
          return;
        }
        renderImportProgress("Decrypting…", 0, 1);
        const buf = await file.arrayBuffer();
        zipFile = await window.XrayReviewCrypto.decryptFfencToZipFile(
          buf,
          password,
          name
        );
      }
      renderImportProgress("Computing SHA-256…", 0, 1);
      const report = await Zip.loadAndValidatePackage(zipFile, (cur, tot, phase) => {
        const label =
          phase === "hashing"
            ? "Computing SHA-256 (keep screen awake)…"
            : phase === "parsing"
              ? "Reading ZIP…"
              : "Working…";
        renderImportProgress(label, cur, tot || 1);
      });
      state.integrityReport = report;
      if (!report.ok) {
        renderIntegrityFail(report);
        return;
      }
      state.package = report.package;
      renderIntegrityOk(report);
    } catch (err) {
      app.innerHTML = `
        <section class="screen">
          <h1>Import failed</h1>
          <p class="err-msg">${escapeHtml(err.message || String(err))}</p>
          <button type="button" class="btn primary block" id="btnBack">Back</button>
        </section>`;
      document.getElementById("btnBack").onclick = () => setScreen("welcome");
    }
  }

  function renderIntegrityFail(report) {
    app.innerHTML = `
      <section class="screen">
        <h1>Integrity check failed</h1>
        ${privacyBanner()}
        <ul class="err-list">${report.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>
        <button type="button" class="btn primary block" id="btnBack">Back</button>
      </section>`;
    document.getElementById("btnBack").onclick = () => setScreen("welcome");
  }

  function renderIntegrityOk(report) {
    const m = report.package.manifest;
    app.innerHTML = `
      <section class="screen">
        <h1>Package ready</h1>
        ${privacyBanner()}
        <ul class="summary-list">
          <li><span>Package</span><strong>${escapeHtml(m.package_id)}</strong></li>
          <li><span>Reviewer</span><strong>${escapeHtml(m.reviewer_id)}</strong></li>
          ${m.review_arm ? `<li><span>Review part</span><strong>${escapeHtml(m.review_arm)}</strong></li>` : ""}
          <li><span>Units</span><strong>${report.package.order.length}</strong></li>
          <li><span>Views</span><strong>${report.package.views.length}</strong></li>
          <li><span>ZIP SHA-256</span><strong class="mono tiny">${escapeHtml(report.zipSha256.slice(0, 16))}…</strong></li>
          ${m.fixture_or_software_test_only || report.package.isFixture ? `<li><span>Note</span><strong>Software fixture — not clinical evidence</strong></li>` : ""}
        </ul>
        <p class="lede">Confirm you are <strong>${escapeHtml(m.reviewer_id)}</strong> and were given this package.</p>
        <button type="button" class="btn primary block" id="btnConfirmReviewer">Yes — continue</button>
        <button type="button" class="btn secondary block" id="btnRestoreBackup">Restore a progress backup</button>
        <button type="button" class="btn secondary block" id="btnBack">Cancel</button>
      </section>`;
    document.getElementById("btnBack").onclick = () => setScreen("welcome");
    document.getElementById("btnConfirmReviewer").onclick = () => afterConfirm();
    document.getElementById("btnRestoreBackup").onclick = () =>
      document.getElementById("backupInput").click();
  }

  async function afterConfirm() {
    const seenHow = await Storage.getMeta("seen_how_it_works");
    if (!seenHow) {
      setScreen("how");
      return;
    }
    await prepareSessionAndStart();
  }

  function renderHow() {
    app.innerHTML = `
      <section class="screen">
        <h1>How it works</h1>
        ${privacyBanner()}
        <ol class="steps-preview">
          <li>Look at the X-ray (pinch zoom; check all views)</li>
          <li>Choose target status</li>
          <li>Choose anatomy</li>
          <li>Choose router action, hardware, quality, confidence</li>
          <li>Confirm → Save &amp; next</li>
        </ol>
        <p class="fine">Do <strong>not</strong> assess fracture. Do not guess dataset or model output.</p>
        <button type="button" class="btn primary block" id="btnStart">Start review</button>
        <button type="button" class="btn ghost block" id="btnSkipHow">Skip next time</button>
      </section>`;
    document.getElementById("btnStart").onclick = () => prepareSessionAndStart();
    document.getElementById("btnSkipHow").onclick = async () => {
      await Storage.setMeta("seen_how_it_works", true);
      await prepareSessionAndStart();
    };
  }

  async function prepareSessionAndStart(progressBackupFile) {
    const pkg = state.package;
    const key = Storage.sessionKey(pkg.manifest);
    state.sessionKey = key;

    renderImportProgress("Caching previews on device…", 0, pkg.previewPaths.length || 1);

    // If ZIP still in memory, extract to IndexedDB for resume
    if (pkg.zip) {
      const entries = await Zip.extractPreviews(pkg, (cur, tot) => {
        renderImportProgress("Caching previews on device…", cur, tot);
      });
      await Storage.putPreviewsBulk(key, entries, (cur, tot) => {
        renderImportProgress("Saving to IndexedDB…", cur, tot);
      });
      // Drop in-memory zip to free RAM on phones
      pkg.zip = null;
      pkg.fromCache = true;
    }

    const existing = await Storage.getSession(key);
    let annotations = await Storage.getAllAnnotations(key);
    if (!annotations.length) {
      annotations = pkg.order.map((id, i) =>
        V.emptyAnnotation(id, i, pkg.manifest.reviewer_id)
      );
      await Storage.putAnnotationsBulk(key, annotations);
    }
    state.annotations = new Map(
      annotations.map((a) => [a.anonymous_review_unit_id, a])
    );

    await Storage.putSession({
      sessionKey: key,
      manifest: pkg.manifest,
      format: pkg.format,
      order: pkg.order,
      units: pkg.units,
      views: pkg.views,
      viewsByUnitEntries: [...pkg.viewsByUnit.entries()],
      previewPaths: pkg.previewPaths,
      zipSha256: pkg.zipSha256,
      isFixture: pkg.isFixture,
      savedAt: new Date().toISOString(),
      appVersion: C.APP_VERSION,
    });

    if (progressBackupFile) {
      renderImportProgress("Checking progress backup…", 0, 1);
      const imported = await ProgressImport.parseAndValidateProgressBackup(
        progressBackupFile,
        pkg
      );
      if (!imported.ok) {
        app.innerHTML = `
          <section class="screen">
            <h1>Backup could not be restored</h1>
            <ul class="err-list">${imported.errors
              .slice(0, 12)
              .map((error) => `<li>${escapeHtml(error)}</li>`)
              .join("")}</ul>
            <button type="button" class="btn primary block" id="btnContinueWithout">Continue without backup</button>
            <button type="button" class="btn secondary block" id="btnTryBackup">Choose another backup</button>
          </section>`;
        document.getElementById("btnContinueWithout").onclick = () => {
          state.unitIndex = firstIncompleteIndex();
          setScreen("review");
        };
        document.getElementById("btnTryBackup").onclick = () =>
          document.getElementById("backupInput").click();
        return;
      }
      const applyImportedBackup = async () => {
        await Storage.putAnnotationsBulk(key, imported.rows);
        state.annotations = new Map(
          imported.rows.map((row) => [row.anonymous_review_unit_id, row])
        );
        state.integrityReport = {
          ...(state.integrityReport || {}),
          progressBackup: {
            restored: true,
            nComplete: imported.nComplete,
            exportedAt: imported.exportedAt,
          },
        };
        state.unitIndex = firstIncompleteIndex();
        setScreen("review");
      };
      const currentStarted = annotations.filter(
        (row) => row.completion_status === "draft" || row.completion_status === "complete"
      );
      if (currentStarted.length) {
        const currentComplete = currentStarted.filter(
          (row) => row.completion_status === "complete"
        ).length;
        app.innerHTML = `
          <section class="screen">
            <h1>Replace current progress?</h1>
            <p class="lede">This device already has saved work for the same part.</p>
            <ul class="summary-list">
              <li><span>Current device</span><strong>${currentComplete} complete</strong></li>
              <li><span>Selected backup</span><strong>${imported.nComplete} complete</strong></li>
              <li><span>Backup exported</span><strong>${escapeHtml(imported.exportedAt || "unknown")}</strong></li>
            </ul>
            <button type="button" class="btn primary block" id="btnApplyBackup">Replace with selected backup</button>
            <button type="button" class="btn secondary block" id="btnKeepCurrent">Keep current device progress</button>
          </section>`;
        document.getElementById("btnApplyBackup").onclick = applyImportedBackup;
        document.getElementById("btnKeepCurrent").onclick = () => {
          state.unitIndex = firstIncompleteIndex();
          setScreen("review");
        };
        return;
      }
      await applyImportedBackup();
      return;
    }

    state.unitIndex = firstIncompleteIndex();
    setScreen("review");
  }

  function firstIncompleteIndex() {
    const order = state.package.order;
    for (let i = 0; i < order.length; i++) {
      const a = state.annotations.get(order[i]);
      if (!a || a.completion_status !== "complete") return i;
    }
    return 0;
  }

  function countComplete() {
    let n = 0;
    for (const id of state.package.order) {
      const a = state.annotations.get(id);
      if (a && a.completion_status === "complete") n += 1;
    }
    return n;
  }

  function currentUnit() {
    const pkg = state.package;
    const id = pkg.order[state.unitIndex];
    const views = (pkg.viewsByUnit.get(id) || []).slice().sort((a, b) => {
      return Number(a.view_order || 0) - Number(b.view_order || 0);
    });
    return {
      id,
      orderKey: state.unitIndex,
      reviewerId: pkg.manifest.reviewer_id,
      views,
      progressLabel: `${state.unitIndex + 1} / ${pkg.order.length} · ${countComplete()} complete`,
    };
  }

  async function loadPreviewBlob(path) {
    return Zip.getPreviewBlob(
      state.package,
      state.sessionKey,
      path,
      Storage
    );
  }

  async function saveAnnotation(ann) {
    state.annotations.set(ann.anonymous_review_unit_id, ann);
    await Storage.putAnnotation(state.sessionKey, ann);
  }

  function renderReview() {
    app.innerHTML = `<section class="screen review-screen" id="wizardMount"></section>`;
    if (state.wizard) state.wizard.destroy();
    state.wizard = window.XrayReviewWizard.createWizard({
      mount: document.getElementById("wizardMount"),
      getUnit: currentUnit,
      getAnnotation: (id) => state.annotations.get(id),
      saveAnnotation,
      loadPreviewBlob,
      onRequestNextIncomplete: () => {
        const order = state.package.order;
        let next = -1;
        for (let i = 1; i <= order.length; i++) {
          const idx = (state.unitIndex + i) % order.length;
          const a = state.annotations.get(order[idx]);
          if (!a || a.completion_status !== "complete") {
            next = idx;
            break;
          }
        }
        if (next < 0 || countComplete() === order.length) {
          setScreen("export");
          return;
        }
        state.unitIndex = next;
        state.wizard.openUnit();
      },
      onNavigateUnit: (delta) => {
        const n = state.package.order.length;
        state.unitIndex = (state.unitIndex + delta + n) % n;
        state.wizard.openUnit();
      },
      onExitToMenu: () => setScreen("menu"),
    });
    state.wizard.openUnit();
  }

  function renderMenu() {
    const n = state.package.order.length;
    const done = countComplete();
    app.innerHTML = `
      <section class="screen">
        <h1>Menu</h1>
        ${privacyBanner()}
        <p class="lede">${done} / ${n} complete</p>
        <button type="button" class="btn primary block" id="btnContinue">Continue review</button>
        <button type="button" class="btn secondary block" id="btnJump">Jump to next incomplete</button>
        <button type="button" class="btn secondary block" id="btnAnyCase">Review or correct any case</button>
        <button type="button" class="btn secondary block" id="btnBackup">Export progress backup</button>
        <button type="button" class="btn secondary block" id="btnRestore">Restore progress backup</button>
        <button type="button" class="btn secondary block" id="btnFinal" ${done === n ? "" : "disabled"}>Export final feedback</button>
        <button type="button" class="btn ghost block" id="btnClear">Clear local data…</button>
        <button type="button" class="btn ghost block" id="btnWelcome">Back to start</button>
      </section>`;
    document.getElementById("btnContinue").onclick = () => setScreen("review");
    document.getElementById("btnJump").onclick = () => {
      state.unitIndex = firstIncompleteIndex();
      setScreen("review");
    };
    document.getElementById("btnAnyCase").onclick = () => setScreen("caseList");
    document.getElementById("btnBackup").onclick = () => doExport("progress");
    document.getElementById("btnRestore").onclick = () =>
      document.getElementById("backupInput").click();
    document.getElementById("btnFinal").onclick = () => doExport("final");
    document.getElementById("btnClear").onclick = () => setScreen("clearConfirm");
    document.getElementById("btnWelcome").onclick = () => setScreen("welcome");
  }

  function renderClearConfirm() {
    app.innerHTML = `
      <section class="screen">
        <h1>Clear this part?</h1>
        <p class="err-msg">This permanently removes this part's cached images and review progress from this browser.</p>
        <label class="field-label" for="clearPhrase">Type CLEAR to confirm</label>
        <input id="clearPhrase" type="text" autocomplete="off" />
        <button type="button" class="btn danger block" id="btnConfirmClear">Clear local data</button>
        <button type="button" class="btn secondary block" id="btnCancelClear">Cancel</button>
      </section>`;
    document.getElementById("btnCancelClear").onclick = () => setScreen("menu");
    document.getElementById("btnConfirmClear").onclick = async () => {
      if (document.getElementById("clearPhrase").value !== "CLEAR") {
        alert("Type CLEAR exactly to confirm.");
        return;
      }
      await Storage.clearSession(state.sessionKey);
      state.package = null;
      state.sessionKey = null;
      state.annotations = new Map();
      setScreen("welcome");
    };
  }

  function renderCaseList() {
    const rows = state.package.order.map((id, index) => {
      const annotation = state.annotations.get(id);
      const status = annotation ? annotation.completion_status : "not_started";
      return { id, index, status };
    });
    app.innerHTML = `
      <section class="screen">
        <h1>Review any case</h1>
        <p class="lede">Open a completed case to check or correct it before final export.</p>
        <div class="case-list" role="list">
          ${rows
            .map(
              (row) => `
              <button type="button" class="case-row" role="listitem" data-case-index="${row.index}">
                <strong>Case ${row.index + 1}</strong>
                <span class="status-${escapeHtml(row.status)}">${escapeHtml(row.status.replace(/_/g, " "))}</span>
              </button>`
            )
            .join("")}
        </div>
        <button type="button" class="btn secondary block" id="btnBackMenu">Back to menu</button>
      </section>`;
    document.getElementById("btnBackMenu").onclick = () => setScreen("menu");
    app.querySelectorAll("[data-case-index]").forEach((button) => {
      button.onclick = () => {
        state.unitIndex = Number(button.getAttribute("data-case-index"));
        setScreen("review");
      };
    });
  }

  function renderExport() {
    const n = state.package.order.length;
    const done = countComplete();
    app.innerHTML = `
      <section class="screen">
        <h1>Export</h1>
        ${privacyBanner()}
        <p class="lede">${done} / ${n} complete</p>
        ${
          done === n
            ? `<p class="ok-msg">All units complete. You can export the final feedback ZIP.</p>`
            : `<p class="hint">Final export unlocks at ${n}/${n}. You can still save a progress backup.</p>`
        }
        <button type="button" class="btn secondary block" id="btnBackup">Export progress backup</button>
        <button type="button" class="btn primary block" id="btnFinal" ${done === n ? "" : "disabled"}>Export final feedback</button>
        ${
          done === n && state.selectedDoctorPackages.length > 1
            ? `<button type="button" class="btn secondary block" id="btnOtherPart">Choose my other part</button>`
            : ""
        }
        <button type="button" class="btn ghost block" id="btnMenu">Menu</button>
        <button type="button" class="btn ghost block" id="btnContinue">Keep reviewing</button>
      </section>`;
    document.getElementById("btnBackup").onclick = () => doExport("progress");
    document.getElementById("btnFinal").onclick = () => doExport("final");
    const otherPart = document.getElementById("btnOtherPart");
    if (otherPart) {
      otherPart.onclick = () => {
        const doctorId = state.package.manifest.reviewer_id;
        state.package = null;
        state.sessionKey = null;
        state.annotations = new Map();
        renderDoctorParts(doctorId, state.selectedDoctorPackages);
      };
    }
    document.getElementById("btnMenu").onclick = () => setScreen("menu");
    document.getElementById("btnContinue").onclick = () => {
      state.unitIndex = firstIncompleteIndex();
      setScreen("review");
    };
  }

  async function doExport(mode) {
    const pkg = state.package;
    const annotations = [...state.annotations.values()];
    const result = await Export.buildExportZip({
      annotations,
      manifest: pkg.manifest,
      order: pkg.order,
      zipSha256: pkg.zipSha256,
      mode,
    });
    if (!result.ok) {
      alert("Export blocked:\n" + result.errors.slice(0, 8).join("\n"));
      return;
    }
    const shared = await Export.downloadOrShare(result.blob, result.filename);
    alert(
      shared.method === "share"
        ? "Shared. Send only via your approved secure channel."
        : "Download started. On iPhone, check Files / Downloads, then transfer via your approved channel."
    );
  }

  function render() {
    if (state.screen === "welcome") return renderWelcome();
    if (state.screen === "pickPackage") return renderPickPackage();
    if (state.screen === "how") return renderHow();
    if (state.screen === "review") return renderReview();
    if (state.screen === "menu") return renderMenu();
    if (state.screen === "caseList") return renderCaseList();
    if (state.screen === "clearConfirm") return renderClearConfirm();
    if (state.screen === "export") return renderExport();
    renderWelcome();
  }

  function init() {
    const input = document.getElementById("zipInput");
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      input.value = "";
      if (file) handleZipFile(file);
    });
    const backupInput = document.getElementById("backupInput");
    backupInput.addEventListener("change", () => {
      const file = backupInput.files && backupInput.files[0];
      backupInput.value = "";
      if (!file) return;
      if (!state.package) {
        alert("Load the matching doctor package before restoring a backup.");
        return;
      }
      prepareSessionAndStart(file);
    });
    if (location.hash === "#how") {
      // show static how from welcome link without package
    }
    setScreen("welcome");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
