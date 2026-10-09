# Barbearia do Caio

Site de agendamento de serviços para uma barbearia com vários profissionais.
Os dados ficam no [Supabase](https://supabase.com) (banco de dados online), então clientes e ADM
veem a mesma agenda em qualquer aparelho, e o ADM recebe os pedidos na hora.

## Configurar o Supabase (uma vez só)

1. Crie uma conta em https://supabase.com e um projeto novo (região: São Paulo).
2. No projeto, abra **SQL Editor → New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Abra **Project Settings → API** (ou o botão **Connect**) e copie:
   - **Project URL**
   - **Publishable key** (ou "anon public")

   Cole os dois em `config.js`. Nunca use a chave *secret* / *service_role* no site.
4. Em **Authentication → URL Configuration**, coloque em **Site URL**:
   `https://hxtr-dev.github.io/barbearia-do-caio/`
   e em **Redirect URLs** adicione também `http://localhost:8001/`.
5. (Opcional) Em **Authentication → Sign In / Providers → Email**, desligue **Confirm email** se não
   quiser que o cliente precise confirmar o e-mail antes do primeiro login.
6. Crie a conta do Caio pelo site (**Criar conta**) e depois rode `supabase/tornar-admin.sql`
   (trocando o e-mail) no SQL Editor. Saia e entre de novo: o painel do ADM aparece.

## Executar localmente

Dê dois cliques em `iniciar-site.bat`, ou no terminal desta pasta:

```powershell
python -m http.server 8001 --bind 127.0.0.1 --directory .
```

Acesse http://localhost:8001.

## Funcionalidades

- Cadastro e login de clientes por e-mail e senha (Supabase Auth).
- Escolha de um ou mais serviços, profissional, dia e horário; horários de outros clientes aparecem como ocupados.
- Pedidos pendentes reservam o horário; recusas e cancelamentos liberam a agenda.
- O ADM recebe os pedidos em tempo real (aviso na tela, som e notificação do navegador) e aceita ou recusa.
- O cliente recebe em tempo real o aviso de confirmado/recusado.
- Administração de profissionais e serviços.
- Pagamento no local, registrado apenas no dia do atendimento.

## Segurança

As regras ficam no banco (`supabase/schema.sql`), não no site:

- Cada cliente só vê os próprios agendamentos e avisos; os horários ocupados de outros aparecem sem nome.
- Preço, duração e horário são conferidos e calculados pelo banco; o banco impede dois pedidos sobrepostos para o mesmo profissional.
- Só o ADM aceita/recusa pedidos, registra pagamentos e altera profissionais e serviços.
- Ninguém consegue se promover a ADM pelo site.

## Arquivos

- `index.html`: estrutura da página.
- `styles.css`: aparência, layout e animações.
- `app.js`: telas e comunicação com o Supabase.
- `config.js`: endereço e chave pública do projeto Supabase.
- `supabase/schema.sql`: tabelas, regras de segurança, tempo real e dados iniciais.
- `supabase/tornar-admin.sql`: transforma uma conta em ADM.
- `caio.jpeg`: imagem de fundo.
- `iniciar-site.bat`: inicialização local no Windows.
