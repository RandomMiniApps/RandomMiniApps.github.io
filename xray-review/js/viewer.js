(function (global) {
  "use strict";

  function createViewer(rootEl) {
    const state = {
      scale: 1,
      minScale: 0.5,
      maxScale: 6,
      tx: 0,
      ty: 0,
      invert: false,
      brightness: 1,
      contrast: 1,
      objectUrl: null,
      pointers: new Map(),
      lastPinchDist: null,
      dragging: false,
    };

    rootEl.innerHTML = `
      <div class="viewer-stage" tabindex="0" role="img" aria-label="X-ray preview">
        <img class="viewer-img" alt="Radiograph preview" draggable="false" />
      </div>
      <div class="viewer-toolbar" role="toolbar" aria-label="Image controls">
        <button type="button" data-act="fit" class="tool-btn">Fit</button>
        <button type="button" data-act="zoom-in" class="tool-btn" aria-label="Zoom in">+</button>
        <button type="button" data-act="zoom-out" class="tool-btn" aria-label="Zoom out">−</button>
        <button type="button" data-act="reset" class="tool-btn">Reset</button>
        <button type="button" data-act="invert" class="tool-btn">Invert</button>
      </div>
    `;

    const stage = rootEl.querySelector(".viewer-stage");
    const img = rootEl.querySelector(".viewer-img");

    function applyTransform() {
      img.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
      img.style.filter = `invert(${state.invert ? 1 : 0}) brightness(${state.brightness}) contrast(${state.contrast})`;
    }

    function fit() {
      state.scale = 1;
      state.tx = 0;
      state.ty = 0;
      applyTransform();
    }

    function reset() {
      state.invert = false;
      state.brightness = 1;
      state.contrast = 1;
      fit();
    }

    function setBlob(blob) {
      if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = blob ? URL.createObjectURL(blob) : null;
      img.onload = () => fit();
      img.src = state.objectUrl || "";
      if (!blob) img.removeAttribute("src");
    }

    function destroy() {
      if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = null;
    }

    rootEl.querySelector('[data-act="fit"]').onclick = fit;
    rootEl.querySelector('[data-act="reset"]').onclick = reset;
    rootEl.querySelector('[data-act="zoom-in"]').onclick = () => {
      state.scale = Math.min(state.maxScale, state.scale * 1.25);
      applyTransform();
    };
    rootEl.querySelector('[data-act="zoom-out"]').onclick = () => {
      state.scale = Math.max(state.minScale, state.scale / 1.25);
      applyTransform();
    };
    rootEl.querySelector('[data-act="invert"]').onclick = () => {
      state.invert = !state.invert;
      applyTransform();
    };

    stage.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        state.scale = Math.min(
          state.maxScale,
          Math.max(state.minScale, state.scale * factor)
        );
        applyTransform();
      },
      { passive: false }
    );

    stage.addEventListener("pointerdown", (e) => {
      stage.setPointerCapture(e.pointerId);
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (state.pointers.size === 1) state.dragging = true;
      if (state.pointers.size === 2) {
        const pts = [...state.pointers.values()];
        state.lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        state.dragging = false;
      }
    });

    stage.addEventListener("pointermove", (e) => {
      if (!state.pointers.has(e.pointerId)) return;
      const prev = state.pointers.get(e.pointerId);
      const curr = { x: e.clientX, y: e.clientY };
      state.pointers.set(e.pointerId, curr);

      if (state.pointers.size === 2) {
        const pts = [...state.pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (state.lastPinchDist) {
          state.scale = Math.min(
            state.maxScale,
            Math.max(state.minScale, state.scale * (dist / state.lastPinchDist))
          );
          applyTransform();
        }
        state.lastPinchDist = dist;
      } else if (state.dragging && state.scale > 1) {
        state.tx += curr.x - prev.x;
        state.ty += curr.y - prev.y;
        applyTransform();
      }
    });

    function endPointer(e) {
      state.pointers.delete(e.pointerId);
      if (state.pointers.size < 2) state.lastPinchDist = null;
      if (state.pointers.size === 0) state.dragging = false;
    }
    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", endPointer);

    applyTransform();
    return { setBlob, fit, reset, destroy };
  }

  global.XrayReviewViewer = { createViewer };
})(typeof window !== "undefined" ? window : globalThis);
