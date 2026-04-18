// ── GORILA GYM — state.js ────────────────────
// Utilitários, constantes de base e estado global compartilhado

import { idbSet, idbGet, RECORD_KEY } from './db.js';

export function uid() { return Math.random().toString(36).slice(2, 9); }
export function g(id) { return document.getElementById(id); }
export function round05(v) { return Math.round(v * 2) / 2; }

export function getWeekRange() {
  var now    = new Date();
  var dow    = now.getDay();
  var monday = new Date(now); monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1)); monday.setHours(0,0,0,0);
  var sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  return { start:monday, end:sunday };
}

// ── Undo Toast ────────────────────────────────
let _undoTimer = null;
export function showUndo(message, undoFn, commitFn) {
  clearTimeout(_undoTimer);
  var toast = g('undoToast');
  toast.querySelector('.undo-msg').textContent = message;
  toast.classList.add('on');
  var btn    = toast.querySelector('.undo-btn');
  var newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', function() {
    clearTimeout(_undoTimer);
    toast.classList.remove('on');
    undoFn();
  });
  _undoTimer = setTimeout(function() {
    toast.classList.remove('on');
    if (commitFn) commitFn();
  }, 4000);
}

// Parse "NxM" → número de séries
export function parseSetCount(rStr) {
  var m = rStr.match(/^(\d+)x(\d+)$/);
  if (m) return parseInt(m[1]);
  return 1;
}

// ── Valores-base dos RMs ──────────────────────
export var BASE_SUP = 74;
export var BASE_AGA = 93;
export var BASE_TER = 110;

// ── Estado global ─────────────────────────────
// checksState[lift][weekIdx][serIdx] = bool
export let checksState = { supino: {}, agacha: {}, terra: {} };
// rmTestValues[lift][weekIdx] = kg inserido pelo usuário
export let rmTestValues = { supino: {}, agacha: {}, terra: {} };
// kgHistory[exId] = [{date, kg, name}]
export let kgHistory = {};
// cycleHistory = [{lift, rmStart, rmEnd, dateStart, dateEnd, gain, id}]
export let cycleHistory = [];
// customLifts = [{id, name, rm}]
export let customLifts = [];
// cycleStartDates[liftKey] = 'dd/mm/yyyy' — primeiro check do ciclo
export let cycleStartDates = {};

export function setChecksState(v) { checksState = v; }
export function setRmTestValues(v) { rmTestValues = v; }
export function setKgHistory(v) { kgHistory = v; }
export function setCycleHistory(v) { cycleHistory = v; }
export function setCustomLifts(v) { customLifts = v; }
export function setCycleStartDates(v) { cycleStartDates = v; }

// ── Persistência ──────────────────────────────
let _saveTimer = null;

export function saveState() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function() {
    document.dispatchEvent(new CustomEvent('gorila-save'));
  }, 400);
}

export function loadState() {
  return idbGet(RECORD_KEY).then(function(data) {
    if (data) return data;
    // Migrar de localStorage antigo
    try {
      var raw = localStorage.getItem('treino_v2') || localStorage.getItem('gorila_fallback');
      if (raw) {
        var parsed = JSON.parse(raw);
        idbSet(RECORD_KEY, parsed).then(function() {
          localStorage.removeItem('treino_v2');
          localStorage.removeItem('gorila_fallback');
        });
        return parsed;
      }
    } catch(ex) {}
    return null;
  }).catch(function() {
    try {
      var raw = localStorage.getItem('treino_v2');
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  });
}
