'use client';

import { useEffect } from 'react';

// Volta o fundo para o tema neutro ao entrar numa página (ou ao rolar de volta para o topo da home).
export default function ThemeReset({ theme = 'neutral' }) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const onScroll = () => {
      if (theme === 'neutral' && window.scrollY < window.innerHeight * 0.5) root.dataset.theme = 'neutral';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [theme]);
  return null;
}
