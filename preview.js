/* ══════════════════════════════════════════════════
   preview.js
   Painel de preview de imagens.

   Recursos:
   • Imagem ocupa 100% do painel (object-fit: contain)
   • Zoom com roda do mouse (centrado, suave)
   • Arrastar com mouse
   • Pinch-to-zoom em touch
   • Duplo clique para resetar zoom/posição
   • Teclas ← → para navegar entre imagens
   • Barra de navegação com ‹ n/total ›
   • Etiqueta com nome do arquivo
══════════════════════════════════════════════════ */

"use strict";

const _prevWrap  = document.getElementById("prevWrap");
const _prevEmpty = document.getElementById("prevEmpty");
const _prevLabel = document.getElementById("prevLabel");
const _prevNav   = document.getElementById("prevNav");
const _navLbl    = document.getElementById("navLbl");
const _btnPrev   = document.getElementById("btnPrev");
const _btnNext   = document.getElementById("btnNext");
const _zoomHint  = document.getElementById("zoomHint");

let _files   = [];
let _idx     = 0;

/* ────────────────────────────────────────────────
   loadPreview — define lista de arquivos e exibe primeiro
──────────────────────────────────────────────── */
function loadPreview(files) {
  _files = files;
  _idx   = 0;
  if (_files.length) showPreview(0);
}

/* ────────────────────────────────────────────────
   showPreview — renderiza a imagem de índice idx
──────────────────────────────────────────────── */
function showPreview(idx) {
  _idx = Math.max(0, Math.min(idx, _files.length - 1));
  const file = _files[_idx];

  // remove imagem anterior
  const old = _prevWrap.querySelector("img");
  if (old) old.remove();

  _prevEmpty.style.display = "none";
  _prevLabel.style.display = "block";
  _prevLabel.textContent   = `${_idx + 1} / ${_files.length}  —  ${file.name}`;
  _zoomHint.style.display  = "block";

  // cria e configura nova imagem
  const img = document.createElement("img");
  img.alt = file.name;

  let sc = 1, px = 0, py = 0;
  let dragging = false, sx = 0, sy = 0;

  const applyT = () => {
    img.style.transform = `translate(${px}px, ${py}px) scale(${sc})`;
  };

  img.addEventListener("load", () => { sc = 1; px = 0; py = 0; applyT(); });

  // zoom com scroll — suave
  img.addEventListener("wheel", e => {
    e.preventDefault();
    sc = Math.min(Math.max(0.3, sc * (e.deltaY < 0 ? 1.10 : 0.91)), 12);
    applyT();
  }, { passive: false });

  // duplo clique → reset zoom e posição
  img.addEventListener("dblclick", () => { sc = 1; px = 0; py = 0; applyT(); });

  // arrastar com mouse
  img.addEventListener("mousedown", e => {
    dragging = true;
    sx = e.clientX - px;
    sy = e.clientY - py;
    e.preventDefault();
  });
  window.addEventListener("mousemove", e => {
    if (!dragging) return;
    px = e.clientX - sx;
    py = e.clientY - sy;
    applyT();
  });
  window.addEventListener("mouseup", () => { dragging = false; });

  // touch: arrastar e pinch-to-zoom
  let lastDist = null;
  img.addEventListener("touchstart", e => {
    if (e.touches.length === 1) {
      dragging = true;
      sx = e.touches[0].clientX - px;
      sy = e.touches[0].clientY - py;
    }
  }, { passive: true });

  img.addEventListener("touchmove", e => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastDist) sc = Math.min(Math.max(0.3, sc * (dist / lastDist)), 12);
      lastDist = dist;
      applyT();
    } else if (dragging && e.touches.length === 1) {
      px = e.touches[0].clientX - sx;
      py = e.touches[0].clientY - sy;
      applyT();
    }
  }, { passive: false });

  img.addEventListener("touchend", () => { dragging = false; lastDist = null; });

  // insere antes do label para z-index correto
  _prevWrap.insertBefore(img, _prevLabel);
  img.src = URL.createObjectURL(file);

  // navegação entre arquivos
  if (_files.length > 1) {
    _prevNav.style.display = "flex";
    _navLbl.textContent    = `${_idx + 1} / ${_files.length}`;
    _btnPrev.disabled = _idx === 0;
    _btnNext.disabled = _idx === _files.length - 1;
  } else {
    _prevNav.style.display = "none";
  }
}

/* ────────────────────────────────────────────────
   Botões e teclado
──────────────────────────────────────────────── */
_btnPrev.addEventListener("click", () => showPreview(_idx - 1));
_btnNext.addEventListener("click", () => showPreview(_idx + 1));

document.addEventListener("keydown", e => {
  if (!_files.length) return;
  if (e.key === "ArrowLeft"  && _idx > 0)              showPreview(_idx - 1);
  if (e.key === "ArrowRight" && _idx < _files.length-1) showPreview(_idx + 1);
});

/* ────────────────────────────────────────────────
   Reset completo
──────────────────────────────────────────────── */
function resetPreview() {
  _files = []; _idx = 0;
  const old = _prevWrap.querySelector("img");
  if (old) old.remove();
  _prevEmpty.style.display = "block";
  _prevLabel.style.display = "none";
  _prevNav.style.display   = "none";
  _zoomHint.style.display  = "none";
}

window.Preview = { loadPreview, showPreview, resetPreview, getIdx: () => _idx, getFiles: () => _files };
