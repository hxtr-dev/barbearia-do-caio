'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/menu';
import { formatPhone } from '@/lib/phone';

const LIMIT_MS = 15 * 60 * 1000;
const POLL_MS = 4000;

function clock(ms) {
  const s = Math.floor(Math.abs(ms) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function whatsappLink(order) {
  const text = `Olá, ${order.name}! Seu pedido #${order.number} na BrasaBurg & Freeze está pronto. Pode retirar no balcão. 🔥🧊`;
  return `https://wa.me/${order.phone}?text=${encodeURIComponent(text)}`;
}

function beep(ctx) {
  const now = ctx.currentTime;
  [0, 0.18, 0.36].forEach((t, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = i === 2 ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.4, now + t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + t);
    osc.stop(now + t + 0.17);
  });
}

function OrderCard({ order, now, onReady }) {
  const elapsed = now - new Date(order.createdAt).getTime();
  const left = LIMIT_MS - elapsed;
  const level = left < 0 ? 'late' : left < 5 * 60 * 1000 ? 'warn' : 'ok';
  const pct = Math.max(0, Math.min(100, (left / LIMIT_MS) * 100));
  return (
    <article className={`ticket-card ${level}`}>
      <header>
        <span className="ticket-num">#{order.number}</span>
        <span className="ticket-timer" aria-label="Tempo restante">
          {left < 0 ? `+${clock(left)}` : clock(left)}
        </span>
      </header>
      <div className="ticket-bar"><span style={{ width: `${pct}%` }} /></div>
      <p className="ticket-who">
        <b>{order.name}</b> · {formatPhone(order.phone)}
      </p>
      <p className="ticket-time">
        Chegou às {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        {left < 0 ? ' · atrasado' : ''}
      </p>
      <ul>
        {order.items.map((i, n) => (
          <li key={n}>
            <b>{i.qty}×</b> {i.name}
            {i.details.length > 0 && <small>{i.details.join(' · ')}</small>}
          </li>
        ))}
      </ul>
      <p className="ticket-total">{formatPrice(order.total)} · pagar no balcão</p>
      <a className="btn btn-big btn-ready" href={whatsappLink(order)} target="_blank" rel="noreferrer" onClick={() => onReady(order)}>
        Pedido Pronto e avisar no WhatsApp
      </a>
    </article>
  );
}

export default function KitchenBoard() {
  const [data, setData] = useState({ open: [], ready: [] });
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef(null);
  const seenRef = useRef(null);
  const wakeRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/cozinha/orders', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/cozinha/entrar';
        return;
      }
      const json = await res.json();
      setOffset(new Date(json.serverNow).getTime() - Date.now());
      const ids = new Set(json.open.map((o) => o.id));
      if (seenRef.current && audioRef.current && json.open.some((o) => !seenRef.current.has(o.id))) beep(audioRef.current);
      seenRef.current = ids;
      setData(json);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const setStatus = async (order, status) => {
    setData((d) => {
      const open = d.open.filter((o) => o.id !== order.id);
      const ready = d.ready.filter((o) => o.id !== order.id);
      if (status === 'pronto') ready.unshift({ ...order, status, readyAt: new Date().toISOString() });
      if (status === 'novo') open.push({ ...order, status });
      open.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return { ...d, open, ready };
    });
    await fetch(`/api/cozinha/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {});
    load();
  };

  // Som e tela sempre ligada só podem ser ativados por um toque.
  const enableSound = async () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioRef.current = audioRef.current || new Ctx();
    await audioRef.current.resume();
    beep(audioRef.current);
    setSoundOn(true);
    try {
      wakeRef.current = await navigator.wakeLock?.request('screen');
    } catch {
      // sem suporte: o tablet segue a configuração de tela dele
    }
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const serverNow = now + offset;
  return (
    <div className="kitchen">
      <header className="kitchen-head">
        <div className="brand">
          <img src="/logo.png" alt="" width="44" height="44" />
          <h1>Cozinha</h1>
        </div>
        <div className="kitchen-meta">
          <span className={`dot ${online ? 'on' : 'off'}`} />
          {online ? 'Conectado' : 'Sem conexão, tentando de novo…'}
          <span className="sep">·</span>
          {data.open.length} na fila
          <span className="sep">·</span>
          {new Date(serverNow).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          {!soundOn && (
            <button type="button" className="btn" onClick={enableSound}>Ativar som e tela cheia</button>
          )}
        </div>
      </header>

      <section className="queue" aria-label="Pedidos na fila">
        {data.open.length === 0 ? (
          <p className="empty">Nenhum pedido na fila. Os novos aparecem aqui sozinhos.</p>
        ) : (
          data.open.map((o) => <OrderCard key={o.id} order={o} now={serverNow} onReady={(x) => setStatus(x, 'pronto')} />)
        )}
      </section>

      {data.ready.length > 0 && (
        <section className="ready-list" aria-label="Prontos hoje">
          <h2>Prontos hoje</h2>
          <ul>
            {data.ready.map((o) => (
              <li key={o.id}>
                <span className="ticket-num">#{o.number}</span>
                <span>{o.name}</span>
                <span className="muted">
                  pronto às {new Date(o.readyAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <a href={whatsappLink(o)} target="_blank" rel="noreferrer" className="link">Reenviar WhatsApp</a>
                <button type="button" className="btn btn-ghost" onClick={() => setStatus(o, 'entregue')}>Entregue</button>
                <button type="button" className="link" onClick={() => setStatus(o, 'novo')}>Desfazer</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
