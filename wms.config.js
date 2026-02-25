/* ============================================================
   WMS ANALÍTICO — wms.config.js
   Constantes globais e mapeamento de colunas
   ============================================================ */

const PAGE_SIZE  = 50;
const CRITICAL   = 200;
const WARN_MULT  = 1.5; // saldo < 200 * 1.5 = 300 → alerta amarelo

/**
 * Armazéns locais elegíveis para transferência.
 * Somente registros com cd_centro_armaz neste conjunto
 * podem ser origem OU destino de uma transferência.
 */
const TRANSFER_ARMAZ = new Set(['1', '21', '28']);

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
