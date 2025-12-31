// ui-summary.js – render monthly summaries

(function (E) {
  function renderSummary(containerIds, summary) {
    const [idThis, idLast, idAvg] = containerIds.map((id) =>
      document.getElementById(id)
    );
    if (!idThis || !idLast || !idAvg) return;

    function compactLines(data) {
      if (!data) return "<p>No data.</p>";

      const kwh = E.fmtNum(data.kwh, 1);
      const cost = E.fmtGBP(data.cost);
      const count = data.count != null ? data.count : null;

      const avgPrice =
        data.avgPrice && data.avgPrice > 0
          ? `£${data.avgPrice.toFixed(3)}/kWh`
          : null;

      const perDay =
        data.perDay && data.perDay > 0
          ? E.fmtGBP(data.perDay) + "/day"
          : null;

      return `
        <p style="margin:0 0 4px;">
          <strong>${kwh} kWh</strong> • <strong>${cost}</strong>
          ${count != null ? ` • <strong>${count}</strong> sessions` : ""}
        </p>
        <p style="margin:0;font-size:0.85rem;color:#b0b0b0;">
          ${
            avgPrice
              ? `Avg: <strong style="color:#f5f5f5;">${avgPrice}</strong>`
              : "Avg: n/a"
          }
          ${
            perDay
              ? ` • ~ <strong style="color:#f5f5f5;">${perDay}</strong>`
              : ""
          }
        </p>
      `;
    }

    idThis.innerHTML = `
      <details open>
        <summary style="cursor:pointer;"><strong>This month</strong></summary>
        <div style="margin-top:6px;">
          ${compactLines(summary.thisMonth)}
        </div>
      </details>
    `;

    idLast.innerHTML = `
      <details>
        <summary style="cursor:pointer;"><strong>Last month</strong></summary>
        <div style="margin-top:6px;">
          ${compactLines(summary.lastMonth)}
        </div>
      </details>
    `;

    idAvg.innerHTML = `
      <details>
        <summary style="cursor:pointer;"><strong>Average (all months)</strong></summary>
        <div style="margin-top:6px;">
          ${
            summary.avg
              ? `
                <p style="margin:0 0 4px;">
                  <strong>${E.fmtNum(summary.avg.kwh, 1)} kWh</strong> •
                  <strong>${E.fmtGBP(summary.avg.cost)}</strong>
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
  }

  E.renderSummary = renderSummary;
})(window.EVUI || (window.EVUI = {}));

