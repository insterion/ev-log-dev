// ui-compare.js – render compare (collapsible)

(function () {
  const U = window.EVUI;

  function renderCompare(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!data || isNaN(data.evCost)) {
      el.innerHTML = "<p>Not enough data yet.</p>";
      return;
    }

    const miles = Number(data.miles || 0);

    const evPerMile = miles > 0 ? (data.evPerMile ?? data.evCost / miles) : 0;
    const icePerMile = miles > 0 ? (data.icePerMile ?? data.iceCost / miles) : 0;

    const diffEnergy = (Number(data.iceCost) || 0) - (Number(data.evCost) || 0);

    const maintEv = Number(data.maintEv ?? 0);
    const maintIce = Number(data.maintIce ?? 0);
    const maintBoth = Number(data.maintBoth ?? 0);
    const maintOther = Number(data.maintOther ?? 0);

    const evTotalAll = (Number(data.evCost) || 0) + maintEv;
    const iceTotalAll = (Number(data.iceCost) || 0) + maintIce;
    const diffAll = iceTotalAll - evTotalAll;

    const insEv = Number(data.insuranceEv ?? 0);
    const insIce = Number(data.insuranceIce ?? 0);
    const insBoth = Number(data.insuranceBoth ?? 0);
    const insOther = Number(data.insuranceOther ?? 0);
    const insTotal = Number(data.insuranceTotal ?? 0);
    const insDiff = insIce - insEv;

    // Quick summary
    let topSummary = "";
    if (miles > 0) {
      const per1000Ev = evPerMile * 1000;
      const per1000Ice = icePerMile * 1000;
      const per1000Diff = per1000Ice - per1000Ev;

      let perText = "about the same per 1000 miles";
      if (per1000Diff > 1) perText = "ICE more expensive per 1000 miles";
      else if (per1000Diff < -1) perText = "EV more expensive per 1000 miles";

      let allText = "about the same overall";
      if (diffAll > 1) allText = "ICE more expensive overall";
      else if (diffAll < -1) allText = "EV more expensive overall";

      topSummary = `
        <div style="margin-bottom:8px;padding:6px 8px;border-radius:12px;background:#0a0a0a;border:1px solid #222;">
          <p style="margin:0 0 4px;"><strong>Quick summary</strong></p>
          <p style="margin:0 0 3px;">
            All-in difference (ICE – EV): <strong>${U.fmtGBP(Math.abs(diffAll))}</strong> (${allText})
          </p>
          <p style="margin:0;">
            Per 1000 miles: EV <strong>${U.fmtGBP(per1000Ev)}</strong>, ICE <strong>${U.fmtGBP(per1000Ice)}</strong> (${perText})
          </p>
        </div>
      `;
    }

    let energyExplain = "";
    if (diffEnergy > 1) {
      energyExplain = `ICE would cost <strong>${U.fmtGBP(diffEnergy)}</strong> more for your recorded EV miles.`;
    } else if (diffEnergy < -1) {
      energyExplain = `EV would cost <strong>${U.fmtGBP(Math.abs(diffEnergy))}</strong> more than ICE (check assumptions).`;
    } else {
      energyExplain = `EV and ICE are roughly the same cost for your recorded EV miles.`;
    }

    const energyBlock = `
      <details open>
        <summary style="cursor:pointer;"><strong>Energy vs ICE (details)</strong></summary>
        <div style="margin-top:6px;">
          <p>Total kWh (all time): <strong>${U.fmtNum(data.totalKwh, 1)}</strong></p>
          <p>Estimated miles (@ ${U.fmtNum(data.evMilesPerKwh, 1)} mi/kWh): <strong>${U.fmtNum(miles, 0)}</strong></p>
          <p>EV energy cost: <strong>${U.fmtGBP(data.evCost)}</strong></p>
          <p>ICE fuel cost (approx): <strong>${U.fmtGBP(data.iceCost)}</strong></p>
          <p>EV £/mile: <strong>£${Number(evPerMile).toFixed(3)}</strong></p>
          <p>ICE £/mile: <strong>£${Number(icePerMile).toFixed(3)}</strong></p>
          <p>Difference (ICE – EV): <strong>${U.fmtGBP(Math.abs(diffEnergy))}</strong></p>
          <p>${energyExplain}</p>
        </div>
      </details>
    `;

    let maintBlock = "";
    if (maintEv !== 0 || maintIce !== 0 || maintBoth !== 0 || maintOther !== 0) {
      maintBlock = `
        <details>
          <summary style="cursor:pointer;"><strong>Maintenance (details)</strong></summary>
          <div style="margin-top:6px;">
            <p>Maintenance – EV: <strong>${U.fmtGBP(maintEv)}</strong>, ICE: <strong>${U.fmtGBP(maintIce)}</strong></p>
            <p>Shared (Both): <strong>${U.fmtGBP(maintBoth)}</strong>, Other: <strong>${U.fmtGBP(maintOther)}</strong></p>
            <p>Total EV (energy + EV maintenance): <strong>${U.fmtGBP(evTotalAll)}</strong></p>
            <p>Total ICE (fuel + ICE maintenance): <strong>${U.fmtGBP(iceTotalAll)}</strong></p>
            <p>All-in difference (ICE – EV): <strong>${U.fmtGBP(Math.abs(diffAll))}</strong></p>
          </div>
        </details>
      `;
    }

    let insuranceBlock = "";
    if (insEv !== 0 || insIce !== 0 || insBoth !== 0 || insOther !== 0) {
      let insDiffText = "about the same";
      if (insDiff > 1) insDiffText = "ICE insurance higher";
      else if (insDiff < -1) insDiffText = "EV insurance higher";

      insuranceBlock = `
        <details>
          <summary style="cursor:pointer;"><strong>Insurance (details)</strong></summary>
          <div style="margin-top:6px;">
            <p>Insurance – EV: <strong>${U.fmtGBP(insEv)}</strong>, ICE: <strong>${U.fmtGBP(insIce)}</strong></p>
            <p>Shared (Both): <strong>${U.fmtGBP(insBoth)}</strong>, Other: <strong>${U.fmtGBP(insOther)}</strong></p>
            <p>Total insurance: <strong>${U.fmtGBP(insTotal)}</strong></p>
            <p>Difference (ICE – EV): <strong>${U.fmtGBP(Math.abs(insDiff))}</strong> (${insDiffText})</p>
          </div>
        </details>
      `;
    }

    el.innerHTML = `
      ${topSummary}
      ${energyBlock}
      ${maintBlock}
      ${insuranceBlock}
      <p style="margin-top:10px;font-size:0.85rem;color:#b0b0b0;">
        Assumptions: ICE ${data.iceMpg} mpg, £${Number(data.icePerLitre).toFixed(2)}/litre unleaded, EV ${U.fmtNum(data.evMilesPerKwh, 1)} mi/kWh.
      </p>
    `;
  }

  window.EVUI.renderCompare = renderCompare;
})();