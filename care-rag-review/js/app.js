/* CARE-RAG Phase 4.4.2a governance portal boot + routing */
(function () {
  "use strict";

  function dataUrl(path) {
    // Relative to this HTML page — works under GitHub Pages base paths.
    return new URL(path, window.location.href).toString();
  }

  function parseRoute() {
    var hash = (location.hash || "#/overview").replace(/^#\/?/, "");
    var parts = hash.split("/").filter(Boolean);
    return { name: parts[0] || "overview", param: parts[1] || null };
  }

  function setNavCurrent(name) {
    document.querySelectorAll(".nav-rail a[data-route]").forEach(function (a) {
      if (a.getAttribute("data-route") === name) {
        a.setAttribute("aria-current", "page");
      } else {
        a.removeAttribute("aria-current");
      }
    });
  }

  function render() {
    var route = parseRoute();
    var main = document.getElementById("main");
    setNavCurrent(route.name === "item" ? "item" : route.name);
    switch (route.name) {
      case "overview":
        CareRagViews.renderOverview(main);
        break;
      case "queue":
        CareRagViews.renderQueue(main);
        break;
      case "item":
        CareRagViews.renderItem(main, route.param || CareRagState.state.selectedRequirementId);
        break;
      case "admin":
        CareRagViews.renderAdmin(main);
        break;
      case "cso":
        CareRagViews.renderCso(main);
        break;
      case "technical":
        CareRagViews.renderTechnical(main);
        break;
      case "governance":
        CareRagViews.renderGovernance(main);
        break;
      case "policy":
        CareRagViews.renderPolicy(main);
        break;
      case "register":
        CareRagViews.renderRegister(main);
        break;
      case "export":
        CareRagViews.renderExport(main);
        break;
      case "release":
        CareRagViews.renderRelease(main);
        break;
      default:
        main.innerHTML = "<h2>Not found</h2><p>Unknown route.</p>";
    }
  }

  function bindChrome() {
    var roleSelect = document.getElementById("sessionRole");
    roleSelect.value = CareRagState.state.sessionRole;
    roleSelect.addEventListener("change", function () {
      CareRagState.state.sessionRole = roleSelect.value;
      CareRagState.state.filters.role =
        roleSelect.value === "governance_administrator" ? "" : roleSelect.value;
      CareRagViews.toast("Working as " + roleSelect.value);
      if ((location.hash || "").indexOf("queue") !== -1) render();
    });
    window.addEventListener("hashchange", render);
  }

  function boot() {
    Promise.all([
      fetch(dataUrl("data/portal_bundle.json")).then(function (r) {
        if (!r.ok) throw new Error("Failed to load portal_bundle.json (" + r.status + ")");
        return r.json();
      }),
      fetch(dataUrl("data/portal_manifest.json")).then(function (r) {
        if (!r.ok) throw new Error("Failed to load portal_manifest.json (" + r.status + ")");
        return r.json();
      }),
    ])
      .then(function (pair) {
        var bundle = pair[0];
        var manifest = pair[1];
        if (manifest.portal_bundle_content_sha256 !== bundle.portal_bundle_content_sha256) {
          throw new Error("portal_manifest content hash does not match portal_bundle");
        }
        CareRagState.setBundle(bundle, manifest);
        document.getElementById("packageMeta").textContent =
          "Phase " +
          bundle.phase +
          " · " +
          bundle.governance_package_id +
          " · synthetic evidence only · decisions pre-populated: no";
        bindChrome();
        if (!location.hash) location.hash = "#/overview";
        render();
      })
      .catch(function (err) {
        document.getElementById("main").innerHTML =
          '<h2>Failed to load portal data</h2><p class="notice danger">' +
          String(err.message || err) +
          "</p><p>Ensure <code>data/portal_bundle.json</code> is present (run the portal data generator).</p>";
      });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
