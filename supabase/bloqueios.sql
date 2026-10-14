-- =========================================================
-- Bloqueios de horário (almoço, descanso, imprevisto...)
-- Cole TUDO no Supabase: SQL Editor → New query → Run.
-- Pode rodar mais de uma vez sem problema.
-- =========================================================

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  -- vazio = vale para todos os profissionais
  professional_id uuid references public.professionals(id) on delete cascade,
  -- dia do bloqueio; se repeat_daily = true, vale todos os dias a partir desta data
  date date not null,
  repeat_daily boolean not null default false,
  start_time time not null,
  end_time time not null,
  reason text not null default 'Bloqueado' check (length(trim(reason)) between 1 and 60),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists blocks_date_idx on public.blocks (date);

-- Só o ADM vê, cria e remove bloqueios (os clientes só enxergam "Indisponível", sem o motivo)
alter table public.blocks enable row level security;

drop policy if exists "adm ve bloqueios" on public.blocks;
create policy "adm ve bloqueios" on public.blocks for select to authenticated using (public.is_admin());
drop policy if exists "adm cria bloqueios" on public.blocks;
create policy "adm cria bloqueios" on public.blocks for insert to authenticated with check (public.is_admin());
drop policy if exists "adm remove bloqueios" on public.blocks;
create policy "adm remove bloqueios" on public.blocks for delete to authenticated using (public.is_admin());

-- Bloqueios que valem num dia (do dia ou diários que já começaram)
create or replace function public.bloqueios_do_dia(p_data date)
returns setof public.blocks
language sql stable security definer set search_path = '' as $$
  select *
    from public.blocks b
   where (not b.repeat_daily and b.date = p_data)
      or (b.repeat_daily and b.date <= p_data);
$$;
revoke execute on function public.bloqueios_do_dia(date) from public, anon, authenticated;

-- Horários indisponíveis de um dia: pedidos de clientes + bloqueios (sem nomes nem motivos).
-- "tipo" diz se é um agendamento ou um bloqueio; professional_id vazio = todos os profissionais.
drop function if exists public.horarios_ocupados(date);
create function public.horarios_ocupados(p_data date)
returns table (professional_id uuid, start_time time, end_time time, tipo text)
language sql stable security definer set search_path = '' as $$
  select a.professional_id, a.start_time, a.end_time, 'agendamento'
    from public.appointments a
   where a.date = p_data and a.status in ('pending', 'confirmed')
  union all
  select b.professional_id, b.start_time, b.end_time, 'bloqueio'
    from public.bloqueios_do_dia(p_data) b;
$$;
revoke execute on function public.horarios_ocupados(date) from public, anon;
grant execute on function public.horarios_ocupados(date) to authenticated;

-- O banco recusa pedidos em horário bloqueado (roda depois de "antes_de_agendar",
-- que já calculou o horário de término)
create or replace function public.checar_bloqueio()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1
      from public.bloqueios_do_dia(new.date) b
     where (b.professional_id is null or b.professional_id = new.professional_id)
       and new.start_time < b.end_time
       and new.end_time > b.start_time
  ) then
    raise exception 'Esse horário não está disponível. Escolha outro.';
  end if;
  return new;
end $$;
revoke execute on function public.checar_bloqueio() from public, anon, authenticated;

drop trigger if exists checar_bloqueio on public.appointments;
create trigger checar_bloqueio
  before insert on public.appointments
  for each row execute function public.checar_bloqueio();

-- Confere: deve listar os dois gatilhos, nesta ordem
select tgname from pg_trigger
 where tgrelid = 'public.appointments'::regclass and not tgisinternal
 order by tgname;
