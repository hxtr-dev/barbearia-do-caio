'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CozinhaEntrar() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/cozinha/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) router.replace('/cozinha');
    else setError('Senha incorreta.');
  };

  return (
    <div className="kitchen kitchen-login">
      <form onSubmit={submit}>
        <img src="/logo.png" alt="BrasaBurg & Freeze" width="120" height="120" />
        <h1>Cozinha</h1>
        <label>
          Senha
          <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-big">Entrar</button>
      </form>
    </div>
  );
}
