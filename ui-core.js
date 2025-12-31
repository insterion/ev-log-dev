// ui-core.js – shared formatting + toast helpers

(function () {
  function fmtGBP(v) {
    if (isNaN(v)) return "£0.00";
    return "£" + Number(v).toFixed(2);
  }

  function fmtNum(v, digits = 1) {
    if (isNaN(v)) return "0";
    return Number(v).toFixed(digits);
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

  // правим общ обект EVUI, който другите UI файлове ще разширяват
  window.EVUI = {
    fmtGBP,
    fmtNum,
    fmtDate,
    toast
  };
})();

