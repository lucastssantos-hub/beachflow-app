import { supabase } from '../supabaseClient.js';

export const AUTO_FUNDAMENTOS = ['Saque', 'Devolução', 'Forehand', 'Backhand', 'Lob', 'Smash', 'Bandeja', 'Gancho', 'Tapa', 'Curta', 'Posicionamento', 'Consistência', 'Decisão'];

export function selfAssessmentUrl(token, aluno = {}) {
  const basePath = import.meta.env.BASE_URL || '/';
  const base = new URL(basePath, window.location.origin);
  base.pathname = `${base.pathname.replace(/\/$/, '')}/aluno/${encodeURIComponent(token)}`;
  return base.toString();
}

export function selfAssessmentMessage(aluno, link) {
  const nome = String(aluno?.nome || aluno?.name || 'aluno').trim().split(/\s+/)[0] || 'aluno';
  return `Oi, ${nome}! Preparei seu espaço no BeachFlow 🎾\n\nSe ainda não respondeu, você faz uma autoavaliação rápida. Se já respondeu, o link mostra seu feedback de evolução.\n\nAcesse por aqui:\n${link}`;
}

async function currentTeacherId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export async function prepararAutoavaliacaoAluno(aluno) {
  if (!supabase || !aluno?.id) throw new Error('Supabase não configurado.');
  const teacherId = await currentTeacherId();
  if (!teacherId) throw new Error('Entre novamente na conta antes de enviar autoavaliações.');
  const token = `sa_${aluno.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`.replace(/[^a-zA-Z0-9_-]/g, '');
  const { error } = await supabase.rpc('register_self_assess_token', {
    p_student_id: aluno.id,
    p_token: token,
    p_teacher_id: teacherId,
  });
  if (error) throw error;
  const link = selfAssessmentUrl(token, aluno);
  return { token, link, message: selfAssessmentMessage(aluno, link) };
}

export async function prepararFeedbackAluno(aluno) {
  if (!supabase || !aluno?.id) throw new Error('Supabase não configurado.');
  const teacherId = await currentTeacherId();
  if (!teacherId) throw new Error('Entre novamente na conta antes de enviar feedbacks.');
  const { data, error } = await supabase.rpc('ensure_student_feedback_token', {
    p_student_id: aluno.id,
    p_teacher_id: teacherId,
  });
  if (error) throw error;
  const token = typeof data === 'string' ? data : data?.token;
  if (!token) throw new Error('Não foi possível gerar o link de feedback.');
  const link = selfAssessmentUrl(token, aluno);
  return { token, link };
}

export async function salvarAutoavaliacaoToken(token, scores) {
  if (!supabase || !token) throw new Error('Link inválido.');
  const { data, error } = await supabase.rpc('save_self_assessment', {
    p_token: token,
    p_scores: scores,
  });
  if (error) throw error;
  return data;
}
