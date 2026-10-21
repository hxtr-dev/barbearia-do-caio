'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import ProductPhoto from '@/components/ProductPhoto';
import { BURGERS, COMBOS, GELADINHOS, formatPrice } from '@/lib/menu';

function useSectionTheme(refs) {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) document.documentElement.dataset.theme = e.target.dataset.theme;
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    refs.forEach((r) => r.current && io.observe(r.current));
    return () => io.disconnect();
  }, [refs]);
}

function ProductCard({ product, onAdd }) {
  const [added, setAdded] = useState(false);
  return (
    <article id={product.id} className="card">
      <ProductPhoto product={product} className="thumb" />
      <div className="card-body">
        <h3>{product.name}</h3>
        <p>{product.tagline}</p>
        <div className="card-buy">
          <span className="price">{formatPrice(product.price)}</span>
          <button
            type="button"
            className="btn"
            onClick={() => {
              onAdd();
              setAdded(true);
              setTimeout(() => setAdded(false), 1200);
            }}
          >
            {added ? 'Adicionado ✓' : 'Adicionar'}
          </button>
        </div>
      </div>
    </article>
  );
}

function ComboPicker({ combo, onClose, onConfirm }) {
  const [picked, setPicked] = useState([]);
  const full = picked.length === combo.geladinhos;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="combo-title" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 id="combo-title">{combo.name}</h3>
        <p>
          Escolha {combo.geladinhos === 1 ? 'o sabor do geladinho' : `os ${combo.geladinhos} sabores dos geladinhos`}.
        </p>
        <div className="flavor-list">
          {GELADINHOS.map((g) => {
            const count = picked.filter((id) => id === g.id).length;
            return (
              <button
                key={g.id}
                type="button"
                className={`flavor ${count ? 'on' : ''}`}
                disabled={full && !count}
                onClick={() => {
                  if (count && combo.geladinhos === 1) setPicked([]);
                  else if (!full) setPicked([...picked, g.id]);
                }}
              >
                {g.shortName}
                {count > 0 && <span className="flavor-count">×{count}</span>}
              </button>
            );
          })}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={() => (picked.length ? setPicked([]) : onClose())}>
            {picked.length ? 'Limpar' : 'Cancelar'}
          </button>
          <button type="button" className="btn" disabled={!full} onClick={() => onConfirm(picked)}>
            Adicionar · {formatPrice(combo.price)}
          </button>
        </div>
      </div>
    </div>
  );
}

function CartSheet({ open, onClose }) {
  const { lines, total, setQty } = useCart();
  const router = useRouter();
  const { customer } = useCart();
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cart-title" onClick={onClose}>
      <div className="modal sheet" onClick={(e) => e.stopPropagation()}>
        <h3 id="cart-title">Seu pedido</h3>
        {lines.length === 0 ? (
          <p>Seu carrinho está vazio.</p>
        ) : (
          <ul className="cart-lines">
            {lines.map((l) => (
              <li key={l.key}>
                <div>
                  <b>{l.product.name}</b>
                  {l.flavorNames.length > 0 && <small>Geladinho: {l.flavorNames.join(', ')}</small>}
                </div>
                <div className="qty">
                  <button type="button" aria-label="Diminuir" onClick={() => setQty(l.key, l.qty - 1)}>−</button>
                  <span>{l.qty}</span>
                  <button type="button" aria-label="Aumentar" onClick={() => setQty(l.key, l.qty + 1)}>+</button>
                </div>
                <span className="price">{formatPrice(l.subtotal)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="cart-total">
          <span>Total</span>
          <b>{formatPrice(total)}</b>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Continuar escolhendo</button>
          <button
            type="button"
            className="btn"
            disabled={lines.length === 0}
            onClick={() => router.push(customer ? '/confirmar' : '/entrar')}
          >
            Finalizar pedido
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PedidoPage() {
  const { add, count, total } = useCart();
  const [combo, setCombo] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const burgersRef = useRef(null);
  const geladinhosRef = useRef(null);
  const combosRef = useRef(null);
  const [refs] = useState(() => [burgersRef, geladinhosRef, combosRef]);
  useSectionTheme(refs);

  useEffect(() => {
    document.documentElement.dataset.theme = 'brasa';
  }, []);

  return (
    <div className="order-page">
      <header className="order-head">
        <h1>Faça seu pedido</h1>
        <p>Escolha os produtos, finalize e acompanhe pelo número do pedido.</p>
        <nav className="order-tabs">
          <a href="#hamburgueres">Hambúrgueres</a>
          <a href="#geladinhos">Geladinhos</a>
          <a href="#combos">Combos</a>
        </nav>
      </header>

      <section id="hamburgueres" ref={burgersRef} data-theme="brasa" className="order-section brasa">
        <h2>Hambúrgueres</h2>
        <div className="cards">
          {BURGERS.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={() => add(p.id)} />
          ))}
        </div>
      </section>

      <section id="geladinhos" ref={geladinhosRef} data-theme="freeze" className="order-section freeze">
        <h2>Geladinhos gourmet</h2>
        <div className="cards">
          {GELADINHOS.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={() => add(p.id)} />
          ))}
        </div>
      </section>

      <section id="combos" ref={combosRef} data-theme="mix" className="order-section mix">
        <h2>Combos</h2>
        <div className="cards">
          {COMBOS.map((c) => (
            <article key={c.id} id={c.id} className="card combo">
              <ProductPhoto product={c} className="thumb" />
              <div className="card-body">
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <div className="card-buy">
                  <span className="price">{formatPrice(c.price)}</span>
                  <button type="button" className="btn" onClick={() => setCombo(c)}>Escolher</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {count > 0 && (
        <button type="button" className="cart-bar" onClick={() => setCartOpen(true)}>
          <span>{count} {count === 1 ? 'item' : 'itens'}</span>
          <b>Ver pedido · {formatPrice(total)}</b>
        </button>
      )}

      {combo && (
        <ComboPicker
          combo={combo}
          onClose={() => setCombo(null)}
          onConfirm={(flavors) => {
            add(combo.id, flavors);
            setCombo(null);
          }}
        />
      )}
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
