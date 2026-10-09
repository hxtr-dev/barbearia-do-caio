-- =========================================================
-- Barbearia do Caio — banco de dados no Supabase
-- Cole TUDO no Supabase: SQL Editor → New query → Run.
-- Rode uma única vez, num projeto novo.
-- =========================================================

-- Permite a trava "um profissional não pode ter dois horários sobrepostos"
create extension if not exists btree_gist;

/* ---------------- Tabelas ---------------- */

-- Dados extras de cada usuário (o e-mail e a senha ficam no Supabase Auth)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  duration int not null check (duration > 0 and duration % 30 = 0),
  price numeric(10, 2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null references public.professionals(id),
  service_ids uuid[] not null,
  -- "Fotografia" dos serviços no momento do pedido (se o preço mudar depois, o pedido não muda)
  service_name text not null,
  price numeric(10, 2) not null,
  duration int not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Pedidos pendentes ou confirmados do mesmo profissional não podem se sobrepor
  constraint sem_sobreposicao exclude using gist (
    professional_id with =,
    tsrange(date + start_time, date + end_time) with &&
  ) where (status in ('pending', 'confirmed'))
);

-- Avisos para o cliente ("seu horário foi confirmado")
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.appointments (date);
create index on public.appointments (client_id);
create index on public.notifications (user_id);

/* ---------------- Funções de apoio ---------------- */

-- Cria o perfil automaticamente quando alguém se cadastra
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'name', ''),
          coalesce(new.raw_user_meta_data ->> 'phone', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- O usuário logado é o ADM?
create function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Hora atual no horário de Brasília
create function public.agora_brasilia()
returns timestamp language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo');
$$;

-- Antes de salvar um pedido: o servidor confere tudo e calcula preço e duração.
-- (Assim ninguém consegue "mexer no site" para pagar menos ou furar a agenda.)
create function public.preparar_agendamento()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_qtd int;
  v_dur int;
  v_preco numeric;
  v_nome text;
  v_ini int;
  v_agora timestamp := public.agora_brasilia();
begin
  new.client_id := auth.uid();
  if new.client_id is null then
    raise exception 'Faça login para agendar.';
  end if;

  new.status := 'pending';
  new.paid := false;
  new.created_at := now();
  new.updated_at := now();

  if coalesce(cardinality(new.service_ids), 0) = 0
     or cardinality(new.service_ids) <> (select count(distinct x) from unnest(new.service_ids) x) then
    raise exception 'Escolha pelo menos um serviço.';
  end if;

  select count(*), max(s.duration), sum(s.price),
         string_agg(s.name, ' + ' order by array_position(new.service_ids, s.id))
    into v_qtd, v_dur, v_preco, v_nome
    from public.services s
   where s.id = any (new.service_ids) and s.active;

  if v_qtd <> cardinality(new.service_ids) then
    raise exception 'Um dos serviços escolhidos não está mais disponível.';
  end if;

  if not exists (select 1 from public.professionals where id = new.professional_id and active) then
    raise exception 'Esse profissional não está disponível.';
  end if;

  -- Regras de funcionamento (iguais às do site): seg–sáb, 09:00–19:00, de 30 em 30 min, até 14 dias
  if extract(dow from new.date) = 0 then
    raise exception 'A barbearia não abre aos domingos.';
  end if;
  if new.date > v_agora::date + 13 then
    raise exception 'Só é possível agendar para os próximos 14 dias.';
  end if;

  v_ini := extract(hour from new.start_time)::int * 60 + extract(minute from new.start_time)::int;
  if v_ini % 30 <> 0 or extract(second from new.start_time) <> 0
     or v_ini < 9 * 60 or v_ini + v_dur > 19 * 60 then
    raise exception 'Horário fora do funcionamento da barbearia.';
  end if;
  if new.date + new.start_time <= v_agora then
    raise exception 'Esse horário já passou.';
  end if;

  new.duration := v_dur;
  new.price := v_preco;
  new.service_name := v_nome;
  new.end_time := new.start_time + make_interval(mins => v_dur);
  return new;
end $$;

create trigger antes_de_agendar
  before insert on public.appointments
  for each row execute function public.preparar_agendamento();

/* ---------------- Ações (chamadas pelo site) ---------------- */

-- Horários ocupados de um dia (sem mostrar quem marcou)
create function public.horarios_ocupados(p_data date)
returns table (professional_id uuid, start_time time, end_time time)
language sql stable security definer set search_path = '' as $$
  select a.professional_id, a.start_time, a.end_time
    from public.appointments a
   where a.date = p_data and a.status in ('pending', 'confirmed');
$$;

-- ADM aceita ou recusa um pedido; o cliente recebe um aviso
create function public.responder_pedido(p_id uuid, p_aceitar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  a public.appointments;
  v_quando text;
begin
  if not public.is_admin() then
    raise exception 'Apenas o administrador pode responder pedidos.';
  end if;

  update public.appointments
     set status = case when p_aceitar then 'confirmed' else 'rejected' end,
         updated_at = now()
   where id = p_id and status = 'pending'
  returning * into a;

  if a.id is null then
    raise exception 'Esse pedido já foi respondido ou cancelado.';
  end if;

  v_quando := to_char(a.date, 'DD/MM') || ' às ' || to_char(a.start_time, 'HH24:MI');
  insert into public.notifications (user_id, text)
  values (a.client_id,
          case when p_aceitar
               then 'Seu horário de ' || a.service_name || ' em ' || v_quando || ' foi CONFIRMADO ✅'
               else 'Seu pedido de ' || a.service_name || ' em ' || v_quando || ' foi recusado. Escolha outro horário.'
          end);
end $$;

-- Cliente cancela o próprio agendamento (antes do horário)
create function public.cancelar_agendamento(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.appointments
     set status = 'cancelled', updated_at = now()
   where id = p_id
     and client_id = auth.uid()
     and status in ('pending', 'confirmed')
     and date + start_time > public.agora_brasilia();
  if not found then
    raise exception 'Não foi possível cancelar esse agendamento.';
  end if;
end $$;

-- ADM registra o pagamento (somente no dia do atendimento)
create function public.registrar_pagamento(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas o administrador pode registrar pagamentos.';
  end if;
  update public.appointments
     set paid = true, updated_at = now()
   where id = p_id
     and status = 'confirmed'
     and date = public.agora_brasilia()::date;
  if not found then
    raise exception 'O pagamento só pode ser registrado no dia do atendimento.';
  end if;
end $$;

-- Cliente marca os próprios avisos como lidos
create function public.marcar_avisos_lidos()
returns void language sql security definer set search_path = '' as $$
  update public.notifications set read = true where user_id = auth.uid() and not read;
$$;

-- Só usuários logados podem chamar as ações
revoke execute on function
  public.horarios_ocupados(date), public.responder_pedido(uuid, boolean),
  public.cancelar_agendamento(uuid), public.registrar_pagamento(uuid),
  public.marcar_avisos_lidos(), public.is_admin(), public.agora_brasilia()
  from public, anon;
grant execute on function
  public.horarios_ocupados(date), public.responder_pedido(uuid, boolean),
  public.cancelar_agendamento(uuid), public.registrar_pagamento(uuid),
  public.marcar_avisos_lidos(), public.is_admin(), public.agora_brasilia()
  to authenticated;
revoke execute on function public.handle_new_user(), public.preparar_agendamento() from public, anon, authenticated;

/* ---------------- Segurança (RLS): quem vê e quem altera o quê ---------------- */

alter table public.profiles      enable row level security;
alter table public.professionals enable row level security;
alter table public.services      enable row level security;
alter table public.appointments  enable row level security;
alter table public.notifications enable row level security;

-- Perfis: cada um vê o seu; o ADM vê todos (para saber nome e telefone do cliente).
-- Ninguém altera o próprio "role" pelo site: não existe regra de UPDATE.
create policy "ver perfil" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Profissionais e serviços: todos os logados veem; só o ADM cadastra e altera.
create policy "ver profissionais" on public.professionals for select to authenticated using (true);
create policy "adm cadastra profissionais" on public.professionals for insert to authenticated with check (public.is_admin());
create policy "adm altera profissionais" on public.professionals for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "ver servicos" on public.services for select to authenticated using (true);
create policy "adm cadastra servicos" on public.services for insert to authenticated with check (public.is_admin());
create policy "adm altera servicos" on public.services for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Agendamentos: o cliente vê os seus e cria pedidos para si; o ADM vê todos.
-- Mudanças de situação só acontecem pelas ações acima (aceitar, recusar, cancelar, pagar).
create policy "ver agendamentos" on public.appointments for select to authenticated
  using (client_id = auth.uid() or public.is_admin());
create policy "cliente faz pedido" on public.appointments for insert to authenticated
  with check (client_id = auth.uid());

-- Avisos: cada cliente vê só os seus.
create policy "ver avisos" on public.notifications for select to authenticated
  using (user_id = auth.uid());

/* ---------------- Tempo real ---------------- */
-- O ADM recebe pedidos novos na hora; o cliente recebe os avisos na hora.
alter publication supabase_realtime add table public.appointments, public.notifications;

/* ---------------- Dados iniciais ---------------- */

insert into public.services (name, duration, price) values
  ('Corte', 60, 40),
  ('Penteado', 60, 20),
  ('Sobrancelha', 30, 15),
  ('Barba', 30, 20),
  ('Freestyle', 60, 10);

insert into public.professionals (name) values ('Caio');
