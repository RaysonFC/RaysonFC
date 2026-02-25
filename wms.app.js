/* ============================================================
   WMS ANALÍTICO — wms.app.js
   Inicialização do app, tabs e badges do cabeçalho
   ============================================================ */

/* ---- Lançamento do app após upload ---- */
function launchApp(filename) {
  document.getElementById('upload-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('brand-file').textContent = filename;

  populateCdFilter();
  populateArmazFilter();
  updateBadges();

  initEstoque();
  initTransfer();
  initComp1();
  initComp2();
}

/* ---- Popula filtro de CDs ---- */
function populateCdFilter() {
  const cds = [...new Set(WMS_DATA.map(r => r.cd).filter(Boolean))]
    .sort((a, b) => +a - +b || a.localeCompare(b));

  const sel = document.getElementById('filter-cd');
  sel.innerHTML = '<option value="">Todos</option>';
  cds.forEach(cd => sel.innerHTML += `<option value="${cd}">CD ${cd}</option>`);

  /* Também popula o filtro de destino da aba Transferências */
  const tsel = document.getElementById('filter-t-dest');
  tsel.innerHTML = '<option value="">Todos</option>';
  cds.forEach(cd => tsel.innerHTML += `<option value="${cd}">CD ${cd}</option>`);

  document.getElementById('badge-cds').textContent = cds.length;
}

/* ---- Popula filtro de armazém (respeitando CD selecionado) ---- */
function populateArmazFilter(cdFilter = '') {
  const arms = [...new Set(
    WMS_DATA
      .filter(r => !cdFilter || r.cd === cdFilter)
      .map(r => r.cd_centro_armaz)
      .filter(Boolean)
  )].sort((a, b) => +a - +b || a.localeCompare(b));

  const sel = document.getElementById('filter-armaz');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos</option>';
  arms.forEach(arm => {
    const desc  = WMS_DATA.find(r => r.cd_centro_armaz === arm)?.desc_armaz || '';
    const label = desc ? `${arm} — ${desc}` : arm;
    sel.innerHTML += `<option value="${arm}">${label}</option>`;
  });
  if (arms.includes(cur)) sel.value = cur;
}

/* ---- Atualiza badges do cabeçalho ---- */
function updateBadges() {
  const critical = WMS_DATA.filter(r => r.saldo < CRITICAL).length;
  const urgent   = TRANSFER_DATA.filter(r => r.prioridade === 'URGENTE').length;

  document.getElementById('badge-total').textContent    = WMS_DATA.length.toLocaleString('pt-BR');
  document.getElementById('badge-critical').textContent = critical.toLocaleString('pt-BR');
  document.getElementById('badge-transfer').textContent = TRANSFER_DATA.length.toLocaleString('pt-BR');
  document.getElementById('tab-pill-transfer').textContent = TRANSFER_DATA.length;
  document.getElementById('ts-count').textContent  = TRANSFER_DATA.length;
  document.getElementById('ts-urgent').textContent = urgent;
}

/* ---- Navegação entre abas ---- */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});
