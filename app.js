/* ══════════════════════════════════════════════════
   app.js
   Orquestrador principal da aplicação.
   Conecta todos os módulos: upload → preview →
   preprocess → OCR → parse → tabela → export.

   Fluxo:
   1. Usuário carrega imagens (clique / drag-drop / Ctrl+V)
   2. Clica em "Converter imagens"
   3. Para cada arquivo:
      a. Pré-processa (Canvas: cinza + inversão + contraste + sharpen)
      b. Envia ao Tesseract com configuração otimizada
      c. Parseia linhas com 4 padrões regex em cascata
   4. Renderiza tabela + cards + erros
   5. Habilita download CSV e TXT
══════════════════════════════════════════════════ */

"use strict";

// ── Módulos ──
const { preprocessImage, getTesseractConfig } = window.Preprocess;
const { parseOCRText }                         = window.Parser;
const { loadPreview, showPreview, resetPreview } = window.Preview;
const { renderTable, renderErrors, updateCards, resetTable } = window.Table;
const { setExportData, showActions, hideActions } = window.Export;

// ── DOM ──
const dropZone  = document.getElementById("dropZone");
const fInput    = document.getElementById("fInput");
const pasteMsg  = document.getElementById("pasteMsg");
const progArea  = document.getElementById("progArea");
const progFill  = document.getElementById("progFill");
const progMsg   = document.getElementById("progMsg");
const btnConvert = document.getElementById("btnConvert");
const btnClear   = document.getElementById("btnClear");

// ── Estado ──
let FILES    = [];
let ROWS     = [];
let SKIPPED  = [];

/* ════════════════════════════════════════════════
   UPLOAD — 4 métodos
════════════════════════════════════════════════ */

// Clique para abrir seletor de arquivo
// Ignora cliques que vieram do próprio input para evitar loop
dropZone.addEventListener("click", e => {
  if (e.target === fInput) return;
  fInput.click();
});
fInput.addEventListener("change", e => {
  addFiles([...e.target.files]);
  // Reset do input para permitir selecionar o mesmo arquivo novamente
  fInput.value = "";
});

// Drag & Drop
dropZone.addEventListener("dragenter", e => { e.preventDefault(); dropZone.classList.add("over"); });
dropZone.addEventListener("dragover",  e => { e.preventDefault(); dropZone.classList.add("over"); });
dropZone.addEventListener("dragleave", e => {
  if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove("over");
});
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("over");
  addFiles([...e.dataTransfer.files]);
});

// Ctrl+V / PrintScreen → Ctrl+V — escuta global na janela
window.addEventListener("paste", e => {
  const cbd   = e.clipboardData || window.clipboardData;
  if (!cbd) return;
  const items = Array.from(cbd.items || []);
  const imgs  = items.filter(it => it.kind === "file" && it.type.startsWith("image/"));
  if (!imgs.length) return;
  e.preventDefault();

  const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const newFiles = imgs.map((it, i) => {
    const blob = it.getAsFile();
    const name = imgs.length === 1
      ? `colado_${ts}.png`
      : `colado_${ts}_${i + 1}.png`;
    return new File([blob], name, { type: blob.type || "image/png" });
  });

  addFiles(newFiles);
  showPasteMsg(newFiles.length);
});

// Feedback visual de imagem colada
let pasteTimer = null;
function showPasteMsg(n) {
  pasteMsg.textContent = n === 1 ? "✔ Imagem colada com sucesso!" : `✔ ${n} imagens coladas!`;
  pasteMsg.classList.add("show");
  dropZone.classList.add("ok");
  clearTimeout(pasteTimer);
  pasteTimer = setTimeout(() => {
    pasteMsg.classList.remove("show");
    dropZone.classList.remove("ok");
  }, 3000);
}

// Adiciona arquivos — acumula, não substitui
function addFiles(list) {
  const valid = list.filter(f => f.type.startsWith("image/"));
  if (!valid.length) {
    alert("Nenhuma imagem válida.\nFormatos aceitos: PNG, JPG, WEBP, BMP.\nOu cole com Ctrl+V.");
    return;
  }
  FILES = [...FILES, ...valid];
  // mostra a primeira imagem nova
  loadPreview(FILES);
}

/* ════════════════════════════════════════════════
   CONVERTER — loop OCR principal
════════════════════════════════════════════════ */
btnConvert.addEventListener("click", async () => {
  if (!FILES.length) {
    alert("Carregue, arraste ou cole pelo menos uma imagem.");
    return;
  }

  btnConvert.disabled    = true;
  btnConvert.textContent = "⏳ Processando...";
  progArea.style.display = "block";
  ROWS = []; SKIPPED = [];

  const lang     = document.getElementById("selLang").value;
  const psm      = +document.getElementById("selPsm").value;
  const contrast = +document.getElementById("selContrast").value;
  const doPre    = document.getElementById("chkPre").checked;
  const doInv    = document.getElementById("chkInv").checked;

  for (let i = 0; i < FILES.length; i++) {
    const f = FILES[i];
    showPreview(i);
    setProgress(Math.round((i / FILES.length) * 80), `Imagem ${i + 1}/${FILES.length}: ${f.name}`);

    try {
      // Pré-processamento
      let src = f;
      if (doPre) {
        setProgress(Math.round(((i + 0.2) / FILES.length) * 80), `Pré-processando: ${f.name}`);
        src = await preprocessImage(f, contrast, doInv);
      }

      // OCR
      setProgress(Math.round(((i + 0.5) / FILES.length) * 80), `OCR: ${f.name} [${lang}]`);
      const result = await Tesseract.recognize(src, lang, getTesseractConfig(psm));

      // Parsing
      setProgress(Math.round(((i + 0.85) / FILES.length) * 80), `Parseando: ${f.name}`);
      const { rows, skipped } = parseOCRText(result.data.text);
      ROWS.push(...rows);
      SKIPPED.push(...skipped);

    } catch (err) {
      console.error(`Erro ao processar "${f.name}":`, err);
      SKIPPED.push(`[ERRO: ${f.name}] ${err.message}`);
    }
  }

  // Finaliza
  setProgress(100, `✔  ${ROWS.length} linha(s) extraída(s) — ${SKIPPED.length} não reconhecida(s)`);
  renderTable(ROWS);
  renderErrors(SKIPPED);
  updateCards(ROWS, SKIPPED);
  setExportData(ROWS, SKIPPED);
  if (ROWS.length || SKIPPED.length) showActions();

  btnConvert.disabled    = false;
  btnConvert.textContent = "🔍 Converter imagens";
});

function setProgress(pct, msg) {
  progFill.style.width = pct + "%";
  progMsg.textContent  = msg;
}

/* ════════════════════════════════════════════════
   LIMPAR — reset completo
════════════════════════════════════════════════ */
btnClear.addEventListener("click", () => {
  FILES = []; ROWS = []; SKIPPED = [];

  resetPreview();
  resetTable();
  hideActions();
  setExportData([], []);

  progArea.style.display = "none";
  progFill.style.width   = "0%";
  progMsg.textContent    = "Aguardando...";
  fInput.value           = "";
});
