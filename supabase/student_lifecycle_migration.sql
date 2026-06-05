-- BeachFlow - ciclo de vida do aluno
-- Permite inativar ex-alunos sem perder historico, scouts, avaliacoes ou autoavaliacoes.

alter table public.students
  add column if not exists active boolean not null default true;

alter table public.students
  add column if not exists inactive_at timestamptz;

alter table public.students
  add column if not exists inactive_reason text;

create index if not exists students_teacher_active_idx
  on public.students (teacher_id, active);

update public.students
set active = true
where active is null;
