import { redirect } from 'next/navigation';
import KitchenBoard from '@/components/KitchenBoard';
import { isKitchenAuthed } from '@/lib/kitchen-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cozinha · BrasaBurg & Freeze' };

export default async function CozinhaPage() {
  if (!(await isKitchenAuthed())) redirect('/cozinha/entrar');
  return <KitchenBoard />;
}
