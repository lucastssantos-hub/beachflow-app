import { supabase } from '../supabaseClient.js';

export const AUTO_FUNDAMENTOS = ['Saque', 'Devolução', 'Forehand', 'Backhand', 'Lob', 'Smash', 'Bandeja', 'Gancho', 'Tapa', 'Curta', 'Posicionamento', 'Consistência', 'Decisão'];

export function selfAssessmentUrl(token, aluno = {}) {
  const base = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  base.searchParams.set('auto', token);
  if (aluno.nome || aluno.name) base.searchParams.set('aluno', aluno.nome || aluno.name);
  return base.toString();
}

export function selfAssessmentMessage(aluno, link) {
  const nome = String(aluno?.nome || aluno?.name || 'aluno').trim().split(/\s+/)[0] || 'aluno';
  return `Oi, ${nome}! Quero entender como você se sente em cada fundamento do beach tennis para ajustar melhor seus treinos.\n\nÉ uma autoavaliação rápida, leva cerca de 2 minutos.\n\nResponda por aqui:\n${link}`;
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

export async function salvarAutoavaliacaoToken(token, scores) {
  if (!supabase || !token) throw new Error('Link inválido.');
  const { data, error } = await supabase.rpc('save_self_assessment', {
    p_token: token,
    p_scores: scores,
  });
  if (error) throw error;
  return data;
}
