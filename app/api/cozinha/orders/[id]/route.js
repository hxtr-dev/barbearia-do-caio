import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { isKitchenAuthed } from '@/lib/kitchen-auth';

const ALLOWED = new Set(['novo', 'pronto', 'entregue', 'cancelado']);

export async function PATCH(request, { params }) {
  if (!(await isKitchenAuthed())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params;
  const { status } = await request.json().catch(() => ({}));
  if (!ALLOWED.has(status) || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
  }
  const { rowCount } = await getPool().query(
    `update orders
     set status = $1,
         ready_at = case when $1 = 'pronto' then coalesce(ready_at, now()) when $1 = 'novo' then null else ready_at end
     where id = $2`,
    [status, id],
  );
  if (rowCount === 0) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
