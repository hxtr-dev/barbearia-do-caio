'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import ThemeReset from '@/components/ThemeReset';

function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function EntrarPage() {
  const { customer, setCustomer } = useCart();
  const router = useRouter();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (name.trim().length < 2) return setError('Digite seu nome.');
    if (digits.length < 10) return setError('Digite seu WhatsApp com DDD.');
    setCustomer({ name: name.trim(), phone });
    router.push('/confirmar');
  };

  return (
    <div className="narrow">
      <ThemeReset />
      <form className="panel-form" onSubmit={submit}>
        <h1>Quem está pedindo?</h1>
        <p>Usamos seu nome para chamar no balcão e o WhatsApp para avisar quando o pedido ficar pronto.</p>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} required />
        </label>
        <label>
          WhatsApp
          <input
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(11) 98765-4321"
            required
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-big">Continuar</button>
      </form>
    </div>
  );
}
