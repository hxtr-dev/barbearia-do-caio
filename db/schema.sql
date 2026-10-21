-- Pedidos da BrasaBurg & Freeze (Neon / Postgres)
create table if not exists orders (
  id             bigserial primary key,
  public_id      text not null unique,          -- usado no link de acompanhamento do cliente
  order_date     date not null,                 -- dia do pedido no horário de Brasília
  daily_number   integer not null,              -- 1, 2, 3... volta a 1 todo dia (exibido como 001)
  customer_name  text not null,
  customer_phone text not null,                 -- só dígitos, com DDI 55
  items          jsonb not null,
  total_cents    integer not null check (total_cents >= 0),
  status         text not null default 'novo' check (status in ('novo', 'pronto', 'entregue', 'cancelado')),
  created_at     timestamptz not null default now(),
  ready_at       timestamptz,
  unique (order_date, daily_number)
);

create index if not exists orders_status_created_idx on orders (status, created_at);
