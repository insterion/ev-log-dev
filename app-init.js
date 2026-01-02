// app-init.js – wire tabs + wire everything once (with global tab activator)

(function () {
  const A = window.EVApp;

  function wireTabs() {
    const tabs = document.querySelectorAll(".tab");
    const btns = document.querySelectorAll(".tabbtn");

    function activate(name) {
      tabs.forEach((t) => t.classList.toggle("active", t.id === name));
      btns.forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    }

    btns.forEach((b) => b.addEventListener("click", () => activate(b.dataset.tab)));

    // expose for other modules (Summary -> Open Compare, etc.)
    A.Tabs = {
      activate
    };

    activate("log");
  }

  function syncSettingsToInputs() {
    A.$("p_public").value = A.state.settings.public;
    A.$("p_public_xp").value = A.state.settings.public_xp;
    A.$("p_home").value = A.state.settings.home;
    A.$("p_home_xp").value = A.state.settings.home_xp;
    A.$("p_hw").value = A.state.settings.chargerHardware || 0;
    A.$("p_install").value = A.state.settings.chargerInstall || 0;
  }

  function saveSettingsFromInputs() {
    const s = A.state.settings;
    s.public = parseFloat(A.$("p_public").value) || 0;
    s.public_xp = parseFloat(A.$("p_public_xp").value) || 0;
    s.home = parseFloat(A.$("p_home").value) || 0;
    s.home_xp = parseFloat(A.$("p_home_xp").value) || 0;
    s.chargerHardware = parseFloat(A.$("p_hw").value) || 0;
    s.chargerInstall = parseFloat(A.$("p_install").value) || 0;
    A.saveState();
    A.U.toast("Settings saved", "good");
  }

  // Global click handler for "open tab" buttons/links (e.g. Summary -> Compare)
  function wireGlobalTabLinks() {
    document.addEventListener("click", (ev) => {
      const t = ev.target;
      if (!t) return;

      const el = t.closest("[data-open-tab]");
      if (!el) return;

      const tab = (el.getAttribute("data-open-tab") || "").trim();
      if (!tab) return;

      // prevent accidental form submits / link navigation
      ev.preventDefault();

      if (A.Tabs && typeof A.Tabs.activate === "function") {
        A.Tabs.activate(tab);
      }
    });
  }

  function wire() {
    A.ensureCostAppliesDefaults();

    A.$("date").value = A.todayISO();
    A.$("c_date").value = A.todayISO();

    // default OTHER for new costs
    const appliesSelect = A.$("c_applies");
    if (appliesSelect && !appliesSelect.value) appliesSelect.value = "other";

    // buttons
    A.$("addEntry").addEventListener("click", A.Actions.onAddEntry);
    A.$("sameAsLast").addEventListener("click", A.Actions.onSameAsLast);
    A.$("c_add").addEventListener("click", A.Actions.onAddCost);

    A.$("savePrices").addEventListener("click", saveSettingsFromInputs);
    A.$("exportBackup").addEventListener("click", A.Export.exportBackup);
    A.$("importBackup").addEventListener("click", A.Export.importBackup);

    // table click delegation
    const logContainer = A.$("logTable");
    if (logContainer) logContainer.addEventListener("click", A.Actions.onLogTableClick);

    const costContainer = A.$("costTable");
    if (costContainer) costContainer.addEventListener("click", A.Actions.onCostTableClick);

    // tabs + global tab links
    wireTabs();
    wireGlobalTabLinks();

    // initial UI
    syncSettingsToInputs();

    A.Render.ensurePeriodControls();
    A.Render.ensureCostFilterControls();

    A.Render.renderAll();
    A.Export.ensureExportButtons();

    A.Actions.resetEditMode();
    A.Actions.resetCostEditMode();

    A.Render.renderPeriodBadge();
  }

  A.Init = { wire, syncSettingsToInputs };
  wire();
})();