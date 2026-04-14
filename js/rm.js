// ── GORILA GYM — rm.js ───────────────────────
// Calculadora de 1RM com 3 fórmulas (Brzycki, Epley, Mayhew)

function calcRM() {
  var w = parseFloat(g('rmW').value) || 0;
  var r = parseInt(g('rmR').value)   || 1;
  if (r < 1 || r > 36 || !w) return;

  // Reps = 1: todas as fórmulas retornam o próprio peso
  var brzycki = r === 1 ? w : w * (36 / (37 - r));
  var epley   = r === 1 ? w : w * (1 + r / 30);
  var mayhew  = w / (0.522 + 0.419 * Math.exp(-0.055 * r));
  var avg     = (brzycki + epley + mayhew) / 3;

  g('rmResult').textContent  = avg.toFixed(1)     + ' kg';
  g('rmBrzycki').textContent = brzycki.toFixed(1) + ' kg';
  g('rmEpley').textContent   = epley.toFixed(1)   + ' kg';
  g('rmMayhew').textContent  = mayhew.toFixed(1)  + ' kg';

  var pcts = [100, 95, 90, 85, 80, 75, 70, 65];
  var reps = [1, 2, 4, 6, 8, 10, 12, 16];
  g('rmTbody').innerHTML = pcts.map(function(p, i) {
    return '<tr><td class="dim">' + p + '%</td>'
      + '<td class="hl">' + (avg * p / 100).toFixed(1) + ' kg</td>'
      + '<td>' + reps[i] + '</td></tr>';
  }).join('');
}

g('rmW').addEventListener('input', calcRM);
g('rmR').addEventListener('input', calcRM);
