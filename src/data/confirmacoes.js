import { supabase } from '../supabaseClient.js';

function digits(v = '') {
  return String(v).replace(/\D/g, '');
}

export function whatsappUrl(phone, message) {
  let d = digits(phone);
  if (!d) return '';
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

export function confirmationUrl(token) {
  const base = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  base.searchParams.set('confirm', token);
  return base.toString();
}

export function statusLabel(status) {
  const s = String(status || 'pending').toLowerCase();
  if (s === 'confirmed') return 'Confirmado';
  if (s === 'declined') return 'Não irá';
  return 'Pendente';
}

export function statusTone(status) {
  const s = String(status || 'pending').toLowerCase();
  if (s === 'confirmed') return 'ok';
  if (s === 'declined') return 'coral';
  return 'neutral';
}

async function currentTeacherId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export async function listAlunosDaTurma(classId) {
  if (!supabase || !classId) return [];
  const { data: enr, error: enrError } = await supabase
    .from('class_enrollments')
    .select('student_id')
    .eq('class_id', classId);
  if (enrError) throw enrError;
  const ids = (enr || []).map((x) => x.student_id).filter(Boolean);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('students')
    .select('id,name,phone')
    .in('id', ids)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function prepararConfirmacoesTurma({ turma }) {
  if (!supabase || !turma?.id) return { sessionId: null, alunos: [] };
  const teacherId = await currentTeacherId();
  const alunos = await listAlunosDaTurma(turma.id);
  const sessionId = crypto.randomUUID();
  const out = [];
  for (const aluno of alunos) {
    const { data, error } = await supabase.rpc('ensure_class_confirmation', {
      p_session_id: sessionId,
      p_class_id: turma.id,
      p_student_id: aluno.id,
      p_teacher_id: teacherId,
    });
    if (error) {
      out.push({ aluno, error: error.message, token: null, status: 'pending' });
      continue;
    }
    const row = Array.isArray(data) ? data[0] : data;
    out.push({
      aluno,
      token: row?.token || row?.p_token || row || null,
      status: row?.status || 'pending',
      error: null,
    });
  }
  return { sessionId, alunos: out };
}

export async function getConfirmacao(token) {
  if (!supabase || !token) return null;
  const { data, error } = await supabase.rpc('get_class_confirmation', { p_token: token });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function responderConfirmacao(token, status) {
  if (!supabase || !token) return null;
  const { data, error } = await supabase.rpc('respond_class_confirmation', {
    p_token: token,
    p_status: status,
  });
  if (error) throw error;
  return data;
}
