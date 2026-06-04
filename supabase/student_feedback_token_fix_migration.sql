-- BeachFlow - token seguro para feedback publico do aluno.
-- Este fluxo reutiliza o link /aluno/:token sem reabrir a autoavaliacao.

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

create or replace function public.ensure_student_feedback_token(
  p_student_id uuid,
  p_teacher_id uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if auth.uid() is null or auth.uid() <> p_teacher_id then
    raise exception 'Professor nao autenticado';
  end if;

  if not exists (
    select 1
    from public.students
    where id = p_student_id
      and teacher_id = p_teacher_id
  ) then
    raise exception 'Aluno nao encontrado para este professor';
  end if;

  select token into v_token
  from public.self_assess_tokens
  where teacher_id = p_teacher_id
    and student_id = p_student_id
  limit 1;

  if v_token is not null then
    update public.self_assess_tokens
    set updated_at = now()
    where teacher_id = p_teacher_id
      and student_id = p_student_id;
    return v_token;
  end if;

  v_token := 'fb_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.self_assess_tokens (teacher_id, student_id, token, used_at, updated_at)
  values (p_teacher_id, p_student_id, v_token, now(), now());

  return v_token;
end;
$$;

revoke execute on function public.ensure_student_feedback_token(uuid, uuid) from public;
grant execute on function public.ensure_student_feedback_token(uuid, uuid) to authenticated;
