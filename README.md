# Barbearia do Caio

Protótipo mobile de agendamento de serviços para uma barbearia com vários profissionais.

## Executar localmente

Abra esta pasta no VS Code. No terminal da pasta, execute:

```powershell
python -m http.server 8001 --bind 127.0.0.1 --directory .
```

Acesse http://localhost:8001. No Windows, também é possível usar iniciar-site.bat.

## Funcionalidades

- Login e cadastro de clientes.
- Escolha de serviço, profissional, dia e horário.
- Pedidos pendentes reservam o horário; recusas e cancelamentos liberam a agenda.
- Administração de pedidos, profissionais e serviços.
- Pagamento registrado apenas no dia do atendimento.

## Estado do projeto

Este é um protótipo: os dados ficam no localStorage de cada navegador e as senhas são armazenadas sem proteção. As contas de demonstração estão no código. As notificações funcionam entre abas da mesma origem e navegador.

Publicar os arquivos não cria uma agenda compartilhada entre celulares ou computadores. Antes de atender clientes reais, implementar servidor, banco de dados compartilhado, autenticação segura e permissões do administrador.

## Arquivos

- index.html: estrutura da página.
- styles.css: aparência e layout.
- app.js: telas e regras do protótipo.
- caio.jpeg: imagem de fundo fornecida para o projeto.
- iniciar-site.bat: inicialização local no Windows.
- launch.json: configuração de execução recebida no projeto; não é uma configuração de depuração padrão do VS Code.
