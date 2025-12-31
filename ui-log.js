// ui-log.js – render charging log

(function (E) {
  function renderLogTable(containerId, entries) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!entries || !entries.length) {
      el.innerHTML = "<p>No entries yet.</p>";
      return;
    }

    // NEWEST FIRST (descending)
    const rows = entries
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map((e) => {
        const typeLabel =
          e.type === "public"
            ? "Public"
            : e.type === "public-xp"
            ? "Public xp"
            : e.type === "home"
            ? "Home"
            : "Home xp";

        const cost = (e.kwh || 0) * (e.price || 0);
        const safeNote = e.note ? e.note.replace(/</g, "&lt;") : "";
        const idAttr = e.id ? String(e.id) : "";

        return `<tr>
          <td>${E.fmtDate(e.date)}</td>
          <td>${E.fmtNum(e.kwh, 1)}</td>
          <td><span class="badge">${typeLabel}</span></td>
          <td>${E.fmtGBP(cost)}</td>
          <td>${safeNote}</td>
          <td class="actcol">
            <button
              type="button"
              class="btn-mini"
              data-action="edit-entry"
              data-id="${idAttr}"
              title="Edit this entry"
              aria-label="Edit"
            ><span class="ico">✎</span><span class="txt"> Edit</span></button>
            <button
              type="button"
              class="btn-mini danger"
              data-action="delete-entry"
              data-id="${idAttr}"
              title="Delete this entry"
              aria-label="Delete"
            >✕</button>
          </td>
        </tr>`;
      });

    const totalKwh = (entries || []).reduce((s, e) => s + (e.kwh || 0), 0);
    const totalCost = (entries || []).reduce(
      (s, e) => s + ((e.kwh || 0) * (e.price || 0)),
      0
    );
    const sessions = entries.length;

    const summaryBlock = `
      <details open style="margin:4px 0 8px;">
        <summary style="cursor:pointer;color:#cccccc;">
          <strong>Total so far</strong>
        </summary>
        <div style="margin-top:6px;font-size:0.85rem;color:#cccccc;">
          <p style="margin:0;">
            <strong>${E.fmtNum(totalKwh, 1)} kWh</strong> •
            <strong>${E.fmtGBP(totalCost)}</strong> •
            <strong>${sessions}</strong> sessions
          </p>
        </div>
      </details>
    `;

    el.innerHTML = `
      ${summaryBlock}
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>kWh</th>
            <th>Type</h>
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
            <td>${E.fmtNum(totalKwh, 1)}</td>
            <td></td>
            <td>${E.fmtGBP(totalCost)}</td>
            <td></td>
            <td class="actcol"></td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  E.renderLogTable = renderLogTable;
})(window.EVUI || (window.EVUI = {}));

