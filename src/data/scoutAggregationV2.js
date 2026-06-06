const RECENCY_DAYS = 60;
const MIN_ERRORS = 4;
const VALIDATED_THRESHOLD = 12;

const FUND_ALIAS = {
  Acelerada: 'Tapa',
  Espetada: 'Tapa',
  Recepção: 'Devolução',
  Recepcao: 'Devolução',
};

function canonicalFund(value = '') {
  const raw = String(value || '').trim();
  return FUND_ALIAS[raw] || raw || 'Consistência';
}

function normalizeEvent(e = {}) {
  const outcome = e.outcome || '';
  const kind = e.kind || (/erro|error/i.test(outcome) ? 'error' : (/winner|ace|forçou|forcou/i.test(outcome) ? 'winner' : ''));
  const technique = e.technique || e.shot || e.fundamental || '';
  return {
    ...e,
    created_at: e.created_at || e.created || null,
    outcome,
    kind,
    technique,
    fundamental: canonicalFund(e.fundamental || technique),
    inferred_intention: e.inferred_intention || e.intention || '',
  };
}

function filterRelevant(events, studentIds = []) {
  const ids = new Set((studentIds || []).filter(Boolean));
  return (events || [])
    .map(normalizeEvent)
    .filter((e) => !ids.size || ids.has(e.student_id));
}

function filterByRecency(events, days = RECENCY_DAYS) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = events.filter((e) => e.created_at && new Date(e.created_at) >= cutoff);
  if (recent.filter((e) => e.kind === 'error').length >= MIN_ERRORS) return recent;
  return events;
}

function separateScoutContexts(events) {
  return {
    serve: events.filter((e) => e.fundamental === 'Saque' || e.outcome === 'Ace' || e.outcome === 'Erro de saque'),
    return: events.filter((e) => e.fundamental === 'Devolução' || e.outcome === 'Erro de devolução'),
    rally: events.filter((e) => (
      e.fundamental !== 'Saque' &&
      e.fundamental !== 'Devolução' &&
      e.outcome !== 'Ace' &&
      e.outcome !== 'Erro de saque' &&
      e.outcome !== 'Erro de devolução'
    )),
  };
}

function countBy(events, getKey) {
  const out = {};
  for (const e of events || []) {
    const key = getKey(e);
    if (!key) continue;
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function topEntry(map) {
  return Object.entries(map || {}).sort((a, b) => b[1] - a[1])[0] || null;
}

function worstFundamentalInContext(events) {
  const errors = (events || []).filter((e) => e.kind === 'error');
  if (errors.length < MIN_ERRORS) return null;
  const top = topEntry(countBy(errors, (e) => e.fundamental));
  return top ? { fundamental: top[0], count: top[1], total: errors.length } : null;
}

function topZone(events) {
  const top = topEntry(countBy((events || []).filter((e) => e.kind === 'error'), (e) => e.zone));
  return top?.[0] || '';
}

function confidenceLevel(contextual, total) {
  if (!total) return 'Sem dados';
  if (!contextual) return 'Inicial - sem executor registrado nos pontos';
  if (contextual < 4) return 'Leitura inicial';
  if (contextual < VALIDATED_THRESHOLD) return 'Padrão em formação';
  return 'Diagnóstico confiável';
}

function semanticScope(events) {
  const errors = events.filter((e) => e.kind === 'error');
  const winners = events.filter((e) => e.kind === 'winner');
  const intentions = countBy(events, (e) => e.inferred_intention);
  const issues = countBy(events, (e) => e.tactical_issue);
  const topIssue = topEntry(issues);
  const topIntent = topEntry(intentions);
  const pressureErrors = errors.filter((e) => /Pressão|Definição|Finalização/i.test(e.inferred_intention || '')).length;
  const defensiveErrors = errors.filter((e) => /Defesa|Reconstrução/i.test(e.inferred_intention || '')).length;
  const risk = Math.max(1, Math.min(10, 8 - pressureErrors + Math.round(winners.length / 2)));

  let diagnosis = topIssue?.[0] || 'Sem padrão crítico';
  let transition = 'Neutro -> Construção';
  let training = 'Organizar o ponto antes de acelerar.';
  let profile = 'Em observação';

  if (pressureErrors >= 3) {
    diagnosis = topIssue?.[0] || 'Pressão sem contexto';
    transition = 'Construção -> Pressão -> Finalização';
    training = 'Criar vantagem antes de acelerar.';
    profile = 'Agressivo precoce';
  } else if (defensiveErrors >= 3) {
    diagnosis = topIssue?.[0] || 'Defesa sem saída';
    transition = 'Defesa -> Reconstrução -> Neutro';
    training = 'Ganhar tempo e reorganizar antes de atacar.';
    profile = 'Reconstrutor';
  } else if (/Saque|Devolução/.test(topIntent?.[0] || '')) {
    transition = 'Início do ponto -> Entrada no rally';
    training = 'Entrar no rally com mais estabilidade.';
  }

  return {
    diagnosis,
    transition,
    training,
    profile,
    radar: {
      pressão: Math.min(10, 4 + winners.length),
      defesa: Math.min(10, 5 + defensiveErrors),
      construção: Math.max(1, 7 - pressureErrors),
      'gestão de risco': risk,
      'estabilidade sob pressão': Math.max(1, 9 - errors.length),
    },
  };
}

function detectWeakReturn(events) {
  const quickNonServeWinners = events.filter((e) =>
    e.kind === 'winner' &&
    e.outcome !== 'Ace' &&
    e.fundamental !== 'Saque' &&
    /Finalização|Definição|Pressão/i.test(e.inferred_intention || '')
  );
  if (quickNonServeWinners.length < 2) return null;
  return {
    count: quickNonServeWinners.length,
    description: `${quickNonServeWinners.length} finalizações rápidas após o saque; possível devolução que facilita a terceira bola.`,
  };
}

function buildDiagnosticLayers({ serveDiag, returnDiag, rallyDiag, semantic, weakReturn }) {
  const lines = ['[DIAGNÓSTICO DO SCOUT]'];
  if (serveDiag) lines.push(`• Saque: ${serveDiag.count} erro(s) em ${serveDiag.fundamental}. Separar erro direto de saque de erro na terceira bola.`);
  if (returnDiag) lines.push(`• Devolução: ${returnDiag.count} erro(s) diretos. Priorizar devolução antes de rally.`);
  if (weakReturn) lines.push(`• Devolução/entrada no rally: ${weakReturn.description}`);
  if (rallyDiag) lines.push(`• Rally: ${rallyDiag.count} erro(s) em ${rallyDiag.fundamental}.`);
  if (semantic?.diagnosis && semantic.diagnosis !== 'Sem padrão crítico') {
    lines.push(`• Padrão contextual: ${semantic.diagnosis}.`);
    lines.push(`• Transição observada: ${semantic.transition}.`);
  }
  if (lines.length === 1) lines.push('• Amostra insuficiente. Use o Scout como hipótese, não como verdade final.');
  lines.push('• Regra: Decisão é leitura de jogo; nunca virar fundamento-alvo isolado.');
  return lines.join('\n');
}

export function aggregateScout(allEvents = [], studentIds = []) {
  const relevant = filterByRecency(filterRelevant(allEvents, studentIds));
  const contexts = separateScoutContexts(relevant);
  const serveDiag = worstFundamentalInContext(contexts.serve);
  const returnDiag = worstFundamentalInContext(contexts.return);
  const rallyDiag = worstFundamentalInContext(contexts.rally);
  const contextual = relevant.filter((e) => e.student_id || e.inferred_intention || e.tactical_issue);
  const scoutValidated = contextual.length >= VALIDATED_THRESHOLD;
  const confidence = confidenceLevel(contextual.length, relevant.length);
  const semantic = contextual.length >= MIN_ERRORS ? semanticScope(contextual) : null;
  const weakReturn = detectWeakReturn(relevant);
  const zone = topZone(contexts.rally);

  return {
    totalEvents: relevant.length,
    contextualEvents: contextual.length,
    scoutValidated,
    confidence,
    serveContext: serveDiag ? `Saque: ${serveDiag.count} erro(s) registrados.` : 'Saque: sem padrão crítico.',
    returnContext: returnDiag ? `Devolução: ${returnDiag.count} erro(s) diretos.` : (weakReturn ? `Devolução: ${weakReturn.description}` : 'Devolução: sem padrão crítico.'),
    rallyContext: rallyDiag ? `Rally: ${rallyDiag.count} erro(s) em ${rallyDiag.fundamental}${zone ? ` na zona ${zone}` : ''}.` : 'Rally: sem padrão crítico.',
    semanticDiagnosis: semantic?.diagnosis || 'Sem padrão contextual suficiente.',
    brokenTransition: scoutValidated ? (semantic?.transition || 'Sem transição dominante') : 'Hipótese a validar',
    trainingDirection: semantic?.training || 'Registrar mais pontos antes de fechar o ciclo.',
    behaviorProfile: semantic?.profile || 'Em observação',
    semanticRadar: semantic?.radar || {},
    prioritizedDiagnosis: buildDiagnosticLayers({ serveDiag, returnDiag, rallyDiag, semantic, weakReturn }),
    _raw: { serveDiag, returnDiag, rallyDiag, semantic, weakReturn, contexts },
  };
}
