/* ============================================================
   WMS ANALÍTICO — wms.transfer.js
   Algoritmo de cálculo de sugestões de transferência.

   REGRA DE ELEGIBILIDADE:
   - Somente registros cujo cd_centro_armaz NÃO esteja na lista
     BLOCKED_ARMAZ_RAW podem participar de transferências.
   - Armazéns elegíveis: 1, 21, 28.
   - Bloqueados: 0002 0023 0025 0026 0027 0029 0032 0300 9999 INVE PERD
     (e qualquer variante com zeros à esquerda ou capitalização diferente).
   - O doador só empresta o EXCEDENTE acima de 200 — nunca fica abaixo do crítico.
   ============================================================ */

function buildTransferSuggestions() {

  /* Passo 1: Filtra somente registros elegíveis */
  const eligible = WMS_DATA.filter(r => isArmazEligible(r.cd_centro_armaz));

  /* Passo 2: Agrupa saldo elegível por (material + CD + armazém) */
  const byKey = {};
  eligible.forEach(r => {
    const key = `${r.cd_material}|||${r.cd}|||${r.cd_centro_armaz}`;
    if (!byKey[key]) {
      byKey[key] = {
        cd_material:     r.cd_material,
        desc_material:   r.desc_material,
        cd:              r.cd,
        cd_centro_armaz: r.cd_centro_armaz,
        saldo: 0,
      };
    }
    byKey[key].saldo += r.saldo;
  });

  /* Passo 3: Agrupa por material → lista de entradas {cd, armaz, saldo} */
  const byMat = {};
  Object.values(byKey).forEach(e => {
    if (!byMat[e.cd_material]) {
      byMat[e.cd_material] = { desc_material: e.desc_material, entries: [] };
    }
    byMat[e.cd_material].entries.push({
      cd:    e.cd,
      armaz: e.cd_centro_armaz,
      saldo: e.saldo,
    });
  });

  /* ---- Detecta itens sem saldo nos armazéns elegíveis ---- */
  ZERO_STOCK_DATA = [];
  eligible.filter(r => r.saldo <= 0).forEach(r => {
    const already = ZERO_STOCK_DATA.some(
      z => z.cd_material === r.cd_material &&
           z.cd === r.cd &&
           z.cd_centro_armaz === r.cd_centro_armaz
    );
    if (!already) {
      ZERO_STOCK_DATA.push({
        cd_material:     r.cd_material,
        desc_material:   r.desc_material,
        cd:              r.cd,
        cd_centro_armaz: r.cd_centro_armaz,
        saldo:           r.saldo,
      });
    }
  });

  const suggestions = [];

  /* Passo 4: Gera sugestões */
  Object.entries(byMat).forEach(([mat, data]) => {
    // Destinos: elegíveis com saldo < CRITICAL
    const critical = data.entries.filter(e => e.saldo < CRITICAL);
    // Doadores: elegíveis com saldo > 0 E excedente acima do crítico
    const donors   = data.entries.filter(e => e.saldo > 0 && (e.saldo - CRITICAL) > 0);

    if (critical.length === 0 || donors.length === 0) return;

    critical.forEach(dest => {
      const sortedDonors = [...donors].sort((a, b) => b.saldo - a.saldo);
      sortedDonors.forEach(orig => {
        if (orig.cd === dest.cd && orig.armaz === dest.armaz) return;

        const need  = CRITICAL - dest.saldo;
        const avail = orig.saldo - CRITICAL; // excedente real — nunca deixa doador abaixo de 200
        const qty   = Math.ceil(Math.min(need, avail));
        if (qty <= 0) return;

        const pct      = dest.saldo / CRITICAL;
        const priority = dest.saldo <= 0 || pct < 0.5 ? 'URGENTE'
                       : pct < 0.75                   ? 'ALTO'
                       :                                'NORMAL';

        suggestions.push({
          cd_material:   mat,
          desc_material: data.desc_material,
          cd_destino:    dest.cd,
          armaz_destino: dest.armaz,
          saldo_destino: dest.saldo,
          cd_origem:     orig.cd,
          armaz_origem:  orig.armaz,
          saldo_origem:  orig.saldo,
          qtd_sugerida:  qty,
          prioridade:    priority,
        });
      });
    });
  });

  /* Passo 5: Ordena por prioridade → menor saldo destino */
  suggestions.sort((a, b) => {
    const po = priorityOrder(a.prioridade) - priorityOrder(b.prioridade);
    if (po !== 0) return po;
    return a.saldo_destino - b.saldo_destino;
  });

  return suggestions;
}

/**
 * Itens completamente sem saldo nos armazéns elegíveis
 * (sem nenhum doador possível → transferência impossível).
 */
function buildNoStockItems() {
  const eligible = WMS_DATA.filter(r => isArmazEligible(r.cd_centro_armaz));
  const matSaldo = {};
  eligible.forEach(r => {
    if (!matSaldo[r.cd_material]) matSaldo[r.cd_material] = { desc: r.desc_material, total: 0 };
    matSaldo[r.cd_material].total += r.saldo;
  });
  return Object.entries(matSaldo)
    .filter(([, v]) => v.total <= 0)
    .map(([mat, v]) => ({ cd_material: mat, desc_material: v.desc, saldo_total: v.total }));
}
