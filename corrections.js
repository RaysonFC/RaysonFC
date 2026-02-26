/* ══════════════════════════════════════════════════
   corrections.js
   Todas as correções de erros típicos do Tesseract
   nesta aplicação específica (tabelas de pedidos).

   Erros mapeados nas capturas reais:
   ┌──────────┬──────────────────────────────────────┐
   │ Campo    │ Problema observado                   │
   ├──────────┼──────────────────────────────────────┤
   │ UN / CA  │ D03→003, O001→0001, Q→0, S→5, B→8   │
   │ Código   │ cola com desc: "000372QUEIJO"        │
   │ Qtd      │ letras espúrias, separadores variados│
   │ Data     │ /, -, . como separador; ano 2 dígitos│
   │ Desc     │ / ou \ no início da string           │
   └──────────┴──────────────────────────────────────┘
══════════════════════════════════════════════════ */

"use strict";

/* ────────────────────────────────────────────────
   1. LIMPEZA GERAL DO TEXTO OCR BRUTO
   Remove artefatos antes de qualquer parsing
──────────────────────────────────────────────── */
function cleanText(text) {
  return text
    .replace(/[\x00-\x09\x0b-\x1f\x7f]/g, " ")   // controle exceto \n
    .replace(/\r\n?/g, "\n")                        // normaliza quebras
    .replace(/[|¦¡]/g, "1")                         // confundidos com 1
    .replace(/[©®°·•]/g, "0")                       // confundidos com 0
    .replace(/[^\x20-\x7E\u00C0-\u024F\u00A0\n]/g, " ") // fora do Latin
    .replace(/[^\S\n]+/g, " ");                     // espaços múltiplos
}

/* ────────────────────────────────────────────────
   2. NORMALIZA DATA → DD/MM/YYYY
   Aceita: DD/MM/YYYY · DD-MM-YYYY · DD.MM.YYYY
           DD/MM/YY · DD-MM-YY
──────────────────────────────────────────────── */
function fixDate(raw) {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  let d = raw.replace(/[-\.]/g, "/");
  d = d.replace(/^(\d)\//, "0$1/").replace(/\/(\d)\//, "/0$1/");
  d = d.replace(/^(\d{2}\/\d{2}\/)(\d{2})$/, (_, p, y) =>
    p + (+y <= 30 ? "20" : "19") + y
  );
  return d;
}

/* ────────────────────────────────────────────────
   3. CORRIGE LETRAS CONFUNDIDAS COM DÍGITOS
   Aplica em: UN, CA, Código (campos só-numéricos)
   NÃO aplicar no Pedido (ex: Mob115433N é intencional)

   Tabela de substituições:
   O,o → 0   D,d → 0   Q,q → 0
   I,i → 1   l,L → 1
   S,s → 5   B,b → 8   G,g → 9
   Z,z → 2   T   → 7
──────────────────────────────────────────────── */
function fixNum(s) {
  return String(s)
    .replace(/[oO]/g, "0")
    .replace(/[dD]/g, "0")   // D03 → 003 (mais frequente nesta aplicação)
    .replace(/[qQ]/g, "0")   // Q00436 → 000436
    .replace(/[iIlL]/g, "1")
    .replace(/[sS]/g, "5")
    .replace(/[bB]/g, "8")
    .replace(/[gG]/g, "9")
    .replace(/[zZ]/g, "2")
    .replace(/[T]/g,  "7");
}

/* ────────────────────────────────────────────────
   4. SEPARA CÓDIGO DA DESCRIÇÃO QUANDO COLADOS
   Ex: "000372QUEIJO MOZZARELLA"
       → código="000372", desc="QUEIJO MOZZARELLA"

   Também recupera código quando token é lixo (/)
──────────────────────────────────────────────── */
function fixCode(token, desc) {
  const t = token.trim();

  // já é 6 dígitos exatos
  if (/^\d{6}$/.test(t)) return [t, desc];

  // 4-5 dígitos truncados → padding
  if (/^\d{4,5}$/.test(t)) return [t.padStart(6, "0"), desc];

  // dígitos + texto colados: "000372QUEIJO"
  const gl = t.match(/^(\d{4,7})(.+)$/);
  if (gl) {
    return [
      gl[1].slice(0, 6).padStart(6, "0"),
      (gl[2].replace(/^[\s_\-]+/, "") + " " + desc).trim()
    ];
  }

  // token com letras no lugar de dígitos: "D00447", "O00372"
  const fc = fixNum(t);
  if (/^\d{4,7}$/.test(fc)) return [fc.padStart(6, "0"), desc];

  // letras coladas + dígitos: "AB0372QUEIJO"
  const glMixed = t.match(/^[A-Za-z]{1,2}(\d{4,6})(.*)$/);
  if (glMixed) {
    const fixedMixed = fixNum(glMixed[1]).padStart(6, "0");
    const restMixed  = (glMixed[2] + " " + desc).trim();
    return [fixedMixed, restMixed];
  }

  // token inválido (/, \, *, etc.) → busca código no início da desc
  if (/^[^0-9a-zA-Z]/.test(t) || t.length <= 1) {
    const m6 = desc.match(/^(\d{6})\s*(.*)/);
    if (m6) return [m6[1], m6[2]];

    const m = desc.match(/^(\d{4,7})\s+(.*)/);
    if (m) return [m[1].padStart(6, "0"), m[2]];

    const ml = desc.match(/^([A-Za-z0-9]{4,7})\s+(.*)/);
    if (ml) {
      const f = fixNum(ml[1]);
      if (/^\d+$/.test(f)) return [f.padStart(6, "0"), ml[2]];
    }
  }

  return [t, desc];
}

/* ────────────────────────────────────────────────
   5. PRÉ-CORREÇÃO POSICIONAL
   Corrige tokens POR POSIÇÃO na linha, ANTES do regex.
   Resolve o caso D03 que quebrava o \d+ no padrão.

   Estrutura: DATA PEDIDO UN CA QTD CODIGO DESC...
   Posição:   [0]  [1]    [2] [3] [4] [5]   [6+]
──────────────────────────────────────────────── */
function preCorrect(line) {
  let clean = line
    .replace(/^[\s_\-=\/\\]+/, "")
    .replace(/[\s_\-=]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  const tk = clean.split(" ");
  if (tk.length >= 6) {
    // pos[0]: Data — não mexer
    // pos[1]: Pedido — não mexer (alfanumérico intencional: Mob115433N)
    // pos[2]: UN — apenas dígitos
    tk[2] = fixNum(tk[2]).replace(/\D/g, "") || tk[2];
    // pos[3]: CA — apenas dígitos
    tk[3] = fixNum(tk[3]).replace(/\D/g, "") || tk[3];
    // pos[4]: Qtd — mantém só dígitos e separadores decimais
    tk[4] = tk[4].replace(/[^0-9.,]/g, "") || tk[4];
    // pos[5]: Código — tenta fixar se resultado for puramente numérico
    const cf = fixNum(tk[5].replace(/[^0-9a-zA-Z]/g, ""));
    if (/^\d+$/.test(cf)) tk[5] = cf;

    clean = tk.join(" ");
  }

  return clean;
}

window.Corrections = { cleanText, fixDate, fixNum, fixCode, preCorrect };
