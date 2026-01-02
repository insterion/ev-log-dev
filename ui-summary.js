// ui-summary.js – Summary UI (compact + collapsible) + EV vs ICE quick view (clear labels)

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
        data.perDay && data.perDay > 0
          ? (U.fmtGBP ? U.fmtGBP(data.perDay) : "£" + data.perDay.toFixed(2)) + "/day"
          : null;

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

    // ---- EV vs ICE quick view (insert after Average) ----
    try {
      const parent = idAvg.parentNode;
      if (!parent) return;

      let box = document.getElementById("summaryQuickCompare");
      if (!box) {
        box = document.createElement("div");
        box.id = "summaryQuickCompare";
        box.style.borderRadius = "18px";
        box.style.border = "1px solid #222";
        box.style.background = "#080808";
        box.style.padding = "10px 12px";
        box.style.marginBottom = "10px";
        box.style.fontSize = "0.9rem";

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

      box.innerHTML = `
        <p style="margin:0 0 6px;"><strong>EV vs ICE (quick view)</strong></p>

        <p style="margin:0 0 6px;">
          All-in (ICE – EV): <strong>${U.fmtGBP(diffAbs)}</strong>
          <span style="color:#b0b0b0;">(${quickCompare.diffText})</span>
        </p>

        <p style="margin:0 0 6px;">
          Energy per 1000 miles: EV <strong>${U.fmtGBP(quickCompare.per1000EvEnergy)}</strong>,
          ICE <strong>${U.fmtGBP(quickCompare.per1000IceEnergy)}</strong>
          <span style="color:#b0b0b0;">(${quickCompare.perEnergyText})</span>
        </p>

        <p style="margin:0;">
          All-in per 1000 miles: EV <strong>${U.fmtGBP(quickCompare.per1000EvAllIn)}</strong>,
          ICE <strong>${U.fmtGBP(quickCompare.per1000IceAllIn)}</strong>
          <span style="color:#b0b0b0;">(${quickCompare.perAllInText})</span>
        </p>

        <p style="margin:8px 0 0;font-size:0.85rem;color:#b0b0b0;">
          All-in includes maintenance. For details, open <strong>Compare</strong>.
        </p>
      `;
    } catch (e) {
      console && console.warn && console.warn("summaryQuickCompare failed", e);
    }
  }

  window.EVUI = window.EVUI || {};
  window.EVUI.renderSummary = renderSummary;
})();