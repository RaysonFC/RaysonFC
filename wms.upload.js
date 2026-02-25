/* ============================================================
   WMS ANALÍTICO — wms.upload.js
   Upload de arquivo Excel, parsing e inicialização do app
   ============================================================ */

/* ---- Elementos DOM ---- */
const dropZone   = document.getElementById('drop-zone');
const fileInput  = document.getElementById('file-input');
const uploadProg = document.getElementById('upload-progress');
const progFill   = document.getElementById('progress-fill');
const progLabel  = document.getElementById('progress-label');
const uploadErr  = document.getElementById('upload-error');

/* ---- Drag & Drop ---- */
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer?.files?.[0];
  if (file) processFile(file);
});

/* ---- Clique para selecionar ---- */
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) processFile(fileInput.files[0]);
});

/* ---- Botão voltar ---- */
document.getElementById('back-btn').addEventListener('click', () => {
  document.getElementById('app').style.display = 'none';
  document.getElementById('upload-screen').style.display = 'flex';
  fileInput.value = '';
  uploadErr.style.display = 'none';
  progFill.style.width = '0%';
});

/* ---- Helpers de UI ---- */
function showError(msg) {
  uploadErr.textContent = msg;
  uploadErr.style.display = 'block';
  uploadProg.style.display = 'none';
}

function setProgress(pct, label) {
  progFill.style.width = pct + '%';
  progLabel.textContent = label;
}

/* ---- Processamento do arquivo ---- */
function processFile(file) {
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    showError('Arquivo inválido. Selecione um arquivo .xlsx ou .xls');
    return;
  }
  uploadErr.style.display = 'none';
  uploadProg.style.display = 'block';
  setProgress(10, 'Lendo arquivo...');

  const reader = new FileReader();
  reader.onload = e => {
    try {
      setProgress(40, 'Processando planilha...');
      const wb   = XLSX.read(e.target.result, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (rows.length < 2) { showError('Planilha vazia ou sem dados.'); return; }

      setProgress(60, 'Mapeando colunas...');
      const headers = rows[0];
      const idx = {};
      for (const [key, aliases] of Object.entries(COL_MAP)) {
        idx[key] = findCol(headers, aliases);
      }

      if (idx.saldo === -1) {
        showError(`Coluna de saldo não encontrada. Colunas disponíveis: ${headers.filter(Boolean).join(', ')}`);
        return;
      }

      setProgress(80, 'Carregando dados...');
      WMS_DATA = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r.every(c => c === '' || c == null)) continue;
        WMS_DATA.push({
          cd_material:     idx.cd_material     !== -1 ? String(r[idx.cd_material]     ?? '').trim() : '',
          desc_material:   idx.desc_material   !== -1 ? String(r[idx.desc_material]   ?? '').trim() : '',
          cd:              idx.cd              !== -1 ? normalizeArmaz(r[idx.cd])              : '',
          cd_centro_armaz: idx.cd_centro_armaz !== -1 ? normalizeArmaz(r[idx.cd_centro_armaz]) : '',
          saldo:           idx.saldo           !== -1 ? num(r[idx.saldo]) : 0,
          desc_armaz:      idx.desc_armaz      !== -1 ? String(r[idx.desc_armaz]      ?? '').trim() : '',
          devolver:        idx.devolver        !== -1 ? num(r[idx.devolver]) : 0,
        });
      }

      if (WMS_DATA.length === 0) { showError('Nenhum dado encontrado na planilha.'); return; }

      setProgress(95, 'Calculando transferências...');
      TRANSFER_DATA  = buildTransferSuggestions();
      ZERO_STOCK_DATA = buildNoStockItems();

      setProgress(100, `${WMS_DATA.length.toLocaleString('pt-BR')} registros — ${TRANSFER_DATA.length} sugestões de transferência`);
      setTimeout(() => launchApp(file.name), 450);

    } catch (err) {
      showError('Erro ao processar arquivo: ' + err.message);
    }
  };

  reader.onerror = () => showError('Erro ao ler o arquivo.');
  reader.readAsArrayBuffer(file);
}
