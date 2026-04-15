/**
 * Gorila Gym — Test Setup
 *
 * Cria o DOM mínimo e mocks necessários para carregar os módulos
 * vanilla JS da aplicação em ambiente jsdom (Node.js/Jest).
 */

// ── 1. Mock Chart.js (carregado via CDN, não disponível em testes) ──
global.Chart = class Chart {
  constructor() {}
  destroy() {}
  update() {}
};

// ── 2. Mock das funções de persistência (substitui db.js) ──
global.idbSet = () => Promise.resolve();
global.idbGet = () => Promise.resolve(null);
global.RECORD_KEY = 'main';

// ── 3. Mock de URL.createObjectURL (não existe no jsdom) ──
global.URL.createObjectURL = () => 'blob:mock';
global.URL.revokeObjectURL = () => {};

// ── 4. Skeleton HTML com todos os elementos referenciados pelos módulos ──
document.body.innerHTML = `
  <!-- RMs globais -->
  <input id="rm-supino" value="74">
  <input id="rm-agacha" value="93">
  <input id="rm-terra"  value="110">

  <!-- Calculadora 1RM -->
  <input  id="rmW" type="number" value="">
  <input  id="rmR" type="number" value="1">
  <div    id="rmSaveCard" style="display:none;"></div>
  <div    id="rmResult"></div>
  <div    id="rmBrzycki"></div>
  <div    id="rmEpley"></div>
  <div    id="rmMayhew"></div>
  <table><tbody id="rmTbody"></tbody></table>
  <div    id="rmHistPreview"></div>
  <input  id="rmHistDate" value="">
  <select id="rmHistLift"></select>
  <button id="btnSaveRM">Salvar</button>
  <div    id="rmHistorySection" style="display:none;"></div>
  <canvas id="rmHistChart"></canvas>
  <div    id="rmHistList"></div>

  <!-- Cardio -->
  <input  id="cardioDate" value="">
  <button id="btnCardioHoje"></button>
  <button id="btnAddCardio"></button>
  <input  id="cardioGoal" value="300">
  <input  id="cardioDailyGoal" value="43">
  <div    id="cardioWeekMins"></div>
  <div    id="cardioWeekBar" style="width:0%;"></div>
  <div    id="cardioWeekPct"></div>
  <div    id="cardioWeekLeft"></div>
  <div    id="cardioWeekRange"></div>
  <div    id="cardioStreak"></div>
  <div    id="cardioSessionList"></div>
  <button id="btnClearWkt"></button>
  <button id="btnSaveWkt"></button>
  <div    id="builderSegs"></div>
  <div    id="builderTimeline"></div>
  <div    id="savedWorkoutsList"></div>
  <!-- Modais cardio -->
  <div    id="mEditWkt"></div>
  <input  id="mWktName" value="">
  <div    id="mWktSegments"></div>
  <div    id="mWktTimeline"></div>
  <button id="btnCancelEditWkt"></button>
  <button id="btnConfirmEditWkt"></button>
  <div    id="mLogWkt"></div>
  <div    id="mLogWktTitle"></div>
  <div    id="mLogWktTotal"></div>
  <div    id="mLogWktTimeline"></div>
  <input  id="mLogWktDate" value="">
  <div    id="mLogWktSegs"></div>
  <button id="btnCancelLogWkt"></button>
  <button id="btnConfirmLogWkt"></button>

  <!-- Logbook / banco de exercícios -->
  <input  id="bankSearch" value="">
  <div    id="bankGroupFilter"></div>
  <div    id="ebank"></div>
  <div    id="kanban"></div>
  <div    id="pgrid"></div>
  <button id="btnAddEx"></button>
  <!-- Modal exercício -->
  <div    id="mAddEx"></div>
  <div    id="mExTitle"></div>
  <input  id="mExName" value="">
  <input  id="mExKg" value="">
  <input  id="mExReps" value="">
  <select id="mExGroup"></select>
  <div    id="mExDeleteWrap"></div>
  <button id="btnCancelEx"></button>
  <button id="btnConfirmEx"></button>
  <button id="btnDeleteEx"></button>
  <!-- Progresso de carga -->
  <div    id="progressSection" style="display:none;"></div>
  <div    id="progressCharts"></div>

  <!-- Periodização — cabeçalhos colapsáveis dos 3 lifts -->
  <div id="psh-supino" class="psh"></div>
  <div id="psb-supino" class="psb"></div>
  <span id="chev-supino">▼</span>
  <div id="psh-agacha" class="psh"></div>
  <div id="psb-agacha" class="psb"></div>
  <span id="chev-agacha">▼</span>
  <div id="psh-terra" class="psh"></div>
  <div id="psb-terra" class="psb"></div>
  <span id="chev-terra">▼</span>
  <!-- Periodização — tabelas e progresso -->
  <div    id="tbl-supino"></div>
  <div    id="tbl-agacha"></div>
  <div    id="tbl-terra"></div>
  <div    id="customLiftsSection"></div>
  <div    id="customMetrics"></div>
  <div    id="cycleHistorySection" style="display:none;"></div>
  <canvas id="cycleChart"></canvas>
  <div    id="cycleList"></div>
  <!-- Modal lift customizado -->
  <div    id="mAddLift"></div>
  <input  id="mLiftName" value="">
  <input  id="mLiftRM" value="">
  <button id="btnAddCustomLift"></button>
  <button id="btnCancelLift"></button>
  <button id="btnConfirmLift"></button>

  <!-- RPE -->
  <div    id="psb-rpetable"></div>
  <span   id="chev-rpetable">▼</span>
  <div    id="rpe-table-wrap"></div>
  <div    id="rpeExerciseList"></div>
  <div    id="rpeBlockList"></div>
  <input  id="rpeBlockName" value="">
  <select id="rpeExName"></select>
  <input  id="rpeExRM" value="">
  <div    id="rpeBuilderTitle">Novo Bloco de Treino</div>
  <div    id="rpeBlocksList"></div>
  <button id="btnAddRPEEx"></button>
  <button id="btnClearRPEBlock"></button>
  <button id="btnSaveRPEBlock"></button>
  <!-- Modal plano RPE -->
  <div    id="mPlanRPE"></div>
  <div    id="mPlanRPETitle"></div>
  <div    id="mPlanRPEContent"></div>
  <button id="btnCancelPlanRPE"></button>
  <button id="btnConfirmPlanRPE"></button>
  <!-- Modal execução RPE -->
  <div    id="mExecRPE"></div>
  <div    id="mExecRPEContent"></div>
  <button id="btnCloseExecRPE"></button>
  <div    id="execToast"></div>

  <!-- Undo Toast -->
  <div id="undoToast">
    <span class="undo-msg"></span>
    <button class="undo-btn">Desfazer</button>
  </div>

  <!-- App / navegação -->
  <div    id="ntabs"></div>
  <button id="btnExport"></button>
  <input  id="inputImport" type="file">
`;

// ── 5. Carrega os módulos em ordem de dependência ──
//    Usa eval indireto (0,eval) para que os `var` de cada script
//    entrem no escopo global do jsdom, assim como fariam no browser.
//    (db.js é substituído pelo mock de idbSet/idbGet definido acima)
const fs   = require('fs');
const path = require('path');

function loadScript(name) {
  const code = fs.readFileSync(path.resolve(__dirname, '../js', name), 'utf8');
  // eslint-disable-next-line no-eval
  (0, eval)(code);
}

loadScript('state.js');
loadScript('periodizacao.js');
loadScript('logbook.js');
loadScript('rm.js');
loadScript('cardio.js');
loadScript('rpe.js');
