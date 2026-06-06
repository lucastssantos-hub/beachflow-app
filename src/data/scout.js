// Camada de dados de scout — lê e (no ao vivo) grava em scout_matches/scout_points.
// RLS por teacher_id = auth.uid().
import { supabase } from '../supabaseClient.js';
import { initialScoutScore, applyScoutWinner, scoutScoreText, scoutDeciding, inferIntention } from './scoutScore.js';
import { buildScoutResumo } from './alunos.js';
import { applyScoutConsistencyRules, validatePointConsistency, buildScoutEvent, teamOfPlayer } from './scoutConsistency.js';

async function uid() { const { data } = await supabase.auth.getUser(); return data?.user?.id || null; }

// Cria uma partida ao vivo. players = {a1,a2,b1,b2} (objetos {id,name}); a2/b2 nulos se simples.
export async function criarPartida({ titulo, mode, singles, a1, a2, b1, b2, classId }) {
  if (!supabase) return null;
  const tid = await uid();
  const teamA = [a1, singles ? null : a2].filter(Boolean);
  const teamB = [b1, singles ? null : b2].filter(Boolean);
  const row = {
    teacher_id: tid, title: titulo || 'Partida ao vivo', mode, format: mode, score_mode: mode,
    team_a: teamA.map((p) => p.id), team_b: teamB.map((p) => p.id),
    team_a_names: teamA.map((p) => p.name), team_b_names: teamB.map((p) => p.name),
    games_a: 0, games_b: 0, points_a: 0, points_b: 0,
    active: true, ended: false, score_state: initialScoutScore(mode),
    ...(classId ? { class_id: classId } : {}),
  };
  const { data, error } = await supabase.from('scout_matches').insert(row).select('id').single();
  if (error) { console.warn('[criarPartida]', error.message); return null; }
  return { id: data.id, titulo: row.title, mode, singles, classId: classId || null, players: { a: teamA, b: teamB }, score: row.score_state };
}

// Salva um ponto: aplica a pontuação, grava o ponto e atualiza a partida. Retorna o novo placar.
export async function salvarPonto(match, draft, scoreState, pointNumber) {
  const tid = await uid();
  const check = validatePointConsistency(draft, match);
  if (!check.valid) throw new Error(check.error || 'Ponto inconsistente.');
  const applied = applyScoutConsistencyRules(draft, match).draft;
  const before = scoreState;
  const after = applyScoutWinner(before, applied.winner);
  const serveEvent = applied.outcome === 'Ace' || applied.outcome === 'Erro de saque';
  const returnEvent = applied.outcome === 'Erro de devolução';
  const technique = serveEvent ? 'Saque' : (returnEvent ? 'Devolução' : applied.technique);
  const intention = inferIntention(technique, applied.outcome, applied.zone);
  const all = [...match.players.a, ...match.players.b];
  const serverName = all.find((p) => p.id === applied.server)?.name || '';
  const finalPlayerName = all.find((p) => p.id === applied.final_player)?.name || '';
  const point = {
    teacher_id: tid, match_id: match.id, point_number: pointNumber,
    set_number: before.set_number, server_id: applied.server, server_name: serverName,
    server_team: teamOfPlayer(applied.server, match), serve_side: applied.serve_side,
    outcome: applied.outcome, shot: technique, technique, inferred_intention: intention,
    zone: applied.zone || '', winner_team: applied.winner,
    score_before: scoutScoreText(before), score_after: scoutScoreText(after),
    games_before: `${before.games.a}x${before.games.b}`, games_after: `${after.games.a}x${after.games.b}`,
    sets_before: `${before.sets.a}x${before.sets.b}`, sets_after: `${after.sets.a}x${after.sets.b}`,
    is_deciding_point: scoutDeciding(before), is_tiebreak: !!before.tie, is_super_tiebreak: !!before.superTie,
  };
  const { error } = await supabase.from('scout_points').insert(point);
  if (error) console.warn('[salvarPonto]', error.message);
  let scoutEvent = null;
  const builtEvent = buildScoutEvent(applied, match, point);
  if (builtEvent) {
    const {
      is_deciding_point,
      is_tiebreak,
      is_super_tiebreak,
      ...eventForDb
    } = builtEvent;
    scoutEvent = {
      teacher_id: tid,
      match_id: match.id,
      ...(match.classId ? { class_id: match.classId } : {}),
      ...eventForDb,
      note: [
        builtEvent.note,
        finalPlayerName ? `final_player=${finalPlayerName}` : '',
        applied.ace_dir ? `ace_dir=${applied.ace_dir}` : '',
        applied.return_side ? `return_side=${applied.return_side}` : '',
      ].filter(Boolean).join(' · '),
    };
    const { error: evError } = await supabase.from('scout_events').insert(scoutEvent);
    if (evError) {
      console.warn('[salvarPonto scout_event]', evError.message);
      const minimalEvent = {
        teacher_id: tid,
        match_id: match.id,
        ...(match.classId ? { class_id: match.classId } : {}),
        student_id: scoutEvent.student_id,
        fundamental: scoutEvent.fundamental,
        kind: scoutEvent.kind,
        score: scoutEvent.score,
        note: scoutEvent.note,
      };
      const { error: minError } = await supabase.from('scout_events').insert(minimalEvent);
      if (minError) console.warn('[salvarPonto scout_event:minimal]', minError.message);
      else scoutEvent = minimalEvent;
    }
  }
  await supabase.from('scout_matches').update({
    games_a: after.games.a, games_b: after.games.b, points_a: after.points.a, points_b: after.points.b,
    score_state: after, ended: after.finished,
    ...(after.finished ? { ended_at: new Date().toISOString(), active: false } : {}),
  }).eq('id', match.id);
  return { score: after, point, event: scoutEvent };
}

export async function encerrarPartida(id) {
  if (!supabase) return;
  await supabase.from('scout_matches').update({ ended: true, active: false, ended_at: new Date().toISOString() }).eq('id', id);
}

// Constrói o contexto da IA a partir de uma partida (getPartida): scout como fonte principal.
export function scoutContext(d) {
  const resumo = buildScoutResumo(d.pts || []);
  const erros = {}, winners = {};
  for (const p of (d.pts || [])) {
    const f = p.shot || p.technique;
    if (!f) continue;
    if (/erro/i.test(p.outcome || '')) erros[f] = (erros[f] || 0) + 1;
    if (/winner/i.test(p.outcome || '')) winners[f] = (winners[f] || 0) + 1;
  }
  const padroes = Object.entries(erros).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([fundamento, frequencia]) => ({ tipo: 'erro não forçado', fundamento, frequencia }));
  return {
    alvo: 'turma',
    nome: d.titulo || 'Partida',
    nivel: d.classLevel || 'Intermediário',
    ...(d.className ? { turma: d.className } : {}),
    duracaoMin: 60,
    scout: {
      ...(resumo || {}),
      pontosAnalisados: d.stats ? d.stats.total : (d.pts || []).length,
      placar: `${d.gamesA}x${d.gamesB} games`,
      padroes,
      errosPorGolpe: erros,
      winnersPorGolpe: winners,
      erroPrincipal: resumo?.erroPrincipal || (padroes[0] ? { fundamento: padroes[0].fundamento, total: padroes[0].frequencia } : null),
      leitura: resumo?.leitura || padroes.map((p) => `${p.frequencia} erro(s) em ${p.fundamento}`).join(' · '),
      leituraPratica: resumo?.leituraPratica || '',
      cartaoFocoScout: resumo?.cartaoFocoScout || null,
    },
  };
}

const isWinner = (o = '') => /winner/i.test(o);
const isErro = (o = '') => /erro/i.test(o);
const legacyId = (id) => `legacy:${id}`;
const isLegacyId = (id = '') => String(id).startsWith('legacy:');
const rawLegacyId = (id = '') => String(id).replace(/^legacy:/, '');

function normalizeLegacyPoint(x, i = 0) {
  return {
    outcome: x.outcome || '',
    shot: x.technique || x.fundamental || '',
    technique: x.technique || x.fundamental || '',
    fundamental: x.fundamental || x.technique || '',
    kind: x.kind || '',
    student_id: x.student_id || '',
    inferred_intention: x.inferred_intention || '',
    tactical_issue: x.tactical_issue || '',
    note: x.note || '',
    winner_team: '',
    score_after: typeof x.score === 'string' ? x.score : '',
    point_number: i + 1,
    set_number: 1,
    created_at: x.created_at,
    zone: x.zone || '',
  };
}

function statsFromPoints(pts) {
  const stats = {
    total: pts.length,
    pontosA: pts.filter((x) => x.winner_team === 'a').length,
    pontosB: pts.filter((x) => x.winner_team === 'b').length,
    winners: pts.filter((x) => isWinner(x.outcome)).length,
    erros: pts.filter((x) => isErro(x.outcome)).length,
    porGolpe: {},
    porOutcome: {},
  };
  for (const x of pts) {
    const g = x.shot || x.technique;
    if (g) stats.porGolpe[g] = (stats.porGolpe[g] || 0) + 1;
    if (x.outcome) stats.porOutcome[x.outcome] = (stats.porOutcome[x.outcome] || 0) + 1;
  }
  stats.topGolpes = Object.entries(stats.porGolpe).sort((a, b) => b[1] - a[1]).slice(0, 6);
  stats.topOutcomes = Object.entries(stats.porOutcome).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return stats;
}

// Lista as partidas de scout do professor (mais recentes primeiro), com nº de pontos.
export async function listPartidas() {
  if (!supabase) return [];
  const [m, p, ev] = await Promise.all([
    supabase.from('scout_matches')
      .select('id,title,team_a_names,team_b_names,games_a,games_b,ended,active,created_at,mode')
      .order('created_at', { ascending: false }),
    supabase.from('scout_points').select('match_id'),
    supabase.from('scout_events').select('match_id,class_id,created_at'),
  ]);
  if (m.error) { console.warn('[listPartidas]', m.error.message); return []; }
  if (ev.error) console.warn('[listPartidas scout_events]', ev.error.message);
  const counts = {};
  for (const x of (p.data || [])) counts[x.match_id] = (counts[x.match_id] || 0) + 1;
  for (const x of (ev.data || [])) if (x.match_id) counts[x.match_id] = (counts[x.match_id] || 0) + 1;
  const known = new Set((m.data || []).map((x) => x.id));
  const legacyGroups = new Map();
  for (const x of (ev.data || [])) {
    if (!x.match_id || known.has(x.match_id)) continue;
    const g = legacyGroups.get(x.match_id) || { id: x.match_id, classId: x.class_id, data: x.created_at, pontos: 0 };
    g.pontos++;
    if (x.created_at && (!g.data || x.created_at < g.data)) g.data = x.created_at;
    legacyGroups.set(x.match_id, g);
  }
  const modernas = (m.data || []).map((x) => ({
    id: x.id,
    titulo: x.title || 'Partida',
    timeA: (x.team_a_names || []).filter(Boolean).join(' & ') || 'Time A',
    timeB: (x.team_b_names || []).filter(Boolean).join(' & ') || 'Time B',
    gamesA: x.games_a || 0, gamesB: x.games_b || 0,
    encerrada: !!x.ended, aoVivo: !!x.active && !x.ended,
    data: x.created_at, pontos: counts[x.id] || 0, mode: x.mode, origem: 'novo',
  }));
  const antigas = Array.from(legacyGroups.values()).map((x) => ({
    id: legacyId(x.id),
    titulo: 'Scout BT Tracker',
    timeA: 'Dados do scout',
    timeB: 'BT Tracker',
    gamesA: 0, gamesB: 0,
    encerrada: true, aoVivo: false,
    data: x.data, pontos: x.pontos, mode: 'lesson4', origem: 'bt-tracker', classId: x.classId,
  }));
  return [...modernas, ...antigas].sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
}

// Detalhe de uma partida: dados + pontos + estatísticas agregadas.
export async function getPartida(id) {
  if (!supabase) return null;
  if (isLegacyId(id)) {
    const matchId = rawLegacyId(id);
    const { data, error } = await supabase.from('scout_events')
      .select('match_id,class_id,student_id,fundamental,kind,outcome,technique,inferred_intention,tactical_issue,zone,score,note,created_at')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    if (error) { console.warn('[getPartida scout_events]', error.message); return null; }
    const events = data || [];
    const classId = events[0]?.class_id || null;
    let classInfo = null;
    if (classId) {
      const { data: cls } = await supabase.from('classes').select('id,name,level').eq('id', classId).maybeSingle();
      classInfo = cls || null;
    }
    const pts = events.map(normalizeLegacyPoint);
    return {
      id, titulo: classInfo?.name ? `Scout · ${classInfo.name}` : 'Scout BT Tracker',
      classId,
      className: classInfo?.name || null,
      classLevel: classInfo?.level ? ({ iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }[classInfo.level] || classInfo.level) : null,
      timeA: 'Dados do scout', timeB: 'BT Tracker',
      gamesA: 0, gamesB: 0,
      encerrada: true, data: events[0]?.created_at || null, mode: 'lesson4',
      pts, stats: statsFromPoints(pts), origem: 'bt-tracker',
    };
  }
  const [m, p, ev] = await Promise.all([
    supabase.from('scout_matches').select('*').eq('id', id).single(),
    supabase.from('scout_points')
      .select('outcome,shot,technique,winner_team,server_name,final_player_name,score_after,point_number,set_number,created_at')
      .eq('match_id', id).order('point_number', { ascending: true }),
    supabase.from('scout_events')
      .select('student_id,fundamental,kind,outcome,technique,inferred_intention,tactical_issue,zone,score,note,created_at')
      .eq('match_id', id).order('created_at', { ascending: true }),
  ]);
  if (m.error) { console.warn('[getPartida]', m.error.message); return null; }
  const match = m.data;
  if (ev.error) console.warn('[getPartida scout_events]', ev.error.message);
  const basePts = p.data || [];
  const pts = [...basePts, ...(ev.data || []).map((x, i) => normalizeLegacyPoint(x, basePts.length + i))]
    .sort((a, b) => (a.point_number || 0) - (b.point_number || 0) || new Date(a.created_at || 0) - new Date(b.created_at || 0));
  let classInfo = null;
  if (match.class_id) {
    const { data: cls } = await supabase
      .from('classes')
      .select('id,name,level')
      .eq('id', match.class_id)
      .maybeSingle();
    classInfo = cls || null;
  }

  const stats = statsFromPoints(pts);

  return {
    id, titulo: match.title || 'Partida',
    classId: match.class_id || null,
    className: classInfo?.name || null,
    classLevel: classInfo?.level ? ({ iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }[classInfo.level] || classInfo.level) : null,
    timeA: (match.team_a_names || []).filter(Boolean).join(' & ') || 'Time A',
    timeB: (match.team_b_names || []).filter(Boolean).join(' & ') || 'Time B',
    gamesA: match.games_a || 0, gamesB: match.games_b || 0,
    encerrada: !!match.ended, data: match.created_at, mode: match.mode,
    pts, stats,
  };
}
