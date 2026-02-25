/* ============================================================
   WMS ANALÍTICO — wms.transfer.js
   Algoritmo de cálculo de sugestões de transferência
   ============================================================ */

/**
 * Analisa WMS_DATA e gera sugestões de transferência.
 *
 * Lógica:
 *  1. Agrupa saldo por (material + CD).
 *  2. Para cada material, separa CDs críticos (< 200) e doadores (>= 200).
 *  3. Para cada par crítico × doador, calcula a quantidade sugerida:
 *     - Precisa de (CRITICAL - saldo_destino) unidades.
 *     - Pode tirar do doador até (saldo_origem - CRITICAL); se isso for <= 0,
 *       usa até 50% do saldo do doador.
 *  4. Prioridade:
 *     - URGENTE: saldo_destino <= 0 ou < 50% do crítico
 *     - ALTO:    saldo_destino < 75% do crítico
 *     - NORMAL:  demais casos críticos
 *  5. Ordena por prioridade → menor saldo_destino.
 *
 * @returns {Array} Lista de objetos de sugestão de transferência.
 */
function buildTransferSuggestions() {
  /* Passo 1: Agrupar saldo por material + CD */
  const byMatCd = {};
  WMS_DATA.forEach(r => {
    const key = `${r.cd_material}|||${r.cd}`;
    if (!byMatCd[key]) {
      byMatCd[key] = { cd_material: r.cd_material, desc_material: r.desc_material, cd: r.cd, saldo: 0 };
    }
    byMatCd[key].saldo += r.saldo;
  });

  /* Passo 2: Agrupar por material */
  const byMat = {};
  Object.values(byMatCd).forEach(e => {
    if (!byMat[e.cd_material]) byMat[e.cd_material] = { desc_material: e.desc_material, cds: [] };
    byMat[e.cd_material].cds.push({ cd: e.cd, saldo: e.saldo });
  });

  const suggestions = [];

  /* Passo 3 & 4: Gerar sugestões */
  Object.entries(byMat).forEach(([mat, data]) => {
    const critical = data.cds.filter(c => c.saldo < CRITICAL);
    const donors   = data.cds.filter(c => c.saldo >= CRITICAL);
    if (critical.length === 0 || donors.length === 0) return;

    critical.forEach(dest => {
      const sortedDonors = [...donors].sort((a, b) => b.saldo - a.saldo);
      sortedDonors.forEach(orig => {
        if (orig.cd === dest.cd) return;

        const need  = CRITICAL - dest.saldo;
        const avail = orig.saldo - CRITICAL;
        const qty   = Math.ceil(Math.min(need, avail > 0 ? avail : orig.saldo * 0.5));
        if (qty <= 0) return;

        const pct      = dest.saldo / CRITICAL;
        const priority = dest.saldo <= 0 || pct < 0.5 ? 'URGENTE' : pct < 0.75 ? 'ALTO' : 'NORMAL';

        suggestions.push({
          cd_material:   mat,
          desc_material: data.desc_material,
          cd_destino:    dest.cd,
          saldo_destino: dest.saldo,
          cd_origem:     orig.cd,
          saldo_origem:  orig.saldo,
          qtd_sugerida:  qty,
          prioridade:    priority,
        });
      });
    });
  });

  /* Passo 5: Ordenar */
  suggestions.sort((a, b) => {
    const po = priorityOrder(a.prioridade) - priorityOrder(b.prioridade);
    if (po !== 0) return po;
    return a.saldo_destino - b.saldo_destino;
  });

  return suggestions;
}
