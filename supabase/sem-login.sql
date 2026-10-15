-- =========================================================
-- Agendamento sem login
-- O cliente não cria conta: ao enviar o pedido, informa nome e WhatsApp.
-- O site cria um "acesso anônimo" guardado no aparelho dele, para ele ver
-- e cancelar os próprios horários. Só o ADM continua com e-mail e senha.
--
-- Cole TUDO no Supabase: SQL Editor → New query → Run.
-- Depois, ligue em Authentication → Sign In / Providers:
--   "Allow anonymous sign-ins" (permitir acesso anônimo) → Save.
-- Pode rodar mais de uma vez sem problema.
-- =========================================================

-- 1. Catálogo público: quem abre o site já vê serviços, profissionais e horários livres
drop policy if exists "publico ve profissionais" on public.professionals;
create policy "publico ve profissionais" on public.professionals for select to anon using (active);

drop policy if exists "publico ve servicos" on public.services;
create policy "publico ve servicos" on public.services for select to anon using (active);

grant execute on function public.horarios_ocupados(date) to anon;

-- 2. Nome e WhatsApp ficam gravados no próprio pedido
alter table public.appointments
  add column if not exists client_name text,
  add column if not exists client_phone text;

create index if not exists appointments_client_phone_idx on public.appointments (client_phone);

-- Confere nome e WhatsApp antes de salvar o pedido (roda depois de "antes_de_agendar")
create or replace function public.dados_do_cliente()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_nome text := nullif(trim(coalesce(new.client_name, '')), '');
  v_fone text := regexp_replace(coalesce(new.client_phone, ''), '[^0-9]', '', 'g');
  v_perfil public.profiles;
  v_pendentes int;
begin
  -- Contas antigas (com e-mail): usa o nome e o telefone do cadastro se o pedido não trouxer
  if v_nome is null or v_fone = '' then
    select * into v_perfil from public.profiles where id = new.client_id;
    v_nome := coalesce(v_nome, nullif(trim(v_perfil.name), ''));
    if v_fone = '' then
      v_fone := regexp_replace(coalesce(v_perfil.phone, ''), '[^0-9]', '', 'g');
    end if;
  end if;

  if length(v_fone) in (10, 11) then
    v_fone := '55' || v_fone;
  end if;

  if v_nome is null or length(v_nome) < 2 then
    raise exception 'Informe seu nome para agendar.';
  end if;
  if length(v_nome) > 60 then
    raise exception 'O nome pode ter no máximo 60 letras.';
  end if;
  if v_fone !~ '^55[0-9]{10,11}$' then
    raise exception 'Informe seu WhatsApp com DDD, por exemplo (11) 91234-5678.';
  end if;

  -- Proteção contra excesso de pedidos: no máximo 3 aguardando resposta por WhatsApp ou por aparelho
  select count(*) into v_pendentes
    from public.appointments a
   where a.status = 'pending'
     and a.date >= public.agora_brasilia()::date
     and (a.client_id = new.client_id or a.client_phone = v_fone);
  if v_pendentes >= 3 then
    raise exception 'Você já tem 3 pedidos aguardando resposta. Aguarde a barbearia responder ou fale pelo WhatsApp.';
  end if;

  new.client_name := v_nome;
  new.client_phone := v_fone;
  return new;
end $$;
revoke execute on function public.dados_do_cliente() from public, anon, authenticated;

drop trigger if exists antes_de_agendar_cliente on public.appointments;
create trigger antes_de_agendar_cliente
  before insert on public.appointments
  for each row execute function public.dados_do_cliente();

-- Confere: deve listar os 3 gatilhos, nesta ordem
select tgname from pg_trigger
 where tgrelid = 'public.appointments'::regclass and not tgisinternal
 order by tgname;
