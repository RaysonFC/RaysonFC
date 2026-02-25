/* ============================================================
   WMS ANALÍTICO — wms.helpers.js
   Funções utilitárias compartilhadas
   ============================================================ */

/**
 * Encontra o índice de uma coluna nos headers do Excel
 * com correspondência exata, prefixo e parcial (nessa ordem).
 */
function findCol(headers, keys) {
  const lc = headers.map(h => String(h ?? '').toLowerCase().trim().replace(/[\s\-\.]/g, '_'));
  for (const k of keys) { const i = lc.findIndex(h => h === k);         if (i !== -1) return i; }
  for (const k of keys) { const i = lc.findIndex(h => h.startsWith(k)); if (i !== -1) return i; }
  for (const k of keys) { const i = lc.findIndex(h => h.includes(k));   if (i !== -1) return i; }
  return -1;
}

/** Converte string para número, tratando vírgula decimal. */
function num(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

/** Formata número no padrão pt-BR; retorna dash HTML se nulo/vazio. */
function fmt(v, dash = true) {
  if (dash && (v === null || v === undefined || v === '')) return '<span class="val-empty">—</span>';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Formata número com classe de cor baseada no nível de saldo.
 * Vermelho = crítico, âmbar = atenção, verde = OK.
 */
function fmtNum(v) {
  if (v === null) return '<span class="val-empty">—</span>';
  const cls = v < CRITICAL ? 'val-critical' : v < CRITICAL * WARN_MULT ? 'val-warn' : 'val-ok';
  return `<span class="${cls}">${fmt(v, false)}</span>`;
}

/** Retorna badge HTML de situação de saldo. */
function saldoStatus(v) {
  if (v === null || v === undefined) return '<span class="val-empty">—</span>';
  if (v < CRITICAL)              return `<span class="transfer-priority priority-urgent">● CRÍTICO</span>`;
  if (v < CRITICAL * WARN_MULT)  return `<span class="transfer-priority priority-high">◐ ATENÇÃO</span>`;
  return                                `<span class="transfer-priority priority-normal">○ OK</span>`;
}

/** Retorna badge HTML colorido de CD. */
function cdBadge(cd) {
  const c = String(cd ?? '').trim();
  const cls = c === '1' ? 'cd-1' : c === '3' ? 'cd-3' : c === '6' ? 'cd-6' : c === '7' ? 'cd-7' : 'cd-x';
  return `<span class="cd-badge ${cls}">CD ${c || '?'}</span>`;
}

/** Classe CSS do badge de CD (sem o elemento span). */
function cdClass(cd) {
  return cd === '1' ? 'cd-1' : cd === '3' ? 'cd-3' : cd === '6' ? 'cd-6' : cd === '7' ? 'cd-7' : 'cd-x';
}

/** Retorna badge HTML de prioridade de transferência. */
function priorityBadge(p) {
  const cls = p === 'URGENTE' ? 'priority-urgent' : p === 'ALTO' ? 'priority-high' : 'priority-normal';
  const dot = p === 'URGENTE' ? '▲' : p === 'ALTO' ? '◐' : '○';
  return `<span class="transfer-priority ${cls}">${dot} ${p}</span>`;
}

/** Ordem numérica de prioridade para ordenação. */
function priorityOrder(p) {
  return p === 'URGENTE' ? 0 : p === 'ALTO' ? 1 : 2;
}

/**
 * Ordena um array de objetos por coluna e direção.
 * Prioridade tem tratamento especial (string → ordem numérica).
 */
function sortData(data, col, dir) {
  if (!col) return data;
  return [...data].sort((a, b) => {
    let va = a[col], vb = b[col];
    if (col === 'prioridade') { va = priorityOrder(va); vb = priorityOrder(vb); }
    if (va === null || va === undefined) va = typeof vb === 'number' ? -Infinity : '';
    if (vb === null || vb === undefined) vb = typeof va === 'number' ? -Infinity : '';
    if (typeof va === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
}

/**
 * Renderiza paginação dentro de um container.
 * @param {string}   id          - ID do elemento container
 * @param {number}   total       - Total de registros
 * @param {number}   currentPage - Página atual (1-based)
 * @param {Function} onPage      - Callback recebendo o número da página clicada
 */
function renderPagination(id, total, currentPage, onPage) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const el = document.getElementById(id);
  if (totalPages <= 1) {
    el.innerHTML = `<span class="page-info">${total.toLocaleString('pt-BR')} registros</span>`;
    return;
  }
  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end   = Math.min(currentPage * PAGE_SIZE, total);
  const pages = [...new Set(
    [1, totalPages, currentPage, currentPage - 1, currentPage - 2, currentPage + 1, currentPage + 2]
      .filter(p => p >= 1 && p <= totalPages)
  )].sort((a, b) => a - b);

  let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="(${onPage})(${currentPage - 1})">‹</button>`;
  html += `<span class="page-info">${start}–${end} / ${total.toLocaleString('pt-BR')}</span>`;
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) html += `<span class="page-info">…</span>`;
    html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="(${onPage})(${p})">${p}</button>`;
    prev = p;
  }
  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="(${onPage})(${currentPage + 1})">›</button>`;
  el.innerHTML = html;
}

/**
 * Atualiza classes de ordenação nos cabeçalhos de uma tabela.
 */
function updateSortHeaders(tableId, sortState) {
  document.querySelectorAll(`#${tableId} th.sortable`).forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === sortState.col) {
      th.classList.add(sortState.dir === 1 ? 'sort-asc' : 'sort-desc');
    }
  });
}
