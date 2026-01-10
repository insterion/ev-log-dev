// ui-costs.js
// Responsible ONLY for Costs UI: render table + filtering UI (Apply / Clear)
// Does NOT auto-filter on typing (mobile-safe)

(function () {
  const U = window.EVUI;

  // -------------------------
  // Internal filter state
  // -------------------------
  const costFilterState = {
    text: "",
    applies: "all",
    active: false
  };

  // -------------------------
  // Public API
  // -------------------------
  window.EVUI.renderCostTable = renderCostTable;
  window.EVUI.ensureCostFilters = ensureCostFilters;
  window.EVUI.applyCostFilter = applyCostFilter;
  window.EVUI.clearCostFilter = clearCostFilter;
  window.EVUI.getFilteredCosts = getFilteredCosts;

  // -------------------------
  // UI creation
  // -------------------------
  function ensureCostFilters(containerId = "costTable") {
    if (document.getElementById("costFilters")) return;

    const table = document.getElementById(containerId);
    if (!table || !table.parentNode) return;

    const wrapper = document.createElement("div");
    wrapper.id = "costFilters";
    wrapper.style.marginBottom = "8px";

    wrapper.innerHTML = `
      <div class="section-block">
        <label>Search</label>
        <input type="text" id="costSearch" placeholder="category / note">
      </div>

      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap">
        <select id="costApplies">
          <option value="all">All</option>
          <option value="ev">EV</option>
          <option value="ice">ICE</option>
          <option value="both">Both</option>
          <option value="other">Other</option>
        </select>

        <button id="costApply">Apply</button>
        <button id="costClear">Clear</button>
      </div>

      <div id="costFilterActive" style="display:none; margin-top:6px; font-size:0.85rem; color:#b0b0b0"></div>
    `;

    table.parentNode.insertBefore(wrapper, table);

    document.getElementById("costApply").addEventListener("click", applyCostFilter);
    document.getElementById("costClear").addEventListener("click", clearCostFilter);
  }

  // -------------------------
  // Apply / Clear
  // -------------------------
  function applyCostFilter() {
    const textEl = document.getElementById("costSearch");
    const appliesEl = document.getElementById("costApplies");

    costFilterState.text = (textEl.value || "").trim().toLowerCase();
    costFilterState.applies = appliesEl.value;
    costFilterState.active =
      costFilterState.text !== "" || costFilterState.applies !== "all";

    updateActiveIndicator();
    U.renderAll(); // delegated – safe, single render
  }

  function clearCostFilter() {
    costFilterState.text = "";
    costFilterState.applies = "all";
    costFilterState.active = false;

    const textEl = document.getElementById("costSearch");
    const appliesEl = document.getElementById("costApplies");

    if (textEl) textEl.value = "";
    if (appliesEl) appliesEl.value = "all";

    updateActiveIndicator();
    U.renderAll();
  }

  // -------------------------
  // Indicator
  // -------------------------
  function updateActiveIndicator() {
    const el = document.getElementById("costFilterActive");
    if (!el) return;

    if (!costFilterState.active) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }

    let parts = [];
    if (costFilterState.text) {
      parts.push(`Text: "${costFilterState.text}"`);
    }
    if (costFilterState.applies !== "all") {
      parts.push(`Applies: ${costFilterState.applies.toUpperCase()}`);
    }

    el.textContent = "🔍 Filter active – " + parts.join(", ");
    el.style.display = "block";
  }

  // -------------------------
  // Filtering logic (PURE)
  // -------------------------
  function getFilteredCosts(costs) {
    if (!costFilterState.active) return costs;

    return (costs || []).filter((c) => {
      if (!c) return false;

      if (costFilterState.applies !== "all") {
        const a = (c.applies || "other").toLowerCase();
        if (a !== costFilterState.applies) return false;
      }

      if (costFilterState.text) {
        const hay =
          (c.category || "").toLowerCase() +
          " " +
          (c.note || "").toLowerCase();
        if (!hay.includes(costFilterState.text)) return false;
      }

      return true;
    });
  }

  // -------------------------
  // Table render
  // -------------------------
  function renderCostTable(containerId, costs) {
    const table = document.getElementById(containerId);
    if (!table) return;

    table.innerHTML = "";

    if (!costs || !costs.length) {
      table.innerHTML =
        "<tr><td colspan='5' style='opacity:.6'>No costs</td></tr>";
      return;
    }

    const header = document.createElement("tr");
    header.innerHTML = `
      <th>Date</th>
      <th>Category</th>
      <th>Amount</th>
      <th>Applies</th>
      <th></th>
    `;
    table.appendChild(header);

    costs.forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.date || ""}</td>
        <td>${c.category || ""}</td>
        <td>${U.fmtGBP(c.amount || 0)}</td>
        <td><span class="badge">${(c.applies || "other").toUpperCase()}</span></td>
        <td>
          <button data-action="edit-cost" data-id="${c.id}">✏️</button>
          <button data-action="delete-cost" data-id="${c.id}">🗑</button>
        </td>
      `;
      table.appendChild(tr);
    });
  }
})();