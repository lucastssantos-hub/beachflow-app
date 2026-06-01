import { supabase } from '../supabaseClient.js';

const WEEKDAY_KEYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

function digits(v = '') {
  return String(v).replace(/\D/g, '');
}

function cleanDayText(s = '') {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sessionDateForTurma(turma) {
  const name = cleanDayText(turma?.nome || '');
  const target = WEEKDAY_KEYS.findIndex((day) => name.includes(day));
  const date = new Date();
  if (target >= 0) {
    const delta = (target - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + delta);
  }
  return isoDate(date);
}

function dbTime(hora = '') {
  const v = String(hora || '').trim();
  if (!v) return '00:00:00';
  const [h = '00', m = '00'] = v.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
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

async function ensureClassSession(turma, teacherId) {
  const row = {
    teacher_id: teacherId,
    class_id: turma.id,
    session_date: sessionDateForTurma(turma),
    start_time: dbTime(turma.hora),
    focus_fundamental: turma.foco || null,
  };
  const { data, error } = await supabase
    .from('class_sessions')
    .upsert(row, { onConflict: 'class_id,session_date' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
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
  const sessionId = await ensureClassSession(turma, teacherId);
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
    const { data: confirmation } = await supabase
      .from('class_confirmations')
      .select('token,status')
      .eq('session_id', sessionId)
      .eq('student_id', aluno.id)
      .maybeSingle();
    out.push({
      aluno,
      token: confirmation?.token || row?.token || row?.p_token || row || null,
      status: confirmation?.status || row?.status || 'pending',
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
