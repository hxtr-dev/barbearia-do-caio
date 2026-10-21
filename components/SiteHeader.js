'use client';

import Link from 'next/link';
import { useCart } from './CartProvider';
import { formatPrice } from '@/lib/menu';

export default function SiteHeader() {
  const { count, total } = useCart();
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="BrasaBurg & Freeze, início">
        <img src="/logo.png" alt="" width="40" height="40" />
        <span>
          <b className="brand-brasa">BrasaBurg</b> <b className="brand-freeze">&amp; Freeze</b>
        </span>
      </Link>
      <nav>
        <Link href="/">Início</Link>
        <Link href="/pedido" className="nav-cta">
          Pedir{count > 0 ? ` · ${count}` : ''}
          {count > 0 && <span className="nav-total"> · {formatPrice(total)}</span>}
        </Link>
      </nav>
    </header>
  );
}
