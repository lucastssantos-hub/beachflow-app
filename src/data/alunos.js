// Camada de dados de alunos/turmas (READ-ONLY) — lê o app antigo no mesmo Supabase.
// Tabelas: students, classes, class_enrollments, evaluations. RLS por teacher_id = auth.uid().
import { supabase } from '../supabaseClient.js';

const PALETTE = ['#16C2A3', '#FF6A45', '#1E72E0'];
const NIVEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };

// 6 eixos do radar (fundamentos reais das evaluations)
export const RADAR_FUND = ['Saque', 'Devolução', 'Forehand', 'Backhand', 'Posicionamento', 'Consistência'];
export const RADAR_LABELS = ['SAQUE', 'DEVOL.', 'FOREH.', 'BACKH.', 'POSIC.', 'CONST.'];
// 4 dimensões da autoavaliação (student_blind) -> rótulos da UI
const AUTO_MAP = [['Saque', 'Confiança no saque'], ['Decisão', 'Leitura de jogo'], ['Consistência', 'Constância'], ['Devolução', 'Recepção']];

function initials(name = '') {
  const clean = name.replace(/\(.*?\)/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (clean.slice(0, 2) || '?').toUpperCase();
}
const avg = (a) => (a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

// Lista os alunos do professor logado, já com radar real e notas para a IA.
export async function listAlunos() {
  if (!supabase) return [];
  const [stu, enr, cls, ev] = await Promise.all([
    supabase.from('students').select('id,name,level').order('name'),
    supabase.from('class_enrollments').select('student_id,class_id'),
    supabase.from('classes').select('id,name,level'),
    supabase.from('evaluations').select('student_id,fundamental,score,evaluator'),
  ]);
  if (stu.error) { console.warn('[listAlunos]', stu.error.message); return []; }

  const classById = new Map((cls.data || []).map((c) => [c.id, c]));
  const classByStudent = new Map();
  for (const e of (enr.data || [])) {
    if (!classByStudent.has(e.student_id)) classByStudent.set(e.student_id, classById.get(e.class_id));
  }
  // agrega scores por aluno: { teacher:{fund:[..]}, blind:{fund:[..]} }
  const agg = new Map();
  for (const r of (ev.data || [])) {
    if (!agg.has(r.student_id)) agg.set(r.student_id, { teacher: {}, blind: {} });
    const slot = r.evaluator === 'teacher' ? agg.get(r.student_id).teacher : agg.get(r.student_id).blind;
    (slot[r.fundamental] = slot[r.fundamental] || []).push(Number(r.score));
  }

  return (stu.data || []).map((s, i) => {
    const a = agg.get(s.id) || { teacher: {}, blind: {} };
    const cls = classByStudent.get(s.id);
    // notas 0-5 (dict) para a IA — todos os fundamentos avaliados
    const notasProf = {}; for (const [f, arr] of Object.entries(a.teacher)) { const m = avg(arr); if (m != null) notasProf[f] = Math.round((m / 2) * 10) / 10; }
    const notasAuto = {}; for (const [f, arr] of Object.entries(a.blind)) { const m = avg(arr); if (m != null) notasAuto[f] = Math.round((m / 2) * 10) / 10; }
    const nProf = Object.keys(notasProf).length;
    const nAuto = Object.keys(notasAuto).length;
    // radar HÍBRIDO (igual ao app antigo / spec): nota do professor; se não houver, autoavaliação como base provisória
    const radar = RADAR_FUND.map((f) => {
      const t = avg(a.teacher[f]); if (t != null) return t / 10;
      const s2 = avg(a.blind[f]); return s2 != null ? s2 / 10 : 0;
    });
    const auto = AUTO_MAP.map(([f]) => { const m = avg(a.blind[f]); return m != null ? m / 10 : 0; });
    const radarFonte = nProf ? 'avaliação do professor' : (nAuto ? 'autoavaliação (provisória)' : 'sem dados');
    // foco = fundamento mais fraco (professor; se não houver, autoavaliação)
    let foco = '—', min = Infinity;
    const fonteFoco = nProf ? a.teacher : (nAuto ? a.blind : {});
    for (const [f, arr] of Object.entries(fonteFoco)) { const m = avg(arr); if (m != null && m < min) { min = m; foco = f; } }
    return {
      id: s.id, nome: s.name, ini: initials(s.name), cor: PALETTE[i % PALETTE.length],
      nivel: NIVEL[s.level] || s.level || '—',
      turma: cls ? `${cls.name} · ${NIVEL[cls.level] || cls.level}` : (NIVEL[s.level] || s.level || 'Sem turma'),
      foco, radarFonte,
      delta: nProf ? `${nProf} fund.` : (nAuto ? 'autoaval.' : 'sem aval.'),
      tone: nProf ? 'info' : (nAuto ? 'turq' : 'neutral'),
      radar, auto, evo: null,
      notasProf, notasAuto, hasProf: nProf > 0,
    };
  });
}
