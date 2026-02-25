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
  /**
   * REGRA: somente registros em cd_centro_armaz ∈ {1, 21, 28}
   * podem participar de transferências (como origem OU destino).
   * Registros em outros armazéns são ignorados aqui.
   */
  const eligible = WMS_DATA.filter(r => TRANSFER_ARMAZ.has(r.cd_centro_armaz));

  /* Passo 1: Agrupar saldo elegível por (material + CD + armazém) */
  const byMatCdArm = {};
  eligible.forEach(r => {
    const key = `${r.cd_material}|||${r.cd}|||${r.cd_centro_armaz}`;
    if (!byMatCdArm[key]) {
      byMatCdArm[key] = {
        cd_material:   r.cd_material,
        desc_material: r.desc_material,
        cd:            r.cd,
        cd_centro_armaz: r.cd_centro_armaz,
        saldo: 0,
      };
    }
    byMatCdArm[key].saldo += r.saldo;
  });

  /* Passo 2: Agrupar por material → lista de {cd, armaz, saldo} */
  const byMat = {};
  Object.values(byMatCdArm).forEach(e => {
    if (!byMat[e.cd_material]) {
      byMat[e.cd_material] = { desc_material: e.desc_material, entries: [] };
    }
    byMat[e.cd_material].entries.push({
      cd:    e.cd,
      armaz: e.cd_centro_armaz,
      saldo: e.saldo,
    });
  });

  /* ---- Detectar itens sem saldo nos armazéns elegíveis ---- */
  ZERO_STOCK_DATA = [];
  Object.entries(byMat).forEach(([mat, data]) => {
    data.entries.forEach(e => {
      if (e.saldo <= 0) {
        ZERO_STOCK_DATA.push({
          cd_material:   mat,
          desc_material: data.desc_material,
          cd:            e.cd,
          cd_centro_armaz: e.armaz,
          saldo:         e.saldo,
        });
      }
    });
  });
  // Também incluir materiais presentes em WMS_DATA nos armazéns elegíveis com saldo zero
  // que podem não ter aparecido (ex: saldo exatamente 0 no dado original)
  WMS_DATA.filter(r => TRANSFER_ARMAZ.has(r.cd_centro_armaz) && r.saldo <= 0).forEach(r => {
    const already = ZERO_STOCK_DATA.some(
      z => z.cd_material === r.cd_material && z.cd === r.cd && z.cd_centro_armaz === r.cd_centro_armaz
    );
    if (!already) {
      ZERO_STOCK_DATA.push({
        cd_material:   r.cd_material,
        desc_material: r.desc_material,
        cd:            r.cd,
        cd_centro_armaz: r.cd_centro_armaz,
        saldo:         r.saldo,
      });
    }
  });

  const suggestions = [];

  /* Passo 3 & 4: Gerar sugestões de transferência */
  Object.entries(byMat).forEach(([mat, data]) => {
    // Críticos = entradas com saldo < CRITICAL (apenas nos armazéns elegíveis)
    const critical = data.entries.filter(e => e.saldo < CRITICAL);
    // Doadores  = entradas com saldo > 0 e >= CRITICAL
    const donors   = data.entries.filter(e => e.saldo > 0 && e.saldo >= CRITICAL);

    if (critical.length === 0 || donors.length === 0) return;

    critical.forEach(dest => {
      // Não sugerir transferência para itens com saldo zero (sem doador disponível)
      const sortedDonors = [...donors].sort((a, b) => b.saldo - a.saldo);
      sortedDonors.forEach(orig => {
        // Origem e destino não podem ser o mesmo CD + armazém
        if (orig.cd === dest.cd && orig.armaz === dest.armaz) return;

        const need  = CRITICAL - dest.saldo;
        const avail = orig.saldo - CRITICAL;
        // Quantidade sugerida: o que o destino precisa, limitado ao excedente do doador
        // Se o doador não tem excedente, não sugerir (não deixar doador ficar crítico)
        if (avail <= 0) return;

        const qty = Math.ceil(Math.min(need, avail));
        if (qty <= 0) return;

        const pct      = dest.saldo / CRITICAL;
        const priority = dest.saldo <= 0 || pct < 0.5 ? 'URGENTE' : pct < 0.75 ? 'ALTO' : 'NORMAL';

        suggestions.push({
          cd_material:      mat,
          desc_material:    data.desc_material,
          cd_destino:       dest.cd,
          armaz_destino:    dest.armaz,
          saldo_destino:    dest.saldo,
          cd_origem:        orig.cd,
          armaz_origem:     orig.armaz,
          saldo_origem:     orig.saldo,
          qtd_sugerida:     qty,
          prioridade:       priority,
        });
      });
    });
  });

  /* Passo 5: Ordenar por prioridade → menor saldo destino */
  suggestions.sort((a, b) => {
    const po = priorityOrder(a.prioridade) - priorityOrder(b.prioridade);
    if (po !== 0) return po;
    return a.saldo_destino - b.saldo_destino;
  });

  return suggestions;
}

/**
 * Constrói lista de itens sem saldo nos armazéns elegíveis
 * que não têm nenhum doador disponível (sem transferência possível).
 */
function buildNoStockItems() {
  // Materiais que aparecem APENAS em armazéns elegíveis com saldo zero
  // e não têm nenhum doador → não podem receber transferência
  const eligible = WMS_DATA.filter(r => TRANSFER_ARMAZ.has(r.cd_centro_armaz));
  const matSaldoMap = {};
  eligible.forEach(r => {
    if (!matSaldoMap[r.cd_material]) matSaldoMap[r.cd_material] = { desc: r.desc_material, total: 0 };
    matSaldoMap[r.cd_material].total += r.saldo;
  });

  return Object.entries(matSaldoMap)
    .filter(([, v]) => v.total <= 0)
    .map(([mat, v]) => ({ cd_material: mat, desc_material: v.desc, saldo_total: v.total }));
}
