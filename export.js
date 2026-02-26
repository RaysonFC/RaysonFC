/* ══════════════════════════════════════════════════
   export.js
   Geração e download de CSV e TXT de erros.

   Detalhes do CSV:
   • Separador: ponto-e-vírgula (padrão Brasil no Excel)
   • Campos entre aspas duplas
   • BOM UTF-8 (\uFEFF) para Excel abrir com acentos corretos
   • Botão "Copiar" com fallback para browsers sem Clipboard API
══════════════════════════════════════════════════ */

"use strict";

let _rows    = [];
let _skipped = [];

/* ────────────────────────────────────────────────
   setData — atualiza os dados para exportação
──────────────────────────────────────────────── */
function setExportData(rows, skipped) {
  _rows    = rows;
  _skipped = skipped;
}

/* ────────────────────────────────────────────────
   Geração do CSV
──────────────────────────────────────────────── */
function getCSV() {
  const header = "Data;Pedido;UN;CA;Qtd;CodMaterial;Descricao\n";
  const body   = _rows
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  return header + body + "\n";
}

/* ────────────────────────────────────────────────
   Download de arquivo
──────────────────────────────────────────────── */
function dlBlob(content, filename, mime) {
  const BOM  = "\uFEFF"; // UTF-8 BOM → Excel abre corretamente
  const blob = new Blob([BOM + content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ────────────────────────────────────────────────
   Event listeners
──────────────────────────────────────────────── */
document.getElementById("btnDl").addEventListener("click", () => {
  if (!_rows.length) return;
  dlBlob(getCSV(), "dados.csv", "text/csv;charset=utf-8;");
});

document.getElementById("btnDlErr").addEventListener("click", () => {
  if (!_skipped.length) { alert("Não há linhas com erro para exportar."); return; }
  dlBlob(_skipped.join("\n"), "erros_ocr.txt", "text/plain;charset=utf-8;");
});

document.getElementById("btnCopy").addEventListener("click", async () => {
  if (!_rows.length) return;
  const btn = document.getElementById("btnCopy");
  const csv = getCSV();

  try {
    await navigator.clipboard.writeText(csv);
  } catch {
    // fallback para browsers sem permissão de clipboard
    const ta = document.createElement("textarea");
    ta.value = csv;
    ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  btn.textContent = "✔ Copiado!";
  setTimeout(() => { btn.textContent = "⧉ Copiar CSV"; }, 2200);
});

/* ────────────────────────────────────────────────
   Barra de ações
──────────────────────────────────────────────── */
function showActions()  { document.getElementById("actBar").style.display = "flex"; }
function hideActions()  { document.getElementById("actBar").style.display = "none"; }

window.Export = { setExportData, showActions, hideActions, getCSV };
