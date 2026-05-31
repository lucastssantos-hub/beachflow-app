// Motor de pontuação do scout — PORTE FIEL do app antigo (beach tennis).
// Formatos: lesson4 (até 4 games), lesson6 (até 6), competition6 (set c/ tiebreak),
// pro3 (melhor de 3 c/ super tiebreak no 1-1).

export const MODES = [
  ['lesson4', 'Aula até 4 games'],
  ['lesson6', 'Aula até 6 games'],
  ['competition6', 'Set profissional'],
  ['pro3', 'Melhor de 3 sets'],
];
export const OUTCOMES = ['Winner', 'Erro não forçado', 'Forçou o erro', 'Ace', 'Erro de saque', 'Erro de devolução'];
export const TECHNIQUES = ['Smash', 'Tapa', 'Acelerada', 'Ventaglio', 'Anômalo', 'Voleio', 'Curta', 'Bandeja', 'Gancho', 'Lob', 'Defesa alta', 'Defesa baixa', 'Forehand', 'Backhand', 'Neutra', 'Devolução'];
export const ZONES = ['Verde', 'Amarela', 'Vermelha'];
export const SERVE_SIDES = ['Direita', 'Centro', 'Esquerda'];

const other = (t) => (t === 'a' ? 'b' : 'a');

export const tennis = (v) => ['0', '15', '30', '40'][v] || '40';
export function initialScoutScore(mode) {
  return { mode: mode || 'lesson4', set_number: 1, sets: { a: 0, b: 0 }, games: { a: 0, b: 0 }, points: { a: 0, b: 0 }, tie: false, superTie: false, tiePoints: { a: 0, b: 0 }, finished: false };
}
export const scoutScoreText = (s) => (s.tie || s.superTie ? `${s.tiePoints.a}x${s.tiePoints.b}` : `${tennis(s.points.a)}x${tennis(s.points.b)}`);
export const scoutDeciding = (s) => !s.tie && !s.superTie && s.points.a === 3 && s.points.b === 3;
export const modeLabel = (m) => (MODES.find((x) => x[0] === m) || [, 'Aula até 4 games'])[1];

function winScoutSet(s, t) {
  s.sets[t]++; s.set_number++; s.games = { a: 0, b: 0 }; s.points = { a: 0, b: 0 }; s.tie = false; s.tiePoints = { a: 0, b: 0 };
  if (s.mode === 'pro3') { if (s.sets[t] >= 2) s.finished = true; else if (s.sets.a === 1 && s.sets.b === 1) s.superTie = true; }
  else s.finished = true;
}
function winScoutGame(s, t) {
  s.games[t]++; s.points = { a: 0, b: 0 };
  if (s.mode === 'lesson4') { if (s.games[t] >= 4) winScoutSet(s, t); return; }
  if (s.mode === 'lesson6') { if (s.games[t] >= 6) winScoutSet(s, t); return; }
  if (s.games[t] >= 6 && s.games[t] - s.games[other(t)] >= 2) winScoutSet(s, t);
  else if (s.games.a === 6 && s.games.b === 6) { s.tie = true; s.tiePoints = { a: 0, b: 0 }; }
}
// Aplica o vencedor do ponto e retorna o NOVO estado (imutável).
export function applyScoutWinner(score, winner) {
  const s = JSON.parse(JSON.stringify(score));
  if (s.finished) return s;
  if (s.superTie) {
    s.tiePoints[winner]++;
    if (s.tiePoints[winner] >= 10 && s.tiePoints[winner] - s.tiePoints[other(winner)] >= 2) winScoutSet(s, winner);
    return s;
  }
  if (s.tie) {
    s.tiePoints[winner]++;
    if (s.tiePoints[winner] >= 7 && s.tiePoints[winner] - s.tiePoints[other(winner)] >= 2) { s.tie = false; s.games[winner]++; winScoutSet(s, winner); }
    return s;
  }
  s.points[winner]++;
  if (s.points[winner] >= 4 && s.points[winner] - s.points[other(winner)] >= 2) winScoutGame(s, winner);
  return s;
}

export function inferIntention(technique, outcome, zone) {
  if (technique === 'Smash' || technique === 'Tapa' || (technique === 'Gancho' && outcome === 'Winner') || (technique === 'Curta' && outcome === 'Winner')) return 'Finalização';
  if (['Acelerada', 'Ventaglio', 'Anômalo', 'Voleio'].includes(technique) || (technique === 'Gancho' && zone === 'Verde')) return 'Pressão';
  if (['Curta', 'Bandeja'].includes(technique) || (technique === 'Lob' && outcome === 'Winner')) return 'Construção';
  if (technique === 'Gancho') return 'Reconstrução';
  if (['Lob', 'Defesa alta', 'Defesa baixa'].includes(technique)) return 'Defesa';
  return 'Neutro';
}
