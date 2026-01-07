// ui-compare.js – render compare (v2: period-aware + ICE miles per selected period)

(function () {
  const U = window.EVUI;

  function safeGet(obj, path, def) {
    try {
      let x = obj;
      for (const k of path) x = x && x[k];
      return x == null ? def : x;
    } catch (e) {
      return def;
    }
  }

  function renderBreakdown(title, byCat) {
    const entries = Object.entries(byCat || {});
    if (!entries.length) return "";

    // stable order: common first, rest alpha
    const preferred = ["Tyres", "Pads", "Service", "Other"];
    entries.sort((a, b) => {
      const ai = preferred.indexOf(a[0]);
      const bi = preferred.indexOf(b[0]);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return String(a[0]).localeCompare(String(b[0]));
    });

    const rows = entries
      .filter(([, v]) => Number(v) !== 0)
      .map(([k, v]) => `<p style="margin:0 0 3px;">${U.escapeHTML(k)}: <strong>${U.fmtGBP(v)}</strong></p>`)
      .join("");

    return `
      <div style="margin-top:6px;padding:8px;border-radius:12px;background:#0a0a0a;border:1px solid #222;">
        <p style="margin:0 0 6px;"><strong>${U.escapeHTML(title)}</strong></p>
        ${rows}
      </div>
    `;
  }

  function renderCompare(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!data) {
      el.innerHTML = "<p>Not enough data yet.</p>";
      return;
    }

    const A = window.EVApp;
    const C = window.EVCalc;

    const evMiles = Number(data.evMiles || 0);
    const iceMiles = Number(data.iceMiles || 0);

    const evTotal = Number(data.evTotal || 0);
    const iceTotal = Number(data.iceTotal || 0);

    const diffAll = iceTotal - evTotal;

    const evPerMile = evMiles > 0 ? (data.evPerMile ?? (evTotal / evMiles)) : 0;
    const icePerMile = iceMiles > 0 ? (data.icePerMile ?? (iceTotal / iceMiles)) : 0;

    // Quick summary
    let topSummary = "";
    if (evMiles > 0 && iceMiles > 0) {
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
          <p style="margin:0 0 4px;"><strong>Quick summary (selected period)</strong></p>
          <p style="margin:0 0 3px;">
            All-in difference (ICE – EV): <strong>${U.fmtGBP(Math.abs(diffAll))}</strong> (${allText})
          </p>
          <p style="margin:0;">
            Per 1000 miles: EV <strong>${U.fmtGBP(per1000Ev)}</strong>, ICE <strong>${U.fmtGBP(per1000Ice)}</strong> (${perText})
          </p>
        </div>
      `;
    }

    // ICE miles input (saved per period mode)
    const iceMilesBox = `
      <div style="margin:8px 0 10px;padding:8px;border-radius:12px;background:#0a0a0a;border:1px solid #222;">
        <label style="display:block;margin-bottom:6px;">ICE miles (selected period)</label>
        <input
          id="cmp_ice_miles_period"
          type="number"
          inputmode="decimal"
          min="0"
          step="1"
          value="${isFinite(iceMiles) ? iceMiles : 0}"
          style="width:100%;padding:10px;border-radius:12px;border:1px solid #2b2b2b;background:#0f0f0f;color:#fff;"
        />
        <button id="cmp_ice_miles_save" type="button" style="margin-top:8px;width:100%;">Save ICE miles</button>
        <p style="margin:6px 0 0;font-size:0.85rem;color:#b0b0b0;">
          Saved separately per period preset (this-month / last-month / custom).
        </p>
      </div>
    `;

    // Blocks
    const evEnergyCost = Number(data.evEnergyCost || 0);
    const iceFuelCost = Number(data.iceFuelCost || 0);

    const maintEv = safeGet(data, ["maintenance", "ev", "total"], 0);
    const maintIce = safeGet(data, ["maintenance", "ice", "total"], 0);
    const maintBoth = safeGet(data, ["maintenance", "both", "total"], 0);
    const maintOther = safeGet(data, ["maintenance", "other", "total"], 0);

    const insEv = safeGet(data, ["insurance", "ev", "total"], 0);
    const insIce = safeGet(data, ["insurance", "ice", "total"], 0);
    const insBoth = safeGet(data, ["insurance", "both", "total"], 0);
    const insOther = safeGet(data, ["insurance", "other", "total"], 0);

    const energyBlock = `
      <details open>
        <summary style="cursor:pointer;"><strong>Energy vs ICE fuel (selected period)</strong></summary>
        <div style="margin-top:6px;">
          <p>Total kWh (period): <strong>${U.fmtNum(data.totalKwh, 1)}</strong></p>
          <p>EV miles (estimated @ ${U.fmtNum(data.evMilesPerKwh, 1)} mi/kWh): <strong>${U.fmtNum(evMiles, 0)}</strong></p>
          <p>ICE miles (entered): <strong>${U.fmtNum(iceMiles, 0)}</strong></p>

          <p>EV energy cost: <strong>${U.fmtGBP(evEnergyCost)}</strong></p>
          <p>ICE fuel cost (estimated): <strong>${U.fmtGBP(iceFuelCost)}</strong></p>

          <p>EV £/mile (all-in): <strong>£${Number(evPerMile).toFixed(3)}</strong></p>
          <p>ICE £/mile (all-in): <strong>£${Number(icePerMile).toFixed(3)}</strong></p>
        </div>
      </details>
    `;

    let maintBlock = "";
    if (maintEv || maintIce || maintBoth || maintOther) {
      maintBlock = `
        <details>
          <summary style="cursor:pointer;"><strong>Maintenance (details)</strong></summary>
          <div style="margin-top:6px;">
            <p>Maintenance – EV: <strong>${U.fmtGBP(maintEv)}</strong>, ICE: <strong>${U.fmtGBP(maintIce)}</strong></p>
            <p>Shared (Both): <strong>${U.fmtGBP(maintBoth)}</strong>, Other: <strong>${U.fmtGBP(maintOther)}</strong></p>
            ${renderBreakdown("EV maintenance breakdown", safeGet(data, ["maintenance", "ev", "byCat"], {}))}
            ${renderBreakdown("ICE maintenance breakdown", safeGet(data, ["maintenance", "ice", "byCat"], {}))}
          </div>
        </details>
      `;
    }

    let insuranceBlock = "";
    if (insEv || insIce || insBoth || insOther) {
      const insDiff = Number(insIce || 0) - Number(insEv || 0);
      let insDiffText = "about the same";
      if (insDiff > 1) insDiffText = "ICE insurance higher";
      else if (insDiff < -1) insDiffText = "EV insurance higher";

      insuranceBlock = `
        <details>
          <summary style="cursor:pointer;"><strong>Insurance (details)</strong></summary>
          <div style="margin-top:6px;">
            <p>Insurance – EV: <strong>${U.fmtGBP(insEv)}</strong>, ICE: <strong>${U.fmtGBP(insIce)}</strong></p>
            <p>Shared (Both): <strong>${U.fmtGBP(insBoth)}</strong>, Other: <strong>${U.fmtGBP(insOther)}</strong></p>
            <p>Difference (ICE – EV): <strong>${U.fmtGBP(Math.abs(insDiff))}</strong> (${insDiffText})</p>
          </div>
        </details>
      `;
    }

    el.innerHTML = `
      ${topSummary}
      ${iceMilesBox}
      ${energyBlock}
      ${maintBlock}
      ${insuranceBlock}
      <p style="margin-top:10px;font-size:0.85rem;color:#b0b0b0;">
        Assumptions: ICE ${data.iceMpg} mpg, £${Number(data.icePerLitre).toFixed(2)}/litre, EV ${U.fmtNum(data.evMilesPerKwh, 1)} mi/kWh.
      </p>
    `;

    // Wire the save button (after HTML is set)
    const btn = document.getElementById("cmp_ice_miles_save");
    if (btn && A && C) {
      btn.onclick = () => {
        const inp = document.getElementById("cmp_ice_miles_period");
        const miles = inp ? Number(inp.value) : 0;

        if (!A.state || !A.state.settings) return;

        C.setIceMilesForPeriod(A.state.settings, A.state.ui && A.state.ui.periodMode, miles);
        A.saveState();
        A.Render.renderAll();
        A.U.toast("ICE miles saved for this period", "good");
      };
    }
  }

  window.EVUI.renderCompare = renderCompare;
})();