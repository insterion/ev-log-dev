// ui-logs.js
// Responsible ONLY for Logs UI: render table + filtering UI (Apply / Clear)

(function () {
  const U = window.EVUI;

  // -------------------------
  // Internal filter state
  // -------------------------
  const logFilterState = {
    text: "",
    type: "all",
    active: false
  };

  // -------------------------
  // Public API
  // -------------------------
  window.EVUI.renderLogTable = renderLogTable;
  window.EVUI.ensureLogFilters = ensureLogFilters;
  window.EVUI.applyLogFilter = applyLogFilter;
  window.EVUI.clearLogFilter = clearLogFilter;
  window.EVUI.getFilteredLogs = getFilteredLogs;

  // -------------------------
  // UI creation
  // -------------------------
  function ensureLogFilters(containerId = "logTable") {
    if (document.getElementById("logFilters")) return;

    const table = document.getElementById(containerId);
    if (!table || !table.parentNode) return;

    const wrapper = document.createElement("div");
    wrapper.id = "logFilters";
    wrapper.style.marginBottom = "8px";

    wrapper.innerHTML = `
      <div class="section-block">
        <label>Search</label>
        <input type="text" id="logSearch" placeholder="note / place">
      </div>

      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap">
        <select id="logType">
          <option value="all">All</option>
          <option value="drive">Drive</option>
          <option value="charge">Charge</option>
          <option value="other">Other</option>
        </select>

        <button id="logApply">Apply</button>
        <button id="logClear">Clear</button>
      </div>

      <div id="logFilterActive"
           style="display:none; margin-top:6px; font-size:0.85rem; color:#b0b0b0">
      </div>
    `;

    table.parentNode.insertBefore(wrapper, table);

    document.getElementById("logApply")
      .addEventListener("click", applyLogFilter);

    document.getElementById("logClear")
      .addEventListener("click", clearLogFilter);
  }

  // -------------------------
  // Apply / Clear
  // -------------------------
  function applyLogFilter() {
    const textEl = document.getElementById("logSearch");
    const typeEl = document.getElementById("logType");

    logFilterState.text = (textEl.value || "").trim().toLowerCase();
    logFilterState.type = typeEl.value;
    logFilterState.active =
      logFilterState.text !== "" || logFilterState.type !== "all";

    updateActiveIndicator();
    U.renderAll();
  }

  function clearLogFilter() {
    logFilterState.text = "";
    logFilterState.type = "all";
    logFilterState.active = false;

    const textEl = document.getElementById("logSearch");
    const typeEl = document.getElementById("logType");

    if (textEl) textEl.value = "";
    if (typeEl) typeEl.value = "all";

    updateActiveIndicator();
    U.renderAll();
  }

  // -------------------------
  // Indicator
  // -------------------------
  function updateActiveIndicator() {
    const el = document.getElementById("logFilterActive");
    if (!el) return;

    if (!logFilterState.active) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }

    let parts = [];
    if (logFilterState.text) {
      parts.push(`Text: "${logFilterState.text}"`);
    }
    if (logFilterState.type !== "all") {
      parts.push(`Type: ${logFilterState.type.toUpperCase()}`);
    }

    el.textContent = "🔍 Filter active – " + parts.join(", ");
    el.style.display = "block";
  }

  // -------------------------
  // Filtering logic (PURE)
  // -------------------------
  function getFilteredLogs(logs) {
    if (!logFilterState.active) return logs;

    return (logs || []).filter((l) => {
      if (!l) return false;

      if (logFilterState.type !== "all") {
        const t = (l.type || "other").toLowerCase();
        if (t !== logFilterState.type) return false;
      }

      if (logFilterState.text) {
        const hay =
          (l.note || "").toLowerCase() +
          " " +
          (l.place || "").toLowerCase();
        if (!hay.includes(logFilterState.text)) return false;
      }

      return true;
    });
  }

  // -------------------------
  // Table render
  // -------------------------
  function renderLogTable(containerId, logs) {
    const table = document.getElementById(containerId);
    if (!table) return;

    table.innerHTML = "";

    if (!logs || !logs.length) {
      table.innerHTML =
        "<tr><td colspan='6' style='opacity:.6'>No entries</td></tr>";
      return;
    }

    const header = document.createElement("tr");
    header.innerHTML = `
      <th>Date</th>
      <th>Type</th>
      <th>Distance / kWh</th>
      <th>From → To</th>
      <th>Note</th>
      <th></th>
    `;
    table.appendChild(header);

    logs.forEach((l) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${l.date || ""}</td>
        <td><span class="badge">${(l.type || "other").toUpperCase()}</span></td>
        <td>${l.value || ""}</td>
        <td>${l.from || ""} → ${l.to || ""}</td>
        <td>${l.note || ""}</td>
        <td>
          <button data-action="edit-log" data-id="${l.id}">✏️</button>
          <button data-action="delete-log" data-id="${l.id}">🗑</button>
        </td>
      `;
      table.appendChild(tr);
    });
  }
})();