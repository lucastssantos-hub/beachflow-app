// Camada de dados de scout (READ-ONLY) — lê as partidas/pontos do app antigo.
// Tabelas: scout_matches, scout_points. RLS por teacher_id = auth.uid().
import { supabase } from '../supabaseClient.js';

// Lista as partidas de scout do professor (mais recentes primeiro), com nº de pontos.
export async function listPartidas() {
  if (!supabase) return [];
  const [m, p] = await Promise.all([
    supabase.from('scout_matches')
      .select('id,title,team_a_names,team_b_names,games_a,games_b,ended,active,created_at,mode')
      .order('created_at', { ascending: false }),
    supabase.from('scout_points').select('match_id'),
  ]);
  if (m.error) { console.warn('[listPartidas]', m.error.message); return []; }
  const counts = {};
  for (const x of (p.data || [])) counts[x.match_id] = (counts[x.match_id] || 0) + 1;
  return (m.data || []).map((x) => ({
    id: x.id,
    titulo: x.title || 'Partida',
    timeA: (x.team_a_names || []).filter(Boolean).join(' & ') || 'Time A',
    timeB: (x.team_b_names || []).filter(Boolean).join(' & ') || 'Time B',
    gamesA: x.games_a || 0, gamesB: x.games_b || 0,
    encerrada: !!x.ended, aoVivo: !!x.active && !x.ended,
    data: x.created_at, pontos: counts[x.id] || 0, mode: x.mode,
  }));
}

const isWinner = (o = '') => /winner/i.test(o);
const isErro = (o = '') => /erro/i.test(o);

// Detalhe de uma partida: dados + pontos + estatísticas agregadas.
export async function getPartida(id) {
  if (!supabase) return null;
  const [m, p] = await Promise.all([
    supabase.from('scout_matches').select('*').eq('id', id).single(),
    supabase.from('scout_points')
      .select('outcome,shot,technique,winner_team,server_name,final_player_name,score_after,point_number,set_number,created_at')
      .eq('match_id', id).order('point_number', { ascending: true }),
  ]);
  if (m.error) { console.warn('[getPartida]', m.error.message); return null; }
  const match = m.data;
  const pts = p.data || [];

  const stats = {
    total: pts.length,
    pontosA: pts.filter((x) => x.winner_team === 'a').length,
    pontosB: pts.filter((x) => x.winner_team === 'b').length,
    winners: pts.filter((x) => isWinner(x.outcome)).length,
    erros: pts.filter((x) => isErro(x.outcome)).length,
    porGolpe: {},   // golpe -> nº de pontos
    porOutcome: {}, // tipo de desfecho -> nº
  };
  for (const x of pts) {
    const g = x.shot || x.technique;
    if (g) stats.porGolpe[g] = (stats.porGolpe[g] || 0) + 1;
    if (x.outcome) stats.porOutcome[x.outcome] = (stats.porOutcome[x.outcome] || 0) + 1;
  }
  stats.topGolpes = Object.entries(stats.porGolpe).sort((a, b) => b[1] - a[1]).slice(0, 6);
  stats.topOutcomes = Object.entries(stats.porOutcome).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return {
    id, titulo: match.title || 'Partida',
    timeA: (match.team_a_names || []).filter(Boolean).join(' & ') || 'Time A',
    timeB: (match.team_b_names || []).filter(Boolean).join(' & ') || 'Time B',
    gamesA: match.games_a || 0, gamesB: match.games_b || 0,
    encerrada: !!match.ended, data: match.created_at, mode: match.mode,
    pts, stats,
  };
}
