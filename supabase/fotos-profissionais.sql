-- =========================================================
-- Fotos dos profissionais
-- Cole TUDO no Supabase: SQL Editor → New query → Run.
-- Pode rodar mais de uma vez sem problema.
-- =========================================================

-- Campo com o endereço da foto de cada profissional
alter table public.professionals add column if not exists photo_url text;

-- "Armário" de fotos (Storage): qualquer pessoa vê as fotos, só o ADM envia/troca/apaga.
-- Limite de 2 MB por foto; o site já reduz a foto antes de enviar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profissionais', 'profissionais', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "adm envia fotos de profissionais" on storage.objects;
create policy "adm envia fotos de profissionais" on storage.objects for insert to authenticated
  with check (bucket_id = 'profissionais' and public.is_admin());

drop policy if exists "adm troca fotos de profissionais" on storage.objects;
create policy "adm troca fotos de profissionais" on storage.objects for update to authenticated
  using (bucket_id = 'profissionais' and public.is_admin());

drop policy if exists "adm apaga fotos de profissionais" on storage.objects;
create policy "adm apaga fotos de profissionais" on storage.objects for delete to authenticated
  using (bucket_id = 'profissionais' and public.is_admin());

-- Foto do Caio (arquivo que já está no site)
update public.professionals
   set photo_url = 'profissionais/caio.webp'
 where name = 'Caio' and photo_url is null;

-- Confere
select name, active, photo_url from public.professionals order by created_at;
