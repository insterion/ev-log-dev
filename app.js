// app.js – main wiring for EV Log (with "applies to" + EV/ICE maintenance + Costs filter + Insurance breakdown)
// + Period selector (Costs) + Summary "Selected period" block

(function () {
  const D = window.EVData;
  const C = window.EVCalc;
  const U = window.EVUI;

  const $ = (id) => document.getElementById(id);

  const state = D.loadState();
  let currentEditId = null;      // charging entry id being edited
  let currentEditCostId = null;  // cost id being edited

  // ---------- UI state defaults (period selector) ----------
  if (!state.ui) state.ui = {};
  if (!state.ui.periodMode) state.ui.periodMode = "this-month"; // this-month | last-month | last-30 | custom | all-time
  if (!state.ui.periodFrom) state.ui.periodFrom = "";
  if (!state.ui.periodTo) state.ui.periodTo = "";

  // ---------- normalise existing costs (backwards compatibility) ----------

  function ensureCostAppliesDefaults() {
    if (!Array.isArray(state.costs)) return;
    for (const c of state.costs) {
      if (!c) continue;
      if (!c.applies) {
        // старите записи по подразбиране – other
        c.applies = "other";
      } else {
        c.applies = String(c.applies).toLowerCase();
      }
    }
  }

  ensureCostAppliesDefaults();

  // ---------- tabs ----------

  function wireTabs() {
    const tabs = document.querySelectorAll(".tab");
    const btns = document.querySelectorAll(".tabbtn");

    function activate(name) {
      tabs.forEach((t) => {
        t.classList.toggle("active", t.id === name);
      });
      btns.forEach((b) => {
        b.classList.toggle("active", b.dataset.tab === name);
      });
    }

    btns.forEach((b) =>
      b.addEventListener("click", () => activate(b.dataset.tab))
    );

    activate("log");
  }

  // ---------- settings sync ----------

  function syncSettingsToInputs() {
    $("p_public").value = state.settings.public;
    $("p_public_xp").value = state.settings.public_xp;
    $("p_home").value = state.settings.home;
    $("p_home_xp").value = state.settings.home_xp;
    $("p_hw").value = state.settings.chargerHardware || 0;
    $("p_install").value = state.settings.chargerInstall || 0;
  }

  function saveSettingsFromInputs() {
    const s = state.settings;
    s.public = parseFloat($("p_public").value) || 0;
    s.public_xp = parseFloat($("p_public_xp").value) || 0;
    s.home = parseFloat($("p_home").value) || 0;
    s.home_xp = parseFloat($("p_home_xp").value) || 0;
    s.chargerHardware = parseFloat($("p_hw").value) || 0;
    s.chargerInstall = parseFloat($("p_install").value) || 0;
    D.saveState(state);
    U.toast("Settings saved", "good");
  }

  // ---------- helpers ----------

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function autoPriceForType(type) {
    const s = state.settings;
    switch (type) {
      case "public":
        return s.public;
      case "public-xp":
        return s.public_xp;
      case "home":
        return s.home;
      case "home-xp":
        return s.home_xp;
      default:
        return 0;
    }
  }

  function resetEditMode() {
    currentEditId = null;
    const addBtn = $("addEntry");
    if (addBtn) {
      addBtn.textContent = "Add entry";
    }
  }

  function resetCostEditMode() {
    currentEditCostId = null;
    const btn = $("c_add");
    if (btn) {
      btn.textContent = "Add cost";
    }
  }

  function startEditEntry(id) {
    if (!id) {
      U.toast("Missing entry id", "bad");
      return;
    }
    const entry = state.entries.find((e) => e.id === id);
    if (!entry) {
      U.toast("Entry not found", "bad");
      return;
    }

    currentEditId = id;

    $("date").value = entry.date || todayISO();
    $("kwh").value = entry.kwh;
    $("type").value = entry.type;
    $("price").value = entry.price;
    $("note").value = entry.note || "";

    const addBtn = $("addEntry");
    if (addBtn) {
      addBtn.textContent = "Update entry";
    }

    U.toast("Editing entry", "info");
  }

  function startEditCost(id) {
    if (!id) {
      U.toast("Missing cost id", "bad");
      return;
    }
    const cost = state.costs.find((c) => c.id === id);
    if (!cost) {
      U.toast("Cost not found", "bad");
      return;
    }

    currentEditCostId = id;

    $("c_date").value = cost.date || todayISO();
    $("c_category").value = cost.category || "Tyres";
    $("c_amount").value = cost.amount;
    $("c_note").value = cost.note || "";

    const appliesSelect = $("c_applies");
    if (appliesSelect) {
      const v = (cost.applies || "other").toLowerCase();
      if (v === "ev" || v === "ice" || v === "both" || v === "other") {
        appliesSelect.value = v;
      } else {
        appliesSelect.value = "other";
      }
    }

    const btn = $("c_add");
    if (btn) {
      btn.textContent = "Update cost";
    }

    U.toast("Editing cost", "info");
  }

  function getAppliesFromForm() {
    const el = $("c_applies");
    if (!el) return "other";
    const v = (el.value || "").toLowerCase();
    if (v === "ev" || v === "ice" || v === "both" || v === "other") {
      return v;
    }
    return "other";
  }

  // ---------- date / period helpers ----------

  function clampISO(d) {
    return (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) ? d : "";
  }

  function isoToTime(iso) {
    // ISO date -> UTC midnight time
    if (!iso) return NaN;
    const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
    if (!y || !m || !d) return NaN;
    return Date.UTC(y, m - 1, d);
  }

  function firstDayOfMonthISO(dt) {
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth(); // 0-11
    const d = new Date(Date.UTC(y, m, 1));
    return d.toISOString().slice(0, 10);
  }

  function lastDayOfMonthISO(dt) {
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth(); // 0-11
    // day 0 of next month = last day of current month
    const d = new Date(Date.UTC(y, m + 1, 0));
    return d.toISOString().slice(0, 10);
  }

  function getActivePeriod() {
    const mode = (state.ui.periodMode || "this-month").toLowerCase();

    if (mode === "all-time") {
      return { mode, from: "", to: "", label: "All time" };
    }

    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    if (mode === "this-month") {
      const from = firstDayOfMonthISO(todayUtc);
      const to = lastDayOfMonthISO(todayUtc);
      return { mode, from, to, label: `This month (${from} → ${to})` };
    }

    if (mode === "last-month") {
      const lastMonth = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() - 1, 15));
      const from = firstDayOfMonthISO(lastMonth);
      const to = lastDayOfMonthISO(lastMonth);
      return { mode, from, to, label: `Last month (${from} → ${to})` };
    }

    if (mode === "last-30") {
      const to = todayUtc.toISOString().slice(0, 10);
      const fromDt = new Date(todayUtc.getTime() - 29 * 24 * 3600 * 1000);
      const from = fromDt.toISOString().slice(0, 10);
      return { mode, from, to, label: `Last 30 days (${from} → ${to})` };
    }

    // custom
    const from = clampISO(state.ui.periodFrom);
    const to = clampISO(state.ui.periodTo);
    if (!from || !to) {
      // fallback safe
      const f = firstDayOfMonthISO(todayUtc);
      const t = lastDayOfMonthISO(todayUtc);
      return { mode: "this-month", from: f, to: t, label: `This month (${f} → ${t})` };
    }

    // ensure from <= to
    const tf = isoToTime(from);
    const tt = isoToTime(to);
    if (!isNaN(tf) && !isNaN(tt) && tf > tt) {
      return { mode: "custom", from: to, to: from, label: `Custom (${to} → ${from})` };
    }

    return { mode: "custom", from, to, label: `Custom (${from} → ${to})` };
  }

  function filterByPeriod(list, dateGetter) {
    const p = getActivePeriod();
    if (p.mode === "all-time") return list || [];

    const fromT = isoToTime(p.from);
    const toT = isoToTime(p.to);
    if (isNaN(fromT) || isNaN(toT)) return list || [];

    return (list || []).filter((x) => {
      const iso = (dateGetter(x) || "");
      const t = isoToTime(iso);
      if (isNaN(t)) return false;
      return t >= fromT && t <= toT;
    });
  }

  // ---------- maintenance totals (all-time, split EV/ICE) ----------

  function computeMaintenanceTotals() {
    const costs = state.costs || [];
    let evOnly = 0;
    let iceOnly = 0;
    let both = 0;
    let other = 0;

    for (const c of costs) {
      if (!c) continue;
      const amount = Number(c.amount ?? 0) || 0;
      if (!amount) continue;

      const a = (c.applies || "other").toLowerCase();
      if (a === "ev") {
        evOnly += amount;
      } else if (a === "ice") {
        iceOnly += amount;
      } else if (a === "both") {
        both += amount;
      } else {
        other += amount;
      }
    }

    const ev = evOnly + both;
    const ice = iceOnly + both;
    const total = evOnly + iceOnly + both + other;

    return {
      ev,
      ice,
      both,
      other,
      total
    };
  }

  function computeMaintenanceTotalAllTime() {
    return computeMaintenanceTotals().total;
  }

  // ---------- insurance totals (all-time, split EV/ICE) ----------

  function computeInsuranceTotals() {
    const costs = state.costs || [];
    let evOnly = 0;
    let iceOnly = 0;
    let both = 0;
    let other = 0;

    for (const c of costs) {
      if (!c) continue;
      const amount = Number(c.amount ?? 0) || 0;
      if (!amount) continue;

      const cat = String(c.category || "").toLowerCase();
      if (cat !== "insurance") continue;

      const a = (c.applies || "other").toLowerCase();
      if (a === "ev") {
        evOnly += amount;
      } else if (a === "ice") {
        iceOnly += amount;
      } else if (a === "both") {
        both += amount;
      } else {
        other += amount;
      }
    }

    const ev = evOnly + both;
    const ice = iceOnly + both;
    const total = evOnly + iceOnly + both + other;

    return {
      ev,
      ice,
      both,
      other,
      total
    };
  }

  function renderMaintenanceTotalInCosts() {
    try {
      const container = $("costTable");
      if (!container) return;

      const totals = computeMaintenanceTotals();
      let el = $("maintenanceTotalCosts");
      if (!el) {
        el = document.createElement("p");
        el.id = "maintenanceTotalCosts";
        el.className = "small";
        el.style.marginTop = "6px";
        if (container.parentNode) {
          container.parentNode.insertBefore(el, container.nextSibling);
        }
      }

      const diff = totals.ev - totals.ice;

      el.textContent =
        "Maintenance totals (all time) – " +
        "EV: " + U.fmtGBP(totals.ev) +
        ", ICE: " + U.fmtGBP(totals.ice) +
        ", Both: " + U.fmtGBP(totals.both) +
        ", Other: " + U.fmtGBP(totals.other) +
        ", Diff (EV–ICE): " + U.fmtGBP(diff);
    } catch (e) {
      console && console.warn && console.warn("renderMaintenanceTotalInCosts failed", e);
    }
  }

  function renderMaintenanceTotalInCompare() {
    try {
      const container = $("compareStats");
      if (!container) return;

      const totals = computeMaintenanceTotals();
      let el = $("maintenanceTotalCompare");
      if (!el) {
        el = document.createElement("p");
        el.id = "maintenanceTotalCompare";
        el.className = "small";
        el.style.marginTop = "8px";
        container.appendChild(el);
      }

      const diff = totals.ev - totals.ice;

      el.textContent =
        "Maintenance (all time) – " +
        "EV: " + U.fmtGBP(totals.ev) +
        ", ICE: " + U.fmtGBP(totals.ice) +
        ", Both: " + U.fmtGBP(totals.both) +
        ", Other: " + U.fmtGBP(totals.other) +
        ", Diff (EV–ICE): " + U.fmtGBP(diff);
    } catch (e) {
      console && console.warn && console.warn("renderMaintenanceTotalInCompare failed", e);
    }
  }

  // ---------- costs filter controls (UI) ----------

  function ensureCostFilterControls() {
    // ако вече има select – не правим нищо
    if ($("c_filter_applies")) return;

    const container = $("costTable");
    if (!container || !container.parentNode) return;

    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "6px";
    wrapper.style.marginBottom = "6px";

    const label = document.createElement("label");
    label.setAttribute("for", "c_filter_applies");
    label.textContent = "Filter:";

    const select = document.createElement("select");
    select.id = "c_filter_applies";

    const options = [
      ["all", "All"],
      ["ev", "EV only"],
      ["ice", "ICE only"],
      ["both", "Both"],
      ["other", "Other"]
    ];

    options.forEach(([val, text]) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = text;
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      renderAll();
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);

    container.parentNode.insertBefore(wrapper, container);
  }

  function getCostFilterValue() {
    const sel = $("c_filter_applies");
    if (!sel) return "all";
    const v = (sel.value || "all").toLowerCase();
    if (v === "ev" || v === "ice" || v === "both" || v === "other" || v === "all") {
      return v;
    }
    return "all";
  }

  // ---------- period controls (UI) ----------
  function ensurePeriodControls() {
    if ($("period_mode")) return;

    const container = $("costTable");
    if (!container || !container.parentNode) return;

    const outer = document.createElement("div");
    outer.id = "periodControls";
    outer.style.display = "grid";
    outer.style.gridTemplateColumns = "auto 1fr";
    outer.style.gap = "6px";
    outer.style.alignItems = "center";
    outer.style.marginBottom = "6px";

    const label = document.createElement("label");
    label.setAttribute("for", "period_mode");
    label.textContent = "Period:";

    const select = document.createElement("select");
    select.id = "period_mode";

    const modes = [
      ["this-month", "This month"],
      ["last-month", "Last month"],
      ["last-30", "Last 30 days"],
      ["custom", "Custom…"],
      ["all-time", "All time"]
    ];
    modes.forEach(([val, text]) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = text;
      select.appendChild(opt);
    });

    select.value = state.ui.periodMode || "this-month";

    // custom row
    const customRow = document.createElement("div");
    customRow.id = "period_custom_row";
    customRow.style.gridColumn = "1 / -1";
    customRow.style.display = "none";
    customRow.style.gap = "6px";
    customRow.style.alignItems = "center";

    const from = document.createElement("input");
    from.type = "date";
    from.id = "period_from";
    from.value = clampISO(state.ui.periodFrom) || "";

    const to = document.createElement("input");
    to.type = "date";
    to.id = "period_to";
    to.value = clampISO(state.ui.periodTo) || "";

    const btnApply = document.createElement("button");
    btnApply.type = "button";
    btnApply.id = "period_apply";
    btnApply.textContent = "Apply";

    const btnReset = document.createElement("button");
    btnReset.type = "button";
    btnReset.id = "period_reset";
    btnReset.textContent = "Reset";

    customRow.appendChild(from);
    customRow.appendChild(to);
    customRow.appendChild(btnApply);
    customRow.appendChild(btnReset);

    // badge row
    const badge = document.createElement("div");
    badge.id = "period_badge";
    badge.style.gridColumn = "1 / -1";
    badge.style.fontSize = "0.85rem";
    badge.style.color = "#b0b0b0";
    badge.style.marginTop = "2px";

    function refreshCustomVisibility() {
      const mode = (select.value || "this-month").toLowerCase();
      customRow.style.display = mode === "custom" ? "flex" : "none";
    }

    function savePeriod(mode, fromIso, toIso) {
      state.ui.periodMode = mode;
      state.ui.periodFrom = fromIso || "";
      state.ui.periodTo = toIso || "";
      D.saveState(state);
    }

    select.addEventListener("change", () => {
      const mode = (select.value || "this-month").toLowerCase();
      refreshCustomVisibility();

      if (mode !== "custom") {
        // for non-custom, save immediately
        savePeriod(mode, "", "");
        renderAll();
      } else {
        // custom waits for Apply
        // but keep current selection in UI state (not saved yet) – still ok
      }
    });

    btnApply.addEventListener("click", () => {
      const f = clampISO(from.value);
      const t = clampISO(to.value);
      if (!f || !t) {
        U.toast("Pick From and To dates", "bad");
        return;
      }
      savePeriod("custom", f, t);
      renderAll();
      U.toast("Period applied", "good");
    });

    btnReset.addEventListener("click", () => {
      from.value = "";
      to.value = "";
      savePeriod("this-month", "", "");
      select.value = "this-month";
      refreshCustomVisibility();
      renderAll();
      U.toast("Period reset", "info");
    });

    outer.appendChild(label);
    outer.appendChild(select);

    container.parentNode.insertBefore(outer, container);
    container.parentNode.insertBefore(customRow, container);
    container.parentNode.insertBefore(badge, container);

    refreshCustomVisibility();
  }

  function renderPeriodBadge() {
    const el = $("period_badge");
    if (!el) return;
    const p = getActivePeriod();
    el.textContent = "Period active: " + (p.label || "");
  }

  // ---------- Summary: Selected period block ----------
  function ensurePeriodSummaryBlock() {
    const anchor = $("summary_this");
    if (!anchor) return;

    let box = $("summary_period");
    if (box) return;

    box = document.createElement("div");
    box.id = "summary_period";
    box.style.borderRadius = "18px";
    box.style.border = "1px solid #222";
    box.style.background = "#080808";
    box.style.padding = "10px 12px";
    box.style.marginBottom = "10px";
    box.style.fontSize = "0.9rem";

    anchor.parentNode.insertBefore(box, anchor);
  }

  function computeStatsForEntries(entries) {
    const arr = entries || [];
    const totalKwh = arr.reduce((s, e) => s + (Number(e.kwh) || 0), 0);
    const totalCost = arr.reduce((s, e) => s + ((Number(e.kwh) || 0) * (Number(e.price) || 0)), 0);
    const count = arr.length;

    const avgPrice = totalKwh > 0 ? totalCost / totalKwh : 0;

    // per-day in calendar range (based on active period)
    const p = getActivePeriod();
    let perDay = 0;
    if (p.mode !== "all-time" && p.from && p.to) {
      const fromT = isoToTime(p.from);
      const toT = isoToTime(p.to);
      if (!isNaN(fromT) && !isNaN(toT)) {
        const days = Math.floor((toT - fromT) / (24 * 3600 * 1000)) + 1;
        if (days > 0) perDay = totalCost / days;
      }
    }

    return { totalKwh, totalCost, count, avgPrice, perDay };
  }

  function renderPeriodSummary(entriesForPeriod) {
    const box = $("summary_period");
    if (!box) return;

    const p = getActivePeriod();
    const st = computeStatsForEntries(entriesForPeriod);

    box.innerHTML = `
      <details open>
        <summary style="cursor:pointer;"><strong>Selected period (from Costs)</strong></summary>
        <div style="margin-top:6px;">
          <p style="margin:0 0 4px;color:#b0b0b0;">${p.label}</p>
          ${
            st.count
              ? `
                <p style="margin:0 0 4px;">
                  <strong>${U.fmtNum(st.totalKwh, 1)} kWh</strong> •
                  <strong>${U.fmtGBP(st.totalCost)}</strong> •
                  <strong>${st.count}</strong> sessions
                </p>
                <p style="margin:0;font-size:0.85rem;color:#b0b0b0;">
                  Avg price: <strong style="color:#f5f5f5;">£${st.avgPrice.toFixed(3)}</strong> / kWh
                  ${st.perDay > 0 ? ` • ~ <strong style="color:#f5f5f5;">${U.fmtGBP(st.perDay)}</strong> / day` : ""}
                </p>
              `
              : `<p style="margin:0;">No data for this period.</p>`
          }
        </div>
      </details>
      <p style="margin:8px 0 0;font-size:0.85rem;color:#b0b0b0;">
        Tip: Compare tab is still <strong>all-time</strong> for reliability.
      </p>
    `;
  }

  // ---------- rendering ----------

  function renderAll() {
    // Log table stays all-time (safe + expected)
    U.renderLogTable("logTable", state.entries);

    // Costs table = period-filtered + applies filter
    const filter = getCostFilterValue();

    let costsBase = state.costs || [];
    costsBase = filterByPeriod(costsBase, (c) => c.date);

    let costsToRender = costsBase;
    if (filter !== "all") {
      costsToRender = costsBase.filter((c) => {
        const a = (c.applies || "other").toLowerCase();
        return a === filter;
      });
    }

    U.renderCostTable("costTable", costsToRender);

    // Summary: keep original blocks (this/last/avg) from ALL entries
    const summary = C.buildSummary(state.entries);
    U.renderSummary(["summary_this", "summary_last", "summary_avg"], summary);

    // Summary: add Selected period block based on period-filtered entries
    ensurePeriodSummaryBlock();
    const entriesForPeriod = filterByPeriod(state.entries || [], (e) => e.date);
    renderPeriodSummary(entriesForPeriod);

    // Compare stays all-time (entries all-time)
    const cmp = C.buildCompare(state.entries, state.settings);

    const mt = computeMaintenanceTotals();
    cmp.maintEv = mt.ev;
    cmp.maintIce = mt.ice;
    cmp.maintBoth = mt.both;
    cmp.maintOther = mt.other;

    const ins = computeInsuranceTotals();
    cmp.insuranceEv = ins.ev;
    cmp.insuranceIce = ins.ice;
    cmp.insuranceBoth = ins.both;
    cmp.insuranceOther = ins.other;
    cmp.insuranceTotal = ins.total;

    U.renderCompare("compareStats", cmp);

    // maintenance totals from Costs (all time) – always for all costs
    renderMaintenanceTotalInCosts();
    renderMaintenanceTotalInCompare();

    // update badge
    renderPeriodBadge();
  }

  // ---------- add / update entry ----------

  function onAddEntry() {
    let date = $("date").value || todayISO();
    const kwh = parseFloat($("kwh").value);
    const type = $("type").value;
    let price = parseFloat($("price").value);
    const note = $("note").value.trim();

    if (isNaN(kwh) || kwh <= 0) {
      U.toast("Please enter kWh", "bad");
      return;
    }

    if (isNaN(price) || price <= 0) {
      price = autoPriceForType(type);
    }

    if (!currentEditId) {
      // normal add
      const entry = {
        id:
          window.crypto && window.crypto.randomUUID
            ? window.crypto.randomUUID()
            : "e_" + Date.now().toString(36),
        date,
        kwh,
        type,
        price,
        note
      };

      state.entries.push(entry);
      D.saveState(state);
      renderAll();
      U.toast("Entry added", "good");
    } else {
      // update existing
      const idx = state.entries.findIndex((e) => e.id === currentEditId);
      if (idx === -1) {
        U.toast("Entry to update not found", "bad");
        resetEditMode();
        return;
      }

      const entry = state.entries[idx];
      entry.date = date;
      entry.kwh = kwh;
      entry.type = type;
      entry.price = price;
      entry.note = note;

      D.saveState(state);
      renderAll();
      U.toast("Entry updated", "good");
      resetEditMode();
    }
  }

  function onSameAsLast() {
    if (!state.entries.length) {
      U.toast("No previous entry", "info");
      return;
    }
    const last = state.entries[state.entries.length - 1];
    $("date").value = last.date;
    $("kwh").value = last.kwh;
    $("type").value = last.type;
    $("price").value = last.price;
    $("note").value = last.note || "";
    U.toast("Filled from last", "info");
  }

  // ---------- add / update cost ----------

  function onAddCost() {
    const date = $("c_date").value || todayISO();
    const category = $("c_category").value;
    const amount = parseFloat($("c_amount").value);
    const note = $("c_note").value.trim();
    const applies = getAppliesFromForm();

    if (isNaN(amount) || amount <= 0) {
      U.toast("Please enter amount", "bad");
      return;
    }

    if (!currentEditCostId) {
      const cost = {
        id:
          window.crypto && window.crypto.randomUUID
            ? window.crypto.randomUUID()
            : "c_" + Date.now().toString(36),
        date,
        category,
        amount,
        note,
        applies
      };

      state.costs.push(cost);
      D.saveState(state);
      renderAll();
      U.toast("Cost added", "good");
    } else {
      const idx = state.costs.findIndex((c) => c.id === currentEditCostId);
      if (idx === -1) {
        U.toast("Cost to update not found", "bad");
        resetCostEditMode();
        return;
      }

      const cost = state.costs[idx];
      cost.date = date;
      cost.category = category;
      cost.amount = amount;
      cost.note = note;
      cost.applies = applies;

      D.saveState(state);
      renderAll();
      U.toast("Cost updated", "good");
      resetCostEditMode();
    }
  }

  // ---------- delete entry / cost ----------

  function handleDeleteEntry(id) {
    if (!id) {
      U.toast("Missing entry id", "bad");
      return;
    }
    const idx = state.entries.findIndex((e) => e.id === id);
    if (idx === -1) {
      U.toast("Entry not found", "bad");
      return;
    }
    const ok = window.confirm("Delete this entry?");
    if (!ok) return;

    state.entries.splice(idx, 1);
    if (currentEditId === id) {
      resetEditMode();
    }
    D.saveState(state);
    renderAll();
    U.toast("Entry deleted", "good");
  }

  function handleDeleteCost(id) {
    if (!id) {
      U.toast("Missing cost id", "bad");
      return;
    }
    const idx = state.costs.findIndex((c) => c.id === id);
    if (idx === -1) {
      U.toast("Cost not found", "bad");
      return;
    }
    const ok = window.confirm("Delete this cost?");
    if (!ok) return;

    state.costs.splice(idx, 1);
    if (currentEditCostId === id) {
      resetCostEditMode();
    }
    D.saveState(state);
    renderAll();
    U.toast("Cost deleted", "good");
  }

  function onLogTableClick(ev) {
    const target = ev.target;
    if (!target) return;
    const btn = target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");

    if (action === "delete-entry") {
      handleDeleteEntry(id);
    } else if (action === "edit-entry") {
      startEditEntry(id);
    }
  }

  function onCostTableClick(ev) {
    const target = ev.target;
    if (!target) return;
    const btn = target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");

    if (action === "delete-cost") {
      handleDeleteCost(id);
    } else if (action === "edit-cost") {
      startEditCost(id);
    }
  }

  // ---------- CSV export helpers ----------

  function csvEscape(value) {
    if (value == null) return "";
    const s = String(value);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function downloadCSV(filename, csvText) {
    try {
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      U.toast("CSV exported", "good");
    } catch (e) {
      console.error("CSV download failed", e);
      U.toast("CSV export failed", "bad");
    }
  }

  function exportEntriesCSV() {
    if (!state.entries.length) {
      U.toast("No entries to export", "info");
      return;
    }

    const header = [
      "Date",
      "kWh",
      "Type",
      "Price_per_kWh",
      "Cost",
      "Note"
    ];

    const rows = state.entries
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => {
        const cost = (e.kwh || 0) * (e.price || 0);
        return [
          csvEscape(e.date || ""),
          csvEscape(e.kwh != null ? e.kwh : ""),
          csvEscape(e.type || ""),
          csvEscape(e.price != null ? e.price : ""),
          csvEscape(cost),
          csvEscape(e.note || "")
        ].join(",");
      });

    const csv = [header.join(","), ...rows].join("\n");
    const today = todayISO();
    const filename = `ev_log_entries_${today}.csv`;
    downloadCSV(filename, csv);
  }

  function exportCostsCSV() {
    if (!state.costs.length) {
      U.toast("No costs to export", "info");
      return;
    }

    const header = ["Date", "Category", "Amount", "Note", "AppliesTo"];

    const rows = state.costs
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((c) => {
        return [
          csvEscape(c.date || ""),
          csvEscape(c.category || ""),
          csvEscape(c.amount != null ? c.amount : ""),
          csvEscape(c.note || ""),
          csvEscape(c.applies || "other")
        ].join(",");
      });

    const csv = [header.join(","), ...rows].join("\n");
    const today = todayISO();
    const filename = `ev_log_costs_${today}.csv`;
    downloadCSV(filename, csv);
  }

  function ensureExportButtons() {
    const logTable = $("logTable");
    if (logTable && !$("exportEntriesCsv")) {
      const btn = document.createElement("button");
      btn.id = "exportEntriesCsv";
      btn.textContent = "Export log CSV";
      btn.type = "button";
      btn.style.marginTop = "6px";
      btn.addEventListener("click", exportEntriesCSV);
      if (logTable.parentNode) {
        logTable.parentNode.insertBefore(btn, logTable.nextSibling);
      }
    }

    const costTable = $("costTable");
    if (costTable && !$("exportCostsCsv")) {
      const btn2 = document.createElement("button");
      btn2.id = "exportCostsCsv";
      btn2.textContent = "Export costs CSV";
      btn2.type = "button";
      btn2.style.marginTop = "6px";
      btn2.addEventListener("click", exportCostsCSV);
      if (costTable.parentNode) {
        costTable.parentNode.insertBefore(btn2, costTable.nextSibling);
      }
    }
  }

  // ---------- backup / restore ----------

  async function exportBackup() {
    try {
      const backup = JSON.stringify(state);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(backup);
        U.toast("Backup copied to clipboard", "good");
      } else {
        const ok = window.prompt("Backup JSON (copy this):", backup);
        if (ok !== null) {
          U.toast("Backup shown (copy manually)", "info");
        }
      }
    } catch (e) {
      console.error(e);
      U.toast("Backup failed", "bad");
    }
  }

  function importBackup() {
    const raw = window.prompt(
      "Paste backup JSON here. Current data will be replaced."
    );
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw);

      if (
        typeof parsed !== "object" ||
        !parsed ||
        !Array.isArray(parsed.entries) ||
        !parsed.settings
      ) {
        U.toast("Invalid backup format", "bad");
        return;
      }

      state.entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      state.costs = Array.isArray(parsed.costs) ? parsed.costs : [];
      state.settings = Object.assign({}, state.settings, parsed.settings);

      // preserve UI sub-state if missing
      if (!state.ui) state.ui = {};
      if (!state.ui.periodMode) state.ui.periodMode = "this-month";
      if (!state.ui.periodFrom) state.ui.periodFrom = "";
      if (!state.ui.periodTo) state.ui.periodTo = "";

      ensureCostAppliesDefaults();

      D.saveState(state);
      syncSettingsToInputs();
      renderAll();
      resetEditMode();
      resetCostEditMode();
      U.toast("Backup restored", "good");
    } catch (e) {
      console.error(e);
      U.toast("Import failed", "bad");
    }
  }

  // ---------- wiring ----------

  function wire() {
    $("date").value = todayISO();
    $("c_date").value = todayISO();

    // по подразбиране OTHER за нови разходи
    const appliesSelect = $("c_applies");
    if (appliesSelect && !appliesSelect.value) {
      appliesSelect.value = "other";
    }

    $("addEntry").addEventListener("click", onAddEntry);
    $("sameAsLast").addEventListener("click", onSameAsLast);

    $("c_add").addEventListener("click", onAddCost);

    $("savePrices").addEventListener("click", saveSettingsFromInputs);
    $("exportBackup").addEventListener("click", exportBackup);
    $("importBackup").addEventListener("click", importBackup);

    const logContainer = $("logTable");
    if (logContainer) {
      logContainer.addEventListener("click", onLogTableClick);
    }

    const costContainer = $("costTable");
    if (costContainer) {
      costContainer.addEventListener("click", onCostTableClick);
    }

    syncSettingsToInputs();
    wireTabs();

    ensurePeriodControls();       // NEW
    ensureCostFilterControls();

    renderAll();
    ensureExportButtons();
    resetEditMode();
    resetCostEditMode();

    // set initial badge after controls exist
    renderPeriodBadge();
  }

  wire();
})();