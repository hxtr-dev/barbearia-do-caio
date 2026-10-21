'use client';

import { useEffect } from 'react';

// Fundo com a logo: nítida no topo e cada vez mais embaçada conforme o usuário rola a página.
export default function Background() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(1, window.scrollY / (window.innerHeight * 0.9));
      root.style.setProperty('--logo-blur', `${(p * 14).toFixed(2)}px`);
      root.style.setProperty('--logo-dim', (1 - p * 0.55).toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="bg" aria-hidden="true">
      <div className="bg-logo" />
      <div className="bg-tint" />
    </div>
  );
}
