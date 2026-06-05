// Camada de dados de alunos/turmas (READ-ONLY) — lê o app antigo no mesmo Supabase.
// Tabelas: students, classes, class_enrollments, evaluations. RLS por teacher_id = auth.uid().
import { supabase } from '../supabaseClient.js';
import { inferTacticalIssue, practicalIssueText, focusCardFromIssue, ONTOLOGY_PROMPT_BLOCK } from './ontology.js';

const PALETTE = ['#16C2A3', '#FF6A45', '#1E72E0'];
const NIVEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };

// Ordem canônica dos fundamentos (taxonomia do spec) + abreviações pro radar.
const FUND_ORDER = ['Saque', 'Devolução', 'Forehand', 'Backhand', 'Lob', 'Smash', 'Bandeja', 'Gancho', 'Tapa', 'Curta', 'Posicionamento', 'Consistência', 'Decisão'];
const ABBR = { 'Saque': 'SAQUE', 'Devolução': 'DEVOL', 'Forehand': 'FH', 'Backhand': 'BH', 'Lob': 'LOB', 'Smash': 'SMASH', 'Bandeja': 'BAND', 'Gancho': 'GANCHO', 'Tapa': 'TAPA', 'Curta': 'CURTA', 'Posicionamento': 'POSIC', 'Consistência': 'CONST', 'Decisão': 'DECIS' };
const KIND_LABEL = { error: 'erros', winner: 'winners', decision: 'decisões', position: 'posicionamento' };
const FUND_ALIAS = {
  Recepção: 'Devolução',
  Devolucao: 'Devolução',
  Constancia: 'Consistência',
  Constância: 'Consistência',
  Bandeja: 'Bandeja',
  'Bandeja/Controle': 'Bandeja',
  Curta: 'Curta',
  'Bolas curtas': 'Curta',
  Tapa: 'Tapa',
  Acelerada: 'Tapa',
  Espetada: 'Tapa',
};

function initials(name = '') {
  const clean = name.replace(/\(.*?\)/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (clean.slice(0, 2) || '?').toUpperCase();
}
const avg = (a) => (a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const clamp = (n, min = 0, max = 10) => Math.max(min, Math.min(max, Number(n)));

function canonicalFund(f = '') {
  const raw = String(f || '').trim();
  if (!raw) return 'Consistência';
  return FUND_ALIAS[raw] || FUND_ORDER.find((x) => x.toLowerCase() === raw.toLowerCase()) || raw;
}

function topEntries(obj, limit = 3) {
  return Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function addCount(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function scoreFromScoutEvent(e) {
  if (Number.isFinite(Number(e.score))) return clamp(Number(e.score));
  const kind = String(e.kind || e.outcome || '').toLowerCase();
  if (/winner|ace/.test(kind)) return 8.8;
  if (/erro|error/.test(kind)) return 3.0;
  if (/decision|decis/.test(kind)) return 5.0;
  if (/position|posic/.test(kind)) return 5.5;
  return 6.0;
}

function buildScoutNotas(events = []) {
  const grouped = {};
  for (const e of events) {
    const f = canonicalFund(e.fundamental || e.technique || 'Consistência');
    (grouped[f] = grouped[f] || []).push(scoreFromScoutEvent(e));
  }
  const out = {};
  for (const [f, vals] of Object.entries(grouped)) {
    const m = avg(vals);
    if (m != null) out[f] = Math.round(m * 10) / 10;
  }
  return out;
}

function buildScoutResumo(events = []) {
  const rows = [...events].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  if (!rows.length) return null;

  const byFund = {};
  const errorsByFund = {};
  const positivesByFund = {};
  const winnersByFund = {};
  const errorZones = {};
  const errorZonesByFund = {};
  const intentions = {};
  const issues = {};
  const kindCount = {};
  const matches = new Set();

  for (const e of rows) {
    const fund = canonicalFund(e.fundamental || e.technique || 'Consistência');
    const kind = e.kind || (String(e.outcome || '').toLowerCase().includes('erro') ? 'error' : '');
    const isError = kind === 'error' || /erro|error/i.test(e.outcome || '');
    const isWinner = kind === 'winner' || /winner|ace/i.test(e.outcome || '');
    const isPositive = isWinner || /forçou|forcou/i.test(e.outcome || '') || Number(e.score) >= 8;
    addCount(byFund, fund);
    addCount(kindCount, kind);
    if (isError) {
      addCount(errorsByFund, fund);
      addCount(errorZones, e.zone);
      errorZonesByFund[fund] = errorZonesByFund[fund] || {};
      addCount(errorZonesByFund[fund], e.zone);
    }
    if (isPositive) addCount(positivesByFund, fund);
    if (isWinner) addCount(winnersByFund, fund);
    addCount(intentions, e.inferred_intention);
    const ontologyIssue = inferTacticalIssue(e);
    addCount(issues, e.tactical_issue || ontologyIssue?.issue);
    if (e.match_id) matches.add(e.match_id);
  }

  const topError = topEntries(errorsByFund, 1)[0];
  const topZone = topEntries(errorZones, 1)[0];
  const topErrorZone = topError ? topEntries(errorZonesByFund[topError[0]], 1)[0] : null;
  const topIssue = topEntries(issues, 1)[0];
  const practicalIssue = topIssue ? practicalIssueText(topIssue[0]) : '';
  const focusCard = topIssue ? focusCardFromIssue(topIssue[0]) : null;
  const leitura = [
    topError ? `${topError[1]} erro(s) em ${topError[0]}` : '',
    topZone ? `zona dos erros ${topZone[0]}` : '',
    topIssue ? topIssue[0] : '',
  ].filter(Boolean).join(' · ');

  return {
    fonte: 'BT Tracker / scout_events',
    totalEventos: rows.length,
    partidas: matches.size,
    ultimoRegistro: rows[0]?.created_at || null,
    erros: kindCount.error || 0,
    winners: kindCount.winner || 0,
    fundamentoMaisVisto: topEntries(byFund, 1)[0]?.[0] || null,
    erroPrincipal: topError ? { fundamento: topError[0], total: topError[1] } : null,
    zonaCritica: topZone ? { zona: topZone[0], total: topZone[1] } : null,
    zonaErroPrincipal: topErrorZone ? { zona: topErrorZone[0], total: topErrorZone[1] } : null,
    errosPorFundamento: Object.fromEntries(topEntries(errorsByFund, 6)),
    positivosPorFundamento: Object.fromEntries(topEntries(positivesByFund, 6)),
    winnersPorFundamento: Object.fromEntries(topEntries(winnersByFund, 6)),
    intencoes: Object.fromEntries(topEntries(intentions, 4)),
    problemasTaticos: topEntries(issues, 4).map(([texto, total]) => ({ texto, total, pratica: practicalIssueText(texto), cartao: focusCardFromIssue(texto) })),
    leituraPratica: practicalIssue || '',
    cartaoFocoScout: focusCard,
    eventosRecentes: rows.slice(0, 12).map((e) => ({
      data: e.created_at,
      fundamento: canonicalFund(e.fundamental || e.technique || 'Consistência'),
      tipo: KIND_LABEL[e.kind] || e.kind || e.outcome || 'evento',
      desfecho: e.outcome || e.kind || '',
      tecnica: e.technique || '',
      zona: e.zone || '',
      intencao: e.inferred_intention || '',
      problema: e.tactical_issue || '',
      nota: e.score ?? null,
    })),
    notasRadar: Object.fromEntries(Object.entries(buildScoutNotas(rows)).map(([f, v]) => [f, Math.round((v / 2) * 10) / 10])),
    leitura: leitura || `${rows.length} evento(s) de Scout vinculados ao aluno.`,
  };
}

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
  const [stu, enr, cls, ev, scoutEvents] = await Promise.all([
    supabase.from('students').select('id,name,level,phone').order('name'),
    supabase.from('class_enrollments').select('student_id,class_id'),
    supabase.from('classes').select('id,name,level'),
    supabase.from('evaluations').select('student_id,fundamental,score,evaluator'),
    supabase
      .from('scout_events')
      .select('id,student_id,class_id,match_id,fundamental,kind,score,note,outcome,technique,inferred_intention,tactical_issue,zone,created_at')
      .order('created_at', { ascending: false })
      .limit(2000),
  ]);
  if (stu.error) { console.warn('[listAlunos]', stu.error.message); return []; }
  if (scoutEvents.error) console.warn('[listAlunos:scout_events]', scoutEvents.error.message);

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
  const scoutByStudent = new Map();
  for (const e of (scoutEvents.data || [])) {
    if (!e.student_id) continue;
    if (!scoutByStudent.has(e.student_id)) scoutByStudent.set(e.student_id, []);
    scoutByStudent.get(e.student_id).push(e);
  }

  const out = (stu.data || []).map((s, i) => {
    const a = agg.get(s.id) || { teacher: {}, blind: {} };
    const cls = classByStudent.get(s.id);
    const scoutRows = scoutByStudent.get(s.id) || [];
    const scoutScores = buildScoutNotas(scoutRows);
    // notas 0-5 (dict) para a IA — todos os fundamentos avaliados
    const notasProf = {}; for (const [f, arr] of Object.entries(a.teacher)) { const m = avg(arr); if (m != null) notasProf[f] = Math.round((m / 2) * 10) / 10; }
    const notasAuto = {}; for (const [f, arr] of Object.entries(a.blind)) { const m = avg(arr); if (m != null) notasAuto[f] = Math.round((m / 2) * 10) / 10; }
    const notasScout = {}; for (const [f, score10] of Object.entries(scoutScores)) notasScout[f] = Math.round((Number(score10) / 2) * 10) / 10;
    const nProf = Object.keys(notasProf).length;
    const nAuto = Object.keys(notasAuto).length;
    const nScout = Object.keys(notasScout).length;
    // radar HÍBRIDO sobre TODOS os fundamentos avaliados.
    // Prioridade: professor + scout como evidência de jogo; se não houver professor, scout; se não houver scout, autoavaliação.
    const hyb = {}; // fundamento -> valor 0-1
    for (const f of FUND_ORDER) {
      const t = avg(a.teacher[f]);
      const sc = scoutScores[f];
      if (t != null && sc != null) { hyb[f] = ((t * 0.7) + (Number(sc) * 0.3)) / 10; continue; }
      if (t != null) { hyb[f] = t / 10; continue; }
      if (sc != null) { hyb[f] = Number(sc) / 10; continue; }
      const s2 = avg(a.blind[f]); if (s2 != null) hyb[f] = s2 / 10;
    }
    const radarFunds = FUND_ORDER.filter((f) => hyb[f] != null);
    const radar = radarFunds.map((f) => hyb[f]);
    const radarLabels = radarFunds.map((f) => ABBR[f] || f.toUpperCase().slice(0, 6));
    const radarFonte = nProf && nScout ? 'professor + scout' : nProf ? 'avaliação do professor' : nScout ? 'scout BT Tracker' : (nAuto ? 'autoavaliação (provisória)' : 'sem dados');
    // foco = fundamento mais fraco (na fonte vigente)
    let foco = '—', min = Infinity;
    for (const f of radarFunds) { if (hyb[f] < min) { min = hyb[f]; foco = f; } }
    const scoutResumo = buildScoutResumo(scoutRows);
    return {
      id: s.id, nome: s.name, phone: s.phone || '', ini: initials(s.name), cor: PALETTE[i % PALETTE.length],
      nivel: NIVEL[s.level] || s.level || '—',
      turma: cls ? `${cls.name} · ${NIVEL[cls.level] || cls.level}` : (NIVEL[s.level] || s.level || 'Sem turma'),
      foco, radarFonte,
      delta: nProf ? `${nProf} fund.` : (nScout ? `${nScout} scout` : (nAuto ? 'autoaval.' : 'sem aval.')),
      tone: nProf ? 'info' : (nScout ? 'coral' : (nAuto ? 'turq' : 'neutral')),
      radar, radarLabels, evo: null,
      notasProf, notasAuto, notasScout, hasProf: nProf > 0, hasScout: nScout > 0, scoutResumo,
    };
  });
  _cacheAlunos = out;
  return out;
}

export async function salvarAlunoCadastro({ id, nome, nivel, phone }) {
  if (!supabase) return { ok: false, error: 'Supabase não configurado' };
  const teacher_id = await uid();
  const row = { name: nome.trim(), level: dbLevel(nivel), phone: phone?.trim() || null };
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
  const [alunos, turmas, partidas, eventosScout] = await Promise.all([
    listAlunos(),
    listTurmas(),
    supabase.from('scout_matches').select('id'),
    supabase.from('scout_events').select('match_id'),
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
    nPartidas: (() => {
      const ids = new Set((partidas.data || []).map((x) => x.id).filter(Boolean));
      for (const x of (eventosScout.data || [])) if (x.match_id) ids.add(x.match_id);
      return ids.size;
    })(),
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

export async function listAlunosDaTurma(turmaId) {
  if (!supabase || !turmaId) return [];
  const [alunos, enr] = await Promise.all([
    listAlunos(true),
    supabase.from('class_enrollments').select('student_id').eq('class_id', turmaId),
  ]);
  if (enr.error) { console.warn('[listAlunosDaTurma]', enr.error.message); return []; }
  const ids = new Set((enr.data || []).map((x) => x.student_id).filter(Boolean));
  return alunos.filter((a) => ids.has(a.id));
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

function avgNotas(rows = [], evaluator) {
  const grouped = {};
  for (const r of rows) {
    if (evaluator && r.evaluator !== evaluator) continue;
    (grouped[r.fundamental] = grouped[r.fundamental] || []).push(Number(r.score));
  }
  const out = {};
  for (const [f, vals] of Object.entries(grouped)) {
    const m = avg(vals);
    if (m != null) out[f] = Math.round((m / 2) * 10) / 10;
  }
  return out;
}

function focoFromNotas(notas = {}) {
  let foco = null, min = Infinity;
  for (const [f, v] of Object.entries(notas)) {
    if (Number(v) < min) { min = Number(v); foco = f; }
  }
  return foco;
}

export async function contextoTurmaParaIA(turma) {
  if (!supabase || !turma?.id) {
    return { alvo: 'turma', nome: turma?.nome || 'Turma', nivel: turma?.nivel || 'Intermediário', duracaoMin: 60 };
  }
  const [enr, stu, ev, scoutEvents] = await Promise.all([
    supabase.from('class_enrollments').select('student_id').eq('class_id', turma.id),
    supabase.from('students').select('id,name,level').order('name'),
    supabase.from('evaluations').select('student_id,fundamental,score,evaluator,created_at'),
    supabase
      .from('scout_events')
      .select('id,student_id,class_id,match_id,fundamental,kind,score,note,outcome,technique,inferred_intention,tactical_issue,zone,created_at')
      .eq('class_id', turma.id)
      .order('created_at', { ascending: false })
      .limit(300),
  ]);
  if (enr.error) throw enr.error;
  if (stu.error) throw stu.error;
  if (ev.error) throw ev.error;
  if (scoutEvents.error) console.warn('[contextoTurmaParaIA:scout_events]', scoutEvents.error.message);

  const ids = new Set((enr.data || []).map((x) => x.student_id).filter(Boolean));
  const alunos = (stu.data || []).filter((s) => ids.has(s.id));
  const evalRows = (ev.data || []).filter((r) => ids.has(r.student_id));
  let scoutRows = scoutEvents.data || [];
  if (ids.size) {
    const { data: scoutByStudents, error: scoutByStudentsError } = await supabase
      .from('scout_events')
      .select('id,student_id,class_id,match_id,fundamental,kind,score,note,outcome,technique,inferred_intention,tactical_issue,zone,created_at')
      .in('student_id', Array.from(ids))
      .order('created_at', { ascending: false })
      .limit(600);
    if (scoutByStudentsError) console.warn('[contextoTurmaParaIA:scout_by_students]', scoutByStudentsError.message);
    const byId = new Map(scoutRows.map((x, i) => [x.id || `${x.student_id}:${x.created_at}:${i}`, x]));
    for (const x of (scoutByStudents || [])) byId.set(x.id || `${x.student_id}:${x.created_at}`, x);
    scoutRows = Array.from(byId.values()).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }
  const notasProf = avgNotas(evalRows, 'teacher');
  const notasAuto = avgNotas(evalRows, 'student_blind');
  const scoutResumo = buildScoutResumo(scoutRows);
  const alunosResumo = alunos.map((s) => {
    const rows = evalRows.filter((r) => r.student_id === s.id);
    const prof = avgNotas(rows, 'teacher');
    const auto = avgNotas(rows, 'student_blind');
    const scout = buildScoutResumo(scoutRows.filter((e) => e.student_id === s.id));
    const foco = focoFromNotas(Object.keys(prof).length ? prof : auto);
    return {
      id: s.id,
      nome: s.name,
      nivel: NIVEL[s.level] || s.level || turma.nivel || 'Intermediário',
      foco,
      avaliacaoProfessor: prof,
      autoavaliacao: auto,
      scout: scout ? {
        totalEventos: scout.totalEventos,
        erros: scout.erros,
        winners: scout.winners,
        erroPrincipal: scout.erroPrincipal,
        zonaCritica: scout.zonaCritica,
      leitura: scout.leitura,
      leituraPratica: scout.leituraPratica,
      cartaoFocoScout: scout.cartaoFocoScout,
      } : null,
    };
  });

  return {
    alvo: 'turma',
    nome: turma.nome,
    nivel: turma.nivel || 'Intermediário',
    duracaoMin: 60,
    turma: {
      id: turma.id,
      nome: turma.nome,
      hora: turma.hora || null,
      capacidade: turma.capacidade || null,
      focoPadrao: turma.foco || null,
    },
    alunosMatriculados: alunos.length,
    alunos: alunosResumo,
    ...(Object.keys(notasProf).length ? { avaliacaoProfessor: notasProf } : {}),
    ...(Object.keys(notasAuto).length ? { autoavaliacao: notasAuto } : {}),
    ...(scoutResumo ? {
      scout: scoutResumo,
      scoutEventosRecentes: scoutResumo.eventosRecentes,
      evidenciasScout: [
        `${scoutResumo.totalEventos} evento(s) de Scout da turma`,
        scoutResumo.erroPrincipal ? `erro principal: ${scoutResumo.erroPrincipal.fundamento} (${scoutResumo.erroPrincipal.total})` : '',
        scoutResumo.zonaCritica ? `zona crítica: ${scoutResumo.zonaCritica.zona}` : '',
        scoutResumo.leitura || '',
      ].filter(Boolean),
    } : {}),
    observacoes: turma.foco ? `Foco padrão cadastrado da turma: ${turma.foco}. Use apenas se convergir com radar/scout.` : '',
    ontologiaOperacional: ONTOLOGY_PROMPT_BLOCK,
  };
}
