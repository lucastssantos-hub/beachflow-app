-- BeachFlow - leads da landing de acesso beta.

create table if not exists public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  sobrenome text,
  email text not null,
  whatsapp text not null,
  cidade text,
  num_alunos integer,
  nivel text not null,
  desafio text,
  origem text,
  organizacao text[] not null default '{}',
  referrer text,
  page_url text,
  user_agent text
);

alter table public.beta_signups enable row level security;

drop policy if exists "Public beta signup insert" on public.beta_signups;
create policy "Public beta signup insert"
  on public.beta_signups
  for insert
  to anon, authenticated
  with check (true);

revoke all on table public.beta_signups from anon, authenticated;
grant insert on table public.beta_signups to anon, authenticated;
