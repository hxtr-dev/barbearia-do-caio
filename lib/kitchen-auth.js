import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const KITCHEN_COOKIE = 'cozinha';

// O cookie guarda um hash do PIN; trocar KITCHEN_PIN na Vercel desconecta todos os tablets.
export function kitchenToken() {
  const pin = process.env.KITCHEN_PIN;
  if (!pin) throw new Error('KITCHEN_PIN não configurado');
  return createHash('sha256').update(`brasaburg-cozinha:${pin}`).digest('hex');
}

export function pinMatches(pin) {
  const expected = Buffer.from(process.env.KITCHEN_PIN ?? '');
  const given = Buffer.from(String(pin ?? ''));
  return expected.length > 0 && expected.length === given.length && timingSafeEqual(expected, given);
}

export async function isKitchenAuthed() {
  const store = await cookies();
  const value = store.get(KITCHEN_COOKIE)?.value;
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(kitchenToken());
  return a.length === b.length && timingSafeEqual(a, b);
}
