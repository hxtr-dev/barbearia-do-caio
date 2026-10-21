'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import ThemeReset from '@/components/ThemeReset';
import { formatPrice } from '@/lib/menu';

export default function AcompanharPage({ params }) {
  const { id } = use(params);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stop = false;
    let timer;
    const load = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!stop) setOrder(data);
        if (data.status === 'novo' && !stop) timer = setTimeout(load, 5000);
      } catch (err) {
        if (!stop) setError(err.message || 'Não foi possível carregar o pedido.');
        if (!stop) timer = setTimeout(load, 10000);
      }
    };
    load();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id]);

  const ready = order && order.status !== 'novo';
  return (
    <div className="narrow">
      <ThemeReset theme={ready ? 'freeze' : 'brasa'} />
      <div className="panel-form ticket">
        {!order ? (
          <p>{error || 'Carregando seu pedido…'}</p>
        ) : (
          <>
            <p className="kicker">Pedido enviado para a cozinha</p>
            <p className="ticket-number">#{order.number}</p>
            <p className={`ticket-status ${ready ? 'is-ready' : ''}`} aria-live="polite">
              {order.status === 'novo' && 'Preparando seu pedido…'}
              {order.status === 'pronto' && 'Pronto! Pode retirar no balcão.'}
              {order.status === 'entregue' && 'Pedido entregue. Bom apetite!'}
              {order.status === 'cancelado' && 'Pedido cancelado. Fale com o balcão.'}
            </p>
            <p>
              {order.name}, guarde este número. Quando o pedido ficar pronto, esta tela muda e avisamos no seu WhatsApp.
            </p>
            <ul className="cart-lines">
              {order.items.map((i, n) => (
                <li key={n}>
                  <div>
                    <b>{i.qty}× {i.name}</b>
                    {i.details.length > 0 && <small>{i.details.join(' · ')}</small>}
                  </div>
                  <span className="price">{formatPrice(i.unitPrice * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="cart-total">
              <span>Total</span>
              <b>{formatPrice(order.total)}</b>
            </div>
            <Link href="/pedido" className="btn btn-ghost">Fazer outro pedido</Link>
          </>
        )}
      </div>
    </div>
  );
}
