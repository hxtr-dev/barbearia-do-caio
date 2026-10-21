# BrasaBurg & Freeze

Site de pedidos pelo celular e tela da cozinha para tablet. Um único app Next.js na Vercel, com os pedidos guardados no Neon (Postgres).

| Endereço | Para quem | O que faz |
| --- | --- | --- |
| `/` | Clientes | Home em sticky scroll com as fotos dos hambúrgueres (vermelho) e dos geladinhos (azul) |
| `/pedido` | Clientes | Cardápio com carrinho, combos com escolha de sabor |
| `/entrar` | Clientes | Identificação com nome + WhatsApp |
| `/confirmar` | Clientes | Revisão dos itens e botão "Enviar Pedido para cozinha" |
| `/acompanhar/<código>` | Clientes | Número do pedido (001, 002…) e status ao vivo |
| `/cozinha` | Tablet | Fila por ordem de chegada, cronômetro de 15 min e botão "Pedido Pronto e avisar no WhatsApp" |

O número do pedido começa em 001 e volta para 001 todo dia (horário de Brasília).
Enquanto a API oficial do WhatsApp não está ligada, o botão da cozinha abre o WhatsApp do tablet com a mensagem pronta para o cliente.

## Colocar no ar

1. **Neon**: crie um projeto em neon.tech (região São Paulo, `sa-east-1`) e copie a connection string **pooled**.
2. **Criar as tabelas** (uma vez):
   ```bash
   DATABASE_URL="postgresql://..." npm run db:migrate
   ```
3. **Vercel**: importe este repositório e configure as variáveis de ambiente:
   - `DATABASE_URL`: a connection string do Neon
   - `KITCHEN_PIN`: a senha da tela da cozinha
4. No tablet, abra `https://<seu-site>/cozinha`, digite a senha e toque em **Ativar som e tela cheia**.

## Rodar no computador

```bash
npm install
cp .env.example .env.local   # preencha DATABASE_URL e KITCHEN_PIN
npm run db:migrate
npm run dev
```

## Onde mudar as coisas

- Produtos, descrições, preços e combos: `lib/menu.js` (preços em centavos). O servidor recalcula o total a partir desse arquivo.
- Fotos dos produtos: `public/produtos/` (o campo `image` de cada produto em `lib/menu.js` aponta para a foto).
- Cores e layout: `app/globals.css`.
- Mensagem do WhatsApp: `components/KitchenBoard.js`, função `whatsappLink`.
- Tabela de pedidos: `db/schema.sql`.
