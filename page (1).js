'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import ThemeReset from '@/components/ThemeReset';
import { formatPrice } from '@/lib/menu';

export default function ConfirmarPage() {
  const { ready, lines, total, customer, clear } = useCart();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && !customer) router.replace('/entrar');
  }, [ready, customer, router]);

  if (!ready || !customer) return null;

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: customer.name,
          phone: customer.phone,
          items: lines.map((l) => ({ productId: l.productId, qty: l.qty, flavors: l.flavors })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível enviar o pedido.');
      clear();
      router.push(`/acompanhar/${data.publicId}`);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <div className="narrow">
      <ThemeReset />
      <div className="panel-form">
        <h1>Confira seu pedido</h1>
        {lines.length === 0 ? (
          <p>
            Seu carrinho está vazio. <Link href="/pedido">Escolher produtos</Link>
          </p>
        ) : (
          <>
            <ul className="cart-lines">
              {lines.map((l) => (
                <li key={l.key}>
                  <div>
                    <b>{l.qty}× {l.product.name}</b>
                    {l.flavorNames.length > 0 && <small>Geladinho: {l.flavorNames.join(', ')}</small>}
                  </div>
                  <span className="price">{formatPrice(l.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="cart-total">
              <span>Total (pagamento no balcão)</span>
              <b>{formatPrice(total)}</b>
            </div>
            <p className="who">
              {customer.name} · {customer.phone} · <Link href="/entrar">alterar</Link>
            </p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="button" className="btn btn-big" onClick={send} disabled={sending}>
              {sending ? 'Enviando…' : 'Enviar Pedido para cozinha'}
            </button>
            <Link href="/pedido" className="btn btn-ghost">Adicionar mais itens</Link>
          </>
        )}
      </div>
    </div>
  );
}
