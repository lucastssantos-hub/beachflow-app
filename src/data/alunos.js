// Camada de dados de alunos/turmas (READ-ONLY) — lê o app antigo no mesmo Supabase.
// Tabelas: students, classes, class_enrollments, evaluations. RLS por teacher_id = auth.uid().
import { supabase } from '../supabaseClient.js';

const PALETTE = ['#16C2A3', '#FF6A45', '#1E72E0'];
const NIVEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };

// Ordem canônica dos fundamentos (taxonomia do spec) + abreviações pro radar.
const FUND_ORDER = ['Saque', 'Devolução', 'Forehand', 'Backhand', 'Lob', 'Smash', 'Bandeja', 'Gancho', 'Tapa', 'Curta', 'Posicionamento', 'Consistência', 'Decisão'];
const ABBR = { 'Saque': 'SAQUE', 'Devolução': 'DEVOL', 'Forehand': 'FH', 'Backhand': 'BH', 'Lob': 'LOB', 'Smash': 'SMASH', 'Bandeja': 'BAND', 'Gancho': 'GANCHO', 'Tapa': 'TAPA', 'Curta': 'CURTA', 'Posicionamento': 'POSIC', 'Consistência': 'CONST', 'Decisão': 'DECIS' };

function initials(name = '') {
  const clean = name.replace(/\(.*?\)/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (clean.slice(0, 2) || '?').toUpperCase();
}
const avg = (a) => (a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

let _cacheAlunos = null;
async function uid() { const { data } = await supabase.auth.getUser(); return data?.user?.id || null; }
function dbLevel(n = '') {
  const v = String(n).toLowerCase();
  if (v.includes('inicia')) return 'iniciante';
  if (v.includes('avanç') || v.includes('avanc')) return 'avancado';
  return 'intermediario';
}
function dbTime(hora = '') {
  const v = String(hora).trim();
  if (!v) return null;
  const [h = '00', m = '00'] = v.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
}

// Lista os alunos do professor logado, já com radar real e notas para a IA.
export async function listAlunos(force) {
  if (!supabase) return [];
  if (_cacheAlunos && !force) return _cacheAlunos;
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

  const out = (stu.data || []).map((s, i) => {
    const a = agg.get(s.id) || { teacher: {}, blind: {} };
    const cls = classByStudent.get(s.id);
    // notas 0-5 (dict) para a IA — todos os fundamentos avaliados
    const notasProf = {}; for (const [f, arr] of Object.entries(a.teacher)) { const m = avg(arr); if (m != null) notasProf[f] = Math.round((m / 2) * 10) / 10; }
    const notasAuto = {}; for (const [f, arr] of Object.entries(a.blind)) { const m = avg(arr); if (m != null) notasAuto[f] = Math.round((m / 2) * 10) / 10; }
    const nProf = Object.keys(notasProf).length;
    const nAuto = Object.keys(notasAuto).length;
    // radar HÍBRIDO sobre TODOS os fundamentos avaliados (professor; se não houver, autoavaliação provisória)
    const hyb = {}; // fundamento -> valor 0-1
    for (const f of FUND_ORDER) {
      const t = avg(a.teacher[f]); if (t != null) { hyb[f] = t / 10; continue; }
      const s2 = avg(a.blind[f]); if (s2 != null) hyb[f] = s2 / 10;
    }
    const radarFunds = FUND_ORDER.filter((f) => hyb[f] != null);
    const radar = radarFunds.map((f) => hyb[f]);
    const radarLabels = radarFunds.map((f) => ABBR[f] || f.toUpperCase().slice(0, 6));
    const radarFonte = nProf ? 'avaliação do professor' : (nAuto ? 'autoavaliação (provisória)' : 'sem dados');
    // foco = fundamento mais fraco (na fonte vigente)
    let foco = '—', min = Infinity;
    for (const f of radarFunds) { if (hyb[f] < min) { min = hyb[f]; foco = f; } }
    return {
      id: s.id, nome: s.name, ini: initials(s.name), cor: PALETTE[i % PALETTE.length],
      nivel: NIVEL[s.level] || s.level || '—',
      turma: cls ? `${cls.name} · ${NIVEL[cls.level] || cls.level}` : (NIVEL[s.level] || s.level || 'Sem turma'),
      foco, radarFonte,
      delta: nProf ? `${nProf} fund.` : (nAuto ? 'autoaval.' : 'sem aval.'),
      tone: nProf ? 'info' : (nAuto ? 'turq' : 'neutral'),
      radar, radarLabels, evo: null,
      notasProf, notasAuto, hasProf: nProf > 0,
    };
  });
  _cacheAlunos = out;
  return out;
}

export async function salvarAlunoCadastro({ id, nome, nivel }) {
  if (!supabase) return { ok: false, error: 'Supabase não configurado' };
  const teacher_id = await uid();
  const row = { name: nome.trim(), level: dbLevel(nivel) };
  if (!id) row.teacher_id = teacher_id;
  const q = id
    ? supabase.from('students').update(row).eq('id', id).select('id').single()
    : supabase.from('students').insert(row).select('id').single();
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  _cacheAlunos = null;
  return { ok: true, id: data?.id || id };
}

// Resumo para o dashboard (Hoje): contagens reais + aluno com maior gap.
export async function getResumo() {
  if (!supabase) return null;
  const [alunos, turmas, partidas] = await Promise.all([
    listAlunos(),
    listTurmas(),
    supabase.from('scout_matches').select('id', { count: 'exact', head: true }),
  ]);
  let foco = null, min = Infinity;
  for (const a of alunos) {
    if (a.radar && a.radar.length && a.foco && a.foco !== '—') {
      const m = avg(a.radar);
      if (m != null && m < min) { min = m; foco = a; }
    }
  }
  return {
    nAlunos: alunos.length,
    nTurmas: turmas.length,
    nPartidas: partidas.count || 0,
    foco,
  };
}

// Lista as turmas reais do professor (com nº de alunos matriculados).
// O nome da turma já traz dia+hora (o campo weekday no banco não é confiável).
export async function listTurmas() {
  if (!supabase) return [];
  const [cls, enr] = await Promise.all([
    supabase.from('classes').select('id,name,level,start_time,capacity,focus_fundamental'),
    supabase.from('class_enrollments').select('class_id'),
  ]);
  if (cls.error) { console.warn('[listTurmas]', cls.error.message); return []; }
  const counts = {};
  for (const e of (enr.data || [])) counts[e.class_id] = (counts[e.class_id] || 0) + 1;
  return (cls.data || []).map((c) => ({
    id: c.id, nome: c.name, nivel: NIVEL[c.level] || c.level || '—',
    hora: (c.start_time || '').slice(0, 5),
    capacidade: c.capacity, foco: c.focus_fundamental || null,
    alunos: counts[c.id] || 0,
  })).sort((a, b) => b.alunos - a.alunos); // mais cheias primeiro
}

export async function salvarTurmaCadastro({ id, nome, nivel, hora, capacidade, foco }) {
  if (!supabase) return { ok: false, error: 'Supabase não configurado' };
  const teacher_id = await uid();
  const row = {
    name: nome.trim(),
    level: dbLevel(nivel),
    start_time: dbTime(hora),
    capacity: capacidade ? Number(capacidade) : null,
    focus_fundamental: foco?.trim() || null,
  };
  if (!id) row.teacher_id = teacher_id;
  const q = id
    ? supabase.from('classes').update(row).eq('id', id).select('id').single()
    : supabase.from('classes').insert(row).select('id').single();
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id || id };
}
