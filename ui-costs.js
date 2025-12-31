// ui-costs.js – render maintenance costs

(function (E) {
  function renderCostTable(containerId, costs) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!costs || !costs.length) {
      el.innerHTML = "<p>No costs yet.</p>";
      return;
    }

    // NEWEST FIRST (descending)
    const sorted = costs
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const rows = sorted.map((c) => {
      const safeNote = c.note ? c.note.replace(/</g, "&lt;") : "";
      const idAttr = c.id ? String(c.id) : "";

      const appliesRaw = (c.applies || "other").toLowerCase();
      let appliesLabel = "Other";
      if (appliesRaw === "ev") appliesLabel = "EV";
      else if (appliesRaw === "ice") appliesLabel = "ICE";
      else if (appliesRaw === "both") appliesLabel = "Both";
      else appliesLabel = "Other";

      return `<tr>
        <td>${E.fmtDate(c.date)}</td>
        <td><span class="badge">${c.category}</span></td>
        <td><span class="badge">${appliesLabel}</span></td>
        <td>${E.fmtGBP(c.amount)}</td>
        <td>${safeNote}</td>
        <td class="actcol">
          <button
            type="button"
            class="btn-mini"
            data-action="edit-cost"
            data-id="${idAttr}"
            title="Edit this cost"
            aria-label="Edit"
          ><span class="ico">✎</span><span class="txt"> Edit</span></button>
          <button
            type="button"
            class="btn-mini danger"
            data-action="delete-cost"
            data-id="${idAttr}"
            title="Delete this cost"
            aria-label="Delete"
          >✕</button>
        </td>
      </tr>`;
    });

    const total = sorted.reduce((s, c) => s + (c.amount || 0), 0);

    // totals by category
    const catMap = new Map();
    for (const c of sorted) {
      const key = c.category || "Other";
      const prev = catMap.get(key) || 0;
      catMap.set(key, prev + (c.amount || 0));
    }

    const catRows = Array.from(catMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(
        ([cat, sum]) => `<tr>
          <td>${cat}</td>
          <td>${E.fmtGBP(sum)}</td>
        </tr>`
      );

    const legendInner = `
      <p class="small" style="margin-top:8px;line-height:1.35;">
        <strong>For</strong> means which vehicle the cost applies to:
        <strong>EV</strong> = electric car only,
        <strong>ICE</strong> = petrol/diesel car only,
        <strong>Both</strong> = shared/combined cost,
        <strong>Other</strong> = not tied to a specific car.
      </p>
    `;

    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>For</th>
            <th>£</th>
            <th>Note</th>
            <th class="actcol">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join("")}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td>Total</td>
            <td></td>
            <td></td>
            <td>${E.fmtGBP(total)}</td>
            <td></td>
            <td class="actcol"></td>
          </tr>
        </tfoot>
      </table>

      <details style="margin-top:10px;">
        <summary style="cursor:pointer;"><strong>Totals by category</strong></summary>
        <div style="margin-top:6px;">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Total £</th>
              </tr>
            </thead>
            <tbody>
              ${catRows.join("")}
            </tbody>
          </table>
        </div>
      </details>

      <details style="margin-top:10px;">
        <summary style="cursor:pointer;"><strong>What does “For” mean?</strong></summary>
        <div style="margin-top:6px;">
          ${legendInner}
        </div>
      </details>
    `;
  }

  E.renderCostTable = renderCostTable;
})(window.EVUI || (window.EVUI = {}));

