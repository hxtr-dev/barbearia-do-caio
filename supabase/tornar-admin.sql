-- Transforma uma conta em ADM (administrador da barbearia).
-- 1. Crie a conta normalmente pelo site (botão "Criar conta").
-- 2. Troque o e-mail abaixo pelo e-mail dessa conta.
-- 3. Cole no Supabase: SQL Editor → New query → Run.
-- 4. No site, saia e entre de novo.

update public.profiles
   set role = 'admin'
 where id = (select id from auth.users where email = 'EMAIL_DO_CAIO@exemplo.com');

-- Confere: deve aparecer a conta com role = admin
select u.email, p.name, p.role
  from public.profiles p
  join auth.users u on u.id = p.id
 where p.role = 'admin';
