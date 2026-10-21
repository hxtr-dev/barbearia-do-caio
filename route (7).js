import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { orderLabel } from '@/lib/phone';

export async function GET(_request, { params }) {
  const { publicId } = await params;
  const { rows } = await getPool().query(
    `select daily_number, customer_name, items, total_cents, status, created_at, ready_at
     from orders where public_id = $1`,
    [publicId],
  );
  if (rows.length === 0) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  const o = rows[0];
  return NextResponse.json({
    number: orderLabel(o.daily_number),
    name: o.customer_name,
    items: o.items,
    total: o.total_cents,
    status: o.status,
    createdAt: o.created_at,
    readyAt: o.ready_at,
  });
}
