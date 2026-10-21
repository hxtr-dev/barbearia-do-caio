import { NextResponse } from 'next/server';
import { KITCHEN_COOKIE, kitchenToken, pinMatches } from '@/lib/kitchen-auth';

export async function POST(request) {
  const { pin } = await request.json().catch(() => ({}));
  if (!pinMatches(pin)) return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(KITCHEN_COOKIE, kitchenToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(KITCHEN_COOKIE);
  return res;
}
