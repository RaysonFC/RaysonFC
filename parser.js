/* ══════════════════════════════════════════════════
   parser.js
   Converte texto bruto do Tesseract em linhas estruturadas.

   Estratégia em 5 etapas:
   ① Limpeza geral do texto (corrections.cleanText)
   ② Filtragem de linhas: tamanho mínimo, sem cabeçalho, com data
   ③ Pré-correção posicional de tokens (corrections.preCorrect)
      → resolve D03→003 ANTES do regex
   ④ Match com 4 padrões regex em cascata (estrito → flexível)
   ⑤ Pós-correção dos campos capturados
══════════════════════════════════════════════════ */

"use strict";

const { cleanText, fixDate, fixNum, fixCode, preCorrect } = window.Corrections;

/* ────────────────────────────────────────────────
   Padrões regex — estrutura esperada por linha:
   Data  | Pedido | UN    | CA    | Qtd  | Código | Descrição
   \d{2} | \S+    | \S{1-5}| \S{1-5}| num | código | texto livre

   \S{1,5} para UN/CA aceita tokens com letras (D03, O001)
   que serão corrigidos na pré-correção posicional antes do match.
──────────────────────────────────────────────── */
const DATE_PAT = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/;
const HDR_PAT  = /^(Data|Pedido|UN|CA|Qtd|C.d|Descri)/i;

const PATS = [
  // P1 — código exato de 6 dígitos (mais confiável)
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(\S+)\s+(\S{1,5})\s+(\S{1,5})\s+([\d.,]+)\s+(\d{6})\s+(.*)/,

  // P2 — código iniciando com dígito, pode vir colado à descrição
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(\S+)\s+(\S{1,5})\s+(\S{1,5})\s+([\d.,]+)\s+([0-9]\S{3,})\s+(.*)/,

  // P3 — qualquer token como código (fallback para /, *, etc.)
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(\S+)\s+(\S{1,5})\s+(\S{1,5})\s+([\d.,]+)\s+(\S+)\s+(.*)/,

  // P4 — linha sem descrição (truncada pelo OCR)
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(\S+)\s+(\S{1,5})\s+(\S{1,5})\s+([\d.,]+)\s+(\S+)/,
];

/* ────────────────────────────────────────────────
   parseLine
   @param {string} raw — linha bruta
   @returns {string[]|null} — [Data,Pedido,UN,CA,Qtd,Cod,Desc] ou null
──────────────────────────────────────────────── */
function parseLine(raw) {
  // ① Pré-correção posicional
  const line = preCorrect(raw);

  // ② Tenta cada padrão
  for (const pat of PATS) {
    const m = line.match(pat);
    if (!m) continue;

    let rawCode = (m[6] || "").trim();
    let rawDesc = (m[7] || "").trim().replace(/^[\/\\]+\s*/, ""); // remove / ou \ do início da desc

    // ③ Separa código colado da descrição
    const [code, desc] = fixCode(rawCode, rawDesc);

    // ④ Corrige e limpa campos numéricos
    const un  = fixNum(m[3]).replace(/\D/g, "");
    const ca  = fixNum(m[4]).replace(/\D/g, "");
    const qtd = m[5].replace(/[^0-9.,]/g, "");

    // descarta linha se campos obrigatórios estiverem vazios/inválidos
    if (!un || !ca || !qtd) continue;

    return [
      fixDate(m[1].trim()),     // Data
      m[2].trim(),               // Pedido (alfanumérico — preservar exatamente)
      un.padStart(3, "0"),      // UN     (3 dígitos com padding)
      ca.padStart(4, "0"),      // CA     (4 dígitos com padding)
      qtd,                       // Qtd
      code.padStart(6, "0"),    // Código (6 dígitos com padding)
      desc,                      // Descrição
    ];
  }

  return null; // nenhum padrão casou → linha não reconhecida
}

/* ────────────────────────────────────────────────
   parseOCRText
   Processa o texto completo retornado pelo Tesseract.
   @param {string} ocrText
   @returns {{ rows: string[][], skipped: string[] }}
──────────────────────────────────────────────── */
function parseOCRText(ocrText) {
  const rows    = [];
  const skipped = [];

  cleanText(ocrText)
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length >= 15)       // descarta ruído muito curto
    .filter(l => !HDR_PAT.test(l))     // descarta linha de cabeçalho da tabela
    .filter(l => DATE_PAT.test(l))     // exige padrão de data para aceitar a linha
    .forEach(line => {
      const r = parseLine(line);
      r ? rows.push(r) : skipped.push(line);
    });

  return { rows, skipped };
}

window.Parser = { parseLine, parseOCRText };
