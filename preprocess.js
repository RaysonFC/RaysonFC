/* ══════════════════════════════════════════════════
   preprocess.js
   Pré-processamento de imagem antes do OCR via Canvas API.

   Pipeline completo:
   1. Redimensiona: mín 1.5×, máx 3× ou 3000px
   2. Fundo branco (PNGs com transparência)
   3. Escala de cinza (luminância BT.601)
   4. Inversão de cores (screenshots fundo escuro)
   5. Contraste ajustável (fator 1.4×–3.0×)
   6. Threshold binário suave (clareia fundo, escurece texto)
   7. Filtro Sharpen 3×3 (nitidez das bordas dos caracteres)
══════════════════════════════════════════════════ */

"use strict";

// kernel de sharpen 3×3
const KERNEL_SHARPEN = [0, -1, 0, -1, 5, -1, 0, -1, 0];

function applySharpen(data, W, H) {
  const src = new Uint8ClampedArray(data);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      let s = 0;
      for (let ky = -1; ky <= 1; ky++)
        for (let kx = -1; kx <= 1; kx++)
          s += src[((y + ky) * W + (x + kx)) * 4] * KERNEL_SHARPEN[(ky + 1) * 3 + (kx + 1)];
      const o = (y * W + x) * 4;
      const v = Math.max(0, Math.min(255, s));
      data[o] = data[o + 1] = data[o + 2] = v;
    }
  }
}

/* ────────────────────────────────────────────────
   preprocessImage
   @param {File}    file           — imagem original
   @param {number}  contrastFactor — multiplicador (1.4–3.0)
   @param {boolean} doInvert       — inverte antes do contraste
   @returns {Promise<Blob>}        — PNG processado
──────────────────────────────────────────────── */
function preprocessImage(file, contrastFactor, doInvert) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // 1. Escala ótima para OCR
      //    Tesseract prefere texto com ~30px de altura
      //    mínimo 1.5× para imagens pequenas, máximo 3× ou 3000px
      const sc = Math.max(1.5, Math.min(3, 3000 / img.width, 3000 / img.height));
      const W  = Math.round(img.width  * sc);
      const H  = Math.round(img.height * sc);

      const cv  = document.createElement("canvas");
      cv.width  = W;
      cv.height = H;
      const ctx = cv.getContext("2d");

      // 2. Fundo branco para PNGs com transparência
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, W, H);

      const id = ctx.getImageData(0, 0, W, H);
      const d  = id.data;

      for (let i = 0; i < d.length; i += 4) {
        // 3. Escala de cinza — luminância BT.601
        let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

        // 4. Inversão: screenshots com fundo escuro e texto claro
        //    → inverte para fundo branco/texto preto (ideal para Tesseract)
        if (doInvert) g = 255 - g;

        // 5. Contraste — amplifica desvio do ponto médio
        let c = (g - 128) * contrastFactor + 128;

        // 6. Threshold binário suave
        //    > 178 → branco puro (fundo)
        //    <  77 → preto puro (texto)
        //    zona cinza: mantém gradiente para não perder detalhes
        if      (c > 178) c = 255;
        else if (c <  77) c = 0;

        d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, Math.round(c)));
        d[i + 3] = 255; // alpha sempre opaco
      }

      // 7. Sharpen — melhora nitidez das bordas dos caracteres
      applySharpen(d, W, H);

      ctx.putImageData(id, 0, 0);
      cv.toBlob(
        b => b ? resolve(b) : reject(new Error("canvas→blob falhou")),
        "image/png"
      );
    };

    img.onerror = () => reject(new Error(`Falha ao carregar: ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

/* ────────────────────────────────────────────────
   Configuração otimizada do Tesseract para tabelas
──────────────────────────────────────────────── */
function getTesseractConfig(psm) {
  return {
    tessedit_pageseg_mode:      psm,
    preserve_interword_spaces: "1",
    load_system_dawg:          "0",   // desabilita dicionário (melhora números)
    load_freq_dawg:            "0",
    // whitelist — só caracteres que podem aparecer nos dados
    tessedit_char_whitelist:
      "0123456789" +
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
      "ÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜàáâãäçèéêëìíîïñòóôõöùúûü" +
      " /.,;:-_()",
  };
}

window.Preprocess = { preprocessImage, getTesseractConfig };
