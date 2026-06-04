-- BeachFlow - rota publica de feedback do aluno
-- Execute no SQL Editor do Supabase ou aplique via CLI.
-- Usa a tabela existente self_assess_tokens para nao duplicar fluxo de token.

create extension if not exists "pgcrypto";

create table if not exists public.self_assess_tokens (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  token text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, student_id)
);

alter table public.self_assess_tokens add column if not exists used_at timestamptz;
alter table public.self_assess_tokens add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_self_assess_tokens_token on public.self_assess_tokens (token);

drop function if exists public.get_student_feedback(text);

create or replace function public.get_student_feedback(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_token public.self_assess_tokens%rowtype;
  v_student public.students%rowtype;
begin
  select * into v_token
  from public.self_assess_tokens
  where token = p_token
  limit 1;

  if not found then
    raise exception 'Link de aluno invalido';
  end if;

  select * into v_student
  from public.students
  where id = v_token.student_id
  limit 1;

  if not found then
    raise exception 'Aluno nao encontrado';
  end if;

  return jsonb_build_object(
    'token', v_token.token,
    'used_at', v_token.used_at,
    'student', jsonb_build_object(
      'id', v_student.id,
      'name', v_student.name,
      'level', v_student.level
    ),
    'evaluations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'fundamental', e.fundamental,
        'score', e.score,
        'evaluator', e.evaluator,
        'created_at', e.created_at
      ) order by e.created_at desc)
      from public.evaluations e
      where e.student_id = v_token.student_id
        and e.evaluator = 'student_blind'
    ), '[]'::jsonb),
    'scout_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'fundamental', s.fundamental,
        'kind', s.kind,
        'score', s.score,
        'note', s.note,
        'outcome', s.outcome,
        'technique', s.technique,
        'inferred_intention', s.inferred_intention,
        'tactical_issue', s.tactical_issue,
        'zone', s.zone,
        'created_at', s.created_at
      ) order by s.created_at desc)
      from public.scout_events s
      where s.student_id = v_token.student_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_student_feedback(text) from public;
grant execute on function public.get_student_feedback(text) to anon, authenticated;
