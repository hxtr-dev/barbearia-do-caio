-- Troca o e-mail do ADM: o NOVO e-mail vira ADM e o ANTIGO volta a ser cliente.
-- Antes de rodar: crie a conta com o e-mail novo pelo site ("Criar conta").
-- Troque os dois e-mails abaixo e rode no Supabase: SQL Editor → New query → Run.
-- Depois, no site, entre com o e-mail novo.

begin;

-- 1. O novo e-mail vira ADM
update public.profiles
   set role = 'admin'
 where id = (select id from auth.users where email = lower('EMAIL_NOVO@exemplo.com'));

-- 2. O antigo deixa de ser ADM (só se o novo já tiver virado ADM, para nunca ficar sem nenhum)
update public.profiles
   set role = 'client'
 where id = (select id from auth.users where email = lower('EMAIL_ANTIGO@exemplo.com'))
   and exists (select 1 from public.profiles p
                 join auth.users u on u.id = p.id
                where u.email = lower('EMAIL_NOVO@exemplo.com') and p.role = 'admin');

commit;

-- Confere: deve aparecer só o e-mail novo como admin
select u.email, p.name, p.role
  from public.profiles p
  join auth.users u on u.id = p.id
 where p.role = 'admin';
