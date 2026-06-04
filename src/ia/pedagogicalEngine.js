import ontology from '../data/beachflow_ontology_engine_v1.json' with { type: 'json' };

const SHOT_ALIASES = {
  SAQUE: ['SAQUE', 'SERVICO'],
  DEVOLUCAO: ['DEVOLUCAO', 'DEVOLUÇÃO', 'RECEPCAO', 'RECEPÇÃO', 'RETURN'],
  LOB: ['LOB', 'CONTRA_LOB', 'CONTRALOB'],
  GANCHO: ['GANCHO'],
  BANDEJA_ARCO_SUPERIOR: ['BANDEJA', 'ARCO_SUPERIOR'],
  SMASH: ['SMASH'],
  TAPA_ACELERADA_ESPETADA: ['TAPA', 'ACELERADA', 'ESPETADA'],
  CURTA: ['CURTA', 'BOLA_CURTA', 'BOLAS_CURTAS'],
  FOREHAND_BACKHAND_DINAMICO: ['FOREHAND', 'BACKHAND', 'FOUR', 'DINAMICO', 'DINÂMICO'],
  FOREHAND_BACKHAND_ESTATICO: ['ESTATICO', 'ESTÁTICO', 'DEFESA_BAIXA', 'DEFESA_ALTA', 'ARCO_INFERIOR'],
};

const SHOT_LABELS = {
  SAQUE: 'Saque',
  DEVOLUCAO: 'Devolução',
  LOB: 'Lob',
  GANCHO: 'Gancho',
  BANDEJA_ARCO_SUPERIOR: 'Bandeja/controle de bola alta',
  SMASH: 'Smash',
  TAPA_ACELERADA_ESPETADA: 'Tapa/Acelerada',
  CURTA: 'Curta',
  FOREHAND_BACKHAND_DINAMICO: 'Forehand/Backhand dinâmico',
  FOREHAND_BACKHAND_ESTATICO: 'Defesa estática/controle',
};

const STATE_LABELS = {
  SAQUE: 'Saque',
  DEFESA: 'Defesa',
  RECONSTRUCAO: 'Reconstrução',
  NEUTRO: 'Neutro',
  CONSTRUCAO: 'Construção',
  PRESSAO: 'Pressão',
  FINALIZACAO: 'Finalização',
};

function norm(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function label(value = '') {
  return SHOT_LABELS[value] || STATE_LABELS[value] || String(value || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeLevel(level = '') {
  const n = norm(level);
  if (n.includes('AVANC')) return 'avancado';
  if (n.includes('INICI')) return 'iniciante';
  return 'intermediario';
}

function arr(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function shotKeyFromText(text = '', data = ontology) {
  const t = norm(text);
  const shots = data.shots || {};
  const direct = Object.keys(shots).find((key) => t.includes(norm(key)));
  if (direct) return direct;
  return Object.entries(SHOT_ALIASES).find(([, aliases]) => aliases.some((a) => t.includes(norm(a))))?.[0] || '';
}

function stateKeyFromText(text = '', data = ontology) {
  const t = norm(text);
  return Object.keys(data.states || {}).find((key) => t.includes(norm(key))) || '';
}

function scoreFor(scores = {}, shotKey = '', dependency = '') {
  const candidates = [shotKey, dependency, label(shotKey), label(dependency), ...(SHOT_ALIASES[shotKey] || [])].filter(Boolean);
  const keys = Object.keys(scores || {});
  for (const candidate of candidates) {
    const found = keys.find((key) => norm(key) === norm(candidate) || norm(key).includes(norm(candidate)) || norm(candidate).includes(norm(key)));
    if (found && Number(scores[found]) > 0) return Number(scores[found]);
  }
  return 0;
}

function dependencyToShot(dep = '') {
  const d = norm(dep);
  if (d.includes('LOB')) return 'LOB';
  if (d.includes('POSIC') || d.includes('REPOSIC')) return 'FOREHAND_BACKHAND_ESTATICO';
  if (d.includes('GANCHO') || d.includes('CROSS_STEP') || d.includes('TEMPO_BOLA')) return 'GANCHO';
  if (d.includes('LEITURA_SAQUE') || d.includes('VOLEIO')) return 'DEVOLUCAO';
  if (d.includes('TOSS') || d.includes('DIRECAO')) return 'SAQUE';
  return shotKeyFromText(dep);
}

function diagnoseGap(input = {}, data = ontology) {
  const observedGap = input.gaps?.[0] || input.tema || input.objetivo || input.observedGap || '';
  const targetShot = shotKeyFromText(observedGap, data);
  const stateFromText = stateKeyFromText(observedGap, data);
  const shot = targetShot ? data.shots[targetShot] : null;
  const fromStates = arr(shot?.from_state);
  const toStates = arr(shot?.to_state);
  const brokenState = stateFromText || fromStates[0] || 'NEUTRO';
  const possibleRootCauses = shot?.dependencies || data.states?.[brokenState]?.desired_exits || [];
  return { observedGap, targetShot, brokenState, toStates, possibleRootCauses, confidence: targetShot ? 'moderada' : 'baixa' };
}

function findRootCause(diagnosis, scores = {}) {
  const targetShot = diagnosis.targetShot;
  const targetScore = scoreFor(scores, targetShot);
  let best = { key: targetShot || diagnosis.brokenState, dependency: '', score: targetScore || 99, reason: 'Gap observado como ponto de partida.' };
  for (const dep of diagnosis.possibleRootCauses || []) {
    const depShot = dependencyToShot(dep);
    const depScore = scoreFor(scores, depShot, dep);
    if (depScore > 0 && (!targetScore || depScore < targetScore || depScore < best.score)) {
      best = { key: depShot || targetShot || diagnosis.brokenState, dependency: dep, score: depScore, reason: `${label(dep)} aparece como pré-requisito mais fraco que o golpe observado.` };
    }
  }
  if (targetShot === 'SMASH' && scoreFor(scores, 'LOB') && scoreFor(scores, 'LOB') <= targetScore) {
    best = { key: 'LOB', dependency: 'LOB', score: scoreFor(scores, 'LOB'), reason: 'Erro de smash pode nascer de lob, leitura ou posicionamento antes da finalização.' };
  }
  if (targetShot === 'DEVOLUCAO') {
    best.reason = 'Devolução precisa ser conectada com entrada no rali e terceira bola.';
  }
  return best;
}

function transitionMatchesShot(transition, shotKey) {
  return (transition.shots || []).includes(shotKey);
}

function selectCorrectiveTransition(rootCause, data = ontology) {
  const transitions = data.core_transitions || [];
  const shotKey = rootCause.key;
  if (shotKey === 'LOB') return transitions.find((t) => t.id === 'CORE_T02') || transitions.find((t) => t.id === 'CORE_T03') || transitions[0];
  if (shotKey === 'GANCHO') return transitions.find((t) => t.id === 'CORE_T03') || transitions[0];
  if (shotKey === 'SMASH') return transitions.find((t) => t.id === 'CORE_T06') || transitions[0];
  if (shotKey === 'TAPA_ACELERADA_ESPETADA') return transitions.find((t) => t.id === 'CORE_T05') || transitions[0];
  if (shotKey === 'DEVOLUCAO' || shotKey === 'SAQUE') return transitions.find((t) => t.id === 'CORE_T01') || transitions[0];
  return transitions.find((t) => transitionMatchesShot(t, shotKey)) || transitions[0];
}

function applyPedagogicalConstraints(level, candidateShots = [], data = ontology) {
  const normalizedLevel = normalizeLevel(level);
  const constraints = data.decision_rules?.level_constraints?.[normalizedLevel] || {};
  const blockTerms = (constraints.block || []).map(norm);
  const allowedShots = [];
  const blockedShots = [];
  for (const shot of candidateShots) {
    const s = norm(shot);
    const blocked = blockTerms.some((term) => s.includes(term) || term.includes(s));
    if (blocked) blockedShots.push(`${label(shot)} bloqueado para ${normalizedLevel}`);
    else allowedShots.push(shot);
  }
  blockedShots.push('Smash em zona vermelha', 'Gancho como resposta a smash', 'Lob curto como solução');
  if (normalizedLevel === 'iniciante') blockedShots.push('Tapa/Acelerada sem contexto simples');
  return { allowedShots: [...new Set(allowedShots)], blockedShots: [...new Set(blockedShots)] };
}

function orderedUnique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function selectDrills(route, data = ontology) {
  const progression = data.decision_rules?.format_progression || ['fechado', 'semi-aberto', 'aberto'];
  const level = route.level;
  const shotSet = new Set(route.allowedShots || []);
  const transition = route.transition;
  const states = new Set([transition?.from, transition?.to].filter(Boolean).map(norm));
  const drills = data.drill_library || [];
  const ranked = drills
    .filter((drill) => !drill.level || drill.level === level || level === 'avancado')
    .map((drill) => {
      const tags = [...(drill.shot_tags || []), ...(drill.shots || [])].map(norm);
      const stateTags = (drill.game_states || []).map(norm);
      const shotScore = [...shotSet].some((shot) => tags.some((tag) => tag.includes(norm(shot)) || norm(shot).includes(tag))) ? 4 : 0;
      const stateScore = !stateTags.length || [...states].some((state) => stateTags.includes(state)) ? 2 : 0;
      const formatScore = Math.max(0, 3 - progression.indexOf(drill.format));
      return { drill, score: shotScore + stateScore + formatScore };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const selected = [];
  for (const format of progression) {
    const found = ranked.find((x) => x.drill.format === format && !selected.includes(x.drill));
    if (found) selected.push(found.drill);
  }
  for (const x of ranked) if (selected.length < 4 && !selected.includes(x.drill)) selected.push(x.drill);
  return selected.slice(0, 4);
}

function scoresFromInput(input = {}) {
  const scores = {};
  for (const source of [input.avaliacaoProfessor, input.autoavaliacao, input.avaliacaoScout]) {
    for (const [k, v] of Object.entries(source || {})) scores[k] = Number(v);
  }
  return scores;
}

function stepText(drill, type) {
  const steps = drill?.operational_steps || [];
  const found = steps.find((s) => norm(s.type || s.label || '').includes(norm(type))) || steps[0];
  return found?.text || found?.description || drill?.tactical_objective || drill?.technical_objective || drill?.name || '';
}

function drillLine(drill) {
  if (!drill) return '';
  const org = stepText(drill, 'organizacao') || stepText(drill, 'execucao');
  return `${drill.id} · ${drill.name}: ${org}`.slice(0, 220);
}

export function generatePedagogicalPlan(input = {}) {
  const level = normalizeLevel(input.nivel || input.level || 'intermediario');
  const normalized = { ...input, level, scores: input.scores || scoresFromInput(input) };
  const diagnosis = diagnoseGap(normalized);
  const rootCause = findRootCause(diagnosis, normalized.scores);
  const transition = selectCorrectiveTransition(rootCause);
  const candidateShots = orderedUnique([diagnosis.targetShot, rootCause.key, ...(transition?.shots || [])]);
  const constraints = applyPedagogicalConstraints(level, candidateShots);
  const prioritizeRoot = diagnosis.targetShot === 'SMASH' || diagnosis.targetShot === 'GANCHO' || diagnosis.targetShot === 'DEVOLUCAO';
  constraints.allowedShots = prioritizeRoot
    ? orderedUnique([rootCause.key, diagnosis.targetShot, ...constraints.allowedShots])
    : orderedUnique([diagnosis.targetShot, rootCause.key, ...constraints.allowedShots]);
  const route = { level, transition, allowedShots: constraints.allowedShots };
  const drills = selectDrills(route);
  const transitionText = transition ? `${STATE_LABELS[transition.from] || transition.from} → ${STATE_LABELS[transition.to] || transition.to}` : 'Neutro → Construção';
  const principalShot = constraints.allowedShots[0] || rootCause.key || diagnosis.targetShot || 'FOREHAND_BACKHAND_DINAMICO';

  return {
    diagnostico: {
      gapPrincipal: diagnosis.observedGap || label(principalShot),
      estadoComprometido: STATE_LABELS[diagnosis.brokenState] || diagnosis.brokenState,
      causaRaiz: rootCause.dependency ? label(rootCause.dependency) : label(rootCause.key),
      justificativa: rootCause.reason || `O gap aponta para ${transitionText}.`,
    },
    transicoesSelecionadas: [transitionText].filter(Boolean),
    golpesSelecionados: constraints.allowedShots.map(label),
    drillsSelecionados: drills.map((d) => d.id),
    restricoesAplicadas: constraints.blockedShots,
    treino: {
      aquecimento: drillLine(drills[0]) || `Aquecimento com ${label(principalShot)} em alvo amplo.`,
      bloco1: drillLine(drills[1]) || `Fechado: ${label(principalShot)} com repetição controlada e alvo claro.`,
      bloco2: drillLine(drills[2]) || `Semiaberto: aplicar ${transitionText} com decisão limitada.`,
      bloco3: drillLine(drills[3]) || '',
      jogoAplicado: transition ? `Jogo condicionado: bônus quando a dupla executa ${transitionText} antes de tentar resolver o ponto.` : 'Jogo condicionado com bônus para decisão correta.',
      observacoesProfessor: [
        `Priorizar ${STATE_LABELS[transition?.from] || 'o estado inicial'} antes de cobrar execução final.`,
        `Não liberar recurso bloqueado: ${constraints.blockedShots[0]}.`,
      ],
    },
    route: {
      level,
      transitionId: transition?.id || '',
      transitionObjective: transition?.objective || '',
      targetShot: diagnosis.targetShot,
      rootCause,
      drills: drills.map((d) => ({
        id: d.id,
        name: d.name,
        level: d.level,
        format: d.format,
        tacticalObjective: d.tactical_objective,
        activeQuestion: d.active_question,
      })),
    },
  };
}

export function buildPedagogicalInputFromContext(ctx = {}) {
  const scoutGap = ctx.scout?.erroPrincipal?.fundamento || ctx.scout?.leitura || '';
  const scoreSources = [ctx.avaliacaoProfessor, ctx.avaliacaoScout, ctx.autoavaliacao].filter(Boolean);
  const scoreEntries = scoreSources.flatMap((source) => Object.entries(source || {}).map(([k, v]) => [k, Number(v)]));
  const weakest = scoreEntries.filter(([, v]) => Number.isFinite(v)).sort((a, b) => a[1] - b[1])[0]?.[0] || '';
  return {
    turmaId: ctx.turma?.id,
    nivel: normalizeLevel(ctx.nivel),
    objetivo: ctx.objetivo || ctx.observacoes || '',
    tema: ctx.foco || scoutGap || weakest,
    gaps: [scoutGap, weakest, ctx.foco].filter(Boolean),
    duracaoMinutos: ctx.duracaoMin || 60,
    numeroAlunos: ctx.alunosMatriculados || ctx.alunos?.length || 0,
    avaliacaoProfessor: ctx.avaliacaoProfessor || {},
    autoavaliacao: ctx.autoavaliacao || {},
    avaliacaoScout: ctx.avaliacaoScout || {},
  };
}

export function pedagogicalPlanForContext(ctx = {}) {
  return generatePedagogicalPlan(buildPedagogicalInputFromContext(ctx));
}
