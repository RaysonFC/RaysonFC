/* ============================================================
   WMS ANALÍTICO — wms.config.js
   Constantes globais e mapeamento de colunas
   ============================================================ */

const PAGE_SIZE  = 50;
const CRITICAL   = 200;
const WARN_MULT  = 1.5; // saldo < 200 * 1.5 = 300 → alerta amarelo

/**
 * Armazéns BLOQUEADOS para transferência.
 * Registros com cd_centro_armaz neste conjunto NÃO podem ser
 * origem nem destino de nenhuma transferência.
 *
 * Armazéns ELEGÍVEIS (podem transferir): 1, 21, 28
 * Todos os demais são bloqueados.
 *
 * A normalização remove zeros à esquerda e converte para maiúsculo,
 * para aceitar tanto "0002" quanto "2", "INVE" ou "inve" etc.
 */
const BLOCKED_ARMAZ_RAW = new Set([
  '2','23','25','26','27','29','32','300','9999','INVE','PERD',
]);

/** Normaliza cd_centro_armaz: remove zeros à esquerda (se numérico) e uppercase. */
function normalizeArmaz(v) {
  const s = String(v ?? '').trim().toUpperCase();
  if (/^\d+$/.test(s)) return String(parseInt(s, 10));
  return s;
}

/** Retorna true se o armazém está BLOQUEADO para transferência. */
function isArmazBlocked(v) {
  return BLOCKED_ARMAZ_RAW.has(normalizeArmaz(v));
}

/** Retorna true se o armazém é ELEGÍVEL para transferência. */
function isArmazEligible(v) {
  return !isArmazBlocked(v);
}

/* Lista de materiais sem saldo nos armazéns elegíveis */
let ZERO_STOCK_DATA = [];

/* Mapeamento de nomes de colunas aceitos no Excel (aliases) */
const COL_MAP = {
  cd_material:     ['cd_material','cdmaterial','codigo','code','material','cod_material'],
  desc_material:   ['descmaterial','desc_material','descricao','description','nome','desc'],
  cd:              ['cd_unidade_de_n','cd_unidade_de_negocio','cd_unidade','unidade_de_negocio','unidade_negocio','cd'],
  cd_centro_armaz: ['cd_centro_armaz','cdcentroarmaz','centro_armazenagem','centro_armaz','armazem_local','local_armaz','armaz'],
  saldo:           ['saldo','qtd','quantidade','stock','quantity','balance'],
  desc_armaz:      ['descarmaz','desc_armaz','descricao_armaz','desc_armazem','descricaoarmaz'],
  devolver:        ['devolver','qtd_devolver','return','retorno'],
};

/* Estado global de dados */
let WMS_DATA      = [];
let TRANSFER_DATA = [];

/* Estado de ordenação e paginação por aba */
const state = {
  estoque:  { sort: { col: null, dir: 1 }, page: 1 },
  transfer: { sort: { col: 'prioridade',  dir: 1 }, page: 1 },
  comp1:    { sort: { col: null, dir: 1 }, page: 1 },
  comp2:    { sort: { col: null, dir: 1 }, page: 1 },
};
