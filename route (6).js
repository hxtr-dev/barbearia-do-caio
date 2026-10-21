import { NextResponse } from 'next/server';
import { getPool, TIMEZONE } from '@/lib/db';
import { isKitchenAuthed } from '@/lib/kitchen-auth';
import { orderLabel } from '@/lib/phone';

export const dynamic = 'force-dynamic';

function toJson(o) {
  return {
    id: String(o.id),
    number: orderLabel(o.daily_number),
    name: o.customer_name,
    phone: o.customer_phone,
    items: o.items,
    total: o.total_cents,
    status: o.status,
    createdAt: o.created_at,
    readyAt: o.ready_at,
  };
}

// Fila: pedidos em aberto por ordem de chegada + os últimos prontos de hoje.
export async function GET() {
  if (!(await isKitchenAuthed())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const pool = getPool();
  const [open, ready] = await Promise.all([
    pool.query(`select * from orders where status = 'novo' order by created_at asc`),
    pool.query(
      `select * from orders
       where status = 'pronto' and order_date = (now() at time zone '${TIMEZONE}')::date
       order by ready_at desc limit 12`,
    ),
  ]);
  return NextResponse.json({
    open: open.rows.map(toJson),
    ready: ready.rows.map(toJson),
    serverNow: new Date().toISOString(),
  });
}
