// ui-summary.js – Summary UI (compact + collapsible) + EV vs ICE quick view

(function () {
  const U = window.EVUI || {};
  if (!U) return;

  function renderSummary(containerIds, summary, quickCompare) {
    const [idThis, idLast, idAvg] = containerIds.map((id) =>
      document.getElementById(id)
    );
    if (!idThis || !idLast || !idAvg) return;

    function compactLines(data) {
      if (!data) return "<p>No data.</p>";

      const kwh = U.fmtNum ? U.fmtNum(data.kwh, 1) : (data.kwh || 0).toFixed(1);
      const cost = U.fmtGBP ? U.fmtGBP(data.cost) : "£" + (data.cost || 0).toFixed(2);
      const count = data.count != null ? data.count : null;

      const avgPrice =
        data.avgPrice && data.avgPrice > 0 ? `£${data.avgPrice.toFixed(3)}/kWh` : null;

      const perDay =
        data.perDay && data.perDay > 0 ? (U.fmtGBP ? U.fmtGBP(data.perDay) : "£" + data.perDay.toFixed(2)) + "/day" : null;

      return `
        <p style="margin:0 0 4px;">
          <strong>${kwh} kWh</strong> • <strong>${cost}</strong>
          ${count != null ? ` • <strong>${count}</strong> sessions` : ""}
        </p>
        <p style="margin:0;font-size:0.85rem;color:#b0b0b0;">
          ${avgPrice ? `Avg: <strong style="color:#f5f5f5;">${avgPrice}</strong>` : "Avg: n/a"}
          ${perDay ? ` • ~ <strong style="color:#f5f5f5;">${perDay}</strong>` : ""}
        </p>
      `;
    }

    // ---- This month ----
    idThis.innerHTML = `
      <details open>
        <summary style="cursor:pointer;"><strong>This month</strong></summary>
        <div style="margin-top:6px;">
          ${compactLines(summary.thisMonth)}
        </div>
      </details>
    `;

    // ---- Last month ----
    idLast.innerHTML = `
      <details>
        <summary style="cursor:pointer;"><strong>Last month</strong></summary>
        <div style="margin-top:6px;">
          ${compactLines(summary.lastMonth)}
        </div>
      </details>
    `;

    // ---- Average ----
    idAvg.innerHTML = `
      <details>
        <summary style="cursor:pointer;"><strong>Average (all months)</strong></summary>
        <div style="margin-top:6px;">
          ${
            summary.avg
              ? `
                <p style="margin:0 0 4px;">
                  <strong>${U.fmtNum(summary.avg.kwh, 1)} kWh</strong> •
                  <strong>${U.fmtGBP(summary.avg.cost)}</strong>
                </p>
                <p style="margin:0;font-size:0.85rem;color:#b0b0b0;">
                  Avg price: <strong style="color:#f5f5f5;">£${summary.avg.avgPrice.toFixed(
                    3
                  )}</strong> / kWh
                </p>
              `
              : "<p>No data.</p>"
          }
        </div>
      </details>
    `;

    // ---- EV vs ICE quick view (new, under Average) ----
    // We insert after the avg container, so we don't need extra HTML ids in index.html.
    try {
      const parent = idAvg.parentNode;
      if (!parent) return;

      let box = document.getElementById("summaryQuickCompare");
      if (!box) {
        box = document.createElement("div");
        box.id = "summaryQuickCompare";
        // mimic your card look (no need to touch styles.css)
        box.style.borderRadius = "18px";
        box.style.border = "1px solid #222";
        box.style.background = "#080808";
        box.style.padding = "10px 12px";
        box.style.marginBottom = "10px";
        box.style.fontSize = "0.9rem";

        // insert right after #summary_avg block
        if (idAvg.nextSibling) parent.insertBefore(box, idAvg.nextSibling);
        else parent.appendChild(box);
      }

      if (!quickCompare || !quickCompare.hasData) {
        box.innerHTML = `
          <p style="margin:0;"><strong>EV vs ICE (quick view)</strong></p>
          <p style="margin:6px 0 0;font-size:0.85rem;color:#b0b0b0;">
            Not enough data yet.
          </p>
        `;
        return;
      }

      const diffAbs = Math.abs(quickCompare.diffAll || 0);
      const diffText = quickCompare.diffText || "about the same";
      const perText = quickCompare.perText || "about the same per 1000 miles";

      box.innerHTML = `
        <p style="margin:0 0 6px;"><strong>EV vs ICE (quick view)</strong></p>

        <p style="margin:0 0 6px;">
          All-in difference (ICE – EV):
          <strong>${U.fmtGBP(diffAbs)}</strong>
          <span style="color:#b0b0b0;">(${diffText})</span>
        </p>

        <p style="margin:0;">
          Per 1000 miles:
          EV <strong>${U.fmtGBP(quickCompare.per1000Ev || 0)}</strong>,
          ICE <strong>${U.fmtGBP(quickCompare.per1000Ice || 0)}</strong>
          <span style="color:#b0b0b0;">(${perText})</span>
        </p>

        <p style="margin:8px 0 0;font-size:0.85rem;color:#b0b0b0;">
          Tip: open <strong>Compare</strong> tab for full breakdown.
        </p>
      `;
    } catch (e) {
      // do not break summary if something goes wrong
      console && console.warn && console.warn("summaryQuickCompare failed", e);
    }
  }

  // attach/override
  window.EVUI = window.EVUI || {};
  window.EVUI.renderSummary = renderSummary;
})();