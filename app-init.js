// app-init.js – wire tabs + global "open tab" that clicks the real tab button

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

    A.Tabs = { activate };
    activate("log");
  }

  // helper: safe addEventListener with optional toast/warn
  function onClick(id, fn, opts) {
    const el = A.$(id);
    if (!el) {
      const msg = `Init: element #${id} not found`;
      console && console.warn && console.warn(msg);
      // only show toast for critical buttons, but keep it "info"
      if (opts && opts.toast) A.U.toast(msg, "info");
      return false;
    }
    el.addEventListener("click", fn);
    return true;
  }

  function syncSettingsToInputs() {
    // Settings tab
    const s = A.state.settings || (A.state.settings = {});
    const pPublic = A.$("p_public");
    if (pPublic) pPublic.value = s.public;

    const pPublicXp = A.$("p_public_xp");
    if (pPublicXp) pPublicXp.value = s.public_xp;

    const pHome = A.$("p_home");
    if (pHome) pHome.value = s.home;

    const pHomeXp = A.$("p_home_xp");
    if (pHomeXp) pHomeXp.value = s.home_xp;

    const pHw = A.$("p_hw");
    if (pHw) pHw.value = s.chargerHardware || 0;

    const pInst = A.$("p_install");
    if (pInst) pInst.value = s.chargerInstall || 0;

    // Compare assumptions
    if (typeof A.ensureCompareSettingsDefaults === "function") {
      A.ensureCompareSettingsDefaults();
    }

    const evMpkwh = A.$("cmp_ev_mpkwh");
    if (evMpkwh) evMpkwh.value = A.state.settings.evMilesPerKwh;

    const iceMpg = A.$("cmp_ice_mpg");
    if (iceMpg) iceMpg.value = A.state.settings.iceMpg;

    const diesel = A.$("cmp_diesel_per_litre");
    if (diesel) diesel.value = A.state.settings.icePerLitre;

    const bothMode = A.$("cmp_both_mode");
    if (bothMode) bothMode.value = A.state.settings.bothAllocationMode || "split";
  }

  function saveSettingsFromInputs() {
    const s = A.state.settings || (A.state.settings = {});
    const v = (id) => parseFloat((A.$(id) && A.$(id).value) || "") || 0;

    s.public = v("p_public");
    s.public_xp = v("p_public_xp");
    s.home = v("p_home");
    s.home_xp = v("p_home_xp");
    s.chargerHardware = v("p_hw");
    s.chargerInstall = v("p_install");

    A.saveState();
    A.U.toast("Settings saved", "good");
  }

  // Save compare assumptions + diesel price history
  function saveCompareSettingsFromInputs() {
    if (typeof A.ensureCompareSettingsDefaults === "function") {
      A.ensureCompareSettingsDefaults();
    }

    const s = A.state.settings || (A.state.settings = {});

    const ev = parseFloat((A.$("cmp_ev_mpkwh") && A.$("cmp_ev_mpkwh").value) || "");
    const mpg = parseFloat((A.$("cmp_ice_mpg") && A.$("cmp_ice_mpg").value) || "");
    const perL = parseFloat((A.$("cmp_diesel_per_litre") && A.$("cmp_diesel_per_litre").value) || "");

    if (isFinite(ev) && ev > 0) s.evMilesPerKwh = ev;
    if (isFinite(mpg) && mpg > 0) s.iceMpg = mpg;

    // Diesel: append/overwrite today's record if changed
    if (isFinite(perL) && perL > 0 && typeof A.addIcePerLitreRecord === "function") {
      const current = Number(s.icePerLitre) || 0;
      if (Math.abs(perL - current) >= 0.005) {
        A.addIcePerLitreRecord(perL, A.todayISO());
      }
    }

    const bm = ((A.$("cmp_both_mode") && A.$("cmp_both_mode").value) || "split").toLowerCase();
    s.bothAllocationMode = (bm === "split" || bm === "double") ? bm : "split";

    A.saveState();
    syncSettingsToInputs();
    A.Render.renderAll();
    A.U.toast("Compare settings saved", "good");
  }

  // Reset (B mode): do NOT delete history; only set defaults from today onward
  function resetCompareSettingsToDefaults() {
    const s = A.state.settings || (A.state.settings = {});
    s.evMilesPerKwh = 2.8;
    s.iceMpg = 45;
    s.bothAllocationMode = "split";

    if (typeof A.addIcePerLitreRecord === "function") {
      A.addIcePerLitreRecord(1.44, A.todayISO());
    } else {
      s.icePerLitre = 1.44;
    }

    A.saveState();
    syncSettingsToInputs();
    A.Render.renderAll();
    A.U.toast("Compare settings reset (from today)", "info");
  }

  // ULTRA-ROBUST openTab: click the real tab button if it exists
  function openTab(tabName) {
    const btn = document.querySelector(`.tabbtn[data-tab="${tabName}"]`);
    if (btn) {
      btn.click(); // safest
      return true;
    }
    // fallback
    if (A.Tabs && typeof A.Tabs.activate === "function") {
      A.Tabs.activate(tabName);
      return true;
    }
    return false;
  }

  // Global handler for anything with data-open-tab
  function wireGlobalTabLinks() {
    const handler = (ev) => {
      const t = ev.target;
      if (!t) return;

      const el = t.closest("[data-open-tab]");
      if (!el) return;

      ev.preventDefault();
      ev.stopPropagation();

      const tab = (el.getAttribute("data-open-tab") || "").trim();
      if (!tab) return;

      const ok = openTab(tab);
      if (!ok) {
        A.U.toast(`Tab "${tab}" not found`, "bad");
      }
    };

    // pointerup works better on mobile than click in some cases
    document.addEventListener("pointerup", handler, { capture: true });
    document.addEventListener("click", handler, { capture: true });
  }

  function wire() {
    A.ensureCostAppliesDefaults();

    const d = A.$("date");
    if (d) d.value = A.todayISO();

    const cd = A.$("c_date");
    if (cd) cd.value = A.todayISO();

    const appliesSelect = A.$("c_applies");
    if (appliesSelect && !appliesSelect.value) appliesSelect.value = "other";

    // Core actions (keep working even if some buttons are missing)
    onClick("addEntry", A.Actions.onAddEntry, { toast: true });
    onClick("sameAsLast", A.Actions.onSameAsLast, { toast: false });
    onClick("c_add", A.Actions.onAddCost, { toast: true });

    // Settings + backup
    onClick("savePrices", saveSettingsFromInputs, { toast: true });
    onClick("exportBackup", A.Export.exportBackup, { toast: true });
    onClick("importBackup", A.Export.importBackup, { toast: true });

    // Tables delegation
    const logContainer = A.$("logTable");
    if (logContainer) logContainer.addEventListener("click", A.Actions.onLogTableClick);

    const costContainer = A.$("costTable");
    if (costContainer) costContainer.addEventListener("click", A.Actions.onCostTableClick);

    // Compare assumptions
    onClick("cmp_save", saveCompareSettingsFromInputs, { toast: true });
    onClick("cmp_reset", resetCompareSettingsToDefaults, { toast: true });

    wireTabs();
    wireGlobalTabLinks();

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