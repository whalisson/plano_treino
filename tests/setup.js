/**
 * Gorila Gym — Test Setup (ES Modules)
 *
 * vi.hoisted() runs BEFORE any import executes, so the DOM skeleton and global
 * mocks are ready when logbook.js, rm.js, cardio.js, etc. run their top-level
 * addEventListener() calls.
 */
import { vi } from 'vitest';

// ── 1. DOM + globals that modules need at import time ────────────────────────
vi.hoisted(() => {
  // ── DOM skeleton ──
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
    <div    id="kboard"></div>
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
    <div    id="mPlanRPEName"></div>
    <div    id="mPlanRPEContent"></div>
    <select id="mPlanRPEDay"></select>
    <button id="btnCancelPlanRPE"></button>
    <button id="btnConfirmPlanRPE"></button>
    <!-- Modal execução RPE -->
    <div    id="mExecRPE"></div>
    <div    id="mExecRPETitle"></div>
    <div    id="mExecRPEDate"></div>
    <div    id="mExecRPEBody"></div>
    <div    id="mExecRPEContent"></div>
    <button id="btnCloseExecRPE"></button>
    <div    id="execToast"></div>

    <!-- Undo Toast -->
    <div id="undoToast">
      <span class="undo-msg"></span>
      <button class="undo-btn">Desfazer</button>
    </div>

    <!-- Histórico de execução -->
    <div    id="wlHistorySection" style="display:none;"></div>
    <div    id="wlHistoryCharts"></div>

    <!-- Registro de treino (dia completo) -->
    <div    id="mWorkoutLog"></div>
    <div    id="mWorkoutLogTitle"></div>
    <input  id="mWorkoutLogDate" value="">
    <div    id="mWorkoutLogBody"></div>
    <button id="btnCancelWorkoutLog"></button>
    <button id="btnFinishWorkoutLog"></button>

    <!-- Registro rápido (exercício individual) -->
    <div    id="mExLog"></div>
    <div    id="mExLogTitle"></div>
    <div    id="mExLogPlanned"></div>
    <div    id="mExLogLast"></div>
    <div    id="mExLogSets"></div>
    <input  id="mExLogKg" type="number" value="">
    <input  id="mExLogReps" type="number" value="">
    <button id="btnAddSetExLog"></button>
    <button id="btnCancelExLog"></button>
    <button id="btnSaveExLog"></button>

    <!-- App / navegação -->
    <div    id="ntabs"></div>
    <button id="btnExport"></button>
    <input  id="inputImport" type="file">
  `;

  // ── Chart.js mock (CDN, not available in tests) ──
  globalThis.Chart = class Chart {
    constructor() {}
    destroy() {}
    update() {}
  };

  // ── URL mocks ──
  globalThis.URL.createObjectURL = () => 'blob:mock';
  globalThis.URL.revokeObjectURL = () => {};

  // ── idbSet / idbGet proxy (allows tests to swap implementations) ──
  let _idbSetImpl = vi.fn(() => Promise.resolve());
  let _idbGetImpl = vi.fn(() => Promise.resolve(null));

  Object.defineProperty(globalThis, 'idbSet', {
    get: () => _idbSetImpl,
    set: (fn) => { _idbSetImpl = fn; },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'idbGet', {
    get: () => _idbGetImpl,
    set: (fn) => { _idbGetImpl = fn; },
    configurable: true,
  });

  globalThis.RECORD_KEY = 'main';
});

// ── 2. Mock db.js BEFORE any module that imports it resolves ─────────────────
vi.mock('../js/db.js', () => ({
  idbSet: (...args) => globalThis.idbSet(...args),
  idbGet: (...args) => globalThis.idbGet(...args),
  RECORD_KEY: 'main',
  DB_NAME: 'gorila-gym',
  STORE_NAME: 'state',
  DB_VERSION: 1,
  openDB: vi.fn(() => Promise.resolve({})),
}));

// ── 3. Import modules (DOM is ready because vi.hoisted ran first) ─────────────
import * as stateModule from '../js/state.js';
import { board, setBoard, bank, setBank } from '../js/logbook.js';
import { rmHistory, setRmHistory } from '../js/rm.js';
import { cardioExtra, setCardioExtra, savedWorkouts, setSavedWorkouts, cardioBase } from '../js/cardio.js';
import { rpeBlocks, setRpeBlocks } from '../js/rpe.js';
import { workoutLog, setWorkoutLog, renderWorkoutHistory, openExLog, exLogAddSet, exLogSave } from '../js/workoutlog.js';
import * as periodizacaoModule from '../js/periodizacao.js';

// ── 4. Expose simple globals (uid, g, round05, etc.) ────────────────────────
Object.assign(globalThis, stateModule);
Object.assign(globalThis, periodizacaoModule);
// Setters de board/bank expostos como funções chamáveis nos testes
globalThis.setBoard = setBoard;
globalThis.setBank  = setBank;

// ── 5. Proxy globals for mutable state ───────────────────────────────────────
const proxyMap = {
  board:          { get: () => board,        set: setBoard        },
  bank:           { get: () => bank,         set: setBank         },
  rmHistory:      { get: () => rmHistory,    set: setRmHistory    },
  cardioExtra:    { get: () => cardioExtra,  set: setCardioExtra  },
  savedWorkouts:  { get: () => savedWorkouts, set: setSavedWorkouts },
  rpeBlocks:      { get: () => rpeBlocks,    set: setRpeBlocks    },
  workoutLog:     { get: () => workoutLog,   set: setWorkoutLog   },
  checksState:    { get: () => stateModule.checksState,    set: stateModule.setChecksState    },
  rmTestValues:   { get: () => stateModule.rmTestValues,   set: stateModule.setRmTestValues   },
  kgHistory:      { get: () => stateModule.kgHistory,      set: stateModule.setKgHistory      },
  cycleHistory:   { get: () => stateModule.cycleHistory,   set: stateModule.setCycleHistory   },
  customLifts:    { get: () => stateModule.customLifts,    set: stateModule.setCustomLifts    },
  cycleStartDates:{ get: () => stateModule.cycleStartDates, set: stateModule.setCycleStartDates },
};

for (const [key, { get, set }] of Object.entries(proxyMap)) {
  Object.defineProperty(globalThis, key, { get, set, configurable: true, enumerable: true });
}

// ── 6. cardioBase as simple global ───────────────────────────────────────────
globalThis.cardioBase = cardioBase;

// ── 7. Expose render functions so tests can find them via globalThis ──────────
import { detectExerciseGroup, parseVolume, renderKanban, renderBank, setupBankDropzone, renderPeriodGrid, renderProgressCharts } from '../js/logbook.js';
import { calcRM, parseRMDate, populateRMLiftSelect, renderRMHistory } from '../js/rm.js';
import { parseCardioDate, allCardioSessions, calcCardioStreak, CARDIO_TYPE_LABELS, CARDIO_TYPE_COLORS, buildCardioChart, renderBuilderSegs, renderSavedWorkouts } from '../js/cardio.js';
import { getRPEFactor, calcRPEWeight, getRPEColor, estimateExecRM, execStates, renderRPEBlocks } from '../js/rpe.js';
import { buildAllPeriod, renderCustomLifts, renderCycleHistory, LIFT_LABELS, LIFT_COLORS, LIFT_FILL, LIFT_SOLID, periodBase, CUSTOM_LIFT_PALETTE, hexToRgb, getCustomColor, parseCycleDate } from '../js/periodizacao.js';

globalThis.detectExerciseGroup = detectExerciseGroup;
globalThis.parseVolume = parseVolume;
globalThis.renderKanban = renderKanban;
globalThis.renderBank = renderBank;
globalThis.setupBankDropzone = setupBankDropzone;
globalThis.renderPeriodGrid = renderPeriodGrid;
globalThis.renderProgressCharts = renderProgressCharts;
globalThis.calcRM = calcRM;
globalThis.parseRMDate = parseRMDate;
globalThis.populateRMLiftSelect = populateRMLiftSelect;
globalThis.renderRMHistory = renderRMHistory;
globalThis.parseCardioDate = parseCardioDate;
globalThis.allCardioSessions = allCardioSessions;
globalThis.calcCardioStreak = calcCardioStreak;
globalThis.CARDIO_TYPE_LABELS = CARDIO_TYPE_LABELS;
globalThis.CARDIO_TYPE_COLORS = CARDIO_TYPE_COLORS;
globalThis.buildCardioChart = buildCardioChart;
globalThis.renderBuilderSegs = renderBuilderSegs;
globalThis.renderSavedWorkouts = renderSavedWorkouts;
globalThis.getRPEFactor = getRPEFactor;
globalThis.calcRPEWeight = calcRPEWeight;
globalThis.getRPEColor = getRPEColor;
globalThis.estimateExecRM = estimateExecRM;
globalThis.execStates = execStates;
globalThis.renderRPEBlocks = renderRPEBlocks;
globalThis.renderWorkoutHistory = renderWorkoutHistory;
globalThis.openExLog            = openExLog;
globalThis.exLogAddSet          = exLogAddSet;
globalThis.exLogSave            = exLogSave;
globalThis.buildAllPeriod = buildAllPeriod;
globalThis.renderCustomLifts = renderCustomLifts;
globalThis.renderCycleHistory = renderCycleHistory;
globalThis.LIFT_LABELS = LIFT_LABELS;
globalThis.LIFT_COLORS = LIFT_COLORS;
globalThis.LIFT_FILL = LIFT_FILL;
globalThis.LIFT_SOLID = LIFT_SOLID;
globalThis.periodBase = periodBase;
globalThis.CUSTOM_LIFT_PALETTE = CUSTOM_LIFT_PALETTE;
globalThis.hexToRgb = hexToRgb;
globalThis.getCustomColor = getCustomColor;
globalThis.parseCycleDate = parseCycleDate;
