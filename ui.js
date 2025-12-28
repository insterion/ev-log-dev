// ui.js – formatting + rendering helpers

(function () {
  function fmtGBP(v) {
    if (isNaN(v)) return "£0.00";
    return "£" + v.toFixed(2);
  }

  function fmtNum(v, digits = 1) {
    if (isNaN(v)) return "0";
    return v.toFixed(digits);
  }

  function fmtDate(d) {
    // expect "YYYY-MM-DD"
    return d || "";
  }

  function toast(msg, kind = "info") {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.className = "";
    el.classList.add("show", kind);
    setTimeout(() => {
      el.classList.remove("show");
    }, 1700);
  }

  // ===== LOG FILTER STATE =====
  let logFilterText = "";

  function matchesLogFilter(entry) {
    if (!entry) return false;
    const q = (logFilterText || "").trim().toLowerCase();
    if (!q) return true;

    const date = (entry.date || "").toLowerCase();
    const type = (entry.type || "").toLowerCase();
    const note = (entry.note || "").toLowerCase();
    const kwhStr = String(entry.kwh ?? "").toLowerCase();
    const priceStr = String(entry.price ?? "").toLowerCase();
    const costStr = String((entry.kwh || 0) * (entry.price || 0)).toLowerCase();

    return (
      date.includes(q) ||
      type.includes(q) ||
      note.includes(q) ||
      kwhStr.includes(q) ||
      priceStr.includes(q) ||
      costStr.includes(q)
    );
  }

  // ------- render charging log -------

  function renderLogTable(containerId, entries) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const allEntries = Array.isArray(entries) ? entries : [];

    if (!allEntries.length) {
      el.innerHTML = "<p>No entries yet.</p>";
      return;
    }

    const filtered = allEntries.filter(matchesLogFilter);

    // NEWEST FIRST (descending)
    const rows = filtered
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

        const cost = e.kwh * e.price;
        const safeNote = e.note ? e.note.replace(/</g, "&lt;") : "";
        const idAttr = e.id ? String(e.id) : "";

        return `<tr>
          <td>${fmtDate(e.date)}</td>
          <td>${fmtNum(e.kwh, 1)}</td>
          <td><span class="badge">${typeLabel}</span></td>
          <td>${fmtGBP(cost)}</td>
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

    const totalKwh = filtered.reduce((s, e) => s + (e.kwh || 0), 0);
    const totalCost = filtered.reduce((s, e) => s + (e.kwh * e.price || 0), 0);
    const sessions = filtered.length;

    const hasActiveFilter = (logFilterText || "").trim() !== "";
    const filterInfo = hasActiveFilter
      ? `<p class="small" style="margin:4px 0 0;color:#b0b0b0;">
           Filter active – showing <strong>${filtered.length}</strong> of
           <strong>${allEntries.length}</strong> entries.
         </p>`
      : "";

    const summaryBlock = `
      <details open style="margin:4px 0 8px;">
        <summary style="cursor:pointer;color:#cccccc;">
          <strong>Total so far</strong>
        </summary>
        <div style="margin-top:6px;font-size:0.85rem;color:#cccccc;">
          <p style="margin:0;">
            <strong>${fmtNum(totalKwh, 1)} kWh</strong> •
            <strong>${fmtGBP(totalCost)}</strong> •
            <strong>${sessions}</strong> sessions
          </p>
        </div>
      </details>
    `;

    el.innerHTML = `
      <div style="margin:4px 0 8px;">
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <input
            id="logFilterText"
            type="text"
            placeholder="Filter by date, type, note…"
          />
        </div>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <button type="button" id="logFilterApply">Apply</button>
          <button type="button" id="logFilterClear">Clear</button>
        </div>
        ${filterInfo}
      </div>

      ${summaryBlock}
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>kWh</th>
            <th>Type</th>
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
            <td>${fmtNum(totalKwh, 1)}</td>
            <td></td>
            <td>${fmtGBP(totalCost)}</td>
            <td></td>
            <td class="actcol"></td>
          </tr>
        </tfoot>
      </table>
    `;

    const txtEl = document.getElementById("logFilterText");
    const applyBtn = document.getElementById("logFilterApply");
    const clearBtn = document.getElementById("logFilterClear");

    if (txtEl) txtEl.value = logFilterText;

    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        logFilterText = txtEl ? txtEl.value.trim() : "";
        renderLogTable(containerId, allEntries);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        logFilterText = "";
        renderLogTable(containerId, allEntries);
      });
    }
  }

  // ===== COSTS FILTER STATE =====
  let costFilterText = "";
  let costFilterApplies = "all"; // all | ev | ice | both | other

  function matchesCostFilter(cost) {
    if (!cost) return false;

    const appliesRaw = (cost.applies || "other").toLowerCase();

    // dropdown filter
    if (costFilterApplies !== "all" && appliesRaw !== costFilterApplies) {
      return false;
    }

    const q = (costFilterText || "").trim().toLowerCase();
    if (!q) return true;

    const date = (cost.date || "").toLowerCase();
    const cat = (cost.category || "").toLowerCase();
    const note = (cost.note || "").toLowerCase();
    const amountStr = String(cost.amount ?? "").toLowerCase();

    // Тук вече търсим и в "applies" (EV/ICE/Both/Other)
    return (
      date.includes(q) ||
      cat.includes(q) ||
      note.includes(q) ||
      amountStr.includes(q) ||
      appliesRaw.includes(q)
    );
  }

  // ------- render costs -------

  function renderCostTable(containerId, costs) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const allCosts = Array.isArray(costs) ? costs : [];

    if (!allCosts.length) {
      el.innerHTML = "<p>No costs yet.</p>";
      return;
    }

    const filtered = allCosts.filter(matchesCostFilter);

    // NEWEST FIRST (descending)
    const sorted = filtered
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
        <td>${fmtDate(c.date)}</td>
        <td><span class="badge">${c.category}</span></td>
        <td><span class="badge">${appliesLabel}</span></td>
        <td>${fmtGBP(c.amount)}</td>
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

    // totals by category (for filtered data)
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
          <td>${fmtGBP(sum)}</td>
        </tr>`
      );

    const hasActiveFilter =
      (costFilterText && costFilterText.trim() !== "") ||
      (costFilterApplies && costFilterApplies !== "all");

    const filterInfo = hasActiveFilter
      ? `<p class="small" style="margin:4px 0 0;color:#b0b0b0;">
           Filter active – showing <strong>${filtered.length}</strong> of
           <strong>${allCosts.length}</strong> costs.
         </p>`
      : "";

    const legend = `
      <p class="small" style="margin-top:8px;line-height:1.35;">
        <strong>For</strong> means which vehicle the cost applies to:
        <strong>EV</strong> = electric car only,
        <strong>ICE</strong> = petrol/diesel car only,
        <strong>Both</strong> = shared/combined cost,
        <strong>Other</strong> = not tied to a specific car.
      </p>
    `;

    el.innerHTML = `
      <div style="margin:4px 0 6px;">
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <input
            id="costFilterText"
            type="text"
            placeholder="Filter by date, category, note, amount…"
          />
          <select id="costFilterApplies">
            <option value="all">For: All</option>
            <option value="ev">For: EV</option>
            <option value="ice">For: ICE</option>
            <option value="both">For: Both</option>
            <option value="other">For: Other</option>
          </select>
        </div>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <button type="button" id="costFilterApply">Apply</button>
          <button type="button" id="costFilterClear">Clear</button>
        </div>
        ${filterInfo}
      </div>

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
            <td>${fmtGBP(total)}</td>
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
          ${legend}
        </div>
      </details>
    `;

    const txtEl = document.getElementById("costFilterText");
    const selEl = document.getElementById("costFilterApplies");
    const applyBtn = document.getElementById("costFilterApply");
    const clearBtn = document.getElementById("costFilterClear");

    if (txtEl) txtEl.value = costFilterText;
    if (selEl) selEl.value = costFilterApplies;

    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        costFilterText = txtEl ? txtEl.value.trim() : "";
        costFilterApplies = selEl ? selEl.value : "all";
        renderCostTable(containerId, allCosts);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        costFilterText = "";
        costFilterApplies = "all";
        renderCostTable(containerId, allCosts);
      });
    }
  }

  // ------- render summary (COMPACT + COLLAPSIBLE) -------

  function renderSummary(containerIds, summary) {
    const [idThis, idLast, idAvg] = containerIds.map((id) =>
      document.getElementById(id)
    );
    if (!idThis || !idLast || !idAvg) return;

    function compactLines(data) {
      if (!data) return "<p>No data.</p>";

      const kwh = fmtNum(data.kwh, 1);
      const cost = fmtGBP(data.cost);
      const count = data.count != null ? data.count : null;

      const avgPrice =
        data.avgPrice && data.avgPrice > 0 ? `£${data.avgPrice.toFixed(3)}/kWh` : null;

      const perDay =
        data.perDay && data.perDay > 0 ? fmtGBP(data.perDay) + "/day" : null;

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
                  <strong>${fmtNum(summary.avg.kwh, 1)} kWh</strong> •
                  <strong>${fmtGBP(summary.avg.cost)}</strong>
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

  // ------- render compare (CLEAN + COLLAPSIBLE) -------

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
            All-in difference (ICE – EV): <strong>${fmtGBP(
              Math.abs(diffAll)
            )}</strong> (${allText})
          </p>
          <p style="margin:0;">
            Per 1000 miles: EV <strong>${fmtGBP(per1000Ev)}</strong>, ICE <strong>${fmtGBP(
        per1000Ice
      )}</strong> (${perText})
          </p>
        </div>
      `;
    }

    // ---- Energy explanation (short) ----
    let energyExplain = "";
    if (diffEnergy > 1) {
      energyExplain = `ICE would cost <strong>${fmtGBP(
        diffEnergy
      )}</strong> more for your recorded EV miles.`;
    } else if (diffEnergy < -1) {
      energyExplain = `EV would cost <strong>${fmtGBP(
        Math.abs(diffEnergy)
      )}</strong> more than ICE (check assumptions).`;
    } else {
      energyExplain = `EV and ICE are roughly the same cost for your recorded EV miles.`;
    }

    const energyBlock = `
      <details open>
        <summary style="cursor:pointer;"><strong>Energy vs ICE (details)</strong></summary>
        <div style="margin-top:6px;">
          <p>Total kWh (all time): <strong>${fmtNum(data.totalKwh, 1)}</strong></p>
          <p>Estimated miles (@ ${fmtNum(data.evMilesPerKwh, 1)} mi/kWh): <strong>${fmtNum(
      miles,
      0
    )}</strong></p>
          <p>EV energy cost: <strong>${fmtGBP(data.evCost)}</strong></p>
          <p>ICE fuel cost (approx): <strong>${fmtGBP(data.iceCost)}</strong></p>
          <p>EV £/mile: <strong>£${evPerMile.toFixed(3)}</strong></p>
          <p>ICE £/mile: <strong>£${icePerMile.toFixed(3)}</strong></p>
          <p>Difference (ICE – EV): <strong>${fmtGBP(Math.abs(diffEnergy))}</strong></p>
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
            <p>Maintenance – EV: <strong>${fmtGBP(maintEv)}</strong>, ICE: <strong>${fmtGBP(
        maintIce
      )}</strong></p>
            <p>Shared (Both): <strong>${fmtGBP(maintBoth)}</strong>, Other: <strong>${fmtGBP(
        maintOther
      )}</strong></p>
            <p>Total EV (energy + EV maintenance): <strong>${fmtGBP(evTotalAll)}</strong></p>
            <p>Total ICE (fuel + ICE maintenance): <strong>${fmtGBP(iceTotalAll)}</strong></p>
            <p>All-in difference (ICE – EV): <strong>${fmtGBP(
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
            <p>Insurance – EV: <strong>${fmtGBP(insEv)}</strong>, ICE: <strong>${fmtGBP(
        insIce
      )}</strong></p>
            <p>Shared (Both): <strong>${fmtGBP(insBoth)}</strong>, Other: <strong>${fmtGBP(
        insOther
      )}</strong></p>
            <p>Total insurance: <strong>${fmtGBP(insTotal)}</strong></p>
            <p>Difference (ICE – EV): <strong>${fmtGBP(
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
        typeof data.remainingToRecover === "number" ? data.remainingToRecover : null;

      let savedLine = "";
      if (saved > 1) savedLine = `Saved vs all-public: <strong>${fmtGBP(saved)}</strong>.`;
      else if (saved < -1)
        savedLine = `Extra vs all-public: <strong>${fmtGBP(Math.abs(saved))}</strong>.`;
      else savedLine = `Almost no difference vs all-public price.`;

      let investLine = "";
      if (invest > 0 && remaining !== null) {
        if (remaining > 1) investLine = `Still to recover: <strong>${fmtGBP(remaining)}</strong>.`;
        else if (remaining < -1)
          investLine = `Already recovered by about <strong>${fmtGBP(Math.abs(remaining))}</strong>.`;
        else investLine = `Charger is roughly at break-even.`;
      }

      chargerBlock = `
        <details>
          <summary style="cursor:pointer;"><strong>Home charger payoff (details)</strong></summary>
          <div style="margin-top:6px;">
            <p>Public benchmark: <strong>£${pr.toFixed(3)}</strong> / kWh</p>
            <p>If all EV kWh were public: <strong>${fmtGBP(allPub)}</strong></p>
            <p>Your actual EV charging cost: <strong>${fmtGBP(data.evCost)}</strong></p>
            <p>${savedLine}</p>
            ${
              invest > 0
                ? `<p>Charger investment (hardware + install): <strong>${fmtGBP(invest)}</strong></p>`
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
    )}/litre unleaded, EV ${fmtNum(data.evMilesPerKwh, 1)} mi/kWh.
      </p>
    `;
  }

  window.EVUI = {
    fmtGBP,
    fmtNum,
    toast,
    renderLogTable,
    renderCostTable,
    renderSummary,
    renderCompare
  };
})();