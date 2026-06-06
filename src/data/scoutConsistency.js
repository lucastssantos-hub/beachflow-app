import { inferIntention } from './scoutScore.js';
import { inferTacticalIssue } from './ontology.js';

export const ACE_DIRECTIONS = [
  { value: '1', label: '1 - Wide FH', desc: 'Fora pelo lado do forehand' },
  { value: '2', label: '2 - Corpo FH', desc: 'No corpo, lado do forehand' },
  { value: '3', label: '3 - Centro', desc: 'Na linha central' },
  { value: '4', label: '4 - Corpo BH', desc: 'No corpo, lado do backhand' },
  { value: '5', label: '5 - Wide BH', desc: 'Fora pelo lado do backhand' },
];

export const RETURN_SIDE_OPTIONS = ['Forehand', 'Backhand'];

const FUND_ALIAS = {
  Acelerada: 'Tapa',
  Espetada: 'Tapa',
  Recepção: 'Devolução',
  Recepcao: 'Devolução',
};

export function allMatchPlayers(match) {
  if (!match?.players) return [];
  return [...(match.players.a || []), ...(match.players.b || [])].filter(Boolean);
}

export function teamOfPlayer(playerId, match) {
  if (!playerId || !match?.players) return null;
  if ((match.players.a || []).some((p) => p.id === playerId)) return 'a';
  if ((match.players.b || []).some((p) => p.id === playerId)) return 'b';
  return null;
}

export function oppositeTeam(team) {
  return team === 'a' ? 'b' : 'a';
}

function teamPlayers(match, team) {
  return (match?.players?.[team] || []).filter(Boolean);
}

function returningTeamPlayers(serverId, match) {
  const serverTeam = teamOfPlayer(serverId, match);
  return serverTeam ? teamPlayers(match, oppositeTeam(serverTeam)) : allMatchPlayers(match);
}

function winningTeamPlayers(winner, match) {
  return winner ? teamPlayers(match, winner) : allMatchPlayers(match);
}

function losingTeamPlayers(winner, match) {
  return winner ? teamPlayers(match, oppositeTeam(winner)) : allMatchPlayers(match);
}

function playerName(match, id) {
  return allMatchPlayers(match).find((p) => p.id === id)?.name || '';
}

function normalizeFundamental(technique) {
  return FUND_ALIAS[technique] || technique || 'Consistência';
}

const RULES = {
  Ace: {
    winnerLogic: (d, m) => teamOfPlayer(d.server, m),
    executorLogic: (d) => d.server,
    lockWinner: true,
    lockExecutor: true,
    hideFields: ['technique', 'zone', 'final_player', 'return_side'],
    showAceDir: true,
    autoNote: 'Ace: ponto travado para a dupla do sacador. Marque a direção.',
    scoutEvent: { kind: 'winner', fundamental: 'Saque', technique: 'Saque', executorFn: (d) => d.server },
  },
  'Erro de saque': {
    winnerLogic: (d, m) => oppositeTeam(teamOfPlayer(d.server, m)),
    executorLogic: (d) => d.server,
    lockWinner: true,
    lockExecutor: true,
    hideFields: ['technique', 'zone', 'final_player', 'return_side', 'ace_dir'],
    autoNote: 'Erro de saque: ponto travado para a dupla que devolve.',
    scoutEvent: { kind: 'error', fundamental: 'Saque', technique: 'Saque', executorFn: (d) => d.server },
  },
  'Erro de devolução': {
    winnerLogic: (d, m) => teamOfPlayer(d.server, m),
    lockWinner: true,
    hideFields: ['technique', 'zone', 'ace_dir'],
    autoNote: 'Erro de devolução: escolha o devolvedor e marque Forehand ou Backhand.',
    executorFilter: (d, m) => returningTeamPlayers(d.server, m),
    scoutEvent: { kind: 'error', fundamental: 'Devolução', technique: null, askSide: true, executorFn: (d) => d.final_player },
  },
  Winner: {
    hideFields: ['return_side', 'ace_dir'],
    scoutEvent: { kind: 'winner', fundamental: null, technique: null, executorFn: (d) => d.final_player },
  },
  'Forçou o erro': {
    hideFields: ['return_side', 'ace_dir'],
    autoNote: 'Forçou o erro: marque quem fez a ação que gerou o erro.',
    executorFilter: (d, m) => winningTeamPlayers(d.winner, m),
    scoutEvent: { kind: 'winner', fundamental: null, technique: null, executorFn: (d) => d.final_player },
  },
  'Erro não forçado': {
    hideFields: ['return_side', 'ace_dir'],
    autoNote: 'Erro não forçado: marque quem cometeu o erro.',
    executorFilter: (d, m) => losingTeamPlayers(d.winner, m),
    scoutEvent: { kind: 'error', fundamental: null, technique: null, executorFn: (d) => d.final_player },
  },
};

export function applyScoutConsistencyRules(draft = {}, match) {
  const rule = RULES[draft.outcome];
  const updated = { ...draft };
  const lockedFields = new Set();
  const hiddenFields = new Set(rule?.hideFields || []);

  if (!rule) {
    return {
      draft: updated,
      lockedFields,
      hiddenFields,
      executorOptions: allMatchPlayers(match),
      showReturnSide: false,
      showAceDir: false,
      autoNote: null,
    };
  }

  if (rule.winnerLogic) {
    updated.winner = rule.winnerLogic(updated, match) || updated.winner;
    if (rule.lockWinner) lockedFields.add('winner');
  }

  if (rule.executorLogic) {
    updated.final_player = rule.executorLogic(updated, match) || updated.final_player;
    if (rule.lockExecutor) lockedFields.add('final_player');
  }

  for (const field of hiddenFields) {
    if (field === 'ace_dir' || field === 'return_side') continue;
    if (field === 'final_player' && updated.final_player) continue;
    updated[field] = '';
  }

  const executorOptions = rule.executorFilter ? rule.executorFilter(updated, match) : allMatchPlayers(match);

  return {
    draft: updated,
    lockedFields,
    hiddenFields,
    executorOptions,
    showReturnSide: !!(rule.scoutEvent?.askSide && updated.final_player),
    showAceDir: !!rule.showAceDir,
    autoNote: rule.autoNote || null,
  };
}

export function validatePointConsistency(draft = {}, match) {
  const d = applyScoutConsistencyRules(draft, match).draft;
  if (!d.server) return { valid: false, error: 'Escolha o sacador.' };
  if (!d.serve_side) return { valid: false, error: 'Escolha a posição do saque.' };
  if (!d.outcome) return { valid: false, error: 'Escolha como o ponto terminou.' };
  if (!d.winner) return { valid: false, error: 'Escolha quem venceu o ponto.' };

  const serverTeam = teamOfPlayer(d.server, match);
  if (d.outcome === 'Ace') {
    if (d.winner !== serverTeam) return { valid: false, error: 'Ace dá ponto para a dupla do sacador.' };
    if (!d.ace_dir) return { valid: false, error: 'Marque a direção do ace.' };
  }
  if (d.outcome === 'Erro de saque' && d.winner !== oppositeTeam(serverTeam)) {
    return { valid: false, error: 'Erro de saque dá ponto para a dupla que devolve.' };
  }
  if (d.outcome === 'Erro de devolução') {
    if (d.winner !== serverTeam) return { valid: false, error: 'Erro de devolução dá ponto para a dupla sacadora.' };
    if (!d.final_player) return { valid: false, error: 'Marque qual devolvedor errou.' };
    if (teamOfPlayer(d.final_player, match) !== oppositeTeam(serverTeam)) {
      return { valid: false, error: 'O executor deve ser um dos devolvedores.' };
    }
    if (!d.return_side) return { valid: false, error: 'Marque se a devolução foi Forehand ou Backhand.' };
  }
  if (d.outcome === 'Erro não forçado') {
    if (!d.final_player) return { valid: false, error: 'Marque quem cometeu o erro.' };
    if (teamOfPlayer(d.final_player, match) !== oppositeTeam(d.winner)) {
      return { valid: false, error: 'Erro não forçado deve ficar na dupla que perdeu o ponto.' };
    }
  }
  if (d.outcome === 'Winner' && !d.final_player) {
    return { valid: false, error: 'Marque quem fez o winner.' };
  }
  if (d.outcome === 'Forçou o erro') {
    if (!d.final_player) return { valid: false, error: 'Marque quem forçou o erro.' };
    if (teamOfPlayer(d.final_player, match) !== d.winner) {
      return { valid: false, error: 'Forçou o erro deve ficar na dupla que venceu o ponto.' };
    }
  }
  if (!applyScoutConsistencyRules(d, match).hiddenFields.has('technique') && !d.technique) {
    return { valid: false, error: 'Marque a técnica principal.' };
  }
  return { valid: true, error: null, draft: d };
}

export function buildScoutEvent(draft = {}, match, point = {}) {
  const applied = applyScoutConsistencyRules(draft, match).draft;
  const rule = RULES[applied.outcome];
  const spec = rule?.scoutEvent;
  if (!spec) return null;

  const studentId = spec.executorFn?.(applied);
  if (!studentId) return null;

  let technique = spec.technique;
  if (technique == null) {
    technique = spec.askSide ? applied.return_side : applied.technique;
  }
  technique = technique || 'Consistência';

  const fundamental = spec.fundamental || normalizeFundamental(technique);
  const kind = spec.kind;
  const score = kind === 'winner' ? 9 : kind === 'error' ? 3 : 7;
  const intention = inferIntention(technique, applied.outcome, applied.zone || '');
  const issue = inferTacticalIssue({
    ...applied,
    outcome: applied.outcome,
    technique,
    fundamental,
    kind,
    zone: applied.zone || '',
    inferred_intention: intention,
  });

  const pieces = [
    applied.outcome,
    applied.outcome === 'Ace' && applied.ace_dir ? `direção ${ACE_DIRECTIONS.find((x) => x.value === applied.ace_dir)?.label || applied.ace_dir}` : '',
    applied.outcome === 'Erro de devolução' && applied.return_side ? `lado ${applied.return_side}` : '',
    applied.zone ? `zona ${applied.zone}` : '',
    playerName(match, studentId) ? `executor ${playerName(match, studentId)}` : '',
  ].filter(Boolean);

  return {
    student_id: studentId,
    fundamental,
    kind,
    score,
    outcome: applied.outcome,
    technique,
    inferred_intention: intention,
    tactical_issue: issue?.issue || '',
    zone: applied.zone || '',
    is_deciding_point: !!point.is_deciding_point,
    is_tiebreak: !!point.is_tiebreak,
    is_super_tiebreak: !!point.is_super_tiebreak,
    note: pieces.join(' · '),
  };
}
