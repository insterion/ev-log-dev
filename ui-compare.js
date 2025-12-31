// ui-compare.js – render EV vs ICE compare

(function (E) {
  function renderCompare(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!data || isNaN(data.evCost)) {
      el.innerHTML = "<p>Not enough data yet.</p>";
      return;
    }

    const miles = data.miles || 0;

    const evPerMile = miles > 0 ? data.evPerMile ?? data.evCost / miles : 0;
    const icePerMile = miles > 0 ? data.icePerMile ?? data.iceCost / miles : 0;

    const diffEnergy = data.iceCost - data.evCost;

    // maintenance / all-in
    const maintEv = Number(data.maintEv ?? 0);
    const maintIce = Number(data.maintIce ?? 0);
    const maintBoth = Number(data.maintBoth ?? 0);
    const maintOther = Number(data.maintOther ?? 0);

    const evTotalAll = data.evCost + maintEv;
    const iceTotalAll = data.iceCost + maintIce;
    const diffAll = iceTotalAll - evTotalAll;

    // insurance
    const insEv = Number(data.insuranceEv ?? 0);
    const insIce = Number(data.insuranceIce ?? 0);
    const insBoth = Number(data.insuranceBoth ?? 0);
    const insOther = Number(data.insuranceOther ?? 0);
    const insTotal = Number(data.insuranceTotal ?? 0);
    const insDiff = insIce - insEv;

    // ---- Quick summary (always visible) ----
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
            All-in difference (ICE – EV): <strong>${E.fmtGBP(
              Math.abs(diffAll)
            )}</strong> (${allText})
          </p>
          <p style="margin:0;">
            Per 1000 miles: EV <strong>${E.fmtGBP(per1000Ev)}</strong>, ICE <strong>${E.fmtGBP(
        per1000Ice
      )}</strong> (${perText})
          </p>
        </div>
      `;
    }

    // ---- Energy explanation (short) ----
    let energyExplain = "";
    if (diffEnergy > 1) {
      energyExplain = `ICE would cost <strong>${E.fmtGBP(
        diffEnergy
      )}</strong> more for your recorded EV miles.`;
    } else if (diffEnergy < -1) {
      energyExplain = `EV would cost <strong>${E.fmtGBP(
        Math.abs(diffEnergy)
      )}</strong> more than ICE (check assumptions).`;
    } else {
      energyExplain = `EV and ICE are roughly the same cost for your recorded EV miles.`;
    }

    const energyBlock = `
      <details open>
        <summary style="cursor:pointer;"><strong>Energy vs ICE (details)</strong></summary>
        <div style="margin-top:6px;">
          <p>Total kWh (all time): <strong>${E.fmtNum(data.totalKwh, 1)}</strong></p>
          <p>Estimated miles (@ ${E.fmtNum(
            data.evMilesPerKwh,
            1
          )} mi/kWh): <strong>${E.fmtNum(miles, 0)}</strong></p>
          <p>EV energy cost: <strong>${E.fmtGBP(data.evCost)}</strong></p>
          <p>ICE fuel cost (approx): <strong>${E.fmtGBP(data.iceCost)}</strong></p>
          <p>EV £/mile: <strong>£${evPerMile.toFixed(3)}</strong></p>
          <p>ICE £/mile: <strong>£${icePerMile.toFixed(3)}</strong></p>
          <p>Difference (ICE – EV): <strong>${E.fmtGBP(
            Math.abs(diffEnergy)
          )}</strong></p>
          <p>${energyExplain}</p>
        </div>
      </details>
    `;

    let maintBlock = "";
    if (maintEv !== 0 || maintIce !== 0 || maintBoth !== 0 || maintOther !== 0) {
      let diffAllText = "about the same";
      if (diffAll > 1) diffAllText = "ICE more expensive";
      else if (diffAll < -1) diffAllText = "EV more expensive";

      maintBlock = `
        <details>
          <summary style="cursor:pointer;"><strong>Maintenance (details)</strong></summary>
          <div style="margin-top:6px;">
            <p>Maintenance – EV: <strong>${E.fmtGBP(maintEv)}</strong>, ICE: <strong>${E.fmtGBP(
        maintIce
      )}</strong></p>
            <p>Shared (Both): <strong>${E.fmtGBP(maintBoth)}</strong>, Other: <strong>${E.fmtGBP(
        maintOther
      )}</strong></p>
            <p>Total EV (energy + EV maintenance): <strong>${E.fmtGBP(
              evTotalAll
            )}</strong></p>
            <p>Total ICE (fuel + ICE maintenance): <strong>${E.fmtGBP(
              iceTotalAll
            )}</strong></p>
            <p>All-in difference (ICE – EV): <strong>${E.fmtGBP(
              Math.abs(diffAll)
            )}</strong></p>
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
            <p>Insurance – EV: <strong>${E.fmtGBP(insEv)}</strong>, ICE: <strong>${E.fmtGBP(
        insIce
      )}</strong></p>
            <p>Shared (Both): <strong>${E.fmtGBP(insBoth)}</strong>, Other: <strong>${E.fmtGBP(
        insOther
      )}</strong></p>
            <p>Total insurance: <strong>${E.fmtGBP(insTotal)}</strong></p>
            <p>Difference (ICE – EV): <strong>${E.fmtGBP(
              Math.abs(insDiff)
            )}</strong> (${insDiffText})</p>
          </div>
        </details>
      `;
    }

    let chargerBlock = "";
    if (data.publicRate && data.publicRate > 0) {
      const pr = data.publicRate;
      const allPub = data.allPublicCost ?? 0;
      const saved = data.savedVsPublic ?? 0;
      const invest = data.chargerInvestment ?? 0;
      const remaining =
        typeof data.remainingToRecover === "number"
          ? data.remainingToRecover
          : null;

      let savedLine = "";
      if (saved > 1) savedLine = `Saved vs all-public: <strong>${E.fmtGBP(saved)}</strong>.`;
      else if (saved < -1)
        savedLine = `Extra vs all-public: <strong>${E.fmtGBP(
          Math.abs(saved)
        )}</strong>.`;
      else savedLine = `Almost no difference vs all-public price.`;

      let investLine = "";
      if (invest > 0 && remaining !== null) {
        if (remaining > 1)
          investLine = `Still to recover: <strong>${E.fmtGBP(
            remaining
          )}</strong>.`;
        else if (remaining < -1)
          investLine = `Already recovered by about <strong>${E.fmtGBP(
            Math.abs(remaining)
          )}</strong>.`;
        else investLine = `Charger is roughly at break-even.`;
      }

      chargerBlock = `
        <details>
          <summary style="cursor:pointer;"><strong>Home charger payoff (details)</strong></summary>
          <div style="margin-top:6px;">
            <p>Public benchmark: <strong>£${pr.toFixed(3)}</strong> / kWh</p>
            <p>If all EV kWh were public: <strong>${E.fmtGBP(allPub)}</strong></p>
            <p>Your actual EV charging cost: <strong>${E.fmtGBP(data.evCost)}</strong></p>
            <p>${savedLine}</p>
            ${
              invest > 0
                ? `<p>Charger investment (hardware + install): <strong>${E.fmtGBP(
                    invest
                  )}</strong></p>`
                : ""
            }
            ${investLine ? `<p>${investLine}</p>` : ""}
          </div>
        </details>
      `;
    }

    el.innerHTML = `
      ${topSummary}
      ${energyBlock}
      ${maintBlock}
      ${insuranceBlock}
      ${chargerBlock}
      <p style="margin-top:10px;font-size:0.85rem;color:#b0b0b0;">
        Assumptions: ICE ${data.iceMpg} mpg, £${data.icePerLitre.toFixed(
      2
    )}/litre unleaded, EV ${E.fmtNum(data.evMilesPerKwh, 1)} mi/kWh.
      </p>
    `;
  }

  E.renderCompare = renderCompare;
})(window.EVUI || (window.EVUI = {}));

