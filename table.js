/* ══════════════════════════════════════════════════
   table.js
   Renderiza tabela de resultados, painel de erros
   e atualiza os cards do dashboard.
══════════════════════════════════════════════════ */

"use strict";

/* ────────────────────────────────────────────────
   TABELA DE RESULTADOS
──────────────────────────────────────────────── */
function renderTable(rows) {
  const wrap = document.getElementById("tblWrap");
  const sc   = document.getElementById("tblScroll");
  sc.innerHTML     = "";
  wrap.style.display = "block";

  if (!rows.length) {
    sc.innerHTML = `<div class="no-data">
      Nenhum dado reconhecido.<br>
      Sugestões: tente outro idioma · ajuste o contraste · desative inversão de cores.
    </div>`;
    return;
  }

  const tbl   = document.createElement("table");
  const thead = tbl.createTHead();
  const hr    = thead.insertRow();

  ["Data", "Pedido", "UN", "CA", "Qtd", "Código", "Descrição"].forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    hr.appendChild(th);
  });

  const tbody = tbl.createTBody();
  rows.forEach(row => {
    const tr = tbody.insertRow();
    row.forEach((cell, i) => {
      const td = tr.insertCell();
      td.textContent = cell;
      if (i === 3) {
        const n = String(cell).replace(/^0+/, "");
        if (n === "1")  td.className = "ca-pr";
        if (n === "28") td.className = "ca-rj";
      }
    });
  });

  sc.appendChild(tbl);
}

/* ────────────────────────────────────────────────
   PAINEL DE ERROS
──────────────────────────────────────────────── */
function renderErrors(skipped) {
  const box  = document.getElementById("errBox");
  const list = document.getElementById("errList");
  document.getElementById("errBadge").textContent = skipped.length;

  if (!skipped.length) { box.style.display = "none"; return; }

  box.style.display = "block";
  list.innerHTML    = "";

  skipped.forEach((line, i) => {
    const d = document.createElement("div");
    d.className = "err-item";
    d.innerHTML = `<span class="err-num">${String(i + 1).padStart(2, "0")}</span><span>${escHtml(line)}</span>`;
    list.appendChild(d);
  });
}

document.getElementById("btnTogErr").addEventListener("click", () => {
  const list = document.getElementById("errList");
  const open = list.style.display === "block";
  list.style.display = open ? "none" : "block";
  document.getElementById("btnTogErr").textContent = open ? "▼ Ver" : "▲ Ocultar";
});

/* ────────────────────────────────────────────────
   CARDS DO DASHBOARD
──────────────────────────────────────────────── */
function updateCards(rows, skipped) {
  let pr = 0, rj = 0;
  rows.forEach(r => {
    const ca = String(r[3]).replace(/^0+/, "");
    if (ca === "1")  pr++;
    if (ca === "28") rj++;
  });
  document.getElementById("cPR").textContent  = pr;
  document.getElementById("cRJ").textContent  = rj;
  document.getElementById("cTOT").textContent = rows.length;
  document.getElementById("cERR").textContent = skipped.length;
}

/* ────────────────────────────────────────────────
   RESET
──────────────────────────────────────────────── */
function resetTable() {
  const wrap = document.getElementById("tblWrap");
  const sc   = document.getElementById("tblScroll");
  wrap.style.display = "none";
  sc.innerHTML       = "";
  document.getElementById("errBox").style.display  = "none";
  document.getElementById("errList").innerHTML     = "";
  document.getElementById("errBadge").textContent  = "0";
  updateCards([], []);
}

/* ────────────────────────────────────────────────
   UTILITÁRIO
──────────────────────────────────────────────── */
function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

window.Table = { renderTable, renderErrors, updateCards, resetTable };
