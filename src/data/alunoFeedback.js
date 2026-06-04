import { supabase } from '../supabaseClient.js';
import {
  analyzeStudentFeedback,
  canonicalFundamental,
  inferTacticalIssue,
  practicalIssueText,
} from './ontology.js';

export const PUBLIC_FEEDBACK_FUNDAMENTOS = [
  'Saque',
  'Devolução',
  'Forehand',
  'Backhand',
  'Lob',
  'Curta',
  'Consistência',
  'Posicionamento',
  'Decisão',
];

const avg = (arr = []) => (arr.length ? arr.reduce((a, b) => a + Number(b || 0), 0) / arr.length : null);
const clamp01 = (n) => Math.max(0, Math.min(1, Number(n || 0)));

function firstName(name = '') {
  return String(name || 'aluno').trim().split(/\s+/)[0] || 'aluno';
}

function groupScores(evaluations = []) {
  const grouped = {};
  for (const e of evaluations) {
    const f = canonicalFundamental(e.fundamental);
    if (!PUBLIC_FEEDBACK_FUNDAMENTOS.includes(f)) continue;
    (grouped[f] = grouped[f] || []).push(Number(e.score));
  }
  const out = {};
  for (const f of PUBLIC_FEEDBACK_FUNDAMENTOS) {
    const m = avg(grouped[f] || []);
    if (m != null) out[f] = Math.round(m * 10) / 10;
  }
  return out;
}

function scoutEventScore(e = {}) {
  if (Number.isFinite(Number(e.score))) return Number(e.score);
  const text = `${e.kind || ''} ${e.outcome || ''}`.toLowerCase();
  if (/winner|ace|forçou|forcou|positivo/.test(text)) return 8.5;
  if (/erro|error|bola entregue/.test(text)) return 3;
  return 6;
}

function scoutScores(events = []) {
  const grouped = {};
  for (const e of events) {
    const f = canonicalFundamental(e.fundamental || e.technique);
    if (!PUBLIC_FEEDBACK_FUNDAMENTOS.includes(f)) continue;
    (grouped[f] = grouped[f] || []).push(scoutEventScore(e));
  }
  const out = {};
  for (const f of PUBLIC_FEEDBACK_FUNDAMENTOS) {
    const m = avg(grouped[f] || []);
    if (m != null) out[f] = Math.round(m * 10) / 10;
  }
  return out;
}

function topWeak(scores = {}) {
  return Object.entries(scores).sort((a, b) => Number(a[1]) - Number(b[1]))[0]?.[0] || '';
}

function topStrong(scores = {}) {
  return Object.entries(scores).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || '';
}

function countMap(events = [], predicate) {
  const map = {};
  for (const e of events) {
    if (!predicate(e)) continue;
    const f = canonicalFundamental(e.fundamental || e.technique);
    if (!f) continue;
    map[f] = (map[f] || 0) + 1;
  }
  return map;
}

function topEntry(map = {}) {
  return Object.entries(map).sort((a, b) => Number(b[1]) - Number(a[1]))[0] || null;
}

function buildScoutSummary(events = []) {
  const errors = countMap(events, (e) => /erro|error|bola entregue/i.test(`${e.kind || ''} ${e.outcome || ''}`));
  const positives = countMap(events, (e) => /winner|ace|forçou|forcou|positivo|pressão gerada|pressao gerada/i.test(`${e.kind || ''} ${e.outcome || ''}`) || Number(e.score) >= 8);
  const issues = {};
  for (const e of events) {
    const issue = e.tactical_issue || inferTacticalIssue(e)?.issue;
    if (issue) issues[issue] = (issues[issue] || 0) + 1;
  }
  const mainError = topEntry(errors);
  const mainIssue = topEntry(issues);
  return {
    erroPrincipal: mainError ? { fundamento: mainError[0], total: mainError[1] } : null,
    errosPorFundamento: errors,
    positivosPorFundamento: positives,
    problemasTaticos: Object.entries(issues)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 3)
      .map(([texto, total]) => ({ texto, total, pratica: practicalIssueText(texto) })),
    leituraPratica: mainIssue ? practicalIssueText(mainIssue[0]) : '',
    eventosRecentes: events.slice(0, 12).map((e) => ({
      fundamento: canonicalFundamental(e.fundamental || e.technique),
      tipo: e.kind || e.outcome || '',
      desfecho: e.outcome || e.kind || '',
      tecnica: e.technique || '',
      zona: e.zone || '',
      problema: e.tactical_issue || '',
      nota: e.score ?? null,
    })),
  };
}

function movementMessage(evaluations = []) {
  const byDate = [...evaluations].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
  if (byDate.length < PUBLIC_FEEDBACK_FUNDAMENTOS.length * 2) return null;
  const mid = Math.floor(byDate.length / 2);
  const first = avg(byDate.slice(0, mid).map((e) => Number(e.score)));
  const last = avg(byDate.slice(mid).map((e) => Number(e.score)));
  if (first == null || last == null || Math.abs(last - first) < 0.4) return null;
  return last > first ? 'Seu jogo evoluiu desde a última avaliação.' : 'Seu radar mudou; vamos usar isso para ajustar o próximo foco.';
}

function radarRows(autoScores = {}, scout = {}) {
  return PUBLIC_FEEDBACK_FUNDAMENTOS.map((f) => ({
    label: f,
    auto: autoScores[f] != null ? clamp01(autoScores[f] / 10) : null,
    scout: scout[f] != null ? clamp01(scout[f] / 10) : null,
  })).filter((r) => r.auto != null || r.scout != null);
}

export function buildPublicFeedback(data = {}) {
  const student = data.student || {};
  const evaluations = data.evaluations || [];
  const events = data.scout_events || [];
  const autoScores = groupScores(evaluations);
  const scout = scoutScores(events);
  const scoutResumo = buildScoutSummary(events);
  const autoWeak = topWeak(autoScores);
  const autoStrong = topStrong(autoScores);
  const positives = Object.keys(scoutResumo.positivosPorFundamento || {});
  const tacticalText = scoutResumo.problemasTaticos?.[0]?.pratica || scoutResumo.leituraPratica || '';
  const analysis = analyzeStudentFeedback({
    autoWeak,
    autoStrong,
    scoutError: scoutResumo.erroPrincipal,
    scout: scoutResumo,
    positives,
    tacticalText,
  });

  return {
    student,
    firstName: firstName(student.name),
    level: student.level || 'intermediario',
    hasAuto: Object.keys(autoScores).length > 0,
    autoScores,
    scoutScores: scout,
    radarRows: radarRows(autoScores, scout),
    movement: movementMessage(evaluations),
    worked: analysis.positiveText || 'Você teve boas ações quando conseguiu jogar com margem e escolher melhor a bola.',
    cost: [analysis.gameText, analysis.bridgeText].filter(Boolean).join(' '),
    focus: analysis.focusText,
  };
}

export async function getPublicStudentFeedback(token) {
  if (!supabase || !token) throw new Error('Link inválido.');
  const { data, error } = await supabase.rpc('get_student_feedback', { p_token: token });
  if (error) throw error;
  return buildPublicFeedback(data || {});
}
