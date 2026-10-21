'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/menu';
import ProductPhoto from './ProductPhoto';

// Sticky scroll: a foto fica parada enquanto os textos dos produtos passam ao lado.
export default function StickyShowcase({ id, theme, kicker, title, intro, products }) {
  const [active, setActive] = useState(0);
  const panelsRef = useRef([]);
  const sectionRef = useRef(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number(e.target.dataset.index));
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    panelsRef.current.forEach((el) => el && io.observe(el));

    const themeIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) document.documentElement.dataset.theme = theme;
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    themeIo.observe(sectionRef.current);
    return () => {
      io.disconnect();
      themeIo.disconnect();
    };
  }, [theme]);

  return (
    <section id={id} ref={sectionRef} className={`showcase showcase-${theme}`}>
      <header className="showcase-head">
        <p className="kicker">{kicker}</p>
        <h2>{title}</h2>
        <p>{intro}</p>
      </header>
      <div className="showcase-grid">
        <div className="stage">
          <figure key={products[active].id} className="stage-photo">
            <ProductPhoto product={products[active]} className="stage-img" />
            <figcaption>
              <span>{products[active].name}</span>
              <b>{formatPrice(products[active].price)}</b>
            </figcaption>
          </figure>
          <ol className="stage-dots" aria-hidden="true">
            {products.map((p, i) => (
              <li key={p.id} className={i === active ? 'on' : ''} />
            ))}
          </ol>
        </div>
        <div className="panels">
          {products.map((p, i) => (
            <article
              key={p.id}
              ref={(el) => (panelsRef.current[i] = el)}
              data-index={i}
              className={`panel ${i === active ? 'is-active' : ''}`}
            >
              <p className="panel-num">{String(i + 1).padStart(2, '0')}</p>
              <h3>{p.name}</h3>
              <p className="tagline">{p.tagline}</p>
              {p.paragraphs.map((t) => (
                <p key={t.slice(0, 24)}>{t}</p>
              ))}
              <dl>
                {p.facts.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="panel-buy">
                <span className="price">{formatPrice(p.price)}</span>
                <Link href={`/pedido#${p.id}`} className="btn">Pedir este</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
