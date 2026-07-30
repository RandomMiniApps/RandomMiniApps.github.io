(function (global) {
  "use strict";

  const C = () => global.XrayReviewConstants;
  const V = () => global.XrayReviewValidate;
  const L = () => C().LABELS;

  function label(group, value) {
    return (L()[group] && L()[group][value]) || value.replace(/_/g, " ");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function choiceButtons(field, values, selected, opts = {}) {
    const multi = !!opts.multi;
    return values
      .map((v) => {
        const isSelected = multi
          ? (selected || []).includes(v)
          : selected === v;
        return `<button type="button" class="choice-btn${isSelected ? " selected" : ""}${opts.suggested === v ? " suggested" : ""}" data-field="${field}" data-value="${v}" ${multi ? 'data-multi="1"' : ""}>${label(field, v)}</button>`;
      })
      .join("");
  }

  function createWizard(opts) {
    const {
      mount,
      getUnit,
      getAnnotation,
      saveAnnotation,
      loadPreviewBlob,
      onRequestNextIncomplete,
      onNavigateUnit,
      onExitToMenu,
    } = opts;

    let stepIndex = 0;
    let viewIndex = 0;
    let viewer = null;
    let showSecondaryAnatomy = false;
    let draft = null;

    function steps() {
      return C().WIZARD_STEPS;
    }

    function currentStep() {
      return steps()[stepIndex];
    }

    function syncDraftFromStore() {
      const unit = getUnit();
      const existing = getAnnotation(unit.id) || {};
      draft = {
        ...V().emptyAnnotation(unit.id, unit.orderKey, unit.reviewerId),
        ...existing,
        anonymous_review_unit_id: unit.id,
        review_order_key: String(unit.orderKey),
        reviewer_id: unit.reviewerId,
      };
      if (typeof draft.image_quality_flags === "string") {
        draft._quality = draft.image_quality_flags
          ? draft.image_quality_flags.split("|").filter(Boolean)
          : [];
      } else if (Array.isArray(draft.image_quality_flags)) {
        draft._quality = [...draft.image_quality_flags];
      } else {
        draft._quality = [];
      }
    }

    async function persist(status) {
      const unit = getUnit();
      const payload = {
        ...draft,
        image_quality_flags: draft._quality.join("|"),
        completion_status: status,
        timestamp_utc:
          status === "complete"
            ? new Date().toISOString()
            : draft.timestamp_utc || new Date().toISOString(),
        reviewer_id: unit.reviewerId,
        review_order_key: String(unit.orderKey),
      };
      delete payload._quality;
      draft = { ...payload, _quality: draft._quality };
      await saveAnnotation(payload);
      return payload;
    }

    async function autoSaveDraft() {
      if (!draft) return;
      if (draft.completion_status === "complete") {
        // keep complete until fields change enough — still save as draft if incomplete fields
        const check = V().canMarkComplete(
          { ...draft, image_quality_flags: draft._quality },
          getUnit().reviewerId
        );
        if (check.ok) {
          await persist("complete");
          return;
        }
      }
      await persist("draft");
    }

    function setField(field, value) {
      draft[field] = value;
      if (field === "router_target_status") {
        const suggestion = V().suggestRouterAction(value);
        if (suggestion && !draft.recommended_router_action) {
          draft.recommended_router_action = suggestion;
        }
      }
    }

    function toggleQuality(value) {
      if (value === "none") {
        draft._quality = draft._quality.includes("none") ? [] : ["none"];
        return;
      }
      draft._quality = draft._quality.filter((f) => f !== "none");
      if (draft._quality.includes(value)) {
        draft._quality = draft._quality.filter((f) => f !== value);
      } else {
        draft._quality.push(value);
      }
    }

    function renderChrome() {
      const unit = getUnit();
      const step = currentStep();
      const progress = unit.progressLabel;
      return `
        <header class="wiz-top">
          <div class="wiz-progress" aria-live="polite">${progress}</div>
          <div class="wiz-step-label">Step ${stepIndex + 1}/${steps().length}: ${step}</div>
          <button type="button" class="linkish" data-act="menu">Menu</button>
          <div class="case-nav" aria-label="Case navigation">
            <button type="button" class="linkish" data-act="previous-unit">‹ Previous case</button>
            <button type="button" class="linkish" data-act="next-unit">Next case ›</button>
          </div>
        </header>
        <main class="wiz-main" id="wizMain"></main>
        <footer class="wiz-footer">
          <button type="button" class="btn secondary" data-act="back" ${stepIndex === 0 ? "disabled" : ""}>Back</button>
          <button type="button" class="btn ghost" data-act="draft">Save draft</button>
          <button type="button" class="btn primary" data-act="forward">${
            step === "confirm" ? "Save & next" : "Next"
          }</button>
        </footer>
      `;
    }

    async function renderStepBody() {
      const main = mount.querySelector("#wizMain");
      const unit = getUnit();
      const step = currentStep();
      const suggested = V().suggestRouterAction(draft.router_target_status);

      if (step === "image") {
        main.innerHTML = `
          <div class="viewer-wrap" id="viewerMount"></div>
          <div class="view-chips" role="tablist" aria-label="Linked views">
            ${unit.views
              .map(
                (v, i) =>
                  `<button type="button" role="tab" class="chip${i === viewIndex ? " selected" : ""}" data-view="${i}">View ${i + 1}</button>`
              )
              .join("")}
          </div>
          <p class="hint">Pinch to zoom. Review all linked views before deciding.</p>
          <button type="button" class="btn primary block" data-act="forward">Continue</button>
        `;
        const viewerMount = main.querySelector("#viewerMount");
        if (viewer) viewer.destroy();
        viewer = global.XrayReviewViewer.createViewer(viewerMount);
        const path = unit.views[viewIndex].preview_path;
        const blob = await loadPreviewBlob(path);
        viewer.setBlob(blob);
        return;
      }

      if (step === "target") {
        main.innerHTML = `
          <h2 class="wiz-title">Router target status</h2>
          <div class="choice-grid">${choiceButtons("router_target_status", C().ROUTER_TARGET_STATUS, draft.router_target_status)}</div>
        `;
        return;
      }

      if (step === "anatomy") {
        const primary = C().ACTIVE_ANATOMY;
        const secondary = C().SECONDARY_ANATOMY;
        main.innerHTML = `
          <h2 class="wiz-title">Primary anatomy / FOV</h2>
          <div class="choice-grid">${choiceButtons("primary_anatomy_or_fov", primary, draft.primary_anatomy_or_fov)}</div>
          <button type="button" class="linkish" data-act="toggle-secondary">${showSecondaryAnatomy ? "Hide" : "Show"} other / non-target</button>
          <div class="choice-grid secondary ${showSecondaryAnatomy ? "" : "hidden"}">${choiceButtons("primary_anatomy_or_fov", secondary, draft.primary_anatomy_or_fov)}</div>
          ${
            draft.primary_anatomy_or_fov &&
            C().ACTIVE_ANATOMY.includes(draft.primary_anatomy_or_fov)
              ? `<button type="button" class="btn secondary block" data-act="quick-defaults">Quick defaults for clear case</button>`
              : ""
          }
        `;
        return;
      }

      if (step === "action") {
        main.innerHTML = `
          <h2 class="wiz-title">Recommended router action</h2>
          ${suggested ? `<p class="hint">Suggested from target status: <strong>${label("recommended_router_action", suggested)}</strong> (editable)</p>` : ""}
          <div class="choice-grid">${choiceButtons("recommended_router_action", C().RECOMMENDED_ROUTER_ACTION, draft.recommended_router_action || suggested, { suggested })}</div>
        `;
        return;
      }

      if (step === "hardware") {
        main.innerHTML = `
          <h2 class="wiz-title">Hardware / treatment</h2>
          <div class="choice-grid">${choiceButtons("hardware_or_treatment_state", C().HARDWARE_OR_TREATMENT_STATE, draft.hardware_or_treatment_state)}</div>
        `;
        return;
      }

      if (step === "quality") {
        main.innerHTML = `
          <h2 class="wiz-title">Image quality flags</h2>
          <p class="hint">Select all that apply. <strong>None</strong> clears other flags.</p>
          <div class="choice-grid">${choiceButtons("image_quality_flags", C().IMAGE_QUALITY_FLAGS, draft._quality, { multi: true })}</div>
        `;
        return;
      }

      if (step === "confidence") {
        main.innerHTML = `
          <h2 class="wiz-title">Confidence</h2>
          <div class="choice-grid">${choiceButtons("reviewer_confidence", C().REVIEWER_CONFIDENCE, draft.reviewer_confidence)}</div>
          <details class="note-details">
            <summary>Add optional note</summary>
            <label class="sr-only" for="freeNote">Free text note</label>
            <textarea id="freeNote" rows="3" maxlength="500" placeholder="Brief clarifying note only">${escapeHtml(draft.free_text_note || "")}</textarea>
            <label class="field-label" for="unableReason">Unable to review reason (optional)</label>
            <input id="unableReason" type="text" maxlength="200" value="${escapeHtml(draft.unable_to_review_reason || "")}" />
          </details>
        `;
        return;
      }

      if (step === "confirm") {
        const check = V().canMarkComplete(
          { ...draft, image_quality_flags: draft._quality },
          unit.reviewerId
        );
        main.innerHTML = `
          <h2 class="wiz-title">Confirm</h2>
          <ul class="summary-list">
            <li><span>Target</span><strong>${label("router_target_status", draft.router_target_status) || "—"}</strong></li>
            <li><span>Anatomy</span><strong>${label("primary_anatomy_or_fov", draft.primary_anatomy_or_fov) || "—"}</strong></li>
            <li><span>Action</span><strong>${label("recommended_router_action", draft.recommended_router_action) || "—"}</strong></li>
            <li><span>Hardware</span><strong>${label("hardware_or_treatment_state", draft.hardware_or_treatment_state) || "—"}</strong></li>
            <li><span>Quality</span><strong>${(draft._quality || []).map((f) => label("image_quality_flags", f)).join(", ") || "—"}</strong></li>
            <li><span>Confidence</span><strong>${label("reviewer_confidence", draft.reviewer_confidence) || "—"}</strong></li>
          </ul>
          ${
            check.ok
              ? `<p class="ok-msg">Ready to mark complete.</p>`
              : `<p class="err-msg">${check.errors.join(" · ")}</p>`
          }
        `;
      }
    }

    async function render() {
      mount.innerHTML = renderChrome();
      await renderStepBody();
      bind();
    }

    function bind() {
      mount.querySelector('[data-act="menu"]').onclick = () => onExitToMenu();
      mount.querySelector('[data-act="previous-unit"]').onclick = async () => {
        await autoSaveDraft();
        onNavigateUnit(-1);
      };
      mount.querySelector('[data-act="next-unit"]').onclick = async () => {
        await autoSaveDraft();
        onNavigateUnit(1);
      };
      mount.querySelector('[data-act="back"]').onclick = async () => {
        if (stepIndex > 0) {
          stepIndex -= 1;
          await autoSaveDraft();
          await render();
        }
      };
      mount.querySelector('[data-act="draft"]').onclick = async () => {
        await persist("draft");
        toast("Draft saved");
      };
      const forwardBtns = mount.querySelectorAll('[data-act="forward"]');
      forwardBtns.forEach((btn) => {
        btn.onclick = () => goForward();
      });

      mount.querySelectorAll(".choice-btn").forEach((btn) => {
        btn.onclick = async () => {
          const field = btn.getAttribute("data-field");
          const value = btn.getAttribute("data-value");
          const multi = btn.getAttribute("data-multi") === "1";
          if (multi) toggleQuality(value);
          else setField(field, value);
          await autoSaveDraft();
          if (!multi && currentStep() !== "confirm") {
            // auto-advance after single choice for speed
            stepIndex = Math.min(steps().length - 1, stepIndex + 1);
          }
          await render();
        };
      });

      mount.querySelectorAll("[data-view]").forEach((btn) => {
        btn.onclick = async () => {
          viewIndex = Number(btn.getAttribute("data-view"));
          await render();
        };
      });

      const toggleSec = mount.querySelector('[data-act="toggle-secondary"]');
      if (toggleSec) {
        toggleSec.onclick = async () => {
          showSecondaryAnatomy = !showSecondaryAnatomy;
          await render();
        };
      }

      const quick = mount.querySelector('[data-act="quick-defaults"]');
      if (quick) {
        quick.onclick = async () => {
          if (!draft.router_target_status) {
            draft.router_target_status = "target_active_anatomy";
          }
          draft.recommended_router_action =
            draft.recommended_router_action || "accept_active_class";
          draft.hardware_or_treatment_state = "none_visible";
          draft._quality = ["none"];
          draft.reviewer_confidence = "high";
          await autoSaveDraft();
          stepIndex = steps().indexOf("confirm");
          await render();
        };
      }

      const note = mount.querySelector("#freeNote");
      if (note) {
        note.oninput = () => {
          draft.free_text_note = note.value;
        };
        note.onblur = () => autoSaveDraft();
      }
      const unable = mount.querySelector("#unableReason");
      if (unable) {
        unable.oninput = () => {
          draft.unable_to_review_reason = unable.value;
        };
        unable.onblur = () => autoSaveDraft();
      }
    }

    async function goForward() {
      const step = currentStep();
      if (step === "confirm") {
        const unit = getUnit();
        const check = V().canMarkComplete(
          { ...draft, image_quality_flags: draft._quality },
          unit.reviewerId
        );
        if (!check.ok) {
          toast(check.errors[0] || "Incomplete");
          return;
        }
        await persist("complete");
        toast("Saved");
        viewIndex = 0;
        stepIndex = 0;
        onRequestNextIncomplete();
        return;
      }
      // gate required fields lightly
      if (step === "target" && !draft.router_target_status) {
        toast("Choose a target status");
        return;
      }
      if (step === "anatomy" && !draft.primary_anatomy_or_fov) {
        toast("Choose anatomy / FOV");
        return;
      }
      if (step === "action" && !draft.recommended_router_action) {
        if (V().suggestRouterAction(draft.router_target_status)) {
          draft.recommended_router_action = V().suggestRouterAction(
            draft.router_target_status
          );
        } else {
          toast("Choose a router action");
          return;
        }
      }
      if (step === "hardware" && !draft.hardware_or_treatment_state) {
        toast("Choose hardware state");
        return;
      }
      if (step === "quality" && !draft._quality.length) {
        toast("Choose at least one quality flag (or None)");
        return;
      }
      if (step === "confidence" && !draft.reviewer_confidence) {
        toast("Choose confidence");
        return;
      }
      await autoSaveDraft();
      stepIndex += 1;
      await render();
    }

    function toast(msg) {
      let el = document.getElementById("toast");
      if (!el) {
        el = document.createElement("div");
        el.id = "toast";
        el.setAttribute("role", "status");
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.classList.add("show");
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove("show"), 1800);
    }

    async function openUnit() {
      stepIndex = 0;
      viewIndex = 0;
      showSecondaryAnatomy = false;
      syncDraftFromStore();
      await render();
    }

    function destroy() {
      if (viewer) viewer.destroy();
      viewer = null;
    }

    return { openUnit, destroy, toast };
  }

  global.XrayReviewWizard = { createWizard };
})(typeof window !== "undefined" ? window : globalThis);
